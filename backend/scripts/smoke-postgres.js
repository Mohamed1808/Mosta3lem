/* The API on a real PostgreSQL server (the tests use PGlite). Needs an empty database:
     DATABASE_URL=postgres://user:pass@localhost:5432/db node scripts/smoke-postgres.js
   Checks migrations, seeding, sign-in with a code, a change, files, notifications, and that
   everything is still there after a restart. Exits 1 on the first failure. */
'use strict';

const assert = require('node:assert/strict');
const crypto = require('crypto');
const { readConfig } = require('../src/config');
const { buildServer } = require('../src/server');

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL to an empty PostgreSQL database.');
  process.exit(1);
}

const config = () => Object.assign(readConfig({ MOSTA3LEM_MODE: 'demo', DATABASE_URL: process.env.DATABASE_URL }), {
  logger: false, tickSeconds: 0, filesDriver: 'memory', filesKey: crypto.randomBytes(32).toString('base64'), corsOrigins: []
});

const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

function client(app) {
  return {
    call: async (name, args, token) => {
      const r = await app.inject({ method: 'POST', url: '/api/v1/' + name.replace('.', '/'), payload: { args: args || [] }, headers: token ? { authorization: 'Bearer ' + token } : {} });
      return { status: r.statusCode, body: r.json() };
    },
    post: async (route, payload) => {
      const r = await app.inject({ method: 'POST', url: '/api/v1/session/' + route, payload });
      return { status: r.statusCode, body: r.json() };
    }
  };
}

async function step(name, fn) {
  try {
    await fn();
    console.log('ok   ' + name);
  } catch (e) {
    console.log('FAIL ' + name + '\n     ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n     ') : e));
    process.exit(1);
  }
}

