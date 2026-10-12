/* Electronic invoices for the Egyptian Tax Authority (ETA e-invoicing, document version 1.0).
   Pure functions only: no store, no clock.

   An invoice becomes an ETA document: the issuer (Mosta3lem's tax profile, Finance sets it),
   the receiver (the client organisation's tax registration number and address), one line per
   case with VAT (tax type T1, subtype V009), and the totals rounded to 5 decimals as the
   ETA asks. Lines carry case references only, never customers' names.

   What is not here yet: signing the document with the company's e-seal (a USB token or a
   signing service) and sending it to the ETA (needs the company's ETA API credentials).
   Both come once the company is registered on the ETA portal. Who issues the invoice
   (Mosta3lem for the whole amount, or each provider) and whether prices include VAT are for
   the accountant to confirm; pricesIncludeVat is a setting. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});

  var DEFAULTS = {
    legalName: '', taxId: '', activityCode: '8291', vatRate: 14, pricesIncludeVat: false,
    branch: { governorate: 'cairo', regionCity: '', street: '', buildingNumber: '' },
    itemCodes: { investigation: '', collection: '' }
  };

  function settings(config) {
    var s = (config && config.eta) || {};
    return Object.assign({}, DEFAULTS, s, {
      branch: Object.assign({}, DEFAULTS.branch, s.branch || {}),
      itemCodes: Object.assign({}, DEFAULTS.itemCodes, s.itemCodes || {})
    });
  }

  var TAX_ID = /^\d{9}$/;
  var ACTIVITY = /^\d{4}$/;
  /** Goods and services codes registered on the ETA portal: EG-<tax id>-<own code>. */
  function itemCodeOk(code, taxId) { return new RegExp('^EG-' + taxId + '-[A-Za-z0-9_-]{1,30}$').test(String(code || '')); }
  function addressOk(a) { return !!(a && a.governorate && String(a.regionCity || '').trim() && String(a.street || '').trim() && String(a.buildingNumber || '').trim()); }

  /** What is missing in the platform's tax profile: a list of { key, field }. */
  function profileProblems(s, services) {
    var out = [];
    if (!String(s.legalName || '').trim()) out.push({ key: 'eta.problem.legalName', field: 'legalName' });
    if (!TAX_ID.test(String(s.taxId || ''))) out.push({ key: 'eta.problem.taxId', field: 'taxId' });
    if (!ACTIVITY.test(String(s.activityCode || ''))) out.push({ key: 'eta.problem.activityCode', field: 'activityCode' });
    if (!addressOk(s.branch)) out.push({ key: 'eta.problem.branch', field: 'branch' });
    if (!(+s.vatRate >= 0 && +s.vatRate <= 100)) out.push({ key: 'eta.problem.vatRate', field: 'vatRate' });
    (services || ['investigation', 'collection']).forEach(function (svc) {
      if (!itemCodeOk(s.itemCodes[svc], s.taxId)) out.push({ key: 'eta.problem.itemCode', field: 'itemCode_' + svc, service: svc });
    });
    return out;
  }

  /** What is missing for one organisation to receive e-invoices. */
  function receiverProblems(entity) {
    var tax = (entity && entity.tax) || {};
    var out = [];
    if (!TAX_ID.test(String(tax.taxId || ''))) out.push({ key: 'eta.problem.receiverTaxId', field: 'taxId' });
    if (!addressOk(tax.address)) out.push({ key: 'eta.problem.receiverAddress', field: 'address' });
    return out;
  }

  /** Error key for an organisation's tax details as entered, or null. */
  function validateTaxDetails(v) {
    if (!TAX_ID.test(String(v.taxId || '').trim())) return { key: 'errors.taxIdFormat', field: 'taxId' };
    if (!addressOk(v.address)) return { key: 'errors.required', field: 'address' };
    return null;
  }

  function r5(n) { return Math.round(n * 1e5) / 1e5; }
  function govName(lists, id) {
    var g = (lists.governorates || []).filter(function (x) { return x.id === id; })[0];
    return g ? g.en : String(id || '');
  }
  function etaAddress(a, lists, branchId) {
    var out = { country: 'EG', governate: govName(lists, a.governorate), regionCity: String(a.regionCity).trim(), street: String(a.street).trim(), buildingNumber: String(a.buildingNumber).trim() };
    if (branchId != null) out.branchID = branchId;
    return out;
  }

  /**
   * The ETA document for an invoice. inv: the invoice with billed amounts per line (as
   * billing.invoices returns it); entity: the client organisation; config: platform config.
   * Returns { document, problems }; the document is built even with problems, for preview.
   */
  function document(inv, entity, config) {
    var s = settings(config), lists = (config && config.lists) || {};
    var services = [];
    inv.lines.forEach(function (l) { if (services.indexOf(l.service) < 0) services.push(l.service); });
    var problems = profileProblems(s, services).concat(receiverProblems(entity));
    if (inv.status === 'draft') problems.push({ key: 'eta.problem.notIssued', field: 'status' });
    if (!inv.lines.length) problems.push({ key: 'eta.problem.noLines', field: 'lines' });
    var rate = +s.vatRate || 0;
    var lines = inv.lines.filter(function (l) { return (l.billed || 0) > 0; }).map(function (l) {
      var gross = +l.billed || 0;
      var net = r5(s.pricesIncludeVat ? gross / (1 + rate / 100) : gross);
      var vat = r5(net * rate / 100);
      return {
        description: (l.service === 'investigation' ? 'Investigation ' : 'Collection fee ') + l.caseRef,
        itemType: 'EGS', itemCode: s.itemCodes[l.service] || '', internalCode: l.caseRef, unitType: 'EA', quantity: 1,
        unitValue: { currencySold: 'EGP', amountEGP: net },
        salesTotal: net, discount: { rate: 0, amount: 0 }, netTotal: net, itemsDiscount: 0, valueDifference: 0, totalTaxableFees: 0,
        taxableItems: [{ taxType: 'T1', subType: 'V009', rate: rate, amount: vat }],
        total: r5(net + vat)
      };
    });
    var net = r5(lines.reduce(function (sum, l) { return sum + l.netTotal; }, 0));
    var vat = r5(lines.reduce(function (sum, l) { return sum + l.taxableItems[0].amount; }, 0));
    var tax = (entity && entity.tax) || {};
    var doc = {
      issuer: { type: 'B', id: String(s.taxId || ''), name: String(s.legalName || '').trim(), address: etaAddress(s.branch, lists, '0') },
      receiver: { type: 'B', id: String(tax.taxId || ''), name: entity ? entity.name : '', address: tax.address ? etaAddress(tax.address, lists) : {} },
      documentType: 'I', documentTypeVersion: '1.0',
      dateTimeIssued: new Date(inv.issuedAt || Date.now()).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      taxpayerActivityCode: String(s.activityCode || ''), internalID: inv.ref,
      invoiceLines: lines,
      totalSalesAmount: net, totalDiscountAmount: 0, netAmount: net,
      taxTotals: [{ taxType: 'T1', amount: vat }],
      extraDiscountAmount: 0, totalItemsDiscountAmount: 0,
      totalAmount: r5(net + vat)
    };
    return { document: doc, problems: problems };
  }

  wf.eta = {
    DEFAULTS: DEFAULTS,
    settings: settings,
    profileProblems: profileProblems,
    receiverProblems: receiverProblems,
    validateTaxDetails: validateTaxDetails,
    itemCodeOk: itemCodeOk,
    document: document
  };
})();
