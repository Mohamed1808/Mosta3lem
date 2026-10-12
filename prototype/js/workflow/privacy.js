/* Data protection rules (Egypt's Personal Data Protection Law, Law 151 of 2020). Pure
   functions only: no store, no clock.

   - Retention: once a case is closed, its photos are erased after photosDays and the rest
     of the personal data after personalDays. What stays is what the business needs without
     knowing who the person was: the service, place, dates, status, price and outcome.
   - Requests from people about their data have a deadline in working days (Friday and
     Saturday off). Breaches must be reported to the data protection centre within 72 hours
     of being found.
   The periods are settings (Settings page) and need confirming by the lawyer. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});
  var HOUR = 60 * 60 * 1000, DAY = 24 * HOUR;

  var DEFAULTS = { photosDays: 365, personalDays: 1095, requestDays: 6, breachHours: 72 };
  var LIMITS = { photosDays: [30, 3650], personalDays: [30, 3650], requestDays: [1, 60] };

  /** The privacy settings with defaults filled in (older data has none). */
  function settings(config) {
    return Object.assign({}, DEFAULTS, (config && config.privacy) || {});
  }

  /** Error key for a settings change, or null. */
  function validateSettings(s) {
    var bad = Object.keys(LIMITS).filter(function (k) {
      var v = +s[k];
      return !(v >= LIMITS[k][0] && v <= LIMITS[k][1] && Math.round(v) === v);
    });
    if (bad.length) return { key: 'errors.privacyRange', field: bad[0], min: LIMITS[bad[0]][0], max: LIMITS[bad[0]][1] };
    if (+s.photosDays > +s.personalDays) return { key: 'errors.photosAfterPersonal', field: 'photosDays' };
    return null;
  }

  /** Friday and Saturday are the weekend in Egypt. */
  function addWorkingDays(at, days) {
    var t = at, left = days;
    while (left > 0) {
      t += DAY;
      var wd = new Date(t).getUTCDay();
      if (wd !== 5 && wd !== 6) left--;
    }
    return t;
  }

  function requestDueAt(receivedAt, s) { return addWorkingDays(receivedAt, +s.requestDays); }
  function breachDueAt(discoveredAt, s) { return discoveredAt + (+s.breachHours || 72) * HOUR; }

  /** What retention would erase from this case now: null, 'photos' or 'all'. */
  function eraseDue(c, now, s) {
    if (c.closedAt == null || !wf.isTerminal(c.status) || (c.erased && c.erased.scope === 'all')) return null;
    if (now >= c.closedAt + s.personalDays * DAY) return 'all';
    var hasPhotos = (c.photos || []).length || (c.payments || []).some(function (p) { return p.receipt; });
    if (hasPhotos && now >= c.closedAt + s.photosDays * DAY && !(c.erased && c.erased.scope === 'photos')) return 'photos';
    return null;
  }

  function noNote(x) { return Object.assign({}, x, { note: null }); }

  /**
   * A copy of the case with personal data removed. scope 'photos': photos and receipts
   * only. scope 'all': everything that could identify or locate the person.
   */
  function eraseCase(c, now, scope, reason) {
    var n = Object.assign({}, c, {
      photos: [],
      payments: (c.payments || []).map(function (p) { return Object.assign({}, p, { receipt: null }); }),
      erased: { at: now, scope: scope, reason: reason }
    });
    if (scope !== 'all') return n;
    var addresses = {};
    Object.keys(c.addresses || {}).forEach(function (k) {
      var a = c.addresses[k];
      addresses[k] = a ? { governorate: a.governorate, city: null, street: null, landmark: null } : a;
    });
    return Object.assign(n, {
      customer: { name: null, nationalId: null, mobiles: [] },
      addresses: addresses,
      employerName: null, businessName: null, guarantor: null, contractNumber: null, collateral: null,
      instructions: null, internalRef: null, accountNumber: null, orderNumber: null, businessPhone: null,
      report: {}, checkIn: null,
      clientDecision: c.clientDecision ? Object.assign({}, c.clientDecision, { note: null }) : c.clientDecision,
      timeline: (c.timeline || []).map(noNote),
      actions: c.actions ? c.actions.map(noNote) : c.actions,
      promises: c.promises ? c.promises.map(noNote) : c.promises,
      settlements: c.settlements ? c.settlements.map(function (x) { return Object.assign({}, x, { note: null, decisionNote: null }); }) : c.settlements
    });
  }

  /** Digits only, without a leading +20 or 0020, so 01012345678 and +201012345678 match. */
  function phoneKey(p) {
    var d = String(p || '').replace(/\D/g, '');
    if (d.indexOf('0020') === 0) d = d.slice(4);
    else if (d.indexOf('20') === 0 && d.length === 12) d = d.slice(2);
    if (d.length === 10) d = '0' + d;
    return d;
  }

  /** Is this case about the person in the request? Matches on national ID or a mobile. */
  function matchesCase(c, subject) {
    var cu = c.customer || {};
    var nid = String(subject.nationalId || '').replace(/\D/g, '');
    if (nid && cu.nationalId && String(cu.nationalId) === nid) return true;
    var ph = phoneKey(subject.phone);
    if (ph && (cu.mobiles || []).some(function (m) { return phoneKey(m) === ph; })) return true;
    return false;
  }

  /** Error key for a new request, or null. */
  function validateRequest(v, kinds) {
    if (kinds.indexOf(v.kind) < 0) return { key: 'errors.required', field: 'kind' };
    if (!String(v.name || '').trim()) return { key: 'errors.required', field: 'name' };
    var nid = String(v.nationalId || '').replace(/\D/g, '');
    if (nid && nid.length !== 14) return { key: 'errors.nationalIdFormat', field: 'nationalId' };
    if (!nid && !phoneKey(v.phone)) return { key: 'errors.idOrPhone', field: 'nationalId' };
    if (v.phone && phoneKey(v.phone).length !== 11) return { key: 'errors.mobileFormat', field: 'phone' };
    return null;
  }

  wf.privacy = {
    DEFAULTS: DEFAULTS,
    LIMITS: LIMITS,
    /** Versions of the texts people agree to. A new version asks everyone again. */
    TERMS_VERSION: '2026-10',
    DPA_VERSION: '2026-10',
    REQUEST_KINDS: ['access', 'correction', 'deletion', 'objection'],
    REQUEST_CHANNELS: ['email', 'phone', 'letter', 'in_person', 'organisation'],
    BREACH_SEVERITIES: ['low', 'medium', 'high'],
    BREACH_DATA: ['identity', 'contact', 'address', 'financial', 'photos', 'reports', 'accounts'],
    settings: settings,
    validateSettings: validateSettings,
    addWorkingDays: addWorkingDays,
    requestDueAt: requestDueAt,
    breachDueAt: breachDueAt,
    eraseDue: eraseDue,
    eraseCase: eraseCase,
    phoneKey: phoneKey,
    matchesCase: matchesCase,
    validateRequest: validateRequest
  };
})();
