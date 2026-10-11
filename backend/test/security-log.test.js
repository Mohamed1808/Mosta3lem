/* Reading the security log: who may, filters, the 24-hour summary, pages, and that opening
   the log is itself recorded. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, client, post, signInAs } = require('./helpers');

async function events(app, token, filters) {
  const res = await app.inject({ method: 'POST', url: '/api/v1/security/events', payload: filters || {}, headers: token ? { authorization: 'Bearer ' + token } : {} });
  return { status: res.statusCode, body: res.json() };
}

test('security log', async (t) => {
  const app = await start();
  t.after(() => app.close());
  const call = client(app);
  const people = (await call('auth.listDemoUsers')).body.result;
  const org = people.find((u) => u.role === 'entity_credit');

  // Some activity: wrong passwords until a lockout, from one address and device.
  for (let i = 0; i < 5; i++) await post(app, 'password', { email: org.email, password: 'wrong-password-' + i }, { 'user-agent': 'attacker-tool' });
  await post(app, 'password', { email: 'nobody@nowhere.example', password: 'whatever-123' });

  await t.test('only Legal and the Super admin may read it', async () => {
    assert.equal((await events(app, null)).status, 401);
    for (const role of ['platform_ops', 'platform_support', 'platform_finance', 'platform_data', 'platform_management']) {
      const { token } = await signInAs(call, role);
      assert.equal((await events(app, token)).status, 403, role);
    }
    const orgUser = await signInAs(call, 'entity_admin');
    assert.equal((await events(app, orgUser.token)).status, 403);
    for (const role of ['platform_legal', 'platform_admin']) {
      const { token } = await signInAs(call, role);
      assert.equal((await events(app, token)).status, 200, role);
    }
  });

  await t.test('events name the person, the address and the device', async () => {
    const { token } = await signInAs(call, 'platform_legal');
    const r = (await events(app, token, { group: 'failed' })).body.result;
    const failed = r.events.filter((e) => e.kind === 'signin.password_failed');
    assert.equal(failed.length, 4);
    assert.equal(failed[0].user.name, org.name);
    assert.equal(failed[0].user.role, 'entity_credit');
    assert.equal(failed[0].userAgent, 'attacker-tool');
    assert.ok(failed[0].ip);
    assert.ok(r.events.some((e) => e.kind === 'signin.unknown_email' && e.user === null));
    assert.ok(r.events.every((e) => !['signin.ok', 'signin.demo', 'signin.locked'].includes(e.kind)));
  });

  await t.test('the last 24 hours at a glance', async () => {
    const { token } = await signInAs(call, 'platform_admin');
    const s = (await events(app, token)).body.result.summary;
    assert.equal(s.lockouts, 1);
    assert.ok(s.failures >= 6, 'failures: ' + s.failures);
    assert.ok(s.signins >= 1);
    assert.ok(s.failingAddresses >= 1);
    assert.ok(s.topFailing[0].n >= 6);
  });

  await t.test('search by name or email, and by person', async () => {
    const { token } = await signInAs(call, 'platform_legal');
    const byName = (await events(app, token, { q: org.name.split(' ')[0] })).body.result.events;
    assert.ok(byName.length >= 5);
    assert.ok(byName.every((e) => e.user && e.user.id === org.id || e.user && e.user.name.toLowerCase().includes(org.name.split(' ')[0].toLowerCase())));
    const byPerson = (await events(app, token, { userId: org.id })).body.result.events;
    assert.ok(byPerson.length >= 5 && byPerson.every((e) => e.user && e.user.id === org.id));
  });

  await t.test('opening the log is recorded', async () => {
    const legal = await signInAs(call, 'platform_legal');
    await events(app, legal.token, { group: 'locked', days: 30 });
    const admin = await signInAs(call, 'platform_admin');
    const viewed = (await events(app, admin.token, { group: 'log' })).body.result.events;
    const mine = viewed.find((e) => e.user && e.user.id === legal.user.id && e.detail && e.detail.group === 'locked');
    assert.ok(mine, 'Legal opening the log was recorded');
    assert.equal(mine.detail.days, 30);
    // Reloading the same view within a minute is not recorded again.
    await events(app, legal.token, { group: 'locked', days: 30 });
    const again = (await events(app, admin.token, { group: 'log' })).body.result.events
      .filter((e) => e.user && e.user.id === legal.user.id && e.detail && e.detail.group === 'locked');
    assert.equal(again.length, 1);
  });

  await t.test('older events load page by page', async () => {
    for (let i = 0; i < 110; i++) await app.security.record('signin.demo', { userId: org.id });
    const { token } = await signInAs(call, 'platform_admin');
    const first = (await events(app, token, { group: 'signin' })).body.result;
    assert.equal(first.events.length, 100);
    assert.ok(first.next);
    const second = (await events(app, token, { group: 'signin', before: first.next })).body.result;
    assert.ok(second.events.length > 0);
    assert.ok(second.events.every((e) => e.id < first.next));
    assert.equal(second.summary, null);
    const ids = new Set(first.events.map((e) => e.id));
    assert.ok(second.events.every((e) => !ids.has(e.id)));
  });
});
