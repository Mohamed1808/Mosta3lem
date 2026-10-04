/* Modals, drawers, confirmation dialogs and toasts. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, icon = ICM.icon;
  var ui = (ICM.ui = ICM.ui || {});

  var stack = [];

  function root() { return document.getElementById('modal-root'); }

  function renderStack() {
    root().innerHTML = stack.map(function (m) { return m.html; }).join('');
    stack.forEach(function (m, i) {
      m.el = root().children[i];
      if (m.onMount) m.onMount(m.el, m);
    });
  }

  ui.modal = {
    /** opts: { title, body, footer, size: 'lg'|'xl', drawer, actions, onSubmit(values, form, ctrl), onClose, onMount } */
    open: function (opts) {
      var ctrl = {
        opts: opts,
        actions: opts.actions || {},
        onSubmit: opts.onSubmit,
        onMount: opts.onMount,
        close: function () {
          var i = stack.indexOf(ctrl);
          if (i >= 0) stack.splice(i, 1);
          renderStack();
          if (opts.onClose) opts.onClose();
          if (!stack.length && ctrl.returnFocus && ctrl.returnFocus.focus) try { ctrl.returnFocus.focus(); } catch (e) { /* gone */ }
        },
        update: function (patch) {
          Object.assign(opts, patch);
          ctrl.html = build(opts);
          renderStack();
        }
      };
      ctrl.returnFocus = document.activeElement;
      ctrl.html = build(opts);
      stack.push(ctrl);
      renderStack();
      var first = ctrl.el && ctrl.el.querySelector('[autofocus], input:not([type=hidden]), select, textarea, .modal-f .btn-primary');
      if (first) try { first.focus(); } catch (e) { /* ignore */ }
      return ctrl;
    },
    top: function () { return stack[stack.length - 1] || null; },
    closeTop: function () { var m = stack[stack.length - 1]; if (m) m.close(); },
    closeAll: function () { stack.slice().forEach(function (m) { m.close(); }); }
  };

  function build(o) {
    return String(h`<div class="overlay ${o.drawer ? 'drawer' : ''}" data-overlay="1">
      <div class="modal ${o.size || ''}" role="dialog" aria-modal="true" aria-label="${o.title || ''}">
        <div class="modal-h"><h2>${o.title || ''}</h2><button type="button" class="btn-icon" data-action="modalClose" aria-label="${t('common.close')}">${icon('x')}</button></div>
        <div class="modal-b">${o.body || ''}</div>
        ${o.footer ? h`<div class="modal-f">${o.footer}</div>` : ''}
      </div></div>`);
  }

  /**
   * Confirmation for every irreversible action.
   * opts: { title, message, confirmLabel, danger, reason: false|'optional'|'required', reasonLabel,
   *         reasonOptions: [{value,label}], extra: SafeHtml, validate(values) -> error text }
   * Resolves to the form values ({ reason, reasonCode, ... }) or null when cancelled.
   */
  ui.confirm = function (opts) {
    return new Promise(function (resolve) {
      var done = false;
      var body = h`<form id="confirm-form" data-submit="modal" class="stack">
        ${opts.message ? h`<p>${opts.message}</p>` : ''}
        ${opts.reasonOptions ? h`<div class="field"><label>${opts.reasonCodeLabel || t('common.reason')}<span class="req">*</span></label>${ui.select('reasonCode', [{ value: '', label: t('common.select') }].concat(opts.reasonOptions), '')}</div>` : ''}
        ${opts.reason ? h`<div class="field"><label>${opts.reasonLabel || t('common.reason')}${opts.reason === 'required' ? h`<span class="req">*</span>` : h` <span class="faint">(${t('common.optional')})</span>`}</label><textarea class="textarea" name="reason" rows="3"></textarea></div>` : ''}
        ${opts.extra || ''}
        <div class="err small" data-confirm-error style="color:var(--bad)"></div>
      </form>`;
      var ctrl = ui.modal.open({
        title: opts.title,
        body: body,
        footer: h`<button type="button" class="btn" data-action="modalClose">${t('common.cancel')}</button><button type="submit" form="confirm-form" class="btn ${opts.danger ? 'btn-danger solid' : 'btn-primary'}">${opts.confirmLabel || t('common.confirm')}</button>`,
        onSubmit: function (values, form) {
          var err = null;
          if (opts.reasonOptions && !values.reasonCode) err = t('errors.reasonRequired');
          if (opts.reason === 'required' && !String(values.reason || '').trim()) err = t('errors.reasonRequired');
          if (!err && opts.validate) err = opts.validate(values);
          if (err) { form.querySelector('[data-confirm-error]').textContent = err; return; }
          done = true;
          ctrl.close();
          resolve(values);
        },
        onClose: function () { if (!done) resolve(null); }
      });
    });
  };

  // ---------------------------------------------------------------- toasts
  ui.toast = function (msg, tone) {
    var r = document.getElementById('toast-root');
    if (!r) return;
    if (!r.classList.contains('toasts')) r.classList.add('toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (tone || '');
    el.setAttribute('role', 'status');
    el.innerHTML = String(h`${icon(tone === 'danger' ? 'alert' : 'check')}<div>${msg}</div>`);
    r.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, tone === 'danger' ? 5200 : 3400);
  };
  ui.fail = function (e) {
    if (window.console) console.warn(e);
    ui.toast(ui.errorText(e), 'danger');
  };
})();
