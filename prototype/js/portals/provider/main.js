/* Provider portal (investigation and collection workspaces): dashboard, offers inbox,
   case board, case workspace, assignment and review queue. The route's :service
   parameter selects the workspace. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, C = ICM.config, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.provider = P.provider || {};

  function base(ctx) { return '#/provider/' + ctx.service; }
  function isCompany(ctx) { return ctx.session.provider.kind === 'company'; }
  function isManager(ctx) { return wf.PROVIDER_MANAGER_ROLES.indexOf(ctx.session.user.role) >= 0; }

  function enforcementNotice(p) {
    if (!p || !p.enforcement || p.enforcement.level === 'none') return '';
    var lvl = p.enforcement.level;
    return h`<div class="mb-16">${ui.notice(t('enforcement.notice.' + lvl), lvl === 'warned' ? 'warn' : 'bad', 'shield')}</div>`;
  }

  // ================================================================ dashboard
  P.provider.dashboard = {
    live: true,
    title: function () { return t('nav.dashboard'); },
    load: function (ctx) { return S.analytics.providerDashboard(ctx.service); },
    render: function (d, ctx) {
      var inv = ctx.service === 'investigation';
      var sc = d.score;
      return h`${ui.pageHead(t('provider.dashboard.title', { service: t('service.' + ctx.service) }), ctx.session.provider.name,
        isManager(ctx) ? h`<a class="btn btn-primary" href="${base(ctx)}/offers">${icon('inbox')}${t('nav.offers')}${d.newOffers ? ' (' + d.newOffers + ')' : ''}</a>` : '')}
        ${enforcementNotice(d.provider)}
        <div class="kpis">
          ${ui.kpi(t('kpi.newOffers'), U.num(d.newOffers), null, d.newOffers ? 'warn' : '', base(ctx) + '/offers')}
          ${ui.kpi(t('kpi.openCases'), U.num(d.open), null, null, base(ctx) + '/cases')}
          ${ui.kpi(t('kpi.dueToday'), U.num(d.dueToday), null, d.dueToday ? 'warn' : '')}
          ${ui.kpi(t('kpi.slaAtRisk'), U.num(d.atRisk), null, d.atRisk ? 'warn' : '')}
          ${ui.kpi(t('kpi.slaBreached'), U.num(d.breached), null, d.breached ? 'bad' : '')}
          ${ui.kpi(t('metric.onTime'), ui.pct(d.onTimeRate))}
          ${inv ? ui.kpi(t('kpi.rejectionRate'), ui.pct(d.rejectionRate), t('kpi.rejectionSub')) : ui.kpi(t('kpi.recoveredMonth'), U.money(d.recoveredThisMonth), null, 'ok')}
          ${ui.kpi(t('score.label'), sc && sc.score != null ? U.num(sc.score, 1) : '-', sc ? (sc.isNew ? t('rating.newShort', { n: sc.ratingCount }) : t('rating.avgShort', { avg: U.num(sc.avgRating, 1), n: sc.ratingCount })) : null)}
          ${d.earningsThisMonth == null ? '' : ui.kpi(d.earningsScope === 'team' ? t('kpi.teamEarningsMonth') : t('kpi.earningsMonth'), U.money(d.earningsThisMonth), t('kpi.earningsSub'), null, base(ctx) + '/earnings')}
        </div>
        ${isCompany(ctx) && (d.unassigned || d.reviewQueue) ? h`<div class="row wrap mb-16">${d.unassigned ? h`<a class="btn" href="${base(ctx)}/assignment">${icon('route')}${t('provider.dashboard.unassigned', { n: d.unassigned })}</a>` : ''}${d.reviewQueue ? h`<a class="btn" href="${base(ctx)}/review">${icon('checkSquare')}${t('provider.dashboard.toReview', { n: d.reviewQueue })}</a>` : ''}</div>` : ''}
        <div class="grid cols-2">
          ${ui.card(t('provider.dashboard.byStatus'), Object.keys(d.statusCounts).length ? h`<div class="chart-box"><canvas data-chart="status"></canvas></div>` : ui.empty(t('common.noResults')))}
          ${inv ? ui.card(t('score.breakdown'), sc ? h`<div class="stack"><dl class="dl">
              <dt>${t('score.operational')}</dt><dd>${sc.operational == null ? '-' : U.num(sc.operational, 1)}</dd>
              <dt>${t('score.ratingPart')}</dt><dd>${sc.ratingPart == null ? '-' : U.num(sc.ratingPart, 1)}</dd>
              <dt>${t('metric.onTime')}</dt><dd>${ui.pct(sc.metrics.onTime)}</dd><dt>${t('metric.firstTime')}</dt><dd>${ui.pct(sc.metrics.firstTime)}</dd><dt>${t('metric.evidence')}</dt><dd>${ui.pct(sc.metrics.evidence)}</dd></dl>
              ${ui.criteriaView(sc.criteria)}</div>` : ui.empty(t('score.none')))
            : ui.card(t('provider.dashboard.byBucket'), h`<div class="chart-box"><canvas data-chart="bucket"></canvas></div>`)}
        </div>
        ${!inv ? h`<div class="grid cols-2 mt-16">
          ${ui.card(t('provider.dashboard.promises'), h`<div class="chart-box sm"><canvas data-chart="ptp"></canvas></div>`)}
          ${ui.card(t('score.breakdown'), sc ? h`<div class="stack"><dl class="dl"><dt>${t('score.operational')}</dt><dd>${sc.operational == null ? '-' : U.num(sc.operational, 1)}</dd><dt>${t('score.ratingPart')}</dt><dd>${sc.ratingPart == null ? '-' : U.num(sc.ratingPart, 1)}</dd><dt>${t('metric.recovery')}</dt><dd>${ui.pct(sc.metrics.rawRecovery)}</dd><dt>${t('metric.recoveryNorm')}</dt><dd>${ui.pct(sc.metrics.recovery)}</dd><dt>${t('metric.ptpKept')}</dt><dd>${ui.pct(sc.metrics.ptpKept)}</dd><dt>${t('metric.complaints')}</dt><dd>${ui.pct(sc.metrics.complaintRate)}</dd></dl>${ui.criteriaView(sc.criteria)}</div>` : ui.empty(t('score.none')))}
        </div>` : ''}`;
    },
    after: function (root, d, ctx) {
      var keys = Object.keys(d.statusCounts);
      var cfg = { status: { type: 'bar', data: { labels: keys.map(function (k) { return t('status.' + k); }), datasets: [{ label: t('kpi.openCases'), data: keys.map(function (k) { return d.statusCounts[k]; }) }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } } };
      if (ctx.service === 'collection') {
        cfg.bucket = { type: 'bar', data: { labels: d.byBucket.map(function (b) { return ui.bucket(b.bucket); }), datasets: [{ label: t('metric.recovery'), data: d.byBucket.map(function (b) { return b.rate == null ? 0 : Math.round(b.rate * 100); }) }] }, options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } } };
        cfg.ptp = { type: 'doughnut', data: { labels: [t('status.kept'), t('status.broken'), t('status.pending')], datasets: [{ data: [d.promises.kept, d.promises.broken, d.promises.pending], backgroundColor: ['#1a7446', '#b42318', '#c9ced8'] }] } };
      }
      ui.charts.mount(root, cfg);
    }
  };

  // ================================================================ offers inbox
  function offerCard(o, ctx) {
    var inv = o.service === 'investigation';
    var pending = o.status === 'pending';
    return h`<section class="card ${pending ? 'accent-edge' : ''}">
      <div class="card-h"><div class="row wrap"><strong>${o.batch ? t('offers.batchOffer', { ref: o.batch.ref, n: o.cases.length }) : t('offers.caseOffer', { ref: o.ref })}</strong>${ui.serviceBadge(o.service)}${!pending ? ui.status(o.status === 'accepted' ? 'accepted_offer' : o.status) : ''}</div>
        ${pending ? ui.countdown(o.remaining) : h`<span class="small faint">${U.fmtDateTime(o.respondedAt || o.sentAt)}</span>`}</div>
      <div class="card-b stack">
        <div class="row wrap between"><div class="row wrap"><span class="small muted">${t('offers.from')}</span><strong>${o.entity.name}</strong><span class="small">${t('entityType.' + o.entity.type)}</span></div>
          <div class="row small">${o.entity.clientRating.count ? h`<span>${t('clientRating.dataQuality')}: ${ui.stars(o.entity.clientRating.dataQuality)}</span><span>${t('clientRating.paymentTimeliness')}: ${ui.stars(o.entity.clientRating.paymentTimeliness)}</span>` : h`<span class="faint">${t('clientRating.none')}</span>`}</div></div>
        ${pending ? ui.notice(t('offers.maskedNotice'), 'info', 'lock') : ''}
        ${ui.table([
          { label: t('case.ref'), render: function (c) { return h`<span class="mono">${c.ref}</span>`; } },
          { label: t('address.governorate'), render: function (c) { return ui.gov(c.governorate); } },
          inv ? { label: t('case.inquiryTypes'), render: function (c) { return ui.types(c.inquiryTypes); } } : { label: t('case.dpdBucket'), render: function (c) { return ui.bucket(c.bucket); } },
          inv ? null : { label: t('case.amountRange'), render: function (c) { return c.amountRange ? ui.amountRange(c.amountRange) : U.money(c.overdueAmount); } },
          { label: t('case.deadline'), render: function (c) { return h`<span class="small">${U.fmtDateTime(c.deadline || c.periodEnd || c.dueAt)}</span>`; } },
          { label: inv ? t('case.price') : t('offers.feeTerms'), num: true, render: function (c) { return typeof c.price === 'number' ? U.money(c.price) : c.price ? t('case.feeTerms', { pct: c.price.feePct, fixed: U.money(c.price.fixedFee) }) : '-'; } }
        ].filter(Boolean), o.cases)}
        ${inv && o.cases.length > 1 ? h`<div class="row end small"><span class="muted">${t('offers.total')}</span><strong>${U.money(o.total)}</strong></div>` : ''}
        ${o.status === 'declined' ? h`<p class="small muted">${t('offers.declinedWith', { reason: ui.L('declineReasons', o.declineReason) })}${o.declineNote ? ': ' + o.declineNote : ''}</p>` : ''}
      </div>
      ${pending ? h`<div class="card-f"><button type="button" class="btn btn-danger" data-action="decline" data-id="${o.id}">${t('action.decline')}${o.cases.length > 1 ? ' ' + t('offers.all', { n: o.cases.length }) : ''}</button>
        <button type="button" class="btn btn-primary" data-action="accept" data-id="${o.id}">${icon('check')}${t('action.accept')}${o.cases.length > 1 ? ' ' + t('offers.all', { n: o.cases.length }) : ''}</button></div>` : ''}
    </section>`;
  }

  async function acceptOffer(id, ctx, count) {
    var ok = await ui.confirm({ title: t('offers.acceptTitle'), message: t('offers.acceptBody', { n: count }), confirmLabel: t('action.accept') });
    if (!ok) return false;
    await S.offers.accept(id);
    ui.toast(t('offers.accepted'), 'success');
    return true;
  }
  async function declineOffer(id, ctx) {
    var v = await ui.confirm({
      title: t('offers.declineTitle'), message: t('offers.declineBody'), danger: true, confirmLabel: t('action.decline'),
      reasonOptions: (ui.cfg.lists.declineReasons || []).map(function (r) { return { value: r.id, label: U.label(r) }; }),
      reason: 'optional', reasonLabel: t('common.note')
    });
    if (!v) return false;
    await S.offers.decline(id, v.reasonCode, v.reason);
    ui.toast(t('offers.declined'), 'success');
    return true;
  }
  P.provider.acceptOffer = acceptOffer;
  P.provider.declineOffer = declineOffer;

  P.provider.offers = {
    live: true,
    title: function () { return t('nav.offers'); },
    initState: function () { return { tab: 'pending' }; },
    load: function (ctx) { return S.offers.inbox(ctx.service); },
    render: function (list, ctx) {
      var pending = list.filter(function (o) { return o.status === 'pending'; });
      var history = list.filter(function (o) { return o.status !== 'pending'; });
      var tab = ctx.state.tab;
      var shown = tab === 'pending' ? pending : history;
      return h`${ui.pageHead(t('nav.offers'), t('offers.subtitle', { hours: ui.cfg.pricing.offerWindowHours }))}
        ${ui.tabs([{ id: 'pending', label: t('offers.pending'), count: pending.length }, { id: 'history', label: t('offers.history'), count: history.length }], tab, 'tab')}
        ${shown.length ? h`<div class="stack">${shown.map(function (o) { return offerCard(o, ctx); })}</div>` : ui.card(null, ui.empty(tab === 'pending' ? t('offers.nonePending') : t('offers.noneHistory'), null, 'inbox'))}`;
    },
    actions: {
      tab: function (el, ev, ctx) { ctx.state.tab = el.getAttribute('data-value'); ctx.reload(); },
      accept: async function (el, ev, ctx) {
        var list = await S.offers.inbox(ctx.service);
        var o = list.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (await acceptOffer(o.id, ctx, o.cases.length)) ctx.reload();
      },
      decline: async function (el, ev, ctx) { if (await declineOffer(el.getAttribute('data-id'), ctx)) ctx.reload(); }
    }
  };

  // ================================================================ case board
  var BOARD = {
    investigation: ['accepted', 'rework_requested', 'assigned', 'in_field', 'returned_to_agent', 'submitted_for_review', 'delivered', 'closed'],
    collection: ['accepted', 'assigned', 'active', 'awaiting_entity_approval', 'closed']
  };

  P.provider.cases = {
    live: true,
    title: function () { return t('nav.caseBoard'); },
    initState: function () { return { view: 'board', q: '', gov: '' }; },
    load: function (ctx) { return S.cases.list({ service: ctx.service, q: ctx.state.q, governorate: ctx.state.gov }); },
    render: function (rows, ctx) {
      var st = ctx.state;
      var active = rows.filter(function (c) { return c.status !== 'awaiting_acceptance'; });
      var cols = BOARD[ctx.service];
      var view = st.view === 'board'
        ? h`<div class="kanban">${cols.map(function (s) {
            var items = active.filter(function (c) { return c.status === s; });
            if (s === 'closed') items = items.slice(0, 12);
            return h`<div class="kcol"><div class="kcol-h"><span>${t('status.' + s)}</span><span class="badge b-muted">${items.length}</span></div><div class="kcol-b">${items.map(function (c) {
              return h`<div class="kcard" data-href="${base(ctx)}/cases/${c.id}"><div class="row between"><span class="mono strong">${c.ref}</span>${ui.slaBadge(c)}</div>
                <div>${c.customer && c.customer.name ? c.customer.name : ui.masked(null)}</div>
                <div class="row wrap faint xs">${ui.gov(c.governorate)} · ${c.service === 'investigation' ? ui.types(c.inquiryTypes) : ui.bucket(c.bucket)}</div>
                ${c.agentName ? h`<div class="xs">${icon('user')} ${c.agentName}</div>` : ''}${c.disputed ? ui.badge(t('dispute.flag'), 'danger') : ''}</div>`;
            })}${!items.length ? h`<div class="xs faint center" style="padding:10px">${t('common.empty')}</div>` : ''}</div></div>`;
          })}</div>`
        : ui.card(null, ui.table([
          { label: t('case.ref'), render: function (c) { return h`<span class="mono">${c.ref}</span>${c.batchRef ? h`<div class="sub">${c.batchRef}</div>` : ''}`; } },
          { label: t('case.client'), render: function (c) { return c.entityName; } },
          { label: t('case.customer'), render: function (c) { return c.customer && c.customer.name ? c.customer.name : ui.masked(null); } },
          { label: t('address.governorate'), render: function (c) { return ui.gov(c.governorate); } },
          { label: t('case.agent'), render: function (c) { return c.agentName || '-'; } },
          { label: t('common.status'), render: function (c) { return ui.status(c.status); } },
          { label: t('sla.title'), render: function (c) { return ui.slaBadge(c); } },
          { label: t('case.due'), render: function (c) { return h`<span class="small">${U.fmtDateTime(c.dueAt)}</span>`; } }
        ], active, { href: function (c) { return base(ctx) + '/cases/' + c.id; } }), { flush: true });
      return h`${ui.pageHead(t('nav.caseBoard'), t('cases.count', { n: active.length }), ui.segmented([{ id: 'board', label: t('board.kanban'), icon: 'columns' }, { id: 'table', label: t('board.table'), icon: 'list' }], st.view, 'view'))}
        <div class="filters"><div class="field wide"><label for="bq">${t('common.search')}</label><div class="searchbox">${icon('search')}<input id="bq" class="input" value="${st.q}" data-input="search" placeholder="${t('cases.searchHint')}"></div></div>
          <div class="field"><label>${t('address.governorate')}</label>${ui.select('gov', ui.listOptions('governorates', true), st.gov, { change: 'gov' })}</div></div>
        ${view}`;
    },
    actions: {
      view: function (el, ev, ctx) { ctx.state.view = el.getAttribute('data-value'); ctx.reload(); },
      search: function (el, ev, ctx) { ctx.state.q = el.value; ctx.reload(); },
      gov: function (el, ev, ctx) { ctx.state.gov = el.value; ctx.reload(); }
    }
  };

  // ================================================================ case workspace
  function providerActions(d, ctx) {
    var c = d.case, a = d.actions, out = [], role = ctx.session.user.role;
    if (c.status === 'awaiting_acceptance' && d.offer && isManager(ctx)) {
      out.push(ui.notice(h`${t('offers.openOffer')} ${ui.countdown(d.offer.remaining)}`, 'info', 'inbox'));
      out.push(h`<button type="button" class="btn btn-primary btn-block" data-action="acceptOffer" data-id="${d.offer.id}">${t('action.accept')}</button>`);
      out.push(h`<button type="button" class="btn btn-danger btn-block" data-action="declineOffer" data-id="${d.offer.id}">${t('action.decline')}</button>`);
    }
    if (a.indexOf('assign') >= 0 && role !== 'freelancer') out.push(h`<button type="button" class="btn ${c.agentId ? '' : 'btn-primary'} btn-block" data-action="assign">${icon('user')}${c.agentId ? (c.status === 'rework_requested' ? t('assign.sendBack') : t('assign.reassign')) : t('assign.title')}</button>`);
    if (a.indexOf('assign') >= 0 && role === 'freelancer' && c.status === 'rework_requested') out.push(h`<button type="button" class="btn btn-primary btn-block" data-action="selfAssign">${t('assign.takeBack')}</button>`);
    if (a.indexOf('approve') >= 0 || a.indexOf('return_to_agent') >= 0) out.push(h`<button type="button" class="btn btn-primary btn-block" data-action="review">${icon('checkSquare')}${t('review.open')}</button>`);
    if (c.service === 'investigation' && role === 'freelancer' && ['assigned', 'in_field', 'returned_to_agent'].indexOf(c.status) >= 0) out.push(h`<a class="btn btn-primary btn-block" href="#/agent/tasks/${c.id}">${icon('smartphone')}${t('provider.openInFieldApp')}</a>`);
    if (d.canOperate) {
      out.push(h`<div class="row wrap"><button type="button" class="btn btn-sm" data-action="logAction">${icon('phone')}${t('collection.logAction')}</button>
        <button type="button" class="btn btn-sm" data-action="promise">${icon('calendar')}${t('collection.promise')}</button>
        <button type="button" class="btn btn-sm" data-action="payment">${icon('banknote')}${t('collection.payment')}</button></div>`);
      if (c.status === 'active') out.push(h`<button type="button" class="btn btn-block" data-action="settlement">${icon('handshake')}${t('settlement.request')}</button>`);
    }
    if (c.status === 'awaiting_entity_approval') out.push(ui.notice(t('settlement.waitingEntity'), 'warn', 'clock'));
    if (a.indexOf('close') >= 0 && c.service === 'collection') out.push(h`<button type="button" class="btn btn-danger btn-block" data-action="closeCase">${t('collection.closeCase')}</button>`);
    if (d.canRateClient) out.push(h`<button type="button" class="btn btn-block" data-action="rateClient">${icon('star')}${t('clientRating.rateBtn')}</button>`);
    if (!out.length) out.push(h`<p class="small muted">${t('case.noActions')}</p>`);
    return h`<div class="stack tight">${out}</div>`;
  }

  P.provider.caseDetail = {
    live: true,
    title: function (d) { return d ? d.case.ref : ''; },
    load: function (ctx) { return S.cases.get(ctx.params.id); },
    render: function (d, ctx) {
      return ui.caseView(d, {
        actions: providerActions(d, ctx), showEntity: true,
        crumbs: ui.crumbs([{ label: t('nav.caseBoard'), href: base(ctx) + '/cases' }, { label: d.case.ref }])
      });
    },
    actions: {
      acceptOffer: async function (el, ev, ctx) { if (await acceptOffer(el.getAttribute('data-id'), ctx, 1)) ctx.reload(); },
      declineOffer: async function (el, ev, ctx) { if (await declineOffer(el.getAttribute('data-id'), ctx)) ctx.navigate(base(ctx) + '/offers'); },
      assign: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.assign([d.case.id], d.case.service, d.case.place ? [d.case.place] : d.case.governorate, d.case.agentId)) ctx.reload(); },
      selfAssign: async function (el, ev, ctx) { await S.cases.assign([ctx.params.id], ctx.session.user.agentId); ctx.reload(); },
      review: async function (el, ev, ctx) { if (await ui.flows.review(ctx.params.id)) ctx.reload(); },
      logAction: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.logAction(d.case)) ctx.reload(); },
      promise: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.addPromise(d.case)) ctx.reload(); },
      payment: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.addPayment(d.case)) ctx.reload(); },
      settlement: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.settlement(d.case)) ctx.reload(); },
      closeCase: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.flows.closeCollection(d.case)) ctx.reload(); },
      rateClient: async function (el, ev, ctx) {
        var d = await S.cases.get(ctx.params.id);
        var item = { kind: d.case.batchId ? 'batch' : 'case', id: d.case.batchId || d.case.id, ref: d.case.batchRef || d.case.ref, entityName: d.entity.name };
        if (await ui.flows.rateClient(item)) ctx.reload();
      }
    }
  };

  // ================================================================ assignment
  P.provider.assignment = {
    live: true,
    title: function () { return t('nav.assignment'); },
    initState: function () { return { gov: '', sel: {} }; },
    load: async function (ctx) {
      var r = await Promise.all([S.cases.list({ service: ctx.service, status: ['accepted', 'rework_requested', 'assigned'] }), S.providers.team(ctx.service)]);
      return { cases: r[0], team: r[1] };
    },
    render: function (d, ctx) {
      var st = ctx.state;
      var unassigned = d.cases.filter(function (c) { return c.status !== 'assigned' && (!st.gov || c.governorate === st.gov); });
      var assigned = d.cases.filter(function (c) { return c.status === 'assigned'; });
      var selected = Object.keys(st.sel).filter(function (k) { return st.sel[k] && unassigned.some(function (c) { return c.id === k; }); });
      var govs = U.uniq(d.cases.filter(function (c) { return c.status !== 'assigned'; }).map(function (c) { return c.governorate; }));
      return h`${ui.pageHead(t('nav.assignment'), t('assign.subtitle'), h`<button type="button" class="btn btn-primary" data-action="assignSelected" ${selected.length ? '' : 'disabled'}>${icon('route')}${t('assign.assignSelected', { n: selected.length })}</button>`)}
        <div class="grid side">
          <div class="stack">
            <div class="filters"><div class="field"><label>${t('address.governorate')}</label>${ui.select('gov', [{ value: '', label: t('common.all') }].concat(govs.map(function (g) { return { value: g, label: ui.gov(g) }; })), st.gov, { change: 'gov' })}</div>
              ${govs.length ? h`<p class="small muted" style="align-self:center">${t('assign.routeHint')}</p>` : ''}</div>
            ${ui.card(t('assign.unassigned', { n: unassigned.length }), ui.table([
              { label: h`<input type="checkbox" data-change="selAll" ${selected.length && selected.length === unassigned.length ? 'checked' : ''} aria-label="${t('common.selectAll')}">`, render: function (c) { return h`<input type="checkbox" data-change="sel" data-id="${c.id}" ${st.sel[c.id] ? 'checked' : ''} aria-label="${c.ref}">`; } },
              { label: t('case.ref'), render: function (c) { return h`<a class="mono" href="${base(ctx)}/cases/${c.id}">${c.ref}</a>`; } },
              { label: t('common.status'), render: function (c) { return ui.status(c.status); } },
              { label: t('address.governorate'), render: function (c) { return h`${ui.gov(c.governorate)}<div class="sub">${(c.addresses.home || c.addresses.work || c.addresses.business || {}).city || ''}</div>`; } },
              { label: ctx.service === 'investigation' ? t('case.inquiryTypes') : t('case.dpdBucket'), render: function (c) { return ctx.service === 'investigation' ? ui.types(c.inquiryTypes) : ui.bucket(c.bucket); } },
              { label: t('sla.title'), render: function (c) { return ui.slaBadge(c); } }
            ], unassigned, { empty: t('assign.allAssigned') }), { flush: true })}
            ${ui.card(t('assign.assignedWaiting', { n: assigned.length }), ui.table([
              { label: t('case.ref'), render: function (c) { return h`<span class="mono">${c.ref}</span>`; } },
              { label: t('address.governorate'), render: function (c) { return ui.gov(c.governorate); } },
              { label: t('case.agent'), render: function (c) { return c.agentName; } },
              { label: t('sla.title'), render: function (c) { return ui.slaBadge(c); } }
            ], assigned, { href: function (c) { return base(ctx) + '/cases/' + c.id; }, empty: t('common.empty') }), { flush: true })}
          </div>
          ${ui.card(t('nav.team'), h`<div class="stack tight">${d.team.map(function (a) {
            return h`<div class="stat-row"><span><strong>${a.name}</strong>${a.active ? '' : h` ${ui.badge(t('common.inactive'), 'muted')}`}<div class="xs faint">${a.governorates.map(ui.gov).join(', ')}</div></span><span class="center"><strong>${a.stats.open}</strong><div class="xs faint">${t('assign.open')}</div></span></div>`;
          })}</div>`)}
        </div>`;
    },
    actions: {
      gov: function (el, ev, ctx) { ctx.state.gov = el.value; ctx.reload(); },
      sel: function (el, ev, ctx) { ctx.state.sel[el.getAttribute('data-id')] = el.checked; ctx.reload(); },
      selAll: async function (el, ev, ctx) {
        var d = await P.provider.assignment.load(ctx);
        d.cases.filter(function (c) { return c.status !== 'assigned' && (!ctx.state.gov || c.governorate === ctx.state.gov); }).forEach(function (c) { ctx.state.sel[c.id] = el.checked; });
        ctx.reload();
      },
      assignSelected: async function (el, ev, ctx) {
        var d = await P.provider.assignment.load(ctx);
        var ids = d.cases.filter(function (c) { return c.status !== 'assigned' && ctx.state.sel[c.id]; });
        if (!ids.length) return;
        if (await ui.flows.assign(ids.map(function (c) { return c.id; }), ctx.service, ids.map(function (c) { return c.place; }).filter(Boolean))) { ctx.state.sel = {}; ctx.reload(); }
      }
    }
  };

  // ================================================================ review queue
  P.provider.review = {
    live: true,
    title: function () { return t('nav.reviewQueue'); },
    load: function () { return S.cases.reviewQueue(); },
    render: function (rows) { return P.provider.reviewTable(rows, t('nav.reviewQueue'), t('review.subtitle')); },
    actions: { review: async function (el, ev, ctx) { if (await ui.flows.review(el.getAttribute('data-id'))) ctx.reload(); } }
  };

  P.provider.reviewTable = function (rows, title, sub) {
    return h`${ui.pageHead(title, sub)}${ui.card(null, ui.table([
      { label: t('case.ref'), render: function (c) { return h`<span class="mono">${c.ref}</span>`; } },
      { label: t('case.client'), render: function (c) { return c.entityName; } },
      { label: t('case.inquiryTypes'), render: function (c) { return ui.types(c.inquiryTypes); } },
      { label: t('case.agent'), render: function (c) { return h`${c.agentName}${c.providerKind === 'freelancer' ? h` ${ui.badge(t('kind.freelancer'), 'neutral')}` : ''}`; } },
      { label: t('evidence.title'), render: function (c) { return h`<span class="small">${t('review.evidenceShort', { photos: (c.photos || []).length, min: c.minPhotos, distance: c.checkIn ? U.num(c.checkIn.distanceM) : '-' })}</span>`; } },
      { label: t('review.submitted'), render: function (c) { return h`<span class="small">${U.fmtDateTime(c.reportSubmittedAt)}</span>`; } },
      { label: t('sla.title'), render: function (c) { return ui.slaBadge(c); } },
      { label: '', cls: 'right', render: function (c) { return h`<button type="button" class="btn btn-sm btn-primary" data-action="review" data-id="${c.id}">${t('review.open')}</button>`; } }
    ], rows, { empty: t('review.empty') }), { flush: true })}`;
  };
})();
