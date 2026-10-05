/* Entity portal: ratings, invoices, reports and users. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui, wf = ICM.wf;
  var P = (ICM.pages = ICM.pages || {});
  P.entity = P.entity || {};

  // ================================================================ ratings
  P.entity.ratings = {
    title: function () { return t('nav.ratings'); },
    initState: function () { return { tab: 'pending' }; },
    load: async function () {
      var r = await Promise.all([S.ratings.pending(), S.ratings.given()]);
      return { pending: r[0], given: r[1] };
    },
    render: function (d, ctx) {
      var tab = ctx.state.tab;
      var body;
      if (tab === 'pending') {
        body = d.pending.count ? h`<div class="stack">
          ${d.pending.cases.length ? ui.card(t('ratings.pendingCases'), ui.table([
            { label: t('case.ref'), render: function (c) { return h`<a class="mono" href="#/client/cases/${c.id}">${c.ref}</a>`; } },
            { label: t('case.service'), render: function (c) { return ui.serviceBadge(c.service); } },
            { label: t('case.provider'), render: function (c) { return c.providerName; } },
            { label: t('ratings.closedOn'), render: function (c) { return U.fmtDate(c.closedAt); } },
            { label: '', cls: 'right', render: function (c) { return h`<button type="button" class="btn btn-sm btn-primary" data-action="rate" data-id="${c.id}">${icon('star')}${t('ratings.rateNow')}</button>`; } }
          ], d.pending.cases), { flush: true }) : ''}
          ${d.pending.batches.length ? ui.card(t('ratings.pendingBatches'), ui.table([
            { label: t('batch.ref'), render: function (b) { return h`<span class="mono">${b.ref}</span><div class="sub">${b.name || ''}</div>`; } },
            { label: t('case.service'), render: function (b) { return ui.serviceBadge(b.service); } },
            { label: t('batch.cases'), num: true, render: function (b) { return U.num(b.caseIds.length); } },
            { label: '', cls: 'right', render: function (b) { return h`<a class="btn btn-sm btn-primary" href="#/client/batches/${b.id}">${icon('star')}${t('batch.closeAndRate')}</a>`; } }
          ], d.pending.batches), { flush: true }) : ''}
        </div>` : ui.card(null, ui.empty(t('ratings.nonePending'), null, 'star'));
      } else {
        body = d.given.length ? h`<div class="stack">${d.given.map(function (r) {
          return h`<div class="card"><div class="card-b stack tight">
            <div class="row between wrap"><div class="row wrap"><strong>${r.providerName}</strong>${ui.serviceBadge(r.service)}<span class="mono small faint">${r.caseRef || ''}</span>${r.batchId ? ui.badge(t('ratings.batchRating'), 'neutral') : ''}${r.status === 'removed' ? ui.badge(t('rating.removed'), 'muted') : ''}${r.hidden ? ui.badge(t('rating.hiddenByAdmin'), 'muted') : ''}${r.dispute ? ui.status(r.dispute.status === 'open' ? 'open' : 'resolved') : ''}</div>
              <span class="row">${ui.stars(r.overall)}<span class="xs faint">${U.fmtDate(r.createdAt)}</span></span></div>
            ${ui.criteriaView(r.criteria)}
            ${r.tags.length ? ui.tagChips(r.tags) : ''}
            ${r.feedback ? h`<p class="small">${r.feedback}</p>` : ''}
            ${r.reply ? h`<div class="t-note small"><strong>${t('rating.providerReply')}</strong>: ${r.reply.text}</div>` : ''}
          </div></div>`;
        })}</div>` : ui.card(null, ui.empty(t('ratings.noneGiven'), null, 'star'));
      }
      return h`${ui.pageHead(t('nav.ratings'), t('ratings.entitySubtitle'))}
        ${ui.tabs([{ id: 'pending', label: t('ratings.pending'), count: d.pending.count }, { id: 'given', label: t('ratings.given'), count: d.given.length }], tab, 'tab')}
        ${body}`;
    },
    actions: {
      tab: function (el, ev, ctx) { ctx.state.tab = el.getAttribute('data-value'); ctx.reload(); },
      rate: async function (el, ev, ctx) { var d = await S.cases.get(el.getAttribute('data-id')); if (await ui.dialogs.rateCase(d)) ctx.reload(); }
    }
  };

  // ================================================================ invoices
  function invoiceLines(inv) {
    return h`<div class="stack">
      <dl class="dl"><dt>${t('invoice.provider')}</dt><dd>${inv.providerName}</dd><dt>${t('invoice.client')}</dt><dd>${inv.entityName}</dd><dt>${t('invoice.month')}</dt><dd>${U.fmtMonth(inv.month)}</dd><dt>${t('common.status')}</dt><dd>${ui.status(inv.status === 'draft' ? 'draft_invoice' : inv.status, inv.status === 'draft' ? 'invoiceStatus' : 'status')}</dd></dl>
      ${ui.table([
        { label: t('case.ref'), render: function (l) { return h`<span class="mono">${l.caseRef}</span>`; } },
        { label: t('case.service'), render: function (l) { return t('service.' + l.service); } },
        { label: t('invoice.closed'), render: function (l) { return U.fmtDate(l.closedAt); } },
        { label: t('invoice.amount'), num: true, render: function (l) { return h`${U.money(l.billed)}${l.adjustment !== 1 ? h`<div class="sub">${t('invoice.adjusted', { pct: Math.round(l.adjustment * 100) })}</div>` : ''}`; } }
      ], inv.lines)}
      <div class="stat-row"><span class="strong">${t('invoice.total')}</span><span class="strong">${U.money(inv.subtotal)}</span></div>
    </div>`;
  }
  P.entity.invoiceLines = invoiceLines;

  P.entity.invoices = {
    title: function () { return t('nav.invoices'); },
    load: function () { return S.billing.invoices(); },
    render: function (list, ctx) {
      var canPay = ctx.session.user.role === 'entity_admin';
      var due = U.sum(list.filter(function (i) { return i.status === 'issued'; }), function (i) { return i.subtotal; });
      return h`${ui.pageHead(t('nav.invoices'), t('invoice.subtitle'))}
        <div class="kpis">${ui.kpi(t('invoice.outstanding'), U.money(due), null, due ? 'warn' : '')}${ui.kpi(t('invoice.accruing'), U.money(U.sum(list.filter(function (i) { return i.status === 'draft'; }), function (i) { return i.subtotal; })), t('invoice.accruingSub'))}${ui.kpi(t('invoice.paidTotal'), U.money(U.sum(list.filter(function (i) { return i.status === 'paid'; }), function (i) { return i.subtotal; })), null, 'ok')}</div>
        ${ui.card(null, ui.table([
          { label: t('invoice.ref'), render: function (i) { return h`<span class="mono">${i.ref}</span>`; } },
          { label: t('invoice.month'), render: function (i) { return U.fmtMonth(i.month); } },
          { label: t('invoice.provider'), render: function (i) { return i.providerName; } },
          { label: t('invoice.lines'), num: true, render: function (i) { return U.num(i.lines.length); } },
          { label: t('invoice.total'), num: true, render: function (i) { return U.money(i.subtotal); } },
          { label: t('common.status'), render: function (i) { return ui.status(i.status === 'draft' ? 'draft_invoice' : i.status, i.status === 'draft' ? 'invoiceStatus' : 'status'); } },
          { label: '', cls: 'right', render: function (i) {
            return h`<span class="row end"><button type="button" class="btn btn-sm" data-action="view" data-id="${i.id}">${t('common.view')}</button>${canPay && i.status === 'issued' ? h`<button type="button" class="btn btn-sm btn-primary" data-action="pay" data-id="${i.id}">${t('invoice.markPaid')}</button>` : ''}</span>`;
          } }
        ], list, { empty: t('invoice.none') }), { flush: true })}`;
    },
    actions: {
      view: async function (el) {
        var inv = (await S.billing.invoices()).filter(function (i) { return i.id === el.getAttribute('data-id'); })[0];
        ui.modal.open({ title: t('invoice.title', { ref: inv.ref }), size: 'lg', body: invoiceLines(inv) });
      },
      pay: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('invoice.markPaid'), message: t('invoice.payBody'), confirmLabel: t('invoice.markPaid') });
        if (!ok) return;
        await S.billing.markPaid(el.getAttribute('data-id'));
        ui.toast(t('invoice.paid'), 'success'); ctx.reload();
      }
    }
  };

  // ================================================================ reports
  P.entity.reports = {
    title: function () { return t('nav.reports'); },
    load: function () { return S.analytics.entityReports(); },
    render: function (d) {
      var r0 = d.providers[0];  // spend is null for roles that do not see the client's billing
      return h`${ui.pageHead(t('nav.reports'), t('reports.subtitle'))}
        <div class="grid cols-2 mb-16">
          ${ui.card(t('reports.onTime'), h`<div class="chart-box"><canvas data-chart="ontime"></canvas></div>`)}
          ${ui.card(t('reports.volume'), h`<div class="chart-box"><canvas data-chart="volume"></canvas></div>`)}
        </div>
        ${ui.card(t('reports.comparison'), ui.table([
          { label: t('case.provider'), render: function (r) { return h`<strong>${r.name}</strong><div class="sub">${t('kind.' + r.kind)}</div>`; } },
          { label: t('reports.cases'), num: true, render: function (r) { return U.num(r.cases); } },
          { label: t('metric.onTime'), num: true, render: function (r) { return ui.pct(r.onTimeRate); } },
          { label: t('reports.turnaround'), num: true, render: function (r) { return r.turnaroundHours == null ? '-' : t('time.hoursShort', { h: U.num(r.turnaroundHours, 1) }); } },
          { label: t('metric.firstTime'), num: true, render: function (r) { return ui.pct(r.firstTimeRate); } },
          { label: t('metric.recovery'), num: true, render: function (r) { return ui.pct(r.recoveryRate); } },
          { label: t('reports.avgRating'), num: true, render: function (r) { return r.avgRating == null ? '-' : U.num(r.avgRating, 1); } },
          { label: t('reports.breaches'), num: true, render: function (r) { return U.num(r.breaches); } },
          r0 && r0.spend === null ? null : { label: t('reports.spend'), num: true, render: function (r) { return U.money(r.spend); } },
          { label: t('score.label'), num: true, render: function (r) { return ui.scoreBox(r.score); } }
        ].filter(Boolean), d.providers), { flush: true })}`;
    },
    after: function (root, d) {
      ui.charts.mount(root, {
        ontime: { type: 'bar', data: { labels: d.providers.map(function (p) { return p.name; }), datasets: [{ label: t('metric.onTime'), data: d.providers.map(function (p) { return p.onTimeRate == null ? null : Math.round(p.onTimeRate * 100); }) }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } } } },
        volume: { type: 'bar', data: { labels: d.months.map(function (m) { return U.fmtMonth(m); }), datasets: d.volume.map(function (v) { return { label: v.name, data: v.data }; }) }, options: { scales: { x: { stacked: true }, y: { stacked: true } } } }
      });
    }
  };

  // ================================================================ users
  var ROLES = ['entity_admin', 'entity_credit', 'entity_operations', 'entity_collections'];
  P.entity.users = {
    title: function () { return t('nav.users'); },
    load: function () { return S.entities.users(); },
    render: function (users, ctx) {
      return h`${ui.pageHead(t('nav.users'), t('users.subtitle'), h`<button type="button" class="btn btn-primary" data-action="invite">${icon('plus')}${t('users.invite')}</button>`)}
        ${ui.card(null, ui.table([
          { label: t('common.name'), render: function (u) { return h`<strong>${u.name}</strong>${u.invited ? h` ${ui.badge(t('users.invited'), 'info')}` : ''}`; } },
          { label: t('common.email'), render: function (u) { return h`<span class="small">${u.email}</span>`; } },
          { label: t('common.role'), render: function (u) {
            return u.id === ctx.session.user.id ? t('role.' + u.role) : h`<select class="select sm" data-change="setRole" data-id="${u.id}" style="width:auto">${ROLES.map(function (r) { return h`<option value="${r}" ${r === u.role ? 'selected' : ''}>${t('role.' + r)}</option>`; })}</select>`;
          } },
          { label: t('users.access'), render: function (u) { return h`<span class="small muted">${t('roleHint.' + u.role)}</span>`; } },
          { label: t('common.status'), render: function (u) { return u.active === false ? ui.badge(t('common.inactive'), 'muted') : ui.badge(t('common.active'), 'success'); } },
          { label: '', cls: 'right', render: function (u) {
            if (u.id === ctx.session.user.id) return '';
            return u.active === false ? h`<button type="button" class="btn btn-sm" data-action="activate" data-id="${u.id}">${t('users.reactivate')}</button>` : h`<button type="button" class="btn btn-sm btn-danger" data-action="deactivate" data-id="${u.id}">${t('users.deactivate')}</button>`;
          } }
        ], users), { flush: true })}`;
    },
    actions: {
      invite: function (el, ev, ctx) {
        var ctrl = ui.modal.open({
          title: t('users.invite'),
          body: h`<form id="invite-form" data-submit="modal" class="stack">
            <div class="field"><label>${t('common.name')}<span class="req">*</span></label><input class="input" name="name" required></div>
            <div class="field"><label>${t('common.email')}<span class="req">*</span></label><input class="input" type="email" name="email" required dir="ltr"></div>
            <div class="field"><label>${t('common.role')}</label>${ui.select('role', ROLES.map(function (r) { return { value: r, label: t('role.' + r) }; }), 'entity_credit')}</div>
            <p class="small muted">${t('users.inviteNote')}</p></form>`,
          footer: h`<button type="button" class="btn" data-action="modalClose">${t('common.cancel')}</button><button type="submit" form="invite-form" class="btn btn-primary">${t('users.sendInvite')}</button>`,
          onSubmit: async function (v) {
            try { await S.entities.invite(v); ctrl.close(); ui.toast(t('users.invitedToast', { email: v.email }), 'success'); ctx.reload(); } catch (e) { ui.fail(e); }
          }
        });
      },
      setRole: async function (el, ev, ctx) { await S.entities.setRole(el.getAttribute('data-id'), el.value); ui.toast(t('users.roleChanged'), 'success'); ctx.reload(); },
      deactivate: async function (el, ev, ctx) {
        var ok = await ui.confirm({ title: t('users.deactivate'), message: t('users.deactivateBody'), confirmLabel: t('users.deactivate'), danger: true });
        if (!ok) return;
        await S.entities.setActive(el.getAttribute('data-id'), false); ctx.reload();
      },
      activate: async function (el, ev, ctx) { await S.entities.setActive(el.getAttribute('data-id'), true); ctx.reload(); }
    }
  };
})();
