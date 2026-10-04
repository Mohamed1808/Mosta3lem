/* Mock services: cases, marketplace (provider selection) and offers.
   Masking is enforced here: every case leaving this layer for a provider user has been
   passed through wf.masking.maskCase(). */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain, C = ICM.config;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;
  var H = U.HOUR;

  // ---------------------------------------------------------------- helpers
  function providerSummary(p, service) {
    if (!p) return null;
    var sc = E.db().scores[p.id];
    var ss = sc && sc.byService[service];
    return {
      id: p.id, name: p.name, kind: p.kind, city: p.city,
      score: ss ? ss.score : null, avgRating: ss ? ss.avgRating : null, ratingCount: ss ? ss.ratingCount : 0,
      isNew: ss ? ss.isNew : true, enforcement: p.enforcement ? p.enforcement.level : 'none', verified: p.verification.status === 'verified'
    };
  }

  function clientRatingOf(entityId) {
    var rs = E.db().clientRatings.filter(function (r) { return r.entityId === entityId; });
    return {
      count: rs.length,
      dataQuality: rs.length ? U.round(U.avg(rs, function (r) { return r.dataQuality; }), 1) : null,
      paymentTimeliness: rs.length ? U.round(U.avg(rs, function (r) { return r.paymentTimeliness; }), 1) : null
    };
  }

  /** Masked copy plus display fields. Returns null when the viewer has no access. */
  function decorate(c, viewer, now) {
    var m = wf.masking.maskCase(c, viewer, now);
    if (!m) return null;
    var prov = c.providerId ? E.providerById(c.providerId) : null;
    var agent = c.agentId ? E.agentById(c.agentId) : null;
    var ent = E.entityById(c.entityId);
    var batch = c.batchId ? E.batchById(c.batchId) : null;
    // Field agents see no money: not what the bank pays for the case, nor billing adjustments.
    if (viewer && viewer.role === 'agent') { m.price = null; m.billingAdjustment = null; }
    m.sla = wf.sla.state(c, now);
    m.place = D.casePlace(c);   // { gov, city }: the area only, never the street, so it is safe before acceptance
    m.slaRemaining = c.dueAt ? c.dueAt - now : null;
    m.slaRatio = wf.sla.elapsedRatio(c, now);
    m.providerName = prov ? prov.name : null;
    m.providerKind = prov ? prov.kind : null;
    m.agentName = agent ? agent.name : null;
    m.entityName = ent ? ent.name : null;
    m.batchRef = batch ? batch.ref : null;
    m.batchName = batch ? batch.name : null;
    if (c.service === 'collection') {
      m.recovered = wf.collection.recovered(c);
      m.outstanding = m.masked ? null : wf.collection.outstanding(c);
      m.target = m.masked ? null : wf.collection.target(c);
    } else {
      m.minPhotos = D.minPhotos(E.db(), c);
    }
    return m;
  }

  function visibleCases(viewer) {
    var now = E.now();
    return E.db().cases.map(function (c) { return decorate(c, viewer, now); }).filter(Boolean);
  }

  function matches(c, f) {
    if (f.service && c.service !== f.service) return false;
    if (f.status && f.status.length) {
      var st = [].concat(f.status);
      if (st.indexOf(c.status) < 0) return false;
    }
    if (f.scope === 'open' && wf.isTerminal(c.status)) return false;
    if (f.scope === 'closed' && !wf.isTerminal(c.status)) return false;
    if (f.providerId && c.providerId !== f.providerId) return false;
    if (f.entityId && c.entityId !== f.entityId) return false;
    if (f.agentId && c.agentId !== f.agentId) return false;
    if (f.governorate && D.caseGov(c) !== f.governorate) return false;
    if (f.batchId && c.batchId !== f.batchId) return false;
    if (f.sla && c.sla !== f.sla) return false;
    if (f.from && c.createdAt < f.from) return false;
    if (f.to && c.createdAt > f.to) return false;
    if (f.disputed && !c.disputed) return false;
    if (f.q) {
      var q = String(f.q).toLowerCase();
      var hay = [c.ref, c.customer && c.customer.name, c.customer && c.customer.nationalId, c.contractNumber, c.internalRef].filter(Boolean).join(' ').toLowerCase();
      if (hay.indexOf(q) < 0) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- form mapping
  function addr(v) {
    if (!v || !v.governorate) return null;
    return { governorate: v.governorate, city: v.city || '', street: v.street || '', landmark: v.landmark || '' };
  }

  function formToCase(service, v) {
    var out = { formValues: U.clone(v) };
    if (service === 'investigation') {
      out.customer = { name: String(v.fullName).trim(), nationalId: String(v.nationalId).trim(), mobiles: [String(v.mobile).trim()] };
      out.inquiryTypes = U.asArray(v.inquiryTypes);
      out.addresses = {};
      ['home', 'work', 'business'].forEach(function (k) { var a = addr(v[k]); if (a) out.addresses[k] = a; });
      out.employerName = out.inquiryTypes.indexOf('employment') >= 0 ? v.employerName || null : null;
      out.businessName = out.inquiryTypes.indexOf('business') >= 0 ? v.businessName || null : null;
      out.guarantor = out.inquiryTypes.indexOf('guarantor') >= 0 ? { name: v.guarantorName, nationalId: v.guarantorNationalId || null, mobile: v.guarantorMobile, relationship: v.guarantorRelationship || null } : null;
      out.instructions = v.instructions || '';
      out.deadline = U.fromLocalInput(v.deadline);
      out.internalRef = v.internalRef || null;
      out.accountNumber = v.accountNumber ? String(v.accountNumber).trim() : null;
      out.customer.telephone = v.telephone ? String(v.telephone).replace(/[\s\-]/g, '') : null;
      out.orderNumber = out.inquiryTypes.indexOf('business') >= 0 && v.orderNumber ? String(v.orderNumber).trim() : null;
      out.businessPhone = out.inquiryTypes.indexOf('business') >= 0 && v.businessPhone ? String(v.businessPhone).replace(/[\s\-]/g, '') : null;
      out.governorate = (out.addresses.home || out.addresses.work || out.addresses.business || {}).governorate;
    } else {
      out.customer = { name: String(v.fullName).trim(), nationalId: String(v.nationalId).trim(), mobiles: U.asArray(v.mobiles).map(function (m) { return String(m).trim(); }).filter(Boolean) };
      out.addresses = {};
      ['home', 'work'].forEach(function (k) { var a = addr(v[k]); if (a) out.addresses[k] = a; });
      out.contractNumber = v.contractNumber;
      out.productType = v.productType;
      out.originalAmount = +v.originalAmount;
      out.overdueAmount = +v.overdueAmount;
      out.instalmentAmount = +v.instalmentAmount;
      out.dpd = +v.dpd;
      out.bucket = C.bucketFor(+v.dpd);
      out.collateral = (v.collateralMake || v.collateralModel || v.collateralPlate) ? { make: v.collateralMake || '', model: v.collateralModel || '', plate: v.collateralPlate || '', notes: v.collateralNotes || '' } : null;
      var allowed = U.asArray(v.allowedActions);
      out.allowedActions = { calls: allowed.indexOf('calls') >= 0, messages: allowed.indexOf('messages') >= 0, visits: allowed.indexOf('visits') >= 0 };
      out.settlementAuthority = { mode: v.settlementMode || 'none', maxDiscountPct: v.settlementMode === 'discount' ? +v.maxDiscountPct : null };
      out.periodEnd = U.endOfDay(new Date(v.periodEnd).getTime());
      out.internalRef = v.internalRef || null;
      out.governorate = out.addresses.home.governorate;
    }
    return out;
  }

  function validateForm(service, values) {
    var form = service === 'investigation' ? C.FORMS.investigationRequest : C.FORMS.collectionRequest;
    var govs = E.db().config.lists.governorates.map(function (g) { return g.id; });
    var errors = wf.validateForm(form, values, { now: E.now(), governorates: govs });
    if (Object.keys(errors).length) throw new Err('errors.formInvalid', { errors: errors });
  }

  function blankCase(service, actor, now) {
    var c = {
      id: U.uid('case'), ref: D.nextRef(E.db(), service), service: service, entityId: actor.entityId, createdBy: actor.userId,
      createdAt: now, updatedAt: now, batchId: null, status: 'draft', providerId: null, offerId: null, agentId: null,
      declinedProviderIds: [], expiredProviderIds: [], timeline: [], slaFlags: {}, reworkCount: 0, returnCount: 0,
      disputed: false, ratingId: null, price: null
    };
    if (service === 'investigation') { c.photos = []; c.report = {}; c.checkIn = null; }
    else { c.actions = []; c.promises = []; c.payments = []; c.settlements = []; c.settledTarget = null; }
    return c;
  }

  function requireEntity(service) {
    var a = E.actor();
    if (!wf.isEntityRole(a.role)) throw new Err('errors.forbidden');
    if (service && !wf.entityServes(a.role, service)) throw new Err('errors.forbiddenService');
    return a;
  }

  // ---------------------------------------------------------------- marketplace
  /** Eligible providers for a demand of cases, ranked. demand: { governorate: count }. */
  function eligible(q) {
    var db = E.db(), now = E.now();
    var service = q.service;
    var govs = Object.keys(q.demand || {});
    var c = q.caseId ? E.caseById(q.caseId) : null;
    var declined = c ? c.declinedProviderIds || [] : [];
    var buckets = U.uniq([].concat(q.buckets || (q.bucket ? [q.bucket] : [])));
    // Where the cases are, down to the city: { gov, city }. A provider must cover every place.
    var places = q.places || (c ? [D.casePlace(c)] : []);
    var excluded = { full: 0, suspended: 0, documents: 0 };
    var out = [];
    db.providers.forEach(function (p) {
      if (!p.verification || p.verification.status !== 'verified') return;
      if (p.services.indexOf(service) < 0) return;
      if (!govs.every(function (g) { return p.governorates.indexOf(g) >= 0 && (p.capacity[g] || 0) > 0; })) return;
      var cov = wf.coverageOf(p);
      if (!places.every(function (pl) { return wf.coversPlace(cov, pl.gov, pl.city); })) return;
      if (declined.indexOf(p.id) >= 0) return;
      if (p.enforcement && p.enforcement.level === 'suspended') { excluded.suspended++; return; }
      // An expired commercial register or tax card pauses new offers until the renewal is checked.
      if (wf.expiredDocs(p, now).length) { excluded.documents++; return; }
      var load = D.providerLoad(db, p.id);
      // Cases already in this offer's demand count as load if they are pending with this provider (reselect).
      var order = ['none', 'full', 'low', 'medium', 'high'];
      var worst = 'high', spareMin = Infinity, fits = true;
      govs.forEach(function (g) {
        var cap = p.capacity[g] || 0, l = load[g] || 0;
        var a = wf.scoring.availability(cap, l);
        if (order.indexOf(a) < order.indexOf(worst)) worst = a;
        spareMin = Math.min(spareMin, cap - l);
        if (cap - l < q.demand[g]) fits = false;
      });
      if (!fits || worst === 'full' || worst === 'none') { excluded.full++; return; }
      var sc = db.scores[p.id] && db.scores[p.id].byService[service];
      var card = {
        id: p.id, name: p.name, kind: p.kind, city: p.city, verified: true,
        enforcement: p.enforcement ? p.enforcement.level : 'none',
        score: sc ? sc.score : null, avgRating: sc ? sc.avgRating : null, ratingCount: sc ? sc.ratingCount : 0,
        isNew: sc ? sc.isNew : true, criteria: sc ? sc.criteria : {},
        metrics: sc ? sc.metrics : {},
        availability: worst, spare: spareMin
      };
      if (service === 'investigation') {
        var types = q.inquiryTypes || ['residence'];
        var total = 0;
        govs.forEach(function (g) { total += D.investigationPrice(db, p, types, g) * q.demand[g]; });
        var count = U.sum(govs, function (g) { return q.demand[g]; });
        card.price = count ? Math.round(total / count) : 0;
        card.totalPrice = total;
        card.slaHours = Math.max.apply(null, types.map(function (t) { return (p.sla.investigation || {})[t] || 72; }));
      } else {
        var fees = buckets.map(function (b) { return D.collectionTerms(p, b).feePct; });
        card.feePct = fees.length ? Math.max.apply(null, fees) : 0;
        card.feePctMin = fees.length ? Math.min.apply(null, fees) : 0;
        card.fixedFee = (p.pricing.collection || {}).fixedFee || 0;
        card.price = card.feePct;
        card.slaHours = p.sla.collectionFirstContactHours || 48;
      }
      card.rank = wf.scoring.rankingScore(card.score, worst, card.enforcement);
      out.push(card);
    });
    out.sort(function (a, b) { return b.rank - a.rank; });
    return { providers: out, excluded: excluded, now: now };
  }

  S.marketplace = {
    eligible: function (q) {
      return E.run(function () { E.actor(); return eligible(q); });
    },
    profile: function (providerId, service) {
      return E.run(function () {
        E.actor();
        var db = E.db(), p = E.providerById(providerId);
        if (!p) throw new Err('errors.notFound');
        var sc = db.scores[p.id] || null;
        var svc = service || p.services[0];
        var ratings = db.ratings.filter(function (r) { return r.providerId === p.id && r.service === svc && r.status !== 'removed' && !r.hidden; })
          .sort(function (a, b) { return b.createdAt - a.createdAt; });
        var dist = [0, 0, 0, 0, 0];
        ratings.forEach(function (r) { dist[r.overall - 1]++; });
        return {
          id: p.id, name: p.name, kind: p.kind, city: p.city, description: p.description, joinedAt: p.joinedAt,
          services: p.services, governorates: p.governorates, capacity: p.capacity, sla: p.sla, pricing: p.pricing,
          verified: p.verification.status === 'verified', enforcement: p.enforcement.level,
          score: sc, service: svc, distribution: dist,
          // Anonymised: never include which entity wrote a review.
          feedback: ratings.slice(0, 12).map(function (r) {
            return { id: r.id, overall: r.overall, criteria: r.criteria, feedback: r.feedback, tags: r.tags, createdAt: r.createdAt, reply: r.reply ? { text: r.reply.text, at: r.reply.at } : null };
          })
        };
      });
    },
    _eligible: eligible
  };

  // ---------------------------------------------------------------- offers
  function createOffer(provider, cases, batchId, groupKey) {
    var db = E.db(), now = E.now();
    var o = {
      id: U.uid('off'), providerId: provider.id, entityId: cases[0].entityId, service: cases[0].service,
      caseIds: cases.map(function (c) { return c.id; }), batchId: batchId || null, groupKey: groupKey || null,
      sentAt: now, expiresAt: now + db.config.pricing.offerWindowHours * H, status: 'pending',
      respondedAt: null, respondedBy: null, declineReason: null, declineNote: null, warned: false
    };
    db.offers.push(o);
    E.audit('offer.sent', 'offer', o.id, provider.name, null, { cases: o.caseIds.length, expiresAt: o.expiresAt }, null);
    return o;
  }

  function offerRef(o) {
    if (o.batchId) { var b = E.batchById(o.batchId); if (b) return b.ref; }
    var c = E.caseById(o.caseIds[0]);
    return c ? c.ref : '';
  }

  function pendingOfferFor(actor, offerId) {
    var o = E.offerById(offerId);
    if (!o) throw new Err('errors.notFound');
    if (wf.PROVIDER_MANAGER_ROLES.indexOf(actor.role) < 0) throw new Err('errors.forbidden');
    if (o.providerId !== actor.providerId) throw new Err('errors.forbidden');
    if (o.status !== 'pending') throw new Err('errors.offerNotPending');
    if (E.now() >= o.expiresAt) throw new Err('errors.offerExpired');
    return o;
  }

  S.offers = {
    inbox: function (service) {
      return E.run(function () {
        var a = E.actor();
        if (!a.providerId) throw new Err('errors.forbidden');
        var now = E.now();
        var list = E.db().offers.filter(function (o) { return o.providerId === a.providerId && (!service || o.service === service); });
        list.sort(function (x, y) {
          if ((x.status === 'pending') !== (y.status === 'pending')) return x.status === 'pending' ? -1 : 1;
          return x.status === 'pending' ? x.expiresAt - y.expiresAt : (y.respondedAt || y.sentAt) - (x.respondedAt || x.sentAt);
        });
        return list.slice(0, 40).map(function (o) {
          var cases = o.caseIds.map(function (id) {
            var c = E.caseById(id);
            // The offer view is always the masked view until the offer is accepted.
            return c ? decorate(Object.assign({}, c, o.status === 'pending' ? { acceptedAt: null } : {}), a, now) || wf.masking.maskCase(Object.assign({}, c, { providerId: a.providerId, acceptedAt: null, status: 'awaiting_acceptance' }), a, now) : null;
          }).filter(Boolean);
          var ent = E.entityById(o.entityId);
          var batch = o.batchId ? E.batchById(o.batchId) : null;
          return Object.assign({}, o, {
            ref: offerRef(o), remaining: o.expiresAt - now, cases: cases,
            entity: { id: ent.id, name: ent.name, type: ent.type, clientRating: clientRatingOf(ent.id) },
            batch: batch ? { id: batch.id, ref: batch.ref, name: batch.name } : null,
            govs: U.uniq(cases.map(function (c) { return D.caseGov(c); })),
            total: U.sum(cases, function (c) { return typeof c.price === 'number' ? c.price : 0; })
          });
        });
      });
    },
    accept: function (offerId) {
      return E.mutate(function () {
        var a = E.actor();
        var o = pendingOfferFor(a, offerId);
        var p = E.providerById(o.providerId);
        if (p.enforcement && p.enforcement.level === 'suspended') throw new Err('errors.providerSuspended');
        var first = null;
        o.caseIds.forEach(function (id) {
          var c = E.caseById(id);
          if (!c || c.status !== 'awaiting_acceptance' || c.offerId !== o.id) return;
          c = E.transition(c, 'accept', {}, a, { silent: true });
          E.autoAssignFreelancer(c, a);
          first = first || c;
        });
        o.status = 'accepted'; o.respondedAt = E.now(); o.respondedBy = a.userId;
        E.audit('offer.accept', 'offer', o.id, offerRef(o), { status: 'pending' }, { status: 'accepted' }, null);
        if (first) E.notify(E.entityUsers(first), 'notif.offer_accepted', { ref: offerRef(o), provider: p.name }, o.batchId ? 'batch:' + o.batchId : 'case:' + first.id);
        return o;
      });
    },
    decline: function (offerId, reason, note) {
      return E.mutate(function () {
        var a = E.actor();
        var o = pendingOfferFor(a, offerId);
        if (!reason) throw new Err('wf.err.reasonRequired');
        var p = E.providerById(o.providerId);
        var first = null;
        o.caseIds.forEach(function (id) {
          var c = E.caseById(id);
          if (!c || c.status !== 'awaiting_acceptance' || c.offerId !== o.id) return;
          first = first || c;
          E.transition(c, 'decline', { reason: reason, note: note }, a, { silent: true });
        });
        o.status = 'declined'; o.respondedAt = E.now(); o.respondedBy = a.userId; o.declineReason = reason; o.declineNote = note || null;
        E.audit('offer.decline', 'offer', o.id, offerRef(o), { status: 'pending' }, { status: 'declined' }, reason);
        if (first) E.notify(E.entityUsers(first), 'notif.offer_declined', { ref: offerRef(o), provider: p.name }, o.batchId ? 'batch:' + o.batchId : 'case:' + first.id);
        return o;
      });
    },
    _create: createOffer
  };

  // ---------------------------------------------------------------- cases
  /**
   * When a field action really happened. Work done without signal is sent later with the
   * phone's time; it is accepted when it is not in the future and not before the case was
   * assigned. Otherwise the time it arrives counts.
   */
  function happenedAt(at, c) {
    var now = E.now();
    at = +at;
    if (!at || !isFinite(at) || at > now + 60 * 1000) return now;
    if (c.assignedAt && at < c.assignedAt) return now;
    return Math.min(at, now);
  }

  function forAgent(c, a) {
    if (!wf.doesFieldWork(a) || c.agentId !== a.agentId) throw new Err('errors.forbidden');
  }

  function detail(c, a) {
    var now = E.now(), db = E.db();
    var m = decorate(c, a, now);
    if (!m) throw new Err('errors.forbidden');
    var M = wf.machineFor(c.service);
    var actions = M.available(c, a, E.ctxFor(c)).filter(function (x) { return x !== 'expire'; });
    var prov = c.providerId ? E.providerById(c.providerId) : null;
    var offer = c.offerId ? E.offerById(c.offerId) : null;
    var rating = c.ratingId ? E.ratingById(c.ratingId) : null;
    var isEntity = wf.isEntityRole(a.role);
    var disputes = db.disputes.filter(function (d) { return d.caseId === c.id; });
    var openCaseDispute = disputes.some(function (d) { return d.kind === 'case' && d.status === 'open'; });
    var clientRated = db.clientRatings.some(function (r) { return r.caseId === c.id; });
    return {
      case: m,
      actions: actions,
      provider: providerSummary(prov, c.service),
      agent: c.agentId ? { id: c.agentId, name: (E.agentById(c.agentId) || {}).name } : null,
      entity: { id: c.entityId, name: E.entityById(c.entityId).name, clientRating: clientRatingOf(c.entityId) },
      batch: c.batchId ? (function (b) { return { id: b.id, ref: b.ref, name: b.name }; })(E.batchById(c.batchId)) : null,
      offer: offer ? { id: offer.id, status: offer.status, sentAt: offer.sentAt, expiresAt: offer.expiresAt, remaining: offer.expiresAt - now } : null,
      disputes: disputes,
      rating: rating && (isEntity || a.role === 'platform_admin' || a.providerId === rating.providerId) ? rating : null,
      canRate: isEntity && c.status === 'closed' && !c.ratingId && !c.batchId && !!c.providerId,
      canDispute: isEntity && !!c.providerId && !!c.acceptedAt && !openCaseDispute && ['cancelled', 'awaiting_acceptance'].indexOf(c.status) < 0,
      canOperate: c.service === 'collection' && !wf.collection.checkOperate(c, a),
      canEditEvidence: c.service === 'investigation' && c.status === 'in_field' && wf.doesFieldWork(a) && c.agentId === a.agentId,
      canRateClient: !!a.providerId && wf.PROVIDER_MANAGER_ROLES.indexOf(a.role) >= 0 && c.providerId === a.providerId && c.status === 'closed' && !clientRated,
      reviewer: c.status === 'submitted_for_review' ? c.reviewerRole : null,
      now: now
    };
  }

  S.cases = {
    list: function (f) {
      return E.run(function () {
        var a = E.actor();
        f = f || {};
        var rows = visibleCases(a).filter(function (c) { return matches(c, f); });
        return rows.sort(function (x, y) { return (y.updatedAt || y.createdAt) - (x.updatedAt || x.createdAt); });
      });
    },
    get: function (id) { return E.run(function () { return detail(E.mustCase(id), E.actor()); }); },

    createDraft: function (service, values) {
      return E.mutate(function () {
        var a = requireEntity(service);
        validateForm(service, values);
        var now = E.now();
        var c = Object.assign(blankCase(service, a, now), formToCase(service, values));
        c.geo = D.randomGeo(E.db(), c.governorate);
        c.timeline = [wf.entry(a, now, 'created', { to: 'draft' })];
        E.db().cases.push(c);
        E.audit('case.created', 'case', c.id, c.ref, null, { status: 'draft' }, null, a);
        return c;
      });
    },
    updateDraft: function (id, values) {
      return E.mutate(function () {
        var c = E.mustCase(id);
        var a = requireEntity(c.service);
        if (c.status !== 'draft' || c.entityId !== a.entityId) throw new Err('errors.notEditable');
        validateForm(c.service, values);
        var next = Object.assign({}, c, formToCase(c.service, values), { updatedAt: E.now() });
        next.geo = D.randomGeo(E.db(), next.governorate);
        E.replaceCase(next);
        E.audit('case.updated', 'case', c.id, c.ref, null, null, null, a);
        return next;
      });
    },
    sendOffer: function (id, providerId) {
      return E.mutate(function () {
        var c = E.mustCase(id);
        var a = requireEntity(c.service);
        if (c.entityId !== a.entityId) throw new Err('errors.forbidden');
        if (['draft', 'submitted', 'declined', 'expired'].indexOf(c.status) < 0) throw new Err('wf.err.invalidState');
        var demand = {}; demand[D.caseGov(c)] = 1;
        var el = eligible({ service: c.service, demand: demand, inquiryTypes: c.inquiryTypes, bucket: c.bucket, caseId: c.id });
        if (!el.providers.some(function (p) { return p.id === providerId; })) throw new Err('errors.providerNotEligible');
        var p = E.providerById(providerId);
        if (c.status === 'draft') c = E.transition(c, 'submit', {}, a, { silent: true });
        var o = createOffer(p, [c]);
        return E.transition(c, 'send_offer', { providerId: p.id, offerId: o.id, price: D.priceFor(E.db(), p, c) }, a);
      });
    },
    transition: function (id, action, payload) {
      return E.mutate(function () {
        var c = E.mustCase(id);
        var a = E.actor();
        if (['accept', 'decline', 'expire', 'send_offer', 'force_reassign'].indexOf(action) >= 0) throw new Err('errors.useDedicatedAction');
        if (['approve', 'return_to_agent'].indexOf(action) >= 0 && !D.caseInTeamScope(E.db(), a, c)) throw new Err('errors.notYourAgent');
        var next = E.transition(c, action, payload || {}, a);
        if (action === 'accept_report') next = E.transition(next, 'close', {}, a);
        return next;
      });
    },
    assign: function (caseIds, agentId) {
      return E.mutate(function () {
        var a = E.actor();
        var agent = E.agentById(agentId);
        if (!agent || agent.providerId !== a.providerId) throw new Err('errors.forbidden');
        if (!agent.active) throw new Err('errors.agentInactive');
        if (!D.agentInScope(a, agent)) throw new Err('errors.notYourAgent');
        var out = [];
        caseIds.forEach(function (id) {
          var c = E.mustCase(id);
          if (agent.services.indexOf(c.service) < 0) throw new Err('errors.agentWrongService');
          out.push(E.transition(c, 'assign', { agentId: agentId }, a, { silent: caseIds.length > 1 }));
        });
        if (caseIds.length > 1) {
          var au = D.agentUser(E.db(), agentId);
          if (au) E.notify([au], 'notif.route_assigned', { count: caseIds.length }, 'case:' + out[0].id);
        }
        return out;
      });
    },
    /**
     * Check in at the address. fix: the phone's real location { lat, lng, accuracyM }.
     * Without a fix (demo, or the prototype website) the location is simulated.
     */
    checkIn: function (id, fix) {
      return E.mutate(function (db) {
        var c = E.mustCase(id), a = E.actor();
        forAgent(c, a);
        // fix may carry only a time (a simulated location recorded without signal).
        var hasPos = fix != null && (fix.lat != null || fix.lng != null);
        if (hasPos && !D.validFix(fix)) throw new Err('errors.locationInvalid');
        // Done without signal: keep the time it really happened (see happenedAt).
        var at = happenedAt(fix && fix.at, c);
        var ci = hasPos ? D.checkInFrom(db, c, fix, at) : D.simulateCheckIn(c, at);
        if (at < E.now() - 2 * 60 * 1000) ci.sentAt = E.now();
        return E.transition(c, 'check_in', { checkIn: ci }, a);
      });
    },
    /** Add a visit photo, stamped with the phone's location when given (fix), else a simulated one. */
    addPhoto: function (id, dataUrl, label, fix) {
      return E.mutate(function () {
        var c = E.mustCase(id), a = E.actor();
        forAgent(c, a);
        if (c.status !== 'in_field') throw new Err('errors.checkInFirst');
        var near = fix != null && D.validFix(fix) ? { lat: U.round(+fix.lat, 6), lng: U.round(+fix.lng, 6), accuracyM: fix.accuracyM == null ? null : Math.round(+fix.accuracyM), source: 'device' } : D.simulateCheckIn(c, E.now());
        var photo = { id: U.uid('ph'), at: happenedAt(fix && fix.at, c), lat: near.lat, lng: near.lng, accuracyM: near.accuracyM, source: near.source, dataUrl: dataUrl, label: label || null };
        var next = Object.assign({}, c, { photos: (c.photos || []).concat([photo]), updatedAt: E.now() });
        E.replaceCase(next);
        E.audit('case.photo_added', 'case', c.id, c.ref, null, { photos: next.photos.length }, null, a);
        return next;
      });
    },
    removePhoto: function (id, photoId) {
      return E.mutate(function () {
        var c = E.mustCase(id), a = E.actor();
        forAgent(c, a);
        if (c.status !== 'in_field') throw new Err('errors.notEditable');
        var next = Object.assign({}, c, { photos: (c.photos || []).filter(function (p) { return p.id !== photoId; }) });
        E.replaceCase(next);
        return next;
      });
    },
    saveReport: function (id, type, values) {
      return E.mutate(function () {
        var c = E.mustCase(id), a = E.actor();
        forAgent(c, a);
        if (c.status !== 'in_field') throw new Err('errors.checkInFirst');
        if ((c.inquiryTypes || []).indexOf(type) < 0) throw new Err('errors.notFound');
        var report = Object.assign({}, c.report || {});
        report[type] = wf.reports.clean(C.REPORT_FORMS[type], values, { now: E.now() });
        var next = Object.assign({}, c, { report: report, updatedAt: E.now() });
        E.replaceCase(next);
        return next;
      });
    },
    /** Read a document photo (OCR). Simulated here; a real backend calls an OCR service. */
    scanDocument: function (id, doc) {
      return E.run(function () {
        var c = E.mustCase(id), a = E.actor();
        forAgent(c, a);
        if (c.status !== 'in_field') throw new Err('errors.checkInFirst');
        if (!C.OCR_DOCS[doc]) throw new Err('errors.notFound');
        return { doc: doc, at: E.now(), fields: wf.reports.simulateOcr(doc, c, E.now()) };
      });
    },
    /** The bank's own credit decision after reading the report. */
    setClientDecision: function (id, decision, note) {
      return E.mutate(function () {
        var c = E.mustCase(id), a = E.actor();
        if (!wf.isEntityRole(a.role) || a.entityId !== c.entityId || !wf.entityServes(a.role, c.service)) throw new Err('errors.forbidden');
        if (c.service !== 'investigation' || ['delivered', 'accepted_by_entity', 'closed'].indexOf(c.status) < 0) throw new Err('errors.decisionAfterDelivery');
        if (C.CLIENT_DECISIONS.indexOf(decision) < 0) throw new Err('errors.required');
        var before = c.clientDecision ? c.clientDecision.value : null;
        var next = Object.assign({}, c, { clientDecision: { value: decision, note: note || '', at: E.now(), by: a.userId, byName: a.name }, updatedAt: E.now() });
        E.replaceCase(next);
        E.audit('case.client_decision', 'case', c.id, c.ref, { decision: before }, { decision: decision }, note || null, a);
        return next;
      });
    },
    /** Location of a collection field visit: from the phone (fix) when given, else simulated. */
    simulateFieldVisit: function (id, fix) {
      return E.run(function () {
        var c = E.mustCase(id), a = E.actor();
        var err = wf.collection.checkOperate(c, a);
        if (err) throw new Err(err);
        if (fix != null && !D.validFix(fix)) throw new Err('errors.locationInvalid');
        return fix != null ? D.checkInFrom(E.db(), c, fix, E.now()) : D.simulateCheckIn(c, E.now());
      });
    },
    logAction: function (id, values) { return collectionOp(id, 'logAction', values, 'case.action_logged'); },
    addPromise: function (id, values) { return collectionOp(id, 'addPromise', values, 'case.promise_recorded'); },
    addPayment: function (id, values) { return collectionOp(id, 'addPayment', values, 'case.payment_recorded'); },
    requestSettlement: function (id, values) {
      return E.mutate(function () {
        var c = E.mustCase(id), a = E.actor();
        if (c.status === 'assigned') c = E.transition(c, 'start', {}, a, { silent: true });
        return E.transition(c, 'request_settlement', values, a);
      });
    },
    closeCollection: function (id, values) {
      return E.mutate(function () {
        var c = E.mustCase(id), a = E.actor();
        return E.transition(c, 'close', { outcome: values.outcome, reason: values.reason }, a);
      });
    },
    forceReassign: function (id, providerId, reason) {
      return E.mutate(function () {
        var c = E.mustCase(id), a = E.requireRole(['platform_admin']);
        var p = E.providerById(providerId);
        if (!p || p.services.indexOf(c.service) < 0) throw new Err('errors.providerNotEligible');
        if (c.offerId) { var old = E.offerById(c.offerId); if (old && old.status === 'pending') old.status = 'withdrawn'; }
        var o = createOffer(p, [c]);
        return E.transition(c, 'force_reassign', { providerId: p.id, offerId: o.id, price: D.priceFor(E.db(), p, c), reason: reason }, a);
      });
    },
    extendSla: function (id, hours, reason) {
      return E.mutate(function () {
        var c = E.mustCase(id), a = E.requireRole(['platform_admin']);
        if (!reason) throw new Err('wf.err.reasonRequired');
        if (!(+hours > 0)) throw new Err('errors.min');
        var add = +hours * H;
        var next = Object.assign({}, c, { dueAt: (c.dueAt || E.now()) + add });
        if (c.deadline) next.deadline = c.deadline + add;
        if (c.periodEnd) next.periodEnd = c.periodEnd + add;
        next.slaFlags = wf.sla.resetFlags(next, E.now());
        next = wf.withEntry(next, a, E.now(), 'sla_extended', { note: reason, data: { hours: +hours } });
        E.replaceCase(next);
        E.audit('case.sla_extended', 'case', c.id, c.ref, { dueAt: c.dueAt }, { dueAt: next.dueAt }, reason, a);
        E.notify(E.entityUsers(next).concat(E.providerManagers(next.providerId)), 'notif.sla_extended', { ref: next.ref, hours: +hours }, 'case:' + next.id);
        return next;
      });
    },
    reviewQueue: function () {
      return E.run(function () {
        var a = E.actor(), now = E.now();
        return E.db().cases.filter(function (c) {
          if (c.status !== 'submitted_for_review') return false;
          var p = E.providerById(c.providerId);
          var qa = wf.reviewedByQa(c, { provider: p });
          if (a.role === 'platform_qa' || a.role === 'platform_admin') return qa;
          if (a.role === 'provider_supervisor' || a.role === 'provider_admin') return !qa && c.providerId === a.providerId && p.kind === 'company' && D.caseInTeamScope(E.db(), a, c);
          return false;
        }).map(function (c) { return decorate(c, a, now); }).filter(Boolean)
          .sort(function (x, y) { return x.reportSubmittedAt - y.reportSubmittedAt; });
      });
    },
    agentTasks: function () {
      return E.run(function () {
        var a = E.actor(), now = E.now();
        if (!a.agentId) throw new Err('errors.forbidden');
        return E.db().cases.filter(function (c) { return c.agentId === a.agentId; })
          .map(function (c) { return decorate(c, a, now); }).filter(Boolean);
      });
    },
    _decorate: decorate,
    _formToCase: formToCase,
    _blankCase: blankCase,
    _clientRatingOf: clientRatingOf,
    _providerSummary: providerSummary
  };

  function collectionOp(id, op, values, auditAction) {
    return E.mutate(function () {
      var c = E.mustCase(id), a = E.actor();
      var next = wf.collection[op](c, a, E.now(), values || {});
      E.replaceCase(Object.assign(next, { updatedAt: E.now() }));
      E.audit(auditAction, 'case', c.id, c.ref, null, U.clone(Object.assign({}, values, { receipt: values && values.receipt ? '[image]' : undefined })), null, a);
      if (op === 'addPayment') E.notify(E.entityUsers(next), 'notif.payment_recorded', { ref: next.ref, amount: +values.amount }, 'case:' + next.id);
      return next;
    });
  }
})();
