/* Shared workflow machinery. Pure functions only: no store, no DOM, no clock.
   A machine is a list of transition definitions:
     { action, from: [statuses], to, roles: [roles],
       when(c, actor, ctx)            -> error key | null   (availability, no payload needed)
       guard(c, actor, payload, ctx)  -> error key | null   (payload validation)
       effect(next, payload, actor, ctx, prev) mutates the copied case }
   ctx: { now, provider (the case's provider record, may be null), config } */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});

  wf.ENTITY_ROLES = ['entity_admin', 'entity_credit', 'entity_operations', 'entity_collections'];
  wf.PROVIDER_MANAGER_ROLES = ['provider_admin', 'provider_supervisor', 'freelancer'];
  wf.FIELD_ROLES = ['agent', 'freelancer'];
  /** Does this person do field work: an agent, an individual provider, or an owner with a field profile. */
  wf.doesFieldWork = function (actor) {
    if (!actor) return false;
    return actor.role === 'agent' || actor.role === 'freelancer' || (actor.role === 'provider_admin' && !!actor.agentId);
  };
  /**
   * Platform staff, one role per team. platform_admin is the Super admin and platform_qa
   * the Quality team; the others were added with the internal console.
   */
  wf.PLATFORM_ROLES = ['platform_admin', 'platform_management', 'platform_ops', 'platform_finance', 'platform_qa',
    'platform_legal', 'platform_support', 'platform_sales', 'platform_data'];

  /**
   * What each team may see and do (agreed with the business, 5 Oct 2026). Customer support
   * and data see no personal data. Sensitive decisions need two teams (DUAL_APPROVAL).
   */
  wf.PERMISSIONS = {
    platform_admin: ['*'],
    platform_management: ['overview', 'cases.view', 'personalData', 'cases.manage', 'providers.view', 'providers.approve', 'providers.signoff',
      'providers.prices', 'providers.documents', 'providers.enforce', 'qa.review', 'disputes.view', 'disputes.decide', 'billing.view',
      'billing.issue', 'billing.pay', 'billing.adjust', 'fee.change', 'orgs.view', 'orgs.create', 'reports.view', 'audit.view'],
    platform_ops: ['overview', 'cases.view', 'personalData', 'cases.manage', 'providers.view', 'providers.approve', 'providers.prices',
      'providers.documents', 'orgs.view', 'disputes.view'],
    platform_finance: ['overview', 'billing.view', 'billing.issue', 'billing.pay', 'billing.adjust', 'fee.change', 'orgs.view', 'providers.view'],
    platform_qa: ['overview', 'cases.view', 'personalData', 'qa.review'],
    platform_legal: ['overview', 'cases.view', 'personalData', 'disputes.view', 'disputes.decide', 'audit.view'],
    platform_support: ['overview', 'cases.view', 'providers.view', 'orgs.view', 'accounts.resetLogin', 'disputes.view', 'disputes.openOnBehalf'],
    platform_sales: ['overview', 'providers.view', 'orgs.view', 'orgs.create'],
    platform_data: ['overview', 'reports.view']
  };
  /** Actions that need two teams: the first approval waits for the second. */
  wf.DUAL_APPROVAL = {
    'fee.change': ['platform_finance', 'platform_management'],
    'disputes.decide': ['platform_legal', 'platform_management']
  };
  wf.isPlatformRole = function (role) { return wf.PLATFORM_ROLES.indexOf(role) >= 0; };
  /** Can this staff role do this? The Super admin can do everything. */
  wf.can = function (role, permission) {
    var list = wf.PERMISSIONS[role];
    return !!list && (list.indexOf('*') >= 0 || list.indexOf(permission) >= 0);
  };
  /** Staff who see customers' national ID, phones, addresses and report answers. */
  wf.seesPersonalData = function (role) { return wf.can(role, 'personalData'); };
  /** Every permission a role has, the Super admin's expanded. */
  wf.permissionsOf = function (role) {
    var list = wf.PERMISSIONS[role] || [];
    if (list.indexOf('*') < 0) return list.slice();
    var all = {};
    Object.keys(wf.PERMISSIONS).forEach(function (r) { wf.PERMISSIONS[r].forEach(function (p) { if (p !== '*') all[p] = true; }); });
    return Object.keys(all).concat(['staff.manage', 'settings.manage']);
  };
  wf.PROVIDER_SIDE_ROLES = ['provider_admin', 'provider_supervisor', 'freelancer', 'agent'];
  wf.ALL_ROLES = wf.ENTITY_ROLES.concat(['provider_admin', 'provider_supervisor', 'agent', 'freelancer'], wf.PLATFORM_ROLES, ['system']);
  wf.PRE_ACCEPT = ['draft', 'submitted', 'awaiting_acceptance', 'declined', 'expired'];
  wf.TERMINAL = ['closed', 'cancelled', 'recalled'];

  wf.SYSTEM = { userId: 'system', name: 'System', role: 'system' };

  wf.isEntityRole = function (role) { return wf.ENTITY_ROLES.indexOf(role) >= 0; };
  wf.isProviderSide = function (role) { return wf.PROVIDER_SIDE_ROLES.indexOf(role) >= 0; };
  wf.isTerminal = function (status) { return wf.TERMINAL.indexOf(status) >= 0; };

  /** Credit works on investigations, Collections on collections, Operations and Admin on both. */
  wf.entityServes = function (role, service) {
    if (role === 'entity_admin' || role === 'entity_operations') return true;
    if (role === 'entity_credit') return service === 'investigation';
    if (role === 'entity_collections') return service === 'collection';
    return false;
  };

  /** Does this actor have a relationship with the case that lets them act on it at all? */
  wf.relates = function (c, actor) {
    switch (actor.role) {
      case 'system':
        return true;
      case 'provider_admin':
      case 'provider_supervisor':
      case 'freelancer':
        return !!actor.providerId && actor.providerId === c.providerId;
      case 'agent':
        return !!actor.agentId && actor.agentId === c.agentId;
      default:
        if (wf.isEntityRole(actor.role)) return actor.entityId === c.entityId && wf.entityServes(actor.role, c.service);
        if (wf.isPlatformRole(actor.role)) return wf.can(actor.role, 'cases.view');
        return false;
    }
  };

  function WorkflowError(key) {
    this.name = 'WorkflowError';
    this.key = key;
    this.message = key;
  }
  WorkflowError.prototype = Object.create(Error.prototype);
  wf.WorkflowError = WorkflowError;

  wf.entry = function (actor, now, action, extra) {
    var e = {
      id: ICM.util.uid('tl'),
      at: now,
      action: action,
      actorId: actor.userId,
      actorName: actor.name,
      actorRole: actor.role
    };
    if (extra) for (var k in extra) if (extra[k] !== undefined) e[k] = extra[k];
    return e;
  };

  /** Append a non-transition entry (e.g. a photo added) to a case copy. */
  wf.withEntry = function (c, actor, now, action, extra) {
    var next = Object.assign({}, c);
    next.timeline = (c.timeline || []).concat([wf.entry(actor, now, action, extra)]);
    return next;
  };

  wf.createMachine = function (service, defs) {
    var byAction = {};
    defs.forEach(function (d) { byAction[d.action] = d; });

    function check(c, action, actor, payload, ctx) {
      var d = byAction[action];
      if (!d) return 'wf.err.unknownAction';
      if (c.service !== service) return 'wf.err.wrongService';
      if (d.from.indexOf(c.status) < 0) return 'wf.err.invalidState';
      if (d.roles.indexOf(actor.role) < 0) return 'wf.err.role';
      if (!wf.relates(c, actor)) return 'wf.err.notOwner';
      ctx = ctx || {};
      if (d.when) { var w = d.when(c, actor, ctx); if (w) return w; }
      if (d.guard) { var g = d.guard(c, actor, payload || {}, ctx); if (g) return g; }
      return null;
    }

    return {
      service: service,
      defs: defs,
      get: function (action) { return byAction[action]; },
      check: check,
      can: function (c, action, actor, payload, ctx) { return !check(c, action, actor, payload, ctx); },
      /** Actions this actor could trigger right now (payload checks deferred to submit). */
      available: function (c, actor, ctx) {
        return defs.filter(function (d) {
          if (d.from.indexOf(c.status) < 0 || d.roles.indexOf(actor.role) < 0) return false;
          if (!wf.relates(c, actor)) return false;
          return !(d.when && d.when(c, actor, ctx || {}));
        }).map(function (d) { return d.action; });
      },
      apply: function (c, action, actor, payload, ctx) {
        ctx = ctx || {};
        payload = payload || {};
        var err = check(c, action, actor, payload, ctx);
        if (err) throw new WorkflowError(err);
        var d = byAction[action];
        var next = Object.assign({}, c);
        next.status = d.to;
        next.timeline = (c.timeline || []).concat([wf.entry(actor, ctx.now, action, {
          from: c.status,
          to: d.to,
          note: payload.reason || payload.comment || payload.note || undefined
        })]);
        next.updatedAt = ctx.now;
        if (d.effect) d.effect(next, payload, actor, ctx, c);
        return next;
      }
    };
  };

  /** Shared offer transitions, identical for both services. */
  wf.offerDefs = function (entityRoles, managerRoles) {
    return [
      { action: 'submit', from: ['draft'], to: 'submitted', roles: entityRoles,
        effect: function (n, p, a, ctx) { n.submittedAt = ctx.now; } },
      { action: 'send_offer', from: ['submitted', 'declined', 'expired'], to: 'awaiting_acceptance', roles: entityRoles.concat(['system']),
        guard: function (c, a, p) {
          if (!p.providerId) return 'wf.err.providerRequired';
          if ((c.declinedProviderIds || []).indexOf(p.providerId) >= 0) return 'wf.err.providerDeclined';
          return null;
        },
        effect: function (n, p, a, ctx) {
          n.providerId = p.providerId;
          n.offerId = p.offerId || null;
          if (p.price != null) n.price = p.price;
          n.offerSentAt = ctx.now;
        } },
      { action: 'decline', from: ['awaiting_acceptance'], to: 'declined', roles: managerRoles,
        guard: function (c, a, p) { return p.reason ? null : 'wf.err.reasonRequired'; },
        effect: function (n, p, a, ctx, prev) {
          n.declinedProviderIds = (prev.declinedProviderIds || []).concat([prev.providerId]);
          n.lastDecline = { providerId: prev.providerId, reason: p.reason, at: ctx.now };
          n.providerId = null;
          n.offerId = null;
        } },
      { action: 'expire', from: ['awaiting_acceptance'], to: 'expired', roles: ['system'],
        effect: function (n, p, a, ctx, prev) {
          n.expiredProviderIds = (prev.expiredProviderIds || []).concat([prev.providerId]);
          n.providerId = null;
          n.offerId = null;
        } },
      { action: 'accept', from: ['awaiting_acceptance'], to: 'accepted', roles: managerRoles,
        effect: function (n, p, a, ctx) { n.acceptedAt = ctx.now; } }
    ];
  };

  /** Admin force-reassign: send a fresh offer to another provider from any open state. */
  wf.forceReassignDef = function (openStates) {
    return { action: 'force_reassign', from: openStates.filter(function (s) { return s !== 'draft'; }), to: 'awaiting_acceptance', roles: ['platform_admin'],
      guard: function (c, a, p) {
        if (!p.reason) return 'wf.err.reasonRequired';
        if (!p.providerId) return 'wf.err.providerRequired';
        if (p.providerId === c.providerId) return 'wf.err.sameProvider';
        return null;
      },
      effect: function (n, p, a, ctx) {
        n.providerId = p.providerId;
        n.offerId = p.offerId || null;
        if (p.price != null) n.price = p.price;
        n.agentId = null;
        n.acceptedAt = null;
        n.checkIn = null;
        n.offerSentAt = ctx.now;
        if (!n.submittedAt) n.submittedAt = ctx.now;
      } };
  };

  wf.cancelDef = function (openStates, entityRoles) {
    return { action: 'cancel', from: openStates, to: 'cancelled', roles: entityRoles.concat(['platform_admin']),
      when: function (c, a) {
        if (wf.isEntityRole(a.role) && wf.PRE_ACCEPT.indexOf(c.status) < 0) return 'wf.err.entityCancelAfterAccept';
        return null;
      },
      guard: function (c, a, p) { return a.role === 'platform_admin' && !p.reason ? 'wf.err.reasonRequired' : null; },
      effect: function (n, p, a, ctx) { n.closedAt = ctx.now; n.cancelReason = p.reason || null; } };
  };

  wf.machineFor = function (service) { return service === 'collection' ? wf.collection : wf.investigation; };
})();
