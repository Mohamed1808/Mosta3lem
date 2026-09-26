/* Field agent app (mobile first, ~390px). Company field staff and freelancers. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, C = ICM.config, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.agent = P.agent || {};

  var WORKING = ['assigned', 'in_field', 'returned_to_agent', 'active'];

  function addrLine(c) {
    var a = (c.addresses && (c.addresses.home || c.addresses.work || c.addresses.business)) || {};
    return [a.street, a.city, ui.gov(c.governorate)].filter(Boolean).join(', ');
  }

  function taskCard(c, seq) {
    return h`<a class="task" href="#/agent/tasks/${c.id}" style="color:inherit;text-decoration:none">
      ${seq != null ? h`<span class="seq">${seq}</span>` : ''}
      <div class="grow stack tight">
        <div class="row between"><span class="mono strong small">${c.ref}</span>${ui.slaBadge(c)}</div>
        <div class="strong">${c.customer.name || ''}</div>
        <div class="small muted">${addrLine(c)}</div>
        <div class="row wrap">${ui.status(c.status)}<span class="xs faint">${c.service === 'investigation' ? ui.types(c.inquiryTypes) : ui.bucket(c.bucket)}</span></div>
      </div></a>`;
  }

  // ================================================================ my tasks
  P.agent.tasks = {
    live: true,
    title: function () { return t('agent.tabs.tasks'); },
    load: async function () {
      var r = await Promise.all([S.cases.agentTasks(), S.demo.clock()]);
      return { tasks: r[0], now: r[1].now };
    },
    render: function (d) {
      var now = d.now, endToday = U.endOfDay(now);
      var working = d.tasks.filter(function (c) { return WORKING.indexOf(c.status) >= 0; });
      var waiting = d.tasks.filter(function (c) { return ['submitted_for_review', 'awaiting_entity_approval'].indexOf(c.status) >= 0; });
      var overdue = working.filter(function (c) { return c.dueAt && c.dueAt < now; });
      var today = working.filter(function (c) { return c.dueAt && c.dueAt >= now && c.dueAt <= endToday; });
      var upcoming = working.filter(function (c) { return !c.dueAt || c.dueAt > endToday; });
      var route = working.slice().sort(function (a, b) { return (a.governorate + (a.addresses.home || a.addresses.work || a.addresses.business || {}).city).localeCompare(b.governorate + (b.addresses.home || b.addresses.work || b.addresses.business || {}).city) || a.dueAt - b.dueAt; });
      function section(title, list, emptyMsg) {
        var byArea = U.groupBy(list, function (c) { return ui.gov(c.governorate); });
        return h`<div class="agent-section"><h3>${title} · ${list.length}</h3>${list.length ? Object.keys(byArea).map(function (area) {
          return h`<div class="stack tight mb-8"><div class="xs faint">${icon('pin')} ${area}</div>${byArea[area].map(function (c) { return taskCard(c); })}</div>`;
        }) : h`<p class="small faint">${emptyMsg}</p>`}</div>`;
      }
      return h`<div class="row between mb-16"><h1>${t('agent.myTasks')}</h1><span class="small muted">${U.fmtDate(now)}</span></div>
        ${section(t('agent.overdue'), overdue, t('agent.noneOverdue'))}
        ${section(t('agent.today'), today, t('agent.noneToday'))}
        ${section(t('agent.upcoming'), upcoming, t('agent.noneUpcoming'))}
        <div class="agent-section"><h3>${icon('route')} ${t('agent.route')}</h3>${route.length ? h`<div class="stack tight">${route.map(function (c, i) { return taskCard(c, i + 1); })}</div>` : h`<p class="small faint">${t('agent.noRoute')}</p>`}</div>
        ${waiting.length ? h`<div class="agent-section"><h3>${t('agent.waiting')} · ${waiting.length}</h3><div class="stack tight">${waiting.map(function (c) { return taskCard(c); })}</div></div>` : ''}`;
    }
  };

  // ================================================================ task detail
  function checklist(items) {
    return h`<div class="stack tight">${items.map(function (it) {
      return h`<div class="row small">${it.ok ? h`<span style="color:var(--ok)">${icon('check')}</span>` : h`<span style="color:var(--text-3)">${icon('x')}</span>`}<span class="${it.ok ? '' : 'muted'}">${it.label}</span></div>`;
    })}</div>`;
  }

  function investigationTask(d, ctx) {
    var c = d.case;
    var minP = c.minPhotos || 0, photos = c.photos || [];
    var formsOk = (c.inquiryTypes || []).every(function (tp) { return Object.keys(wf.validateFields(C.REPORT_FORMS[tp].fields, (c.report || {})[tp] || {})).length === 0; });
    var parts = [];
    if (c.status === 'returned_to_agent') parts.push(h`<div class="mb-16">${ui.notice(h`<strong>${t('review.returnedWith')}</strong> ${c.reviewComment || ''}`, 'warn')}<button type="button" class="btn btn-primary big-action mt-8" data-action="resume">${icon('play')}${t('action.resume')}</button></div>`);
    if (c.reworkReason && ['assigned', 'in_field'].indexOf(c.status) >= 0) parts.push(h`<div class="mb-16">${ui.notice(h`<strong>${t('review.reworkReason')}</strong> ${c.reworkReason}`, 'warn')}</div>`);
    if (c.status === 'submitted_for_review') parts.push(h`<div class="mb-16">${ui.notice(c.reviewerRole === 'qa' ? t('agent.waitingQa') : t('agent.waitingSupervisor'), 'info', 'clock')}</div>`);

    parts.push(h`<div class="agent-section"><h3>${t('evidence.checkIn')}</h3>${c.status === 'assigned'
      ? h`<div class="checkin-box stack">${icon('pin')}<p class="small muted">${t('agent.checkInHint')}</p><button type="button" class="btn btn-primary big-action" data-action="checkIn">${icon('pin')}${t('action.check_in')}</button></div>`
      : h`<div class="card"><div class="card-b">${ui.checkInView(c.checkIn)}</div></div>`}</div>`);

    if (c.status === 'in_field' || photos.length) {
      parts.push(h`<div class="agent-section"><h3>${t('evidence.photos', { n: photos.length, min: minP })}</h3>
        <div class="photos">${photos.map(function (p) { return ui.photo(p, { removable: c.status === 'in_field' }); })}</div>
        ${c.status === 'in_field' ? h`<label class="btn btn-block mt-8" style="position:relative">${icon('camera')}${t('agent.addPhoto')}<input type="file" accept="image/*" capture="environment" data-change="photo" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label><p class="xs faint mt-8">${t('agent.photoStamp')}</p>` : ''}
      </div>`);
    }
    if (c.status === 'in_field') {
      (c.inquiryTypes || []).forEach(function (tp) {
        var form = C.REPORT_FORMS[tp];
        var done = Object.keys(wf.validateFields(form.fields, (c.report || {})[tp] || {})).length === 0;
        var errs = ctx.state.errors && ctx.state.errors[tp];
        parts.push(h`<div class="agent-section"><h3>${t('agent.reportFor', { type: ui.L('inquiryTypes', tp) })} ${done ? ui.badge(t('agent.saved'), 'success') : ''}</h3>
          <form data-submit="saveReport" data-type="${tp}" class="card"><div class="card-b">${ui.forms.render('rep_' + tp, form, (c.report || {})[tp] || {}, errs, { cols: 1 })}</div>
          <div class="card-f"><button type="submit" class="btn btn-primary">${t('agent.saveAnswers')}</button></div></form></div>`);
      });
      var ready = !!c.checkIn && photos.length >= minP && formsOk;
      parts.push(h`<div class="agent-section"><h3>${t('agent.submit')}</h3><div class="card"><div class="card-b stack">
        ${checklist([{ ok: !!c.checkIn, label: t('agent.chkCheckIn') }, { ok: photos.length >= minP, label: t('agent.chkPhotos', { n: photos.length, min: minP }) }, { ok: formsOk, label: t('agent.chkForms') }])}
        <button type="button" class="btn btn-primary big-action" data-action="submitReport" ${ready ? '' : 'disabled'}>${icon('send')}${t('action.submit_report')}</button>
        <p class="xs faint">${d.provider && d.provider.kind === 'freelancer' ? t('agent.goesToQa') : t('agent.goesToSupervisor')}</p></div></div></div>`);
    } else if (Object.keys(c.report || {}).length) {
      parts.push(h`<div class="agent-section"><h3>${t('agent.yourReport')}</h3><div class="card"><div class="card-b">${ui.reportView(c)}</div></div></div>`);
    }
    return parts;
  }

  function collectionTask(d) {
    var c = d.case;
    var parts = [];
    parts.push(h`<div class="agent-section"><h3>${t('collection.balance')}</h3><div class="card"><div class="card-b">${ui.balanceView(c)}</div></div></div>`);
    if (d.canOperate) {
      parts.push(h`<div class="agent-section"><h3>${t('agent.logWork')}</h3><div class="grid cols-2">
        <button type="button" class="btn btn-lg" data-action="logAction">${icon('phone')}${t('collection.logAction')}</button>
        <button type="button" class="btn btn-lg" data-action="promise">${icon('calendar')}${t('collection.promise')}</button>
        <button type="button" class="btn btn-lg" data-action="payment">${icon('banknote')}${t('collection.payment')}</button>
        <button type="button" class="btn btn-lg" data-action="settlement" ${c.status === 'active' ? '' : 'disabled'}>${icon('handshake')}${t('settlement.short')}</button>
      </div>${c.status === 'awaiting_entity_approval' ? h`<div class="mt-8">${ui.notice(t('settlement.waitingEntity'), 'warn', 'clock')}</div>` : ''}</div>`);
    }
    var promises = (c.promises || []).slice().reverse();
    if (promises.length) parts.push(h`<div class="agent-section"><h3>${t('collection.promises')}</h3><div class="stack tight">${promises.map(function (p) {
      return h`<div class="task"><div class="grow"><div class="row between"><strong>${U.money(p.amount)}</strong>${ui.status(p.status)}</div><div class="small muted">${t('collection.dueOn', { date: U.fmtDate(p.dueDate) })}</div></div></div>`;
    })}</div></div>`);
    if ((c.settlements || []).length) parts.push(h`<div class="agent-section"><h3>${t('settlement.title')}</h3>${ui.settlementsView(c)}</div>`);
    parts.push(h`<div class="agent-section"><h3>${t('collection.log')}</h3><div class="card"><div class="card-b flush">${ui.collectionLog(c)}</div></div></div>`);
    return parts;
  }

  P.agent.task = {
    live: true,
    title: function (d) { return d ? d.case.ref : ''; },
    initState: function () { return { errors: {} }; },
    load: function (ctx) { return S.cases.get(ctx.params.id); },
    render: function (d, ctx) {
      var c = d.case;
      var cu = c.customer || {};
      var head = h`<div class="stack tight mb-16">
        <div class="row between"><span class="mono strong">${c.ref}</span>${ui.slaBadge(c)}</div>
        <h1>${cu.name || ''}</h1>
        <div class="row wrap">${ui.status(c.status)}${ui.serviceBadge(c.service)}<span class="small muted">${t('case.due')}: ${U.fmtDateTime(c.dueAt)}</span></div>
      </div>
      <div class="card mb-16"><div class="card-b stack tight">
        ${(cu.mobiles || []).map(function (m) { return h`<a class="btn btn-block" href="tel:${m}">${icon('phone')}<span dir="ltr">${m}</span></a>`; })}
        <dl class="dl mt-8">
          <dt>${t('case.nationalId')}</dt><dd class="mono">${cu.nationalId || ''}</dd>
          ${Object.keys(c.addresses || {}).map(function (k) { return h`<dt>${t('address.' + k)}</dt><dd>${ui.addr(c.addresses[k])}</dd>`; })}
          ${c.service === 'investigation' ? h`<dt>${t('case.inquiryTypes')}</dt><dd>${ui.types(c.inquiryTypes)}</dd>
            ${c.employerName ? h`<dt>${t('forms.investigationRequest.employerName')}</dt><dd>${c.employerName}</dd>` : ''}
            ${c.businessName ? h`<dt>${t('forms.investigationRequest.businessName')}</dt><dd>${c.businessName}</dd>` : ''}
            ${c.guarantor ? h`<dt>${t('case.guarantor')}</dt><dd>${c.guarantor.name} <span class="mono" dir="ltr">${c.guarantor.mobile || ''}</span></dd>` : ''}`
            : h`<dt>${t('case.contractNumber')}</dt><dd class="mono">${c.contractNumber}</dd><dt>${t('case.product')}</dt><dd>${ui.L('productTypes', c.productType)}</dd><dt>${t('case.dpd')}</dt><dd>${U.num(c.dpd)} · ${ui.bucket(c.bucket)}</dd>
            ${c.collateral ? h`<dt>${t('case.collateral')}</dt><dd>${c.collateral.make} ${c.collateral.model} <bdi class="mono">${c.collateral.plate || ''}</bdi></dd>` : ''}
            <dt>${t('case.allowedActions')}</dt><dd>${['calls', 'messages', 'visits'].filter(function (k) { return (c.allowedActions || {})[k]; }).map(function (k) { return t('forms.collectionRequest.allowed.' + k); }).join(', ')}</dd>`}
          <dt>${t('case.instructions')}</dt><dd>${c.instructions || '-'}</dd>
        </dl></div></div>`;
      var body = c.service === 'investigation' ? investigationTask(d, ctx) : collectionTask(d);
      return h`${head}${body}`;
    },
    actions: {
      resume: async function (el, ev, ctx) { await S.cases.transition(ctx.params.id, 'resume'); ctx.reload(); },
      checkIn: async function (el, ev, ctx) {
        var c = await S.cases.checkIn(ctx.params.id);
        ui.toast(t('evidence.checkedInAt', { time: U.fmtTime(c.checkIn.at), distance: U.num(c.checkIn.distanceM) }), 'success');
        ctx.reload();
      },
      photo: async function (el, ev, ctx) {
        var f = el.files && el.files[0];
        if (!f) return;
        var url = await U.readImage(f, 640);
        await S.cases.addPhoto(ctx.params.id, url);
        ui.toast(t('agent.photoAdded'), 'success');
        ctx.reload();
      },
      removePhoto: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('agent.removePhoto'), message: t('agent.removePhotoBody'), danger: true, confirmLabel: t('common.delete') });
        if (!ok) return;
        await S.cases.removePhoto(ctx.params.id, el.getAttribute('data-id'));
        ctx.reload();
      },
      saveReport: async function (form, ev, ctx) {
        var tp = form.getAttribute('data-type');
        var def = C.REPORT_FORMS[tp];
        var values = ui.forms.collect(form.querySelector('[data-form-key]'), def);
        var errors = wf.validateFields(def.fields, values);
        ctx.state.errors[tp] = errors;
        await S.cases.saveReport(ctx.params.id, tp, values);
        ui.toast(Object.keys(errors).length ? t('agent.savedIncomplete') : t('agent.answersSaved'), Object.keys(errors).length ? 'danger' : 'success');
        ctx.reload();
      },
      submitReport: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('action.submit_report'), message: t('agent.submitBody'), confirmLabel: t('action.submit_report') });
        if (!ok) return;
        await S.cases.transition(ctx.params.id, 'submit_report');
        ui.toast(t('agent.submitted'), 'success');
        ctx.navigate('#/agent');
      },
      logAction: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.logAction(d.case)) ctx.reload(); },
      promise: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.addPromise(d.case)) ctx.reload(); },
      payment: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.addPayment(d.case)) ctx.reload(); },
      settlement: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.settlement(d.case)) ctx.reload(); }
    }
  };

  // ================================================================ returned
  P.agent.returned = {
    live: true,
    title: function () { return t('agent.tabs.returned'); },
    load: function () { return S.cases.agentTasks(); },
    render: function (tasks) {
      var list = tasks.filter(function (c) { return c.status === 'returned_to_agent' || (c.reworkReason && ['assigned', 'in_field'].indexOf(c.status) >= 0); });
      return h`<h1 class="mb-16">${t('agent.returnedTitle')}</h1>${list.length ? h`<div class="stack">${list.map(function (c) {
        return h`<div class="stack tight">${taskCard(c)}${ui.notice(h`<strong>${c.status === 'returned_to_agent' ? t('review.returnedWith') : t('review.reworkReason')}</strong> ${c.status === 'returned_to_agent' ? c.reviewComment : c.reworkReason}`, 'warn')}</div>`;
      })}</div>` : ui.empty(t('agent.noneReturned'), null, 'check')}`;
    }
  };

  // ================================================================ performance / earnings
  P.agent.performance = {
    title: function () { return t('agent.tabs.performance'); },
    load: function () { return S.analytics.agentPerformance(); },
    render: function (d, ctx) {
      var inv = !ctx.session.provider || ctx.session.provider.services.indexOf('investigation') >= 0;
      var agentSvc = ctx.session.agent ? ctx.session.agent.services : [];
      var showInv = agentSvc.indexOf('investigation') >= 0, showCol = agentSvc.indexOf('collection') >= 0;
      return h`<h1 class="mb-16">${t('agent.performanceTitle')}</h1>
        <div class="kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          ${ui.kpi(t('agent.openTasks'), U.num(d.open))}
          ${ui.kpi(t('agent.completedMonth'), U.num(d.completedThisMonth))}
          ${showInv ? ui.kpi(t('metric.onTime'), ui.pct(d.onTimeRate)) : ''}
          ${showInv ? ui.kpi(t('agent.returnRate'), ui.pct(d.returnRate), null, d.returnRate > 0.2 ? 'warn' : '') : ''}
          ${showInv ? ui.kpi(t('metric.evidence'), ui.pct(d.evidenceRate)) : ''}
          ${showInv ? ui.kpi(t('agent.avgDistance'), d.avgDistanceM == null ? '-' : t('agent.meters', { n: U.num(d.avgDistanceM) })) : ''}
          ${showCol ? ui.kpi(t('agent.collectedMonth'), U.money(d.collectedThisMonth), null, 'ok') : ''}
          ${showCol ? ui.kpi(t('agent.collectedTotal'), U.money(d.collected)) : ''}
          ${showCol ? ui.kpi(t('metric.ptpKept'), h`${U.num(d.promisesKept)} / ${U.num(d.promisesKept + d.promisesBroken)}`) : ''}
        </div>
        ${d.isFreelancer ? h`<a class="btn btn-block" href="#/agent/earnings">${icon('wallet')}${t('agent.tabs.earnings')}</a>` : ''}`;
    }
  };
  P.agent.earnings = {
    title: function () { return t('agent.tabs.earnings'); },
    load: function () { return S.billing.earnings(); },
    render: function (d) { return P.provider.earningsView(d, t('agent.tabs.earnings')); }
  };
})();
