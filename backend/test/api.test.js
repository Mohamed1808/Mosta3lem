/* API tests: run with `npm test`. Each server uses its own PGlite database (real
   PostgreSQL inside Node), so nothing needs to be installed or running. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildServer } = require('../src/server');

const config = (over) => Object.assign({
  mode: 'demo', databaseUrl: null, dataDir: 'memory', corsOrigins: [],
  sessionHours: 1, tickSeconds: 0, bodyLimitMb: 15, logger: false
}, over);

function client(app) {
  return async function call(name, args, token, headers) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/' + name.replace('.', '/'),
      payload: { args: args || [] },
      headers: Object.assign(token ? { authorization: 'Bearer ' + token } : {}, headers || {})
    });
    return { status: res.statusCode, body: res.json() };
  };
}

async function signIn(call, role) {
  const users = (await call('auth.listDemoUsers')).body.result;
  const u = users.find((x) => x.role === role);
  const r = await call('auth.loginAs', [u.id]);
  assert.equal(r.status, 200);
  return { user: u, token: r.body.session.token };
}

test('API on a fresh database', async (t) => {
  const app = await buildServer(config());
  t.after(() => app.close());
  const call = client(app);

  await t.test('health reports the mode and database', async () => {
    const res = await app.inject({ url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true, mode: 'demo', database: 'pglite', dataVersion: res.json().dataVersion });
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  await t.test('only methods in the service contract can be called', async () => {
    const { token } = await signIn(call, 'platform_ops');
    for (const name of ['cases.nope', 'constructor.x', '__proto__.x', 'cases.constructor', 'services.verify', 'store.reset']) {
      const r = await call(name, [], token);
      assert.equal(r.status, 404, name);
      assert.equal(r.body.error.key, 'errors.notFound');
    }
    assert.equal((await call('cases.list', 'not-a-list', token)).status, 400);
  });

  await t.test('calls without a valid sign-in are refused', async () => {
    assert.equal((await call('cases.list', [{}])).status, 401);
    const r = await call('cases.list', [{}], 'made-up-token');
    assert.equal(r.status, 401);
    assert.equal(r.body.error.key, 'errors.notSignedIn');
  });

  await t.test('signing in returns a session token that works until sign-out', async () => {
    const { user, token } = await signIn(call, 'platform_ops');
    const me = await call('auth.currentUser', [], token);
    assert.equal(me.body.result.user.id, user.id);
    assert.ok((await call('cases.list', [{}], token)).body.result.length > 0);
    assert.equal((await call('auth.logout', [], token)).status, 200);
    assert.equal((await call('cases.list', [{}], token)).status, 401);
  });

  await t.test('the database keeps only a hash of each token', async () => {
    const { token } = await signIn(call, 'platform_ops');
    const stored = (await app.db.query('SELECT token_hash FROM sessions')).rows.map((r) => r.token_hash);
    const expected = require('crypto').createHash('sha256').update(token).digest('hex');
    assert.ok(stored.includes(expected));
    assert.ok(!stored.includes(token));
  });

  await t.test('team permissions apply: Customer support cannot propose a fee', async () => {
    const { token } = await signIn(call, 'platform_support');
    const r = await call('billing.proposeFee', [12, 'test'], token);
    assert.equal(r.status, 403);
    assert.equal(r.body.error.key, 'errors.forbidden');
  });

  await t.test('personal data stays hidden from Customer support', async () => {
    const ops = await signIn(call, 'platform_ops');
    const rows = (await call('cases.list', [{}], ops.token)).body.result;
    let id = null, nationalId = null;
    for (const row of rows) {
      const d = (await call('cases.get', [row.id], ops.token)).body.result;
      if (d.case.customer && d.case.customer.nationalId) { id = row.id; nationalId = d.case.customer.nationalId; break; }
    }
    assert.ok(id, 'a case with customer details');
    const sup = await signIn(call, 'platform_support');
    const seen = (await call('cases.get', [id], sup.token)).body.result;
    assert.ok(seen.case.masked);
    assert.ok(!JSON.stringify(seen).includes(nationalId));
  });

  await t.test('deactivating a person signs them out on every device', async () => {
    const admin = await signIn(call, 'platform_admin');
    const invited = await call('staff.invite', [{ name: 'Test Person', email: 'test.person@platform.example', role: 'platform_support' }], admin.token);
    assert.equal(invited.status, 200);
    const theirs = (await call('auth.loginAs', [invited.body.result.id])).body.session.token;
    assert.equal((await call('auth.currentUser', [], theirs)).status, 200);
    assert.equal((await call('staff.setActive', [invited.body.result.id, false], admin.token)).status, 200);
    assert.equal((await call('auth.currentUser', [], theirs)).status, 401);
  });

  await t.test('requests arriving together are served one at a time', async () => {
    const admin = await signIn(call, 'platform_admin');
    const emails = Array.from({ length: 8 }, (_, i) => `parallel.${i}@platform.example`);
    const results = await Promise.all(emails.map((email, i) =>
      call('staff.invite', [{ name: 'Parallel ' + i, email, role: 'platform_data' }], admin.token)));
    assert.ok(results.every((r) => r.status === 200));
    const staff = (await call('staff.list', [], admin.token)).body.result;
    for (const email of emails) assert.ok(staff.some((s) => s.email === email), email);
  });
});

test('changes survive a restart', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosta3lem-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const cfg = config({ dataDir: path.join(dir, 'db') });

  let app = await buildServer(cfg);
  let call = client(app);
  const admin = await signIn(call, 'platform_admin');
  const before = await call('audit.list', [{}], admin.token);
  assert.equal(before.status, 200);
  const invited = await call('staff.invite', [{ name: 'Kept After Restart', email: 'kept@platform.example', role: 'platform_qa' }], admin.token);
  assert.equal(invited.status, 200);
  await app.close();

  app = await buildServer(cfg);
  t.after(() => app.close());
  call = client(app);
  // The session from before the restart still works, and the new person is still there.
  const staff = await call('staff.list', [], admin.token);
  assert.equal(staff.status, 200);
  assert.ok(staff.body.result.some((s) => s.email === 'kept@platform.example'));
  const after = await call('audit.list', [{}], admin.token);
  assert.equal(after.body.result.length, before.body.result.length + 1, 'one new activity record, nothing lost or doubled');
  assert.deepEqual(after.body.result.slice(1).map((a) => a.id), before.body.result.map((a) => a.id), 'same order as before the restart');
});
