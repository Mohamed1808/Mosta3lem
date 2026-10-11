/* Security hardening: who can call what without signing in, one organisation or provider
   reaching another's work, idle sessions, headers, request size, logs, the security event
   log, and rate limits that a forged address cannot get around. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('stream');

const { start, client, post, lastMessage, signInAs } = require('./helpers');
const { loadEngine } = require('../src/engine');

const CONTRACTS = loadEngine().ICM.contracts;
const PUBLIC = new Set(['auth.currentUser', 'auth.logout', 'config.get', 'demo.clock', 'demo.tick', 'registration.submit',
  'auth.loginAs', 'auth.listDemoUsers', 'auth.checkPassword']);
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

test('security', async (t) => {
  const lines = [];
  const logStream = new Writable({ write(chunk, enc, cb) { lines.push(String(chunk)); cb(); } });
  const app = await start({ logger: undefined, logLevel: 'info', logStream });
  t.after(() => app.close());
  const call = client(app);
  const people = (await call('auth.listDemoUsers')).body.result;

  await t.test('without a sign-in, only the public methods answer', async () => {
    const open = [];
    for (const svc of Object.keys(CONTRACTS)) {
      for (const m of Object.keys(CONTRACTS[svc])) {
        const name = svc + '.' + m;
        if (PUBLIC.has(name)) continue;
        const r = await call(name, []);
        if (r.status !== 401) open.push(name + ' ' + r.status);
      }
    }
    assert.deepEqual(open, []);
  });

  await t.test('demo controls that change everyone\'s data are for the Super admin only', async () => {
    const ops = await signInAs(call, 'platform_ops');
    for (const name of ['demo.reset', 'demo.advance', 'demo.resetClock', 'demo.simulateBatchWork']) {
      assert.equal((await call(name, [], ops.token)).status, 403, name);
    }
    const provider = await signInAs(call, 'provider_admin');
    assert.equal((await call('demo.reset', [], provider.token)).status, 403);
    const admin = await signInAs(call, 'platform_admin');
    assert.equal((await call('demo.advance', [60000], admin.token)).status, 200);
    await call('demo.resetClock', [], admin.token);
  });

  await t.test('an organisation cannot open another organisation\'s case', async () => {
    const ops = await signInAs(call, 'platform_ops');
    const all = (await call('cases.list', [{}], ops.token)).body.result;
    const orgUser = people.find((u) => u.role === 'entity_admin');
    const other = all.find((c) => c.entityId && c.entityId !== orgUser.entityId);
    assert.ok(other);
    const { token } = await (async () => ({ token: (await call('auth.loginAs', [orgUser.id])).body.session.token }))();
    const r = await call('cases.get', [other.id], token);
    assert.ok(r.status === 403 || r.status === 404, 'refused, got ' + r.status);
    const mine = (await call('cases.list', [{}], token)).body.result;
    assert.ok(mine.length > 0 && mine.every((c) => c.entityId === orgUser.entityId));
  });

  await t.test('a provider cannot open another provider\'s case', async () => {
    const ops = await signInAs(call, 'platform_ops');
    const all = (await call('cases.list', [{}], ops.token)).body.result;
    const owner = people.find((u) => u.role === 'provider_admin');
    const other = all.find((c) => c.providerId && c.providerId !== owner.providerId);
    assert.ok(other);
    const token = (await call('auth.loginAs', [owner.id])).body.session.token;
    const r = await call('cases.get', [other.id], token);
    assert.ok(r.status === 403 || r.status === 404, 'refused, got ' + r.status);
  });

  await t.test('field agents see no money', async () => {
    const agent = people.find((u) => u.role === 'agent');
    const token = (await call('auth.loginAs', [agent.id])).body.session.token;
    const rows = (await call('cases.list', [{}], token)).body.result;
    assert.ok(rows.length > 0);
    assert.ok(rows.every((c) => c.price == null));
  });

  await t.test('a sign-in left unused ends: staff after 8 hours, others after 3 days', async () => {
    const staff = await signInAs(call, 'platform_ops');
    const org = await signInAs(call, 'entity_admin');
    const hash = (token) => require('crypto').createHash('sha256').update(token).digest('hex');
    const age = (token, hours) => app.db.query(
      'UPDATE sessions SET last_seen_at = now() - make_interval(hours => $2) WHERE token_hash = $1', [hash(token), hours]);
    await age(staff.token, 9);
    await age(org.token, 9);
    assert.equal((await call('auth.currentUser', [], staff.token)).status, 401, 'staff signed out');
    assert.equal((await call('auth.currentUser', [], org.token)).status, 200, 'organisation still signed in');
    await age(org.token, 73);
    assert.equal((await call('auth.currentUser', [], org.token)).status, 401);
  });

  await t.test('answers carry protective headers', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/config/get', payload: { args: [] } });
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.match(res.headers['content-security-policy'], /default-src 'none'/);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(res.headers['strict-transport-security'], undefined, 'only over https');
    const forged = await app.inject({ method: 'GET', url: '/health', headers: { 'x-forwarded-proto': 'https' } });
    assert.equal(forged.headers['strict-transport-security'], undefined, 'a forged https header is not trusted');
  });

  await t.test('big requests are refused unless signed in', async () => {
    const big = { args: [{ x: 'a'.repeat(100 * 1024) }] };
    const anon = await app.inject({ method: 'POST', url: '/api/v1/config/get', payload: big });
    assert.equal(anon.statusCode, 413);
    const ops = await signInAs(call, 'platform_ops');
    const signed = await app.inject({ method: 'POST', url: '/api/v1/cases/list', payload: big, headers: { authorization: 'Bearer ' + ops.token } });
    assert.equal(signed.statusCode, 200);
  });

  await t.test('signed file links and tokens never reach the logs', async () => {
    const ops = await signInAs(call, 'platform_ops');
    const inField = (await call('cases.list', [{}], ops.token)).body.result.find((c) => c.status === 'in_field' && c.agentId);
    const agent = people.find((u) => u.agentId === inField.agentId);
    const at = (await call('auth.loginAs', [agent.id])).body.session.token;
    const r = await call('cases.addPhoto', [inField.id, 'data:image/jpeg;base64,' + JPEG.toString('base64'), 'Door'], at);
    const link = new URL(r.body.result.photos.at(-1).dataUrl);
    assert.equal((await app.inject({ url: link.pathname + link.search })).statusCode, 200);
    const log = lines.join('');
    assert.ok(log.includes(link.pathname), 'the request is logged');
    assert.ok(!log.includes('sig='), 'without its signature');
    assert.ok(!log.includes(at), 'no session token');
  });

  await t.test('sign-ins and failures go to the security log, without secrets', async () => {
    const laila = people.find((u) => u.role === 'platform_admin');
    await post(app, 'password', { email: laila.email, password: 'not-the-password-1' }, { 'user-agent': 'test-phone' });
    const start = await post(app, 'password', { email: laila.email, password: 'Mosta3lem@2026' });
    const code = (await lastMessage(app, laila.email)).body.match(/\b(\d{6})\b/)[1];
    await post(app, 'verify', { challengeId: start.body.result.challengeId, code });
    const rows = (await app.db.query('SELECT kind, user_id, ip, user_agent, detail FROM security_events WHERE user_id = $1 ORDER BY id', [laila.id])).rows;
    const kinds = rows.map((r) => r.kind);
    assert.ok(kinds.includes('signin.password_failed'));
    assert.ok(kinds.includes('signin.ok'));
    assert.ok(rows.find((r) => r.kind === 'signin.password_failed').user_agent === 'test-phone');
    assert.ok(rows.every((r) => r.ip));
    const text = JSON.stringify(rows);
    assert.ok(!text.includes('not-the-password-1') && !text.includes(code));
  });
});

test('a forged address does not get around the sign-in limit', async (t) => {
  const app = await start({ signInPerMinute: 3 });
  t.after(() => app.close());
  for (let i = 0; i < 3; i++) {
    await post(app, 'password', { email: 'x@y.example', password: 'whatever1234' }, { 'x-forwarded-for': '10.0.0.' + i });
  }
  const r = await post(app, 'password', { email: 'x@y.example', password: 'whatever1234' }, { 'x-forwarded-for': '10.0.0.99' });
  assert.equal(r.status, 429);
});

test('behind a trusted proxy, the real address counts', async (t) => {
  const app = await start({ signInPerMinute: 3, trustProxy: ['127.0.0.1'] }); // the proxy's address
  t.after(() => app.close());
  for (let i = 0; i < 3; i++) await post(app, 'password', { email: 'x@y.example', password: 'whatever1234' }, { 'x-forwarded-for': '10.0.0.1' });
  assert.equal((await post(app, 'password', { email: 'x@y.example', password: 'whatever1234' }, { 'x-forwarded-for': '10.0.0.2' })).status, 400, 'another person is not blocked');
  assert.equal((await post(app, 'password', { email: 'x@y.example', password: 'whatever1234' }, { 'x-forwarded-for': '10.0.0.1' })).status, 429);
  // Over https through the proxy, browsers are told to use https only.
  const res = await app.inject({ method: 'GET', url: '/health', headers: { 'x-forwarded-proto': 'https', 'x-forwarded-for': '10.0.0.3' } });
  assert.match(res.headers['strict-transport-security'], /max-age=31536000/);
});

test('a live platform allows no web pages until they are listed', () => {
  const { readConfig } = require('../src/config');
  const live = readConfig({ MOSTA3LEM_MODE: 'live', ALLOW_DEV_MESSAGING: 'true', FILES_KEY: 'x' });
  assert.deepEqual(live.corsOrigins, []);
  assert.deepEqual(readConfig({ MOSTA3LEM_MODE: 'live', ALLOW_DEV_MESSAGING: 'true', FILES_KEY: 'x', CORS_ORIGINS: 'https://console.example' }).corsOrigins, ['https://console.example']);
  assert.equal(live.trustProxy, false);
});
