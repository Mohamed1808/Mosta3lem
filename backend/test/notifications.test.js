/* Delivering notifications: push to signed-in phones, email for organisations and staff,
   SMS for providers without push, no names in pushes, nothing sent twice. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, client, signInAs } = require('./helpers');

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

async function register(app, session, token, lang) {
  const res = await app.inject({ method: 'POST', url: '/api/v1/devices/register', payload: { token, platform: 'android', lang: lang || 'en' }, headers: session ? { authorization: 'Bearer ' + session } : {} });
  return res.statusCode;
}
const outboxTo = async (app, to) => (await app.db.query('SELECT * FROM outbox WHERE destination = $1 ORDER BY id', [to])).rows;
const outboxCount = async (app) => (await app.db.query('SELECT count(*)::int AS n FROM outbox')).rows[0].n;

test('notification delivery', async (t) => {
  const app = await start();
  t.after(() => app.close());
  const call = client(app);

  await t.test('notifications already in the data are not sent', async () => {
    const before = await outboxCount(app);
    await app.notifyNow();
    assert.equal(await outboxCount(app), before);
    const pending = (await app.db.query("SELECT count(*)::int AS n FROM notification_deliveries WHERE status = 'pending'")).rows[0].n;
    assert.equal(pending, 0);
  });

  await t.test('only a signed-in person can register a phone, with a real push token', async () => {
    assert.equal(await register(app, null, TOKEN_A), 401);
    const m = await signInAs(call, 'platform_management');
    assert.equal(await register(app, m.token, 'not-a-token'), 400);
    assert.equal(await register(app, m.token, TOKEN_A), 200);
  });

  await t.test('Management hears about a fee waiting for them by push and email', async () => {
    const m = await signInAs(call, 'platform_management');
    assert.equal(await register(app, m.token, TOKEN_A, 'en'), 200);
    const fin = await signInAs(call, 'platform_finance');
    assert.equal((await call('billing.proposeFee', [12, 'Market review'], fin.token)).status, 200);
    await app.notifyNow();
    const pushes = await outboxTo(app, TOKEN_A);
    assert.equal(pushes.length, 1);
    assert.equal(pushes[0].body, 'Mosta3lem: A platform fee of 12% waits for your confirmation');
    const mails = await outboxTo(app, m.user.email);
    assert.equal(mails.at(-1).template, 'notice');
    assert.match(mails.at(-1).body, /12%/);
    // Every Management person gets it, not only the one with a phone.
    const rows = (await app.db.query("SELECT channel, status FROM notification_deliveries WHERE channel IN ('push', 'email')")).rows;
    assert.ok(rows.every((r) => r.status === 'sent'));
    // Running again sends nothing twice.
    const n = await outboxCount(app);
    await app.notifyNow();
    assert.equal(await outboxCount(app), n);
  });

  await t.test('a push never carries names, only references and counts', async () => {
    const m = await signInAs(call, 'platform_management');
    await register(app, m.token, TOKEN_B, 'ar');
    await app.db.query("INSERT INTO notifications (id, doc) VALUES ('ntf_test_names', $1::jsonb)", [JSON.stringify({
      id: 'ntf_test_names', userId: m.user.id, key: 'notif.offer_accepted', params: { provider: 'Delta Field Services', ref: 'INV-0042' }, link: 'case:x', at: Date.now(), read: false
    })]);
    await app.notifyNow();
    const p = (await outboxTo(app, TOKEN_B)).at(-1);
    assert.doesNotMatch(p.body, /Delta/);
    assert.match(p.body, /INV-0042/);
    assert.match(p.body, /^مستعلم: /, 'in the language the phone registered with');
  });

  await t.test('signing out stops pushes to that phone', async () => {
    const m = await signInAs(call, 'platform_management');
    await register(app, m.token, TOKEN_A, 'en');
    await call('auth.logout', [], m.token);
    const before = (await outboxTo(app, TOKEN_A)).length;
    const fin = await signInAs(call, 'platform_finance');
    const mg = await signInAs(call, 'platform_management');
    await call('billing.sendBackFee', ['Not now'], mg.token);
    await call('billing.proposeFee', [11, 'Second try'], fin.token);
    await app.notifyNow();
    assert.equal((await outboxTo(app, TOKEN_A)).length, before);
  });

  await t.test('providers with no phone registered get urgent news by SMS', async () => {
    const admin = await signInAs(call, 'platform_admin');
    const before = (await app.db.query("SELECT count(*)::int AS n FROM outbox WHERE channel = 'sms'")).rows[0].n;
    assert.equal((await call('demo.advance', [4 * 24 * 3600 * 1000], admin.token)).status, 200);
    await app.notifyNow();
    const sms = (await app.db.query("SELECT * FROM outbox WHERE channel = 'sms' ORDER BY id")).rows.slice(before);
    assert.ok(sms.length > 0, 'deadline news went out by SMS');
    assert.ok(sms.every((s) => !s.destination.includes('@')), 'sent to mobiles');
    // Organisation users and staff are never sent SMS.
    const people = (await call('auth.listDemoUsers')).body.result;
    const emailPeople = new Set(people.filter((u) => u.portal === 'entity' || u.portal === 'admin').map((u) => u.phone));
    assert.ok(sms.every((s) => !emailPeople.has(s.destination)));
  });

  await t.test('a deactivated person gets nothing', async () => {
    const admin = await signInAs(call, 'platform_admin');
    const staff = (await call('staff.list', [], admin.token)).body.result;
    const karim = staff.find((s) => s.role === 'platform_management');
    const mine = await signInAs(call, 'platform_management');
    await register(app, mine.token, TOKEN_A, 'en');
    assert.equal((await call('staff.setActive', [karim.id, false], admin.token)).status, 200);
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM devices WHERE user_id = $1', [karim.id])).rows[0].n, 0);
  });
});
