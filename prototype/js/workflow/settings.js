/* Provider settings rules: document expiry and reminders, response time limits and price
   bands. Pure functions over plain values, shared by the mock backend, the prototype and
   the app, so the same rules can run on a server.

   Expiring documents carry expiresAt (ms). A renewal sent for a verified document waits in
   doc.renewal until Operations checks it; until then the current document still counts. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});
  var DAY = 24 * 60 * 60 * 1000;

  /** Documents that expire and must be renewed. */
  wf.EXPIRING_DOCS = ['commercial_register', 'tax_card'];
  /** Reminders before a document expires, in days. */
  wf.EXPIRY_REMINDER_DAYS = [30, 7];

  wf.isExpiringDoc = function (type) { return wf.EXPIRING_DOCS.indexOf(type) >= 0; };

  /**
   * Where a document stands on expiry.
   * state: 'none' (no date), 'valid', 'expiring' (within the first reminder window) or 'expired'.
   */
  wf.docExpiry = function (doc, now) {
    if (!doc || !doc.expiresAt) return { state: 'none', daysLeft: null };
    var daysLeft = Math.ceil((doc.expiresAt - now) / DAY);
    if (doc.expiresAt <= now) return { state: 'expired', daysLeft: daysLeft };
    if (daysLeft <= wf.EXPIRY_REMINDER_DAYS[0]) return { state: 'expiring', daysLeft: daysLeft };
    return { state: 'valid', daysLeft: daysLeft };
  };

  /** Expired documents of a provider. While any is expired the provider gets no new offers. */
  wf.expiredDocs = function (p, now) {
    var docs = (p && p.verification && p.verification.documents) || [];
    return docs.filter(function (d) { return wf.isExpiringDoc(d.type) && d.expiresAt && d.expiresAt <= now; });
  };

  /**
   * Reminders now due for a document: the smallest threshold reached that has not been sent,
   * or 'expired' once past the date. sent: { 30: true, 7: true, expired: true }.
   */
  wf.dueReminder = function (doc, now) {
    if (!doc || !doc.expiresAt || !wf.isExpiringDoc(doc.type)) return null;
    var sent = doc.reminders || {};
    if (doc.expiresAt <= now) return sent.expired ? null : 'expired';
    var daysLeft = (doc.expiresAt - now) / DAY;
    var due = null;
    wf.EXPIRY_REMINDER_DAYS.forEach(function (d) { if (daysLeft <= d && !sent[d]) due = d; });
    return due;
  };

  /** A date entered as YYYY-MM-DD, as the end of that day in ms; null when not a real date. */
  wf.parseDay = function (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59);
    return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d.getTime() : null;
  };

  /** Error key for an expiry date, or null. It must be a real date in the future. */
  wf.validateExpiry = function (expiresAt, now) {
    if (!expiresAt) return 'errors.required';
    if (expiresAt <= now) return 'errors.expiryInPast';
    return null;
  };

  // ---------------------------------------------------------------- response times
  /**
   * The slowest response time the platform accepts: each inquiry type's platform SLA, and
   * the first-contact limit for collections.
   */
  wf.slaLimits = function (config) {
    var out = { investigation: {}, collectionFirstContactHours: (config.pricing && config.pricing.collectionFirstContactMaxHours) || 48 };
    (config.lists.inquiryTypes || []).forEach(function (t) { out.investigation[t.id] = t.defaultSlaHours; });
    return out;
  };

  /** { field: errorKey } for response times. Fields: sla_<type>, firstContact. */
  wf.validateSla = function (sla, services, limits) {
    var errors = {};
    var check = function (field, v, max) {
      v = +v;
      if (!v || v < 1 || Math.round(v) !== v) errors[field] = 'errors.wholeHours';
      else if (v > max) errors[field] = 'errors.slaTooSlow';
    };
    if (services.indexOf('investigation') >= 0) {
      Object.keys(limits.investigation).forEach(function (t) { check('sla_' + t, ((sla && sla.investigation) || {})[t], limits.investigation[t]); });
    }
    if (services.indexOf('collection') >= 0) check('firstContact', sla && sla.collectionFirstContactHours, limits.collectionFirstContactHours);
    return errors;
  };

  // ---------------------------------------------------------------- prices
  /** The allowed price range for an inquiry type in a pricing zone. */
  wf.priceBand = function (pricingCfg, type, zone) {
    var band = pricingCfg.investigationBands[type], m = pricingCfg.zoneMultiplier[zone] || 1;
    return { min: Math.round(band.min * m), max: Math.round(band.max * m) };
  };

  /** { field: errorKey } for a price list. Fields: price_<type>_<zone>, fee_<bucket>, fixedFee. */
  wf.validatePricing = function (pricing, services, pricingCfg, zones) {
    var errors = {};
    if (services.indexOf('investigation') >= 0) {
      var inv = (pricing && pricing.investigation) || {};
      Object.keys(pricingCfg.investigationBands).forEach(function (t) {
        zones.forEach(function (z) {
          var v = +((inv[t] || {})[z]), b = wf.priceBand(pricingCfg, t, z);
          if (!(v >= b.min && v <= b.max)) errors['price_' + t + '_' + z] = 'errors.outOfBand';
        });
      });
    }
    if (services.indexOf('collection') >= 0) {
      var col = (pricing && pricing.collection) || {};
      Object.keys(pricingCfg.collectionFeeBands).forEach(function (k) {
        var v = +((col.feePct || {})[k]), b = pricingCfg.collectionFeeBands[k];
        if (!(v >= b.min && v <= b.max)) errors['fee_' + k] = 'errors.outOfBand';
      });
      var f = +col.fixedFee;
      if (!(f >= 0 && f <= pricingCfg.collectionFixedFeeMax)) errors.fixedFee = 'errors.outOfBand';
    }
    return errors;
  };

  /** True when two price lists differ anywhere. */
  wf.pricingChanged = function (a, b) { return JSON.stringify(a || {}) !== JSON.stringify(b || {}); };
})();
