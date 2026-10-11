/* The shared remote client (prototype/js/services/remote.js), as the app and the console
   will use it: the engine loaded for translations and settings, every service call going
   over HTTP to a real listening server. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { start, lastMessage, codeIn } = require('./helpers');
const { SCRIPTS } = require('../src/engine');

const ROOT = path.join(__dirname, '..', '..', 'prototype', 'js');

/** A fresh "app": the engine scripts plus remote.js, with a memory token store. */
function newClient() {
  const store = new Map();
  const ctx = { console, Intl, Date, Math, JSON, Promise, setTimeout, clearTimeout, URL, fetch, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, document: { documentElement: {} } };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of SCRIPTS.concat(['services/remote.js'])) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const storage = { get: (k) => store.get(k) || null, set: (k, v) => { store.set(k, v); }, remove: (k) => { store.delete(k); } };
  return { ICM: ctx.ICM, S: ctx.ICM.services, storage, store };
}

test('remote client against a running server', async (t) => {
  const app = await start();
  await app.listen({ port: 0, host: '127.0.0.1' });
  t.after(() => app.close());
  const baseUrl = 'http://127.0.0.1:' + app.server.address().port;

  let signedOut = 0;
  const c = newClient();
  await c.ICM.remote.connect({ baseUrl, storage: c.storage, onSignedOut: () => { signedOut++; } });

  await t.test('settings lists come from the server', () => {
    assert.ok(c.ICM.store.db.config.lists.governorates.length > 20);
    assert.equal(c.ICM.store.db.clock.offsetMs, 0);
  });

  let opsId;
  await t.test('demo sign-in keeps the token, and calls work like the local engine', async () => {
    const users = await c.S.auth.listDemoUsers();
    opsId = users.find((u) => u.role === 'platform_ops').id;
    const me = await c.S.auth.loginAs(opsId);
    assert.equal(me.user.id, opsId);
    assert.ok(c.store.get('icm-api-token'));
    assert.ok((await c.S.cases.list({})).length > 0);
    assert.equal((await c.S.auth.currentUser()).user.id, opsId);
  });

  await t.test('errors arrive the way pages already read them', async () => {
    await assert.rejects(c.S.billing.proposeFee(12, 'x'), (e) => e.name === 'ServiceError' && e.key === 'errors.forbidden' && e.status === 403);
    await assert.rejects(c.S.cases.get('nope'), (e) => e.key === 'errors.notFound');
  });

  await t.test('pages refresh after changes, not after reads', async () => {
    let n = 0;
    const off = c.S.subscribe(() => { n++; });
    await c.S.cases.list({});
    await new Promise((r) => setImmediate(r));
    assert.equal(n, 0);
    const admin = (await c.S.auth.listDemoUsers()).find((u) => u.role === 'platform_admin');
    await c.S.auth.loginAs(admin.id);
    await c.S.staff.invite({ name: 'Remote Person', email: 'remote.person@platform.example', role: 'platform_data' });
    await new Promise((r) => setImmediate(r));
    assert.ok(n >= 1);
    off();
  });

  await t.test('the demo clock reaches the screens', async () => {
    await c.S.demo.advance(3600 * 1000);
    assert.equal(c.ICM.store.db.clock.offsetMs, 3600 * 1000);
    assert.ok(c.ICM.clock.now() > Date.now() + 3500 * 1000);
    await c.S.demo.resetClock();
  });

  await t.test('a settings change refreshes the settings copy', async () => {
    const cfg = await c.S.config.get();
    const next = Object.assign({}, cfg.scoring, { minRatings: cfg.scoring.minRatings + 1 });
    await c.S.config.updateScoring(next);
    assert.equal(c.ICM.store.db.config.scoring.minRatings, next.minRatings);
  });

  await t.test('the language goes with every call', async () => {
    const laila = (await c.S.auth.listDemoUsers()).find((u) => u.role === 'platform_admin');
    c.ICM.i18n.setLang('ar');
    await c.ICM.remote.session.forgot(laila.email);
    c.ICM.i18n.setLang('en');
    assert.match((await lastMessage(app, laila.email)).body, /^مرحبا/);
  });

  await t.test('signing out forgets the token', async () => {
    await c.S.auth.logout();
    assert.equal(c.store.get('icm-api-token'), undefined);
    await assert.rejects(c.S.cases.list({}), (e) => e.key === 'errors.notSignedIn');
  });

  await t.test('real sign-in: email, password and code', async () => {
    const people = await c.S.auth.listDemoUsers();
    const laila = people.find((u) => u.role === 'platform_admin');
    const ch = await c.ICM.remote.session.password(laila.email, 'Mosta3lem@2026');
    const me = await c.ICM.remote.session.verify(ch.challengeId, codeIn(await lastMessage(app, laila.email)));
    assert.equal(me.user.id, laila.id);
    assert.ok(c.ICM.remote.session.signedIn());
    assert.equal((await c.S.staff.list()).some((s) => s.email === 'remote.person@platform.example'), true);
  });

  await t.test('a token the server no longer accepts signs the app out', async () => {
    await app.db.query('DELETE FROM sessions');
    await assert.rejects(c.S.cases.list({}), (e) => e.status === 401);
    assert.equal(signedOut, 1);
    assert.equal(c.ICM.remote.session.signedIn(), false);
  });

  await t.test('provider sign-up: the mobile proof travels with the application', async () => {
    const ch = await c.ICM.remote.session.phone('01088997766', 'signup');
    const r = await c.ICM.remote.session.verify(ch.challengeId, codeIn(await lastMessage(app, '01088997766')));
    assert.ok(r.phoneProof);
    const done = await c.S.registration.submit({
      kind: 'individual', services: ['investigation'], fullName: 'Tarek Nabil Fahmy', nationalId: '29203152112345', phone: '01088997766',
      addrGov: 'giza', addrCity: 'faisal', addrStreet: '9 Faisal St', coverage: { giza: ['faisal'] }, terms: true
    });
    assert.ok(done.providerId);
    assert.ok(c.ICM.remote.session.signedIn(), 'the new owner is signed in');
  });

  await t.test('a phone registers for push', async () => {
    await c.ICM.remote.session.registerDevice('ExponentPushToken[cccccccccccccccccccccc]', 'ios');
    assert.equal((await app.db.query('SELECT count(*)::int AS n FROM devices')).rows[0].n, 1);
  });

  await t.test('no server: a clear "no connection" error', async () => {
    const d = newClient();
    await assert.rejects(d.ICM.remote.connect({ baseUrl: 'http://127.0.0.1:9', storage: d.storage }), (e) => e.key === 'errors.network');
  });
});
