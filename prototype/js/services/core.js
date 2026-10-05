/* Mock services: auth, config, demo clock, notifications and audit. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;

  function portalOf(u) {
    if (wf.isEntityRole(u.role)) return 'entity';
    if (wf.isPlatformRole(u.role)) return 'admin';
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
  /** Simulated backend only: a salted FNV-1a hash, so no password is kept as typed. */
  function passwordHash(userId, pw) {
    var s = userId + ':' + pw, h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16);
  }
  /** "n****@horus-auto.example" */
  function maskEmail(email) {
    var at = email.indexOf('@');
    return at > 1 ? email.charAt(0) + '****' + email.slice(at) : email;
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
    /**
     * First step of the organisation sign-in: work email and password. Organisation and
     * platform staff only; service providers sign in with their mobile. After
     * SIGN_IN_MAX_TRIES wrong passwords the account is locked for SIGN_IN_LOCK_MINUTES.
     * Returns who is signing in and a masked email for the code step.
     */
    checkPassword: function (email, password) {
      var C = ICM.config;
      return E.mutate(function (db) {
        var mail = String(email || '').trim().toLowerCase();
        var u = db.users.filter(function (x) { return x.email && x.email.toLowerCase() === mail && x.active !== false; })[0];
        if (!u || portalOf(u) !== 'entity' && portalOf(u) !== 'admin') return { error: 'errors.wrongPassword' };
        var now = E.now();
        if (u.lockedUntil && u.lockedUntil > now) return { error: 'errors.signInLocked', params: { min: Math.ceil((u.lockedUntil - now) / 60000) } };
        var expected = u.passwordHash || passwordHash(u.id, C.DEMO_PASSWORD);
        if (passwordHash(u.id, String(password || '')) !== expected) {
          u.signInFails = (u.signInFails || 0) + 1;
          if (u.signInFails >= C.SIGN_IN_MAX_TRIES) {
            u.signInFails = 0;
            u.lockedUntil = now + C.SIGN_IN_LOCK_MINUTES * 60000;
            return { error: 'errors.signInLocked', params: { min: C.SIGN_IN_LOCK_MINUTES } };
          }
          return { error: 'errors.wrongPassword' };
        }
        u.signInFails = 0;
        u.lockedUntil = null;
        return { userId: u.id, name: u.name, maskedEmail: maskEmail(u.email) };
      }).then(function (r) {
        if (r.error) throw new Err(r.error, r.params);
        return r;
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
        E.requirePermission('settings.manage');
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
        E.requirePermission('settings.manage');
        var before = U.clone({ pricing: db.config.pricing, sla: db.config.lists.inquiryTypes.map(function (t) { return [t.id, t.defaultSlaHours]; }) });
        var p = Object.assign({}, db.config.pricing, patch.pricing || {});
        // The fee changes only through billing.proposeFee / confirmFee (Finance and Management).
        if (+p.platformFeePct !== +db.config.pricing.platformFeePct) throw new Err('errors.feeNeedsTwoTeams');
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
        E.requirePermission('settings.manage');
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
    /**
     * Demo only: act as the platform on the signed-in applicant's own application, so the
     * whole review can be tried from the app. action: 'approve' (Operations), 'verify'
     * (Management sign-off), 'requestInfo' or 'reject' (note required).
     */
    reviewMyApplication: function (action, note) {
      var me = E.currentUser();
      var admin = E.admins()[0];
      if (!me || !me.providerId || !admin) return Promise.reject(new Err('errors.forbidden'));
      var pid = me.providerId;
      if (action === 'approve' || action === 'verify') {
        var p = E.providerById(pid);
        if (p && p.kind === 'freelancer') ICM.store.tx(function () { p.verification.idVerified = true; p.verification.certified = true; });
      }
      var fn = { approve: S.providers.approve, verify: S.providers.verify, requestInfo: S.providers.requestInfo, reject: S.providers.reject }[action];
      if (!fn) return Promise.reject(new Err('errors.forbidden'));
      // Operations does the first step, Management the sign-off (two different people).
      var ops = E.staffWith('providers.approve').filter(function (u) { return u.role === 'platform_ops'; })[0];
      var mgmt = E.staffWith('providers.signoff').filter(function (u) { return u.role === 'platform_management'; })[0];
      if (action === 'verify' && mgmt) admin = mgmt;
      else if (action !== 'verify' && ops) admin = ops;
      E.setSession(admin.id);
      var out;
      try { out = fn(pid, note); } finally { E.setSession(me.id); }
      return out;
    },
    /**
     * Demo only: the platform decides a dispute that involves the signed-in provider, so the
     * outcome can be tried from the app. outcome: 'upheld' | 'partial' | 'rejected'.
     */
    resolveMyDispute: function (disputeId, outcome, note) {
      var me = E.currentUser();
      var admin = E.admins()[0];
      var d = E.disputeById(disputeId);
      // The provider or the client on the dispute can play the platform's decision in the demo.
      if (!me || !admin || !d || !((me.providerId && d.providerId === me.providerId) || (me.entityId && d.entityId === me.entityId))) return Promise.reject(new Err('errors.forbidden'));
      // Legal proposes and Management confirms, as on the platform (the engine runs each step at once).
      var legal = E.staffWith('disputes.decide').filter(function (u) { return u.role === 'platform_legal'; })[0] || admin;
      var mgmt = E.staffWith('disputes.decide').filter(function (u) { return u.role === 'platform_management'; })[0] || admin;
      var out;
      try {
        E.setSession(legal.id);
        out = S.disputes.propose(disputeId, outcome, note);
        if (E.disputeById(disputeId).proposal) { E.setSession(mgmt.id); out = S.disputes.confirm(disputeId); }
      } finally { E.setSession(me.id); }
      return out;
    },
    /**
     * Demo only: Operations decisions on the signed-in provider, from the app.
     * action: 'approvePrices' | 'rejectPrices' (note) | 'verifyDocument' (type) |
     * 'rejectDocument' (type, note) | 'expireDocument' (type: moves its expiry date to now).
     */
    reviewMyProvider: function (action, type, note) {
      var me = E.currentUser();
      var admin = E.admins()[0];
      if (!me || !me.providerId || !admin) return Promise.reject(new Err('errors.forbidden'));
      var pid = me.providerId;
      if (action === 'expireDocument') {
        return E.mutate(function () {
          var d = E.providerById(pid).verification.documents.filter(function (k) { return k.type === type; })[0];
          if (!d) throw new Err('errors.notFound');
          d.expiresAt = E.now() - 1000;
          return d;
        }).then(function () { return E.run(function () { return E.tick(); }); });
      }
      var calls = {
        approvePrices: function () { return S.providers.decidePriceChange(pid, true, note); },
        rejectPrices: function () { return S.providers.decidePriceChange(pid, false, note); },
        verifyDocument: function () { return S.providers.verifyDocument(pid, type); },
        rejectDocument: function () { return S.providers.rejectDocument(pid, type, note); }
      };
      if (!calls[action]) return Promise.reject(new Err('errors.forbidden'));
      E.setSession(admin.id);
      var out;
      try { out = calls[action](); } finally { E.setSession(me.id); }
      return out;
    },
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

  // ---------------------------------------------------------------- accounts
  /** "n****@horus-auto.example" for messages about someone's sign-in. */
  function masked(email) { var at = (email || '').indexOf('@'); return at > 1 ? email.charAt(0) + '****' + email.slice(at) : email || ''; }
  function activeSuperAdmins(db) { return db.users.filter(function (u) { return u.role === 'platform_admin' && u.active !== false; }); }

  S.accounts = {
    /**
     * Customer support helps someone who cannot sign in: the lock after wrong passwords is
     * lifted and the password is reset. With the real backend the person gets a link by
     * email to choose a new one; in the demo the demo password works again. Support resets
     * organisation users; staff accounts are reset by the Super admin.
     */
    resetLogin: function (userId) {
      return E.mutate(function (db) {
        var a = E.requirePermission('accounts.resetLogin');
        var u = E.userById(userId);
        if (!u || !u.email) throw new Err('errors.notFound');
        var staffAccount = wf.isPlatformRole(u.role);
        if (!wf.isEntityRole(u.role) && !staffAccount) throw new Err('errors.forbidden');
        if (staffAccount && !wf.can(a.role, 'staff.manage')) throw new Err('errors.forbidden');
        if (u.id === a.userId) throw new Err('errors.forbidden');
        u.passwordHash = null; u.lockedUntil = null; u.signInFails = 0; u.passwordResetAt = E.now();
        E.audit('user.login_reset', 'user', u.id, u.name, null, null, null, a);
        return { maskedEmail: masked(u.email) };
      });
    }
  };

  /** Platform staff accounts: the Super admin adds people, sets their team and deactivates them. */
  S.staff = {
    list: function () {
      return E.run(function () {
        E.requirePermission('staff.manage');
        return E.db().users.filter(function (u) { return wf.isPlatformRole(u.role); }).map(function (u) {
          return { id: u.id, name: u.name, email: u.email, role: u.role, active: u.active !== false, invited: !!u.invited, lockedUntil: u.lockedUntil || null, createdAt: u.createdAt || null };
        });
      });
    },
    invite: function (v) {
      return E.mutate(function (db) {
        var a = E.requirePermission('staff.manage');
        var name = String((v && v.name) || '').trim(), email = String((v && v.email) || '').trim().toLowerCase();
        if (!name) throw new Err('errors.required', { field: 'name' });
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Err('errors.emailFormat', { field: 'email' });
        if (db.users.some(function (u) { return (u.email || '').toLowerCase() === email; })) throw new Err('errors.emailTaken', { field: 'email' });
        if (!wf.isPlatformRole(v.role)) throw new Err('errors.required', { field: 'role' });
        var u = { id: U.uid('u'), name: name, email: email, role: v.role, active: true, invited: true, createdAt: E.now() };
        db.users.push(u);
        E.audit('staff.invited', 'user', u.id, u.name, null, { role: u.role }, null, a);
        return u;
      });
    },
    setRole: function (userId, role) {
      return E.mutate(function (db) {
        var a = E.requirePermission('staff.manage');
        var u = E.userById(userId);
        if (!u || !wf.isPlatformRole(u.role) || !wf.isPlatformRole(role)) throw new Err('errors.forbidden');
        if (u.id === a.userId) throw new Err('errors.ownRole');
        if (u.role === 'platform_admin' && role !== 'platform_admin' && activeSuperAdmins(db).length < 2) throw new Err('errors.lastSuperAdmin');
        var before = u.role;
        u.role = role;
        E.audit('staff.role', 'user', u.id, u.name, { role: before }, { role: role }, null, a);
        return u;
      });
    },
    setActive: function (userId, active) {
      return E.mutate(function (db) {
        var a = E.requirePermission('staff.manage');
        var u = E.userById(userId);
        if (!u || !wf.isPlatformRole(u.role)) throw new Err('errors.forbidden');
        if (u.id === a.userId) throw new Err('errors.cannotDeactivateSelf');
        if (!active && u.role === 'platform_admin' && activeSuperAdmins(db).length < 2) throw new Err('errors.lastSuperAdmin');
        u.active = !!active;
        E.audit(active ? 'staff.activated' : 'staff.deactivated', 'user', u.id, u.name, null, null, null, a);
        return u;
      });
    }
  };

  // ---------------------------------------------------------------- audit
  S.audit = {
    list: function (f) {
      return E.run(function () {
        E.requirePermission('audit.view');
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
