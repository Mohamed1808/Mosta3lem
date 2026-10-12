/* The authenticator app step for key staff: set up after the emailed code the first time,
   then used instead of it; codes cannot be reused; a reset removes it. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, client, post, lastMessage, codeIn, signInAs } = require('./helpers');
const totp = require('../src/totp');

const PW = 'Mosta3lem@2026';
const LAILA = 'laila.hosny@platform.example';

test('authenticator codes follow RFC 6238', () => {
  // RFC 6238 test secret "12345678901234567890", at 59 seconds: 94287082 (last 6 digits 287082).
  const secret = totp.base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(totp.codeAt(secret, totp.stepAt(59000)), '287082');
  assert.equal(totp.check(secret, '287082', 59000, 0), 1);
  assert.equal(totp.check(secret, '287082', 59000, 1), null, 'a used step is refused');
  assert.equal(totp.check(secret, '000000', 59000, 0), null);
});

test('authenticator sign-in for the Super admin and Finance', async (t) => {
  const app = await start({ totpRoles: ['platform_admin', 'platform_finance'] });
  t.after(() => app.close());
  const call = client(app);
  let secret;

  await t.test('first time: the emailed code, then the app is set up', async () => {
    const p = await post(app, 'password', { email: LAILA, password: PW });
    assert.equal(p.status, 200);
    assert.equal(p.body.result.method, undefined, 'no app yet, so an emailed code');
    const code = codeIn(await lastMessage(app, LAILA));
    const v = await post(app, 'verify', { challengeId: p.body.result.challengeId, code });
    assert.equal(v.status, 200);
    assert.ok(v.body.result.enrol && v.body.result.enrol.uri.startsWith('otpauth://totp/'), 'set up the app before a session');
    assert.equal(v.body.session, undefined);
    secret = v.body.result.enrol.secret;
    const bad = await post(app, 'verify', { challengeId: v.body.result.challengeId, code: '000000' });
    assert.equal(bad.body.error.key, 'errors.codeWrong');
    const ok = await post(app, 'verify', { challengeId: v.body.result.challengeId, code: totp.codeAt(secret, totp.stepAt(Date.now())) });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.ok(ok.body.session.token);
    const row = (await app.db.query('SELECT secret_enc, confirmed_at FROM authenticators')).rows[0];
    assert.ok(row.confirmed_at);
    assert.ok(!row.secret_enc.includes(secret), 'the secret is stored encrypted');
  });

  await t.test('after that: the app code instead of an email, each code once', async () => {
    const before = (await app.db.query('SELECT count(*)::int AS n FROM outbox')).rows[0].n;
    const p = await post(app, 'password', { email: LAILA, password: PW });
    assert.equal(p.body.result.method, 'authenticator');
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM outbox')).rows[0].n, before, 'no email sent');
    const used = totp.codeAt(secret, totp.stepAt(Date.now()));
    assert.equal((await post(app, 'verify', { challengeId: p.body.result.challengeId, code: used })).body.error.key, 'errors.codeWrong', 'the code used to set up cannot be used again');
    const next = totp.codeAt(secret, totp.stepAt(Date.now()) + 1);
    const ok = await post(app, 'verify', { challengeId: p.body.result.challengeId, code: next });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
  });

  await t.test('other staff keep the emailed code', async () => {
    const p = await post(app, 'password', { email: 'mai.adel@platform.example', password: PW });
    assert.equal(p.body.result.method, undefined);
    const v = await post(app, 'verify', { challengeId: p.body.result.challengeId, code: codeIn(await lastMessage(app, 'mai.adel@platform.example')) });
    assert.ok(v.body.session.token);
  });

  await t.test('a Super admin resetting a sign-in removes the authenticator', async () => {
    const hossam = (await call('auth.listDemoUsers')).body.result.find((u) => u.role === 'platform_finance');
    await app.db.query("INSERT INTO authenticators (user_id, secret_enc, confirmed_at) VALUES ($1, 'x', now())", [hossam.id]);
    const admin = await signInAs(call, 'platform_admin');
    assert.equal((await call('accounts.resetLogin', [hossam.id], admin.token)).status, 200);
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM authenticators WHERE user_id = $1', [hossam.id])).rows[0].n, 0);
    const ev = (await app.db.query("SELECT count(*)::int AS n FROM security_events WHERE kind = 'authenticator.reset'")).rows[0].n;
    assert.equal(ev, 1);
  });
});
