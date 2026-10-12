/* FRA registration over the API: non-bank finance clients' collections only reach providers
   whose registration Operations checked; Sales sets whether a client is supervised. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, client, signInAs } = require('./helpers');

test('FRA registration', async (t) => {
  const app = await start();
  t.after(() => app.close());
  const call = client(app);
  const people = (await call('auth.listDemoUsers')).body.result;
  const tokenOf = async (name) => (await call('auth.loginAs', [people.find((u) => u.name === name).id])).body.session.token;
  const ask = (token, entityId) => call('marketplace.eligible', [{ service: 'collection', demand: { cairo: 1 }, bucket: 'b1_30', entityId }], token);

  const youssef = await tokenOf('Youssef Kamel');
  const first = (await ask(youssef)).body.result;
  assert.equal(first.fraRequired, true, 'Horus is an auto finance company');
  assert.ok(first.providers.some((p) => p.fraNumber), 'the registered provider shows its number');

  await t.test('only Sales and Management change whether a client is supervised', async () => {
    const ops = await signInAs(call, 'platform_ops');
    const refused = await call('entities.setFraRegulated', ['ent_delta', true, 'test'], ops.token);
    assert.equal(refused.body.error.key, 'errors.forbidden');
    const sales = await signInAs(call, 'platform_sales');
    const r = await call('entities.setFraRegulated', ['ent_delta', true, 'Consumer finance arm'], sales.token);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.result.fraRegulated, true);
    assert.equal((await ask(youssef, 'ent_delta')).body.result.fraRequired, true);
  });

  await t.test('a renewal waiting for Operations keeps the current registration in force', async () => {
    const adel = await tokenOf('Adel Morsy');
    const settings = (await call('providers.settings', [], adel)).body.result;
    const fra = settings.documents.find((d) => d.type === 'fra_registration');
    assert.equal(fra.status, 'verified');
    // A renewal sent but not yet checked: the current registration still counts.
    const sent = await call('providers.submitDocument', ['fra_registration', { fileName: 'fra.pdf', url: 'data:x', number: 'FRA-NEW-1' }], adel);
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    assert.ok((await ask(youssef)).body.result.providers.some((p) => p.id === 'prv_recovery'));
  });
});
