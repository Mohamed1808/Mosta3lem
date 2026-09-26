/* Entity portal: bulk upload and batches. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, C = ICM.config, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.entity = P.entity || {};

  var EDIT_COLS = {
    investigation: ['full_name', 'national_id', 'mobile', 'inquiry_types', 'governorate', 'city', 'street'],
    collection: ['full_name', 'national_id', 'mobile', 'governorate', 'city', 'street', 'contract_number', 'product_type', 'overdue_amount', 'days_past_due']
  };

  // ================================================================ bulk upload
  P.entity.bulk = {
    title: function () { return t('nav.bulkUpload'); },
    initState: function () { return { service: null, rows: null, fileName: '', onlyErrors: false, name: '', defaults: {} }; },
    render: function (d, ctx) {
      var st = ctx.state;
      var services = ['investigation', 'collection'].filter(function (s) { return wf.entityServes(ctx.session.user.role, s); });
      if (!st.service && services.length === 1) st.service = services[0];
      var head = ui.pageHead(t('nav.bulkUpload'), t('bulk.subtitle'));
      var step1 = ui.card(t('bulk.step1'), h`<div class="stack">
        <div class="row wrap">${services.map(function (s) {
          return h`<button type="button" class="btn ${st.service === s ? 'btn-primary' : ''}" data-action="pickService" data-value="${s}">${t('service.' + s)}</button>`;
        })}</div>
        ${st.service ? h`<div class="row wrap"><button type="button" class="btn" data-action="template">${icon('download')}${t('bulk.downloadTemplate')}</button>
          <button type="button" class="btn btn-ghost" data-action="demoFile">${icon('download')}${t('bulk.downloadDemo')}</button></div>
          <p class="small muted">${t('bulk.templateHint')}</p>` : ''}
      </div>`);
      if (!st.service) return h`${head}${step1}`;
      var step2 = ui.card(t('bulk.step2'), h`<div class="stack">
        <input type="file" id="bulk-file" accept=".xlsx,.xls,.csv" data-change="upload">
        ${st.fileName ? h`<p class="small muted">${t('bulk.loaded', { name: st.fileName, n: st.rows ? st.rows.length : 0 })}</p>` : ''}</div>`);
      var parts = [head, h`<div class="grid cols-2">${step1}${step2}</div>`];
      if (st.rows) {
        var active = st.rows.filter(function (r) { return !r.excluded; });
        var bad = active.filter(function (r) { return !r.valid; });
        var excluded = st.rows.length - active.length;
        var cols = EDIT_COLS[st.service];
        var shown = st.onlyErrors ? st.rows.filter(function (r) { return !r.valid; }) : st.rows;
        parts.push(h`<div class="mt-16">${ui.card(t('bulk.step3'), h`
          <div class="row wrap mb-8">${ui.badge(t('bulk.validRows', { n: active.length - bad.length }), 'success')}${bad.length ? ui.badge(t('bulk.errorRows', { n: bad.length }), 'danger') : ''}${excluded ? ui.badge(t('bulk.excludedRows', { n: excluded }), 'muted') : ''}
            <label class="check small" style="margin-inline-start:auto"><input type="checkbox" data-change="toggleErrors" ${st.onlyErrors ? 'checked' : ''}>${t('bulk.onlyErrors')}</label></div>
          <p class="small muted mb-8">${t('bulk.fixHint')}</p>
          <div class="table-wrap" style="max-height:520px;overflow:auto"><table class="table">
            <thead><tr><th>${t('bulk.row')}</th><th>${t('bulk.include')}</th>${cols.map(function (c) { return h`<th>${t('bulk.col.' + c)}</th>`; })}<th>${t('bulk.issues')}</th></tr></thead>
            <tbody>${shown.map(function (r) {
              var idx = st.rows.indexOf(r);
              return h`<tr class="${r.excluded ? 'excluded' : ''} ${!r.valid && !r.excluded ? 'row-bad' : ''}">
                <td class="mono">${r.rowNo}</td>
                <td><input type="checkbox" data-change="toggleRow" data-idx="${idx}" ${r.excluded ? '' : 'checked'} aria-label="${t('bulk.include')}"></td>
                ${cols.map(function (c) {
                  var err = r.errors && r.errors[c];
                  return h`<td class="${err ? 'cell-bad' : ''}"><input class="input" id="cell-${idx}-${c}" data-change="editCell" data-idx="${idx}" data-col="${c}" value="${r.raw[c] || ''}" ${err ? ICM.raw('title="' + ICM.esc(t(err)) + '"') : ''}></td>`;
                })}
                <td class="small">${r.valid ? ui.badge(t('bulk.ok'), 'success') : Object.keys(r.errors).map(function (k) { return h`<div style="color:var(--bad)">${t('bulk.col.' + k) !== 'bulk.col.' + k ? t('bulk.col.' + k) : k}: ${t(r.errors[k])}</div>`; })}</td>
              </tr>`;
            })}</tbody></table></div>`, { flush: false })}</div>`);
        parts.push(h`<div class="mt-16">${ui.card(t('bulk.step4'), h`<form data-submit="createBatch" class="stack">
          <div class="form-grid cols-3">
            <div class="field"><label>${t('bulk.batchName')}</label><input class="input" name="name" value="${st.name}" placeholder="${t('bulk.batchNameHint')}"></div>
            ${st.service === 'collection' ? h`
              <div class="field"><label>${t('bulk.periodDays')}</label><input class="input" type="number" name="periodDays" min="1" value="${st.defaults.periodDays || ui.cfg.pricing.defaultCollectionDays}"></div>
              <div class="field"><label>${t('forms.collectionRequest.settlementMode')}</label>${ui.select('settlementMode', ['none', 'discount', 'instalments'].map(function (m) { return { value: m, label: t('forms.collectionRequest.settlement.' + m) }; }), st.defaults.settlementMode || 'none')}</div>
              <div class="field"><label>${t('forms.collectionRequest.maxDiscountPct')}</label><input class="input" type="number" name="maxDiscountPct" min="1" max="60" value="${st.defaults.maxDiscountPct || ''}"></div>` : ''}
          </div>
          ${bad.length ? ui.notice(t('bulk.fixBeforeCreate', { n: bad.length }), 'bad') : ''}
          <div class="row end"><button type="submit" class="btn btn-primary" ${bad.length || !active.length ? 'disabled' : ''}>${icon('layers')}${t('bulk.create', { n: active.length })}</button></div>
        </form>`)}</div>`);
      }
      return parts;
    },
    actions: {
      pickService: function (el, ev, ctx) { ctx.state.service = el.getAttribute('data-value'); ctx.state.rows = null; ctx.state.fileName = ''; ctx.reload(); },
      template: function (el, ev, ctx) { return S.batches.downloadTemplate(ctx.state.service); },
      demoFile: function (el, ev, ctx) { return S.batches.downloadDemoFile(ctx.state.service); },
      upload: async function (el, ev, ctx) {
        var f = el.files && el.files[0];
        if (!f) return;
        ctx.state.rows = await S.batches.parseFile(f, ctx.state.service);
        ctx.state.fileName = f.name;
        ctx.state.name = ctx.state.name || f.name.replace(/\.[^.]+$/, '');
        ctx.reload();
      },
      toggleErrors: function (el, ev, ctx) { ctx.state.onlyErrors = el.checked; ctx.reload(); },
      toggleRow: function (el, ev, ctx) { ctx.state.rows[+el.getAttribute('data-idx')].excluded = !el.checked; ctx.reload(); },
      editCell: async function (el, ev, ctx) {
        var st = ctx.state;
        st.rows[+el.getAttribute('data-idx')].raw[el.getAttribute('data-col')] = el.value;
        st.rows = await S.batches.validateRows(st.service, st.rows, st.defaults);
        ctx.reload();
      },
      createBatch: async function (form, ev, ctx, values) {
        var st = ctx.state;
        st.name = values.name;
        st.defaults = { periodDays: values.periodDays, settlementMode: values.settlementMode, maxDiscountPct: values.maxDiscountPct };
        var n = st.rows.filter(function (r) { return !r.excluded; }).length;
        var ok = await ui.confirm({ title: t('bulk.confirmTitle'), message: t('bulk.confirmBody', { n: n }), confirmLabel: t('bulk.create', { n: n }) });
        if (!ok) return;
        var b = await S.batches.create(st.service, values.name, st.rows, st.defaults);
        ICM.app.pageState = {};
        ui.toast(t('bulk.created', { ref: b.ref }), 'success');
        ctx.navigate('#/client/batches/' + b.id);
      }
    }
  };

  // ================================================================ batches list
  P.entity.batches = {
    live: true,
    title: function () { return t('nav.batches'); },
    load: function () { return S.batches.list(); },
    render: function (rows) {
      return h`${ui.pageHead(t('nav.batches'), t('batch.subtitle'), h`<a class="btn btn-primary" href="#/client/bulk">${icon('upload')}${t('nav.bulkUpload')}</a>`)}
        ${ui.card(null, P.entity.batchTable(rows, '#/client/batches/'), { flush: true })}`;
    }
  };

  P.entity.batchTable = function (rows, base, showEntity) {
    return ui.table([
      { label: t('batch.ref'), render: function (b) { return h`<span class="mono">${b.ref}</span><div class="sub">${b.name || ''}</div>`; } },
      showEntity ? { label: t('case.client'), render: function (b) { return b.entityName; } } : null,
      { label: t('case.service'), render: function (b) { return ui.serviceBadge(b.service); } },
      { label: t('batch.created'), render: function (b) { return h`<span class="small">${U.fmtDate(b.createdAt)}</span>`; } },
      { label: t('batch.progress'), render: function (b) { return h`<div class="bar-mini" style="min-width:140px">${ui.progress(b.progress.pct, b.progress.pct === 1 ? 'ok' : '')}<span class="small nowrap">${b.progress.closed}/${b.progress.total}</span></div>`; } },
      { label: t('common.status'), render: function (b) { return h`${ui.status(b.status)}${b.needsRating ? h` ${ui.badge(t('batch.ratingPending'), 'warning')}` : ''}`; } },
      { label: t('batch.providers'), render: function (b) { return h`<span class="small">${b.providers.map(function (p) { return p.name; }).join(', ') || '-'}</span>`; } }
    ].filter(Boolean), rows, { href: function (b) { return base + b.id; }, empty: t('batch.none') });
  };

  // ================================================================ batch detail
  function assignmentPanel(plan, st) {
    var mode = st.mode || (plan.groups.length > 1 ? 'split' : 'single');
    var price = function (p) { return plan.batch.service === 'investigation' ? U.money(p.price) : t('select.feeText', { pct: p.feePct, fixed: U.money(p.fixedFee) }); };
    var opt = function (p) { return { value: p.id, label: p.name + ' · ' + t('score.short', { n: p.score == null ? '-' : U.num(p.score, 0) }) + ' · ' + price(p) + ' · ' + t('avail.' + p.availability) }; };
    var body;
    if (mode === 'single') {
      body = plan.whole.providers.length ? h`<div class="field"><label>${t('batch.oneProvider')}</label>${ui.select('all', [{ value: '', label: t('common.select') }].concat(plan.whole.providers.map(opt)), st.pick && st.pick.all)}</div>`
        : ui.notice(t('batch.noSingleProvider'), 'warn');
    } else {
      body = ui.table([
        { label: t('address.governorate'), render: function (g) { return h`<strong>${ui.gov(g.governorate)}</strong>`; } },
        { label: t('batch.cases'), num: true, render: function (g) { return U.num(g.count); } },
        { label: t('case.provider'), render: function (g) {
          return g.eligible.providers.length ? ui.select('g_' + g.governorate, [{ value: '', label: t('common.select') }].concat(g.eligible.providers.map(opt)), st.pick && st.pick['g_' + g.governorate]) : h`<span class="small" style="color:var(--bad)">${t('batch.noProviderForGroup')}</span>`;
        } }
      ], plan.groups);
    }
    return ui.card(t('batch.assignTitle', { n: plan.open }), h`<form data-submit="assign" class="stack">
      <div class="row wrap">${ui.segmented([{ id: 'single', label: t('batch.modeSingle') }, { id: 'split', label: t('batch.modeSplit') }], mode, 'setMode')}
        <button type="button" class="btn btn-sm" data-action="autoAssign">${icon('zap')}${t('select.autoBest')}</button></div>
      <input type="hidden" name="_mode" value="${mode}">
      ${body}
      <div class="row end"><button type="submit" class="btn btn-primary">${icon('send')}${t('batch.sendOffers')}</button></div>
    </form>`, { cls: 'accent-edge' });
  }

  P.entity.batchDetail = {
    live: true,
    title: function (d) { return d ? d.batch.ref : t('nav.batches'); },
    initState: function () { return { mode: null, pick: {} }; },
    load: async function (ctx) {
      var b = await S.batches.get(ctx.params.id);
      var plan = b.assignable && !b.closedAt ? await S.batches.plan(b.id) : null;
      return { batch: b, plan: plan };
    },
    render: function (d, ctx) {
      var b = d.batch;
      var head = ui.pageHead(h`${b.ref}${b.name ? ' · ' + b.name : ''}`, h`<span class="row wrap">${ui.serviceBadge(b.service)}${ui.status(b.status)}${b.needsRating ? ui.badge(t('batch.ratingPending'), 'warning') : ''}<span class="small faint">${t('batch.createdOn', { date: U.fmtDateTime(b.createdAt) })}</span></span>`,
        h`${b.delivered ? h`<button type="button" class="btn" data-action="acceptAll">${icon('check')}${t('batch.acceptAll', { n: b.delivered })}</button>` : ''}${b.needsRating ? h`<button type="button" class="btn btn-primary" data-action="closeBatch">${icon('star')}${t('batch.closeAndRate')}</button>` : ''}`,
        ui.crumbs([{ label: t('nav.batches'), href: '#/client/batches' }, { label: b.ref }]));
      var counts = Object.keys(b.counts).map(function (s) { return h`<span class="chip">${t('status.' + s)} · ${b.counts[s].length}</span>`; });
      return h`${head}
        <div class="card mb-16"><div class="card-b stack tight"><div class="bar-mini">${ui.progress(b.progress.pct, b.progress.pct === 1 ? 'ok' : '')}<span class="small nowrap">${t('batch.closedOf', { closed: b.progress.closed, total: b.progress.total })}</span></div><div class="tag-list">${counts}</div></div></div>
        ${b.needsRating ? h`<div class="mb-16">${ui.notice(t('batch.needsRatingNotice'), 'warn', 'star')}</div>` : ''}
        ${d.plan ? h`<div class="mb-16">${assignmentPanel(d.plan, ctx.state)}</div>` : ''}
        ${b.offers.length ? h`<div class="mb-16">${ui.card(t('batch.offers'), ui.table([
          { label: t('case.provider'), render: function (o) { return o.providerName; } },
          { label: t('batch.group'), render: function (o) { return o.groupKey && o.groupKey !== 'all' ? ui.gov(o.groupKey) : t('batch.wholeBatch'); } },
          { label: t('batch.cases'), num: true, render: function (o) { return U.num(o.caseIds.length); } },
          { label: t('common.status'), render: function (o) { return ui.status(o.status === 'accepted' ? 'accepted_offer' : o.status === 'draft' ? 'draft' : o.status); } },
          { label: t('offers.acceptanceWindow'), render: function (o) { return o.status === 'pending' ? ui.countdown(o.remaining) : h`<span class="small faint">${U.fmtDateTime(o.respondedAt)}</span>`; } }
        ], b.offers), { flush: true })}</div>` : ''}
        ${b.closedAt ? h`<div class="mb-16">${ui.card(t('batch.ratingsGiven'), h`<div class="stack">${b.ratings.map(function (r) {
          return h`<div class="stack tight"><div class="row wrap"><strong>${(b.providers.filter(function (p) { return p.id === r.providerId; })[0] || {}).name}</strong>${ui.stars(r.overall)}</div>${ui.criteriaView(r.criteria)}${r.tags.length ? ui.tagChips(r.tags) : ''}${r.feedback ? h`<p class="small">${r.feedback}</p>` : ''}</div>`;
        })}${b.caseFlags.length ? h`<div><h3 class="mb-8">${t('batch.caseFlags')}</h3>${b.caseFlags.map(function (f) { var c = b.cases.filter(function (x) { return x.id === f.caseId; })[0]; return h`<div class="small"><span class="mono">${c ? c.ref : ''}</span>: ${f.note}</div>`; })}</div>` : ''}</div>`)}</div>` : ''}
        ${ui.card(t('batch.casesTitle', { n: b.cases.length }), P.entity.caseTable(b.cases, '#/client/cases/'), { flush: true })}`;
    },
    actions: {
      setMode: function (el, ev, ctx) { ctx.state.mode = el.getAttribute('data-value'); ctx.reload(); },
      autoAssign: async function (el, ev, ctx) {
        var plan = await S.batches.plan(ctx.params.id);
        var mode = ctx.state.mode || (plan.groups.length > 1 ? 'split' : 'single');
        ctx.state.pick = {};
        if (mode === 'single') { if (plan.whole.providers[0]) ctx.state.pick.all = plan.whole.providers[0].id; }
        else plan.groups.forEach(function (g) { if (g.eligible.providers[0]) ctx.state.pick['g_' + g.governorate] = g.eligible.providers[0].id; });
        ctx.reload();
      },
      assign: async function (form, ev, ctx, values) {
        var mode = values._mode;
        var assignments = {};
        if (mode === 'single') assignments.all = values.all;
        else Object.keys(values).forEach(function (k) { if (k.indexOf('g_') === 0) assignments[k.slice(2)] = values[k]; });
        if (Object.keys(assignments).some(function (k) { return !assignments[k]; }) || !Object.keys(assignments).length) return ui.toast(t('batch.pickAll'), 'danger');
        var ok = await ui.confirm({ title: t('batch.sendOffers'), message: t('batch.sendOffersBody', { hours: ui.cfg.pricing.offerWindowHours }), confirmLabel: t('batch.sendOffers') });
        if (!ok) return;
        await S.batches.assign(ctx.params.id, mode, assignments);
        ctx.state.pick = {};
        ui.toast(t('batch.offersSent'), 'success');
        ctx.reload();
      },
      acceptAll: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('batch.acceptAllTitle'), message: t('batch.acceptAllBody'), confirmLabel: t('action.accept_report') });
        if (!ok) return;
        var r = await S.batches.acceptAllDelivered(ctx.params.id);
        ui.toast(t('batch.accepted', { n: r.accepted }), 'success');
        ctx.reload();
      },
      closeBatch: async function (el, ev, ctx) {
        var b = await S.batches.get(ctx.params.id);
        if (await ui.dialogs.closeBatch(b)) ctx.reload();
      }
    }
  };
})();
