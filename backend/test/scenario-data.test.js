/* The data left by all the engine scenarios (registrations, offers, field work, reports,
   disputes, batches, invoices, settlements, staff accounts...) must satisfy every rule the
   database enforces: links between tables, checks, unique emails. So an engine change that
   produces data the database would refuse fails here, not in production. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { openDb, migrate } = require('../src/db');
const { createState } = require('../src/state');
const { loadEngine } = require('../src/engine');

const SCENARIOS = path.join(__dirname, '..', '..', 'prototype', 'tests', 'scenarios.js');

/** Run the scenarios in a child process and keep the engine's data when they finish. */
function scenarioData() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosta3lem-scenarios-'));
  const out = path.join(dir, 'data.json');
  const preload = path.join(dir, 'capture.js');
  fs.writeFileSync(preload, `
    const vm = require('vm'); let ctx = null;
    const create = vm.createContext; vm.createContext = (c, o) => { ctx = c; return create(c, o); };
    const exit = process.exit; process.exit = (code) => {
      if (ctx && ctx.ICM && ctx.ICM.store.db) require('fs').writeFileSync(${JSON.stringify(out)}, JSON.stringify(ctx.ICM.store.db));
      exit(code);
    };`);
  const r = spawnSync(process.execPath, ['--require', preload, SCENARIOS], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, 'the scenarios pass\n' + (r.stdout || '').slice(-2000));
  const data = JSON.parse(fs.readFileSync(out, 'utf8'));
  fs.rmSync(dir, { recursive: true, force: true });
  return data;
}

test('everything the scenarios produce fits the database rules', async (t) => {
  const data = scenarioData();
  const db = await openDb({ dataDir: 'memory' });
  t.after(() => db.close());
  await migrate(db);
  const { ICM } = loadEngine();
  ICM.store.db = data;
  const state = createState(db, ICM);
  const written = await state.persist();
  assert.ok(written > 500, 'the data was saved (' + written + ' rows)');

  await t.test('columns are filled from the records', async () => {
    const cases = (await db.query('SELECT count(*)::int AS n, count(status)::int AS s, count(entity_id)::int AS e, count(created_at)::int AS c FROM cases')).rows[0];
    assert.equal(cases.s, cases.n);
    assert.equal(cases.e, cases.n);
    assert.equal(cases.c, cases.n);
    const closed = (await db.query("SELECT count(*)::int AS n FROM cases WHERE closed_at IS NOT NULL")).rows[0].n;
    assert.ok(closed > 0);
    const fromDoc = data.cases.filter((c) => c.closedAt).length;
    assert.equal(closed, fromDoc);
  });

  await t.test('report views answer', async () => {
    const byStatus = (await db.query('SELECT service, status, count(*)::int AS n FROM report_cases GROUP BY 1, 2')).rows;
    assert.ok(byStatus.length > 5);
    const providers = (await db.query('SELECT name, cases, on_time_pct, avg_rating FROM report_providers WHERE cases > 0')).rows;
    assert.ok(providers.length > 0);
    assert.ok((await db.query('SELECT count(*)::int AS n FROM report_invoices')).rows[0].n > 0);
  });

  await t.test('the database refuses broken data', async () => {
    const someCase = (await db.query('SELECT doc FROM cases LIMIT 1')).rows[0].doc;
    const broken = Object.assign({}, someCase, { id: 'case_broken', entityId: 'ent_does_not_exist' });
    await assert.rejects(db.transaction((tx) => tx.query('INSERT INTO cases (id, doc) VALUES ($1, $2::jsonb)', [broken.id, JSON.stringify(broken)])), /cases_entity_fk/);
    const wrongService = Object.assign({}, someCase, { id: 'case_broken2', service: 'cleaning' });
    await assert.rejects(db.query('INSERT INTO cases (id, doc) VALUES ($1, $2::jsonb)', [wrongService.id, JSON.stringify(wrongService)]), /cases_service_known/);
    const mismatched = Object.assign({}, someCase, { id: 'case_other' });
    await assert.rejects(db.query('INSERT INTO cases (id, doc) VALUES ($1, $2::jsonb)', ['case_x', JSON.stringify(mismatched)]), /cases_id_matches/);
    const user = (await db.query("SELECT doc FROM users WHERE email IS NOT NULL LIMIT 1")).rows[0].doc;
    const twin = Object.assign({}, user, { id: 'u_twin', email: user.email.toUpperCase() });
    await assert.rejects(db.query('INSERT INTO users (id, doc) VALUES ($1, $2::jsonb)', [twin.id, JSON.stringify(twin)]), /users_email_unique/);
  });
});
