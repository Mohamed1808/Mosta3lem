/* Mock services: providers (profile, team, onboarding, enforcement) and entities. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain, C = ICM.config;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;

  function withScore(p) {
    var db = E.db();
    var open = db.cases.filter(function (c) { return c.providerId === p.id && !wf.isTerminal(c.status); }).length;
    var clientGiven = db.clientRatings.filter(function (r) { return r.providerId === p.id; }).length;
    return Object.assign({}, p, { score: db.scores[p.id] || null, load: D.providerLoad(db, p.id), openCases: open, clientRatingsGiven: clientGiven });
  }

  function myProvider() {
    var a = E.actor();
    if (!a.providerId) throw new Err('errors.forbidden');
    return E.providerById(a.providerId);
  }

  function validatePricing(p) {
    var cfg = E.db().config.pricing;
    if (p.services.indexOf('investigation') >= 0) {
      var inv = (p.pricing && p.pricing.investigation) || {};
      Object.keys(cfg.investigationBands).forEach(function (t) {
        C.ZONES.forEach(function (z) {
          var price = +((inv[t] || {})[z.id]);
          var m = cfg.zoneMultiplier[z.id] || 1, band = cfg.investigationBands[t];
          if (!(price >= Math.round(band.min * m) && price <= Math.round(band.max * m))) throw new Err('errors.priceOutOfBand', { type: t, zone: z.id, min: Math.round(band.min * m), max: Math.round(band.max * m) });
        });
      });
    }
    if (p.services.indexOf('collection') >= 0) {
      var col = (p.pricing && p.pricing.collection) || { feePct: {} };
      Object.keys(cfg.collectionFeeBands).forEach(function (b) {
        var v = +col.feePct[b], band = cfg.collectionFeeBands[b];
        if (!(v >= band.min && v <= band.max)) throw new Err('errors.feeOutOfBand', { bucket: b, min: band.min, max: band.max });
      });
      if (!(+col.fixedFee >= 0 && +col.fixedFee <= cfg.collectionFixedFeeMax)) throw new Err('errors.fixedFeeOutOfBand', { max: cfg.collectionFixedFeeMax });
    }
  }

  function agentStats(agent) {
    var cases = E.db().cases.filter(function (c) { return c.agentId === agent.id; });
    var delivered = cases.filter(function (c) { return c.firstDeliveredAt; });
    var closedCol = cases.filter(function (c) { return c.service === 'collection' && c.status === 'closed'; });
    return {
      open: D.agentLoad(E.db(), agent.id),
      delivered: delivered.length,
      onTimeRate: delivered.length ? delivered.filter(function (c) { return c.onTime; }).length / delivered.length : null,
      returns: U.sum(cases, function (c) { return c.returnCount || 0; }),
      reworks: U.sum(cases, function (c) { return c.reworkCount || 0; }),
      evidenceRate: delivered.length ? delivered.filter(function (c) { return c.evidenceComplete; }).length / delivered.length : null,
      collected: U.sum(cases.filter(function (c) { return c.service === 'collection'; }), function (c) { return wf.collection.recovered(c); }),
      closedCollections: closedCol.length,
      actionsLogged: U.sum(cases, function (c) { return (c.actions || []).length; })
    };
  }

  S.providers = {
    mine: function () { return E.run(function () { return withScore(myProvider()); }); },
    updateProfile: function (patch) {
      return E.mutate(function () {
        var a = E.actor();
        if (['provider_admin', 'freelancer'].indexOf(a.role) < 0) throw new Err('errors.forbidden');
        var p = E.providerById(a.providerId);
        var next = U.clone(p);
        ['description', 'phone', 'email', 'city'].forEach(function (k) { if (patch[k] != null) next[k] = patch[k]; });
        if (patch.governorates) {
          next.governorates = patch.governorates.slice();
          var cap = {};
          next.governorates.forEach(function (g) { cap[g] = Math.max(1, +((patch.capacity || {})[g] || p.capacity[g] || 5)); });
          next.capacity = cap;
        } else if (patch.capacity) {
          Object.keys(patch.capacity).forEach(function (g) { if (next.governorates.indexOf(g) >= 0) next.capacity[g] = Math.max(1, +patch.capacity[g]); });
        }
        if (patch.pricing) next.pricing = U.clone(patch.pricing);
        if (patch.sla) next.sla = U.clone(patch.sla);
        if (!next.governorates.length) throw new Err('errors.coverageRequired');
        validatePricing(next);
        Object.assign(p, next);
        E.audit('provider.profile_updated', 'provider', p.id, p.name, null, { governorates: p.governorates.length }, null, a);
        return withScore(p);
      });
    },
    uploadDocument: function (type) {
      return E.mutate(function () {
        var a = E.actor();
        var p = E.providerById(a.providerId);
        if (!p || ['provider_admin', 'freelancer'].indexOf(a.role) < 0) throw new Err('errors.forbidden');
        var docs = p.verification.documents;
        var d = docs.filter(function (x) { return x.type === type; })[0];
        if (d) { d.status = 'uploaded'; d.uploadedAt = E.now(); }
        else docs.push({ type: type, status: 'uploaded', uploadedAt: E.now() });
        E.audit('provider.document_uploaded', 'provider', p.id, p.name, null, { type: type }, null, a);
        return withScore(p);
      });
    },
    team: function (service) {
      return E.run(function () {
        var p = myProvider();
        return E.db().agents.filter(function (ag) { return ag.providerId === p.id && (!service || ag.services.indexOf(service) >= 0); })
          .map(function (ag) { return Object.assign({}, ag, { stats: agentStats(ag) }); });
      });
    },
    setAgentActive: function (agentId, active) {
      return E.mutate(function () {
        var a = E.actor();
        if (['provider_admin', 'provider_supervisor'].indexOf(a.role) < 0) throw new Err('errors.forbidden');
        var ag = E.agentById(agentId);
        if (!ag || ag.providerId !== a.providerId) throw new Err('errors.forbidden');
        ag.active = !!active;
        var u = E.userById(ag.userId);
        if (u) u.active = !!active;
        E.audit('provider.agent_' + (active ? 'activated' : 'deactivated'), 'agent', ag.id, ag.name, null, null, null, a);
        return ag;
      });
    },

    // ---- admin
    list: function () {
      return E.run(function () {
        E.requireRole(['platform_admin', 'platform_qa']);
        return E.db().providers.filter(function (p) { return p.verification.status === 'verified'; }).map(withScore);
      });
    },
    get: function (id) {
      return E.run(function () {
        E.requireRole(['platform_admin', 'platform_qa']);
        var db = E.db(), p = E.providerById(id);
        if (!p) throw new Err('errors.notFound');
        var out = withScore(p);
        out.agents = db.agents.filter(function (a) { return a.providerId === id; }).map(function (a) { return Object.assign({}, a, { stats: agentStats(a) }); });
        out.users = db.users.filter(function (u) { return u.providerId === id; });
        out.ratings = db.ratings.filter(function (r) { return r.providerId === id; }).sort(function (a, b) { return b.createdAt - a.createdAt; })
          .map(function (r) { return Object.assign({}, r, { entityName: E.entityById(r.entityId).name }); });
        out.audit = db.audit.filter(function (x) { return x.targetType === 'provider' && x.targetId === id; }).slice(-20).reverse();
        return out;
      });
    },
    applications: function () {
      return E.run(function () {
        E.requireRole(['platform_admin']);
        return E.db().providers.filter(function (p) { return p.verification.status !== 'verified'; })
          .sort(function (a, b) { return (b.verification.submittedAt || 0) - (a.verification.submittedAt || 0); });
      });
    },
    verify: function (id) {
      return E.mutate(function (db) {
        var a = E.requireRole(['platform_admin']);
        var p = E.providerById(id);
        if (!p) throw new Err('errors.notFound');
        if (p.kind === 'freelancer' && !(p.verification.idVerified && p.verification.certified)) throw new Err('errors.freelancerChecks');
        if (p.verification.documents.some(function (d) { return d.status === 'missing'; })) throw new Err('errors.documentsMissing');
        var before = p.verification.status;
        p.verification.status = 'verified';
        p.verification.verifiedAt = E.now();
        p.verification.documents.forEach(function (d) { d.status = 'verified'; });
        p.enforcement = { level: 'none', source: 'auto', since: E.now() };
        // Give the new provider a login so it can be used straight away.
        if (!db.users.some(function (u) { return u.providerId === p.id; })) {
          var name = p.contactName || p.name;
          var uid = 'u_' + p.id;
          if (p.kind === 'freelancer') {
            var agentId = 'ag_' + p.id;
            db.users.push({ id: uid, name: name, role: 'freelancer', providerId: p.id, agentId: agentId, active: true, email: 'contact@' + p.id + '.example', createdAt: E.now() });
            db.agents.push({ id: agentId, providerId: p.id, userId: uid, name: name, governorates: p.governorates.slice(), services: p.services.slice(), active: true });
          } else {
            db.users.push({ id: uid, name: name, role: 'provider_admin', providerId: p.id, active: true, email: 'contact@' + p.id + '.example', createdAt: E.now() });
          }
        }
        E.audit('provider.verify', 'provider', p.id, p.name, { status: before }, { status: 'verified' }, null, a);
        E.notify(D.providerUsers(db, p.id), 'notif.provider_verified', {}, 'provider:dashboard');
        return p;
      });
    },
    reject: function (id, reason) {
      return E.mutate(function () {
        var a = E.requireRole(['platform_admin']);
        if (!reason) throw new Err('wf.err.reasonRequired');
        var p = E.providerById(id);
        var before = p.verification.status;
        p.verification.status = 'rejected';
        p.verification.notes.push({ at: E.now(), by: a.name, text: reason, kind: 'rejected' });
        E.audit('provider.reject', 'provider', p.id, p.name, { status: before }, { status: 'rejected' }, reason, a);
        return p;
      });
    },
    requestInfo: function (id, note) {
      return E.mutate(function () {
        var a = E.requireRole(['platform_admin']);
        if (!note) throw new Err('wf.err.reasonRequired');
        var p = E.providerById(id);
        var before = p.verification.status;
        p.verification.status = 'info_requested';
        p.verification.notes.push({ at: E.now(), by: a.name, text: note, kind: 'info_requested' });
        E.audit('provider.request_info', 'provider', p.id, p.name, { status: before }, { status: 'info_requested' }, note, a);
        return p;
      });
    },
    setCheck: function (id, field, value) {
      return E.mutate(function () {
        var a = E.requireRole(['platform_admin']);
        if (['idVerified', 'certified'].indexOf(field) < 0) throw new Err('errors.forbidden');
        var p = E.providerById(id);
        p.verification[field] = !!value;
        E.audit('provider.check_' + field, 'provider', p.id, p.name, null, { value: !!value }, null, a);
        return p;
      });
    },
    enforce: function (id, level, reason) {
      return E.mutate(function (db) {
        var a = E.requireRole(['platform_admin']);
        if (['none', 'warned', 'reduced', 'suspended'].indexOf(level) < 0) throw new Err('errors.forbidden');
        if (!reason) throw new Err('wf.err.reasonRequired');
        var p = E.providerById(id);
        var before = p.enforcement.level;
        p.enforcement = { level: level, source: 'manual', since: E.now(), reason: reason, by: a.name };
        E.audit('provider.enforcement_manual', 'provider', p.id, p.name, { level: before }, { level: level }, reason, a);
        E.notify(D.providerUsers(db, p.id, ['provider_admin', 'freelancer']), 'notif.enforcement_changed', { level: level }, 'provider:dashboard');
        return p;
      });
    },
    setAutomatic: function (id) {
      return E.mutate(function () {
        var a = E.requireRole(['platform_admin']);
        var p = E.providerById(id);
        var before = p.enforcement.level;
        p.enforcement = { level: before, source: 'auto', since: E.now() };
        E.audit('provider.enforcement_auto_on', 'provider', p.id, p.name, null, null, null, a);
        return p;
      });
    }
  };

  // ---------------------------------------------------------------- entities
  function entityStats(e) {
    var db = E.db();
    var cases = db.cases.filter(function (c) { return c.entityId === e.id; });
    var invoices = db.invoices.filter(function (i) { return i.entityId === e.id; });
    var cr = db.clientRatings.filter(function (r) { return r.entityId === e.id; });
    return Object.assign({}, e, {
      users: db.users.filter(function (u) { return u.entityId === e.id; }),
      volume: cases.length,
      open: cases.filter(function (c) { return !wf.isTerminal(c.status); }).length,
      spend: U.sum(invoices, function (i) { return U.sum(i.lines, function (l) { return l.amount * (l.adjustment == null ? 1 : l.adjustment); }); }),
      clientRating: {
        count: cr.length,
        dataQuality: cr.length ? U.round(U.avg(cr, function (r) { return r.dataQuality; }), 1) : null,
        paymentTimeliness: cr.length ? U.round(U.avg(cr, function (r) { return r.paymentTimeliness; }), 1) : null
      },
      clientRatings: cr.map(function (r) { return Object.assign({}, r, { providerName: E.providerById(r.providerId).name }); })
    });
  }

  function myEntityAdmin() {
    var a = E.actor();
    if (a.role !== 'entity_admin') throw new Err('errors.forbidden');
    return a;
  }

  S.entities = {
    list: function () { return E.run(function () { E.requireRole(['platform_admin']); return E.db().entities.map(entityStats); }); },
    mine: function () {
      return E.run(function () {
        var a = E.actor();
        if (!a.entityId) throw new Err('errors.forbidden');
        return entityStats(E.entityById(a.entityId));
      });
    },
    users: function (entityId) {
      return E.run(function () {
        var a = E.actor();
        var id = entityId || a.entityId;
        if (a.role !== 'platform_admin' && a.entityId !== id) throw new Err('errors.forbidden');
        return E.db().users.filter(function (u) { return u.entityId === id; });
      });
    },
    invite: function (v) {
      return E.mutate(function (db) {
        var a = myEntityAdmin();
        if (!v.name || !v.email) throw new Err('errors.required');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) throw new Err('errors.emailFormat');
        if (wf.ENTITY_ROLES.indexOf(v.role) < 0) throw new Err('errors.forbidden');
        if (db.users.some(function (u) { return u.email === v.email; })) throw new Err('errors.emailTaken');
        var u = { id: U.uid('u'), name: v.name, email: v.email, role: v.role, entityId: a.entityId, active: true, invited: true, createdAt: E.now() };
        db.users.push(u);
        E.audit('entity.user_invited', 'user', u.id, u.name, null, { role: u.role }, null, a);
        return u;
      });
    },
    setRole: function (userId, role) {
      return E.mutate(function (db) {
        var a = myEntityAdmin();
        var u = E.userById(userId);
        if (!u || u.entityId !== a.entityId) throw new Err('errors.forbidden');
        if (wf.ENTITY_ROLES.indexOf(role) < 0) throw new Err('errors.forbidden');
        if (u.role === 'entity_admin' && role !== 'entity_admin' && db.users.filter(function (x) { return x.entityId === a.entityId && x.role === 'entity_admin' && x.active !== false; }).length < 2) throw new Err('errors.lastAdmin');
        var before = u.role;
        u.role = role;
        E.audit('entity.user_role', 'user', u.id, u.name, { role: before }, { role: role }, null, a);
        return u;
      });
    },
    setActive: function (userId, active) {
      return E.mutate(function () {
        var a = myEntityAdmin();
        var u = E.userById(userId);
        if (!u || u.entityId !== a.entityId) throw new Err('errors.forbidden');
        if (u.id === a.userId) throw new Err('errors.cannotDeactivateSelf');
        u.active = !!active;
        E.audit('entity.user_' + (active ? 'activated' : 'deactivated'), 'user', u.id, u.name, null, null, null, a);
        return u;
      });
    },
    publicProfile: function (entityId) {
      return E.run(function () {
        E.actor();
        var e = E.entityById(entityId);
        return { id: e.id, name: e.name, type: e.type, clientRating: S.cases._clientRatingOf(e.id) };
      });
    }
  };
})();
