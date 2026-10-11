/* Real sign-in: passwords, codes, lockout, invitation and reset links, provider sign-up,
   and a live platform from its first Super admin. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, client, post, lastMessage, codeIn, linkTokenIn, signInAs } = require('./helpers');
const { normalizePhone } = require('../src/signin');

const DEMO_PW = 'Mosta3lem@2026';
const NEW_PW = 'Nile river 2026';

/** Email + password, then the emailed code. Returns the session token. */
async function emailSignIn(app, email, password) {
  const start = await post(app, 'password', { email, password });
  assert.equal(start.status, 200, JSON.stringify(start.body));
  const code = codeIn(await lastMessage(app, email));
  const done = await post(app, 'verify', { challengeId: start.body.result.challengeId, code });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  return done.body.session.token;
}

test('mobile numbers are read in every common way', () => {
  for (const s of ['01012345678', '+20 101 234 5678', '00201012345678', '1012345678', '٠١٠١٢٣٤٥٦٧٨']) assert.equal(normalizePhone(s), '01012345678', s);
  for (const s of ['0101234567', '01312345678', '', 'abc']) assert.equal(normalizePhone(s), null, s);
});

test('sign-in in demo mode', async (t) => {
  const app = await start();
  t.after(() => app.close());
  const call = client(app);
  const people = (await call('auth.listDemoUsers')).body.result;
  const laila = people.find((u) => u.role === 'platform_admin');
  const orgUser = people.find((u) => u.role === 'entity_credit');
  const provider = people.find((u) => u.role === 'provider_admin');

  await t.test('email and password, then a code by email', async () => {
    const r = await post(app, 'password', { email: laila.email.toUpperCase(), password: DEMO_PW });
    assert.equal(r.status, 200);
    assert.match(r.body.result.sentTo, /^l\*\*\*\*@/);
    const msg = await lastMessage(app, laila.email);
    assert.equal(msg.channel, 'email');
    const code = codeIn(msg);
    assert.equal((await post(app, 'verify', { challengeId: r.body.result.challengeId, code: '000000' === code ? '111111' : '000000' })).body.error.key, 'errors.codeWrong');
    const ok = await post(app, 'verify', { challengeId: r.body.result.challengeId, code });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.result.user.id, laila.id);
    assert.equal((await call('staff.list', [], ok.body.session.token)).status, 200);
    // A code works once.
    assert.equal((await post(app, 'verify', { challengeId: r.body.result.challengeId, code })).body.error.key, 'errors.codeExpired');
  });

  await t.test('an unknown email gets the same answer as a wrong password', async () => {
    const a = await post(app, 'password', { email: 'nobody@nowhere.example', password: DEMO_PW });
    const b = await post(app, 'password', { email: orgUser.email, password: 'not-the-password1' });
    assert.equal(a.status, b.status);
    assert.deepEqual(a.body, b.body);
    assert.equal(a.body.error.key, 'errors.wrongPassword');
  });

  await t.test('providers cannot use the email sign-in', async () => {
    const r = await post(app, 'password', { email: provider.email, password: DEMO_PW });
    assert.equal(r.body.error.key, 'errors.wrongPassword');
  });

  await t.test('five wrong passwords lock the account, and the console shows it', async () => {
    let r;
    for (let i = 0; i < 5; i++) r = await post(app, 'password', { email: orgUser.email, password: 'wrong-password-' + i });
    assert.equal(r.body.error.key, 'errors.signInLocked');
    assert.equal((await post(app, 'password', { email: orgUser.email, password: DEMO_PW })).body.error.key, 'errors.signInLocked');
    const support = await signInAs(call, 'platform_support');
    const org = (await call('entities.get', [orgUser.entityId], support.token)).body.result;
    assert.ok(org.users.find((u) => u.id === orgUser.id).lockedUntil > Date.now());
  });

  await t.test('Customer support resets the sign-in: the person chooses a new password from an email link', async () => {
    const before = await signInAs(call, 'entity_credit');
    const support = await signInAs(call, 'platform_support');
    assert.equal((await call('accounts.resetLogin', [orgUser.id], support.token)).status, 200);
    assert.equal((await call('auth.currentUser', [], before.token)).status, 401, 'signed out everywhere');
    const msg = await lastMessage(app, orgUser.email);
    assert.equal(msg.template, 'reset');
    const token = linkTokenIn(msg);
    assert.equal((await post(app, 'set-password', { token, password: 'short1' })).body.error.key, 'errors.passwordShort');
    assert.equal((await post(app, 'set-password', { token, password: 'onlyletterslong' })).body.error.key, 'errors.passwordMix');
    assert.equal((await post(app, 'set-password', { token, password: NEW_PW })).status, 200);
    assert.equal((await post(app, 'set-password', { token, password: NEW_PW })).body.error.key, 'errors.linkInvalid', 'a link works once');
    assert.ok(await emailSignIn(app, orgUser.email, NEW_PW));
    assert.equal((await post(app, 'password', { email: orgUser.email, password: DEMO_PW })).body.error.key, 'errors.wrongPassword', 'the demo password stops working');
    const row = (await app.db.query('SELECT password_hash FROM credentials WHERE user_id = $1', [orgUser.id])).rows[0];
    assert.match(row.password_hash, /^scrypt\$/);
    assert.ok(!row.password_hash.includes(NEW_PW));
  });

  await t.test('people added in the console get an invitation link', async () => {
    const admin = await signInAs(call, 'platform_admin');
    const r = await call('staff.invite', [{ name: 'Rana Fathy', email: 'rana.fathy@platform.example', role: 'platform_finance' }], admin.token);
    assert.equal(r.status, 200);
    const msg = await lastMessage(app, 'rana.fathy@platform.example');
    assert.equal(msg.template, 'invite');
    assert.equal((await post(app, 'set-password', { token: linkTokenIn(msg), password: 'Rana fathy 2026' })).status, 200);
    assert.ok(await emailSignIn(app, 'rana.fathy@platform.example', 'Rana fathy 2026'));
  });

  await t.test('forgot password: a link for real accounts, the same answer for everyone', async () => {
    const before = await app.db.query('SELECT count(*)::int AS n FROM outbox');
    const a = await post(app, 'forgot', { email: 'nobody@nowhere.example' });
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM outbox')).rows[0].n, before.rows[0].n);
    const b = await post(app, 'forgot', { email: laila.email });
    assert.deepEqual(a.body, b.body);
    assert.equal((await lastMessage(app, laila.email)).template, 'reset');
  });

  await t.test('providers sign in with their mobile and an SMS code', async () => {
    const phone = normalizePhone(provider.phone);
    const r = await post(app, 'phone', { phone: '+20' + phone.slice(1) });
    assert.equal(r.status, 200);
    const msg = await lastMessage(app, phone);
    assert.equal(msg.channel, 'sms');
    const ok = await post(app, 'verify', { challengeId: r.body.result.challengeId, code: codeIn(msg) });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.result.user.id, provider.id);
    assert.equal(ok.body.result.portal, 'provider');
  });

  await t.test('an unknown mobile gets the same answer but no message, and no code works', async () => {
    const before = (await app.db.query('SELECT count(*)::int AS n FROM outbox')).rows[0].n;
    const r = await post(app, 'phone', { phone: '01599887766' });
    assert.equal(r.status, 200);
    assert.ok(r.body.result.challengeId);
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM outbox')).rows[0].n, before);
    assert.equal((await post(app, 'verify', { challengeId: r.body.result.challengeId, code: '123456' })).body.error.key, 'errors.codeWrong');
  });

  await t.test('five wrong codes end the code', async () => {
    const r = await post(app, 'phone', { phone: provider.phone });
    const code = codeIn(await lastMessage(app, normalizePhone(provider.phone)));
    const wrong = code === '999999' ? '888888' : '999999';
    for (let i = 0; i < 4; i++) assert.equal((await post(app, 'verify', { challengeId: r.body.result.challengeId, code: wrong })).body.error.key, 'errors.codeWrong');
    assert.equal((await post(app, 'verify', { challengeId: r.body.result.challengeId, code: wrong })).body.error.key, 'errors.codeExpired');
    assert.equal((await post(app, 'verify', { challengeId: r.body.result.challengeId, code })).body.error.key, 'errors.codeExpired');
  });

  await t.test('at most five codes an hour to one mobile', async () => {
    const phone = '01277665544';
    for (let i = 0; i < 5; i++) assert.equal((await post(app, 'phone', { phone })).status, 200);
    const r = await post(app, 'phone', { phone });
    assert.equal(r.status, 429);
    assert.equal(r.body.error.key, 'errors.tooManyRequests');
  });
});

