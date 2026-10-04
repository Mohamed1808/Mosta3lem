/* Domain helpers shared by the seed and the mock services. They read a db document
   passed in explicitly, so they stay testable and never reach for global state. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var U = ICM.util, wf = ICM.wf;

  var domain = {};

  domain.gov = function (db, id) {
    return (db.config.lists.governorates || []).filter(function (g) { return g.id === id; })[0] || null;
  };
  domain.zoneOf = function (db, govId) {
    var g = domain.gov(db, govId);
    return g ? g.zone : 'greater_cairo';
  };

  /** Primary governorate of a case, used for coverage, capacity and grouping. */
  domain.caseGov = function (c) {
    if (c.governorate) return c.governorate;
    var a = c.addresses || {};
    return (a.home && a.home.governorate) || (a.work && a.work.governorate) || (a.business && a.business.governorate) || null;
  };

  /** City id of a case's primary address, or null when its city is not on the governorate's list. */
  domain.caseCity = function (c) {
    var gov = domain.caseGov(c);
    if (c.city) return ICM.config.cityIdOf(gov, c.city) || null;
    var a = c.addresses || {};
    var x = [a.home, a.work, a.business].filter(function (k) { return k && k.governorate === gov; })[0];
    return x ? ICM.config.cityIdOf(gov, x.city) : null;
  };

  /** Where a case is: { gov, city }. */
  domain.casePlace = function (c) { return { gov: domain.caseGov(c), city: domain.caseCity(c) }; };

  /** Price of an investigation for a provider: sum of its inquiry type prices in the case's zone. */
  domain.investigationPrice = function (db, provider, inquiryTypes, govId) {
    var zone = domain.zoneOf(db, govId);
    var p = (provider.pricing && provider.pricing.investigation) || {};
    return U.sum(inquiryTypes || [], function (t) { return (p[t] && p[t][zone]) || 0; });
  };

  domain.collectionTerms = function (provider, bucket) {
    var p = (provider.pricing && provider.pricing.collection) || {};
    return { feePct: (p.feePct || {})[bucket] || 0, fixedFee: p.fixedFee || 0 };
  };

  domain.priceFor = function (db, provider, c) {
    if (c.service === 'investigation') return domain.investigationPrice(db, provider, c.inquiryTypes, domain.caseGov(c));
    return domain.collectionTerms(provider, c.bucket);
  };

  /** Amount billed for a closed case (before any dispute adjustment). */
  domain.billableAmount = function (c) {
    if (c.service === 'investigation') return +c.price || 0;
    var terms = c.price || {};
    return U.round(wf.collection.recovered(c) * (terms.feePct || 0) / 100 + (terms.fixedFee || 0), 0);
  };

  /** Open cases per governorate for a provider (offers pending count against capacity). */
  domain.providerLoad = function (db, providerId, service) {
    var load = {};
    db.cases.forEach(function (c) {
      if (c.providerId !== providerId || wf.isTerminal(c.status)) return;
      if (service && c.service !== service) return;
      if (c.status === 'draft' || c.status === 'submitted') return;
      var g = domain.caseGov(c);
      load[g] = (load[g] || 0) + 1;
    });
    return load;
  };

  domain.agentLoad = function (db, agentId) {
    return db.cases.filter(function (c) {
      return c.agentId === agentId && !wf.isTerminal(c.status) && ['delivered', 'accepted_by_entity'].indexOf(c.status) < 0;
    }).length;
  };

  domain.nextRef = function (db, kind) {
    db.counters = db.counters || {};
    db.counters[kind] = (db.counters[kind] || 0) + 1;
    var prefix = { investigation: 'INV', collection: 'COL', batch: 'BAT', invoice: 'INVC', dispute: 'DSP', registration: 'REG' }[kind] || 'REF';
    return prefix + '-' + new Date().getFullYear() + '-' + String(db.counters[kind]).padStart(5, '0');
  };

  /**
   * Simulated address coordinates: the governorate centre plus a random offset (< ~3 km).
   * source 'approx' means nobody confirmed where the address really is (a geocoding service
   * would set 'geocoded'), so a real check-in is not measured against it.
   */
  domain.randomGeo = function (db, govId, rnd) {
    var g = domain.gov(db, govId) || { lat: 30.04, lng: 31.23 };
    var r = rnd || Math.random;
    return { lat: U.round(g.lat + (r() - 0.5) * 0.05, 6), lng: U.round(g.lng + (r() - 0.5) * 0.05, 6), source: 'approx' };
  };

  /** Further than this from the governorate's centre, a check-in is flagged as outside the case area. */
  domain.OUTSIDE_AREA_M = 60000;

  /**
   * A check-in from the phone's real location. The distance to the address is measured only
   * when the address location is confirmed (geocoded); otherwise the position and accuracy
   * are kept for the reviewer and a check-in far from the case's governorate is flagged.
   * fix: { lat, lng, accuracyM, at }
   */
  domain.checkInFrom = function (db, c, fix, now) {
    var lat = +fix.lat, lng = +fix.lng;
    var g = domain.gov(db, domain.caseGov(c));
    var geo = c.geo || null;
    var confirmed = !!(geo && geo.source === 'geocoded');
    return {
      at: now, lat: U.round(lat, 6), lng: U.round(lng, 6), source: 'device',
      accuracyM: fix.accuracyM == null ? null : Math.round(+fix.accuracyM),
      distanceM: confirmed ? U.distanceM(geo.lat, geo.lng, lat, lng) : null,
      addressApprox: !confirmed,
      outsideArea: !confirmed && !!g && g.lat != null && U.distanceM(g.lat, g.lng, lat, lng) > domain.OUTSIDE_AREA_M
    };
  };

  /** Whether a location fix is usable: real numbers within the world's bounds. */
  domain.validFix = function (fix) {
    return !!fix && isFinite(+fix.lat) && isFinite(+fix.lng) && +fix.lat >= -90 && +fix.lat <= 90 && +fix.lng >= -180 && +fix.lng <= 180;
  };

  /** Simulated GPS fix near the case address. Usually within 250 m, sometimes further. */
  domain.simulateCheckIn = function (c, now, rnd) {
    var r = rnd || Math.random;
    var geo = c.geo || { lat: 30.04, lng: 31.23 };
    var far = r() < 0.08;
    var meters = far ? 350 + r() * 400 : 15 + r() * 220;
    var angle = r() * Math.PI * 2;
    var dLat = (meters * Math.cos(angle)) / 111320;
    var dLng = (meters * Math.sin(angle)) / (111320 * Math.cos(geo.lat * Math.PI / 180));
    var lat = U.round(geo.lat + dLat, 6), lng = U.round(geo.lng + dLng, 6);
    // GPS accuracy radius in metres; simulated from the same draw so the sequence is unchanged.
    return { at: now, lat: lat, lng: lng, distanceM: U.distanceM(geo.lat, geo.lng, lat, lng), accuracyM: Math.round(4 + (meters * 7) % 16), source: 'simulated' };
  };

  domain.providerUsers = function (db, providerId, roles) {
    return db.users.filter(function (u) {
      return u.active !== false && u.providerId === providerId && (!roles || roles.indexOf(u.role) >= 0);
    });
  };
  domain.entityUsersFor = function (db, c) {
    return db.users.filter(function (u) {
      return u.active !== false && u.entityId === c.entityId && wf.entityServes(u.role, c.service);
    });
  };
  domain.platformUsers = function (db, role) {
    return db.users.filter(function (u) { return u.active !== false && u.role === role; });
  };
  domain.agentUser = function (db, agentId) {
    var a = db.agents.filter(function (x) { return x.id === agentId; })[0];
    return a ? db.users.filter(function (u) { return u.id === a.userId; })[0] : null;
  };

  /** Supervisor (user id) an agent reports to, or null. */
  domain.agentSupervisor = function (db, agentId) {
    var a = db.agents.filter(function (x) { return x.id === agentId; })[0];
    return a ? a.supervisorId || null : null;
  };

  /**
   * Team scope of a company supervisor: their own agents. Owners and everyone else see the
   * whole company. An agent nobody supervises stays visible to every supervisor.
   */
  domain.agentInScope = function (actor, agent) {
    if (!agent || !actor || actor.role !== 'provider_supervisor') return true;
    return !agent.supervisorId || agent.supervisorId === actor.userId;
  };
  domain.caseInTeamScope = function (db, actor, c) {
    if (!actor || actor.role !== 'provider_supervisor' || !c.agentId) return true;
    return domain.agentInScope(actor, db.agents.filter(function (x) { return x.id === c.agentId; })[0]);
  };

  /**
   * Whose money a provider user may see, following the team structure:
   *   owner (provider_admin) and individual provider: the whole provider ({ all: true })
   *   supervisor: the cases of the agents they supervise ({ agentIds })
   *   field agent: no money at all ({ none: true }); they see their completed work only
   */
  domain.moneyScope = function (db, actor) {
    if (!actor || !actor.providerId) return { none: true };
    if (actor.role === 'provider_admin' || actor.role === 'freelancer') return { all: true };
    if (actor.role === 'provider_supervisor') {
      return { agentIds: db.agents.filter(function (a) { return a.providerId === actor.providerId && a.supervisorId === actor.userId; }).map(function (a) { return a.id; }) };
    }
    return { none: true };
  };
  /** Whether a case's money falls inside a scope from moneyScope. */
  domain.caseInMoneyScope = function (scope, c) {
    if (!scope || scope.none) return false;
    if (scope.all) return true;
    return !!c && !!c.agentId && scope.agentIds.indexOf(c.agentId) >= 0;
  };

  /** Recipients for a submitted company report: the agent's supervisor, else every supervisor, plus the owners. */
  domain.companyReviewers = function (db, c) {
    var sup = c.agentId ? domain.agentSupervisor(db, c.agentId) : null;
    var owners = domain.providerUsers(db, c.providerId, ['provider_admin']);
    var sups = domain.providerUsers(db, c.providerId, ['provider_supervisor']).filter(function (u) { return !sup || u.id === sup; });
    if (sup && !sups.length) sups = domain.providerUsers(db, c.providerId, ['provider_supervisor']);
    return sups.concat(owners);
  };

  domain.actorOf = function (user) {
    if (!user) return null;
    return { userId: user.id, name: user.name, role: user.role, entityId: user.entityId, providerId: user.providerId, agentId: user.agentId };
  };

  domain.minPhotos = function (db, c) {
    return wf.investigation.minPhotos(c, { inquiryTypes: db.config.lists.inquiryTypes });
  };

  ICM.domain = domain;
})();
