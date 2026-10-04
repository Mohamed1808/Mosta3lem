/* Entity portal: dashboard, new request, provider selection, case list and case detail. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, C = ICM.config, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.entity = P.entity || {};

  function serves(ctx, s) { return wf.entityServes(ctx.session.user.role, s); }

  // ================================================================ dashboard
  P.entity.dashboard = {
    live: true,
    title: function () { return t('nav.dashboard'); },
    load: function () { return S.analytics.entityDashboard(); },
    render: function (d, ctx) {
      var inv = d.services.indexOf('investigation') >= 0, col = d.services.indexOf('collection') >= 0;
      var statusKeys = Object.keys(d.statusCounts);
      return h`${ui.pageHead(t('entity.dashboard.title', { name: ctx.session.user.name.split(' ')[0] }), ctx.session.entity.name,
        h`<a class="btn" href="#/client/bulk">${icon('upload')}${t('nav.bulkUpload')}</a><a class="btn btn-primary" href="#/client/new">${icon('plus')}${t('nav.newRequest')}</a>`)}
        <div class="kpis">
          ${ui.kpi(t('kpi.openCases'), U.num(d.open), null, null, '#/client/cases')}
          ${ui.kpi(t('kpi.slaAtRisk'), U.num(d.atRisk), t('kpi.slaAtRiskSub'), d.atRisk ? 'warn' : '')}
          ${ui.kpi(t('kpi.slaBreached'), U.num(d.breached), null, d.breached ? 'bad' : '')}
          ${ui.kpi(t('kpi.deliveredMonth'), U.num(d.deliveredThisMonth))}
          ${col ? ui.kpi(t('kpi.recoveredMonth'), U.money(d.recoveredThisMonth), null, 'ok') : ''}
          ${inv ? ui.kpi(t('kpi.turnaround'), d.avgTurnaroundHours == null ? '-' : t('time.hoursShort', { h: U.num(d.avgTurnaroundHours, 1) }), t('kpi.turnaroundSub')) : ''}
          ${ui.kpi(t('kpi.spendMonth'), U.money(d.spendThisMonth), null, null, '#/client/invoices')}
          ${d.pendingRatings ? ui.kpi(t('kpi.ratingsPending'), U.num(d.pendingRatings), null, 'warn', '#/client/ratings') : ''}
        </div>
        <div class="grid cols-2">
          ${ui.card(t('entity.dashboard.attention'), ui.table([
            { label: t('case.ref'), render: function (c) { return h`<span class="mono">${c.ref}</span>`; } },
            { label: t('case.service'), render: function (c) { return ui.serviceBadge(c.service); } },
            { label: t('common.status'), render: function (c) { return ui.status(c.status); } },
            { label: t('case.provider'), render: function (c) { return c.providerName || '-'; } },
            { label: t('sla.title'), render: function (c) { return ui.slaBadge(c); } }
          ], d.attention, { href: function (c) { return '#/client/cases/' + c.id; }, empty: t('entity.dashboard.nothingPending') }), { flush: true })}
          ${ui.card(t('entity.dashboard.byStatus'), statusKeys.length ? h`<div class="chart-box"><canvas data-chart="status"></canvas></div>` : ui.empty(t('common.noResults')))}
        </div>
        <div class="mt-16">${ui.card(t('entity.dashboard.volume'), h`<div class="chart-box sm"><canvas data-chart="volume"></canvas></div>`)}</div>`;
    },
    after: function (root, d) {
      var keys = Object.keys(d.statusCounts);
      ui.charts.mount(root, {
        status: { type: 'bar', data: { labels: keys.map(function (k) { return t('status.' + k); }), datasets: [{ label: t('kpi.openCases'), data: keys.map(function (k) { return d.statusCounts[k]; }) }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } } } },
        volume: { type: 'bar', data: { labels: d.series.map(function (s) { return U.fmtMonth(s.month); }), datasets: [{ label: t('entity.dashboard.created'), data: d.series.map(function (s) { return s.created; }) }, { label: t('entity.dashboard.closed'), data: d.series.map(function (s) { return s.closed; }) }] } }
      });
    }
  };

  // ================================================================ new request
  function defaultValues(service, now) {
    if (service === 'investigation') return { inquiryTypes: ['residence'], deadline: U.toLocalInput(now + 48 * U.HOUR) };
    return { allowedActions: ['calls', 'messages', 'visits'], settlementMode: 'none', periodEnd: U.toDateInput(now + (ui.cfg.pricing.defaultCollectionDays || 30) * U.DAY) };
  }
  function slaHoursFor(types) {
    var list = ui.cfg.lists.inquiryTypes;
    return Math.max.apply(null, [24].concat((types || []).map(function (id) { var x = list.filter(function (i) { return i.id === id; })[0]; return x ? x.defaultSlaHours : 48; })));
  }

  P.entity.newRequest = {
    title: function () { return t('nav.newRequest'); },
    load: async function (ctx) {
      var clock = await S.demo.clock();
      var draft = ctx.query.draft ? await S.cases.get(ctx.query.draft) : null;
      return { now: clock.now, draft: draft };
    },
    render: function (d, ctx) {
      var st = ctx.state;
      var draft = d.draft && d.draft.case;
      var service = draft ? draft.service : (ctx.query.service || st.service);
      var allowedServices = ['investigation', 'collection'].filter(function (s) { return serves(ctx, s); });
      if (!service && allowedServices.length === 1) service = allowedServices[0];
      var steps = h`<div class="step-list">
        <div class="step ${service ? 'done' : 'on'}"><span class="n">1</span>${t('request.stepService')}</div><div class="step-sep"></div>
        <div class="step ${service ? 'on' : ''}"><span class="n">2</span>${t('request.stepDetails')}</div><div class="step-sep"></div>
        <div class="step"><span class="n">3</span>${t('request.stepProvider')}</div></div>`;
      if (!service) {
        return h`${ui.pageHead(t('nav.newRequest'), t('request.subtitle'))}${steps}
          <div class="choice-cards">${allowedServices.map(function (s) {
            return h`<button type="button" class="choice" data-action="chooseService" data-value="${s}">${icon(s === 'investigation' ? 'search' : 'coins')}<span><strong>${t('service.' + s)}</strong><br><span class="small muted">${t('request.serviceHint.' + s)}</span></span></button>`;
          })}</div>`;
      }
      var def = service === 'investigation' ? C.FORMS.investigationRequest : C.FORMS.collectionRequest;
      var values = st.values && st.values._service === service ? st.values : (draft ? draft.formValues : defaultValues(service, d.now));
      return h`${ui.pageHead(draft ? t('request.editDraft', { ref: draft.ref }) : t('request.newTitle', { service: t('service.' + service) }), t('request.formSubtitle'),
        draft ? '' : h`<button type="button" class="btn btn-ghost" data-action="chooseService" data-value="">${icon('chevronLeft')}${t('request.changeService')}</button>`)}
        ${steps}
        <form data-submit="submitRequest" class="card" novalidate><div class="card-b">
          ${st.errors && Object.keys(st.errors).length ? ui.notice(t('errors.fixHighlighted'), 'bad') : ''}
          ${ui.forms.render('request', def, values, st.errors, {
            onChange: function (vals, box) {
              if (service !== 'investigation') return;
              var key = (vals.inquiryTypes || []).join(',');
              if (st.lastTypes !== undefined && st.lastTypes !== key) {
                var dl = box.querySelector('[name="deadline"]');
                if (dl) dl.value = U.toLocalInput(d.now + slaHoursFor(vals.inquiryTypes) * U.HOUR);
              }
              st.lastTypes = key;
            }
          })}
          ${service === 'investigation' ? h`<p class="hint small faint mt-8">${t('request.deadlineHint')}</p>` : h`<p class="hint small faint mt-8">${t('request.bucketHint')}</p>`}
        </div><div class="card-f">
          <input type="hidden" name="_service" value="${service}"><input type="hidden" name="_draft" value="${draft ? draft.id : ''}">
          <a class="btn" href="#/client/cases">${t('common.cancel')}</a>
          <button type="submit" class="btn" name="_mode" value="draft" data-action="setMode" data-value="draft">${t('request.saveDraft')}</button>
          <button type="submit" class="btn btn-primary" data-action="setMode" data-value="select">${t('request.continue')}${icon('arrowRight')}</button>
        </div></form>`;
    },
    actions: {
      chooseService: function (el, ev, ctx) { ctx.state.service = el.getAttribute('data-value') || null; ctx.state.values = null; ctx.state.errors = null; ctx.navigate('#/client/new' + (ctx.state.service ? '?service=' + ctx.state.service : '')); },
      setMode: function (el, ev, ctx) {
        ctx.state.mode = el.getAttribute('data-value');
        var form = el.closest('form');
        if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      },
      submitRequest: async function (form, ev, ctx) {
        var service = form.querySelector('[name=_service]').value;
        var draftId = form.querySelector('[name=_draft]').value;
        var def = service === 'investigation' ? C.FORMS.investigationRequest : C.FORMS.collectionRequest;
        var box = form.querySelector('[data-form-key]');
        var values = ui.forms.collect(box, def);
        values._service = service;
        var clock = await S.demo.clock();
        var errors = ui.forms.validate(def, values, { now: clock.now, governorates: ui.cfg.lists.governorates.map(function (g) { return g.id; }) });
        ctx.state.values = values;
        if (Object.keys(errors).length) { ctx.state.errors = errors; ui.toast(t('errors.fixHighlighted'), 'danger'); return ctx.reload(); }
        ctx.state.errors = null;
        try {
          var c = draftId ? await S.cases.updateDraft(draftId, values) : await S.cases.createDraft(service, values);
          ICM.app.pageState = {};
          if (ctx.state.mode === 'draft') { ui.toast(t('request.draftSaved', { ref: c.ref }), 'success'); ctx.navigate('#/client/cases/' + c.id); }
          else ctx.navigate('#/client/cases/' + c.id + '/select');
        } catch (e) {
          if (e.key === 'errors.formInvalid' && e.params) { ctx.state.errors = e.params.errors; ctx.reload(); }
          ui.fail(e);
        }
      }
    }
  };

  // ================================================================ provider selection
  var AVAIL_ORDER = { high: 0, medium: 1, low: 2 };

  function providerRow(p, c, top) {
    var m = p.metrics || {};
    var price = c.service === 'investigation' ? U.money(p.price) : t('select.feeText', { pct: p.feePct, fixed: U.money(p.fixedFee) });
    return h`<div class="provider-card ${top ? 'top' : ''}">
      <div class="stack tight">
        <div class="row wrap"><strong style="font-size:15px">${p.name}</strong>${ui.kindBadge(p.kind)}${ui.verified()}${p.enforcement === 'warned' || p.enforcement === 'reduced' ? ui.status(p.enforcement, 'enforcement') : ''}${top ? ui.badge(t('select.bestMatch'), 'success') : ''}</div>
        <div class="row wrap">${ui.scoreBox(p.score)}${ui.rating(p.avgRating, p.ratingCount, p.isNew)}${ui.avail(p.availability)}</div>
        <div class="metrics">
          ${c.service === 'investigation'
            ? h`<span>${t('metric.onTime')} <b>${ui.pct(m.onTime)}</b></span><span>${t('metric.firstTime')} <b>${ui.pct(m.firstTime)}</b></span><span>${t('metric.evidence')} <b>${ui.pct(m.evidence)}</b></span>`
            : h`<span>${t('metric.recovery')} <b>${ui.pct(m.rawRecovery)}</b></span><span>${t('metric.onTime')} <b>${ui.pct(m.onTime)}</b></span><span>${t('metric.ptpKept')} <b>${ui.pct(m.ptpKept)}</b></span>`}
          <span>${t('select.sla')} <b>${t('time.hoursShort', { h: p.slaHours })}</b></span>
          <span>${t('select.spare')} <b>${U.num(p.spare)}</b></span>
        </div>
        ${!p.isNew ? h`<div style="max-width:560px">${ui.criteriaView(p.criteria)}</div>` : ''}
      </div>
      <div class="stack tight" style="align-items:flex-end">
        <div class="price">${price}</div><div class="xs faint">${c.service === 'investigation' ? t('select.perCase') : t('select.feeTerms')}</div>
        <div class="row"><button type="button" class="btn btn-sm" data-action="profile" data-id="${p.id}">${icon('eye')}${t('select.profile')}</button>
        <button type="button" class="btn btn-sm btn-primary" data-action="pick" data-id="${p.id}">${t('select.select')}</button></div>
      </div>
    </div>`;
  }

  function sortProviders(list, sort) {
    var l = list.slice();
    if (sort === 'score') return U.sortBy(l, function (p) { return p.score; }, true);
    if (sort === 'price') return U.sortBy(l, function (p) { return p.price; });
    if (sort === 'availability') return l.sort(function (a, b) { return AVAIL_ORDER[a.availability] - AVAIL_ORDER[b.availability] || b.rank - a.rank; });
    if (sort === 'sla') return U.sortBy(l, function (p) { return p.slaHours; });
    return l;
  }
  function filterProviders(list, f) {
    return list.filter(function (p) {
      if (f.kind && p.kind !== f.kind) return false;
      if (f.minRating && (p.avgRating == null || p.avgRating < +f.minRating)) return false;
      if (f.priceMin && p.price < +f.priceMin) return false;
      if (f.priceMax && p.price > +f.priceMax) return false;
      return true;
    });
  }

  async function sendOffer(ctx, d, providerId) {
    var c = d.case;
    var p = d.market.providers.filter(function (x) { return x.id === providerId; })[0];
    var price = c.service === 'investigation' ? U.money(p.price) : t('select.feeText', { pct: p.feePct, fixed: U.money(p.fixedFee) });
    var ok = await ui.confirm({ title: t('select.confirmTitle'), message: t('select.confirmBody', { name: p.name, price: price, hours: ui.cfg.pricing.offerWindowHours }), confirmLabel: t('select.sendOffer') });
    if (!ok) return;
    await S.cases.sendOffer(c.id, providerId);
    ui.toast(t('select.offerSent', { name: p.name }), 'success');
    ctx.navigate('#/client/cases/' + c.id);
  }

  P.entity.select = {
    title: function () { return t('select.title'); },
    initState: function () { return { sort: 'rank', f: {} }; },
    load: async function (ctx) {
      var d = await S.cases.get(ctx.params.id);
      var c = d.case;
      var demand = {}; demand[c.governorate] = 1;
      d.market = await S.marketplace.eligible({ service: c.service, demand: demand, inquiryTypes: c.inquiryTypes, bucket: c.bucket, caseId: c.id });
      return d;
    },
    render: function (d, ctx) {
      var c = d.case, st = ctx.state;
      var selectable = ['draft', 'submitted', 'declined', 'expired'].indexOf(c.status) >= 0;
      var head = ui.pageHead(t('select.title'), h`<span class="row wrap"><span class="mono">${c.ref}</span>${ui.serviceBadge(c.service)}<span>${c.service === 'investigation' ? ui.types(c.inquiryTypes) : ui.bucket(c.bucket)}</span><span>· ${ui.gov(c.governorate)}</span><span>· ${t('case.deadline')}: ${U.fmtDateTime(c.deadline || c.periodEnd)}</span></span>`,
        selectable && d.market.providers.length ? h`<button type="button" class="btn btn-primary" data-action="autoBest">${icon('zap')}${t('select.autoBest')}</button>` : '',
        ui.crumbs([{ label: t('nav.cases'), href: '#/client/cases' }, { label: c.ref, href: '#/client/cases/' + c.id }, { label: t('select.title') }]));
      if (!selectable) return h`${head}${ui.notice(t('select.notSelectable', { status: t('status.' + c.status) }), 'warn')}<div class="mt-12"><a class="btn" href="#/client/cases/${c.id}">${t('select.backToCase')}</a></div>`;
      var list = sortProviders(filterProviders(d.market.providers, st.f), st.sort);
      var best = d.market.providers[0];
      var ex = d.market.excluded || {};
      return h`${head}
        ${c.status === 'declined' ? ui.notice(t('select.afterDecline'), 'warn') : c.status === 'expired' ? ui.notice(t('select.afterExpiry'), 'warn') : ''}
        <div class="card mt-12"><div class="card-b">
          <div class="row between wrap">
            <div class="row wrap"><span class="small muted">${t('select.sortBy')}</span>${ui.segmented([
              { id: 'rank', label: t('select.sort.rank') }, { id: 'score', label: t('select.sort.score') }, { id: 'price', label: t('select.sort.price') },
              { id: 'availability', label: t('select.sort.availability') }, { id: 'sla', label: t('select.sort.sla') }], st.sort, 'sort')}</div>
            <div class="small muted">${t('select.eligibleCount', { n: d.market.providers.length })}${ex.full ? ' · ' + t('select.hiddenFull', { n: ex.full }) : ''}${ex.suspended ? ' · ' + t('select.hiddenSuspended', { n: ex.suspended }) : ''}${ex.documents ? ' · ' + t('select.hiddenDocuments', { n: ex.documents }) : ''}</div>
          </div>
          <div class="filters mt-12">
            <div class="field"><label>${t('select.type')}</label>${ui.select('kind', [{ value: '', label: t('common.all') }, { value: 'company', label: t('kind.company') }, { value: 'freelancer', label: t('kind.freelancer') }], st.f.kind, { change: 'filter' })}</div>
            <div class="field"><label>${t('select.minRating')}</label>${ui.select('minRating', [{ value: '', label: t('common.any') }, { value: '3', label: '3+' }, { value: '4', label: '4+' }, { value: '4.5', label: '4.5+' }], st.f.minRating, { change: 'filter' })}</div>
            <div class="field"><label>${c.service === 'investigation' ? t('select.priceMin') : t('select.feeMin')}</label><input class="input" type="number" name="priceMin" value="${st.f.priceMin || ''}" data-change="filter"></div>
            <div class="field"><label>${c.service === 'investigation' ? t('select.priceMax') : t('select.feeMax')}</label><input class="input" type="number" name="priceMax" value="${st.f.priceMax || ''}" data-change="filter"></div>
            ${Object.keys(st.f).some(function (k) { return st.f[k]; }) ? h`<button type="button" class="btn btn-ghost btn-sm" data-action="clearFilters">${t('common.clearFilters')}</button>` : ''}
          </div>
        </div></div>
        <div class="card mt-12"><div class="card-b flush">${list.length ? list.map(function (p) { return providerRow(p, c, best && p.id === best.id && st.sort === 'rank'); }) : ui.empty(t('select.noneEligible'), null, 'search')}</div></div>`;
    },
    actions: {
      sort: function (el, ev, ctx) { ctx.state.sort = el.getAttribute('data-value'); ctx.reload(); },
      filter: function (el, ev, ctx) { ctx.state.f[el.name] = el.value; ctx.reload(); },
      clearFilters: function (el, ev, ctx) { ctx.state.f = {}; ctx.reload(); },
      profile: async function (el, ev, ctx) {
        var id = el.getAttribute('data-id');
        var d = await P.entity.select.load(ctx);
        ui.dialogs.providerProfile(id, d.case.service, function (pid) { sendOffer(ctx, d, pid).catch(ui.fail); });
      },
      pick: async function (el, ev, ctx) { var d = await P.entity.select.load(ctx); await sendOffer(ctx, d, el.getAttribute('data-id')); },
      autoBest: async function (el, ev, ctx) {
        var d = await P.entity.select.load(ctx);
        if (!d.market.providers.length) return ui.toast(t('select.noneEligible'), 'danger');
        await sendOffer(ctx, d, d.market.providers[0].id);
      }
    }
  };

  // ================================================================ case list
  P.entity.cases = {
    live: true,
    title: function () { return t('nav.cases'); },
    initState: function () { return { f: {} }; },
    load: async function (ctx) {
      var f = Object.assign({}, ctx.state.f);
      if (f.from) f.from = new Date(f.from).getTime();
      if (f.to) f.to = U.endOfDay(new Date(f.to).getTime());
      if (ctx.query.batch && !ctx.state.f.batchId) f.batchId = ctx.query.batch;
      var res = await Promise.all([S.cases.list(f), S.cases.list({}), S.batches.list()]);
      return { rows: res[0], all: res[1], batches: res[2] };
    },
    render: function (d, ctx) {
      var f = ctx.state.f;
      var services = ['investigation', 'collection'].filter(function (s) { return serves(ctx, s); });
      var statuses = U.uniq((services.length > 1 ? C.INVESTIGATION_STATUSES.concat(C.COLLECTION_STATUSES) : services[0] === 'investigation' ? C.INVESTIGATION_STATUSES : C.COLLECTION_STATUSES));
      var providers = U.uniq(d.all.filter(function (c) { return c.providerId; }).map(function (c) { return c.providerId + '|' + c.providerName; }));
      return h`${ui.pageHead(t('nav.cases'), t('cases.count', { n: d.rows.length }), h`${serves(ctx, 'investigation') ? h`<button type="button" class="btn" data-action="exportInv" title="${t('export.hint')}">${icon('download')}${t('export.button')}</button>` : ''}<a class="btn btn-primary" href="#/client/new">${icon('plus')}${t('nav.newRequest')}</a>`)}
        <div class="filters">
          <div class="field wide"><label for="q">${t('common.search')}</label><div class="searchbox">${icon('search')}<input id="q" class="input" name="q" value="${f.q || ''}" placeholder="${t('cases.searchHint')}" data-input="filterText"></div></div>
          ${services.length > 1 ? h`<div class="field"><label>${t('case.service')}</label>${ui.select('service', [{ value: '', label: t('common.all') }].concat(services.map(function (s) { return { value: s, label: t('service.' + s) }; })), f.service, { change: 'filter' })}</div>` : ''}
          <div class="field"><label>${t('common.status')}</label>${ui.select('status', [{ value: '', label: t('common.all') }].concat(statuses.map(function (s) { return { value: s, label: t('status.' + s) }; })), f.status, { change: 'filter' })}</div>
          <div class="field"><label>${t('case.provider')}</label>${ui.select('providerId', [{ value: '', label: t('common.all') }].concat(providers.map(function (p) { var x = p.split('|'); return { value: x[0], label: x[1] }; })), f.providerId, { change: 'filter' })}</div>
          <div class="field"><label>${t('address.governorate')}</label>${ui.select('governorate', ui.listOptions('governorates', true), f.governorate, { change: 'filter' })}</div>
          <div class="field"><label>${t('nav.batches')}</label>${ui.select('batchId', [{ value: '', label: t('common.all') }].concat(d.batches.map(function (b) { return { value: b.id, label: b.ref }; })), f.batchId || ctx.query.batch, { change: 'filter' })}</div>
          <div class="field"><label>${t('sla.title')}</label>${ui.select('sla', [{ value: '', label: t('common.all') }].concat(['on_track', 'at_risk', 'breached', 'met', 'missed'].map(function (s) { return { value: s, label: t('sla.' + s) }; })), f.sla, { change: 'filter' })}</div>
          <div class="field"><label>${t('common.from')}</label><input class="input" type="date" name="from" value="${f.from || ''}" data-change="filter"></div>
          <div class="field"><label>${t('common.to')}</label><input class="input" type="date" name="to" value="${f.to || ''}" data-change="filter"></div>
          ${Object.keys(f).some(function (k) { return f[k]; }) ? h`<button type="button" class="btn btn-ghost btn-sm" data-action="clearFilters">${t('common.clearFilters')}</button>` : ''}
        </div>
        ${ui.card(null, P.entity.caseTable(d.rows, '#/client/cases/'), { flush: true })}`;
    },
    actions: {
      filter: function (el, ev, ctx) { ctx.state.f[el.name] = el.value; ctx.reload(); },
      filterText: function (el, ev, ctx) { ctx.state.f.q = el.value; ctx.reload(); },
      clearFilters: function (el, ev, ctx) { ctx.state.f = {}; ctx.navigate('#/client/cases'); },
      exportInv: async function (el, ev, ctx) {
        var f = Object.assign({}, ctx.state.f);
        if (f.from) f.from = new Date(f.from).getTime();
        if (f.to) f.to = U.endOfDay(new Date(f.to).getTime());
        await ui.exportInvestigations(f);
      }
    }
  };

  P.entity.caseTable = function (rows, base, opts) {
    opts = opts || {};
    return ui.table([
      { label: t('case.ref'), render: function (c) { return h`<span class="mono">${c.ref}</span>${c.batchRef ? h`<div class="sub">${c.batchRef}</div>` : ''}`; } },
      { label: t('case.customer'), render: function (c) { return c.customer && c.customer.name ? c.customer.name : ui.masked(null); } },
      { label: t('case.service'), render: function (c) { return h`${ui.serviceBadge(c.service)}<div class="sub">${c.service === 'investigation' ? ui.types(c.inquiryTypes) : ui.bucket(c.bucket)}</div>`; } },
      { label: t('address.governorate'), render: function (c) { return ui.gov(c.governorate); } },
      opts.entity ? { label: t('case.client'), render: function (c) { return c.entityName; } } : { label: t('case.provider'), render: function (c) { return c.providerName || h`<span class="faint">-</span>`; } },
      { label: t('common.status'), render: function (c) { return h`${ui.status(c.status)}${c.disputed ? h` ${ui.badge(t('dispute.flag'), 'danger')}` : ''}`; } },
      { label: t('sla.title'), render: function (c) { return ui.slaBadge(c); } },
      { label: t('common.updated'), render: function (c) { return h`<span class="small nowrap">${U.fmtDateTime(c.updatedAt || c.createdAt)}</span>`; } }
    ], rows, { href: function (c) { return base + c.id; }, empty: t('cases.none') });
  };

  // ================================================================ case detail
  function entityActions(d) {
    var c = d.case, a = d.actions, out = [];
    if (c.status === 'draft') {
      out.push(h`<a class="btn btn-primary btn-block" href="#/client/cases/${c.id}/select">${t('request.continue')}</a>`);
      out.push(h`<a class="btn btn-block" href="#/client/new?draft=${c.id}">${icon('edit')}${t('request.editDraftBtn')}</a>`);
    }
    if (a.indexOf('send_offer') >= 0) {
      if (c.status === 'declined') out.push(ui.notice(t('case.declinedNotice', { reason: c.lastDecline ? U.label((ui.cfg.lists.declineReasons || []).filter(function (r) { return r.id === c.lastDecline.reason; })[0]) : '-' }), 'warn'));
      if (c.status === 'expired') out.push(ui.notice(t('case.expiredNotice'), 'warn'));
      out.push(h`<a class="btn btn-primary btn-block" href="#/client/cases/${c.id}/select">${icon('users')}${t('case.selectProvider')}</a>`);
    }
    if (c.status === 'awaiting_acceptance') out.push(ui.notice(h`${t('case.awaitingNotice', { name: d.provider ? d.provider.name : '' })} ${d.offer ? ui.countdown(d.offer.remaining) : ''}`, 'info', 'clock'));
    if (a.indexOf('accept_report') >= 0) {
      out.push(h`<button type="button" class="btn btn-primary btn-block" data-action="acceptReport">${icon('check')}${t('action.accept_report')}</button>`);
      out.push(h`<button type="button" class="btn btn-block" data-action="requestRework">${icon('repeat')}${t('action.request_rework')}</button>`);
    }
    if (a.indexOf('approve_settlement') >= 0) {
      var s = (c.settlements || []).filter(function (x) { return x.status === 'pending'; })[0];
      if (s) out.push(ui.notice(h`<strong>${s.kind === 'discount' ? t('settlement.discountText', { pct: s.discountPct }) : t('settlement.instalmentsText', { count: s.instalmentCount })}</strong><div class="small">${s.note}</div>${s.kind === 'discount' ? h`<div class="small">${t('settlement.newTarget', { amount: U.money(Math.round(c.overdueAmount * (1 - s.discountPct / 100))) })}</div>` : ''}`, 'warn', 'handshake'));
      out.push(h`<button type="button" class="btn btn-primary btn-block" data-action="approveSettlement">${t('action.approve_settlement')}</button>`);
      out.push(h`<button type="button" class="btn btn-block" data-action="rejectSettlement">${t('action.reject_settlement')}</button>`);
    }
    if (c.service === 'investigation' && ['delivered', 'accepted_by_entity', 'closed'].indexOf(c.status) >= 0) {
      var cur = c.clientDecision ? c.clientDecision.value : 'PENDING';
      out.push(h`<div class="decision-box"><div class="small muted mb-8">${t('decision.title')}</div><div class="decision-btns">${ICM.config.CLIENT_DECISIONS.map(function (dv) {
        return h`<button type="button" class="btn btn-sm ${cur === dv ? 'on d-' + dv.toLowerCase() : ''}" data-action="setDecision" data-value="${dv}" aria-pressed="${cur === dv ? 'true' : 'false'}">${t('decision.' + dv)}</button>`;
      })}</div><div class="xs faint mt-8">${t('decision.hint')}</div></div>`);
    }
    if (d.canRate) out.push(h`<button type="button" class="btn btn-primary btn-block" data-action="rate">${icon('star')}${t('rating.rateProvider', { name: d.provider.name })}</button>`);
    if (c.status === 'closed' && c.batchId && !c.ratingId) out.push(ui.notice(h`${t('case.rateViaBatch')} <a href="#/client/batches/${c.batchId}">${c.batchRef}</a>`, 'info'));
    if (a.indexOf('recall') >= 0) out.push(h`<button type="button" class="btn btn-danger btn-block" data-action="recall">${t('action.recall')}</button>`);
    if (a.indexOf('cancel') >= 0) out.push(h`<button type="button" class="btn btn-danger btn-block" data-action="cancel">${t('action.cancel')}</button>`);
    if (d.canDispute) out.push(h`<button type="button" class="btn btn-ghost btn-block" data-action="dispute">${icon('scale')}${t('dispute.raise')}</button>`);
    if (!out.length) out.push(h`<p class="small muted">${t('case.noActions')}</p>`);
    return h`<div class="stack tight">${out}</div>`;
  }

  P.entity.caseDetail = {
    live: true,
    title: function (d) { return d ? d.case.ref : t('nav.cases'); },
    load: function (ctx) { return S.cases.get(ctx.params.id); },
    render: function (d) {
      return ui.caseView(d, { actions: entityActions(d), crumbs: ui.crumbs([{ label: t('nav.cases'), href: '#/client/cases' }, { label: d.case.ref }]) });
    },
    actions: {
      acceptReport: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('case.acceptReportTitle'), message: t('case.acceptReportBody'), confirmLabel: t('action.accept_report') });
        if (!ok) return;
        await S.cases.transition(ctx.params.id, 'accept_report');
        ui.toast(t('case.reportAccepted'), 'success');
        var d = await S.cases.get(ctx.params.id);
        await ctx.reload();
        if (d.canRate) { await ui.dialogs.rateCase(d); ctx.reload(); }
      },
      requestRework: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('action.request_rework'), message: t('case.reworkBody'), reason: 'required', reasonLabel: t('case.reworkReasonLabel'), confirmLabel: t('action.request_rework') });
        if (!v) return;
        await S.cases.transition(ctx.params.id, 'request_rework', { reason: v.reason });
        ui.toast(t('case.reworkSent'), 'success'); ctx.reload();
      },
      approveSettlement: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('action.approve_settlement'), message: t('settlement.approveBody'), reason: 'optional', reasonLabel: t('common.note'), confirmLabel: t('action.approve_settlement') });
        if (!v) return;
        await S.cases.transition(ctx.params.id, 'approve_settlement', { note: v.reason });
        ui.toast(t('settlement.approved'), 'success'); ctx.reload();
      },
      rejectSettlement: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('action.reject_settlement'), reason: 'required', confirmLabel: t('action.reject_settlement'), danger: true });
        if (!v) return;
        await S.cases.transition(ctx.params.id, 'reject_settlement', { reason: v.reason });
        ui.toast(t('settlement.rejected'), 'success'); ctx.reload();
      },
      recall: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('action.recall'), message: t('case.recallBody'), reason: 'required', confirmLabel: t('action.recall'), danger: true });
        if (!v) return;
        await S.cases.transition(ctx.params.id, 'recall', { reason: v.reason });
        ui.toast(t('case.recalled'), 'success'); ctx.reload();
      },
      cancel: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('action.cancel'), message: t('case.cancelBody'), reason: 'optional', confirmLabel: t('action.cancel'), danger: true });
        if (!v) return;
        await S.cases.transition(ctx.params.id, 'cancel', { reason: v.reason });
        ui.toast(t('case.cancelled'), 'success'); ctx.reload();
      },
      setDecision: async function (el, ev, ctx) {
        var dv = el.getAttribute('data-value');
        var v = await ui.confirm({ title: t('decision.setTitle', { decision: t('decision.' + dv) }), message: t('decision.setBody'), reason: dv === 'REJECTED' ? 'required' : 'optional', reasonLabel: t('common.note'), confirmLabel: t('common.confirm'), danger: dv === 'REJECTED' });
        if (!v) return;
        await S.cases.setClientDecision(ctx.params.id, dv, v.reason);
        ui.toast(t('decision.saved'), 'success'); ctx.reload();
      },
      rate: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.dialogs.rateCase(d)) ctx.reload(); },
      dispute: async function (el, ev, ctx) { var d = await S.cases.get(ctx.params.id); if (await ui.dialogs.dispute('case', d.case.id, d.case.ref)) ctx.reload(); }
    }
  };
})();
