/* The daily summary email: sent once a day to organisation users, in their language, with
   no customer names, and not to people who turned it off. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, client } = require('./helpers');
const { openDb } = require('../src/db');

test('daily summary email', async (t) => {
  // Hour 0: the summaries are due whenever the test runs.
  const app = await start({ digestHour: 0 });
  t.after(() => app.close());
  const call = client(app);
  const people = (await call('auth.listDemoUsers')).body.result;
  const tokenOf = async (name) => (await call('auth.loginAs', [people.find((u) => u.name === name).id])).body.session.token;

  const tamer = await tokenOf('Tamer Lotfy');
  assert.equal((await call('digest.setEnabled', [false], tamer)).status, 200);

  const sent = await app.digestsNow();
  assert.ok(sent > 0);
  const mails = (await app.db.query("SELECT destination, body FROM outbox WHERE template = 'digest'")).rows;
  const nadia = mails.find((m) => m.destination === 'nadia.samir@horus-auto.example');
  assert.ok(nadia, 'the Admin of Horus got one');
  assert.match(nadia.body, /مستعلم/, 'in Arabic when no language is known');
  assert.ok(!mails.some((m) => m.destination === 'tamer.lotfy@horus-auto.example'), 'not someone who turned it off');
  assert.ok(!mails.some((m) => /platform\.example$/.test(m.destination)), 'not staff');

  const ops = await tokenOf('Mai Adel');
  const cases = (await call('cases.list', [{}], ops)).body.result;
  const names = cases.map((c) => c.customer && c.customer.name).filter(Boolean);
  assert.ok(!mails.some((m) => names.some((n) => m.body.includes(n))), 'no customer names');

  assert.equal(await app.digestsNow(), 0, 'not twice the same day');
});

test('two copies of the API send each summary once', async (t) => {
  const db = await openDb({ dataDir: 'memory' });
  const a = await start({ db, digestHour: 0 });
  const b = await start({ db, digestHour: 0 });
  t.after(async () => { await a.close(); await b.close(); await db.close(); });
  await Promise.all([a.digestsNow(), b.digestsNow(), a.digestsNow(), b.digestsNow()]);
  const rows = (await db.query("SELECT destination, count(*)::int AS n FROM outbox WHERE template = 'digest' GROUP BY destination")).rows;
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.n === 1), JSON.stringify(rows));
});
