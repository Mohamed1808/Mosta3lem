/* Mock login: pick any demo user. Grouped by portal, then by organisation. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var h = ICM.h, t = ICM.t, U = ICM.util, icon = ICM.icon, S = ICM.services, ui = ICM.ui;
  var P = (ICM.pages = ICM.pages || {});
  P.auth = P.auth || {};

  var ROLE_ORDER = ['entity_admin', 'entity_credit', 'entity_operations', 'entity_collections', 'provider_admin', 'provider_supervisor', 'freelancer', 'agent', 'platform_admin', 'platform_qa'];

  function userButton(u) {
    return h`<button type="button" class="user-btn" data-action="login" data-id="${u.id}">
      <span class="avatar">${U.initials(u.name)}</span>
      <span class="grow"><span class="strong">${u.name}</span><br><span class="role">${t('role.' + u.role)}${ICM.i18n.has('roleHint.' + u.role) ? ' · ' + t('roleHint.' + u.role) : ''}</span></span>
      ${icon('chevronRight')}</button>`;
  }

  function group(title, sub, users) {
    users = users.slice().sort(function (a, b) { return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role); });
    return h`<section class="card"><div class="card-h"><div><h2>${title}</h2>${sub ? h`<div class="xs faint">${sub}</div>` : ''}</div></div><div class="card-b flush">${users.map(userButton)}</div></section>`;
  }

  P.auth.login = {
    title: function () { return t('login.title'); },
    load: function () { return S.auth.listDemoUsers(); },
    render: function (users) {
      var byOrg = U.groupBy(users, function (u) { return u.orgName; });
      var entities = Object.keys(byOrg).filter(function (o) { return byOrg[o][0].portal === 'entity'; });
      var companies = Object.keys(byOrg).filter(function (o) { return byOrg[o][0].orgKind === 'company'; });
      var freelancers = users.filter(function (u) { return u.role === 'freelancer'; });
      var platform = users.filter(function (u) { return u.portal === 'admin'; });
      return h`<div class="login">
        <aside class="login-side">
          <div class="brand" style="padding:0"><div class="brand-mark">${ICM.config.PLATFORM_NAME.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'PN'}</div><div class="brand-name">${ICM.config.PLATFORM_NAME}</div></div>
          <h1>${t('login.headline')}</h1>
          <p>${t('login.body1')}</p>
          <p>${t('login.body2')}</p>
          ${ui.notice(t('login.demoNote'), 'info')}
          <div class="row wrap">
            <button type="button" class="btn btn-sm" data-action="toggleLang">${icon('globe')}${ICM.i18n.lang() === 'ar' ? 'English' : 'العربية'}</button>
            <button type="button" class="btn btn-sm" data-action="resetDemo">${icon('refresh')}${t('demo.reset')}</button>
          </div>
          <div class="foot"><a href="privacy.html">${t('nav.privacy')}</a><a href="terms.html">${t('nav.terms')}</a><a href="tests.html">${t('login.tests')}</a></div>
        </aside>
        <main class="login-main">
          <h2 class="mb-8">${t('login.pick')}</h2>
          <p class="muted mb-16">${t('login.pickHint')}</p>
          <h3 class="mb-8 mt-16">${t('portal.entity')}</h3>
          <div class="user-groups">${entities.map(function (o) { return group(o, t('login.entityGroupHint'), byOrg[o]); })}</div>
          <h3 class="mb-8 mt-24">${t('login.providers')}</h3>
          <div class="user-groups">${companies.map(function (o) {
            return group(o, t('login.companyGroupHint'), byOrg[o]);
          })}${group(t('login.freelancers'), t('login.freelancerHint'), freelancers)}</div>
          <h3 class="mb-8 mt-24">${t('portal.admin')}</h3>
          <div class="user-groups">${group(ICM.config.PLATFORM_NAME, null, platform)}</div>
        </main>
      </div>`;
    },
    actions: {
      login: async function (el, ev, ctx) {
        var s = await S.auth.loginAs(el.getAttribute('data-id'));
        ICM.app.pageState = {};
        ctx.navigate(s.home);
      }
    }
  };
})();
