/* Registration UI shared by self sign-up, admin registration and the team screens:
   the coverage picker (governorates, optionally narrowed to cities), the city dropdown,
   document pickers and the four-step registration wizard. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, C = ICM.config, wf = ICM.wf;
  var ui = (ICM.ui = ICM.ui || {});

  function govList() { return (ui.cfg && ui.cfg.lists.governorates) || C.GOVERNORATES; }
  function cityText(gov, id) { var c = C.cityLabel(gov, id); return c ? U.label(c) : id; }
  function err(errors, name) { var e = errors && errors[name]; return e ? h`<div class="err">${t(e)}</div>` : ''; }

  // ================================================================ coverage
  ui.coverage = {
    /**
     * Governorate checkboxes grouped by pricing zone. Ticking one reveals its cities; no
     * city ticked means the whole governorate. opts: { only: [govIds], cityLimit: { gov: [cityIds] } }
     */
    picker: function (name, cov, opts) {
      opts = opts || {};
      cov = cov || {};
      var govs = govList().filter(function (g) { return !opts.only || opts.only.indexOf(g.id) >= 0; });
      var zones = C.ZONES.filter(function (z) { return govs.some(function (g) { return g.zone === z.id; }); });
      var extra = govs.filter(function (g) { return !C.ZONES.some(function (z) { return z.id === g.zone; }); });
      function govRow(g) {
        var on = Object.prototype.hasOwnProperty.call(cov, g.id);
        var picked = cov[g.id] || [];
        var limit = opts.cityLimit && opts.cityLimit[g.id] && opts.cityLimit[g.id].length ? opts.cityLimit[g.id] : null;
        var cities = C.citiesOf(g.id).filter(function (c) { return !limit || limit.indexOf(c.id) >= 0; });
        var id = 'cov_' + name + '_' + g.id;
        return h`<div class="cov-gov">
          <input type="checkbox" class="cov-cb" id="${id}" data-cov-gov="${g.id}" ${on ? 'checked' : ''}><label for="${id}">${U.label(g)}</label>
          ${cities.length ? h`<div class="cov-cities"><div class="xs faint cov-hint">${limit ? t('coverage.limitedHint') : t('coverage.wholeHint')}</div>${cities.map(function (c) {
            return h`<label class="chip"><input type="checkbox" data-cov-city="${g.id}" value="${c.id}" ${picked.indexOf(c.id) >= 0 ? 'checked' : ''}>${U.label(c)}</label>`;
          })}</div>` : ''}
        </div>`;
      }
      return h`<div class="cov" data-cov="${name}">${zones.map(function (z) {
        return h`<div class="cov-zone"><div class="cov-zone-h">${U.label(z)}</div><div class="cov-list">${govs.filter(function (g) { return g.zone === z.id; }).map(govRow)}</div></div>`;
      })}${extra.length ? h`<div class="cov-zone"><div class="cov-list">${extra.map(govRow)}</div></div>` : ''}</div>`;
    },
    read: function (root, name) {
      var box = root.querySelector('[data-cov="' + name + '"]');
      if (!box) return null;
      var out = {};
      Array.prototype.forEach.call(box.querySelectorAll('[data-cov-gov]'), function (cb) {
        if (!cb.checked) return;
        var g = cb.getAttribute('data-cov-gov');
        out[g] = Array.prototype.slice.call(box.querySelectorAll('[data-cov-city="' + g + '"]:checked')).map(function (x) { return x.value; });
      });
      return out;
    },
    /** "Giza (Dokki, Haram), Cairo". max: cut after that many governorates. */
    text: function (cov, max) {
      var govs = Object.keys(cov || {});
      var parts = govs.slice(0, max || govs.length).map(function (g) {
        var cities = cov[g] || [];
        return ui.gov(g) + (cities.length ? ' (' + cities.map(function (c) { return cityText(g, c); }).join(t('common.listSep')) + ')' : '');
      });
      if (max && govs.length > max) parts.push(t('coverage.more', { n: govs.length - max }));
      return parts.join(t('common.listSep'));
    }
  };

  /** City dropdown for a governorate; free text when the governorate has no city list. */
  ui.cityControl = function (name, gov, value, invalid) {
    var cities = gov ? C.citiesOf(gov) : [];
    if (gov && !cities.length) return h`<input class="input ${invalid ? 'invalid' : ''}" name="${name}" value="${value || ''}" data-rv>`;
    return h`<select class="select ${invalid ? 'invalid' : ''}" name="${name}" data-rv ${gov ? '' : 'disabled'}><option value="">${gov ? t('common.select') : t('reg.pickGovFirst')}</option>${cities.map(function (c) {
      return h`<option value="${c.id}" ${c.id === value ? 'selected' : ''}>${U.label(c)}</option>`;
    })}</select>`;
  };
  ui.cityName = function (gov, city) { return city ? cityText(gov, city) : '-'; };
  ui.address = function (a) {
    if (!a) return '-';
    return h`${a.street}, ${ui.cityName(a.governorate, a.city)}, ${ui.gov(a.governorate)}${a.landmark ? h`<div class="faint small">${a.landmark}</div>` : ''}`;
  };

  /** A document slot: shows the attached file name and a picker. Only the name is kept (demo). */
  ui.docPicker = function (type, fileName, opts) {
    opts = opts || {};
    return h`<div class="doc-pick">
      <div class="grow"><div class="strong small">${t('doc.' + type)}</div><div class="xs ${fileName ? '' : 'faint'}" data-doc-name>${fileName || t('reg.noFile')}</div></div>
      <label class="btn btn-sm">${icon('upload')}${fileName ? t('reg.replaceFile') : t('reg.attachFile')}<input type="file" accept="application/pdf,image/*" class="sr-only" data-change="${opts.action || 'pickDocFile'}" data-doc="${type}"></label>
      <input type="hidden" name="doc_${type}" value="${fileName || ''}" data-rv>
    </div>`;
  };

  /** What a provider registered with: identity, people, address and coverage. */
  ui.registrationDetails = function (p) {
    var ltr = function (x) { return x ? h`<bdi dir="ltr">${x}</bdi>` : '-'; };
    var company = p.kind === 'company';
    return h`<dl class="dl">
      <dt>${t('profile.services')}</dt><dd>${p.services.map(function (s) { return t('service.' + s); }).join(t('common.listSep'))}</dd>
      ${company && p.legal ? h`<dt>${t('reg.f.taxId')}</dt><dd>${ltr(p.legal.taxId)}</dd><dt>${t('reg.f.commercialRegNo')}</dt><dd>${ltr(p.legal.commercialRegNo)}</dd>` : ''}
      ${company && p.owner ? h`<dt>${t('reg.sec.owner')}</dt><dd>${p.owner.name}<div class="xs faint">${ltr(p.owner.phone)}</div></dd>` : ''}
      ${company && p.focalPoint ? h`<dt>${t('reg.sec.focal')}</dt><dd>${p.focalPoint.name}${p.focalPoint.title ? h` <span class="faint">(${p.focalPoint.title})</span>` : ''}<div class="xs faint">${ltr(p.focalPoint.phone)}</div></dd>` : ''}
      ${!company && p.nationalId ? h`<dt>${t('reg.f.nationalId')}</dt><dd>${ltr(p.nationalId)}</dd>` : ''}
      <dt>${company ? t('reg.f.mainPhone') : t('reg.f.phone')}</dt><dd>${ltr(p.phone)}</dd>
      <dt>${company ? t('reg.sec.hq') : t('reg.detail.address')}</dt><dd>${p.address ? ui.address(p.address) : p.city}</dd>
      <dt>${t('reg.detail.coverage')}</dt><dd>${p.coverageCities ? ui.coverage.text(p.coverageCities) : p.governorates.map(ui.gov).join(t('common.listSep'))}</dd>
    </dl>`;
  };

  // ================================================================ wizard
  var STEPS = wf.REG_STEPS;
  var FIELD_STEP = {
    kind: 'type', services: 'type',
    companyName: 'details', taxId: 'details', commercialRegNo: 'details', mainPhone: 'details', companyEmail: 'details',
    ownerName: 'details', ownerNationalId: 'details', ownerPhone: 'details', ownerEmail: 'details',
    focalName: 'details', focalTitle: 'details', focalPhone: 'details', focalEmail: 'details',
    fullName: 'details', nationalId: 'details', phone: 'details', email: 'details',
    addrGov: 'area', addrCity: 'area', addrStreet: 'area', addrLandmark: 'area', coverage: 'area',
    terms: 'submit'
  };

  function field(v, errors, name, opts) {
    opts = opts || {};
    var bad = !!(errors && errors[name]);
    var id = 'rg_' + name;
    var val = v[name] == null ? '' : v[name];
    var extra = opts.ltr ? ICM.raw(' dir="ltr" inputmode="numeric"') : '';
    var control = h`<input class="input ${bad ? 'invalid' : ''}" id="${id}" name="${name}" value="${val}" data-rv ${opts.type ? ICM.raw('type="' + opts.type + '"') : ''} ${opts.placeholder ? ICM.raw('placeholder="' + ICM.esc(opts.placeholder) + '"') : ''} ${opts.max ? ICM.raw('maxlength="' + opts.max + '"') : ''}${extra}>`;
    return h`<div class="field ${opts.full ? 'full' : ''}"><label for="${id}">${t('reg.f.' + name)}${opts.required ? h`<span class="req">*</span>` : ''}</label>${control}${opts.hint ? h`<div class="hint">${opts.hint}</div>` : ''}${err(errors, name)}</div>`;
  }

  function choice(type, name, value, checked, ic, title, body) {
    return h`<label class="reg-choice"><input type="${type}" name="${name}" value="${value}" data-rv ${checked ? 'checked' : ''}><span class="choice-body">${icon(ic)}<span><strong>${title}</strong><span class="small muted">${body}</span></span></span></label>`;
  }

  function stepType(v, errors) {
    return h`<div class="stack">
      <div><h3 class="mb-8">${t('reg.q.kind')}</h3><div class="choice-grid">
        ${choice('radio', 'kind', 'company', v.kind === 'company', 'building', t('reg.kind.company'), t('reg.kind.companyBody'))}
        ${choice('radio', 'kind', 'individual', v.kind === 'individual', 'user', t('reg.kind.individual'), t('reg.kind.individualBody'))}
      </div>${err(errors, 'kind')}</div>
      <div><h3 class="mb-8">${t('reg.q.services')}</h3><div class="choice-grid">
        ${choice('checkbox', 'services', 'investigation', (v.services || []).indexOf('investigation') >= 0, 'search', t('service.investigation'), t('reg.svc.investigationBody'))}
        ${choice('checkbox', 'services', 'collection', (v.services || []).indexOf('collection') >= 0, 'coins', t('service.collection'), t('reg.svc.collectionBody'))}
      </div><div class="xs faint mt-8">${t('reg.svc.bothHint')}</div>${err(errors, 'services')}</div>
    </div>`;
  }

  function stepDetails(v, errors) {
    if (v.kind === 'company') {
      return h`<div>
        <div class="form-section"><h3>${t('reg.sec.company')}</h3><div class="form-grid">
          ${field(v, errors, 'companyName', { required: true, full: true })}
          ${field(v, errors, 'taxId', { required: true, ltr: true, placeholder: '123-456-789', hint: t('reg.hint.taxId') })}
          ${field(v, errors, 'commercialRegNo', { required: true, ltr: true, hint: t('reg.hint.commercialReg') })}
          ${field(v, errors, 'mainPhone', { required: true, ltr: true, placeholder: '02XXXXXXXX', hint: t('reg.hint.mainPhone') })}
          ${field(v, errors, 'companyEmail', { type: 'email' })}
        </div></div>
        <div class="form-section"><h3>${t('reg.sec.owner')}</h3><p class="small muted mb-8">${t('reg.ownerIntro')}</p><div class="form-grid">
          ${field(v, errors, 'ownerName', { required: true })}
          ${field(v, errors, 'ownerPhone', { required: true, ltr: true, placeholder: '01XXXXXXXXX', hint: t('reg.hint.ownerPhone') })}
          ${field(v, errors, 'ownerNationalId', { ltr: true, max: 14 })}
          ${field(v, errors, 'ownerEmail', { type: 'email' })}
        </div></div>
        <div class="form-section"><h3>${t('reg.sec.focal')}</h3><p class="small muted mb-8">${t('reg.focalIntro')}</p>
          <div class="focal-box"><input type="checkbox" id="rg_focalSame" name="focalSame" value="1" data-rv="bool" class="check-src" ${v.focalSame ? 'checked' : ''}><label for="rg_focalSame" class="small">${t('reg.focalSame')}</label>
          <div class="form-grid focal-fields mt-12">
            ${field(v, errors, 'focalName', { required: true })}
            ${field(v, errors, 'focalTitle', {})}
            ${field(v, errors, 'focalPhone', { required: true, ltr: true, placeholder: '01XXXXXXXXX' })}
            ${field(v, errors, 'focalEmail', { type: 'email' })}
          </div></div></div>
      </div>`;
    }
    return h`<div class="form-grid">
      ${field(v, errors, 'fullName', { required: true, full: true, hint: t('reg.hint.fullName') })}
      ${field(v, errors, 'nationalId', { required: true, ltr: true, max: 14, placeholder: t('forms.nidPlaceholder') })}
      ${field(v, errors, 'phone', { required: true, ltr: true, placeholder: '01XXXXXXXXX', hint: t('reg.hint.phone') })}
      ${field(v, errors, 'email', { type: 'email' })}
    </div>`;
  }

  /** Labels for the address and coverage sections: second person on self sign-up, neutral for admins. */
  function areaLabels(company, mode) {
    return {
      address: company ? t('reg.sec.hq') : mode === 'admin' ? t('reg.detail.address') : t('reg.sec.address'),
      coverage: mode === 'admin' ? t('reg.detail.coverage') : t('reg.sec.coverage')
    };
  }

  function stepArea(v, errors, mode) {
    var company = v.kind === 'company';
    var L = areaLabels(company, mode);
    return h`<div>
      <div class="form-section"><h3>${L.address}</h3><div class="form-grid">
        <div class="field"><label for="rg_addrGov">${t('address.governorate')}<span class="req">*</span></label>
          <select class="select ${errors.addrGov ? 'invalid' : ''}" id="rg_addrGov" name="addrGov" data-rv data-change="cityForGov" data-city-name="addrCity"><option value="">${t('common.select')}</option>${govList().map(function (g) {
            return h`<option value="${g.id}" ${g.id === v.addrGov ? 'selected' : ''}>${U.label(g)}</option>`;
          })}</select>${err(errors, 'addrGov')}</div>
        <div class="field"><label>${t('address.city')}<span class="req">*</span></label><span data-city-slot="addrCity">${ui.cityControl('addrCity', v.addrGov, v.addrCity, !!errors.addrCity)}</span>${err(errors, 'addrCity')}</div>
        ${field(v, errors, 'addrStreet', { required: true })}
        ${field(v, errors, 'addrLandmark', {})}
      </div></div>
      <div class="form-section"><h3>${L.coverage}</h3><p class="small muted mb-12">${company ? t('reg.coverageIntroCompany') : t('reg.coverageIntroIndividual')}</p>
        ${err(errors, 'coverage')}${ui.coverage.picker('reg', v.coverage || {})}</div>
    </div>`;
  }

  function summaryRow(label, value) { return h`<dt>${label}</dt><dd>${value == null || value === '' ? '-' : value}</dd>`; }

  function reviewBlock(v, mode) {
    var company = v.kind === 'company';
    var L = areaLabels(company, mode);
    var edit = function (step) { return h`<button type="button" class="btn btn-sm btn-ghost" data-action="regGo" data-step="${step}">${icon('edit')}${t('common.edit')}</button>`; };
    var ltr = function (x) { return x ? h`<bdi dir="ltr">${x}</bdi>` : ''; };
    return h`<div class="review-grid">
      <div class="review-box"><div class="row between"><h3>${t('reg.stepTitle.type')}</h3>${edit(0)}</div>
        <dl class="dl">${summaryRow(t('reg.f.kind'), t('reg.kind.' + v.kind))}${summaryRow(t('profile.services'), (v.services || []).map(function (s) { return t('service.' + s); }).join(t('common.listSep')))}</dl></div>
      <div class="review-box"><div class="row between"><h3>${t('reg.stepTitle.details')}</h3>${edit(1)}</div>
        <dl class="dl">${company ? h`
          ${summaryRow(t('reg.f.companyName'), v.companyName)}${summaryRow(t('reg.f.taxId'), ltr(v.taxId))}${summaryRow(t('reg.f.commercialRegNo'), ltr(v.commercialRegNo))}${summaryRow(t('reg.f.mainPhone'), ltr(v.mainPhone))}
          ${summaryRow(t('reg.sec.owner'), h`${v.ownerName} · ${ltr(v.ownerPhone)}`)}
          ${summaryRow(t('reg.sec.focal'), v.focalSame ? t('reg.focalIsOwner') : h`${v.focalName}${v.focalTitle ? ' (' + v.focalTitle + ')' : ''} · ${ltr(v.focalPhone)}`)}`
          : h`${summaryRow(t('reg.f.fullName'), v.fullName)}${summaryRow(t('reg.f.nationalId'), ltr(v.nationalId))}${summaryRow(t('reg.f.phone'), ltr(v.phone))}${summaryRow(t('reg.f.email'), v.email)}`}</dl></div>
      <div class="review-box full"><div class="row between"><h3>${t('reg.stepTitle.area')}</h3>${edit(2)}</div>
        <dl class="dl">${summaryRow(L.address, v.addrGov ? ui.address({ governorate: v.addrGov, city: v.addrCity, street: v.addrStreet, landmark: v.addrLandmark }) : '-')}
          ${summaryRow(L.coverage, ui.coverage.text(v.coverage))}</dl></div>
    </div>`;
  }

  function stepSubmit(v, errors, mode) {
    var docs = wf.registrationDocs(v.kind === 'company' ? 'company' : 'individual');
    return h`<div>
      <div class="form-section"><h3>${t('reg.sec.documents')}</h3><p class="small muted mb-12">${mode === 'admin' ? t('reg.docsIntroAdmin') : t('reg.docsIntro')}</p>
        <div class="stack tight">${docs.map(function (d) { return ui.docPicker(d, (v.docs || {})[d]); })}</div></div>
      <div class="form-section"><h3>${t('reg.sec.review')}</h3>${reviewBlock(v, mode)}</div>
      <div class="form-section">${mode === 'admin'
        ? h`<label class="check"><input type="checkbox" name="verifyNow" value="1" data-rv="bool" ${v.verifyNow ? 'checked' : ''}>${t('reg.verifyNow')}</label><div class="xs faint mt-8">${t('reg.verifyNowHint')}</div>`
        : h`<label class="check"><input type="checkbox" name="terms" value="1" data-rv="bool" ${v.terms ? 'checked' : ''}><span>${t('reg.termsPre')} <a href="terms.html" target="_blank" rel="noopener">${t('nav.terms')}</a> ${t('reg.termsAnd')} <a href="privacy.html" target="_blank" rel="noopener">${t('nav.privacy')}</a></span></label>${err(errors, 'terms')}`}</div>
    </div>`;
  }

  ui.regWizard = {
    STEPS: STEPS,
    initState: function () { return { step: 0, values: { kind: '', services: [], coverage: {}, docs: {} }, errors: {} }; },
    stepOf: function (fieldName) { return Math.max(0, STEPS.indexOf(FIELD_STEP[fieldName] || 'type')); },

    /** mode: 'self' | 'admin' */
    render: function (state, mode) {
      var v = state.values, errors = state.errors || {}, i = state.step;
      var body = [stepType, stepDetails, stepArea, stepSubmit][i](v, errors, mode);
      var last = i === STEPS.length - 1;
      var hasErrors = Object.keys(errors).length > 0;
      return h`<div class="wizard">
        <ol class="stepper">${STEPS.map(function (s, k) {
          return h`<li class="${k === i ? 'on' : k < i ? 'done' : ''}"><span class="n">${k < i ? icon('check') : U.num(k + 1)}</span><span class="lbl">${t('reg.stepTitle.' + s)}</span></li>`;
        })}</ol>
        <form id="reg-form" class="card" data-submit="regNext" novalidate>
          <div class="card-h"><div><h2>${t('reg.stepTitle.' + STEPS[i])}</h2><div class="xs faint">${t('reg.stepOf', { n: i + 1, total: STEPS.length })}</div></div></div>
          <div class="card-b">${hasErrors ? h`<div class="mb-12">${ui.notice(t('reg.fixErrors'), 'bad')}</div>` : ''}${body}</div>
          <div class="card-f">
            ${i > 0 ? h`<button type="button" class="btn" data-action="regBack">${icon('chevronLeft')}${t('common.back')}</button>` : ''}
            <button type="submit" class="btn btn-primary" ${state.busy ? 'disabled' : ''}>${last ? (mode === 'admin' ? t('reg.registerCta') : t('reg.submitCta')) : h`${t('common.next')}${icon('chevronRight')}`}</button>
          </div>
        </form>
      </div>`;
    },

    /** Read the visible step back into state.values. */
    collect: function (form, state) {
      var v = state.values;
      var lists = {};
      Array.prototype.forEach.call(form.querySelectorAll('[data-rv]'), function (el) {
        var name = el.name;
        if (!name) return;
        if (el.type === 'radio') { if (el.checked) v[name] = el.value; return; }
        if (el.type === 'checkbox' && el.getAttribute('data-rv') === 'bool') { v[name] = el.checked; return; }
        if (el.type === 'checkbox') { lists[name] = lists[name] || []; if (el.checked) lists[name].push(el.value); return; }
        if (name.indexOf('doc_') === 0) { v.docs = v.docs || {}; if (el.value) v.docs[name.slice(4)] = el.value; else delete v.docs[name.slice(4)]; return; }
        v[name] = typeof el.value === 'string' ? el.value.trim() : el.value;
      });
      Object.keys(lists).forEach(function (k) { v[k] = lists[k]; });
      var cov = ui.coverage.read(form, 'reg');
      if (cov) v.coverage = cov;
      return v;
    },

    validateStep: function (state, mode, now) {
      var step = STEPS[state.step];
      return wf.validateRegistration(state.values, { steps: [step], now: now, requireTerms: mode !== 'admin', governorates: govList().map(function (g) { return g.id; }) });
    },

    /** Put a service error on its field and move the wizard to that step. */
    applyError: function (state, e) {
      var p = (e && e.params) || {};
      if (!p.field) return false;
      state.errors = p.errors || {};
      state.errors[p.field] = state.errors[p.field] || e.key;
      state.step = ui.regWizard.stepOf(p.field);
      return true;
    }
  };
})();