(async () => {
  let app = await buildServer(config());
  let { call, post } = client(app);
  let token, laila;

  await step('migrations ran and the demo data is in PostgreSQL', async () => {
    const r = await app.db.query("SELECT count(*)::int AS n FROM schema_migrations");
    assert.ok(r.rows[0].n >= 4);
    assert.ok((await app.db.query('SELECT count(*)::int AS n FROM cases')).rows[0].n > 20);
  });

  await step('columns, links and report views', async () => {
    const c = (await app.db.query('SELECT count(*)::int AS n, count(status)::int AS s, count(created_at)::int AS t FROM cases')).rows[0];
    assert.equal(c.s, c.n);
    assert.equal(c.t, c.n);
    assert.ok((await app.db.query('SELECT count(*)::int AS n FROM report_cases')).rows[0].n === c.n);
    assert.ok((await app.db.query('SELECT count(*)::int AS n FROM report_providers WHERE cases > 0')).rows[0].n > 0);
    await assert.rejects(app.db.transaction((tx) => tx.query(
      "INSERT INTO cases (id, doc) SELECT 'case_x', jsonb_set(jsonb_set(doc, '{id}', '\"case_x\"'), '{entityId}', '\"ent_missing\"') FROM cases LIMIT 1")), /cases_entity_fk/);
  });

  await step('real sign-in: password, emailed code, session', async () => {
    laila = (await call('auth.listDemoUsers')).body.result.find((u) => u.role === 'platform_admin');
    const start = await post('password', { email: laila.email, password: 'Mosta3lem@2026' });
    assert.equal(start.status, 200, JSON.stringify(start.body));
    const msg = (await app.db.query('SELECT body FROM outbox WHERE destination = $1 ORDER BY id DESC LIMIT 1', [laila.email])).rows[0];
    const code = msg.body.match(/\b(\d{6})\b/)[1];
    const done = await post('verify', { challengeId: start.body.result.challengeId, code });
    assert.equal(done.status, 200, JSON.stringify(done.body));
    token = done.body.session.token;
  });

  await step('a change is saved in one transaction', async () => {
    const r = await call('staff.invite', [{ name: 'Smoke Test', email: 'smoke.test@platform.example', role: 'platform_data' }], token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.meta.changed, true);
    const row = (await app.db.query("SELECT doc FROM users WHERE doc->>'email' = 'smoke.test@platform.example'")).rows[0];
    assert.ok(row && row.doc.role === 'platform_data');
  });

  await step('five wrong passwords lock the account', async () => {
    const people = (await call('auth.listDemoUsers')).body.result;
    const org = people.find((u) => u.role === 'entity_credit');
    let r;
    for (let i = 0; i < 5; i++) r = await post('password', { email: org.email, password: 'wrong-password-' + i });
    assert.equal(r.body.error.key, 'errors.signInLocked');
  });

  await step('files are stored and served by signed link', async () => {
    const people = (await call('auth.listDemoUsers')).body.result;
    const ops = (await call('auth.loginAs', [people.find((u) => u.role === 'platform_ops').id])).body.session.token;
    const inField = (await call('cases.list', [{}], ops)).body.result.find((c) => c.status === 'in_field' && c.agentId);
    const agent = people.find((u) => u.agentId === inField.agentId);
    const at = (await call('auth.loginAs', [agent.id])).body.session.token;
    const r = await call('cases.addPhoto', [inField.id, 'data:image/jpeg;base64,' + JPEG.toString('base64'), 'Door'], at);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const link = new URL(r.body.result.photos.at(-1).dataUrl);
    const res = await app.inject({ url: link.pathname + link.search });
    assert.equal(res.statusCode, 200);
    assert.ok(res.rawPayload.equals(JPEG));
  });

  await step('notifications are delivered once', async () => {
    const fin = (await call('auth.loginAs', [(await call('auth.listDemoUsers')).body.result.find((u) => u.role === 'platform_finance').id])).body.session.token;
    assert.equal((await call('billing.proposeFee', [12, 'Smoke test'], fin)).status, 200);
    await app.notifyNow();
    await app.notifyNow();
    const sent = (await app.db.query("SELECT count(*)::int AS n FROM notification_deliveries WHERE channel = 'email' AND status = 'sent'")).rows[0].n;
    const notices = (await app.db.query("SELECT count(*)::int AS n FROM outbox WHERE template = 'notice'")).rows[0].n;
    assert.ok(sent > 0);
    assert.equal(sent, notices);
  });

  const auditBefore = (await call('audit.list', [{}], token)).body.result.map((a) => a.id);
  await app.close();

  await step('after a restart: same data, same order, the session still works', async () => {
    app = await buildServer(config());
    ({ call, post } = client(app));
    const staff = await call('staff.list', [], token);
    assert.equal(staff.status, 200);
    assert.ok(staff.body.result.some((s) => s.email === 'smoke.test@platform.example'));
    const auditAfter = (await call('audit.list', [{}], token)).body.result.map((a) => a.id);
    assert.deepEqual(auditAfter, auditBefore);
  });

  await step('two copies of the API at once: nothing lost, nothing repeated, sent once', async () => {
    const other = await buildServer(config());
    const B = client(other);
    try {
      const people = Array.from({ length: 12 }, (_, i) => ({ name: 'Two Copies ' + i, email: `two.copies.${i}@platform.example`, role: 'platform_support' }));
      const results = await Promise.all(people.map((p, i) => (i % 2 ? call : B.call)('staff.invite', [p], token)));
      assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.map((r) => r.status)));
      for (const c of [call, B.call]) {
        const list = (await c('staff.list', [], token)).body.result;
        for (const p of people) assert.ok(list.some((x) => x.email === p.email), p.email);
      }
      const apply = (i) => ({
        kind: 'individual', services: ['investigation'], fullName: 'Copy Applicant ' + ['One', 'Two', 'Three', 'Four'][i],
        nationalId: '2950315211239' + i, phone: '0155544339' + i, addrGov: 'giza', addrCity: 'faisal', addrStreet: i + ' St', coverage: { giza: ['faisal'] }, terms: true
      });
      const regs = await Promise.all([0, 1, 2, 3].map((i) => (i % 2 ? call : B.call)('registration.submit', [apply(i)])));
      assert.ok(regs.every((r) => r.status === 200), JSON.stringify(regs.map((r) => r.body.error)));
      assert.equal(new Set(regs.map((r) => r.body.result.ref)).size, 4, 'different references');
      const users = (await call('auth.listDemoUsers')).body.result;
      const fin = (await call('auth.loginAs', [users.find((u) => u.role === 'platform_finance').id])).body.session.token;
      const mg = (await call('auth.loginAs', [users.find((u) => u.role === 'platform_management').id])).body.session.token;
      await B.call('billing.sendBackFee', ['again'], mg);
      // Let what that sent finish, then count only what the new proposal sends.
      await Promise.all([app.notifyNow(), other.notifyNow()]);
      const before = Number((await app.db.query("SELECT coalesce(max(id), 0) AS id FROM outbox")).rows[0].id);
      assert.equal((await B.call('billing.proposeFee', [14, 'Two copies'], fin)).status, 200);
      await Promise.all([app.notifyNow(), other.notifyNow(), app.notifyNow(), other.notifyNow()]);
      const sent = (await app.db.query("SELECT destination, body FROM outbox WHERE template = 'notice' AND id > $1", [before])).rows;
      const deliveries = (await app.db.query(
        "SELECT count(*)::int AS n FROM notification_deliveries d JOIN notifications n ON n.id = d.notification_id WHERE d.channel = 'email' AND n.doc->'params'->>'pct' = '14'")).rows[0].n;
      assert.ok(sent.length > 0);
      assert.equal(new Set(sent.map((m) => m.destination + '|' + m.body)).size, sent.length, 'nobody got the same email twice');
      assert.equal(sent.length, deliveries, 'each planned email sent once');
    } finally {
      await other.close();
    }
  });

  await step('two copies share one sign-in limit', async () => {
    await app.close();
    const tight = () => Object.assign(config(), { signInPerMinute: 3 });
    app = await buildServer(tight());
    const other = await buildServer(tight());
    try {
      const forgot = (s) => s.inject({ method: 'POST', url: '/api/v1/session/forgot', payload: { email: 'limit@nowhere.example' } });
      const first = await Promise.all([forgot(app), forgot(other), forgot(app)]);
      assert.deepEqual(first.map((r) => r.statusCode), [200, 200, 200]);
      assert.equal((await forgot(other)).statusCode, 429, 'the other copy refuses the fourth');
    } finally {
      await other.close();
    }
  });

  await app.close();
  console.log('\nPostgreSQL smoke test passed');
  process.exit(0);
})();
