/* Workflow dialogs shared by the provider portals, the field agent app and the admin QA
   queue: collection logging, settlement, closing, report review, agent assignment and
   rating a client. Each resolves true when something was saved. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, C = ICM.config, S = ICM.services, wf = ICM.wf;
  var ui = ICM.ui;
  var W = (ui.flows = {});

  var ALLOWED_BY = { call: 'calls', sms: 'messages', whatsapp: 'messages', field_visit: 'visits' };

  /** Generic modal around a config form. submit(values) must return a Promise. */
  function formModal(opts) {
    return new Promise(function (resolve) {
      var saved = false;
      var key = 'm_' + Math.random().toString(36).slice(2, 7);
      var render = function (values, errors) {
        return h`<form id="${key}" data-submit="modal" class="stack" novalidate>${opts.intro || ''}${ui.forms.render(key, opts.def, values, errors, { cols: opts.cols })}<div class="err small" data-err style="color:var(--bad)"></div></form>`;
      };
      var ctrl = ui.modal.open({
        title: opts.title, size: opts.size,
        body: render(opts.values || {}, {}),
        footer: h`<button type="button" class="btn" data-action="modalClose">${t('common.cancel')}</button><button type="submit" form="${key}" class="btn ${opts.danger ? 'btn-danger solid' : 'btn-primary'}">${opts.submitLabel || t('common.save')}</button>`,
        onSubmit: async function (raw, form) {
          var values = ui.forms.collect(form.querySelector('[data-form-key]'), opts.def);
          var errors = wf.validateForm(opts.def, values, opts.ctx || {});
          if (opts.validate) Object.assign(errors, opts.validate(values) || {});
          if (Object.keys(errors).length) { ctrl.update({ body: render(values, errors) }); return; }
          try { await opts.submit(values); saved = true; ctrl.close(); if (opts.success) ui.toast(opts.success, 'success'); }
          catch (e) {
            var box = ctrl.el && ctrl.el.querySelector('[data-err]');
            if (box) box.textContent = ui.errorText(e); else ui.fail(e);
          }
        },
        onClose: function () { resolve(saved); }
      });
    });
  }
  W.formModal = formModal;

  W.logAction = function (c) {
    var allowed = c.allowedActions || {};
    var def = U.clone(C.COLLECTION_FORMS.action);
    def.fields = C.COLLECTION_FORMS.action.fields.map(function (f) { return Object.assign({}, f); });
    return formModal({
      title: t('collection.logAction'), def: C.COLLECTION_FORMS.action,
      intro: h`<p class="small muted">${t('collection.allowedIntro', { list: ['calls', 'messages', 'visits'].filter(function (k) { return allowed[k]; }).map(function (k) { return t('forms.collectionRequest.allowed.' + k); }).join(', ') || '-' })}</p>`,
      validate: function (v) {
        var perm = ALLOWED_BY[v.type];
        return perm && !allowed[perm] ? { type: 'wf.err.actionNotAllowed' } : {};
      },
      submit: async function (v) {
        var payload = { type: v.type, note: v.note };
        if (v.type === 'field_visit') {
          payload.checkIn = await S.cases.simulateFieldVisit(c.id);
          ui.toast(t('evidence.checkedInAt', { time: U.fmtTime(payload.checkIn.at), distance: U.num(payload.checkIn.distanceM) }), 'success');
        }
        return S.cases.logAction(c.id, payload);
      },
      success: t('collection.actionLogged')
    });
  };

  W.addPromise = function (c) {
    return formModal({
      title: t('collection.recordPromise'), def: C.COLLECTION_FORMS.promise,
      values: { amount: c.outstanding ? Math.round(c.outstanding * 0.3) : '' },
      intro: h`<p class="small muted">${t('collection.promiseIntro', { amount: U.money(c.outstanding) })}</p>`,
      submit: function (v) { return S.cases.addPromise(c.id, v); },
      success: t('collection.promiseRecorded')
    });
  };

  W.addPayment = function (c) {
    return formModal({
      title: t('collection.recordPayment'), def: C.COLLECTION_FORMS.payment,
      intro: h`<p class="small muted">${t('collection.paymentIntro', { amount: U.money(c.outstanding) })}</p>`,
      validate: function (v) { return +v.amount > c.outstanding ? { amount: 'wf.err.amountAboveOutstanding' } : {}; },
      submit: function (v) { return S.cases.addPayment(c.id, v); },
      success: t('collection.paymentRecorded')
    });
  };

  W.settlement = function (c) {
    var auth = c.settlementAuthority || { mode: 'none' };
    if (auth.mode === 'none') { ui.toast(t('wf.err.noSettlementAuthority'), 'danger'); return Promise.resolve(false); }
    return formModal({
      title: t('settlement.request'), def: C.COLLECTION_FORMS.settlement,
      values: { kind: auth.mode },
      intro: ui.notice(auth.mode === 'discount' ? t('settlement.authorityDiscount', { pct: auth.maxDiscountPct }) : t('settlement.authorityInstalments'), 'info'),
      validate: function (v) {
        if (v.kind !== auth.mode) return { kind: 'wf.err.settlementKindNotAllowed' };
        if (v.kind === 'discount' && +v.discountPct > auth.maxDiscountPct) return { discountPct: 'wf.err.discountAboveAuthority' };
        return {};
      },
      submit: function (v) { return S.cases.requestSettlement(c.id, v); },
      success: t('settlement.sent')
    });
  };

  W.closeCollection = function (c) {
    return formModal({
      title: t('collection.closeCase'), def: C.COLLECTION_FORMS.close, danger: true, submitLabel: t('collection.closeCase'),
      intro: h`<div class="stack tight">${ui.balanceView(c)}${ui.notice(t('collection.closeIntro'), 'warn')}</div>`,
      submit: function (v) { return S.cases.closeCollection(c.id, v); },
      success: t('collection.closed')
    });
  };

  /**
   * Pick an agent for one or more cases. where: the cases' places ([{ gov, city }]) or a
   * governorate id. Agents who cover every place, down to the city, come first.
   */
  W.assign = async function (caseIds, service, where, currentAgentId) {
    var team = await S.providers.team(service);
    var places = Array.isArray(where) ? where : where ? [{ gov: where, city: null }] : [];
    var covers = function (a) { return places.length > 0 && places.every(function (pl) { return ICM.wf.coversPlace(ICM.wf.coverageOf(a), pl.gov, pl.city); }); };
    var agents = team.filter(function (a) { return a.active; }).sort(function (a, b) {
      return (covers(a) ? 0 : 1) - (covers(b) ? 0 : 1) || a.stats.open - b.stats.open;
    });
    return new Promise(function (resolve) {
      var saved = false;
      var ctrl = ui.modal.open({
        title: caseIds.length > 1 ? t('assign.routeTitle', { n: caseIds.length }) : t('assign.title'), size: 'lg',
        body: h`<form id="assign-form" data-submit="modal" class="stack">
          <p class="small muted">${t('assign.intro')}</p>
          ${ui.table([
            { label: '', render: function (a) { return h`<input type="radio" name="agentId" value="${a.id}" ${a.id === currentAgentId ? 'checked' : ''} aria-label="${a.name}">`; } },
            { label: t('common.name'), render: function (a) { return h`<strong>${a.name}</strong>${covers(a) ? h` ${ui.badge(t('assign.coversArea'), 'success')}` : ''}`; } },
            { label: t('assign.areas'), render: function (a) { return h`<span class="small">${ui.coverage.text(ICM.wf.coverageOf(a), 3)}</span>`; } },
            { label: t('assign.load'), num: true, render: function (a) { return U.num(a.stats.open); } },
            { label: t('metric.onTime'), num: true, render: function (a) { return ui.pct(a.stats.onTimeRate); } }
          ], agents, { empty: t('assign.noAgents') })}
          <div class="err small" data-err style="color:var(--bad)"></div></form>`,
        footer: h`<button type="button" class="btn" data-action="modalClose">${t('common.cancel')}</button><button type="submit" form="assign-form" class="btn btn-primary">${t('assign.confirm')}</button>`,
        onSubmit: async function (v, form) {
          if (!v.agentId) { form.querySelector('[data-err]').textContent = t('assign.pickAgent'); return; }
          try { await S.cases.assign(caseIds, v.agentId); saved = true; ctrl.close(); ui.toast(t('assign.done', { n: caseIds.length }), 'success'); }
          catch (e) { form.querySelector('[data-err]').textContent = ui.errorText(e); }
        },
        onClose: function () { resolve(saved); }
      });
    });
  };

  /** Review a submitted report: evidence, answers, approve or return. */
  W.review = async function (caseId) {
    var d = await S.cases.get(caseId);
    var c = d.case;
    var canApprove = d.actions.indexOf('approve') >= 0, canReturn = d.actions.indexOf('return_to_agent') >= 0;
    var photosOk = (c.photos || []).length >= (c.minPhotos || 0);
    return new Promise(function (resolve) {
      var saved = false;
      var ctrl = ui.modal.open({
        title: t('review.title', { ref: c.ref }), size: 'xl',
        body: h`<div class="grid cols-2">
          <div class="stack">
            <dl class="dl"><dt>${t('case.agent')}</dt><dd>${d.agent ? d.agent.name : '-'}</dd><dt>${t('review.submitted')}</dt><dd>${U.fmtDateTime(c.reportSubmittedAt)}</dd><dt>${t('case.inquiryTypes')}</dt><dd>${ui.types(c.inquiryTypes)}</dd><dt>${t('case.customer')}</dt><dd>${c.customer.name || ''}</dd><dt>${t('case.addresses')}</dt><dd>${Object.keys(c.addresses || {}).map(function (k) { return h`<div>${ui.addr(c.addresses[k])}</div>`; })}</dd><dt>${t('case.instructions')}</dt><dd>${c.instructions || '-'}</dd></dl>
            <div><div class="small muted mb-8">${t('evidence.checkIn')}</div>${ui.checkInView(c.checkIn)}</div>
            <div><div class="small muted mb-8">${t('evidence.photos', { n: (c.photos || []).length, min: c.minPhotos })} ${photosOk ? ui.badge(t('review.photosOk'), 'success') : ui.badge(t('review.photosShort'), 'danger')}</div><div class="photos">${(c.photos || []).map(function (p) { return ui.photo(p); })}</div></div>
          </div>
          <div class="stack">${ui.reportView(c)}
            ${c.returnCount ? ui.notice(t('review.previouslyReturned', { n: c.returnCount }), 'info') : ''}
            ${c.reworkCount ? ui.notice(h`${t('review.reworkReason')} ${c.reworkReason || ''}`, 'warn') : ''}
            <form id="review-form" data-submit="modal" class="stack"><div class="field"><label>${t('review.comment')}</label><textarea class="textarea" name="comment" rows="3" placeholder="${t('review.commentHint')}"></textarea></div><div class="err small" data-err style="color:var(--bad)"></div></form>
          </div></div>`,
        footer: h`<button type="button" class="btn" data-action="modalClose">${t('common.close')}</button>
          ${canReturn ? h`<button type="button" class="btn btn-danger" data-action="doReturn">${icon('undo')}${t('action.return_to_agent')}</button>` : ''}
          ${canApprove ? h`<button type="button" class="btn btn-primary" data-action="doApprove">${icon('check')}${t('review.approveDeliver')}</button>` : ''}`,
        actions: {
          doReturn: async function (el, ev, m) {
            var comment = m.el.querySelector('[name=comment]').value.trim();
            if (!comment) { m.el.querySelector('[data-err]').textContent = t('wf.err.commentRequired'); return; }
            try { await S.cases.transition(caseId, 'return_to_agent', { comment: comment }); saved = true; m.close(); ui.toast(t('review.returned'), 'success'); } catch (e) { ui.fail(e); }
          },
          doApprove: async function (el, ev, m) {
            var ok = await ui.confirm({ title: t('review.approveDeliver'), message: t('review.approveBody'), confirmLabel: t('review.approveDeliver') });
            if (!ok) return;
            try { await S.cases.transition(caseId, 'approve'); saved = true; m.close(); ui.toast(t('review.delivered'), 'success'); } catch (e) { ui.fail(e); }
          }
        },
        onClose: function () { resolve(saved); }
      });
    });
  };

  W.rateClient = function (item) {
    return new Promise(function (resolve) {
      var saved = false;
      var ctrl = ui.modal.open({
        title: t('clientRating.rateTitle', { name: item.entityName }),
        body: h`<form id="client-rate" data-submit="modal" class="stack">
          <p class="small muted">${t('clientRating.intro', { ref: item.ref })}</p>
          <div class="field"><label>${t('clientRating.dataQuality')}<span class="req">*</span></label>${ui.starInput('dataQuality', 0)}<div class="hint">${t('clientRating.dataQualityHint')}</div></div>
          <div class="field"><label>${t('clientRating.paymentTimeliness')}<span class="req">*</span></label>${ui.starInput('paymentTimeliness', 0)}</div>
          <div class="field"><label>${t('common.comment')}</label><textarea class="textarea" name="comment" rows="2"></textarea></div>
          <div class="err small" data-err style="color:var(--bad)"></div></form>`,
        footer: h`<button type="button" class="btn" data-action="modalClose">${t('common.cancel')}</button><button type="submit" form="client-rate" class="btn btn-primary">${t('rating.submit')}</button>`,
        onSubmit: async function (v, form) {
          if (!(+v.dataQuality && +v.paymentTimeliness)) { form.querySelector('[data-err]').textContent = t('errors.ratingIncomplete'); return; }
          try {
            await S.ratings.rateClient({ caseId: item.kind === 'case' ? item.id : null, batchId: item.kind === 'batch' ? item.id : null, dataQuality: v.dataQuality, paymentTimeliness: v.paymentTimeliness, comment: v.comment });
            saved = true; ctrl.close(); ui.toast(t('rating.saved'), 'success');
          } catch (e) { form.querySelector('[data-err]').textContent = ui.errorText(e); }
        },
        onClose: function () { resolve(saved); }
      });
    });
  };
})();
