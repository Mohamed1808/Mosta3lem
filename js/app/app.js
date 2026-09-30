/* App shell: hash router, access control per portal, page lifecycle and a single
   delegated event dispatcher. Pages are plain objects:
     { title(data, ctx), load(ctx) -> Promise<data>, render(data, ctx) -> SafeHtml,
       actions: { name(el, event, ctx, values) }, after(root, data, ctx), live: bool } */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, S = ICM.services, ui = ICM.ui;
  var P = ICM.pages;

  var ENTITY = ['entity_admin', 'entity_credit', 'entity_operations', 'entity_collections'];
  var routes = [];
  function route(pattern, portal, page, roles) {
    var keys = [];
    var re = new RegExp('^' + pattern.replace(/:(\w+)/g, function (m, k) { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ pattern: pattern, portal: portal, page: page, roles: roles || null, re: re, keys: keys });
  }

  function defineRoutes() {
    route('/login', 'public', P.auth.login);
    route('/register', 'public', P.auth.register);
    route('/application', 'applicant', P.applicant.application);
    route('/client', 'entity', P.entity.dashboard);
    route('/client/new', 'entity', P.entity.newRequest);
    route('/client/cases', 'entity', P.entity.cases);
    route('/client/cases/:id', 'entity', P.entity.caseDetail);
    route('/client/cases/:id/select', 'entity', P.entity.select);
    route('/client/bulk', 'entity', P.entity.bulk);
    route('/client/batches', 'entity', P.entity.batches);
    route('/client/batches/:id', 'entity', P.entity.batchDetail);
    route('/client/ratings', 'entity', P.entity.ratings);
    route('/client/invoices', 'entity', P.entity.invoices);
    route('/client/reports', 'entity', P.entity.reports);
    route('/client/users', 'entity', P.entity.users, ['entity_admin']);

    var MGR = ['provider_admin', 'provider_supervisor', 'freelancer'];
    var COMPANY = ['provider_admin', 'provider_supervisor'];
    route('/provider/:service', 'provider', P.provider.dashboard);
    route('/provider/:service/offers', 'provider', P.provider.offers, MGR);
    route('/provider/:service/cases', 'provider', P.provider.cases);
    route('/provider/:service/cases/:id', 'provider', P.provider.caseDetail);
    route('/provider/:service/assignment', 'provider', P.provider.assignment, COMPANY);
    route('/provider/:service/review', 'provider', P.provider.review, COMPANY);
    route('/provider/:service/team', 'provider', P.provider.team, COMPANY);
    route('/provider/:service/portfolio', 'provider', P.provider.portfolio);
    route('/provider/:service/ratings', 'provider', P.provider.ratings);
    route('/provider/:service/clients', 'provider', P.provider.clients, MGR);
    route('/provider/:service/earnings', 'provider', P.provider.earnings);
    route('/provider/:service/profile', 'provider', P.provider.profile, ['provider_admin', 'freelancer']);

    route('/agent', 'agent', P.agent.tasks);
    route('/agent/tasks/:id', 'agent', P.agent.task);
    route('/agent/returned', 'agent', P.agent.returned);
    route('/agent/performance', 'agent', P.agent.performance);
    route('/agent/earnings', 'agent', P.agent.earnings, ['freelancer']);

    var ADMIN = ['platform_admin'], QA = ['platform_admin', 'platform_qa'];
    route('/admin', 'admin', P.admin.overview, QA);
    route('/admin/onboarding', 'admin', P.admin.onboarding, ADMIN);
    route('/admin/onboarding/new', 'admin', P.admin.registerProvider, ADMIN);
    route('/admin/providers', 'admin', P.admin.providers, ADMIN);
    route('/admin/providers/:id', 'admin', P.admin.providerDetail, ADMIN);
    route('/admin/entities', 'admin', P.admin.entities, ADMIN);
    route('/admin/cases', 'admin', P.admin.cases, QA);
    route('/admin/cases/:id', 'admin', P.admin.caseDetail, QA);
    route('/admin/qa', 'admin', P.admin.qa, QA);
    route('/admin/disputes', 'admin', P.admin.disputes, ADMIN);
    route('/admin/disputes/:id', 'admin', P.admin.disputeDetail, ADMIN);
    route('/admin/moderation', 'admin', P.admin.moderation, ADMIN);
    route('/admin/scoring', 'admin', P.admin.scoring, ADMIN);
    route('/admin/pricing', 'admin', P.admin.pricing, ADMIN);
    route('/admin/settings', 'admin', P.admin.settings, ADMIN);
    route('/admin/billing', 'admin', P.admin.billing, ADMIN);
    route('/admin/audit', 'admin', P.admin.audit, ADMIN);
    route('/admin/demo', 'admin', P.admin.demo, ADMIN);
  }

  function parseHash() {
    var raw = (location.hash || '#/').slice(1) || '/';
    var qi = raw.indexOf('?');
    var path = qi >= 0 ? raw.slice(0, qi) : raw;
    var query = {};
    if (qi >= 0) raw.slice(qi + 1).split('&').forEach(function (kv) {
      if (!kv) return;
      var p = kv.split('=');
      query[decodeURIComponent(p[0])] = decodeURIComponent(p.slice(1).join('=') || '');
    });
    return { path: path, query: query };
  }

  function match(path) {
    for (var i = 0; i < routes.length; i++) {
      var m = routes[i].re.exec(path);
      if (m) {
        var params = {};
        routes[i].keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
        return { route: routes[i], params: params };
      }
    }
    return null;
  }

  function allowed(r, params, session) {
    if (r.portal === 'public') return true;
    if (!session) return false;
    var role = session.user.role;
    if (r.roles && r.roles.indexOf(role) < 0) return false;
    switch (r.portal) {
      case 'entity': return ENTITY.indexOf(role) >= 0;
      case 'provider': return session.portal === 'provider' && session.provider.services.indexOf(params.service) >= 0;
      case 'agent': return role === 'agent' || role === 'freelancer';
      case 'admin': return session.portal === 'admin';
      case 'applicant': return session.portal === 'applicant';
    }
    return false;
  }

  // ---------------------------------------------------------------- state
  var App = (ICM.app = {
    ctx: null,
    pageState: {},
    renderToken: 0,
    notifOpen: false,
    navigate: function (href, force) {
      if (location.hash === href || (href === '#/' && !location.hash)) { if (force !== false) App.render(true); }
      else location.hash = href;
    },
    reload: function () { return App.render(false); }
  });

  function stateFor(r, params) {
    var key = r.pattern + '|' + JSON.stringify(params);
    if (!App.pageState[key]) App.pageState[key] = r.page && r.page.initState ? r.page.initState(params) : {};
    return App.pageState[key];
  }

  function captureFocus() {
    var el = document.activeElement;
    if (!el || !el.id) return null;
    var f = { id: el.id };
    try { f.start = el.selectionStart; f.end = el.selectionEnd; } catch (e) { /* not a text field */ }
    return f;
  }
  function restoreFocus(f) {
    if (!f) return;
    var el = document.getElementById(f.id);
    if (!el) return;
    try { el.focus(); if (f.start != null) el.setSelectionRange(f.start, f.end); } catch (e) { /* ignore */ }
  }

  /** Full render. showSkeleton: true on navigation, false for in-place reloads. */
  App.render = async function (showSkeleton) {
    var token = ++App.renderToken;
    var appEl = document.getElementById('app');
    var loc = parseHash();
    var m = match(loc.path);
    var session = await S.auth.currentUser();
    if (!m) { location.hash = session ? session.home : '#/login'; return; }
    if (m.route.portal !== 'public' && !session) { location.hash = '#/login'; return; }
    if (!allowed(m.route, m.params, session)) { location.hash = session ? session.home : '#/login'; return; }
    ui.cfg = await S.config.get();

    var ctx = {
      route: m.route, params: m.params, query: loc.query, session: session, service: m.params.service || null,
      state: stateFor(m.route, m.params),
      reload: App.reload, navigate: App.navigate
    };
    App.ctx = ctx;
    var page = m.route.page;

    if (m.route.portal === 'public') {
      ui.charts.destroyAll();
      var d0 = page.load ? await page.load(ctx) : null;
      if (token !== App.renderToken) return;
      appEl.innerHTML = String(page.render(d0, ctx));
      document.title = (page.title ? page.title(d0, ctx) + ' · ' : '') + ICM.config.PLATFORM_NAME;
      if (page.after) page.after(appEl, d0, ctx);
      return;
    }

    var chrome = await Promise.all([S.auth.listDemoUsers(), S.notifications.unreadCount(), S.demo.clock(), S.analytics.navCounts(ctx.service)]);
    ctx.demoUsers = chrome[0]; ctx.unread = chrome[1]; ctx.clock = chrome[2]; ctx.counts = chrome[3];
    var shell = m.route.portal === 'agent' ? ICM.layout.agent : ICM.layout.desktop;

    if (showSkeleton) {
      ui.charts.destroyAll();
      appEl.innerHTML = String(shell(ctx, ctx.counts, ui.skeleton()));
    }
    var data, content;
    try {
      data = page.load ? await page.load(ctx) : null;
      if (token !== App.renderToken) return;
      content = page.render(data, ctx);
    } catch (e) {
      if (token !== App.renderToken) return;
      if (window.console) console.error(e);
      content = h`<div class="card"><div class="card-b">${ui.notice(ui.errorText(e), 'bad')}<div class="mt-12"><a class="btn" href="${session.home}">${t('common.backHome')}</a></div></div></div>`;
    }
    var focus = captureFocus();
    var scrollY = window.scrollY;
    ui.charts.destroyAll();
    appEl.innerHTML = String(shell(ctx, ctx.counts, content));
    document.title = (page.title ? page.title(data, ctx) + ' · ' : '') + ICM.config.PLATFORM_NAME;
    if (!showSkeleton) window.scrollTo(0, scrollY);
    else window.scrollTo(0, 0);
    if (page.after && data !== undefined) try { page.after(document.getElementById('page'), data, ctx); } catch (e) { console.error(e); }
    restoreFocus(focus);
    App.notifOpen = false;
    document.body.classList.remove('nav-open');
  };

  // ---------------------------------------------------------------- dispatcher
  var globalActions = {
    modalClose: function () { ui.modal.closeTop(); },
    switchUser: async function (el) {
      var s = await S.auth.loginAs(el.value);
      ui.modal.closeAll();
      App.pageState = {};
      App.navigate(s.home);
    },
    logout: async function () { await S.auth.logout(); ui.modal.closeAll(); App.navigate('#/login'); },
    toggleLang: function () {
      ICM.i18n.setLang(ICM.i18n.lang() === 'ar' ? 'en' : 'ar');
      App.render(false);
    },
    toggleNotifs: async function () {
      var host = document.getElementById('notif-host');
      if (!host) return;
      if (App.notifOpen) { host.innerHTML = ''; App.notifOpen = false; return; }
      var list = await S.notifications.list();
      host.innerHTML = String(ICM.layout.notifPanel(list));
      App.notifOpen = true;
    },
    openNotif: async function (el) {
      await S.notifications.markRead(el.getAttribute('data-id'));
      var href = el.getAttribute('data-href');
      App.notifOpen = false;
      if (href) App.navigate(href); else App.render(false);
    },
    markAllRead: async function () {
      await S.notifications.markAllRead();
      App.notifOpen = false;
      await App.render(false);
      globalActions.toggleNotifs();
    },
    navToggle: function () { document.body.classList.toggle('nav-open'); },
    switchWorkspace: function (el) { App.navigate('#/provider/' + el.value); },
    goto: function (el) { App.navigate(el.getAttribute('data-href')); },
    setStars: function (el) {
      var wrap = el.closest('[data-stars]');
      var v = +el.getAttribute('data-value');
      wrap.querySelector('input[type=hidden]').value = v;
      Array.prototype.forEach.call(wrap.querySelectorAll('button'), function (b) { b.classList.toggle('on', +b.getAttribute('data-value') <= v); });
    },
    formAddPhone: function (el) {
      var box = el.closest('[data-phones]');
      var inp = document.createElement('input');
      inp.className = 'input'; inp.type = 'tel'; inp.name = box.getAttribute('data-phones');
      inp.setAttribute('inputmode', 'numeric'); inp.setAttribute('dir', 'ltr'); inp.placeholder = '01XXXXXXXXX';
      box.insertBefore(inp, el.parentNode);
      inp.focus();
    },
    /** Refill a city dropdown when its governorate changes (data-city-name names the city field). */
    cityForGov: function (el) {
      var name = el.getAttribute('data-city-name');
      var slot = el.closest('form, .modal-b, #page, #app').querySelector('[data-city-slot="' + name + '"]');
      if (slot) slot.innerHTML = String(ui.cityControl(name, el.value, '', false));
    },
    /** Keep only the chosen file name for a document slot (the demo stores no files). */
    pickDocFile: function (el) {
      var file = el.files && el.files[0];
      var box = el.closest('.doc-pick');
      if (!file || !box) return;
      box.querySelector('input[type=hidden]').value = file.name;
      var label = box.querySelector('[data-doc-name]');
      label.textContent = file.name;
      label.classList.remove('faint');
    },
    formPhoto: async function (el) {
      var file = el.files && el.files[0];
      if (!file) return;
      var url = await ICM.util.readImage(file, 640);
      var hidden = el.parentNode.querySelector('input[name="' + el.getAttribute('data-target') + '"]');
      hidden.value = url;
      var img = el.parentNode.querySelector('img') || document.createElement('img');
      img.src = url; img.style.height = '48px'; img.style.borderRadius = '3px';
      el.parentNode.appendChild(img);
    },
    resetDemo: async function () {
      var ok = await ui.confirm({ title: t('demo.resetTitle'), message: t('demo.resetMessage'), confirmLabel: t('demo.reset'), danger: true });
      if (!ok) return;
      await S.demo.reset();
      App.pageState = {};
      ui.toast(t('demo.resetDone'), 'success');
      var s = await S.auth.currentUser();
      App.navigate(s ? s.home : '#/login');
    }
  };

  async function dispatch(name, el, ev, values) {
    var top = ui.modal.top();
    var inModal = el && el.closest && el.closest('#modal-root');
    try {
      if (inModal && top && top.actions[name]) return await top.actions[name](el, ev, top, values);
      var page = App.ctx && App.ctx.route.page;
      if (page && page.actions && page.actions[name] && name !== 'modalClose') return await page.actions[name](el, ev, App.ctx, values);
      if (globalActions[name]) return await globalActions[name](el, ev, values);
      if (window.console) console.warn('[app] no handler for action', name);
    } catch (e) { ui.fail(e); }
  }
  App.dispatch = dispatch;
  App.globalActions = globalActions;

  function bind() {
    document.addEventListener('click', function (e) {
      var host = document.getElementById('notif-host');
      if (App.notifOpen && host && !host.contains(e.target) && !e.target.closest('[data-action="toggleNotifs"]')) { host.innerHTML = ''; App.notifOpen = false; }
      if (e.target.matches && e.target.matches('[data-overlay]')) { ui.modal.closeTop(); return; }
      if (document.body.classList.contains('nav-open') && !e.target.closest('.sidebar') && !e.target.closest('[data-action="navToggle"]')) {
        document.body.classList.remove('nav-open');
        return;
      }
      var act = e.target.closest('[data-action]');
      if (act && !act.disabled) {
        if (act.tagName === 'A' || act.tagName === 'BUTTON') e.preventDefault();
        dispatch(act.getAttribute('data-action'), act, e);
        return;
      }
      var row = e.target.closest('[data-href]');
      if (row && !e.target.closest('a, button, input, select, textarea, label')) App.navigate(row.getAttribute('data-href'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (ui.modal.top()) ui.modal.closeTop();
        else if (App.notifOpen) { document.getElementById('notif-host').innerHTML = ''; App.notifOpen = false; }
      }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=button][data-action]')) { e.preventDefault(); dispatch(e.target.getAttribute('data-action'), e.target, e); }
    });
    document.addEventListener('change', function (e) {
      var el = e.target.closest('[data-change]');
      if (el) { dispatch(el.getAttribute('data-change'), el, e); return; }
      var form = e.target.closest('[data-form-key]');
      if (form && e.target.getAttribute('data-live')) ui.forms.refresh(form);
    });
    var debounced = {};
    document.addEventListener('input', function (e) {
      var el = e.target.closest('[data-input]');
      if (!el) return;
      var name = el.getAttribute('data-input');
      clearTimeout(debounced[name]);
      debounced[name] = setTimeout(function () { dispatch(name, el, e); }, 250);
    });
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('form[data-submit]');
      if (!form) return;
      e.preventDefault();
      var values = ICM.util.formData(form);
      var name = form.getAttribute('data-submit');
      if (name === 'modal') {
        var top = ui.modal.top();
        if (top && top.onSubmit) Promise.resolve(top.onSubmit(values, form, top)).catch(ui.fail);
        return;
      }
      dispatch(name, form, e, values);
    });
    window.addEventListener('hashchange', function () { ui.modal.closeAll(); App.render(true); });
  }

  App.start = async function () {
    ICM.i18n.apply();
    ICM.store.load();
    defineRoutes();
    var missing = S.verify();
    if (missing.length) ui.toast('Service contract incomplete: ' + missing.join(', '), 'danger');
    bind();
    try { await S.demo.tick(); } catch (e) { /* ignore */ }
    await App.render(true);
    setInterval(async function () {
      try {
        var r = await S.demo.tick();
        if (r && r.changed && App.ctx && App.ctx.route.portal !== 'public' && !ui.modal.top()) {
          var page = App.ctx.route.page;
          if (page.live) App.reload();
        }
      } catch (e) { /* ignore */ }
    }, 30000);
  };
})();
