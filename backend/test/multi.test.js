/* Two copies of the API on one database: each sees what the other saved, changes made at
   the same time on both are all kept, removals reach the other copy, and a notification
   goes out once. (The PostgreSQL smoke test runs the same idea on a real server.) */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, client, signInAs } = require('./helpers');
const { openDb } = require('../src/db');

test('two copies of the API on one database', async (t) => {
  const db = await openDb({ dataDir: 'memory' });
  const a = await start({ db });
  const b = await start({ db });
  t.after(async () => { await a.close(); await b.close(); await db.close(); });
  const A = client(a), B = client(b);

  await t.test('a sign-in from one copy works on the other', async () => {
    const admin = await signInAs(A, 'platform_admin');
    const me = await B('auth.currentUser', [], admin.token);
    assert.equal(me.status, 200);
    assert.equal(me.body.result.user.id, admin.user.id);
  });

  await t.test('what one copy saves, the other sees on its next request', async () => {
    const admin = await signInAs(A, 'platform_admin');
    assert.equal((await A('staff.invite', [{ name: 'Seen Elsewhere', email: 'seen.elsewhere@platform.example', role: 'platform_qa' }], admin.token)).status, 200);
    const list = (await B('staff.list', [], admin.token)).body.result;
    assert.ok(list.some((s) => s.email === 'seen.elsewhere@platform.example'));
    // And back the other way.
    const id = list.find((s) => s.email === 'seen.elsewhere@platform.example').id;
    assert.equal((await B('staff.setRole', [id, 'platform_data'], admin.token)).status, 200);
    assert.equal((await A('staff.list', [], admin.token)).body.result.find((s) => s.id === id).role, 'platform_data');
  });

  await t.test('changes made at the same time on both copies are all kept', async () => {
    const admin = await signInAs(A, 'platform_admin');
    const people = Array.from({ length: 10 }, (_, i) => ({ name: 'Parallel Person ' + i, email: `parallel.person.${i}@platform.example`, role: 'platform_support' }));
    const results = await Promise.all(people.map((p, i) => (i % 2 ? A : B)('staff.invite', [p], admin.token)));
    assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.map((r) => r.status)));
    for (const copy of [A, B]) {
      const list = (await copy('staff.list', [], admin.token)).body.result;
      for (const p of people) assert.ok(list.some((s) => s.email === p.email), p.email);
    }
    // Saved once each.
    const rows = (await db.query("SELECT count(*)::int AS n FROM users WHERE email LIKE 'parallel.person.%'")).rows[0].n;
    assert.equal(rows, people.length);
  });

  await t.test('numbers handed out on both copies never repeat', async () => {
    const apply = (i) => ({
      kind: 'individual', services: ['investigation'], fullName: 'Applicant Number ' + ['One', 'Two', 'Three', 'Four', 'Five', 'Six'][i],
      nationalId: '2950315211234' + i, phone: '0155544330' + i,
      addrGov: 'giza', addrCity: 'faisal', addrStreet: i + ' Faisal St', coverage: { giza: ['faisal'] }, terms: true
    });
    const results = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => (i % 2 ? A : B)('registration.submit', [apply(i)])));
    assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.map((r) => r.body.error)));
    const refs = results.map((r) => r.body.result.ref);
    assert.equal(new Set(refs).size, refs.length, 'all different: ' + refs.join(', '));
  });

  await t.test('the activity log is the same on both copies, in the same order', async () => {
    const admin = await signInAs(A, 'platform_admin');
    const onA = (await A('audit.list', [{}], admin.token)).body.result.map((x) => x.id);
    const onB = (await B('audit.list', [{}], admin.token)).body.result.map((x) => x.id);
    assert.deepEqual(onA, onB);
  });

  await t.test('a notification goes out once, even when both copies send', async () => {
    const m = await signInAs(A, 'platform_management');
    const token = 'ExponentPushToken[multimultimultimultimu]';
    await a.inject({ method: 'POST', url: '/api/v1/devices/register', payload: { token, platform: 'ios', lang: 'en' }, headers: { authorization: 'Bearer ' + m.token } });
    const fin = await signInAs(B, 'platform_finance');
    assert.equal((await B('billing.proposeFee', [13, 'Two copies'], fin.token)).status, 200);
    await Promise.all([a.notifyNow(), b.notifyNow(), a.notifyNow(), b.notifyNow()]);
    const pushes = (await db.query('SELECT count(*)::int AS n FROM outbox WHERE destination = $1', [token])).rows[0].n;
    assert.equal(pushes, 1);
  });

  await t.test('a reset on one copy reaches the other, including removals', async () => {
    const admin = await signInAs(A, 'platform_admin');
    assert.equal((await A('demo.reset', [], admin.token)).status, 200);
    await b.syncNow();
    const users = (await B('auth.listDemoUsers')).body.result;
    assert.ok(!users.some((u) => (u.email || '').startsWith('parallel.person.')), 'invited people are gone on the other copy too');
    const total = (await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n;
    assert.equal(users.length, total);
  });
});
