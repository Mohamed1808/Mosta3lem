/* Dialogs used by more than one portal: rating form, provider profile drawer, disputes. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, C = ICM.config, S = ICM.services;
  var ui = ICM.ui;
  var dialogs = (ui.dialogs = {});

  function ratingBlock(prefix, service) {
    var tags = (ui.cfg && ui.cfg.lists.ratingTags) || [];
    return h`<div class="stack">
      <div class="field"><label>${t('rating.overall')}<span class="req">*</span></label>${ui.starInput(prefix + 'overall', 0)}</div>
      <div class="form-grid">${C.RATING_CRITERIA[service].map(function (k) {
        return h`<div class="field"><label>${t('criteria.' + k)}<span class="req">*</span></label>${ui.starInput(prefix + 'crit_' + k, 0, 'sm')}</div>`;
      })}</div>
      <div class="field"><label>${t('rating.tags')}</label><div class="tag-list">${tags.map(function (tg) {
        return h`<label class="chip ${tg.sentiment}"><input type="checkbox" name="${prefix}tags" value="${tg.id}">${U.label(tg)}</label>`;
      })}</div></div>
      <div class="field"><label>${t('rating.feedback')}</label><textarea class="textarea" name="${prefix}feedback" rows="3" placeholder="${t('rating.feedbackHint')}"></textarea></div>
    </div>`;
  }

  function readBlock(values, prefix, service) {
    var criteria = {};
    C.RATING_CRITERIA[service].forEach(function (k) { criteria[k] = +values[prefix + 'crit_' + k] || 0; });
    return { overall: +values[prefix + 'overall'] || 0, criteria: criteria, tags: U.asArray(values[prefix + 'tags']), feedback: values[prefix + 'feedback'] || '' };
  }
  function complete(r) {
    return r.overall >= 1 && Object.keys(r.criteria).every(function (k) { return r.criteria[k] >= 1; });
  }

  /** Rate one closed case. Resolves true when saved. */
  dialogs.rateCase = function (d) {
    return new Promise(function (resolve) {
      var c = d.case, saved = false;
      var ctrl = ui.modal.open({
        title: t('rating.rateProvider', { name: d.provider ? d.provider.name : '' }),
        size: 'lg',
        body: h`<form id="rate-form" data-submit="modal"><p class="muted small mb-16">${t('rating.caseIntro', { ref: c.ref })}</p>${ratingBlock('', c.service)}<div class="err small mt-8" data-err style="color:var(--bad)"></div></form>`,
        footer: h`<button type="button" class="btn" data-action="modalClose">${t('rating.later')}</button><button type="submit" form="rate-form" class="btn btn-primary">${t('rating.submit')}</button>`,
        onSubmit: async function (values, form) {
          var r = readBlock(values, '', c.service);
          if (!complete(r)) { form.querySelector('[data-err]').textContent = t('errors.ratingIncomplete'); return; }
          try { await S.ratings.rateCase(c.id, r); saved = true; ctrl.close(); ui.toast(t('rating.saved'), 'success'); }
          catch (e) { ui.fail(e); }
        },
        onClose: function () { resolve(saved); }
      });
    });
  };

  /** Close a batch with one rating per provider plus optional per-case flags. */
  dialogs.closeBatch = function (batch) {
    return new Promise(function (resolve) {
      var saved = false;
      var ctrl = ui.modal.open({
        title: t('batch.closeTitle', { ref: batch.ref }),
        size: 'xl',
        body: h`<form id="batch-rate" data-submit="modal" class="stack loose">
          ${ui.notice(t('batch.closeIntro'), 'info')}
          ${batch.rateProviders.map(function (p, i) {
            return h`<section class="card"><div class="card-h"><h2>${p.name}</h2><span class="faint small">${t('batch.casesClosed', { n: p.cases })}</span></div><div class="card-b">${ratingBlock('p' + i + '_', batch.service)}</div></section>`;
          })}
          <section class="card"><div class="card-h"><h2>${t('batch.caseFlags')}</h2><span class="faint small">${t('common.optional')}</span></div><div class="card-b flush">
            ${ui.table([
              { label: t('case.ref'), render: function (c) { return h`<span class="mono">${c.ref}</span>`; } },
              { label: t('case.provider'), render: function (c) { return c.providerName || '-'; } },
              { label: t('common.status'), render: function (c) { return ui.status(c.status); } },
              { label: t('batch.flagNote'), render: function (c) { return h`<input class="input sm" name="flag_${c.id}" placeholder="${t('batch.flagHint')}">`; } }
            ], batch.cases)}
          </div></section>
          <div class="err small" data-err style="color:var(--bad)"></div>
        </form>`,
        footer: h`<button type="button" class="btn" data-action="modalClose">${t('common.cancel')}</button><button type="submit" form="batch-rate" class="btn btn-primary">${t('batch.closeAndRate')}</button>`,
        onSubmit: async function (values, form) {
          var ratings = batch.rateProviders.map(function (p, i) { return Object.assign({ providerId: p.id }, readBlock(values, 'p' + i + '_', batch.service)); });
          if (!ratings.every(complete)) { form.querySelector('[data-err]').textContent = t('errors.ratingIncomplete'); return; }
          var flags = batch.cases.map(function (c) { return { caseId: c.id, note: (values['flag_' + c.id] || '').trim() }; }).filter(function (f) { return f.note; });
          try { await S.batches.close(batch.id, ratings, flags); saved = true; ctrl.close(); ui.toast(t('batch.closed'), 'success'); }
          catch (e) { ui.fail(e); }
        },
        onClose: function () { resolve(saved); }
      });
    });
  };

  /** Provider profile drawer with anonymised feedback. onSelect: optional callback. */
  dialogs.providerProfile = async function (providerId, service, onSelect) {
    var p;
    try { p = await S.marketplace.profile(providerId, service); } catch (e) { ui.fail(e); return; }
    var sc = p.score && p.score.byService[p.service];
    var m = (sc && sc.metrics) || {};
    var total = p.distribution.reduce(function (a, b) { return a + b; }, 0) || 1;
    var body = h`<div class="stack">
      <div class="row between top"><div><div class="row wrap">${ui.kindBadge(p.kind)}${p.verified ? ui.verified() : ''}${p.enforcement !== 'none' ? ui.status(p.enforcement, 'enforcement') : ''}</div>
        <div class="small muted mt-8">${p.description || ''}</div><div class="xs faint mt-8">${t('provider.memberSince', { date: U.fmtDate(p.joinedAt) })} · ${p.city}</div></div>
        <div class="center">${ui.scoreBox(sc ? sc.score : null)}<div class="xs faint mt-8">${t('score.label')}</div></div></div>
      <div class="card"><div class="card-b stack tight">
        ${ui.rating(sc ? sc.avgRating : null, sc ? sc.ratingCount : 0, sc ? sc.isNew : true)}
        ${[5, 4, 3, 2, 1].map(function (n) { return h`<div class="bar-mini small"><span style="width:24px">${n}★</span>${ui.progress(p.distribution[n - 1] / total)}<span class="faint" style="width:24px">${p.distribution[n - 1]}</span></div>`; })}
      </div></div>
      ${sc ? h`<div><h3 class="mb-8">${t('score.breakdown')}</h3><dl class="dl">
        <dt>${t('score.operational')}</dt><dd>${sc.operational == null ? '-' : U.num(sc.operational, 1)}</dd>
        <dt>${t('score.ratingPart')}</dt><dd>${sc.ratingPart == null ? '-' : U.num(sc.ratingPart, 1)}</dd>
        ${p.service === 'investigation' ? h`<dt>${t('metric.onTime')}</dt><dd>${ui.pct(m.onTime)}</dd><dt>${t('metric.firstTime')}</dt><dd>${ui.pct(m.firstTime)}</dd><dt>${t('metric.evidence')}</dt><dd>${ui.pct(m.evidence)}</dd>`
          : h`<dt>${t('metric.recovery')}</dt><dd>${ui.pct(m.rawRecovery)}</dd><dt>${t('metric.recoveryNorm')}</dt><dd>${ui.pct(m.recovery)}</dd><dt>${t('metric.ptpKept')}</dt><dd>${ui.pct(m.ptpKept)}</dd><dt>${t('metric.complaints')}</dt><dd>${ui.pct(m.complaintRate)}</dd>`}
      </dl></div>
      <div><h3 class="mb-8">${t('rating.criteria')}</h3>${ui.criteriaView(sc.criteria)}</div>` : ''}
      <div><h3 class="mb-8">${t('provider.coverage')}</h3><div class="tag-list">${p.governorates.map(function (g) { return h`<span class="chip">${ui.gov(g)} · ${p.capacity[g]}</span>`; })}</div></div>
      <div><h3 class="mb-8">${t('provider.recentFeedback')}</h3><p class="xs faint mb-8">${t('provider.anonymised')}</p>
        ${p.feedback.length ? h`<div class="stack tight">${p.feedback.map(function (f) {
          return h`<div class="card"><div class="card-b stack tight"><div class="row between">${ui.stars(f.overall)}<span class="xs faint">${U.fmtDate(f.createdAt)}</span></div>
            ${f.feedback ? h`<p class="small">${f.feedback}</p>` : ''}${f.tags.length ? ui.tagChips(f.tags) : ''}
            ${f.reply ? h`<div class="t-note small"><strong>${t('rating.providerReply')}</strong>: ${f.reply.text}</div>` : ''}</div></div>`;
        })}</div>` : ui.empty(t('provider.noFeedback'), null, 'message')}
      </div>
    </div>`;
    ui.modal.open({
      title: p.name, drawer: true, body: body,
      footer: onSelect ? h`<button type="button" class="btn" data-action="modalClose">${t('common.close')}</button><button type="button" class="btn btn-primary" data-action="selectFromProfile">${t('select.selectThis')}</button>` : null,
      actions: { selectFromProfile: function (el, ev, ctrl) { ctrl.close(); onSelect(p.id); } }
    });
  };

  var CASE_REASONS = ['report_inaccurate', 'evidence_missing', 'sla_missed', 'conduct', 'billing', 'other'];
  var RATING_REASONS = ['rating_unfair', 'wrong_case', 'abusive', 'other'];

  /** Open a dispute. kind: 'case' (entity) or 'rating' (provider). Resolves true when opened. */
  dialogs.dispute = async function (kind, targetId, refLabel) {
    var reasons = (kind === 'case' ? CASE_REASONS : RATING_REASONS).map(function (r) { return { value: r, label: t('dispute.reason.' + r) }; });
    var v = await ui.confirm({
      title: kind === 'case' ? t('dispute.raiseCase', { ref: refLabel }) : t('dispute.raiseRating'),
      message: t(kind === 'case' ? 'dispute.caseIntro' : 'dispute.ratingIntro'),
      reasonOptions: reasons, reasonCodeLabel: t('dispute.reasonLabel'),
      reason: 'required', reasonLabel: t('dispute.details'),
      confirmLabel: t('dispute.submit')
    });
    if (!v) return false;
    try {
      await S.disputes.open({ kind: kind, caseId: kind === 'case' ? targetId : null, ratingId: kind === 'rating' ? targetId : null, reason: v.reasonCode, details: v.reason });
      ui.toast(t('dispute.opened'), 'success');
      return true;
    } catch (e) { ui.fail(e); return false; }
  };
})();
