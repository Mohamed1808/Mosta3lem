/* Platform admin portal: overview, onboarding, providers, entities, cases, QA queue,
   disputes and ratings moderation. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, C = ICM.config, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.admin = P.admin || {};

  // ================================================================ overview
  P.admin.overview = {
    live: true,
    title: function () { return t('nav.overview'); },
    load: function () { return S.analytics.adminOverview(); },
    render: function (d) {
      function provRow(p) { return h`<div class="stat-row"><a href="#/admin/providers/${p.id}">${p.name}</a><span class="row">${p.enforcement !== 'none' ? ui.status(p.enforcement, 'enforcement') : ''}${ui.scoreBox(p.score)}</span></div>`; }
      return h`${ui.pageHead(t('admin.overviewTitle'), ICM.config.PLATFORM_NAME)}
        <div class="kpis">
          ${ui.kpi(t('admin.gmvMonth'), U.money(d.gmvMonth), t('admin.gmvTotal', { amount: U.money(d.gmvTotal) }))}
          ${ui.kpi(t('admin.revenueMonth'), U.money(d.platformRevenueMonth))}
          ${ui.kpi(t('kpi.slaBreached'), U.num(d.breachedNow), t('admin.missedTotal', { n: d.missedTotal }), d.breachedNow ? 'bad' : '')}
          ${ui.kpi(t('kpi.slaAtRisk'), U.num(d.atRiskNow), null, d.atRiskNow ? 'warn' : '')}
          ${ui.kpi(t('admin.activeEntities'), h`${U.num(d.activeEntities)} / ${U.num(d.totalEntities)}`, null, null, '#/admin/entities')}
          ${ui.kpi(t('admin.activeProviders'), U.num(d.activeProviders), d.suspendedProviders ? t('admin.suspendedN', { n: d.suspendedProviders }) : null, null, '#/admin/providers')}
          ${ui.kpi(t('admin.openDisputes'), U.num(d.openDisputes), null, d.openDisputes ? 'warn' : '', '#/admin/disputes')}
          ${ui.kpi(t('nav.qaQueue'), U.num(d.qaQueue), null, d.qaQueue ? 'warn' : '', '#/admin/qa')}
          ${ui.kpi(t('nav.onboarding'), U.num(d.pendingApplications), null, null, '#/admin/onboarding')}
        </div>
        <div class="grid cols-2 mb-16">
          ${ui.card(t('admin.casesByStatus'), h`<div class="chart-box"><canvas data-chart="status"></canvas></div>`)}
          ${ui.card(t('admin.gmvSeries'), h`<div class="chart-box"><canvas data-chart="gmv"></canvas></div>`)}
        </div>
        <div class="grid cols-2">
          ${ui.card(t('admin.topProviders'), h`<div>${d.top.map(provRow)}</div>`)}
          ${ui.card(t('admin.bottomProviders'), h`<div>${d.bottom.map(provRow)}</div>`)}
        </div>`;
    },
    after: function (root, d) {
      var statuses = U.uniq(Object.keys(d.byStatus.investigation).concat(Object.keys(d.byStatus.collection)));
      ui.charts.mount(root, {
        status: { type: 'bar', data: { labels: statuses.map(function (s) { return t('status.' + s); }), datasets: [
          { label: t('service.investigation'), data: statuses.map(function (s) { return d.byStatus.investigation[s] || 0; }) },
          { label: t('service.collection'), data: statuses.map(function (s) { return d.byStatus.collection[s] || 0; }) }] }, options: { indexAxis: 'y', scales: { x: { stacked: true }, y: { stacked: true } } } },
        gmv: { type: 'line', data: { labels: d.gmvSeries.map(function (m) { return U.fmtMonth(m.month); }), datasets: [{ label: t('admin.gmv'), data: d.gmvSeries.map(function (m) { return m.gmv; }), tension: 0.25, fill: false }] }, options: { plugins: { legend: { display: false } } } }
      });
    }
  };

  // ================================================================ onboarding
  P.admin.onboarding = {
    title: function () { return t('nav.onboarding'); },
    load: function () { return S.providers.applications(); },
    render: function (apps) {
      return h`${ui.pageHead(t('nav.onboarding'), t('onboarding.subtitle'), h`<a class="btn btn-primary" href="#/admin/onboarding/new">${icon('plus')}${t('reg.adminTitle')}</a>`)}
        ${apps.length ? h`<div class="stack">${apps.map(function (p) {
          var fl = p.kind === 'freelancer';
          var reg = p.registration || {};
          return h`<section class="card"><div class="card-h"><div class="row wrap"><strong>${p.name}</strong>${ui.kindBadge(p.kind)}${ui.status(p.verification.status)}${reg.source ? ui.badge(t('onboarding.source.' + reg.source), 'neutral') : ''}</div><span class="small faint">${reg.ref ? h`<span class="mono">${reg.ref}</span> · ` : ''}${t('onboarding.applied', { date: U.fmtDate(p.verification.submittedAt) })}</span></div>
            <div class="card-b grid cols-3">
              ${ui.registrationDetails(p)}
              <div><div class="small muted mb-8">${t('profile.documents')}</div>${p.verification.documents.map(function (dc) {
                return h`<div class="stat-row"><span>${t('doc.' + dc.type)}${dc.fileName ? h`<div class="xs faint">${dc.fileName}</div>` : ''}${dc.url ? h`<a href="${dc.url}" target="_blank" rel="noopener"><img src="${dc.url}" alt="${t('doc.' + dc.type)}" style="display:block;max-width:120px;max-height:80px;margin-top:4px;border-radius:4px"></a>` : ''}</span>${ui.status(dc.status === 'uploaded' ? 'pending' : dc.status === 'missing' ? 'rejected' : 'verified', 'docStatus')}</div>`;
              })}</div>
              <div class="stack tight">${fl ? h`<div class="small muted">${t('onboarding.freelancerChecks')}</div>
                <label class="check"><input type="checkbox" data-change="check" data-id="${p.id}" data-field="idVerified" ${p.verification.idVerified ? 'checked' : ''}>${t('onboarding.idVerified')}</label>
                <label class="check"><input type="checkbox" data-change="check" data-id="${p.id}" data-field="certified" ${p.verification.certified ? 'checked' : ''}>${t('onboarding.certified')}</label>` : ''}
                ${p.verification.opsApproval ? h`<div class="small">${icon('check')} ${t('onboarding.opsApproved', { name: p.verification.opsApproval.by, date: U.fmtDate(p.verification.opsApproval.at) })}</div>` : ''}
                ${p.verification.notes.filter(function (n) { return n.text; }).map(function (n) { return h`<div class="xs faint">${U.fmtDate(n.at)} · ${n.by}: ${n.text}</div>`; })}</div>
            </div>
            ${p.verification.status === 'pending' || p.verification.status === 'awaiting_signoff' ? h`<div class="card-f">
              <button type="button" class="btn btn-danger" data-action="reject" data-id="${p.id}">${t('onboarding.reject')}</button>
              <button type="button" class="btn" data-action="info" data-id="${p.id}">${t('onboarding.requestInfo')}</button>
              ${p.verification.status === 'pending'
                ? h`<button type="button" class="btn btn-primary" data-action="approve" data-id="${p.id}">${icon('check')}${t('onboarding.approve')}</button>`
                : h`<button type="button" class="btn btn-primary" data-action="verify" data-id="${p.id}">${icon('shieldCheck')}${t('onboarding.signoff')}</button>`}</div>` : ''}
          </section>`;
        })}</div>` : ui.card(null, ui.empty(t('onboarding.none'), null, 'shieldCheck'))}`;
    },
    actions: {
      check: async function (el, ev, ctx) { await S.providers.setCheck(el.getAttribute('data-id'), el.getAttribute('data-field'), el.checked); ctx.reload(); },
      approve: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('onboarding.approve'), message: t('onboarding.approveBody'), confirmLabel: t('onboarding.approve') });
        if (!ok) return;
        await S.providers.approve(el.getAttribute('data-id')); ui.toast(t('onboarding.approved'), 'success'); ctx.reload();
      },
      verify: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('onboarding.signoff'), message: t('onboarding.signoffBody'), confirmLabel: t('onboarding.signoff') });
        if (!ok) return;
        await S.providers.verify(el.getAttribute('data-id')); ui.toast(t('onboarding.signedOff'), 'success'); ctx.reload();
      },
      reject: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('onboarding.reject'), reason: 'required', danger: true, confirmLabel: t('onboarding.reject') });
        if (!v) return;
        await S.providers.reject(el.getAttribute('data-id'), v.reason); ctx.reload();
      },
      info: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('onboarding.requestInfo'), reason: 'required', reasonLabel: t('onboarding.whatIsMissing'), confirmLabel: t('onboarding.send') });
        if (!v) return;
        await S.providers.requestInfo(el.getAttribute('data-id'), v.reason); ctx.reload();
      }
    }
  };

  // ================================================================ providers
  P.admin.providers = {
    live: true,
    title: function () { return t('nav.providers'); },
    load: function () { return S.providers.list(); },
    render: function (list) {
      return h`${ui.pageHead(t('nav.providers'), t('admin.providersSubtitle'))}${ui.card(null, ui.table([
        { label: t('common.name'), render: function (p) { return h`<strong>${p.name}</strong><div class="sub">${p.city}</div>`; } },
        { label: t('select.type'), render: function (p) { return ui.kindBadge(p.kind); } },
        { label: t('profile.services'), render: function (p) { return h`${p.services.map(function (s) { return ui.serviceBadge(s); })}`; } },
        { label: t('score.label'), num: true, render: function (p) { return ui.scoreBox(p.score ? p.score.overall : null); } },
        { label: t('rating.title'), render: function (p) { var s = p.score && p.score.byService[p.services[0]]; return s ? ui.rating(s.avgRating, s.ratingCount, s.isNew) : '-'; } },
        { label: t('admin.openCases'), num: true, render: function (p) { return U.num(p.openCases); } },
        { label: t('admin.enforcement'), render: function (p) { return h`${ui.status(p.enforcement.level, 'enforcement')}<div class="sub">${t('enforcementSource.' + p.enforcement.source)}</div>`; } }
      ], list, { href: function (p) { return '#/admin/providers/' + p.id; } }), { flush: true })}`;
    }
  };

  /** Read-only owner, supervisors and field agents of a company. */
  function teamTree(p) {
    var agentsById = {};
    p.agents.forEach(function (a) { agentsById[a.id] = a; });
    function agentRow(a) {
      var full = agentsById[a.id] || a;
      return h`<div class="tree-row"><span>${a.name}${a.active ? '' : h` ${ui.badge(t('common.inactive'), 'muted')}`}</span><span class="small faint">${ui.coverage.text(a.coverageCities || {}, 2)}</span><span class="small num">${t('team.openN', { n: full.stats ? full.stats.open : 0 })}</span></div>`;
    }
    return h`<div class="tree">
      <div class="tree-owner">${icon('briefcase')}<strong>${p.team.owners.map(function (o) { return o.name; }).join(t('common.listSep')) || '-'}</strong><span class="xs faint">${t('team.owner')}</span></div>
      ${p.team.supervisors.map(function (s) {
        return h`<div class="tree-sup"><div class="tree-sup-h">${icon('users')}<strong>${s.name}</strong><span class="xs faint">${t('role.provider_supervisor')} · ${t('team.agentsN', { n: s.agents.length })}</span>${s.active === false ? ui.badge(t('common.inactive'), 'muted') : ''}</div>${s.agents.map(agentRow)}</div>`;
      })}
      ${p.team.unassigned.length ? h`<div class="tree-sup"><div class="tree-sup-h">${icon('alert')}<strong>${t('team.unassigned')}</strong></div>${p.team.unassigned.map(agentRow)}</div>` : ''}
    </div>`;
  }

  P.admin.providerDetail = {
    title: function (p) { return p ? p.name : ''; },
    load: async function (ctx) {
      var p = await S.providers.get(ctx.params.id);
      p.team = p.kind === 'company' ? await S.team.ofProvider(ctx.params.id) : null;
      return p;
    },
    render: function (p) {
      var lvl = p.enforcement.level;
      return h`${ui.pageHead(p.name, h`<span class="row wrap">${ui.kindBadge(p.kind)}${p.services.map(function (s) { return ui.serviceBadge(s); })}${ui.status(lvl, 'enforcement')}<span class="small faint">${t('enforcementSource.' + p.enforcement.source)}${p.enforcement.reason ? ': ' + p.enforcement.reason : ''}</span></span>`,
          h`${lvl !== 'warned' ? h`<button type="button" class="btn" data-action="enforce" data-level="warned">${t('admin.warn')}</button>` : ''}
            ${lvl !== 'reduced' ? h`<button type="button" class="btn" data-action="enforce" data-level="reduced">${t('admin.reduce')}</button>` : ''}
            ${lvl !== 'suspended' ? h`<button type="button" class="btn btn-danger" data-action="enforce" data-level="suspended">${t('admin.suspend')}</button>` : ''}
            ${lvl !== 'none' ? h`<button type="button" class="btn btn-primary" data-action="enforce" data-level="none">${t('admin.reactivate')}</button>` : ''}
            ${p.enforcement.source === 'manual' ? h`<button type="button" class="btn btn-ghost" data-action="auto">${t('admin.backToAuto')}</button>` : ''}`,
          ui.crumbs([{ label: t('nav.providers'), href: '#/admin/providers' }, { label: p.name }]))}
        <div class="grid cols-${p.services.length > 1 ? '2' : '2'} mb-16">
          ${p.services.map(function (s) {
            var sc = p.score && p.score.byService[s];
            if (!sc) return '';
            var m = sc.metrics;
            return ui.card(t('admin.scoreFor', { service: t('service.' + s) }), h`<div class="stack">
              <div class="row between">${ui.rating(sc.avgRating, sc.ratingCount, sc.isNew)}${ui.scoreBox(sc.score)}</div>
              <dl class="dl"><dt>${t('score.operational')}</dt><dd>${sc.operational == null ? '-' : U.num(sc.operational, 1)}</dd><dt>${t('score.ratingPart')}</dt><dd>${sc.ratingPart == null ? '-' : U.num(sc.ratingPart, 1)}</dd>
              ${s === 'investigation' ? h`<dt>${t('metric.onTime')}</dt><dd>${ui.pct(m.onTime)}</dd><dt>${t('metric.firstTime')}</dt><dd>${ui.pct(m.firstTime)}</dd><dt>${t('metric.evidence')}</dt><dd>${ui.pct(m.evidence)}</dd>`
                : h`<dt>${t('metric.recoveryNorm')}</dt><dd>${ui.pct(m.recovery)}</dd><dt>${t('metric.ptpKept')}</dt><dd>${ui.pct(m.ptpKept)}</dd><dt>${t('metric.complaints')}</dt><dd>${ui.pct(m.complaintRate)}</dd>`}
              <dt>${t('admin.volume')}</dt><dd>${U.num(m.volume)}</dd></dl>${ui.criteriaView(sc.criteria)}</div>`);
          })}
          ${ui.card(t('admin.registration'), h`${p.registration ? h`<div class="xs faint mb-8"><span class="mono">${p.registration.ref}</span> · ${t('onboarding.source.' + p.registration.source)} · ${U.fmtDate(p.registration.at)}</div>` : ''}${ui.registrationDetails(p)}`)}
        </div>
        <div class="grid cols-2 mb-16">
          ${ui.card(t('profile.documents'), h`<div class="stack tight">${p.verification.documents.map(function (dc) {
            var ex = ICM.wf.docExpiry(dc, ICM.clock.now());
            return h`<div class="stat-row"><span>${t('doc.' + dc.type)}
                ${dc.expiresAt ? h`<div class="xs ${ex.state === 'expired' ? 'bad' : ex.state === 'expiring' ? 'warn' : 'faint'}">${t('settings.expires', { date: U.fmtDate(dc.expiresAt) })}</div>` : ''}
                ${dc.renewal ? h`<div class="xs">${t('settings.renewalSent', { date: dc.renewal.expiresAt ? U.fmtDate(dc.renewal.expiresAt) : '-' })}</div>${dc.renewal.url ? h`<img src="${dc.renewal.url}" alt="" style="display:block;max-width:120px;max-height:80px;margin-top:4px;border-radius:4px">` : ''}` : ''}</span>
              <span class="row">${ex.state === 'expired' ? ui.badge(t('settings.state.expired'), 'danger') : ex.state === 'expiring' ? ui.badge(t('settings.state.expiring'), 'warning') : ui.status(dc.status === 'uploaded' ? 'pending' : dc.status === 'missing' ? 'rejected' : 'verified', 'docStatus')}
                ${dc.renewal || dc.status === 'uploaded' ? h`<button type="button" class="btn btn-sm" data-action="rejectDoc" data-type="${dc.type}" ${dc.renewal ? '' : 'disabled'}>${t('onboarding.reject')}</button><button type="button" class="btn btn-sm btn-primary" data-action="verifyDoc" data-type="${dc.type}">${t('settings.verifyDoc')}</button>` : ''}</span></div>`;
          })}</div>`)}
          ${ui.card(t('settings.priceRequest'), p.priceRequest ? h`<div class="stack">
              <div class="small muted">${t('settings.requestedBy', { name: p.priceRequest.by, date: U.fmtDateTime(p.priceRequest.at) })}</div>
              ${p.priceRequest.note ? h`<div class="small">${p.priceRequest.note}</div>` : ''}
              <div class="stack tight">${priceChanges(p.pricing, p.priceRequest.pricing).map(function (ch) { return h`<div class="stat-row"><span class="small">${ch.label}</span><span class="small mono">${ch.from} → <strong>${ch.to}</strong></span></div>`; })}</div>
              <div class="row end"><button type="button" class="btn btn-danger" data-action="rejectPrices">${t('onboarding.reject')}</button><button type="button" class="btn btn-primary" data-action="approvePrices">${t('settings.approvePrices')}</button></div>
            </div>` : ui.empty(t('settings.noPriceRequest'), null, 'coins'))}
        </div>
        ${p.team ? ui.card(t('admin.team'), teamTree(p), { cls: 'mb-16' }) : ''}
        <div class="grid cols-2">
          ${ui.card(t('admin.ratingsReceived', { n: p.ratings.length }), h`<div class="stack tight" style="max-height:520px;overflow:auto">${p.ratings.slice(0, 30).map(function (r) {
            return h`<div class="stat-row"><span><span class="row wrap">${ui.stars(r.overall)}<span class="small">${r.entityName}</span>${r.status === 'removed' ? ui.badge(t('rating.removed'), 'muted') : ''}</span>${r.feedback ? h`<div class="xs muted">${r.feedback}</div>` : ''}</span><span class="xs faint nowrap">${U.fmtDate(r.createdAt)}</span></span>`;
          })}</div>`)}
          ${ui.card(t('admin.history'), h`<div class="stack tight">${p.audit.map(function (a) {
            return h`<div class="small"><span class="mono xs">${U.fmtDateTime(a.at)}</span> · ${a.actorName}: ${ui.auditLabel(a.action)}${a.after && a.after.level ? ' → ' + t('enforcement.' + a.after.level) : ''}${a.reason ? h`<div class="xs faint">${a.reason}</div>` : ''}</div>`;
          })}</div>`)}
        </div>`;
    },
    actions: {
      enforce: async function (el, ev, ctx) {
        var lvl = el.getAttribute('data-level');
        var v = await ui.confirm({ title: t('admin.enforceTitle', { level: t('enforcement.' + lvl) }), message: t('admin.enforceBody.' + lvl), reason: 'required', danger: lvl === 'suspended', confirmLabel: t('common.confirm') });
        if (!v) return;
        await S.providers.enforce(ctx.params.id, lvl, v.reason); ui.toast(t('admin.enforced'), 'success'); ctx.reload();
      },
      auto: async function (el, ev, ctx) { await S.providers.setAutomatic(ctx.params.id); ctx.reload(); },
      verifyDoc: async function (el, ev, ctx) {
        await S.providers.verifyDocument(ctx.params.id, el.getAttribute('data-type')); ui.toast(t('settings.docVerified'), 'success'); ctx.reload();
      },
      rejectDoc: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('onboarding.reject'), reason: 'required', danger: true, confirmLabel: t('onboarding.reject') });
        if (!v) return;
        await S.providers.rejectDocument(ctx.params.id, el.getAttribute('data-type'), v.reason); ctx.reload();
      },
      approvePrices: async function (el, ev, ctx) {
        await S.providers.decidePriceChange(ctx.params.id, true); ui.toast(t('settings.pricesApproved'), 'success'); ctx.reload();
      },
      rejectPrices: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('onboarding.reject'), reason: 'required', danger: true, confirmLabel: t('onboarding.reject') });
        if (!v) return;
        await S.providers.decidePriceChange(ctx.params.id, false, v.reason); ctx.reload();
      }
    }
  };

  /** The prices a request changes, as readable "from -> to" lines. */
  function priceChanges(cur, next) {
    var out = [], lists = ICM.store.db.config.lists;
    Object.keys((next && next.investigation) || {}).forEach(function (tp) {
      Object.keys(next.investigation[tp]).forEach(function (z) {
        var a = ((cur.investigation || {})[tp] || {})[z], b = next.investigation[tp][z];
        if (a !== b) out.push({ label: U.label(lists.inquiryTypes.filter(function (x) { return x.id === tp; })[0] || { en: tp, ar: tp }) + ' · ' + U.label(C.ZONES.filter(function (x) { return x.id === z; })[0]), from: a == null ? '-' : U.money(a), to: U.money(b) });
      });
    });
    if (next && next.collection) {
      Object.keys(next.collection.feePct).forEach(function (k) {
        var a = ((cur.collection || {}).feePct || {})[k], b = next.collection.feePct[k];
        if (a !== b) out.push({ label: U.label(C.DPD_BUCKETS.filter(function (x) { return x.id === k; })[0]), from: a == null ? '-' : a + '%', to: b + '%' });
      });
      var fa = (cur.collection || {}).fixedFee, fb = next.collection.fixedFee;
      if (fa !== fb) out.push({ label: t('profile.fixedFee'), from: fa == null ? '-' : U.money(fa), to: U.money(fb) });
    }
    return out;
  }

  // ================================================================ entities
  P.admin.entities = {
    title: function () { return t('nav.entities'); },
    load: function () { return S.entities.list(); },
    render: function (list) {
      return h`${ui.pageHead(t('nav.entities'), t('admin.entitiesSubtitle'))}<div class="stack">${list.map(function (e) {
        return h`<section class="card"><div class="card-h"><div class="row wrap"><strong>${e.name}</strong>${ui.badge(t('entityType.' + e.type), 'neutral')}</div><span class="small faint">${e.city}</span></div>
          <div class="card-b grid cols-3">
            <dl class="dl"><dt>${t('admin.volume')}</dt><dd>${U.num(e.volume)}</dd><dt>${t('admin.openCases')}</dt><dd>${U.num(e.open)}</dd><dt>${t('admin.spend')}</dt><dd>${U.money(e.spend)}</dd></dl>
            <div><div class="small muted mb-8">${t('admin.dataQualityRating')}</div>${ui.clientRatingView(e.clientRating)}
              ${e.clientRatings.slice(0, 3).map(function (r) { return r.comment ? h`<div class="xs faint mt-8">${r.providerName}: ${r.comment}</div>` : ''; })}</div>
            <div><div class="small muted mb-8">${t('nav.users')}</div>${e.users.map(function (u) { return h`<div class="small">${u.name} <span class="faint">· ${t('role.' + u.role)}${u.active === false ? ' · ' + t('common.inactive') : ''}</span></div>`; })}</div>
          </div></section>`;
      })}</div>`;
    }
  };

  // ================================================================ all cases
  P.admin.cases = {
    live: true,
    title: function () { return t('nav.allCases'); },
    initState: function () { return { f: {}, tab: 'cases' }; },
    load: async function (ctx) {
      var f = Object.assign({}, ctx.state.f);
      if (ctx.query.batch) f.batchId = ctx.query.batch;
      if (f.from) f.from = new Date(f.from).getTime();
      if (f.to) f.to = U.endOfDay(new Date(f.to).getTime());
      var r = await Promise.all([S.cases.list(f), S.providers.list(), S.entities.list ? S.batches.list() : [], ctx.session.user.role === 'platform_admin' ? S.entities.list() : Promise.resolve([])]);
      return { rows: r[0], providers: r[1], batches: r[2], entities: r[3] };
    },
    render: function (d, ctx) {
      var f = ctx.state.f, tab = ctx.state.tab;
      var statuses = U.uniq(C.INVESTIGATION_STATUSES.concat(C.COLLECTION_STATUSES));
      var filters = h`<div class="filters">
        <div class="field wide"><label for="aq">${t('common.search')}</label><div class="searchbox">${icon('search')}<input id="aq" class="input" value="${f.q || ''}" data-input="q" placeholder="${t('cases.searchHint')}"></div></div>
        <div class="field"><label>${t('case.service')}</label>${ui.select('service', [{ value: '', label: t('common.all') }, { value: 'investigation', label: t('service.investigation') }, { value: 'collection', label: t('service.collection') }], f.service, { change: 'filter' })}</div>
        <div class="field"><label>${t('common.status')}</label>${ui.select('status', [{ value: '', label: t('common.all') }].concat(statuses.map(function (s) { return { value: s, label: t('status.' + s) }; })), f.status, { change: 'filter' })}</div>
        <div class="field"><label>${t('case.client')}</label>${ui.select('entityId', [{ value: '', label: t('common.all') }].concat(d.entities.map(function (e) { return { value: e.id, label: e.name }; })), f.entityId, { change: 'filter' })}</div>
        <div class="field"><label>${t('case.provider')}</label>${ui.select('providerId', [{ value: '', label: t('common.all') }].concat(d.providers.map(function (p) { return { value: p.id, label: p.name }; })), f.providerId, { change: 'filter' })}</div>
        <div class="field"><label>${t('address.governorate')}</label>${ui.select('governorate', ui.listOptions('governorates', true), f.governorate, { change: 'filter' })}</div>
        <div class="field"><label>${t('nav.batches')}</label>${ui.select('batchId', [{ value: '', label: t('common.all') }].concat(d.batches.map(function (b) { return { value: b.id, label: b.ref }; })), f.batchId || ctx.query.batch, { change: 'filter' })}</div>
        <div class="field"><label>${t('sla.title')}</label>${ui.select('sla', [{ value: '', label: t('common.all') }].concat(['on_track', 'at_risk', 'breached', 'met', 'missed'].map(function (s) { return { value: s, label: t('sla.' + s) }; })), f.sla, { change: 'filter' })}</div>
        <div class="field"><label>${t('common.from')}</label><input class="input" type="date" name="from" value="${f.from || ''}" data-change="filter"></div>
        <div class="field"><label>${t('common.to')}</label><input class="input" type="date" name="to" value="${f.to || ''}" data-change="filter"></div>
        <label class="check small" style="align-self:center"><input type="checkbox" name="disputed" data-change="filterCheck" ${f.disputed ? 'checked' : ''}>${t('dispute.flag')}</label>
      </div>`;
      return h`${ui.pageHead(t('nav.allCases'), t('cases.count', { n: d.rows.length }), ctx.session.user.role === 'platform_admin' ? h`<button type="button" class="btn" data-action="exportInv" title="${t('export.hint')}">${icon('download')}${t('export.button')}</button>` : null)}
        ${ui.tabs([{ id: 'cases', label: t('nav.cases'), count: d.rows.length }, { id: 'batches', label: t('nav.batches'), count: d.batches.length }], tab, 'tab')}
        ${tab === 'cases' ? h`${filters}${ui.card(null, P.entity.caseTable(d.rows, '#/admin/cases/', { entity: false }), { flush: true })}` : ui.card(null, P.entity.batchTable(d.batches, '#/admin/cases?batch=', true), { flush: true })}`;
    },
    actions: {
      tab: function (el, ev, ctx) { ctx.state.tab = el.getAttribute('data-value'); ctx.reload(); },
      exportInv: async function (el, ev, ctx) {
        var f = Object.assign({}, ctx.state.f);
        if (f.from) f.from = new Date(f.from).getTime();
        if (f.to) f.to = U.endOfDay(new Date(f.to).getTime());
        await ui.exportInvestigations(f);
      },
      filter: function (el, ev, ctx) { ctx.state.f[el.name] = el.value; ctx.state.tab = 'cases'; ctx.reload(); },
      filterCheck: function (el, ev, ctx) { ctx.state.f[el.name] = el.checked; ctx.reload(); },
      q: function (el, ev, ctx) { ctx.state.f.q = el.value; ctx.reload(); }
    }
  };

  function adminActions(d, ctx) {
    var c = d.case, a = d.actions, out = [];
    var isAdmin = ctx.session.user.role === 'platform_admin';
    if (a.indexOf('approve') >= 0 || a.indexOf('return_to_agent') >= 0) out.push(h`<button type="button" class="btn btn-primary btn-block" data-action="review">${icon('checkSquare')}${t('review.open')}</button>`);
    if (isAdmin && !wf.isTerminal(c.status) && c.status !== 'draft') {
      out.push(h`<button type="button" class="btn btn-block" data-action="reassign">${icon('repeat')}${t('admin.forceReassign')}</button>`);
      if (c.dueAt) out.push(h`<button type="button" class="btn btn-block" data-action="extend">${icon('clock')}${t('admin.extendSla')}</button>`);
    }
    if (isAdmin && a.indexOf('cancel') >= 0) out.push(h`<button type="button" class="btn btn-danger btn-block" data-action="cancel">${t('action.cancel')}</button>`);
    if (!out.length) out.push(h`<p class="small muted">${t('case.noActions')}</p>`);
    out.push(h`<p class="xs faint">${t('admin.reasonRequired')}</p>`);
    return h`<div class="stack tight">${out}</div>`;
  }

  P.admin.caseDetail = {
    live: true,
    title: function (d) { return d ? d.case.ref : ''; },
    load: function (ctx) { return S.cases.get(ctx.params.id); },
    render: function (d, ctx) {
      return ui.caseView(d, { actions: adminActions(d, ctx), showEntity: true, crumbs: ui.crumbs([{ label: t('nav.allCases'), href: '#/admin/cases' }, { label: d.case.ref }]) });
    },
    actions: {
      review: async function (el, ev, ctx) { if (await ui.flows.review(ctx.params.id)) ctx.reload(); },
      reassign: async function (el, ev, ctx) {
        var d = await S.cases.get(ctx.params.id);
        var list = (await S.providers.list()).filter(function (p) { return p.services.indexOf(d.case.service) >= 0 && p.id !== d.case.providerId && p.governorates.indexOf(d.case.governorate) >= 0 && p.enforcement.level !== 'suspended'; });
        var v = await ui.confirm({ title: t('admin.forceReassign'), message: t('admin.reassignBody'), reasonOptions: list.map(function (p) { return { value: p.id, label: p.name }; }), reasonCodeLabel: t('case.provider'), reason: 'required', confirmLabel: t('admin.forceReassign'), danger: true });
        if (!v) return;
        await S.cases.forceReassign(ctx.params.id, v.reasonCode, v.reason); ui.toast(t('admin.reassigned'), 'success'); ctx.reload();
      },
      extend: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('admin.extendSla'), extra: h`<div class="field"><label>${t('admin.extendHours')}<span class="req">*</span></label><input class="input" type="number" name="hours" min="1" value="24"></div>`, reason: 'required', confirmLabel: t('admin.extendSla'),
          validate: function (x) { return +x.hours > 0 ? null : t('errors.min'); } });
        if (!v) return;
        await S.cases.extendSla(ctx.params.id, +v.hours, v.reason); ui.toast(t('admin.extended'), 'success'); ctx.reload();
      },
      cancel: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('action.cancel'), message: t('admin.cancelBody'), reason: 'required', danger: true, confirmLabel: t('action.cancel') });
        if (!v) return;
        await S.cases.transition(ctx.params.id, 'cancel', { reason: v.reason }); ui.toast(t('case.cancelled'), 'success'); ctx.reload();
      }
    }
  };

  // ================================================================ QA queue
  P.admin.qa = {
    live: true,
    title: function () { return t('nav.qaQueue'); },
    load: function () { return S.cases.reviewQueue(); },
    render: function (rows) { return P.provider.reviewTable(rows, t('nav.qaQueue'), t('qa.subtitle')); },
    actions: { review: async function (el, ev, ctx) { if (await ui.flows.review(el.getAttribute('data-id'))) ctx.reload(); } }
  };

  // ================================================================ disputes
  P.admin.disputes = {
    live: true,
    title: function () { return t('nav.disputes'); },
    load: function () { return S.disputes.list(); },
    render: function (list) {
      return h`${ui.pageHead(t('nav.disputes'), t('dispute.adminSubtitle'))}${ui.card(null, ui.table([
        { label: t('dispute.ref'), render: function (d) { return h`<span class="mono">${d.ref}</span>`; } },
        { label: t('dispute.kind'), render: function (d) { return t('dispute.kindLabel.' + d.kind); } },
        { label: t('dispute.raisedBy'), render: function (d) { return h`${d.raisedByName}<div class="sub">${t('dispute.party.' + d.raisedByParty)}</div>`; } },
        { label: t('case.ref'), render: function (d) { return h`<span class="mono small">${d.caseRef || '-'}</span>`; } },
        { label: t('dispute.parties'), render: function (d) { return h`<span class="small">${d.entityName} / ${d.providerName}</span>`; } },
        { label: t('dispute.reasonLabel'), render: function (d) { return t('dispute.reason.' + d.reason); } },
        { label: t('common.status'), render: function (d) { return h`${ui.status(d.status)}${d.outcome ? h`<div class="sub">${t('dispute.outcome.' + d.outcome)}</div>` : ''}`; } },
        { label: t('common.date'), render: function (d) { return h`<span class="small">${U.fmtDate(d.createdAt)}</span>`; } }
      ], list, { href: function (d) { return '#/admin/disputes/' + d.id; }, empty: t('dispute.none') }), { flush: true })}`;
    }
  };

  P.admin.disputeDetail = {
    title: function (d) { return d ? d.ref : ''; },
    load: function (ctx) { return S.disputes.get(ctx.params.id); },
    render: function (d) {
      var open = d.status === 'open';
      var entitySide = d.raisedByParty === 'entity' ? [{ by: d.raisedByName, text: d.details, at: d.createdAt }] : [];
      var providerSide = d.raisedByParty === 'provider' ? [{ by: d.raisedByName, text: d.details, at: d.createdAt }] : [];
      d.responses.forEach(function (r) { (r.party === 'entity' ? entitySide : r.party === 'provider' ? providerSide : []).push({ by: r.byName, text: r.text, at: r.at }); });
      var adminNotes = d.responses.filter(function (r) { return r.party === 'admin'; });
      function side(title, items) {
        return ui.card(title, items.length ? h`<div class="stack tight">${items.map(function (x) { return h`<div><div class="small">${x.text}</div><div class="xs faint">${x.by} · ${U.fmtDateTime(x.at)}</div></div>`; })}</div>` : h`<p class="small faint">${t('dispute.noStatement')}</p>`);
      }
      return h`${ui.pageHead(h`${d.ref}`, h`<span class="row wrap">${ui.status(d.status)}${ui.badge(t('dispute.kindLabel.' + d.kind), 'neutral')}<span class="small">${t('dispute.reason.' + d.reason)}</span></span>`, null, ui.crumbs([{ label: t('nav.disputes'), href: '#/admin/disputes' }, { label: d.ref }]))}
        <div class="grid cols-2 mb-16">${side(t('dispute.entitySide', { name: d.entityName }), entitySide)}${side(t('dispute.providerSide', { name: d.providerName }), providerSide)}</div>
        ${d.rating ? h`<div class="mb-16">${ui.card(t('dispute.disputedRating'), h`<div class="stack tight"><div class="row wrap">${ui.stars(d.rating.overall, 'lg')}<strong>${d.rating.overall}/5</strong><span class="small">${d.rating.entityName} → ${d.rating.providerName}</span>${d.rating.status === 'removed' ? ui.badge(t('rating.removed'), 'muted') : ''}</div>${ui.criteriaView(d.rating.criteria)}${d.rating.tags.length ? ui.tagChips(d.rating.tags) : ''}${d.rating.feedback ? h`<p class="small">${d.rating.feedback}</p>` : ''}</div>`)}</div>` : ''}
        <div class="grid side">
          <div class="stack">${d.case ? ui.card(t('dispute.caseTimeline', { ref: d.case.ref }), h`<div class="row wrap mb-8">${ui.serviceBadge(d.case.service)}${ui.status(d.case.status)}<a href="#/admin/cases/${d.case.id}" class="small">${t('dispute.openCase')}</a></div>${ui.timeline(d.case.timeline)}`) : ''}</div>
          <div class="stack">
            ${adminNotes.length ? side(t('dispute.adminNotes'), adminNotes.map(function (r) { return { by: r.byName, text: r.text, at: r.at }; })) : ''}
            ${open && d.proposal ? ui.card(t('dispute.proposalTitle'), h`<div class="stack"><p><strong>${t('dispute.outcome.' + d.proposal.outcome)}</strong></p><p class="small">${d.proposal.note}</p><p class="xs faint">${t('dispute.proposedBy', { name: d.proposal.byName, team: t('role.' + d.proposal.role) })}</p>
              <div class="row end"><button type="button" class="btn" data-action="sendBack">${t('dispute.sendBack')}</button><button type="button" class="btn btn-primary" data-action="confirmDecision">${t('dispute.confirmDecision')}</button></div></div>`, { cls: 'accent-edge' })
            : open ? ui.card(t('dispute.resolve'), h`<form data-submit="resolve" class="stack">
              <div class="field"><label>${t('dispute.outcomeLabel')}<span class="req">*</span></label>${ui.select('outcome', [{ value: '', label: t('common.select') }].concat(['upheld', 'partial', 'rejected'].map(function (o) { return { value: o, label: t('dispute.outcome.' + o) }; })), '')}</div>
              <p class="xs faint">${d.kind === 'rating' ? t('dispute.ratingEffects') : t('dispute.caseEffects')}</p>
              <div class="field"><label>${t('dispute.resolutionNote')}<span class="req">*</span></label><textarea class="textarea" name="note" rows="3"></textarea></div>
              <div class="row between"><button type="button" class="btn btn-sm" data-action="note">${t('dispute.addNote')}</button><button type="submit" class="btn btn-primary">${t('dispute.resolve')}</button></div>
            </form>`, { cls: 'accent-edge' }) : ui.card(t('dispute.resolution'), h`<p><strong>${t('dispute.outcome.' + d.outcome)}</strong></p><p class="small">${d.resolutionNote}</p><p class="xs faint">${d.resolvedBy} · ${U.fmtDateTime(d.resolvedAt)}</p>`)}
          </div>
        </div>`;
    },
    actions: {
      resolve: async function (form, ev, ctx, v) {
        if (!v.outcome || !String(v.note || '').trim()) return ui.toast(t('dispute.needOutcome'), 'danger');
        var ok = await ui.confirm({ title: t('dispute.resolve'), message: t('dispute.resolveConfirm', { outcome: t('dispute.outcome.' + v.outcome) }), confirmLabel: t('dispute.resolve') });
        if (!ok) return;
        await S.disputes.propose(ctx.params.id, v.outcome, v.note); ui.toast(t('dispute.proposed'), 'success'); ctx.reload();
      },
      confirmDecision: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('dispute.confirmDecision'), message: t('dispute.confirmBody'), confirmLabel: t('dispute.confirmDecision') });
        if (!ok) return;
        await S.disputes.confirm(ctx.params.id); ui.toast(t('dispute.resolved'), 'success'); ctx.reload();
      },
      sendBack: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('dispute.sendBack'), reason: 'required', confirmLabel: t('dispute.sendBack') });
        if (!v) return;
        await S.disputes.sendBack(ctx.params.id, v.reason); ctx.reload();
      },
      note: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('dispute.addNote'), reason: 'required', confirmLabel: t('common.save') });
        if (!v) return;
        await S.disputes.respond(ctx.params.id, v.reason); ctx.reload();
      }
    }
  };

  // ================================================================ moderation
  P.admin.moderation = {
    title: function () { return t('nav.moderation'); },
    initState: function () { return { tab: 'flagged' }; },
    load: function () { return S.ratings.moderation(); },
    render: function (list, ctx) {
      var tab = ctx.state.tab;
      var groups = { flagged: list.filter(function (r) { return r.flagged; }), hidden: list.filter(function (r) { return r.hidden; }), all: list };
      var shown = groups[tab];
      return h`${ui.pageHead(t('nav.moderation'), t('moderation.subtitle'))}
        ${ui.tabs([{ id: 'flagged', label: t('moderation.flagged'), count: groups.flagged.length }, { id: 'hidden', label: t('moderation.hidden'), count: groups.hidden.length }, { id: 'all', label: t('moderation.all'), count: list.length }], tab, 'tab')}
        ${shown.length ? h`<div class="stack">${shown.slice(0, 60).map(function (r) {
          return h`<div class="card ${r.flagged ? 'warn-edge' : ''}"><div class="card-b stack tight">
            <div class="row between wrap"><div class="row wrap">${ui.stars(r.overall)}<strong>${r.providerName}</strong><span class="small muted">${t('moderation.by', { name: r.entityName })}</span>${r.hidden ? ui.badge(t('moderation.hiddenBadge'), 'muted') : ''}${r.status === 'removed' ? ui.badge(t('rating.removed'), 'muted') : ''}</div><span class="xs faint">${U.fmtDate(r.createdAt)}</span></div>
            <p class="small">${r.feedback}</p>
            ${r.flagged ? ui.notice(t('moderation.flagReason', { reason: r.flagReason }), 'warn', 'flag') : ''}
            <div class="row wrap">${r.hidden ? h`<button type="button" class="btn btn-sm" data-action="restore" data-id="${r.id}">${icon('eye')}${t('moderation.restore')}</button>` : h`<button type="button" class="btn btn-sm btn-danger" data-action="hide" data-id="${r.id}">${icon('eyeOff')}${t('moderation.hide')}</button>`}
              ${r.flagged ? h`<button type="button" class="btn btn-sm btn-ghost" data-action="dismiss" data-id="${r.id}">${t('moderation.dismiss')}</button>` : ''}</div>
          </div></div>`;
        })}</div>` : ui.card(null, ui.empty(t('moderation.none'), null, 'flag'))}`;
    },
    actions: {
      tab: function (el, ev, ctx) { ctx.state.tab = el.getAttribute('data-value'); ctx.reload(); },
      hide: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('moderation.hide'), message: t('moderation.hideBody'), danger: true, confirmLabel: t('moderation.hide') });
        if (!ok) return;
        await S.ratings.setHidden(el.getAttribute('data-id'), true); ctx.reload();
      },
      restore: async function (el, ev, ctx) { await S.ratings.setHidden(el.getAttribute('data-id'), false); ctx.reload(); },
      dismiss: async function (el, ev, ctx) { await S.ratings.dismissFlag(el.getAttribute('data-id')); ctx.reload(); }
    }
  };
})();
