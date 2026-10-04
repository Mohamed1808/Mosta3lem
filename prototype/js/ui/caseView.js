/* Case detail view shared by every portal. The portal supplies the action panel; this
   file renders what the viewer is allowed to see (masked fields show a lock). */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, C = ICM.config;
  var ui = ICM.ui;

  function optLabel(form, f, v) { return t((f.labelBase || ('forms.' + form.id + '.' + f.name + 'Opt')) + '.' + v); }

  function answer(form, f, v) {
    if (v == null || v === '') return '-';
    switch (f.type) {
      case 'yesno': return t('common.' + v);
      case 'select': return optLabel(form, f, v);
      case 'number': case 'computed': return isNaN(+v) ? String(v) : U.num(+v);
      case 'date': return U.fmtDate(new Date(v).getTime());
      case 'ocrDoc': case 'signature': case 'photo': return h`<img class="report-img ${f.type}" src="${v}" alt="${t('forms.' + form.id + '.' + f.name)}">`;
      case 'license':
        return v.has === 'yes' ? h`<bdi dir="ltr">${v.number || '-'}</bdi>${v.photo ? h`<div><img class="report-img" src="${v.photo}" alt=""></div>` : ''}` : t('common.no');
      case 'repeat':
        return h`<div class="stack tight">${v.map(function (row) {
          return h`<div>${f.fields.map(function (sf) { return row[sf.name] ? (sf.type === 'select' ? optLabel(form, sf, row[sf.name]) : row[sf.name]) : null; }).filter(Boolean).join(' · ')}</div>`;
        })}</div>`;
      default: return String(v);
    }
  }

  function answerRows(form, fields, vals) {
    return fields.filter(function (f) { return ICM.wf.isVisible(f, vals) && f.type !== 'ocrDoc'; }).map(function (f) {
      return h`<dt>${t('forms.' + form.id + '.' + f.name)}</dt><dd>${answer(form, f, vals[f.name])}</dd>`;
    });
  }

  ui.reportView = function (c) {
    var types = c.inquiryTypes || [];
    if (!types.some(function (tp) { return c.report && c.report[tp]; })) return ui.empty(t('evidence.noReport'), null, 'clipboard');
    return h`<div class="stack">${types.map(function (tp) {
      var form = C.REPORT_FORMS[tp], vals = (c.report || {})[tp] || {};
      if (!form.sections) return h`<div><h3 class="mb-8">${ui.L('inquiryTypes', tp)}</h3><dl class="dl">${answerRows(form, form.fields, vals)}</dl></div>`;
      var docs = ICM.wf.formFields(form).filter(function (f) { return f.type === 'ocrDoc' && vals[f.name]; });
      return h`<div><h3 class="mb-8">${ui.L('inquiryTypes', tp)}</h3>
        ${docs.length ? h`<div class="doc-strip mb-8">${docs.map(function (f) { return h`<figure><img class="report-img ocrDoc" src="${vals[f.name]}" alt=""><figcaption class="xs faint">${t('ocr.doc.' + f.doc)}</figcaption></figure>`; })}</div>` : ''}
        ${form.sections.map(function (sec) {
          var rows = answerRows(form, sec.fields, vals);
          return rows.length ? h`<div class="report-sec"><h4>${t('forms.' + form.id + '.sections.' + sec.id)}</h4><dl class="dl">${rows}</dl></div>` : '';
        })}</div>`;
    })}</div>`;
  };

  /** Download Residence and Business investigations as the client's Excel template. */
  ui.exportInvestigations = async function (filters) {
    if (!window.XLSX) throw new ICM.engine.ServiceError('errors.xlsxMissing');
    var sheets = await ICM.services.exports.investigations(filters);
    var wb = window.XLSX.utils.book_new();
    sheets.forEach(function (sh) { window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([sh.headers].concat(sh.rows)), sh.sheet); });
    var d = new Date(ICM.clock.now());
    window.XLSX.writeFile(wb, 'investigations-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.xlsx');
    ui.toast(t('export.done', { home: sheets[0].rows.length, corp: sheets[1].rows.length }), 'success');
  };

  ui.checkInView = function (ci) {
    if (!ci) return h`<span class="faint">${t('evidence.notCheckedIn')}</span>`;
    var far = ci.distanceM > C.CHECKIN_MAX_DISTANCE_M;
    return h`<div class="row wrap">${ui.badge(t('evidence.checkedInAt', { time: U.fmtTime(ci.at), distance: U.num(ci.distanceM) }), far ? 'warning' : 'success', true)}
      <span class="mono faint" dir="ltr">${ci.lat != null ? ci.lat.toFixed(5) + ', ' + ci.lng.toFixed(5) : ''}</span>${far ? h`<span class="small" style="color:var(--warn)">${t('evidence.farFromAddress', { max: C.CHECKIN_MAX_DISTANCE_M })}</span>` : ''}</div>`;
  };

  function customerCard(c) {
    var cu = c.customer || {};
    var rows = [
      [t('case.customerName'), ui.masked(cu.name)],
      [t('case.nationalId'), cu.nationalId ? h`<span class="mono">${cu.nationalId}</span>` : ui.masked(null)],
      [t('case.mobiles'), cu.mobiles && cu.mobiles.length ? h`<span class="mono" dir="ltr">${cu.mobiles.join(', ')}</span>` : ui.masked(null)]
    ];
    if (cu.telephone) rows.push([t('forms.investigationRequest.telephone'), h`<span class="mono" dir="ltr">${cu.telephone}</span>`]);
    if (c.accountNumber !== undefined && c.service === 'investigation') rows.push([t('forms.investigationRequest.accountNumber'), c.accountNumber ? h`<span class="mono">${c.accountNumber}</span>` : (c.masked ? ui.masked(null) : '-')]);
    if (c.service === 'investigation') {
      rows.push([t('case.inquiryTypes'), ui.types(c.inquiryTypes)]);
      if (c.employerName !== undefined && (c.inquiryTypes || []).indexOf('employment') >= 0) rows.push([t('forms.investigationRequest.employerName'), ui.masked(c.employerName)]);
      if ((c.inquiryTypes || []).indexOf('business') >= 0) {
        rows.push([t('forms.investigationRequest.businessName'), ui.masked(c.businessName)]);
        if (c.businessPhone) rows.push([t('forms.investigationRequest.businessPhone'), h`<span class="mono" dir="ltr">${c.businessPhone}</span>`]);
        if (c.orderNumber) rows.push([t('forms.investigationRequest.orderNumber'), h`<span class="mono">${c.orderNumber}</span>`]);
      }
      if (c.clientDecision) rows.push([t('decision.title'), h`${ui.badge(t('decision.' + c.clientDecision.value), c.clientDecision.value === 'APPROVED' ? 'success' : c.clientDecision.value === 'REJECTED' ? 'danger' : 'pending')}${c.clientDecision.note ? h`<div class="faint small">${c.clientDecision.note}</div>` : ''}`]);
      if ((c.inquiryTypes || []).indexOf('guarantor') >= 0) rows.push([t('case.guarantor'), c.guarantor ? h`${c.guarantor.name}<div class="faint small mono" dir="ltr">${c.guarantor.mobile || ''}</div>${c.guarantor.relationship ? h`<div class="faint small">${c.guarantor.relationship}</div>` : ''}` : ui.masked(null)]);
      rows.push([t('case.deadline'), U.fmtDateTime(c.deadline || c.dueAt)]);
    } else {
      rows.push([t('case.contractNumber'), c.contractNumber ? h`<span class="mono">${c.contractNumber}</span>` : ui.masked(null)]);
      rows.push([t('case.product'), ui.L('productTypes', c.productType)]);
      rows.push([t('case.dpd'), h`${c.dpd != null ? U.num(c.dpd) + ' · ' : ''}${ui.bucket(c.bucket)}`]);
      if (c.masked) rows.push([t('case.amountRange'), ui.amountRange(c.amountRange)]);
      else {
        rows.push([t('case.originalAmount'), U.money(c.originalAmount)]);
        rows.push([t('case.overdueAmount'), U.money(c.overdueAmount)]);
        rows.push([t('case.instalmentAmount'), U.money(c.instalmentAmount)]);
      }
      rows.push([t('case.collateral'), c.collateral ? h`${c.collateral.make} ${c.collateral.model}${c.collateral.plate ? h` · <bdi class="mono">${c.collateral.plate}</bdi>` : ''}${c.collateral.notes ? h`<div class="faint small">${c.collateral.notes}</div>` : ''}` : (c.masked ? ui.masked(null) : '-')]);
      var aa = c.allowedActions || {};
      rows.push([t('case.allowedActions'), ['calls', 'messages', 'visits'].filter(function (k) { return aa[k]; }).map(function (k) { return t('forms.collectionRequest.allowed.' + k); }).join(', ') || '-']);
      var sa = c.settlementAuthority || { mode: 'none' };
      rows.push([t('case.settlementAuthority'), sa.mode === 'discount' ? t('case.maxDiscount', { pct: sa.maxDiscountPct }) : t('forms.collectionRequest.settlement.' + sa.mode)]);
      rows.push([t('case.periodEnd'), U.fmtDate(c.periodEnd || c.dueAt)]);
    }
    rows.push([t('case.instructions'), c.instructions === null && c.masked ? ui.masked(null) : (c.instructions || '-')]);
    rows.push([t('case.internalRef'), c.internalRef === null && c.masked ? ui.masked(null) : (c.internalRef || '-')]);
    return h`<dl class="dl">${rows.map(function (r) { return h`<dt>${r[0]}</dt><dd>${r[1]}</dd>`; })}</dl>`;
  }

  function addressesCard(c) {
    var keys = Object.keys(c.addresses || {});
    if (!keys.length) return h`<span class="faint">-</span>`;
    return h`<dl class="dl">${keys.map(function (k) { return h`<dt>${t('address.' + k)}</dt><dd>${ui.addr(c.addresses[k])}</dd>`; })}</dl>`;
  }

  ui.collectionLog = function (c) {
    var entries = [];
    (c.actions || []).forEach(function (a) { entries.push({ at: a.at, kind: 'action', html: h`<span class="strong">${ui.L('actionTypes', a.type)}</span>${a.checkIn ? h` · ${ui.badge(t('evidence.checkedInAt', { time: U.fmtTime(a.checkIn.at), distance: U.num(a.checkIn.distanceM) }), a.checkIn.distanceM > C.CHECKIN_MAX_DISTANCE_M ? 'warning' : 'success')}` : ''}${a.note ? h`<div class="small muted">${a.note}</div>` : ''}`, by: a.byName }); });
    (c.promises || []).forEach(function (p) { entries.push({ at: p.createdAt, kind: 'ptp', html: h`<span class="strong">${t('collection.promise')}</span> ${U.money(p.amount)} · ${t('collection.dueOn', { date: U.fmtDate(p.dueDate) })} ${ui.status(p.status)}${p.note ? h`<div class="small muted">${p.note}</div>` : ''}`, by: p.byName }); });
    (c.payments || []).forEach(function (p) { entries.push({ at: p.at, kind: 'pay', html: h`<span class="strong">${t('collection.payment')}</span> ${U.money(p.amount)} · ${t('paymentMethod.' + p.method)}${p.receipt ? h` · <a href="${p.receipt}" target="_blank" rel="noopener">${t('collection.receipt')}</a>` : ''}${p.note ? h`<div class="small muted">${p.note}</div>` : ''}`, by: p.byName }); });
    if (!entries.length) return ui.empty(t('collection.noActions'), null, 'phone');
    entries.sort(function (a, b) { return b.at - a.at; });
    return ui.table([
      { label: t('common.when'), render: function (e) { return h`<span class="nowrap small">${U.fmtDateTime(e.at)}</span>`; } },
      { label: t('collection.entry'), render: function (e) { return e.html; } },
      { label: t('common.by'), render: function (e) { return h`<span class="small">${e.by || '-'}</span>`; } }
    ], entries);
  };

  ui.balanceView = function (c) {
    if (c.masked) return h`<dl class="dl"><dt>${t('case.amountRange')}</dt><dd>${ui.amountRange(c.amountRange)}</dd><dt>${t('collection.recovered')}</dt><dd>${U.money(c.recovered)}</dd></dl>`;
    var ratio = c.target ? c.recovered / c.target : 0;
    return h`<div class="stack tight">
      <div class="row between"><span class="muted small">${t('collection.recovered')}</span><span class="strong">${U.money(c.recovered)}</span></div>
      ${ui.progress(ratio, ratio >= 1 ? 'ok' : '')}
      <div class="stat-row"><span>${t('case.overdueAmount')}</span><span>${U.money(c.overdueAmount)}</span></div>
      ${c.settledTarget != null ? h`<div class="stat-row"><span>${t('collection.settledTarget')}</span><span>${U.money(c.settledTarget)}</span></div>` : ''}
      ${c.instalmentPlan ? h`<div class="stat-row"><span>${t('collection.instalmentPlan')}</span><span>${t('collection.planText', { count: c.instalmentPlan.count, amount: U.money(c.instalmentPlan.amount) })}</span></div>` : ''}
      <div class="stat-row"><span class="strong">${t('collection.outstanding')}</span><span class="strong">${U.money(c.outstanding)}</span></div>
      ${c.outcome ? h`<div class="stat-row"><span>${t('collection.outcome')}</span><span>${t('outcome.' + c.outcome)}</span></div>` : ''}
    </div>`;
  };

  ui.settlementsView = function (c) {
    var list = c.settlements || [];
    if (!list.length) return '';
    return h`<div class="stack tight">${list.slice().reverse().map(function (s) {
      return h`<div class="notice ${s.status === 'pending' ? 'warn' : s.status === 'approved' ? 'ok' : 'bad'}">${icon('handshake')}<div class="grow">
        <div class="row between"><strong>${s.kind === 'discount' ? t('settlement.discountText', { pct: s.discountPct }) : t('settlement.instalmentsText', { count: s.instalmentCount })}</strong>${ui.status(s.status)}</div>
        <div class="small">${s.note}</div>
        <div class="xs faint">${t('settlement.requestedBy', { name: s.requestedByName, time: U.fmtDateTime(s.requestedAt) })}${s.outstandingAtRequest != null ? ' · ' + t('settlement.outstandingAt', { amount: U.money(s.outstandingAtRequest) }) : ''}</div>
        ${s.decidedAt ? h`<div class="xs faint">${t('settlement.decidedBy', { name: s.decidedByName, time: U.fmtDateTime(s.decidedAt) })}${s.decisionNote ? ': ' + s.decisionNote : ''}</div>` : ''}
      </div></div>`;
    })}</div>`;
  };

  function slaCard(c) {
    if (!c.dueAt) return '';
    var ratio = Math.min(1, c.slaRatio || 0);
    var tone = c.sla === 'breached' || c.sla === 'missed' ? 'bad' : c.sla === 'at_risk' ? 'warn' : 'ok';
    return ui.card(t('sla.title'), h`<div class="stack tight">
      <div class="row between">${ui.slaBadge(c) || ui.badge(t('sla.notRunning'), 'muted')}<span class="small muted">${t('sla.due', { date: U.fmtDateTime(c.dueAt) })}</span></div>
      ${ICM.wf.sla.isRunning(c) ? ui.progress(ratio, tone) : ''}
    </div>`);
  }

  function providerCard(d) {
    var c = d.case;
    if (!d.provider) return '';
    var p = d.provider;
    return ui.card(t('case.provider'), h`<div class="stack tight">
      <div class="row between"><strong>${p.name}</strong>${ui.scoreBox(p.score)}</div>
      <div class="row wrap">${ui.kindBadge(p.kind)}${p.verified ? ui.verified() : ''}${p.enforcement && p.enforcement !== 'none' ? ui.status(p.enforcement, 'enforcement') : ''}</div>
      ${ui.rating(p.avgRating, p.ratingCount, p.isNew)}
      ${d.agent ? h`<div class="stat-row"><span>${t('case.agent')}</span><span>${d.agent.name}</span></div>` : ''}
      ${c.price != null ? h`<div class="stat-row"><span>${t('case.price')}</span><span>${typeof c.price === 'number' ? U.money(c.price) : t('case.feeTerms', { pct: c.price.feePct, fixed: U.money(c.price.fixedFee) })}</span></div>` : ''}
      ${d.offer && d.offer.status === 'pending' ? h`<div class="row between"><span class="small muted">${t('offers.acceptanceWindow')}</span>${ui.countdown(d.offer.remaining)}</div>` : ''}
    </div>`);
  }

  function ratingCard(d) {
    var r = d.rating;
    if (!r) return '';
    return ui.card(t('rating.title'), h`<div class="stack tight">
      <div class="row">${ui.stars(r.overall, 'lg')}<strong>${r.overall}/5</strong>${r.status === 'removed' ? ui.badge(t('rating.removed'), 'muted') : ''}</div>
      ${ui.criteriaView(r.criteria)}
      ${r.tags && r.tags.length ? ui.tagChips(r.tags) : ''}
      ${r.feedback ? h`<p class="small">${r.feedback}</p>` : ''}
      ${r.reply ? h`<div class="t-note small"><strong>${t('rating.providerReply')}</strong>: ${r.reply.text}</div>` : ''}
    </div>`);
  }

  ui.criteriaView = function (criteria) {
    if (!criteria) return '';
    return h`<div class="criteria">${Object.keys(criteria).map(function (k) {
      var v = criteria[k];
      return h`<div class="bar-mini"><span>${t('criteria.' + k)}</span>${ui.progress(v == null ? 0 : v / 5)}<span class="strong">${v == null ? '-' : U.num(v, 1)}</span></div>`;
    })}</div>`;
  };

  function disputesCard(d) {
    if (!d.disputes || !d.disputes.length) return '';
    return ui.card(t('dispute.title'), h`<div class="stack tight">${d.disputes.map(function (x) {
      return h`<div class="notice ${x.status === 'open' ? 'warn' : 'ok'}">${icon('scale')}<div class="grow"><div class="row between"><strong>${x.ref}</strong>${ui.status(x.status)}</div>
        <div class="small">${t('dispute.reason.' + x.reason)}: ${x.details}</div>
        ${x.responses.map(function (r) { return h`<div class="xs faint">${r.byName} (${t('dispute.party.' + r.party)}): ${r.text}</div>`; })}
        ${x.outcome ? h`<div class="small strong">${t('dispute.outcome.' + x.outcome)}: ${x.resolutionNote}</div>` : ''}</div></div>`;
    })}</div>`);
  }

  /** opts: { crumbs, actions (SafeHtml), extraMain, extraSide, headActions } */
  ui.caseView = function (d, opts) {
    opts = opts || {};
    var c = d.case;
    var title = h`${c.ref}`;
    var sub = h`<span class="row wrap">${ui.serviceBadge(c.service)}${ui.status(c.status)}${ui.slaBadge(c)}${c.disputed ? ui.badge(t('dispute.flag'), 'danger', true) : ''}${c.batchRef ? ui.badge(t('batch.label', { ref: c.batchRef }), 'neutral') : ''}<span class="faint small">${ui.gov(c.governorate)} · ${t('case.createdOn', { date: U.fmtDateTime(c.createdAt) })}</span></span>`;
    var main = [];
    if (c.masked) main.push(ui.notice(c.maskReason === 'retention_expired' ? t('mask.retentionNotice') : t('mask.preAcceptNotice'), 'info', 'lock'));
    if (c.status === 'returned_to_agent' && c.reviewComment) main.push(ui.notice(h`<strong>${t('review.returnedWith')}</strong> ${c.reviewComment}`, 'warn'));
    if ((c.status === 'rework_requested' || (c.reworkReason && ['assigned', 'in_field'].indexOf(c.status) >= 0)) && c.reworkReason) main.push(ui.notice(h`<strong>${t('review.reworkReason')}</strong> ${c.reworkReason}`, 'warn'));
    main.push(ui.card(t('case.details'), customerCard(c)));
    main.push(ui.card(t('case.addresses'), addressesCard(c)));
    if (c.service === 'investigation' && (c.checkIn || (c.photos || []).length || Object.keys(c.report || {}).length)) {
      main.push(ui.card(t('evidence.title'), h`<div class="stack">
        <div><div class="small muted mb-8">${t('evidence.checkIn')}</div>${ui.checkInView(c.checkIn)}</div>
        <div><div class="small muted mb-8">${t('evidence.photos', { n: (c.photos || []).length, min: c.minPhotos || 0 })}</div>${(c.photos || []).length ? h`<div class="photos">${c.photos.map(function (p) { return ui.photo(p); })}</div>` : h`<span class="faint">-</span>`}</div>
        <div class="sep"></div>${ui.reportView(c)}</div>`));
    }
    if (c.service === 'collection' && c.acceptedAt) {
      if ((c.settlements || []).length) main.push(ui.card(t('settlement.title'), ui.settlementsView(c)));
      main.push(ui.card(t('collection.log'), ui.collectionLog(c), { flush: true, actions: opts.logActions }));
    }
    if (opts.extraMain) main.push(opts.extraMain);
    main.push(ui.card(t('timeline.title'), ui.timeline(c.timeline)));

    var side = [];
    if (opts.actions) side.push(ui.card(t('common.actions'), opts.actions, { cls: 'accent-edge' }));
    if (c.service === 'collection' && c.acceptedAt) side.push(ui.card(t('collection.balance'), ui.balanceView(c)));
    side.push(slaCard(c));
    side.push(providerCard(d));
    if (d.entity && opts.showEntity) side.push(ui.card(t('case.client'), h`<div class="stack tight"><strong>${d.entity.name}</strong>${ui.clientRatingView(d.entity.clientRating)}</div>`));
    side.push(ratingCard(d));
    side.push(disputesCard(d));
    if (opts.extraSide) side.push(opts.extraSide);

    return h`${ui.pageHead(title, sub, opts.headActions, opts.crumbs)}<div class="grid side"><div class="stack">${main}</div><div class="stack">${side}</div></div>`;
  };

  ui.clientRatingView = function (cr) {
    if (!cr || !cr.count) return h`<span class="faint small">${t('clientRating.none')}</span>`;
    return h`<div class="stack tight small"><div class="row between"><span>${t('clientRating.dataQuality')}</span><span class="row">${ui.stars(cr.dataQuality)} ${U.num(cr.dataQuality, 1)}</span></div>
      <div class="row between"><span>${t('clientRating.paymentTimeliness')}</span><span class="row">${ui.stars(cr.paymentTimeliness)} ${U.num(cr.paymentTimeliness, 1)}</span></div>
      <div class="faint xs">${t('clientRating.basedOn', { n: cr.count })}</div></div>`;
  };
})();
