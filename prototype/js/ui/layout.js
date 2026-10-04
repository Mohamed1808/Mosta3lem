/* Portal shells: desktop sidebar layout for entity/provider/admin portals, and the
   mobile-first layout with bottom tabs for the field agent app. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon;
  var ui = ICM.ui;
  var layout = (ICM.layout = {});

  function navFor(ctx, counts) {
    var s = ctx.session, u = s.user, c = counts || {};
    if (s.portal === 'entity') {
      var items = [
        { href: '#/client', icon: 'grid', label: t('nav.dashboard'), exact: true },
        { href: '#/client/new', icon: 'plus', label: t('nav.newRequest') },
        { href: '#/client/bulk', icon: 'upload', label: t('nav.bulkUpload') },
        { href: '#/client/cases', icon: 'list', label: t('nav.cases'), count: c.entityAttention, warn: true },
        { href: '#/client/batches', icon: 'layers', label: t('nav.batches') },
        { href: '#/client/ratings', icon: 'star', label: t('nav.ratings'), count: c.pendingRatings },
        { href: '#/client/invoices', icon: 'file', label: t('nav.invoices') },
        { href: '#/client/reports', icon: 'chart', label: t('nav.reports') }
      ];
      if (u.role === 'entity_admin') items.push({ href: '#/client/users', icon: 'users', label: t('nav.users') });
      return [{ items: items }];
    }
    if (s.portal === 'provider') {
      var svc = ctx.params.service || (s.provider && s.provider.services[0]);
      var base = '#/provider/' + svc;
      var company = s.provider.kind === 'company';
      var list = [
        { href: base, icon: 'grid', label: t('nav.dashboard'), exact: true },
        { href: base + '/offers', icon: 'inbox', label: t('nav.offers'), count: c.offers },
        { href: base + '/cases', icon: 'columns', label: t('nav.caseBoard') }
      ];
      if (company) list.push({ href: base + '/assignment', icon: 'route', label: t('nav.assignment'), count: c.unassigned });
      if (company && svc === 'investigation') list.push({ href: base + '/review', icon: 'checkSquare', label: t('nav.reviewQueue'), count: c.review });
      if (company) list.push({ href: base + '/team', icon: 'users', label: t('nav.team'), exact: true });
      if (svc === 'collection') list.push({ href: base + '/portfolio', icon: 'chart', label: t('nav.portfolio') });
      var list2 = [
        { href: base + '/ratings', icon: 'star', label: t('nav.feedback') },
        { href: base + '/clients', icon: 'building', label: t('nav.rateClients'), count: c.clientPending },
        { href: base + '/earnings', icon: 'wallet', label: t('nav.earnings') }
      ];
      if (u.role === 'provider_admin' || u.role === 'freelancer') list2.push({ href: base + '/profile', icon: 'settings', label: t('nav.profile') });
      return [{ items: list }, { title: t('nav.groupAccount'), items: list2 }];
    }
    if (s.portal === 'applicant') {
      return [{ items: [{ href: '#/application', icon: 'shieldCheck', label: t('nav.application') }] }];
    }
    if (s.portal === 'admin') {
      if (u.role === 'platform_qa') {
        return [{ items: [
          { href: '#/admin/qa', icon: 'checkSquare', label: t('nav.qaQueue'), count: c.qa },
          { href: '#/admin/cases', icon: 'list', label: t('nav.allCases') },
          { href: '#/admin', icon: 'grid', label: t('nav.overview'), exact: true }
        ] }];
      }
      return [
        { items: [
          { href: '#/admin', icon: 'grid', label: t('nav.overview'), exact: true },
          { href: '#/admin/onboarding', icon: 'shieldCheck', label: t('nav.onboarding'), count: c.onboarding },
          { href: '#/admin/providers', icon: 'briefcase', label: t('nav.providers') },
          { href: '#/admin/entities', icon: 'building', label: t('nav.entities') },
          { href: '#/admin/cases', icon: 'list', label: t('nav.allCases') },
          { href: '#/admin/qa', icon: 'checkSquare', label: t('nav.qaQueue'), count: c.qa },
          { href: '#/admin/disputes', icon: 'scale', label: t('nav.disputes'), count: c.disputes, warn: true },
          { href: '#/admin/moderation', icon: 'flag', label: t('nav.moderation'), count: c.flagged },
          { href: '#/admin/billing', icon: 'file', label: t('nav.billing') }
        ] },
        { title: t('nav.groupConfig'), items: [
          { href: '#/admin/scoring', icon: 'target', label: t('nav.scoring') },
          { href: '#/admin/pricing', icon: 'banknote', label: t('nav.pricing') },
          { href: '#/admin/settings', icon: 'sliders', label: t('nav.settings') },
          { href: '#/admin/audit', icon: 'history', label: t('nav.audit') },
          { href: '#/admin/demo', icon: 'play', label: t('nav.demo') }
        ] }
      ];
    }
    return [];
  }

  function isActive(item, hash) {
    var path = hash.split('?')[0];
    if (item.exact) return path === item.href;
    return path === item.href || path.indexOf(item.href + '/') === 0;
  }

  function userSwitcher(ctx, cls) {
    var users = ctx.demoUsers || [];
    var groups = [
      { portal: 'entity', label: t('portal.entity') },
      { portal: 'provider', label: t('portal.provider') },
      { portal: 'agent', label: t('portal.agent') },
      { portal: 'applicant', label: t('portal.applicant') },
      { portal: 'admin', label: t('portal.admin') }
    ];
    return h`<label class="sr-only" for="user-switch">${t('header.switchUser')}</label>
      <select id="user-switch" class="select sm ${cls || ''}" data-change="switchUser" title="${t('header.switchUser')}">
      ${groups.map(function (g) {
        return h`<optgroup label="${g.label}">${users.filter(function (u) { return u.portal === g.portal; }).map(function (u) {
          return h`<option value="${u.id}" ${u.id === ctx.session.user.id ? 'selected' : ''}>${u.name} · ${t('role.' + u.role)} · ${u.orgName}</option>`;
        })}</optgroup>`;
      })}</select>`;
  }

  function clockChip(ctx) {
    var ck = ctx.clock || { now: Date.now(), offsetMs: 0 };
    var shifted = ck.offsetMs > 0;
    var admin = ctx.session.user.role === 'platform_admin';
    var inner = h`${icon('clock')}<span class="lbl">${t('header.demoClock')}</span> <span class="nowrap">${U.fmtDateTime(ck.now)}</span>${shifted ? h` <span class="strong">+${U.fmtDuration(ck.offsetMs)}</span>` : ''}`;
    return admin ? h`<a href="#/admin/demo" class="clock-chip ${shifted ? 'shifted' : ''}" title="${t('header.demoClockHint')}">${inner}</a>` : h`<span class="clock-chip ${shifted ? 'shifted' : ''}" title="${t('header.demoClockHint')}">${inner}</span>`;
  }

  function tools(ctx, compact) {
    return h`
      ${compact ? '' : clockChip(ctx)}
      <button type="button" class="btn btn-sm btn-ghost" data-action="toggleLang" title="${t('header.language')}">${icon('globe')}${ICM.i18n.lang() === 'ar' ? 'English' : 'العربية'}</button>
      <div class="bell"><button type="button" class="btn-icon" data-action="toggleNotifs" aria-label="${t('header.notifications')}">${icon('bell')}</button>${ctx.unread ? h`<span class="dot">${ctx.unread > 99 ? '99+' : ctx.unread}</span>` : ''}</div>
      <div class="user-switch">${userSwitcher(ctx)}</div>
      <button type="button" class="btn-icon" data-action="logout" title="${t('header.signOut')}" aria-label="${t('header.signOut')}">${icon('logout')}</button>`;
  }

  function orgLine(ctx) {
    var s = ctx.session;
    var org = s.entity ? s.entity.name : s.provider ? s.provider.name : ICM.config.PLATFORM_NAME;
    return h`<div><div class="org">${org}</div><div class="org-sub">${s.user.name} · ${t('role.' + s.user.role)}</div></div>`;
  }

  layout.desktop = function (ctx, counts, content) {
    var hash = location.hash || '#/';
    var s = ctx.session;
    var groups = navFor(ctx, counts);
    var svc = ctx.params.service;
    var both = s.portal === 'provider' && s.provider.services.length > 1;
    return h`<div class="shell">
      <aside class="sidebar" aria-label="${t('nav.main')}">
        <div class="brand"><div class="brand-mark">${ICM.config.PLATFORM_NAME.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'PN'}</div>
          <div><div class="brand-name">${ICM.config.PLATFORM_NAME}</div><div class="brand-sub">${t('portal.' + s.portal)}${s.portal === 'provider' ? h` · ${t('service.' + svc)}` : ''}</div></div></div>
        <nav class="nav">${groups.map(function (g) {
          return h`${g.title ? h`<div class="nav-title">${g.title}</div>` : ''}${g.items.map(function (it) {
            return h`<a href="${it.href}" class="${isActive(it, hash) ? 'active' : ''}">${icon(it.icon)}<span>${it.label}</span>${it.count ? h`<span class="count ${it.warn ? 'warn' : ''}">${it.count}</span>` : ''}</a>`;
          })}`;
        })}</nav>
        <div class="sidebar-foot">
          ${both ? h`<label for="ws-switch">${t('nav.workspace')}</label><select id="ws-switch" data-change="switchWorkspace">${s.provider.services.map(function (x) {
            return h`<option value="${x}" ${x === svc ? 'selected' : ''}>${t('service.' + x)}</option>`;
          })}</select>` : ''}
          ${s.user.role === 'freelancer' ? h`<a href="#/agent">${icon('smartphone')}${t('nav.fieldApp')}</a>` : ''}
          <a href="privacy.html" target="_blank" rel="noopener">${t('nav.privacy')}</a>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button type="button" class="btn-icon menu-btn" data-action="navToggle" aria-label="${t('nav.menu')}">${icon('menu')}</button>
          ${orgLine(ctx)}
          <div class="tools">${tools(ctx)}</div>
        </header>
        <div id="notif-host"></div>
        <main class="content" id="page">${content}</main>
      </div>
    </div>`;
  };

  layout.agent = function (ctx, counts, content) {
    var hash = (location.hash || '#/agent').split('?')[0];
    var s = ctx.session;
    var tabs = [
      { href: '#/agent', icon: 'list', label: t('agent.tabs.tasks'), exact: true },
      { href: '#/agent/returned', icon: 'undo', label: t('agent.tabs.returned'), count: counts && counts.returned },
      { href: '#/agent/performance', icon: 'award', label: t('agent.tabs.performance') }
    ];
    if (s.user.role === 'freelancer') tabs.push({ href: '#/agent/earnings', icon: 'wallet', label: t('agent.tabs.earnings') });
    var onTask = hash.indexOf('#/agent/tasks/') === 0;
    return h`<div class="agent-shell">
      <header class="agent-top">
        ${onTask ? h`<a class="btn-icon" href="#/agent" aria-label="${t('common.back')}">${icon('chevronLeft')}</a>` : h`<div class="brand-mark">${ICM.config.PLATFORM_NAME.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'PN'}</div>`}
        <div class="grow"><div class="strong small">${s.user.name}</div><div class="xs" style="color:#9fb0c6">${s.provider ? s.provider.name : ''}</div></div>
        ${s.user.role === 'freelancer' ? h`<a class="btn-icon" href="#/provider/${s.provider.services[0]}" title="${t('nav.providerPortal')}">${icon('briefcase')}</a>` : ''}
        <button type="button" class="btn-icon" data-action="toggleLang" title="${t('header.language')}">${icon('globe')}</button>
        <div class="bell"><button type="button" class="btn-icon" data-action="toggleNotifs" aria-label="${t('header.notifications')}">${icon('bell')}</button>${ctx.unread ? h`<span class="dot">${ctx.unread}</span>` : ''}</div>
        ${userSwitcher(ctx)}
      </header>
      <div id="notif-host"></div>
      <main class="agent-body" id="page">${content}</main>
      <nav class="agent-tabs" aria-label="${t('nav.main')}">${tabs.map(function (tb) {
        return h`<a href="${tb.href}" class="${isActive(tb, hash) || (tb.exact && onTask) ? 'active' : ''}">${icon(tb.icon)}<span>${tb.label}</span>${tb.count ? h`<span class="count">${tb.count}</span>` : ''}</a>`;
      })}</nav>
    </div>`;
  };

  layout.notifPanel = function (list) {
    return h`<div class="notif-panel" role="dialog" aria-label="${t('header.notifications')}">
      <div class="head"><strong>${t('header.notifications')}</strong>${list.some(function (n) { return !n.read; }) ? h`<button type="button" class="btn btn-sm btn-ghost" data-action="markAllRead">${t('header.markAllRead')}</button>` : ''}</div>
      ${list.length ? list.map(function (n) {
        var params = Object.assign({}, n.params);
        if (params.outcome) params.outcome = t('outcome.' + params.outcome);
        if (params.decision) params.decision = t('status.' + params.decision);
        if (params.level) params.level = t('enforcement.' + params.level);
        if (params.doc) params.doc = t('doc.' + params.doc);
        if (params.amount != null) params.amount = U.money(params.amount);
        return h`<div class="notif-item ${n.read ? 'read' : 'unread'}" data-action="openNotif" data-id="${n.id}" data-href="${n.href || ''}" role="button" tabindex="0">
          <span class="ndot"></span><div class="grow"><div class="small">${t(n.key, params)}</div><div class="xs faint">${U.fmtDateTime(n.at)}</div></div></div>`;
      }) : ui.empty(t('header.noNotifications'), null, 'bell')}
    </div>`;
  };
})();
