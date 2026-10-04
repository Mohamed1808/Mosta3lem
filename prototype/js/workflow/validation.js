/* Pure field validation shared by the form renderer, the bulk upload and the workflow
   guards (a report is "complete" when its form validates). Returns error i18n keys. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});
  var P = ICM.config.PATTERNS;

  function empty(v) {
    if (v == null) return true;
    if (Array.isArray(v)) return v.filter(function (x) { return x !== '' && x != null; }).length === 0;
    if (typeof v === 'object') return false;
    return String(v).trim() === '';
  }

  /** Egyptian national ID: 14 digits, century digit 2 or 3, valid birth date, known governorate code. */
  wf.validateNationalId = function (id) {
    id = String(id == null ? '' : id).trim();
    if (!id) return 'errors.required';
    if (!P.nationalId.test(id)) return 'errors.nationalIdFormat';
    var month = +id.slice(3, 5), day = +id.slice(5, 7);
    if (month < 1 || month > 12 || day < 1 || day > 31) return 'errors.nationalIdDate';
    var gov = id.slice(7, 9);
    var codes = ICM.config.GOVERNORATES.map(function (g) { return g.code; }).concat(['88']);
    if (codes.indexOf(gov) < 0) return 'errors.nationalIdGov';
    return null;
  };

  wf.validateMobile = function (m) {
    m = String(m == null ? '' : m).replace(/\s+/g, '');
    if (!m) return 'errors.required';
    return P.mobile.test(m) ? null : 'errors.mobileFormat';
  };

  wf.isVisible = function (field, values) { return !field.showIf || field.showIf(values); };
  wf.isRequired = function (field, values) { return !!field.required || !!(field.requiredIf && field.requiredIf(values)); };

  /** Validate values against a list of field definitions. Returns { fieldName: errorKey }. */
  wf.validateFields = function (fields, values, opts) {
    var errors = {};
    opts = opts || {};
    fields.forEach(function (f) {
      if (!wf.isVisible(f, values)) return;
      var v = values[f.name];
      var req = wf.isRequired(f, values);
      if (f.type === 'license') {
        var lic = v || {};
        if (lic.has !== 'yes' && lic.has !== 'no') { if (req) errors[f.name] = 'errors.required'; }
        else if (lic.has === 'yes' && empty(lic.number)) errors[f.name] = 'errors.licenseNumberRequired';
        return;
      }
      if (f.type === 'repeat') {
        var rows = Array.isArray(v) ? v : [];
        if (req && !rows.length) errors[f.name] = 'errors.required';
        if (f.max && rows.length > f.max) errors[f.name] = 'errors.max';
        rows.forEach(function (row, i) {
          var sub = wf.validateFields(f.fields, row || {}, opts);
          Object.keys(sub).forEach(function (k) { errors[f.name + '.' + i + '.' + k] = sub[k]; });
        });
        return;
      }
      if (f.type === 'address') {
        var a = v || {};
        var any = !empty(a.governorate) || !empty(a.city) || !empty(a.street);
        if (req || any) {
          if (empty(a.governorate)) errors[f.name + '.governorate'] = 'errors.required';
          else if (opts.governorates && opts.governorates.indexOf(a.governorate) < 0) errors[f.name + '.governorate'] = 'errors.unknownGovernorate';
          if (empty(a.city)) errors[f.name + '.city'] = 'errors.required';
          if (empty(a.street)) errors[f.name + '.street'] = 'errors.required';
        }
        return;
      }
      if (empty(v)) { if (req) errors[f.name] = 'errors.required'; return; }
      var e = null;
      switch (f.type) {
        case 'nationalId': e = wf.validateNationalId(v); break;
        case 'phone': e = wf.validateMobile(v); break;
        case 'anyPhone': e = wf.validateAnyPhone(v); break;
        case 'phones':
          [].concat(v).filter(function (x) { return !empty(x); }).some(function (x) { e = wf.validateMobile(x); return !!e; });
          break;
        case 'number':
          if (isNaN(+v)) e = 'errors.number';
          else if (f.min != null && +v < f.min) e = 'errors.min';
          else if (f.max != null && +v > f.max) e = 'errors.max';
          break;
        case 'yesno':
          if (v !== 'yes' && v !== 'no') e = 'errors.required';
          break;
        case 'date':
        case 'datetime':
          if (isNaN(new Date(v).getTime())) e = 'errors.date';
          break;
      }
      if (e) errors[f.name] = e;
    });
    return errors;
  };

  wf.validateForm = function (form, values, ctx) {
    var fields = form.sections ? form.sections.reduce(function (a, s) { return a.concat(s.fields); }, []) : form.fields;
    var errors = wf.validateFields(fields, values, ctx);
    if (form.validate) {
      var extra = form.validate(values, ctx) || {};
      for (var k in extra) if (!errors[k]) errors[k] = extra[k];
    }
    return errors;
  };

  wf.empty = empty;
})();
