/* Running the platform: readiness, alerts about backups and deliveries, and changing
   FILES_KEY without losing a file or an authenticator. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { start, client, post, lastMessage, codeIn } = require('./helpers');
const { openDb } = require('../src/db');
const totp = require('../src/totp');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAAABJRU5ErkJggg==', 'base64');
const newKey = () => crypto.randomBytes(32).toString('base64');

test('readiness and alerts', async (t) => {
  const app = await start({ backupsExpected: true, alertEmails: ['ops@mosta3lem.example'] });
  t.after(() => app.close());

  const r1 = await app.inject({ url: '/health/ready' });
  assert.equal(r1.statusCode, 503, 'no backup yet');
  assert.equal(r1.json().checks.database.ok, true);
  assert.equal(r1.json().checks.backup.ok, false);

  const sent = await app.ops.check();
  assert.deepEqual(sent, ['backup_missing']);
  const mail = await lastMessage(app, 'ops@mosta3lem.example');
  assert.match(mail.body, /No successful backup/);
  assert.deepEqual(await app.ops.check(), [], 'the same alert is not repeated within 6 hours');

  await app.db.query("INSERT INTO ops_events (kind, ok, detail) VALUES ('backup', true, '{\"file\":\"db.dump\"}')");
  assert.equal((await app.inject({ url: '/health/ready' })).statusCode, 200, 'ready once a backup is recorded');

  await app.db.query("INSERT INTO ops_events (kind, ok, detail) VALUES ('restore_test', false, '{\"step\":\"counts\"}')");
  assert.deepEqual(await app.ops.check(), ['restore_test'], 'a failed restore test is an alert');

  for (let i = 0; i < 3; i++) app.ops.tickFailed();
  assert.deepEqual(await app.ops.check(), ['clock']);
});

test('changing FILES_KEY keeps every file and authenticator readable', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mosta3lem-rotate-'));
  const db = await openDb({ dataDir: 'memory' });
  const oldKey = newKey(), nextKey = newKey();
  t.after(async () => { await db.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const over = (key) => ({ db, filesDriver: 'local', filesDir: dir, filesKey: key, totpRoles: ['platform_admin'] });

  // With the old key: a visit photo and the Super admin's authenticator.
  const a = await start(over(oldKey));
  const call = client(a);
  const people = (await call('auth.listDemoUsers')).body.result;
  const ops = (await call('auth.loginAs', [people.find((u) => u.role === 'platform_ops').id])).body.session.token;
  const inField = (await call('cases.list', [{}], ops)).body.result.find((c) => c.status === 'in_field' && c.agentId);
  const agent = (await call('auth.loginAs', [people.find((u) => u.agentId === inField.agentId).id])).body.session.token;
  assert.equal((await call('cases.addPhoto', [inField.id, 'data:image/png;base64,' + PNG.toString('base64'), 'Door'], agent)).status, 200);
  const laila = 'laila.hosny@platform.example';
  const p = await post(a, 'password', { email: laila, password: 'Mosta3lem@2026' });
  const v = await post(a, 'verify', { challengeId: p.body.result.challengeId, code: codeIn(await lastMessage(a, laila)) });
  const secret = v.body.result.enrol.secret;
  assert.equal((await post(a, 'verify', { challengeId: v.body.result.challengeId, code: totp.codeAt(secret, totp.stepAt(Date.now())) })).status, 200);

  const r = await a.adminTools.rotateFilesKey(nextKey);
  assert.equal(r.files.rotated, 1);
  assert.equal(r.secrets.rotated, 1);
  const again = await a.adminTools.rotateFilesKey(nextKey);
  assert.deepEqual([again.files.rotated, again.files.already, again.secrets.already], [0, 1, 1], 'running it again skips what is done');
  await a.close();

  // With the new key: the photo opens and the authenticator still works.
  const b = await start(over(nextKey));
  t.after(() => b.close());
  const callB = client(b);
  const opsB = (await callB('auth.loginAs', [people.find((u) => u.role === 'platform_ops').id])).body.session.token;
  const photo = (await callB('cases.get', [inField.id], opsB)).body.result.case.photos.slice(-1)[0];
  const link = new URL(photo.dataUrl);
  const res = await b.inject({ url: link.pathname + link.search });
  assert.equal(res.statusCode, 200);
  assert.ok(res.rawPayload.equals(PNG), 'the same photo');
  const p2 = await post(b, 'password', { email: laila, password: 'Mosta3lem@2026' });
  assert.equal(p2.body.result.method, 'authenticator');
  const ok = await post(b, 'verify', { challengeId: p2.body.result.challengeId, code: totp.codeAt(secret, totp.stepAt(Date.now()) + 1) });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
});
