/* Investigation report helpers shared by the agent app, the mock backend, the export and
   the tests: flattening sectioned forms, computed answers, cleaning saved values, the
   simulated OCR reader and demo answers for seeded cases. Pure functions only. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});
  var C = ICM.config;

  var R = (wf.reports = {});

  /** Every field of a form, whether it uses sections or a flat list. */
  R.fields = function (def) {
    if (!def) return [];
    return def.sections ? def.sections.reduce(function (a, s) { return a.concat(s.fields); }, []) : def.fields;
  };
  wf.formFields = R.fields;

  /** Fill computed answers (age, total workers). ctx: { now } */
  R.compute = function (def, values, ctx) {
    var out = Object.assign({}, values);
    R.fields(def).forEach(function (f) {
      if (f.type !== 'computed') return;
      var x = f.compute(out, ctx || {});
      if (x == null || (typeof x === 'number' && !isFinite(x))) delete out[f.name]; else out[f.name] = x;
    });
    return out;
  };

  function blank(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }

  function cleanValue(f, v) {
    if (f.type === 'number') return blank(v) ? undefined : +v;
    if (f.type === 'repeat') {
      var rows = (Array.isArray(v) ? v : []).map(function (row) {
        var r = {};
        f.fields.forEach(function (sf) { var x = cleanValue(sf, (row || {})[sf.name]); if (x !== undefined) r[sf.name] = x; });
        return r;
      }).filter(function (r) { return Object.keys(r).length > 0; });
      return rows.length ? rows : undefined;
    }
    if (f.type === 'license') {
      var l = v || {};
      if (l.has !== 'yes' && l.has !== 'no') return undefined;
      return l.has === 'yes' ? { has: 'yes', number: String(l.number || '').trim(), photo: l.photo || null } : { has: 'no' };
    }
    if (blank(v)) return undefined;
    return typeof v === 'string' && f.type !== 'textarea' && f.type !== 'ocrDoc' && f.type !== 'signature' ? v.trim() : v;
  }

  /** Keep only the form's own fields, typed, with hidden fields dropped and computed ones refreshed. */
  R.clean = function (def, values, ctx) {
    var out = {};
    var v = values || {};
    R.fields(def).forEach(function (f) {
      if (f.type === 'computed') return;
      if (!wf.isVisible(f, v)) return;
      var x = cleanValue(f, v[f.name]);
      if (x !== undefined) out[f.name] = x;
    });
    return R.compute(def, out, ctx);
  };

  /** Errors for a saved report section ({} when complete). */
  R.validate = function (def, values, ctx) {
    return wf.validateFields(R.fields(def), R.compute(def, values || {}, ctx), ctx);
  };

  /** Photo slots asked for on a case, across its inquiry types, without repeats. */
  R.photoSlots = function (types) {
    var out = [];
    (types || []).forEach(function (tp) { (C.PHOTO_SLOTS[tp] || []).forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); }); });
    return out;
  };

  // ---------------------------------------------------------------- simulated OCR
  function pad(n) { return String(n).padStart(2, '0'); }
  function isoDate(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function rint(rnd, lo, hi) { return lo + Math.floor(rnd() * (hi - lo + 1)); }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  var YEAR = 365 * 24 * 3600 * 1000;
  var ACTIVITIES = ['تجارة الجملة والتجزئة في المواد الغذائية', 'تجارة الأجهزة الكهربائية والمنزلية', 'مقاولات عامة وتوريدات', 'تصنيع الملابس الجاهزة', 'تجارة قطع غيار السيارات', 'تجارة الأدوات المكتبية والطباعة'];
  var LEGAL = ['SOLE_PROPRIETORSHIP', 'SOLE_PROPRIETORSHIP', 'LLC', 'LLC', 'GENERAL_PARTNERSHIP', 'LIMITED_PARTNERSHIP', 'ONE_PERSON', 'JOINT_STOCK'];

  function govOf(c) {
    var id = c && (c.governorate || ((c.addresses || {}).business || (c.addresses || {}).home || {}).governorate);
    return (C.GOVERNORATES.filter(function (g) { return g.id === id; })[0]) || C.GOVERNORATES[0];
  }

  /**
   * What the OCR reads from a document photo. Simulated: values consistent with the case
   * (the ID card shows the customer the bank sent). A real OCR service replaces this.
   */
  R.simulateOcr = function (doc, c, now, rnd) {
    rnd = rnd || Math.random;
    now = now || Date.now();
    var gov = govOf(c);
    if (doc === 'national_id_card') {
      var cu = (c && c.customer) || {};
      return { idName: cu.name || '', idNationalId: cu.nationalId || '', idIssueDate: isoDate(now - rint(rnd, 200, 2400) * 24 * 3600 * 1000) };
    }
    if (doc === 'commercial_register_extract') {
      var founded = now - rint(rnd, 2, 25) * YEAR - rint(rnd, 0, 300) * 86400000;
      var renewed = Math.max(founded, now - rint(rnd, 0, 4) * YEAR - rint(rnd, 0, 300) * 86400000);
      var authorized = rint(rnd, 1, 50) * 100000;
      var issued = Math.round(authorized * pick(rnd, [0.5, 0.75, 1]));
      return {
        tradeName: (c && c.businessName) || 'مؤسسة ' + pick(rnd, ['النور', 'الأمل', 'الفجر']) + ' للتجارة',
        commercialRegister: String(rint(rnd, 10000, 999999)),
        unifiedRegistryNumber: String(rint(rnd, 100000000, 999999999)),
        issuingAuthority: 'مكتب سجل تجاري ' + gov.ar,
        legalForm: pick(rnd, LEGAL),
        foundingDate: isoDate(founded),
        registrationDate: isoDate(founded + rint(rnd, 0, 60) * 86400000),
        lastRenewalDate: isoDate(renewed),
        crExpiryDate: isoDate(renewed + 5 * YEAR),
        latestExtractDate: isoDate(now - rint(rnd, 3, 80) * 86400000),
        companyDuration: pick(rnd, [10, 25, 25, 50]),
        authorizedCapital: authorized,
        issuedCapital: issued,
        paidUpCapital: Math.round(issued * pick(rnd, [0.25, 0.5, 1])),
        activityPerRegister: pick(rnd, ACTIVITIES)
      };
    }
    if (doc === 'tax_card') {
      return {
        taxCardNumber: rint(rnd, 100, 999) + '-' + rint(rnd, 100, 999) + '-' + rint(rnd, 100, 999),
        taxOffice: 'مأمورية ضرائب ' + gov.ar,
        taxCardIssueDate: isoDate(now - rint(rnd, 1, 10) * YEAR)
      };
    }
    return {};
  };

  /** Gender from an Egyptian national ID: the 13th digit is odd for men. null when unknown. */
  R.isMale = function (nid) {
    nid = String(nid || '');
    return /^[23][0-9]{13}$/.test(nid) ? +nid[12] % 2 === 1 : null;
  };

  // ---------------------------------------------------------------- demo answers
  /** A complete, valid report for seeded and simulated cases. */
  R.sample = function (type, c, now, rnd) {
    rnd = rnd || Math.random;
    now = now || Date.now();
    var DOC = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" rx="8" fill="#e7eaef"/><rect x="12" y="14" width="40" height="50" fill="#c9ced8"/><rect x="62" y="20" width="84" height="8" fill="#c9ced8"/><rect x="62" y="36" width="70" height="8" fill="#c9ced8"/><rect x="62" y="52" width="76" height="8" fill="#c9ced8"/></svg>');
    var SIG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="90"><path d="M10 60 C 40 10, 60 90, 90 40 S 140 70, 170 30 S 230 80, 290 35" stroke="#18202b" stroke-width="3" fill="none"/></svg>');
    if (type === 'residence') {
      var ocr = R.simulateOcr('national_id_card', c, now, rnd);
      var married = rnd() < 0.65;
      var male = R.isMale(ocr.idNationalId) !== false;
      var v = Object.assign({ idCardScan: DOC }, ocr, {
        title: male ? 'Mr' : married ? 'Mrs' : 'Miss',
        maritalStatus: married ? 'MARRIED' : pick(rnd, ['SINGLE', 'SINGLE', 'DIVORCED']),
        livesWith: married ? (male ? 'WIFE' : 'HUSBAND') : pick(rnd, ['PARENTS', 'RELATIVES', 'ALONE']),
        healthCondition: 'GOOD', reputation: rnd() < 0.85 ? 'GOOD' : 'AVERAGE',
        actualResidence: (((c && c.addresses && c.addresses.home) || {}).street || 'عقار رقم ' + rint(rnd, 2, 90)) + ' - ' + govOf(c).ar,
        accessDescription: pick(rnd, ['بجوار الصيدلية', 'أمام المسجد', 'خلف المدرسة الابتدائية', 'أعلى المخبز']),
        houseType: pick(rnd, ['OWN', 'OWN', 'OLD_RENT', 'NEW_RENT', 'FAMILY_HOUSE']),
        yearsOfResidence: rint(rnd, 1, 20), propertyCondition: pick(rnd, ['GOOD', 'GOOD', 'AVERAGE']), areaCondition: pick(rnd, ['GOOD', 'AVERAGE']),
        areaLevel: pick(rnd, ['GOOD', 'MEDIUM', 'MEDIUM', 'HIGH']), floors: rint(rnd, 1, 10), apartments: rint(rnd, 1, 4),
        streetAllowsCars: rnd() < 0.7 ? 'yes' : 'no', numberOfCars: rint(rnd, 0, 2),
        intervieweeName: pick(rnd, ['محمد السيد', 'أحمد عبد الله', 'حسن إبراهيم']), intervieweeRelation: pick(rnd, ['NEIGHBOUR', 'DOORMAN']),
        references: [{ name: pick(rnd, ['منى علي', 'سامي حسن', 'كريم فؤاد']), relation: pick(rnd, ['BROTHER', 'SISTER', 'FRIEND']), mobile: '010' + rint(rnd, 10000000, 99999999) }],
        visitNotes: 'تم سؤال الجيران وأكدوا إقامة العميل بالعقار. تم الاطلاع على بطاقة الرقم القومي.',
        recommendation: rnd() < 0.9 ? 'APPROVED' : 'REJECTED'
      });
      if (married) {
        v.spouseName = male ? pick(rnd, ['سارة محمد', 'هبة أحمد', 'نادية حسن']) : pick(rnd, ['محمد علي', 'أحمد حسن', 'كريم سامي']);
        v.spouseJob = male ? pick(rnd, ['ربة منزل', 'معلمة', 'محاسبة']) : pick(rnd, ['مهندس', 'محاسب', 'موظف حكومي']);
      }
      if (v.recommendation === 'REJECTED') v.rejectionReason = 'العميل لا يقيم بالعنوان المذكور.';
      return R.clean(C.REPORT_FORMS.residence, v, { now: now });
    }
    if (type === 'business') {
      var stores = rint(rnd, 0, 2), branches = rint(rnd, 0, 1);
      var b = Object.assign({ crScan: DOC, taxScan: DOC }, R.simulateOcr('commercial_register_extract', c, now, rnd), R.simulateOcr('tax_card', c, now, rnd), {
        operatingLicense: { has: 'yes', number: String(rint(rnd, 1000, 99999)), photo: null },
        otherLicense: { has: 'no' }, importCard: rnd() < 0.3 ? { has: 'yes', number: String(rint(rnd, 10000, 99999)), photo: null } : { has: 'no' },
        exportersRegister: { has: 'no' }, industrialRecord: { has: 'no' },
        actualActivity: pick(rnd, ACTIVITIES), suppliersLocal: 'موردون محليون بالمنطقة الصناعية',
        maleWorkers: rint(rnd, 1, 15), femaleWorkers: rint(rnd, 0, 6),
        mainCenterOwnership: pick(rnd, ['OWNED', 'RENTED']), mainCenterAddress: (((c && c.addresses && c.addresses.business) || {}).street) || 'المقر الرئيسي',
        storesCount: stores, storesAddresses: stores ? 'مخزن بجوار المقر الرئيسي' : '', branchesCount: branches, branchesAddresses: branches ? 'فرع واحد بنفس المدينة' : '',
        comments: 'النشاط قائم ومطابق للسجل التجاري.', recommendation: rnd() < 0.9 ? 'APPROVED' : 'REJECTED',
        visitorSignature: SIG
      });
      return R.clean(C.REPORT_FORMS.business, b, { now: now });
    }
    return null;
  };
})();
