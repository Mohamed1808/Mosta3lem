/* E-invoices (ETA) over the API: Finance fills in the tax profile, Sales the organisation's
   tax details, and an issued invoice becomes a ready ETA document. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { start, client, signInAs } = require('./helpers');

test('ETA e-invoice document', async (t) => {
  const app = await start();
  t.after(() => app.close());
  const call = client(app);
  const finance = await signInAs(call, 'platform_finance');
  const sales = await signInAs(call, 'platform_sales');
  const ops = await signInAs(call, 'platform_ops');

  const inv = (await call('billing.invoices', [], finance.token)).body.result.find((i) => i.status === 'issued');
  assert.equal((await call('billing.updateEtaSettings', [{ legalName: 'x' }], ops.token)).body.error.key, 'errors.forbidden');
  const st = await call('billing.updateEtaSettings', [{
    legalName: 'Mosta3lem LLC', taxId: '123456789', activityCode: '8291',
    branch: { governorate: 'cairo', regionCity: 'Nasr City', street: 'Abbas El Akkad', buildingNumber: '10' },
    itemCodes: { investigation: 'EG-123456789-INV', collection: 'EG-123456789-COL' }
  }], finance.token);
  assert.deepEqual(st.body.result.problems, []);
  const tax = await call('entities.setTaxDetails', [inv.entityId, { taxId: '987654321', address: { governorate: 'giza', regionCity: 'Dokki', street: 'Tahrir', buildingNumber: '5' } }], sales.token);
  assert.equal(tax.status, 200, JSON.stringify(tax.body));

  const doc = (await call('billing.etaDocument', [inv.id], finance.token)).body.result;
  assert.equal(doc.ready, true, JSON.stringify(doc.problems));
  assert.equal(doc.document.documentType, 'I');
  assert.equal(doc.document.issuer.id, '123456789');
  assert.equal(doc.document.receiver.id, '987654321');
  assert.equal(doc.document.taxTotals[0].taxType, 'T1');
});
