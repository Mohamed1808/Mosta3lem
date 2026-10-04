/* Service provider registration and team member rules. Pure functions over plain values,
   shared by the registration wizard (self sign-up and admin registration), the team
   screens and the mock backend, so the same rules run in the browser and on a server.

   Registration values (flat, as the wizard collects them):
     kind: 'company' | 'individual', services: ['investigation', 'collection']
     company:    companyName, taxId, commercialRegNo, mainPhone, companyEmail,
                 ownerName, ownerNationalId, ownerPhone, ownerEmail,
                 focalSame, focalName, focalTitle, focalPhone, focalEmail
     individual: fullName, nationalId, phone, email
     both:       addrGov, addrCity, addrStreet, addrLandmark,
                 coverage: { governorateId: [cityId, ...] }   (empty list = whole governorate)
                 docs: { documentType: fileName }, terms (self sign-up only)
   validateRegistration returns { field: errorKey }. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});
  var C = ICM.config;

  var PAT = {
    taxId: /^[0-9]{9}$/,
    commercialReg: /^[0-9]{3,10}$/,
    landline: /^0[2-9][0-9]{7,8}$/,
    hotline: /^1[0-9]{4}$/,
    email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/
  };
  wf.REG_PATTERNS = PAT;

  var blank = function (v) { return v == null || String(v).trim() === ''; };
  var digits = function (v) { return String(v == null ? '' : v).replace(/[\s\-]/g, ''); };

  /** Strip spaces and dashes from number fields and trim text. Returns a new object. */
  wf.normalizeRegistration = function (v) {
    var out = {};
    Object.keys(v || {}).forEach(function (k) {
      var x = v[k];
      out[k] = typeof x === 'string' ? x.trim() : x;
    });
    ['taxId', 'commercialRegNo', 'mainPhone', 'ownerPhone', 'ownerNationalId', 'focalPhone', 'phone', 'nationalId'].forEach(function (k) {
      if (out[k] != null) out[k] = digits(out[k]);
    });
    out.services = (out.services || []).slice();
    out.coverage = out.coverage || {};
    out.docs = out.docs || {};
    if (out.kind === 'company' && out.focalSame) {
      out.focalName = out.ownerName; out.focalPhone = out.ownerPhone; out.focalEmail = out.ownerEmail;
    }
    return out;
  };

  /** Mobile, landline or a five-digit hotline. Company switchboards are often not mobiles. */
  wf.validateAnyPhone = function (p) {
    p = digits(p);
    if (!p) return 'errors.required';
    if (C.PATTERNS.mobile.test(p) || PAT.landline.test(p) || PAT.hotline.test(p)) return null;
    return 'errors.phoneFormat';
  };

  wf.validateTaxId = function (v) {
    v = digits(v);
    if (!v) return 'errors.required';
    return PAT.taxId.test(v) ? null : 'errors.taxIdFormat';
  };

  wf.validateCommercialReg = function (v) {
    v = digits(v);
    if (!v) return 'errors.required';
    return PAT.commercialReg.test(v) ? null : 'errors.commercialRegFormat';
  };

  wf.validateEmail = function (v, required) {
    if (blank(v)) return required ? 'errors.required' : null;
    return PAT.email.test(String(v).trim()) ? null : 'errors.emailFormat';
  };

  /** Age in whole years from an Egyptian national ID (century digit, YYMMDD). */
  wf.ageFromNationalId = function (id, now) {
    id = digits(id);
    if (!C.PATTERNS.nationalId.test(id)) return null;
    var year = (id[0] === '3' ? 2000 : 1900) + +id.slice(1, 3);
    var month = +id.slice(3, 5), day = +id.slice(5, 7);
    var d = new Date(now || Date.now());
    var age = d.getFullYear() - year;
    if (d.getMonth() + 1 < month || (d.getMonth() + 1 === month && d.getDate() < day)) age--;
    return age;
  };

  /** National ID of a person who will work in the field: valid and at least 18 years old. */
  wf.validateAdultNationalId = function (id, now) {
    var e = wf.validateNationalId(id);
    if (e) return e;
    var age = wf.ageFromNationalId(id, now);
    return age != null && age < 18 ? 'errors.underage' : null;
  };

  /** Coverage: at least one known governorate; every city listed must belong to it. */
  wf.validateCoverage = function (coverage, opts) {
    var govs = Object.keys(coverage || {});
    if (!govs.length) return 'errors.coverageRequired';
    var known = (opts && opts.governorates) || C.GOVERNORATES.map(function (g) { return g.id; });
    for (var i = 0; i < govs.length; i++) {
      if (known.indexOf(govs[i]) < 0) return 'errors.unknownGovernorate';
      var cities = coverage[govs[i]] || [];
      var list = C.citiesOf(govs[i]).map(function (c) { return c.id; });
      for (var j = 0; j < cities.length; j++) if (list.indexOf(cities[j]) < 0) return 'errors.unknownCity';
    }
    return null;
  };

  function validateAddress(v, errors, opts) {
    var known = (opts && opts.governorates) || C.GOVERNORATES.map(function (g) { return g.id; });
    if (blank(v.addrGov)) errors.addrGov = 'errors.required';
    else if (known.indexOf(v.addrGov) < 0) errors.addrGov = 'errors.unknownGovernorate';
    if (blank(v.addrCity)) errors.addrCity = 'errors.required';
    else if (!errors.addrGov && C.citiesOf(v.addrGov).length && !C.cityLabel(v.addrGov, v.addrCity)) errors.addrCity = 'errors.unknownCity';
    if (blank(v.addrStreet)) errors.addrStreet = 'errors.required';
  }

  function put(errors, key, e) { if (e) errors[key] = e; }

  /**
   * Validate registration values. opts: { governorates: [ids], now, requireTerms, steps }
   * `steps` limits the check to some wizard steps (see wf.REG_STEPS).
   */
  wf.validateRegistration = function (raw, opts) {
    opts = opts || {};
    var v = wf.normalizeRegistration(raw);
    var errors = {};
    var want = function (step) { return !opts.steps || opts.steps.indexOf(step) >= 0; };

    if (want('type')) {
      if (v.kind !== 'company' && v.kind !== 'individual') errors.kind = 'errors.required';
      var svc = (v.services || []).filter(function (s) { return C.SERVICES.indexOf(s) >= 0; });
      if (!svc.length) errors.services = 'errors.serviceRequired';
    }

    if (want('details')) {
      if (v.kind === 'company') {
        if (blank(v.companyName)) errors.companyName = 'errors.required';
        put(errors, 'taxId', wf.validateTaxId(v.taxId));
        put(errors, 'commercialRegNo', wf.validateCommercialReg(v.commercialRegNo));
        put(errors, 'mainPhone', wf.validateAnyPhone(v.mainPhone));
        put(errors, 'companyEmail', wf.validateEmail(v.companyEmail, false));
        if (blank(v.ownerName)) errors.ownerName = 'errors.required';
        put(errors, 'ownerNationalId', wf.validateNationalId(v.ownerNationalId));
        put(errors, 'ownerPhone', wf.validateMobile(v.ownerPhone));
        put(errors, 'ownerEmail', wf.validateEmail(v.ownerEmail, false));
        if (!v.focalSame) {
          if (blank(v.focalName)) errors.focalName = 'errors.required';
          put(errors, 'focalPhone', wf.validateMobile(v.focalPhone));
          put(errors, 'focalEmail', wf.validateEmail(v.focalEmail, false));
        }
      } else if (v.kind === 'individual') {
        if (blank(v.fullName)) errors.fullName = 'errors.required';
        else if (String(v.fullName).trim().split(/\s+/).length < 2) errors.fullName = 'errors.fullNameShort';
        put(errors, 'nationalId', wf.validateAdultNationalId(v.nationalId, opts.now));
        put(errors, 'phone', wf.validateMobile(v.phone));
        put(errors, 'email', wf.validateEmail(v.email, false));
      }
    }

    if (want('area')) {
      validateAddress(v, errors, opts);
      put(errors, 'coverage', wf.validateCoverage(v.coverage, opts));
    }

    if (want('submit')) {
      if (opts.requireTerms && !v.terms) errors.terms = 'errors.termsRequired';
    }
    return errors;
  };

  /** Wizard steps in order and the fields each one owns. */
  wf.REG_STEPS = ['type', 'details', 'area', 'submit'];

  /** Documents asked for at registration. Uploading can wait; verification cannot. */
  wf.registrationDocs = function (kind) {
    return kind === 'company'
      ? ['commercial_register', 'tax_card', 'owner_id_front', 'owner_id_back']
      : ['id_front', 'id_back', 'criminal_record'];
  };

  /**
   * Application review: Operations checks the application, then Management signs it off.
   *   pending -> awaiting_signoff -> verified, with info_requested and rejected on the way.
   * The applicant can answer a request for information, or fix and resend after a rejection.
   */
  wf.APPLICATION_STAGES = ['submitted', 'review', 'signoff', 'decision'];
  wf.applicationStage = function (status) {
    return { pending: 1, info_requested: 1, awaiting_signoff: 2, verified: 4, rejected: 3 }[status] || 0;
  };
  /** The applicant may change details and resend only when the platform handed it back. */
  wf.applicationEditable = function (status) { return status === 'info_requested' || status === 'rejected'; };
  wf.applicationOpen = function (status) { return status === 'pending' || status === 'info_requested' || status === 'awaiting_signoff'; };

  // ---------------------------------------------------------------- team members
  /**
   * Validate a supervisor or field agent added by a company.
   * role: 'provider_supervisor' | 'agent'. opts: { services: provider services, supervisors: [userIds], now }
   * Values: name, phone, email, nationalId, services[], coverage { gov: [cities] } (agents), supervisorId (agents).
   */
  wf.validateTeamMember = function (role, raw, opts) {
    opts = opts || {};
    var v = raw || {};
    var errors = {};
    if (blank(v.name)) errors.name = 'errors.required';
    put(errors, 'phone', wf.validateMobile(digits(v.phone)));
    put(errors, 'email', wf.validateEmail(v.email, false));
    var svc = (v.services || []).filter(function (s) { return (opts.services || C.SERVICES).indexOf(s) >= 0; });
    if (!svc.length) errors.services = 'errors.serviceRequired';
    if (role === 'agent') {
      put(errors, 'nationalId', wf.validateAdultNationalId(digits(v.nationalId), opts.now));
      put(errors, 'coverage', wf.validateCoverage(v.coverage, opts));
      if (blank(v.supervisorId)) errors.supervisorId = 'errors.supervisorRequired';
      else if (opts.supervisors && opts.supervisors.indexOf(v.supervisorId) < 0) errors.supervisorId = 'errors.supervisorRequired';
    } else if (!blank(v.nationalId)) {
      put(errors, 'nationalId', wf.validateNationalId(digits(v.nationalId)));
    }
    return errors;
  };

  /** Governorates in a coverage map, and a readable "Gov (city, city)" summary helper. */
  wf.coverageGovs = function (coverage) { return Object.keys(coverage || {}); };
})();