test('a live platform', async (t) => {
  const app = await start({}, { MOSTA3LEM_MODE: 'live', ALLOW_DEV_MESSAGING: 'true' });
  t.after(() => app.close());
  const call = client(app);

  await t.test('starts empty, without any demo shortcut', async () => {
    assert.equal((await app.inject({ url: '/health' })).json().mode, 'live');
    for (const name of ['auth.loginAs', 'auth.listDemoUsers', 'auth.checkPassword', 'demo.reset', 'demo.advance']) {
      assert.equal((await call(name, [])).status, 404, name);
    }
    assert.equal((await post(app, 'password', { email: 'laila@mosta3lem.example', password: DEMO_PW })).body.error.key, 'errors.wrongPassword');
  });

  let adminToken;
  await t.test('the first Super admin chooses a password from the emailed link and signs in', async () => {
    await app.adminTools.createSuperAdmin('Laila Hosny', 'laila@mosta3lem.example');
    assert.equal((await post(app, 'password', { email: 'laila@mosta3lem.example', password: DEMO_PW })).body.error.key, 'errors.wrongPassword', 'no demo password on a live platform');
    const msg = await lastMessage(app, 'laila@mosta3lem.example');
    assert.equal((await post(app, 'set-password', { token: linkTokenIn(msg), password: NEW_PW })).status, 200);
    adminToken = await emailSignIn(app, 'laila@mosta3lem.example', NEW_PW);
    const staff = (await call('staff.list', [], adminToken)).body.result;
    assert.equal(staff.length, 1);
    assert.equal(staff[0].invited, false);
  });

  await t.test('a new provider signs up only with a mobile they confirmed', async () => {
    const values = {
      kind: 'individual', services: ['investigation'], fullName: 'Youssef Hamdy Salem', nationalId: '29406152112345', phone: '01555443322',
      addrGov: 'giza', addrCity: 'faisal', addrStreet: '22 Faisal St', coverage: { giza: ['faisal', 'haram'] }, terms: true
    };
    const without = await call('registration.submit', [values]);
    assert.equal(without.status, 403);
    assert.equal(without.body.error.key, 'errors.phoneNotVerified');

    // A proof for another mobile does not count.
    const other = await post(app, 'phone', { phone: '01022334455', purpose: 'signup' });
    const otherProof = (await post(app, 'verify', { challengeId: other.body.result.challengeId, code: codeIn(await lastMessage(app, '01022334455')) })).body.result.phoneProof;
    assert.equal((await call('registration.submit', [values], null, { 'x-phone-proof': otherProof })).status, 403);

    const c = await post(app, 'phone', { phone: values.phone, purpose: 'signup' });
    const msg = await lastMessage(app, values.phone);
    assert.equal(msg.template, 'signup_code');
    const v = await post(app, 'verify', { challengeId: c.body.result.challengeId, code: codeIn(msg) });
    assert.equal(v.status, 200);
    const proof = v.body.result.phoneProof;
    const r = await call('registration.submit', [values], null, { 'x-phone-proof': proof });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.session.token, 'the new owner is signed in to follow the application');
    assert.equal((await call('registration.mine', [], r.body.session.token)).status, 200);
    // The proof works once.
    const again = await call('registration.submit', [Object.assign({}, values, { nationalId: '29406152112346' })], null, { 'x-phone-proof': proof });
    assert.equal(again.status, 403);
  });
});

test('one address can only try to sign in a few times a minute', async (t) => {
  const app = await start({ signInPerMinute: 3 });
  t.after(() => app.close());
  for (let i = 0; i < 3; i++) assert.equal((await post(app, 'password', { email: 'x@y.example', password: 'whatever1234' })).status, 400);
  const r = await post(app, 'password', { email: 'x@y.example', password: 'whatever1234' });
  assert.equal(r.status, 429);
  assert.equal(r.body.error.key, 'errors.tooManyRequests');
});
