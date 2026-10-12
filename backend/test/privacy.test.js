/* Data protection on the server: who handles requests and breaches, their tables, and
   retention deleting the stored files of old cases. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, client, signInAs } = require('./helpers');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test('data protection', async (t) => {
  const app = await start();
  t.after(() => app.close());
  const call = client(app);
  const people = (await call('auth.listDemoUsers')).body.result;
  const legal = await signInAs(call, 'platform_legal');
  const support = await signInAs(call, 'platform_support');

  await t.test('only Legal and Management handle requests from people', async () => {
    const r = await call('privacy.requests', [], support.token);
    assert.equal(r.body.error.key, 'errors.forbidden');
    const mine = await call('privacy.requests', [], legal.token);
    assert.equal(mine.status, 200);
    assert.equal(mine.body.result.length, 1, 'the demo request');
  });

  await t.test('a request is stored with its deadline columns', async () => {
    const ops = await signInAs(call, 'platform_ops');
    const closed = (await call('cases.list', [{}], ops.token)).body.result.find((c) => c.status === 'closed' && c.customer && c.customer.nationalId);
    const r = await call('privacy.logRequest', [{ kind: 'access', name: closed.customer.name, nationalId: closed.customer.nationalId, channel: 'email' }], legal.token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const row = (await app.db.query('SELECT kind, status, due_at > received_at AS later FROM data_requests WHERE id = $1', [r.body.result.id])).rows[0];
    assert.deepEqual(row, { kind: 'access', status: 'open', later: true });
    const exported = await call('privacy.exportRequest', [r.body.result.id], legal.token);
    assert.ok(exported.body.result.cases.length >= 1);
  });

  await t.test('any staff member reports a breach; it is stored', async () => {
    const r = await call('privacy.reportBreach', [{ title: 'Wrong recipient', description: 'An export was emailed to the wrong address.', severity: 'medium', dataTypes: ['contact'] }], support.token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const row = (await app.db.query('SELECT status, severity, extract(epoch FROM due_at - discovered_at)::int / 3600 AS hours FROM breaches')).rows[0];
    assert.equal(row.status, 'open');
    assert.equal(row.severity, 'medium');
    assert.equal(row.hours, 72);
    const partner = await call('privacy.reportBreach', [{ title: 'x', description: 'y', severity: 'low' }], (await call('auth.loginAs', [people.find((u) => u.role === 'entity_admin').id])).body.session.token);
    assert.equal(partner.body.error.key, 'errors.forbidden', 'organisations report through the platform, not here');
  });

  await t.test('an organisation Admin accepts the data processing agreement', async () => {
    const admin = people.find((u) => u.role === 'entity_admin');
    const token = (await call('auth.loginAs', [admin.id])).body.session.token;
    const r = await call('entities.acceptDpa', [], token);
    assert.equal(r.status, 200);
    assert.equal(r.body.result.dpaCurrent, true);
  });

  await t.test('retention deletes the photos of old cases, and the stored files with them', async () => {
    const ops = await signInAs(call, 'platform_ops');
    const inField = (await call('cases.list', [{}], ops.token)).body.result.find((c) => c.status === 'in_field' && c.agentId);
    const agent = people.find((u) => u.agentId === inField.agentId);
    const agentToken = (await call('auth.loginAs', [agent.id])).body.session.token;
    const added = await call('cases.addPhoto', [inField.id, 'data:image/png;base64,' + PNG.toString('base64'), 'Door'], agentToken);
    assert.equal(added.status, 200, JSON.stringify(added.body));
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM files WHERE deleted_at IS NULL')).rows[0].n, 1);

    // The case closed two years ago (as if time had passed), saved like any other change.
    const closedAt = Date.now() - 2 * 365 * 24 * 3600 * 1000;
    await app.db.query(`UPDATE cases SET doc = doc || jsonb_build_object('status', 'closed', 'closedAt', $2::bigint), rev = nextval('data_rev') WHERE id = $1`, [inField.id, closedAt]);
    const status = await call('privacy.status', [], legal.token);
    assert.ok(status.body.result.due.photos >= 1, JSON.stringify(status.body.result.due));
    await app.tickNow();

    const doc = (await app.db.query('SELECT doc FROM cases WHERE id = $1', [inField.id])).rows[0].doc;
    assert.equal(doc.photos.length, 0);
    assert.equal(doc.erased.scope, 'photos');
    await app.db.query("UPDATE files SET created_at = now() - interval '2 days'");
    assert.equal(await app.filesSweep(), 1, 'the stored photo is deleted');
  });
});
