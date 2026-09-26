/* Config-driven form renderer. Renders the definitions in js/config/forms.js, collects
   values back from the DOM, and re-renders itself when a field that controls visibility
   changes (select, checkbox, radio). */
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

  function renderField(f, values, errors, formId, key) {
    if (!wf.isVisible(f, values)) return '';
    var v = values[f.name];
    var req = wf.isRequired(f, values);
    var lbl = labelFor(f, formId);
    var bad = !!(errors && errors[f.name]);
    var head = h`<label>${lbl}${req ? h`<span class="req">*</span>` : ''}</label>`;
    var control;
    switch (f.type) {
      case 'textarea':
        control = h`<textarea class="textarea ${bad ? 'invalid' : ''}" name="${f.name}" rows="3">${v || ''}</textarea>`;
        break;
      case 'number':
        control = input('number', f.name, v, { invalid: bad, extra: 'step="any"' + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') });
        break;
      case 'date': control = input('date', f.name, v, { invalid: bad }); break;
      case 'datetime': control = input('datetime-local', f.name, v, { invalid: bad }); break;
      case 'phone': control = input('tel', f.name, v, { invalid: bad, extra: 'inputmode="numeric" placeholder="01XXXXXXXXX" dir="ltr"' }); break;
      case 'nationalId': control = input('text', f.name, v, { invalid: bad, extra: 'inputmode="numeric" maxlength="14" placeholder="' + ICM.esc(t('forms.nidPlaceholder')) + '" dir="ltr"' }); break;
      case 'select':
      case 'governorate':
        var opts = f.type === 'governorate' ? ui.listOptions('governorates') : optionsFor(f, formId);
        control = h`<select class="select ${bad ? 'invalid' : ''}" name="${f.name}" data-live="1"><option value="">${t('common.select')}</option>${opts.map(function (o) {
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
      default:
        control = input('text', f.name, v, { invalid: bad });
    }
    var hint = f.hint ? h`<div class="hint">${t(f.hint, values)}</div>` : '';
    return h`<div class="field ${f.full ? 'full' : ''}">${head}${control}${hint}${errorOf(errors, f.name)}</div>`;
  }

  function renderInner(def, values, errors, opts) {
    var formId = def.id;
    if (def.sections) {
      return def.sections.map(function (s) {
        var fields = s.fields.map(function (f) { return renderField(f, values, errors, formId); });
        if (!fields.some(function (x) { return String(x); })) return '';
        return h`<div class="form-section"><h3>${t('forms.' + formId + '.sections.' + s.id)}</h3><div class="form-grid ${opts.cols ? 'cols-' + opts.cols : ''}">${fields}</div></div>`;
      });
    }
    return h`<div class="form-grid ${opts.cols ? 'cols-' + opts.cols : ''}">${def.fields.map(function (f) { return renderField(f, values, errors, formId); })}</div>`;
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
      fieldsOf(def).forEach(function (f) {
        var name = f.name;
        var q = function (sel) { return container.querySelector(sel); };
        var qa = function (sel) { return Array.prototype.slice.call(container.querySelectorAll(sel)); };
        var esc = name.replace(/"/g, '\\"');
        switch (f.type) {
          case 'checkboxes': if (q('[name="' + esc + '"]')) out[name] = qa('input[name="' + esc + '"]:checked').map(function (i) { return i.value; }); break;
          case 'checkbox': var cb = q('input[name="' + esc + '"]'); if (cb) out[name] = cb.checked; break;
          case 'yesno': var r = q('input[name="' + esc + '"]:checked'); if (qa('input[name="' + esc + '"]').length) out[name] = r ? r.value : ''; break;
          case 'phones': var ph = qa('input[name="' + esc + '"]'); if (ph.length) out[name] = ph.map(function (i) { return i.value.trim(); }).filter(Boolean); break;
          case 'address':
            var g = q('[name="' + esc + '.governorate"]');
            if (g) out[name] = { governorate: g.value, city: q('[name="' + esc + '.city"]').value.trim(), street: q('[name="' + esc + '.street"]').value.trim(), landmark: q('[name="' + esc + '.landmark"]').value.trim() };
            break;
          default:
            var el = q('[name="' + esc + '"]');
            if (el) out[name] = typeof el.value === 'string' && f.type !== 'textarea' ? el.value.trim() : el.value;
        }
      });
      return out;
    },
    /** Re-render a registered form in place, keeping what the user typed. */
    refresh: function (container, errors) {
      var key = container.getAttribute('data-form-key');
      var reg = registry[key];
      if (!reg) return;
      var values = ui.forms.collect(container, reg.def);
      var active = document.activeElement;
      var activeName = active && container.contains(active) ? active.name : null;
      container.innerHTML = String(renderInner(reg.def, values, errors || {}, reg.opts));
      if (activeName) { var el = container.querySelector('[name="' + activeName + '"]'); if (el) try { el.focus(); } catch (e) { /* ignore */ } }
      if (reg.opts.onChange) reg.opts.onChange(values, container);
    },
    validate: function (def, values, ctx) { return wf.validateForm(def, values, ctx); },
    fieldsOf: fieldsOf
  };
})();
