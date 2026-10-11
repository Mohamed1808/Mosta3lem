/* Rate limits counted in the database: every copy of the API counts together, so more
   copies do not mean more tries. (In memory, each copy counts on its own.) */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, post } = require('./helpers');
const { openDb } = require('../src/db');

const tryPassword = (app) => post(app, 'password', { email: 'x@y.example', password: 'whatever1234' });

test('two copies share one sign-in limit', async (t) => {
  const db = await openDb({ dataDir: 'memory' });
  const a = await start({ db, signInPerMinute: 4, rateLimitStore: 'database' });
  const b = await start({ db, signInPerMinute: 4, rateLimitStore: 'database' });
  t.after(async () => { await a.close(); await b.close(); await db.close(); });

  const statuses = [];
  for (const app of [a, b, a, b]) statuses.push((await tryPassword(app)).status);
  assert.deepEqual(statuses, [400, 400, 400, 400], 'four tries in all are allowed');
  const fifth = await tryPassword(a);
  const sixth = await tryPassword(b);
  assert.equal(fifth.status, 429);
  assert.equal(sixth.status, 429, 'the other copy refuses too');
  assert.equal(sixth.body.error.key, 'errors.tooManyRequests');

  // Counted once, in one place.
  const rows = (await db.query("SELECT key, count FROM rate_limits WHERE key LIKE '%/api/v1/session/password%'")).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 6);
});

test('tries at the same moment on both copies are all counted', async (t) => {
  const db = await openDb({ dataDir: 'memory' });
  const a = await start({ db, signInPerMinute: 10, rateLimitStore: 'database' });
  const b = await start({ db, signInPerMinute: 10, rateLimitStore: 'database' });
  t.after(async () => { await a.close(); await b.close(); await db.close(); });
  const results = await Promise.all(Array.from({ length: 16 }, (_, i) => tryPassword(i % 2 ? a : b)));
  const refused = results.filter((r) => r.status === 429).length;
  assert.equal(refused, 6, '16 tries against a limit of 10');
});

test('the general limit is shared too, and says when to try again', async (t) => {
  const db = await openDb({ dataDir: 'memory' });
  const a = await start({ db, requestsPerMinute: 3, rateLimitStore: 'database' });
  const b = await start({ db, requestsPerMinute: 3, rateLimitStore: 'database' });
  t.after(async () => { await a.close(); await b.close(); await db.close(); });
  for (const app of [a, b, a]) assert.equal((await app.inject({ url: '/health' })).statusCode, 200);
  const res = await b.inject({ url: '/health' });
  assert.equal(res.statusCode, 429);
  assert.ok(Number(res.headers['retry-after']) > 0 && Number(res.headers['retry-after']) <= 60);
});

test('in memory, each copy counts on its own', async (t) => {
  const db = await openDb({ dataDir: 'memory' });
  const a = await start({ db, signInPerMinute: 2, rateLimitStore: 'memory' });
  const b = await start({ db, signInPerMinute: 2, rateLimitStore: 'memory' });
  t.after(async () => { await a.close(); await b.close(); await db.close(); });
  for (const app of [a, a, b, b]) assert.equal((await tryPassword(app)).status, 400);
  assert.equal((await tryPassword(a)).status, 429);
});

test('finished windows are cleared away', async (t) => {
  const db = await openDb({ dataDir: 'memory' });
  const app = await start({ db, rateLimitStore: 'database' });
  t.after(async () => { await app.close(); await db.close(); });
  await tryPassword(app);
  await db.query("UPDATE rate_limits SET window_ends = now() - interval '5 minutes'");
  await require('../src/ratelimit').sweep(db);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM rate_limits')).rows[0].n, 0);
  await tryPassword(app);
  // A new window starts from one (sign-in routes count under their own limit only).
  assert.deepEqual((await db.query('SELECT count FROM rate_limits')).rows.map((r) => r.count), [1]);
});
