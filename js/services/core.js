/* Mock services: auth, config, demo clock, notifications and audit. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;

  function portalOf(u) {
    if (wf.isEntityRole(u.role)) return 'entity';
    if (u.role === 'platform_admin' || u.role === 'platform_qa') return 'admin';
    var prov = u.providerId ? E.providerById(u.providerId) : null;
    // Until the platform verifies the provider, its people only see their application.
    if (prov && prov.verification.status !== 'verified') return 'applicant';
    return u.role === 'agent' ? 'agent' : 'provider';
  }
  function homeOf(u) {
    var p = portalOf(u);
    if (p === 'entity') return '#/client';
    if (p === 'agent') return '#/agent';
    if (p === 'admin') return u.role === 'platform_qa' ? '#/admin/qa' : '#/admin';
    if (p === 'applicant') return '#/application';
    var prov = E.providerById(u.providerId);
    return '#/provider/' + (prov ? prov.services[0] : 'investigation');
  }
  function sessionUser(u) {
    if (!u) return null;
    var prov = u.providerId ? E.providerById(u.providerId) : null;
    return {
      user: u,
      portal: portalOf(u),
      home: homeOf(u),
      entity: u.entityId ? E.entityById(u.entityId) : null,
      provider: prov ? { id: prov.id, name: prov.name, kind: prov.kind, services: prov.services, enforcement: prov.enforcement } : null,
      agent: u.agentId ? E.agentById(u.agentId) : null
    };
  }
  function orgName(u) {
    if (u.entityId) return E.entityById(u.entityId).name;
    if (u.providerId) return E.providerById(u.providerId).name;
    return ICM.config.PLATFORM_NAME;
  }

  S.auth = {
    listDemoUsers: function () {
      return E.run(function () {
        return E.db().users.filter(function (u) { return u.active !== false; }).map(function (u) {
          return Object.assign({}, u, { orgName: orgName(u), portal: portalOf(u), orgKind: u.providerId ? E.providerById(u.providerId).kind : null });
        });
      });
    },
    currentUser: function () { return E.run(function () { return sessionUser(E.currentUser()); }); },
    loginAs: function (userId) {
      return E.run(function () {
        var u = E.userById(userId);
        if (!u || u.active === false) throw new Err('errors.notFound');
        E.setSession(u.id);
        return sessionUser(u);
      });
    },
    logout: function () { return E.run(function () { E.setSession(null); return null; }); },
    portalOf: portalOf,
    homeOf: homeOf
  };

  // ---------------------------------------------------------------- config
  S.config = {
    get: function () { return E.run(function () { return E.db().config; }); },
    updateScoring: function (patch) {
      return E.mutate(function (db) {
        E.requireRole(['platform_admin']);
        var next = Object.assign({}, db.config.scoring);
        Object.keys(patch).forEach(function (k) { next[k] = +patch[k]; });
        if (next.operationalWeight + next.ratingWeight !== 100) throw new Err('errors.weightsSum');
        if (!(next.suspendBelow < next.reduceBelow && next.reduceBelow < next.warnBelow)) throw new Err('errors.thresholdOrder');
        if (next.entityCapPct < 10 || next.entityCapPct > 100) throw new Err('errors.capRange');
        if (next.minRatings < 1 || next.recencyDays < 1) throw new Err('errors.min');
        var before = db.config.scoring;
        db.config.scoring = next;
        E.audit('config.scoring', 'config', 'scoring', null, before, next, null);
        return db.config;
      });
    },
    updatePricing: function (patch) {
      return E.mutate(function (db) {
        E.requireRole(['platform_admin']);
        var before = U.clone({ pricing: db.config.pricing, sla: db.config.lists.inquiryTypes.map(function (t) { return [t.id, t.defaultSlaHours]; }) });
        var p = Object.assign({}, db.config.pricing, patch.pricing || {});
        if (p.platformFeePct < 0 || p.platformFeePct > 50) throw new Err('errors.feeRange');
        if (p.offerWindowHours < 1 || p.offerWindowHours > 72) throw new Err('errors.windowRange');
        Object.keys(p.investigationBands).forEach(function (k) { if (+p.investigationBands[k].min >= +p.investigationBands[k].max) throw new Err('errors.bandOrder'); });
        Object.keys(p.collectionFeeBands).forEach(function (k) { if (+p.collectionFeeBands[k].min >= +p.collectionFeeBands[k].max) throw new Err('errors.bandOrder'); });
        db.config.pricing = p;
        if (patch.slaHours) db.config.lists.inquiryTypes.forEach(function (t) { if (patch.slaHours[t.id]) t.defaultSlaHours = +patch.slaHours[t.id]; });
        E.audit('config.pricing', 'config', 'pricing', null, before, { pricing: p, sla: patch.slaHours || null }, null);
        return db.config;
      });
    },
    updateList: function (name, items) {
      return E.mutate(function (db) {
        E.requireRole(['platform_admin']);
        if (!db.config.lists[name]) throw new Err('errors.notFound');
        var ids = {};
        items.forEach(function (it) {
          if (!it.id || !String(it.en || '').trim()) throw new Err('errors.listItemInvalid');
          if (ids[it.id]) throw new Err('errors.listDuplicate');
          ids[it.id] = true;
        });
        var before = db.config.lists[name];
        db.config.lists[name] = items;
        E.audit('config.list', 'config', name, name, { count: before.length }, { count: items.length }, null);
        return db.config;
      });
    }
  };

  // ---------------------------------------------------------------- demo
  S.demo = {
    clock: function () { return E.run(function () { return { now: E.now(), offsetMs: E.db().clock.offsetMs }; }); },
    advance: function (ms) {
      return E.run(function () {
        E.requireRole(['platform_admin']);
        var before = E.db().clock.offsetMs;
        ICM.store.tx(function (db) {
          db.clock.offsetMs = before + ms;
          E.audit('demo.clock_advance', 'clock', 'clock', null, { offsetMs: before }, { offsetMs: db.clock.offsetMs }, null);
        });
        var summary = E.tick();
        return Object.assign({ now: E.now() }, summary);
      });
    },
    resetClock: function () {
      return E.run(function () {
        E.requireRole(['platform_admin']);
        ICM.store.tx(function (db) { db.clock.offsetMs = 0; });
        return { now: E.now() };
      });
    },
    reset: function () {
      return E.run(function () {
        var uid = E.sessionUserId();
        ICM.store.reset();
        if (uid && !E.userById(uid)) E.setSession(null);
        return null;
      });
    },
    simulateBatchWork: function (batchId) { return S.batches._simulate(batchId); },
    tick: function () { return E.run(function () { return E.tick(); }); }
  };

  // ---------------------------------------------------------------- notifications
  function caseHref(c, u) {
    var portal = portalOf(u);
    if (portal === 'entity') return '#/client/cases/' + c.id;
    if (portal === 'agent') return '#/agent/tasks/' + c.id;
    if (portal === 'admin') return '#/admin/cases/' + c.id;
    return '#/provider/' + c.service + '/cases/' + c.id;
  }
  function resolveLink(link, u) {
    if (!link) return null;
    var i = link.indexOf(':'), kind = link.slice(0, i), id = link.slice(i + 1);
    var prov = u.providerId ? E.providerById(u.providerId) : null;
    var svc = prov ? prov.services[0] : 'investigation';
    switch (kind) {
      case 'case': var c = E.caseById(id); return c ? caseHref(c, u) : null;
      case 'batch': return portalOf(u) === 'admin' ? '#/admin/cases?batch=' + id : '#/client/batches/' + id;
      case 'dispute':
        if (portalOf(u) === 'admin') return '#/admin/disputes/' + id;
        var d = E.disputeById(id);
        if (d && d.caseId && portalOf(u) === 'entity') return '#/client/cases/' + d.caseId;
        return portalOf(u) === 'provider' ? '#/provider/' + svc + '/ratings' : null;
      case 'provider':
        if (portalOf(u) === 'agent') return '#/agent';
        return '#/provider/' + svc + (id === 'dashboard' ? '' : '/' + id);
      case 'entity': return '#/client/' + id;
      case 'provider-admin': return '#/admin/providers/' + id;
      case 'admin': return '#/admin/' + id;
      case 'application': return portalOf(u) === 'applicant' ? '#/application' : null;
      default: return null;
    }
  }

  S.notifications = {
    list: function () {
      return E.run(function () {
        var u = E.currentUser();
        if (!u) return [];
        return E.db().notifications.filter(function (n) { return n.userId === u.id; })
          .sort(function (a, b) { return b.at - a.at; }).slice(0, 60)
          .map(function (n) { return Object.assign({}, n, { href: resolveLink(n.link, u) }); });
      });
    },
    unreadCount: function () {
      return E.run(function () {
        var u = E.currentUser();
        return u ? E.db().notifications.filter(function (n) { return n.userId === u.id && !n.read; }).length : 0;
      });
    },
    markRead: function (id) {
      return E.run(function () {
        ICM.store.tx(function (db) { db.notifications.forEach(function (n) { if (n.id === id) n.read = true; }); });
        return null;
      });
    },
    markAllRead: function () {
      return E.run(function () {
        var u = E.currentUser();
        ICM.store.tx(function (db) { db.notifications.forEach(function (n) { if (u && n.userId === u.id) n.read = true; }); });
        return null;
      });
    }
  };

  // ---------------------------------------------------------------- audit
  S.audit = {
    list: function (f) {
      return E.run(function () {
        E.requireRole(['platform_admin']);
        f = f || {};
        var q = (f.q || '').toLowerCase();
        return E.db().audit.filter(function (a) {
          if (f.targetType && a.targetType !== f.targetType) return false;
          if (f.actorRole && a.actorRole !== f.actorRole) return false;
          if (f.from && a.at < f.from) return false;
          if (f.to && a.at > f.to) return false;
          if (q && (a.action + ' ' + (a.targetRef || '') + ' ' + a.actorName + ' ' + (a.reason || '')).toLowerCase().indexOf(q) < 0) return false;
          return true;
        }).sort(function (a, b) { return b.at - a.at; }).slice(0, f.limit || 400);
      });
    }
  };
})();
