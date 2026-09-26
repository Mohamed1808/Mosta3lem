/* Provider portal: team, profile and settings, ratings, client ratings, earnings and
   the collection portfolio report. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, C = ICM.config, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.provider = P.provider || {};

  // ================================================================ team
  P.provider.team = {
    title: function () { return t('nav.team'); },
    load: function (ctx) { return S.providers.team(ctx.service); },
    render: function (team, ctx) {
      var inv = ctx.service === 'investigation';
      var canEdit = ['provider_admin', 'provider_supervisor'].indexOf(ctx.session.user.role) >= 0;
      return h`${ui.pageHead(t('nav.team'), t('team.subtitle', { n: team.length }))}
        ${ui.card(null, ui.table([
          { label: t('common.name'), render: function (a) { return h`<strong>${a.name}</strong><div class="sub">${a.services.map(function (s) { return t('service.' + s); }).join(', ')}</div>`; } },
          { label: t('assign.areas'), render: function (a) { return h`<span class="small">${a.governorates.map(ui.gov).join(', ')}</span>`; } },
          { label: t('common.status'), render: function (a) { return a.active ? ui.badge(t('common.active'), 'success') : ui.badge(t('common.inactive'), 'muted'); } },
          { label: t('assign.load'), num: true, render: function (a) { return U.num(a.stats.open); } },
          inv ? { label: t('team.delivered'), num: true, render: function (a) { return U.num(a.stats.delivered); } } : { label: t('team.collected'), num: true, render: function (a) { return U.money(a.stats.collected); } },
          inv ? { label: t('metric.onTime'), num: true, render: function (a) { return ui.pct(a.stats.onTimeRate); } } : { label: t('team.closed'), num: true, render: function (a) { return U.num(a.stats.closedCollections); } },
          inv ? { label: t('team.returns'), num: true, render: function (a) { return U.num(a.stats.returns + a.stats.reworks); } } : { label: t('team.actions'), num: true, render: function (a) { return U.num(a.stats.actionsLogged); } },
          inv ? { label: t('metric.evidence'), num: true, render: function (a) { return ui.pct(a.stats.evidenceRate); } } : null,
          canEdit ? { label: '', cls: 'right', render: function (a) { return a.active ? h`<button type="button" class="btn btn-sm btn-danger" data-action="toggle" data-id="${a.id}" data-on="0">${t('team.deactivate')}</button>` : h`<button type="button" class="btn btn-sm" data-action="toggle" data-id="${a.id}" data-on="1">${t('team.activate')}</button>`; } } : null
        ].filter(Boolean), team), { flush: true })}`;
    },
    actions: {
      toggle: async function (el, ev, ctx) {
        var on = el.getAttribute('data-on') === '1';
        if (!on && !(await ui.confirm({ title: t('team.deactivate'), message: t('team.deactivateBody'), danger: true, confirmLabel: t('team.deactivate') }))) return;
        await S.providers.setAgentActive(el.getAttribute('data-id'), on);
        ctx.reload();
      }
    }
  };

  // ================================================================ profile & settings
  P.provider.profile = {
    title: function () { return t('nav.profile'); },
    load: function () { return S.providers.mine(); },
    render: function (p, ctx) {
      var pricing = ui.cfg.pricing, zones = C.ZONES;
      var inv = p.services.indexOf('investigation') >= 0, col = p.services.indexOf('collection') >= 0;
      var types = ui.cfg.lists.inquiryTypes;
      return h`${ui.pageHead(t('nav.profile'), p.name, h`${ui.status(p.verification.status)}${ui.kindBadge(p.kind)}`)}
        <form data-submit="save" class="stack">
          <div class="grid cols-2">
            ${ui.card(t('profile.basics'), h`<div class="form-grid">
              <div class="field full"><label>${t('profile.description')}</label><textarea class="textarea" name="description" rows="2">${p.description || ''}</textarea></div>
              <div class="field"><label>${t('common.phone')}</label><input class="input" name="phone" value="${p.phone || ''}" dir="ltr"></div>
              <div class="field"><label>${t('common.email')}</label><input class="input" name="email" value="${p.email || ''}" dir="ltr"></div>
              <div class="field"><label>${t('profile.city')}</label><input class="input" name="city" value="${p.city || ''}"></div>
              <div class="field"><label>${t('profile.services')}</label><div>${p.services.map(function (s) { return ui.serviceBadge(s); })}</div></div>
            </div>`)}
            ${ui.card(t('profile.documents'), h`<div class="stack tight">${p.verification.documents.map(function (dc) {
              return h`<div class="stat-row"><span>${t('doc.' + dc.type)}</span><span class="row">${ui.status(dc.status === 'uploaded' ? 'pending' : dc.status === 'missing' ? 'rejected' : 'verified')}${dc.status === 'missing' ? h`<button type="button" class="btn btn-sm" data-action="upload" data-type="${dc.type}">${icon('upload')}${t('profile.upload')}</button>` : ''}</span></div>`;
            })}<p class="xs faint">${t('profile.docsNote')}</p></div>`)}
          </div>
          ${ui.card(t('profile.coverage'), h`<p class="small muted mb-8">${t('profile.coverageHint')}</p><div class="form-grid cols-4">${ui.cfg.lists.governorates.map(function (g) {
            var on = p.governorates.indexOf(g.id) >= 0;
            return h`<div class="field"><label class="check"><input type="checkbox" name="gov" value="${g.id}" ${on ? 'checked' : ''}>${U.label(g)}</label>
              <input class="input sm" type="number" min="1" name="cap_${g.id}" value="${p.capacity[g.id] || ''}" placeholder="${t('profile.capacity')}" aria-label="${t('profile.capacity')}"><span class="xs faint">${t('profile.load', { n: p.load[g.id] || 0 })}</span></div>`;
          })}</div>`)}
          ${inv ? ui.card(t('profile.invPricing'), h`<p class="small muted mb-8">${t('profile.pricingHint')}</p><div class="table-wrap"><table class="table"><thead><tr><th>${t('case.inquiryTypes')}</th>${zones.map(function (z) { return h`<th>${U.label(z)}</th>`; })}<th>${t('profile.slaHours')}</th></tr></thead><tbody>
            ${types.map(function (tp) {
              var band = pricing.investigationBands[tp.id];
              return h`<tr><td><strong>${U.label(tp)}</strong></td>${zones.map(function (z) {
                var m = pricing.zoneMultiplier[z.id];
                return h`<td><input class="input" type="number" name="price_${tp.id}_${z.id}" value="${((p.pricing.investigation || {})[tp.id] || {})[z.id] || ''}"><div class="sub">${U.num(Math.round(band.min * m))}-${U.num(Math.round(band.max * m))}</div></td>`;
              })}<td><input class="input" type="number" name="sla_${tp.id}" min="1" value="${(p.sla.investigation || {})[tp.id] || ''}"></td></tr>`;
            })}</tbody></table></div>`) : ''}
          ${col ? ui.card(t('profile.colPricing'), h`<p class="small muted mb-8">${t('profile.feeHint')}</p><div class="form-grid cols-4">${C.DPD_BUCKETS.map(function (b) {
              var band = pricing.collectionFeeBands[b.id];
              return h`<div class="field"><label>${U.label(b)} (%)</label><input class="input" type="number" step="0.5" name="fee_${b.id}" value="${((p.pricing.collection || {}).feePct || {})[b.id] || ''}"><span class="xs faint">${band.min}-${band.max}%</span></div>`;
            })}
            <div class="field"><label>${t('profile.fixedFee')}</label><input class="input" type="number" name="fixedFee" value="${(p.pricing.collection || {}).fixedFee || 0}"><span class="xs faint">${t('profile.max', { n: U.money(pricing.collectionFixedFeeMax) })}</span></div>
            <div class="field"><label>${t('profile.firstContact')}</label><input class="input" type="number" name="firstContact" value="${p.sla.collectionFirstContactHours || ''}"></div></div>`) : ''}
          <div class="row end"><button type="submit" class="btn btn-primary">${t('common.saveChanges')}</button></div>
        </form>`;
    },
    actions: {
      upload: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('profile.upload'), message: t('profile.uploadBody', { doc: t('doc.' + el.getAttribute('data-type')) }), confirmLabel: t('profile.upload') });
        if (!ok) return;
        await S.providers.uploadDocument(el.getAttribute('data-type'));
        ui.toast(t('profile.uploaded'), 'success'); ctx.reload();
      },
      save: async function (form, ev, ctx, v) {
        var p = await S.providers.mine();
        var govs = U.asArray(v.gov);
        var capacity = {};
        govs.forEach(function (g) { capacity[g] = +v['cap_' + g] || 5; });
        var pricing = U.clone(p.pricing), sla = U.clone(p.sla);
        if (pricing.investigation) {
          ui.cfg.lists.inquiryTypes.forEach(function (tp) {
            pricing.investigation[tp.id] = pricing.investigation[tp.id] || {};
            C.ZONES.forEach(function (z) { if (v['price_' + tp.id + '_' + z.id] !== undefined) pricing.investigation[tp.id][z.id] = +v['price_' + tp.id + '_' + z.id]; });
            sla.investigation = sla.investigation || {};
            if (v['sla_' + tp.id]) sla.investigation[tp.id] = +v['sla_' + tp.id];
          });
        }
        if (pricing.collection) {
          C.DPD_BUCKETS.forEach(function (b) { if (v['fee_' + b.id] !== undefined) pricing.collection.feePct[b.id] = +v['fee_' + b.id]; });
          pricing.collection.fixedFee = +v.fixedFee;
          if (v.firstContact) sla.collectionFirstContactHours = +v.firstContact;
        }
        await S.providers.updateProfile({ description: v.description, phone: v.phone, email: v.email, city: v.city, governorates: govs, capacity: capacity, pricing: pricing, sla: sla });
        ui.toast(t('profile.saved'), 'success'); ctx.reload();
      }
    }
  };

  // ================================================================ ratings & feedback
  P.provider.ratings = {
    title: function () { return t('nav.feedback'); },
    load: async function (ctx) {
      var r = await Promise.all([S.ratings.received(ctx.service), S.providers.mine()]);
      return { ratings: r[0], provider: r[1] };
    },
    render: function (d, ctx) {
      var sc = d.provider.score && d.provider.score.byService[ctx.service];
      var canAct = wf.PROVIDER_MANAGER_ROLES.indexOf(ctx.session.user.role) >= 0;
      return h`${ui.pageHead(t('nav.feedback'), t('providerRatings.subtitle'))}
        <div class="grid side">
          <div class="stack">${d.ratings.length ? d.ratings.map(function (r) {
            return h`<div class="card ${r.status === 'removed' ? '' : r.overall <= 2 ? 'bad-edge' : ''}"><div class="card-b stack tight">
              <div class="row between wrap"><div class="row wrap">${ui.stars(r.overall)}<strong>${r.entityName}</strong><span class="mono small faint">${r.caseRef || ''}</span>${r.archived ? ui.badge(t('rating.archived'), 'muted') : ''}${r.batchId ? ui.badge(t('ratings.batchRating'), 'neutral') : ''}
                ${r.status === 'removed' ? ui.badge(t('rating.removed'), 'muted') : ''}${r.hidden ? ui.badge(t('rating.hiddenByAdmin'), 'muted') : ''}${r.flagged ? ui.badge(t('rating.reported'), 'warning') : ''}${r.dispute ? ui.badge(t('dispute.' + (r.dispute.status === 'open' ? 'openBadge' : 'resolvedBadge'), { outcome: r.dispute.outcome ? t('dispute.outcome.' + r.dispute.outcome) : '' }), r.dispute.status === 'open' ? 'warning' : 'info') : ''}</div>
                <span class="xs faint">${U.fmtDate(r.createdAt)}</span></div>
              ${ui.criteriaView(r.criteria)}
              ${r.tags.length ? ui.tagChips(r.tags) : ''}
              ${r.feedback ? h`<p class="small">${r.feedback}</p>` : ''}
              ${r.reply ? h`<div class="t-note small"><strong>${t('rating.yourReply')}</strong>: ${r.reply.text}</div>` : ''}
              ${canAct && r.status === 'active' ? h`<div class="row wrap">
                <button type="button" class="btn btn-sm" data-action="reply" data-id="${r.id}">${icon('message')}${r.reply ? t('rating.editReply') : t('rating.reply')}</button>
                ${!r.dispute || r.dispute.status !== 'open' ? h`<button type="button" class="btn btn-sm" data-action="dispute" data-id="${r.id}">${icon('scale')}${t('rating.dispute')}</button>` : ''}
                ${r.feedback && !r.flagged && !r.hidden ? h`<button type="button" class="btn btn-sm btn-ghost" data-action="flag" data-id="${r.id}">${icon('flag')}${t('rating.report')}</button>` : ''}
              </div>` : ''}
            </div></div>`;
          }) : ui.card(null, ui.empty(t('providerRatings.none'), null, 'star'))}</div>
          ${ui.card(t('providerRatings.summary'), sc ? h`<div class="stack">
            <div class="row between">${ui.rating(sc.avgRating, sc.ratingCount, sc.isNew)}${ui.scoreBox(sc.score)}</div>
            ${sc.isNew ? h`<p class="small muted">${t('providerRatings.newExplain', { n: ui.cfg.scoring.minRatings })}</p>` : ''}
            ${ui.criteriaView(sc.criteria)}
            <p class="xs faint">${t('providerRatings.weighting', { days: ui.cfg.scoring.recencyDays, cap: ui.cfg.scoring.entityCapPct })}</p>
          </div>` : ui.empty(t('score.none')))}
        </div>`;
    },
    actions: {
      reply: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('rating.reply'), message: t('rating.replyHint'), reason: 'required', reasonLabel: t('rating.replyLabel'), confirmLabel: t('rating.publishReply') });
        if (!v) return;
        await S.ratings.reply(el.getAttribute('data-id'), v.reason);
        ui.toast(t('rating.replySaved'), 'success'); ctx.reload();
      },
      dispute: async function (el, ev, ctx) { if (await ui.dialogs.dispute('rating', el.getAttribute('data-id'))) ctx.reload(); },
      flag: async function (el, ev, ctx) {
        var v = await ui.confirm({ title: t('rating.report'), message: t('rating.reportBody'), reason: 'required', confirmLabel: t('rating.report') });
        if (!v) return;
        await S.ratings.flag(el.getAttribute('data-id'), v.reason);
        ui.toast(t('rating.reportedToast'), 'success'); ctx.reload();
      }
    }
  };

  // ================================================================ rate clients
  P.provider.clients = {
    title: function () { return t('nav.rateClients'); },
    load: async function () {
      var r = await Promise.all([S.ratings.clientPending(), S.ratings.clientRatings()]);
      return { pending: r[0], given: r[1] };
    },
    render: function (d) {
      return h`${ui.pageHead(t('nav.rateClients'), t('clientRating.subtitle'))}
        <div class="grid cols-2">
          ${ui.card(t('clientRating.pending', { n: d.pending.length }), ui.table([
            { label: t('case.ref'), render: function (x) { return h`<span class="mono">${x.ref}</span>${x.kind === 'batch' ? h`<div class="sub">${t('clientRating.batchOf', { n: x.cases })}</div>` : ''}`; } },
            { label: t('case.client'), render: function (x) { return x.entityName; } },
            { label: t('ratings.closedOn'), render: function (x) { return U.fmtDate(x.closedAt); } },
            { label: '', cls: 'right', render: function (x) { return h`<button type="button" class="btn btn-sm btn-primary" data-action="rate" data-kind="${x.kind}" data-id="${x.id}">${t('clientRating.rateBtn')}</button>`; } }
          ], d.pending, { empty: t('clientRating.nonePending') }), { flush: true })}
          ${ui.card(t('clientRating.given'), ui.table([
            { label: t('case.client'), render: function (r) { return r.entityName; } },
            { label: t('clientRating.dataQuality'), render: function (r) { return ui.stars(r.dataQuality); } },
            { label: t('clientRating.paymentTimeliness'), render: function (r) { return ui.stars(r.paymentTimeliness); } },
            { label: t('common.comment'), render: function (r) { return h`<span class="small">${r.comment || '-'}</span>`; } }
          ], d.given, { empty: t('common.empty') }), { flush: true })}
        </div>`;
    },
    actions: {
      rate: async function (el, ev, ctx) {
        var list = await S.ratings.clientPending();
        var item = list.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        if (await ui.flows.rateClient(item)) ctx.reload();
      }
    }
  };

  // ================================================================ earnings
  P.provider.earningsView = function (d, title) {
    return h`${ui.pageHead(title, t('earnings.subtitle', { pct: d.feePct }))}
      <div class="kpis">
        ${ui.kpi(t('earnings.monthGross'), U.money(d.thisMonthGross))}
        ${ui.kpi(t('earnings.monthNet'), U.money(d.thisMonthNet), t('earnings.afterFee'))}
        ${ui.kpi(t('earnings.accruing'), U.money(d.accruing), t('earnings.accruingSub'))}
        ${ui.kpi(t('earnings.pending'), U.money(d.pending), t('earnings.pendingSub'), d.pending ? 'warn' : '')}
        ${ui.kpi(t('earnings.paidOut'), U.money(d.paidOut), null, 'ok')}
      </div>
      ${ui.card(t('earnings.perCase'), ui.table([
        { label: t('case.ref'), render: function (r) { return h`<span class="mono">${r.caseRef}</span><div class="sub">${r.invoiceRef}</div>`; } },
        { label: t('case.client'), render: function (r) { return r.entityName; } },
        { label: t('case.service'), render: function (r) { return t('service.' + r.service); } },
        { label: t('invoice.closed'), render: function (r) { return U.fmtDate(r.closedAt); } },
        { label: t('earnings.gross'), num: true, render: function (r) { return h`${U.money(r.gross)}${r.adjusted ? h`<div class="sub">${t('earnings.adjusted')}</div>` : ''}`; } },
        { label: t('earnings.fee'), num: true, render: function (r) { return U.money(r.fee); } },
        { label: t('earnings.net'), num: true, render: function (r) { return h`<strong>${U.money(r.net)}</strong>`; } },
        { label: t('earnings.payout'), render: function (r) { return ui.badge(t('payout.' + r.payout), r.payout === 'paid_out' ? 'success' : r.payout === 'pending' ? 'warning' : 'neutral'); } }
      ], d.rows, { empty: t('earnings.none') }), { flush: true })}`;
  };
  P.provider.earnings = {
    title: function () { return t('nav.earnings'); },
    load: function (ctx) { return S.billing.earnings(ctx.service); },
    render: function (d) { return P.provider.earningsView(d, t('nav.earnings')); }
  };

  // ================================================================ portfolio (collection)
  P.provider.portfolio = {
    title: function () { return t('nav.portfolio'); },
    initState: function () { return { month: '' }; },
    load: async function (ctx) {
      var clock = await S.demo.clock();
      ctx.state.month = ctx.state.month || U.monthKey(clock.now);
      var rows = await S.analytics.portfolioReport(ctx.state.month);
      return { rows: rows, now: clock.now };
    },
    render: function (d, ctx) {
      if (ctx.service !== 'collection') return ui.empty(t('portfolio.collectionOnly'));
      var months = [];
      for (var i = 0; i < 4; i++) { var dt = new Date(d.now); months.push(U.monthKey(new Date(dt.getFullYear(), dt.getMonth() - i, 15).getTime())); }
      var tot = { overdue: U.sum(d.rows, function (r) { return r.overdue; }), recovered: U.sum(d.rows, function (r) { return r.recovered; }), month: U.sum(d.rows, function (r) { return r.recoveredMonth; }) };
      return h`${ui.pageHead(t('nav.portfolio'), t('portfolio.subtitle'), h`<div class="field" style="width:200px">${ui.select('month', months.map(function (m) { return { value: m, label: U.fmtMonth(m) }; }), ctx.state.month, { change: 'month' })}</div>`)}
        <div class="kpis">${ui.kpi(t('portfolio.overdue'), U.money(tot.overdue))}${ui.kpi(t('collection.recovered'), U.money(tot.recovered), null, 'ok')}${ui.kpi(t('metric.recovery'), ui.pct(tot.overdue ? tot.recovered / tot.overdue : null))}${ui.kpi(t('portfolio.recoveredMonth'), U.money(tot.month))}</div>
        ${ui.card(t('portfolio.byBatch'), ui.table([
          { label: t('portfolio.portfolio'), render: function (r) { return r.batchRef ? h`<span class="mono">${r.batchRef}</span><div class="sub">${r.batchName || ''}</div>` : h`${t('portfolio.singles')}`; } },
          { label: t('case.client'), render: function (r) { return r.entityName; } },
          { label: t('batch.cases'), num: true, render: function (r) { return h`${U.num(r.cases)}<div class="sub">${t('portfolio.openN', { n: r.open })}</div>`; } },
          { label: t('portfolio.overdue'), num: true, render: function (r) { return U.money(r.overdue); } },
          { label: t('collection.recovered'), num: true, render: function (r) { return U.money(r.recovered); } },
          { label: t('metric.recovery'), num: true, render: function (r) { return ui.pct(r.recoveryRate); } },
          { label: t('portfolio.recoveredMonth'), num: true, render: function (r) { return U.money(r.recoveredMonth); } },
          { label: t('portfolio.ptp'), num: true, render: function (r) { return h`${U.num(r.ptpKept)}/${U.num(r.ptpTotal)}`; } },
          { label: t('portfolio.ptpConversion'), num: true, render: function (r) { return ui.pct(r.ptpConversion); } }
        ], d.rows, { empty: t('common.empty') }), { flush: true })}`;
    },
    actions: { month: function (el, ev, ctx) { ctx.state.month = el.value; ctx.reload(); } }
  };
})();
