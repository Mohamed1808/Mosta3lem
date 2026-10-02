/* Config-driven form renderer. Renders the definitions in js/config/forms.js and
   js/config/reportForms.js, collects values back from the DOM, and re-renders itself when a
   field that controls visibility changes (select, checkbox, radio, or a field marked live). */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, wf = ICM.wf, icon = ICM.icon;
  var ui = (ICM.ui = ICM.ui || {});

  var registry = {};

  function fieldsOf(def) {
    return def.sections ? def.sections.reduce(function (a, s) { return a.concat(s.fields); }, []) : def.fields;
  }

  function optionsFor(f, formId) {
    if (f.list) return ui.listOptions(f.list);
    var base = f.labelBase || ('forms.' + formId + '.' + f.name + 'Opt');
    return (f.options || []).map(function (o) { return { value: o, label: t(base + '.' + o) }; });
  }

  function labelFor(f, formId) { return f.label ? t(f.label) : t('forms.' + formId + '.' + f.name); }

  function errorOf(errors, name) {
    var e = errors && errors[name];
    return e ? h`<div class="err">${t(e)}</div>` : '';
  }

  function input(type, name, value, attrs) {
    return h`<input class="input ${attrs.invalid ? 'invalid' : ''}" type="${type}" name="${name}" value="${value == null ? '' : value}" ${attrs.extra ? ICM.raw(attrs.extra) : ''}>`;
  }

  function computeCtx() { return { now: ICM.clock ? ICM.clock.now() : Date.now() }; }

  /** Sub fields of a repeat row get names like "references.0.name". */
  function subField(f, sf, i, formId) {
    return Object.assign({}, sf, { name: f.name + '.' + i + '.' + sf.name, label: sf.label || 'forms.' + formId + '.' + f.name + 'Fields.' + sf.name, showIf: null, requiredIf: null });
  }

  function renderField(f, values, errors, formId, opts) {
    if (!wf.isVisible(f, values)) return '';
    opts = opts || {};
    var v = values[f.name];
    var req = wf.isRequired(f, values);
    var lbl = labelFor(f, formId);
    var bad = !!(errors && errors[f.name]);
    var live = f.live ? ' data-live="1"' : '';
    var ocrTag = f.ocr ? h`<span class="ocr-tag" title="${t('ocr.tagHint')}">${icon('file')}${t('ocr.short.' + f.ocr)}</span>` : '';
    var head = h`<label>${lbl}${req ? h`<span class="req">*</span>` : ''}${ocrTag}</label>`;
    var control;
    switch (f.type) {
      case 'textarea':
        control = h`<textarea class="textarea ${bad ? 'invalid' : ''}" name="${f.name}" rows="3">${v || ''}</textarea>`;
        break;
      case 'number':
        control = input('number', f.name, v, { invalid: bad, extra: 'step="any" inputmode="numeric"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + live });
        break;
      case 'date': control = input('date', f.name, v, { invalid: bad }); break;
      case 'datetime': control = input('datetime-local', f.name, v, { invalid: bad }); break;
      case 'phone': control = input('tel', f.name, v, { invalid: bad, extra: 'inputmode="numeric" placeholder="01XXXXXXXXX" dir="ltr"' }); break;
      case 'anyPhone': control = input('tel', f.name, v, { invalid: bad, extra: 'inputmode="numeric" dir="ltr"' }); break;
      case 'nationalId': control = input('text', f.name, v, { invalid: bad, extra: 'inputmode="numeric" maxlength="14" placeholder="' + ICM.esc(t('forms.nidPlaceholder')) + '" dir="ltr"' + live }); break;
      case 'select':
      case 'governorate':
        var opts2 = f.type === 'governorate' ? ui.listOptions('governorates') : optionsFor(f, formId);
        control = h`<select class="select ${bad ? 'invalid' : ''}" name="${f.name}" data-live="1"><option value="">${t('common.select')}</option>${opts2.map(function (o) {
          return h`<option value="${o.value}" ${String(o.value) === String(v == null ? '' : v) ? 'selected' : ''}>${o.label}</option>`;
        })}</select>`;
        break;
      case 'checkboxes':
        var arr = U.asArray(v);
        control = h`<div class="checks">${optionsFor(f, formId).map(function (o) {
          return h`<label class="check"><input type="checkbox" name="${f.name}" value="${o.value}" data-live="1" ${arr.indexOf(o.value) >= 0 ? 'checked' : ''}>${o.label}</label>`;
        })}</div>`;
        break;
      case 'checkbox':
        control = h`<label class="check"><input type="checkbox" name="${f.name}" value="1" data-live="1" ${v ? 'checked' : ''}>${lbl}</label>`;
        head = '';
        break;
      case 'yesno':
        control = h`<div class="seg">${['yes', 'no'].map(function (o) {
          return h`<label><input type="radio" name="${f.name}" value="${o}" data-live="1" ${v === o ? 'checked' : ''}><span>${t('common.' + o)}</span></label>`;
        })}</div>`;
        break;
      case 'phones':
        var list = U.asArray(v);
        if (!list.length) list = [''];
        control = h`<div class="phones" data-phones="${f.name}">${list.map(function (p) {
          return input('tel', f.name, p, { invalid: bad, extra: 'inputmode="numeric" placeholder="01XXXXXXXXX" dir="ltr"' });
        })}<div><button type="button" class="btn btn-sm btn-ghost" data-action="formAddPhone" data-name="${f.name}">${icon('plus')}${t('forms.addMobile')}</button></div></div>`;
        break;
      case 'address':
        var a = v || {};
        var sub = function (k) { return errors && errors[f.name + '.' + k]; };
        return h`<div class="full address-box"><span class="lbl strong small">${lbl}${req ? h`<span class="req">*</span>` : ''}</span>
          <div class="form-grid cols-4">
            <div class="field"><label>${t('address.governorate')}</label><select class="select ${sub('governorate') ? 'invalid' : ''}" name="${f.name}.governorate"><option value="">${t('common.select')}</option>${ui.listOptions('governorates').map(function (o) {
              return h`<option value="${o.value}" ${o.value === a.governorate ? 'selected' : ''}>${o.label}</option>`;
            })}</select>${errorOf(errors, f.name + '.governorate')}</div>
            <div class="field"><label>${t('address.city')}</label>${input('text', f.name + '.city', a.city, { invalid: !!sub('city') })}${errorOf(errors, f.name + '.city')}</div>
            <div class="field"><label>${t('address.street')}</label>${input('text', f.name + '.street', a.street, { invalid: !!sub('street') })}${errorOf(errors, f.name + '.street')}</div>
            <div class="field"><label>${t('address.landmark')}</label>${input('text', f.name + '.landmark', a.landmark, {})}</div>
          </div></div>`;
      case 'photo':
        control = h`<div class="row wrap"><input type="file" accept="image/*" capture="environment" data-change="formPhoto" data-target="${f.name}" class="small">
          <input type="hidden" name="${f.name}" value="${v || ''}">${v ? h`<img src="${v}" alt="" style="height:48px;border-radius:3px">` : ''}</div>`;
        break;

      case 'ocrDoc':
        var fills = ((ICM.config.OCR_DOCS || {})[f.doc] || { fills: [] }).fills;
        control = h`<div class="ocr-box ${bad ? 'invalid' : ''}">
          ${v ? h`<img class="ocr-thumb" src="${v}" alt="${t('ocr.doc.' + f.doc)}">` : h`<span class="ocr-icon">${icon('camera')}</span>`}
          <div class="grow"><div class="strong small">${t('ocr.doc.' + f.doc)}</div>
            <div class="xs ${v ? '' : 'faint'}">${v ? t('ocr.scanned') : t('ocr.hint', { n: fills.length })}</div></div>
          <label class="btn btn-sm ${v ? '' : 'btn-primary'}">${icon('camera')}${v ? t('ocr.rescan') : t('ocr.scan')}<input type="file" accept="image/*" capture="environment" class="sr-only" data-change="ocrScan" data-doc="${f.doc}" data-field="${f.name}"></label>
          <input type="hidden" name="${f.name}" value="${v || ''}">
        </div>`;
        head = h`<label>${lbl}${req ? h`<span class="req">*</span>` : ''}</label>`;
        break;

      case 'computed':
        var cv = f.compute(values, computeCtx());
        control = h`<input class="input computed" name="${f.name}" value="${cv == null ? '' : cv}" readonly tabindex="-1">`;
        head = h`<label>${lbl}<span class="calc-tag">${t('forms.calculated')}</span></label>`;
        break;

      case 'signature':
        control = h`<div class="sig-box ${bad ? 'invalid' : ''} ${v ? 'has-sig' : ''}">
          <canvas class="sig-pad" width="600" height="180" data-sig="${f.name}" aria-label="${lbl}"></canvas>
          ${v ? h`<img class="sig-img" src="${v}" alt="">` : ''}
          <input type="hidden" name="${f.name}" value="${v || ''}">
          <div class="sig-foot"><span class="xs faint">${t('forms.signHint')}</span><button type="button" class="btn btn-sm btn-ghost" data-action="sigClear">${t('forms.signClear')}</button></div>
        </div>`;
        break;

      case 'license':
        var lic = v || {};
        control = h`<div class="license-box">
          <div class="seg">${['yes', 'no'].map(function (o) {
            return h`<label><input type="radio" name="${f.name}.has" value="${o}" data-live="1" ${lic.has === o ? 'checked' : ''}><span>${t('common.' + o)}</span></label>`;
          })}</div>
          ${lic.has === 'yes' ? h`<div class="form-grid mt-8">
            <div class="field"><label>${t('forms.licenseNumber')}<span class="req">*</span></label>${input('text', f.name + '.number', lic.number, { invalid: bad && !lic.number, extra: 'dir="ltr"' })}</div>
            <div class="field"><label>${t('forms.licensePhoto')}</label><div class="row wrap"><input type="file" accept="image/*" capture="environment" data-change="formPhoto" data-target="${f.name}.photo" class="small">
              <input type="hidden" name="${f.name}.photo" value="${lic.photo || ''}">${lic.photo ? h`<img src="${lic.photo}" alt="" style="height:40px;border-radius:3px">` : ''}</div></div>
          </div>` : ''}
        </div>`;
        break;

      case 'repeat':
        var rows = Array.isArray(v) ? v : [];
        control = h`<div class="repeat" data-repeat="${f.name}">
          ${rows.map(function (row, i) {
            var subValues = {};
            f.fields.forEach(function (sf) { subValues[f.name + '.' + i + '.' + sf.name] = (row || {})[sf.name]; });
            return h`<div class="repeat-row" data-row="${i}"><div class="row between mb-8"><span class="strong small">${t('forms.' + formId + '.' + f.name + 'Row', { n: i + 1 })}</span>
              <button type="button" class="btn btn-sm btn-ghost" data-action="formRemoveRow" data-name="${f.name}" data-index="${i}">${icon('trash')}${t('common.delete')}</button></div>
              <div class="form-grid">${f.fields.map(function (sf) { return renderField(subField(f, sf, i, formId), subValues, errors, formId); })}</div></div>`;
          })}
          ${!f.max || rows.length < f.max ? h`<button type="button" class="btn btn-sm" data-action="formAddRow" data-name="${f.name}">${icon('plus')}${t('forms.' + formId + '.' + f.name + 'Add')}</button>` : ''}
        </div>`;
        head = ''; // the section title already names the list
        break;

      default:
        control = input('text', f.name, v, { invalid: bad, extra: live });
    }
    var hint = f.hint ? h`<div class="hint">${t(f.hint, values)}</div>` : '';
    var flash = opts.flash && opts.flash.indexOf(f.name) >= 0 ? 'ocr-filled' : '';
    return h`<div class="field ${f.full ? 'full' : ''} ${flash}">${head}${control}${hint}${errorOf(errors, f.name)}</div>`;
  }

  function renderInner(def, values, errors, opts) {
    var formId = def.id;
    if (def.sections) {
      return def.sections.map(function (s) {
        var fields = s.fields.map(function (f) { return renderField(f, values, errors, formId, opts); });
        if (!fields.some(function (x) { return String(x); })) return '';
        return h`<div class="form-section"><h3>${t('forms.' + formId + '.sections.' + s.id)}</h3><div class="form-grid ${opts.cols ? 'cols-' + opts.cols : ''}">${fields}</div></div>`;
      });
    }
    return h`<div class="form-grid ${opts.cols ? 'cols-' + opts.cols : ''}">${def.fields.map(function (f) { return renderField(f, values, errors, formId, opts); })}</div>`;
  }

  /** Read one field's value back from the DOM (undefined when it is not on screen). */
  function readField(container, f) {
    var name = f.name;
    var esc = name.replace(/"/g, '\\"');
    var q = function (sel) { return container.querySelector(sel); };
    var qa = function (sel) { return Array.prototype.slice.call(container.querySelectorAll(sel)); };
    switch (f.type) {
      case 'checkboxes': return q('[name="' + esc + '"]') ? qa('input[name="' + esc + '"]:checked').map(function (i) { return i.value; }) : undefined;
      case 'checkbox': var cb = q('input[name="' + esc + '"]'); return cb ? cb.checked : undefined;
      case 'yesno': var r = q('input[name="' + esc + '"]:checked'); return qa('input[name="' + esc + '"]').length ? (r ? r.value : '') : undefined;
      case 'phones': var ph = qa('input[name="' + esc + '"]'); return ph.length ? ph.map(function (i) { return i.value.trim(); }).filter(Boolean) : undefined;
      case 'address':
        var g = q('[name="' + esc + '.governorate"]');
        return g ? { governorate: g.value, city: q('[name="' + esc + '.city"]').value.trim(), street: q('[name="' + esc + '.street"]').value.trim(), landmark: q('[name="' + esc + '.landmark"]').value.trim() } : undefined;
      case 'license':
        if (!qa('input[name="' + esc + '.has"]').length) return undefined;
        var has = q('input[name="' + esc + '.has"]:checked');
        var num = q('[name="' + esc + '.number"]'), photo = q('[name="' + esc + '.photo"]');
        return { has: has ? has.value : '', number: num ? num.value.trim() : '', photo: photo ? photo.value : '' };
      case 'repeat':
        var box = q('[data-repeat="' + esc + '"]');
        if (!box) return undefined;
        return Array.prototype.map.call(box.querySelectorAll(':scope > .repeat-row'), function (rowEl) {
          var i = rowEl.getAttribute('data-row'), row = {};
          f.fields.forEach(function (sf) { var x = readField(rowEl, Object.assign({}, sf, { name: f.name + '.' + i + '.' + sf.name })); if (x !== undefined) row[sf.name] = x; });
          return row;
        });
      default:
        var el = q('[name="' + esc + '"]');
        if (!el) return undefined;
        return typeof el.value === 'string' && f.type !== 'textarea' ? el.value.trim() : el.value;
    }
  }

  function draw(container, key, values, errors) {
    var reg = registry[key];
    var active = document.activeElement;
    var activeName = active && container.contains(active) ? active.name : null;
    container.innerHTML = String(h`${renderInner(reg.def, values, errors || {}, reg.opts)}`);
    if (activeName) { var el = container.querySelector('[name="' + activeName + '"]'); if (el) try { el.focus(); } catch (e) { /* ignore */ } }
    if (reg.opts.onChange) reg.opts.onChange(values, container);
  }

  ui.forms = {
    /** Render a form body inside a container that can refresh itself. */
    render: function (key, def, values, errors, opts) {
      opts = opts || {};
      registry[key] = { def: def, opts: opts };
      return h`<div data-form-key="${key}">${renderInner(def, values || {}, errors || {}, opts)}</div>`;
    },
    /** Read the current values of a rendered form back from the DOM. */
    collect: function (container, def) {
      var out = {};
      fieldsOf(def).forEach(function (f) { var x = readField(container, f); if (x !== undefined) out[f.name] = x; });
      return out;
    },
    /** Re-render a registered form in place, keeping what the user typed. */
    refresh: function (container, errors) {
      var key = container.getAttribute('data-form-key');
      if (!registry[key]) return;
      draw(container, key, ui.forms.collect(container, registry[key].def), errors);
    },
    /** Re-render with changed values (rows added, OCR results). flash: field names to highlight. */
    refreshWith: function (container, change, flash) {
      var key = container.getAttribute('data-form-key');
      var reg = registry[key];
      if (!reg) return;
      var values = Object.assign(ui.forms.collect(container, reg.def), change || {});
      reg.opts.flash = flash || null;
      draw(container, key, values, null);
    },
    defOf: function (container) { var reg = registry[container.getAttribute('data-form-key')]; return reg ? reg.def : null; },
    validate: function (def, values, ctx) { return wf.validateForm(def, values, ctx); },
    fieldsOf: fieldsOf
  };

  // ---------------------------------------------------------------- signature pad
  // Pointer events on any canvas[data-sig]; the drawing is saved to the hidden input as PNG.
  if (typeof document !== 'undefined' && document.addEventListener) {
    var pad = null;
    var point = function (cv, e) {
      var r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) };
    };
    document.addEventListener('pointerdown', function (e) {
      var cv = e.target.closest && e.target.closest('canvas[data-sig]');
      if (!cv) return;
      e.preventDefault();
      var box = cv.closest('.sig-box');
      if (box.classList.contains('has-sig')) {
        box.classList.remove('has-sig');
        var img = box.querySelector('.sig-img');
        if (img) img.remove();
        cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
      }
      var g = cv.getContext('2d');
      g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#18202b';
      var p = point(cv, e);
      g.beginPath(); g.moveTo(p.x, p.y);
      pad = { cv: cv, g: g };
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    });
    document.addEventListener('pointermove', function (e) {
      if (!pad) return;
      var p = point(pad.cv, e);
      pad.g.lineTo(p.x, p.y); pad.g.stroke();
    });
    var end = function () {
      if (!pad) return;
      var box = pad.cv.closest('.sig-box');
      box.querySelector('input[type=hidden]').value = pad.cv.toDataURL('image/png');
      box.classList.add('signed');
      pad = null;
    };
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  }
})();
