/* Data masking. The service layer passes every case through maskCase() before a provider
   user or a platform team without access to personal data (customer support, data) sees it. Before acceptance a provider sees only: service, inquiry type or
   days-past-due bucket, governorate, amount range, deadline and price. Name, national ID,
   phone, address and contract number are released on acceptance, stay visible for 30 days
   after the case closes, then are masked again. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});
  var DAY = 24 * 60 * 60 * 1000;

  function amountRange(amount) {
    var r = ICM.config.AMOUNT_RANGES;
    for (var i = 0; i < r.length; i++) if (amount <= r[i].max) return r[i].key;
    return r[r.length - 1].key;
  }

  /** Can this viewer see the case at all? (Other providers never can.) */
  function canView(c, viewer) {
    if (!viewer) return false;
    if (wf.isPlatformRole(viewer.role)) return wf.can(viewer.role, 'cases.view');
    if (wf.isEntityRole(viewer.role)) return viewer.entityId === c.entityId && wf.entityServes(viewer.role, c.service);
    if (viewer.role === 'agent') return !!viewer.agentId && viewer.agentId === c.agentId;
    if (wf.isProviderSide(viewer.role)) return !!viewer.providerId && viewer.providerId === c.providerId;
    return false;
  }

  /** null when visible, otherwise the reason it is masked. */
  function maskReason(c, viewer, now) {
    if (!canView(c, viewer)) return 'no_access';
    if (wf.isPlatformRole(viewer.role)) return wf.seesPersonalData(viewer.role) ? null : 'staff_no_personal_data';
    if (!wf.isProviderSide(viewer.role)) return null;
    if (!c.acceptedAt || wf.PRE_ACCEPT.indexOf(c.status) >= 0) return 'pre_acceptance';
    if (c.closedAt != null && now > c.closedAt + ICM.config.PII_RETENTION_DAYS * DAY) return 'retention_expired';
    return null;
  }

  function maskAddress(a) {
    if (!a) return a;
    return { governorate: a.governorate, city: null, street: null, landmark: null };
  }

  function maskCase(c, viewer, now) {
    var reason = maskReason(c, viewer, now);
    if (reason === 'no_access') return null;
    if (!reason) return Object.assign({}, c, { masked: false });
    var m = Object.assign({}, c, {
      masked: true,
      maskReason: reason,
      customer: { name: null, nationalId: null, mobiles: [] },
      addresses: {},
      employerName: null,
      businessName: null,
      guarantor: null,
      contractNumber: null,
      collateral: null,
      instructions: null,
      internalRef: null,
      accountNumber: null,
      orderNumber: null,
      businessPhone: null,
      report: {},
      clientDecision: null,
      checkIn: null,
      photos: (c.photos || []).map(function (p) { return { id: p.id, at: p.at, hidden: true }; })
    });
    Object.keys(c.addresses || {}).forEach(function (k) { m.addresses[k] = maskAddress(c.addresses[k]); });
    if (c.service === 'collection') {
      m.amountRange = amountRange(+c.overdueAmount);
      m.originalAmount = null;
      m.overdueAmount = null;
      m.instalmentAmount = null;
      m.dpd = null;
      m.payments = (c.payments || []).map(function (p) { return Object.assign({}, p, { receipt: null }); });
    }
    return m;
  }

  wf.masking = {
    canView: canView,
    maskReason: maskReason,
    maskCase: maskCase,
    amountRange: amountRange
  };
})();
