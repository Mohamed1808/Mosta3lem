/* Platform admin portal: scoring, pricing and SLA, settings, billing, audit log and
   demo controls. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, C = ICM.config, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.admin = P.admin || {};

  ui.auditLabel = function (action) {
    var key = 'audit.action.' + action.replace(/\./g, '_');
    return ICM.i18n.has(key) ? t(key) : action;
  };

  function numField(name, value, label, hint, attrs) {
    return h`<div class="field"><label>${label}</label><input class="input" type="number" name="${name}" value="${value}" ${ICM.raw(attrs || '')}>${hint ? h`<span class="hint">${hint}</span>` : ''}</div>`;
  }

  // ================================================================ scoring
  P.admin.scoring = {
    title: function () { return t('nav.scoring'); },
    load: async function () {
      var r = await Promise.all([S.config.get(), S.providers.list()]);
      return { cfg: r[0], providers: r[1] };
    },
    render: function (d) {
      var s = d.cfg.scoring, ow = C.OPERATIONAL_WEIGHTS;
      return h`${ui.pageHead(t('nav.scoring'), t('scoring.subtitle'))}
        <div class="grid side">
          <form data-submit="save" class="stack">
            ${ui.card(t('scoring.weights'), h`<div class="form-grid">
              ${numField('operationalWeight', s.operationalWeight, t('scoring.operationalWeight'), t('scoring.sumHint'), 'min="0" max="100"')}
              ${numField('ratingWeight', s.ratingWeight, t('scoring.ratingWeight'), null, 'min="0" max="100"')}
              ${numField('recencyDays', s.recencyDays, t('scoring.recencyDays'), t('scoring.recencyHint', { x: s.recentMultiplier }), 'min="1"')}
              ${numField('minRatings', s.minRatings, t('scoring.minRatings'), t('scoring.minRatingsHint'), 'min="1"')}
              ${numField('entityCapPct', s.entityCapPct, t('scoring.entityCap'), t('scoring.entityCapHint'), 'min="10" max="100"')}
            </div>`)}
            ${ui.card(t('scoring.thresholds'), h`<p class="small muted mb-8">${t('scoring.thresholdsHint')}</p><div class="form-grid cols-3">
              ${numField('warnBelow', s.warnBelow, t('scoring.warnBelow'), null, 'min="0" max="100"')}
              ${numField('reduceBelow', s.reduceBelow, t('scoring.reduceBelow'), null, 'min="0" max="100"')}
              ${numField('suspendBelow', s.suspendBelow, t('scoring.suspendBelow'), null, 'min="0" max="100"')}
            </div>`)}
            <div class="row end"><button type="submit" class="btn btn-primary">${t('scoring.saveRecalc')}</button></div>
            ${ui.card(t('scoring.formula'), h`<div class="stack small">
              <p>${t('scoring.formulaText')}</p>
              <dl class="dl"><dt>${t('service.investigation')}</dt><dd>${t('metric.onTime')} ${U.pct(ow.investigation.onTime, 0)} · ${t('metric.firstTime')} ${U.pct(ow.investigation.firstTime, 0)} · ${t('metric.evidence')} ${U.pct(ow.investigation.evidence, 0)}</dd>
              <dt>${t('service.collection')}</dt><dd>${t('metric.recoveryNorm')} ${U.pct(ow.collection.recovery, 0)} · ${t('metric.ptpKept')} ${U.pct(ow.collection.ptpKept, 0)} · ${t('scoring.noComplaints')} ${U.pct(ow.collection.noComplaint, 0)}</dd></dl>
              <p class="faint">${t('scoring.rankingText')}</p></div>`)}
          </form>
          ${ui.card(t('scoring.current'), ui.table([
            { label: t('common.name'), render: function (p) { return h`<a href="#/admin/providers/${p.id}">${p.name}</a>`; } },
            { label: t('score.label'), num: true, render: function (p) { return ui.scoreBox(p.score ? p.score.overall : null); } },
            { label: t('admin.enforcement'), render: function (p) { return ui.status(p.enforcement.level, 'enforcement'); } }
          ], U.sortBy(d.providers, function (p) { return p.score ? p.score.overall : null; }, true)), { flush: true })}
        </div>`;
    },
    actions: {
      save: async function (form, ev, ctx, v) {
        var before = await S.providers.list();
        var ok = await ui.confirm({ title: t('scoring.saveRecalc'), message: t('scoring.confirmBody'), confirmLabel: t('common.save') });
        if (!ok) return;
        await S.config.updateScoring(v);
        var after = await S.providers.list();
        var changed = after.filter(function (p) { var b = before.filter(function (x) { return x.id === p.id; })[0]; return b && b.enforcement.level !== p.enforcement.level; });
        ui.toast(changed.length ? t('scoring.savedChanges', { list: changed.map(function (p) { return p.name + ': ' + t('enforcement.' + p.enforcement.level); }).join(', ') }) : t('scoring.saved'), 'success');
        ctx.reload();
      }
    }
  };

  // ================================================================ pricing & SLA
  P.admin.pricing = {
    title: function () { return t('nav.pricing'); },
    load: function () { return S.config.get(); },
    render: function (cfg) {
      var p = cfg.pricing;
      return h`${ui.pageHead(t('nav.pricing'), t('pricing.subtitle'))}
        <form data-submit="save" class="stack">
          ${ui.card(t('pricing.general'), h`<div class="form-grid cols-4">
            ${numField('platformFeePct', p.platformFeePct, t('pricing.fee'), t('errors.feeNeedsTwoTeams'), 'readonly')}
            ${numField('offerWindowHours', p.offerWindowHours, t('pricing.window'), t('pricing.windowHint'), 'min="1" max="72"')}
            ${numField('offerWarnMinutes', p.offerWarnMinutes, t('pricing.warn'), null, 'min="5"')}
            ${numField('defaultCollectionDays', p.defaultCollectionDays, t('pricing.collectionDays'), null, 'min="1"')}
          </div>`)}
          ${ui.card(t('pricing.invBands'), h`<div class="table-wrap"><table class="table"><thead><tr><th>${t('case.inquiryTypes')}</th><th>${t('pricing.min')}</th><th>${t('pricing.max')}</th><th>${t('pricing.defaultSla')}</th><th>${t('pricing.minPhotos')}</th></tr></thead><tbody>
            ${cfg.lists.inquiryTypes.map(function (tp) {
              var b = p.investigationBands[tp.id] || { min: 0, max: 0 };
              return h`<tr><td><strong>${U.label(tp)}</strong></td><td><input class="input" type="number" name="inv_min_${tp.id}" value="${b.min}"></td><td><input class="input" type="number" name="inv_max_${tp.id}" value="${b.max}"></td><td><input class="input" type="number" name="sla_${tp.id}" value="${tp.defaultSlaHours}"></td><td class="faint">${tp.minPhotos}</td></tr>`;
            })}</tbody></table></div>
            <h3 class="mt-16 mb-8">${t('pricing.zones')}</h3><div class="form-grid cols-4">${C.ZONES.map(function (z) {
              return numField('zone_' + z.id, p.zoneMultiplier[z.id], U.label(z), null, 'step="0.05" min="0.5" max="3"');
            })}</div>`)}
          ${ui.card(t('pricing.colBands'), h`<div class="form-grid cols-4">${C.DPD_BUCKETS.map(function (b) {
              var band = p.collectionFeeBands[b.id];
              return h`<div class="field"><label>${U.label(b)}</label><div class="row"><input class="input" type="number" step="0.5" name="col_min_${b.id}" value="${band.min}" aria-label="${t('pricing.min')}"><span>-</span><input class="input" type="number" step="0.5" name="col_max_${b.id}" value="${band.max}" aria-label="${t('pricing.max')}"><span>%</span></div></div>`;
            })}${numField('collectionFixedFeeMax', p.collectionFixedFeeMax, t('pricing.fixedFeeMax'))}</div>`)}
          <div class="row end"><button type="submit" class="btn btn-primary">${t('common.saveChanges')}</button></div>
        </form>`;
    },
    actions: {
      save: async function (form, ev, ctx, v) {
        var cfg = await S.config.get();
        var p = U.clone(cfg.pricing);
        ['platformFeePct', 'offerWindowHours', 'offerWarnMinutes', 'defaultCollectionDays', 'collectionFixedFeeMax'].forEach(function (k) { p[k] = +v[k]; });
        cfg.lists.inquiryTypes.forEach(function (tp) { p.investigationBands[tp.id] = { min: +v['inv_min_' + tp.id], max: +v['inv_max_' + tp.id] }; });
        C.ZONES.forEach(function (z) { p.zoneMultiplier[z.id] = +v['zone_' + z.id]; });
        C.DPD_BUCKETS.forEach(function (b) { p.collectionFeeBands[b.id] = { min: +v['col_min_' + b.id], max: +v['col_max_' + b.id] }; });
        var sla = {};
        cfg.lists.inquiryTypes.forEach(function (tp) { sla[tp.id] = +v['sla_' + tp.id]; });
        await S.config.updatePricing({ pricing: p, slaHours: sla });
        ui.toast(t('pricing.saved'), 'success'); ctx.reload();
      }
    }
  };

  // ================================================================ settings (lists)
  var LIST_FIELDS = {
    governorates: [{ k: 'zone', type: 'zone' }, { k: 'code', type: 'text', w: 60 }, { k: 'lat', type: 'number', w: 90 }, { k: 'lng', type: 'number', w: 90 }],
    inquiryTypes: [{ k: 'defaultSlaHours', type: 'number', w: 80 }, { k: 'minPhotos', type: 'number', w: 70 }],
    actionTypes: [{ k: 'kind', type: 'select', options: ['contact', 'visit', 'result', 'note'] }],
    ratingTags: [{ k: 'sentiment', type: 'select', options: ['positive', 'negative'] }],
    declineReasons: [],
    productTypes: []
  };

  P.admin.settings = {
    title: function () { return t('nav.settings'); },
    initState: function () { return { list: 'governorates', rows: null }; },
    load: function () { return S.config.get(); },
    render: function (cfg, ctx) {
      var st = ctx.state, name = st.list;
      var rows = st.rows || U.clone(cfg.lists[name]);
      st.rows = rows;
      var extra = LIST_FIELDS[name];
      return h`${ui.pageHead(t('nav.settings'), t('settings.subtitle'))}
        ${ui.tabs(Object.keys(LIST_FIELDS).map(function (k) { return { id: k, label: t('settings.list.' + k), count: cfg.lists[k].length }; }), name, 'pick')}
        <form data-submit="save">${ui.card(null, h`<div class="table-wrap"><table class="table"><thead><tr><th>${t('settings.id')}</th><th>${t('settings.en')}</th><th>${t('settings.ar')}</th>${extra.map(function (f) { return h`<th>${t('settings.field.' + f.k)}</th>`; })}<th></th></tr></thead><tbody>
          ${rows.map(function (r, i) {
            return h`<tr><td><input class="input" name="id_${i}" value="${r.id}" ${r._new ? '' : 'readonly'} style="min-width:120px" dir="ltr"></td>
              <td><input class="input" name="en_${i}" value="${r.en || ''}"></td><td><input class="input" name="ar_${i}" value="${r.ar || ''}" dir="rtl"></td>
              ${extra.map(function (f) {
                if (f.type === 'zone') return h`<td>${ui.select(f.k + '_' + i, C.ZONES.map(function (z) { return { value: z.id, label: U.label(z) }; }), r[f.k])}</td>`;
                if (f.type === 'select') return h`<td>${ui.select(f.k + '_' + i, f.options.map(function (o) { return { value: o, label: t('settings.opt.' + o) }; }), r[f.k])}</td>`;
                return h`<td><input class="input" type="${f.type}" step="any" name="${f.k}_${i}" value="${r[f.k] == null ? '' : r[f.k]}" style="width:${f.w || 100}px"></td>`;
              })}
              <td class="right"><button type="button" class="btn-icon" data-action="remove" data-idx="${i}" aria-label="${t('common.delete')}">${icon('trash')}</button></td></tr>`;
          })}</tbody></table></div>`, { flush: true, footer: h`<button type="button" class="btn" data-action="add">${icon('plus')}${t('settings.addRow')}</button><button type="button" class="btn btn-ghost" data-action="discard">${t('settings.discard')}</button><button type="submit" class="btn btn-primary">${t('common.saveChanges')}</button>` })}</form>
        <p class="small faint mt-8">${t('settings.note')}</p>`;
    },
    actions: {
      pick: function (el, ev, ctx) { ctx.state.list = el.getAttribute('data-value'); ctx.state.rows = null; ctx.reload(); },
      add: function (el, ev, ctx) {
        sync(ctx);
        var r = { id: 'new_' + (ctx.state.rows.length + 1), en: '', ar: '', _new: true };
        if (ctx.state.list === 'governorates') Object.assign(r, { zone: 'greater_cairo', code: '', lat: 30.04, lng: 31.23 });
        if (ctx.state.list === 'inquiryTypes') Object.assign(r, { defaultSlaHours: 48, minPhotos: 2 });
        if (ctx.state.list === 'actionTypes') r.kind = 'contact';
        if (ctx.state.list === 'ratingTags') r.sentiment = 'positive';
        ctx.state.rows.push(r);
        ctx.reload();
      },
      remove: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('settings.removeTitle'), message: t('settings.removeBody'), danger: true, confirmLabel: t('common.delete') });
        if (!ok) return;
        sync(ctx);
        ctx.state.rows.splice(+el.getAttribute('data-idx'), 1);
        ctx.reload();
      },
      discard: function (el, ev, ctx) { ctx.state.rows = null; ctx.reload(); },
      save: async function (form, ev, ctx) {
        sync(ctx);
        var items = ctx.state.rows.map(function (r) { var x = Object.assign({}, r); delete x._new; return x; });
        await S.config.updateList(ctx.state.list, items);
        ctx.state.rows = null;
        ui.toast(t('settings.saved'), 'success');
        ctx.reload();
      }
    }
  };
  function sync(ctx) {
    var form = document.querySelector('form[data-submit="save"]');
    if (!form) return;
    var v = U.formData(form);
    var extra = LIST_FIELDS[ctx.state.list];
    ctx.state.rows = ctx.state.rows.map(function (r, i) {
      var n = Object.assign({}, r, { id: (v['id_' + i] || r.id).trim(), en: v['en_' + i], ar: v['ar_' + i] });
      extra.forEach(function (f) { if (v[f.k + '_' + i] !== undefined) n[f.k] = f.type === 'number' ? +v[f.k + '_' + i] : v[f.k + '_' + i]; });
      return n;
    });
  }

  // ================================================================ billing
  P.admin.billing = {
    title: function () { return t('nav.billing'); },
    initState: function () { return { tab: 'draft' }; },
    load: function () { return S.billing.invoices(); },
    render: function (list, ctx) {
      var tab = ctx.state.tab;
      var shown = list.filter(function (i) { return i.status === tab; });
      return h`${ui.pageHead(t('nav.billing'), t('admin.billingSubtitle'))}
        ${ui.tabs(['draft', 'issued', 'paid'].map(function (s) { return { id: s, label: t('invoiceStatus.' + s), count: list.filter(function (i) { return i.status === s; }).length }; }), tab, 'tab')}
        ${ui.card(null, ui.table([
          { label: t('invoice.ref'), render: function (i) { return h`<span class="mono">${i.ref}</span>`; } },
          { label: t('invoice.month'), render: function (i) { return U.fmtMonth(i.month); } },
          { label: t('invoice.client'), render: function (i) { return i.entityName; } },
          { label: t('invoice.provider'), render: function (i) { return i.providerName; } },
          { label: t('invoice.total'), num: true, render: function (i) { return U.money(i.subtotal); } },
          { label: t('invoice.platformFee'), num: true, render: function (i) { return U.money(i.platformFee); } },
          { label: '', cls: 'right', render: function (i) { return h`<span class="row end"><button type="button" class="btn btn-sm" data-action="view" data-id="${i.id}">${t('common.view')}</button>${i.status === 'draft' ? h`<button type="button" class="btn btn-sm btn-primary" data-action="issue" data-id="${i.id}">${t('invoice.issue')}</button>` : ''}</span>`; } }
        ], shown, { empty: t('invoice.none') }), { flush: true })}`;
    },
    actions: {
      tab: function (el, ev, ctx) { ctx.state.tab = el.getAttribute('data-value'); ctx.reload(); },
      view: async function (el) {
        var inv = (await S.billing.invoices()).filter(function (i) { return i.id === el.getAttribute('data-id'); })[0];
        ui.modal.open({ title: t('invoice.title', { ref: inv.ref }), size: 'lg', body: P.entity.invoiceLines(inv) });
      },
      issue: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('invoice.issue'), message: t('invoice.issueBody'), confirmLabel: t('invoice.issue') });
        if (!ok) return;
        await S.billing.issue(el.getAttribute('data-id')); ui.toast(t('invoice.issued'), 'success'); ctx.reload();
      }
    }
  };

  // ================================================================ audit log
  function compact(o) {
    if (!o) return '';
    return Object.keys(o).filter(function (k) { return o[k] != null && typeof o[k] !== 'object'; }).map(function (k) {
      var v = o[k];
      if (k === 'status') v = t('status.' + v);
      if (k === 'level') v = t('enforcement.' + v);
      if (/At$|^dueAt$|offsetMs/.test(k) && typeof v === 'number') v = k === 'offsetMs' ? U.fmtDuration(v) : U.fmtDateTime(v);
      return k + ': ' + v;
    }).join(', ');
  }
  P.admin.audit = {
    title: function () { return t('nav.audit'); },
    initState: function () { return { f: {} }; },
    load: function (ctx) {
      var f = Object.assign({}, ctx.state.f);
      if (f.from) f.from = new Date(f.from).getTime();
      if (f.to) f.to = U.endOfDay(new Date(f.to).getTime());
      return S.audit.list(f);
    },
    render: function (rows, ctx) {
      var f = ctx.state.f;
      return h`${ui.pageHead(t('nav.audit'), t('audit.subtitle', { n: rows.length }))}
        <div class="filters">
          <div class="field wide"><label for="audq">${t('common.search')}</label><div class="searchbox">${icon('search')}<input id="audq" class="input" value="${f.q || ''}" data-input="q"></div></div>
          <div class="field"><label>${t('audit.target')}</label>${ui.select('targetType', [{ value: '', label: t('common.all') }].concat(['case', 'offer', 'batch', 'provider', 'rating', 'dispute', 'invoice', 'config', 'user', 'agent', 'entity', 'clock'].map(function (x) { return { value: x, label: t('audit.type.' + x) }; })), f.targetType, { change: 'filter' })}</div>
          <div class="field"><label>${t('common.role')}</label>${ui.select('actorRole', [{ value: '', label: t('common.all') }].concat(wf.ALL_ROLES.map(function (r) { return { value: r, label: t('role.' + r) }; })), f.actorRole, { change: 'filter' })}</div>
          <div class="field"><label>${t('common.from')}</label><input class="input" type="date" name="from" value="${f.from || ''}" data-change="filter"></div>
          <div class="field"><label>${t('common.to')}</label><input class="input" type="date" name="to" value="${f.to || ''}" data-change="filter"></div>
        </div>
        ${ui.card(null, ui.table([
          { label: t('common.when'), render: function (a) { return h`<span class="small nowrap">${U.fmtDateTime(a.at)}</span>`; } },
          { label: t('audit.who'), render: function (a) { return h`${a.actorName}<div class="sub">${t('role.' + a.actorRole)}</div>`; } },
          { label: t('audit.what'), render: function (a) { return ui.auditLabel(a.action); } },
          { label: t('audit.target'), render: function (a) { return h`<span class="small">${t('audit.type.' + a.targetType)}</span> <span class="mono small">${a.targetRef || ''}</span>`; } },
          { label: t('audit.beforeAfter'), render: function (a) { return h`<span class="small">${compact(a.before) || '-'} ${a.after ? h`→ ${compact(a.after)}` : ''}</span>`; } },
          { label: t('common.reason'), render: function (a) { return h`<span class="small muted">${a.reason || ''}</span>`; } }
        ], rows), { flush: true })}`;
    },
    actions: {
      filter: function (el, ev, ctx) { ctx.state.f[el.name] = el.value; ctx.reload(); },
      q: function (el, ev, ctx) { ctx.state.f.q = el.value; ctx.reload(); }
    }
  };

  // ================================================================ demo controls
  P.admin.demo = {
    title: function () { return t('nav.demo'); },
    initState: function () { return { last: null }; },
    load: async function () {
      var r = await Promise.all([S.demo.clock(), S.batches.list()]);
      return { clock: r[0], batches: r[1] };
    },
    render: function (d, ctx) {
      var last = ctx.state.last;
      return h`${ui.pageHead(t('nav.demo'), t('demo.subtitle'))}
        <div class="grid cols-2">
          ${ui.card(t('demo.clock'), h`<div class="stack">
            <div><div class="money-big">${U.fmtDateTime(d.clock.now)}</div><div class="small muted">${d.clock.offsetMs ? t('demo.ahead', { time: U.fmtDuration(d.clock.offsetMs) }) : t('demo.realTime')}</div></div>
            <div class="row wrap">
              <button type="button" class="btn" data-action="advance" data-h="1">${icon('forward')}${t('demo.advance1h')}</button>
              <button type="button" class="btn" data-action="advance" data-h="5">${icon('forward')}${t('demo.advance5h')}</button>
              <button type="button" class="btn" data-action="advance" data-h="24">${icon('forward')}${t('demo.advance1d')}</button>
            </div>
            <form data-submit="custom" class="row"><input class="input" type="number" name="hours" min="1" placeholder="${t('demo.hours')}" style="width:120px"><button type="submit" class="btn">${t('demo.advanceBy')}</button></form>
            ${d.clock.offsetMs ? h`<button type="button" class="btn btn-ghost" data-action="resetClock">${t('demo.resetClock')}</button>` : ''}
            ${last ? ui.notice(t('demo.tickSummary', { expired: last.expired || 0, warned: last.warned || 0, atRisk: last.atRisk || 0, breached: last.breached || 0, promises: last.brokenPromises || 0 }), 'info', 'clock') : ''}
            <p class="xs faint">${t('demo.clockHint')}</p>
          </div>`)}
          ${ui.card(t('demo.data'), h`<div class="stack">
            <p class="small">${t('demo.resetHint')}</p>
            <div><button type="button" class="btn btn-danger" data-action="resetDemo">${icon('refresh')}${t('demo.reset')}</button></div>
            <div class="sep"></div>
            <p class="small">${t('demo.simulateHint')}</p>
            <form data-submit="simulate" class="row">${ui.select('batchId', d.batches.filter(function (b) { return b.status !== 'closed'; }).map(function (b) { return { value: b.id, label: b.ref + ' · ' + b.entityName }; }), '')}<button type="submit" class="btn">${icon('play')}${t('demo.simulate')}</button></form>
          </div>`)}
        </div>
        <div class="mt-16">${ui.card(t('demo.guide'), h`<ol class="small stack tight" style="padding-inline-start:18px;margin:0">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return h`<li>${t('demo.scenario.' + n)}</li>`; })}</ol>`)}</div>`;
    },
    actions: {
      advance: async function (el, ev, ctx) {
        ctx.state.last = await S.demo.advance(+el.getAttribute('data-h') * U.HOUR);
        ui.toast(t('demo.advanced'), 'success'); ctx.reload();
      },
      custom: async function (form, ev, ctx, v) {
        if (!(+v.hours > 0)) return;
        ctx.state.last = await S.demo.advance(+v.hours * U.HOUR);
        ui.toast(t('demo.advanced'), 'success'); ctx.reload();
      },
      resetClock: async function (el, ev, ctx) { await S.demo.resetClock(); ctx.state.last = null; ctx.reload(); },
      simulate: async function (form, ev, ctx, v) {
        if (!v.batchId) return;
        var ok = await ui.confirm({ title: t('demo.simulate'), message: t('demo.simulateBody'), confirmLabel: t('demo.simulate') });
        if (!ok) return;
        var r = await S.demo.simulateBatchWork(v.batchId);
        ui.toast(t('demo.simulated', { n: r.advanced }), 'success'); ctx.reload();
      }
    }
  };
})();
