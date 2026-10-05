/* Mock services: ratings (entity -> provider), client ratings (provider -> entity),
   disputes and moderation. Only an entity with a closed case or batch can rate, once. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain, C = ICM.config;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;

  function build(o) {
    var v = o.values || {};
    var overall = +v.overall;
    if (!(overall >= 1 && overall <= 5 && Math.round(overall) === overall)) throw new Err('errors.ratingRequired');
    var criteria = {};
    C.RATING_CRITERIA[o.service].forEach(function (k) {
      var x = +((v.criteria || {})[k]);
      if (!(x >= 1 && x <= 5)) throw new Err('errors.criteriaRequired');
      criteria[k] = x;
    });
    var tagIds = E.db().config.lists.ratingTags.map(function (t) { return t.id; });
    var tags = U.asArray(v.tags).filter(function (t) { return tagIds.indexOf(t) >= 0; });
    return {
      id: U.uid('rat'), providerId: o.providerId, entityId: o.entityId, service: o.service,
      caseId: o.caseId || null, caseRef: o.caseRef || null, batchId: o.batchId || null,
      overall: overall, criteria: criteria, feedback: String(v.feedback || '').trim(), tags: tags,
      createdAt: E.now(), createdBy: o.by.userId, reply: null, status: 'active', hidden: false, flagged: false, flagReason: null
    };
  }

  function requireEntity() {
    var a = E.actor();
    if (!wf.isEntityRole(a.role)) throw new Err('errors.forbidden');
    return a;
  }
  function requireProviderManager() {
    var a = E.actor();
    if (wf.PROVIDER_MANAGER_ROLES.indexOf(a.role) < 0) throw new Err('errors.forbidden');
    return a;
  }

  function withNames(r) {
    var p = E.providerById(r.providerId), e = E.entityById(r.entityId);
    var dispute = E.db().disputes.filter(function (d) { return d.ratingId === r.id; }).sort(function (a, b) { return b.createdAt - a.createdAt; })[0];
    var out = Object.assign({}, r, { providerName: p ? p.name : '', entityName: e ? e.name : '', dispute: dispute ? { id: dispute.id, status: dispute.status, outcome: dispute.outcome } : null });
    // Clients see the provider company, not the person who replied.
    var a = E.currentUser();
    if (a && wf.isEntityRole(a.role) && out.reply) out.reply = Object.assign({}, out.reply, { by: null, byName: out.providerName });
    return out;
  }

  S.ratings = {
    _build: build,
    pending: function () {
      return E.run(function () {
        var a = requireEntity(), now = E.now();
        var cases = E.db().cases.filter(function (c) {
          return c.entityId === a.entityId && wf.entityServes(a.role, c.service) && c.status === 'closed' && !c.ratingId && !c.batchId && c.providerId;
        }).map(function (c) { return S.cases._decorate(c, a, now); });
        var batches = E.db().batches.filter(function (b) {
          if (b.entityId !== a.entityId || !wf.entityServes(a.role, b.service)) return false;
          var cs = b.caseIds.map(function (id) { return E.caseById(id); });
          return wf.batch.needsRating(b, cs);
        });
        return { cases: cases, batches: batches, count: cases.length + batches.length };
      });
    },
    given: function () {
      return E.run(function () {
        var a = requireEntity();
        return E.db().ratings.filter(function (r) { return r.entityId === a.entityId && wf.entityServes(a.role, r.service); })
          .sort(function (x, y) { return y.createdAt - x.createdAt; }).map(withNames);
      });
    },
    rateCase: function (caseId, values) {
      return E.mutate(function (db) {
        var a = requireEntity();
        var c = E.mustCase(caseId);
        if (c.entityId !== a.entityId || !wf.entityServes(a.role, c.service)) throw new Err('errors.forbidden');
        if (c.status !== 'closed') throw new Err('errors.rateAfterClose');
        if (c.batchId) throw new Err('errors.rateBatchInstead');
        if (c.ratingId) throw new Err('errors.alreadyRated');
        var r = build({ providerId: c.providerId, entityId: c.entityId, service: c.service, caseId: c.id, caseRef: c.ref, by: a, values: values });
        db.ratings.push(r);
        E.replaceCase(wf.withEntry(Object.assign({}, c, { ratingId: r.id }), a, E.now(), 'rated', { data: { stars: r.overall } }));
        E.audit('rating.created', 'rating', r.id, c.ref, null, { overall: r.overall, tags: r.tags }, null, a);
        E.notify(D.providerUsers(db, c.providerId, ['provider_admin', 'provider_supervisor', 'freelancer']), 'notif.rating_received', { stars: r.overall }, 'provider:ratings');
        return r;
      });
    },
    received: function (service) {
      return E.run(function () {
        var a = E.actor();
        if (!a.providerId) throw new Err('errors.forbidden');
        return E.db().ratings.filter(function (r) { return r.providerId === a.providerId && (!service || r.service === service); })
          .sort(function (x, y) { return y.createdAt - x.createdAt; }).map(withNames);
      });
    },
    reply: function (id, text) {
      return E.mutate(function () {
        var a = requireProviderManager();
        var r = E.ratingById(id);
        if (!r || r.providerId !== a.providerId) throw new Err('errors.forbidden');
        if (!String(text || '').trim()) throw new Err('errors.required');
        r.reply = { text: String(text).trim(), at: E.now(), by: a.userId, byName: a.name };
        E.audit('rating.reply', 'rating', r.id, r.caseRef, null, { reply: r.reply.text }, null, a);
        return r;
      });
    },
    flag: function (id, reason) {
      return E.mutate(function () {
        var a = requireProviderManager();
        var r = E.ratingById(id);
        if (!r || r.providerId !== a.providerId) throw new Err('errors.forbidden');
        if (!reason) throw new Err('wf.err.reasonRequired');
        r.flagged = true; r.flagReason = reason; r.flaggedAt = E.now();
        E.audit('rating.flagged', 'rating', r.id, r.caseRef, null, null, reason, a);
        E.notify(E.admins(), 'notif.rating_flagged', { ref: r.caseRef || '' }, 'admin:moderation');
        return r;
      });
    },
    moderation: function () {
      return E.run(function () {
        E.requireRole(['platform_admin']);
        return E.db().ratings.filter(function (r) { return r.feedback; })
          .sort(function (x, y) { return (y.flagged ? 1 : 0) - (x.flagged ? 1 : 0) || y.createdAt - x.createdAt; }).map(withNames);
      });
    },
    setHidden: function (id, hidden) {
      return E.mutate(function () {
        var a = E.requireRole(['platform_admin']);
        var r = E.ratingById(id);
        r.hidden = !!hidden;
        if (hidden) r.flagged = false;
        E.audit(hidden ? 'rating.hidden' : 'rating.restored', 'rating', r.id, r.caseRef, { hidden: !hidden }, { hidden: !!hidden }, null, a);
        return r;
      });
    },
    dismissFlag: function (id) {
      return E.mutate(function () {
        var a = E.requireRole(['platform_admin']);
        var r = E.ratingById(id);
        r.flagged = false;
        E.audit('rating.flag_dismissed', 'rating', r.id, r.caseRef, null, null, null, a);
        return r;
      });
    },

    // ---- providers rating entities
    clientPending: function () {
      return E.run(function () {
        var a = requireProviderManager(), db = E.db(), now = E.now();
        var rated = {};
        db.clientRatings.forEach(function (r) { if (r.caseId) rated['c' + r.caseId] = 1; if (r.batchId) rated['b' + r.batchId] = 1; });
        var out = [];
        var seenBatch = {};
        db.cases.forEach(function (c) {
          if (c.providerId !== a.providerId || c.status !== 'closed' || now - c.closedAt > 60 * U.DAY) return;
          if (c.batchId) {
            if (seenBatch[c.batchId] || rated['b' + c.batchId]) return;
            var b = E.batchById(c.batchId);
            var mine = b.caseIds.map(function (id) { return E.caseById(id); }).filter(function (x) { return x.providerId === a.providerId; });
            if (!mine.every(function (x) { return wf.isTerminal(x.status); })) return;
            seenBatch[c.batchId] = 1;
            out.push({ kind: 'batch', id: b.id, ref: b.ref, entityId: b.entityId, entityName: E.entityById(b.entityId).name, service: b.service, closedAt: c.closedAt, cases: mine.length });
          } else if (!rated['c' + c.id]) {
            out.push({ kind: 'case', id: c.id, ref: c.ref, entityId: c.entityId, entityName: E.entityById(c.entityId).name, service: c.service, closedAt: c.closedAt, cases: 1 });
          }
        });
        return out.sort(function (x, y) { return y.closedAt - x.closedAt; });
      });
    },
    rateClient: function (v) {
      return E.mutate(function (db) {
        var a = requireProviderManager();
        var dq = +v.dataQuality, pt = +v.paymentTimeliness;
        if (!(dq >= 1 && dq <= 5 && pt >= 1 && pt <= 5)) throw new Err('errors.ratingRequired');
        var entityId, caseId = null, batchId = null;
        if (v.caseId) {
          var c = E.mustCase(v.caseId);
          if (c.providerId !== a.providerId || c.status !== 'closed') throw new Err('errors.forbidden');
          if (db.clientRatings.some(function (r) { return r.caseId === c.id; })) throw new Err('errors.alreadyRated');
          entityId = c.entityId; caseId = c.id;
        } else {
          var b = E.batchById(v.batchId);
          if (!b || !b.caseIds.some(function (id) { var x = E.caseById(id); return x.providerId === a.providerId && x.status === 'closed'; })) throw new Err('errors.forbidden');
          if (db.clientRatings.some(function (r) { return r.batchId === b.id && r.providerId === a.providerId; })) throw new Err('errors.alreadyRated');
          entityId = b.entityId; batchId = b.id;
        }
        var r = { id: U.uid('crt'), providerId: a.providerId, entityId: entityId, caseId: caseId, batchId: batchId, dataQuality: dq, paymentTimeliness: pt, comment: String(v.comment || '').trim(), createdAt: E.now(), createdBy: a.userId };
        db.clientRatings.push(r);
        E.audit('client_rating.created', 'entity', entityId, E.entityById(entityId).name, null, { dataQuality: dq, paymentTimeliness: pt }, null, a);
        return r;
      });
    },
    clientRatings: function (entityId) {
      return E.run(function () {
        var a = E.actor();
        return E.db().clientRatings.filter(function (r) {
          if (entityId && r.entityId !== entityId) return false;
          if (a.role === 'platform_admin') return true;
          if (a.providerId) return r.providerId === a.providerId;
          return false;
        }).map(function (r) { return Object.assign({}, r, { entityName: E.entityById(r.entityId).name, providerName: E.providerById(r.providerId).name }); })
          .sort(function (x, y) { return y.createdAt - x.createdAt; });
      });
    }
  };

  // ---------------------------------------------------------------- disputes
  function canSeeDispute(d, a) {
    if (a.role === 'platform_admin' || a.role === 'platform_qa') return true;
    if (wf.isEntityRole(a.role)) return d.entityId === a.entityId;
    if (a.providerId) return d.providerId === a.providerId;
    return false;
  }
  function decorateDispute(d, viewer) {
    var p = E.providerById(d.providerId), e = E.entityById(d.entityId);
    var out = Object.assign({}, d, { providerName: p ? p.name : '', entityName: e ? e.name : '' });
    // Clients see the provider company, never the names of its people.
    if (viewer && wf.isEntityRole(viewer.role)) {
      if (out.raisedByParty === 'provider') out = Object.assign(out, { raisedBy: null, raisedByName: out.providerName });
      out.responses = (out.responses || []).map(function (r) { return r.party === 'provider' ? Object.assign({}, r, { by: null, byName: out.providerName }) : r; });
    }
    return out;
  }

  S.disputes = {
    list: function () {
      return E.run(function () {
        var a = E.actor();
        return E.db().disputes.filter(function (d) { return canSeeDispute(d, a); }).map(function (d) { return decorateDispute(d, a); })
          .sort(function (x, y) { return (x.status === 'open' ? 0 : 1) - (y.status === 'open' ? 0 : 1) || y.createdAt - x.createdAt; });
      });
    },
    get: function (id) {
      return E.run(function () {
        var a = E.actor(), d = E.disputeById(id);
        if (!d || !canSeeDispute(d, a)) throw new Err('errors.notFound');
        var c = d.caseId ? E.caseById(d.caseId) : null;
        return Object.assign(decorateDispute(d, a), {
          case: c ? S.cases._decorate(c, a.role === 'platform_admin' ? a : a, E.now()) : null,
          rating: d.ratingId ? withNames(E.ratingById(d.ratingId)) : null
        });
      });
    },
    open: function (v) {
      return E.mutate(function (db) {
        var a = E.actor();
        if (!v.reason || !String(v.details || '').trim()) throw new Err('wf.err.reasonRequired');
        var d = {
          id: U.uid('dsp'), ref: D.nextRef(db, 'dispute'), kind: v.kind, caseId: null, caseRef: null, ratingId: null,
          raisedBy: a.userId, raisedByName: a.name, raisedByParty: null, entityId: null, providerId: null,
          reason: v.reason, details: String(v.details).trim(), status: 'open', outcome: null, resolutionNote: null,
          createdAt: E.now(), resolvedAt: null, resolvedBy: null, responses: []
        };
        if (v.kind === 'case') {
          if (!wf.isEntityRole(a.role)) throw new Err('errors.forbidden');
          var c = E.mustCase(v.caseId);
          if (c.entityId !== a.entityId || !c.providerId) throw new Err('errors.forbidden');
          if (db.disputes.some(function (x) { return x.caseId === c.id && x.kind === 'case' && x.status === 'open'; })) throw new Err('errors.disputeExists');
          d.caseId = c.id; d.caseRef = c.ref; d.entityId = c.entityId; d.providerId = c.providerId; d.raisedByParty = 'entity';
          var n = wf.withEntry(Object.assign({}, c, { disputed: true, disputeIds: (c.disputeIds || []).concat([d.id]) }), a, E.now(), 'dispute_opened', { note: d.details });
          E.replaceCase(n);
          E.notify(E.providerManagers(c.providerId), 'notif.dispute_opened', { ref: d.ref }, 'dispute:' + d.id);
        } else if (v.kind === 'rating') {
          if (wf.PROVIDER_MANAGER_ROLES.indexOf(a.role) < 0) throw new Err('errors.forbidden');
          var r = E.ratingById(v.ratingId);
          if (!r || r.providerId !== a.providerId || r.status !== 'active') throw new Err('errors.forbidden');
          if (db.disputes.some(function (x) { return x.ratingId === r.id && x.status === 'open'; })) throw new Err('errors.disputeExists');
          d.ratingId = r.id; d.caseId = r.caseId; d.caseRef = r.caseRef; d.entityId = r.entityId; d.providerId = r.providerId; d.raisedByParty = 'provider';
          r.disputed = true;
        } else throw new Err('errors.forbidden');
        db.disputes.push(d);
        E.audit('dispute.opened', 'dispute', d.id, d.ref, null, { kind: d.kind, reason: d.reason }, d.details, a);
        E.notify(E.staffWith('disputes.decide'), 'notif.dispute_opened', { ref: d.ref }, 'dispute:' + d.id);
        return d;
      });
    },
    respond: function (id, text) {
      return E.mutate(function () {
        var a = E.actor(), d = E.disputeById(id);
        if (!d || !canSeeDispute(d, a)) throw new Err('errors.forbidden');
        if (d.status !== 'open') throw new Err('errors.disputeClosed');
        if (!String(text || '').trim()) throw new Err('errors.required');
        var party = a.role === 'platform_admin' ? 'admin' : wf.isEntityRole(a.role) ? 'entity' : 'provider';
        d.responses.push({ by: a.userId, byName: a.name, party: party, text: String(text).trim(), at: E.now() });
        E.audit('dispute.response', 'dispute', d.id, d.ref, null, null, text, a);
        return d;
      });
    },
    resolve: function (id, outcome, note) {
      return E.mutate(function (db) {
        var a = E.requireRole(['platform_admin']);
        var d = E.disputeById(id);
        if (!d || d.status !== 'open') throw new Err('errors.disputeClosed');
        if (['upheld', 'rejected', 'partial'].indexOf(outcome) < 0) throw new Err('errors.outcomeRequired');
        if (!String(note || '').trim()) throw new Err('wf.err.reasonRequired');
        d.status = 'resolved'; d.outcome = outcome; d.resolutionNote = note; d.resolvedAt = E.now(); d.resolvedBy = a.name;
        if (d.kind === 'rating') {
          var r = E.ratingById(d.ratingId);
          r.disputed = false;
          if (outcome === 'upheld') r.status = 'removed';
          if (outcome === 'partial') r.weight = 0.5;
        }
        if (d.caseId) {
          var c = E.caseById(d.caseId);
          if (d.kind === 'case') {
            var stillOpen = db.disputes.some(function (x) { return x.caseId === c.id && x.kind === 'case' && x.status === 'open'; });
            var adj = outcome === 'upheld' ? 0 : outcome === 'partial' ? 0.5 : 1;
            db.invoices.forEach(function (inv) { inv.lines.forEach(function (l) { if (l.caseId === c.id && inv.status !== 'paid') l.adjustment = adj; }); });
            c = wf.withEntry(Object.assign({}, c, { disputed: stillOpen, billingAdjustment: adj }), a, E.now(), 'dispute_resolved', { note: note, data: { outcome: outcome } });
            E.replaceCase(c);
          }
        }
        E.audit('dispute.resolved', 'dispute', d.id, d.ref, { status: 'open' }, { status: 'resolved', outcome: outcome }, note, a);
        var parties = db.users.filter(function (u) { return u.active !== false && ((u.entityId === d.entityId && (u.id === d.raisedBy || u.role === 'entity_admin')) || (u.providerId === d.providerId && ['provider_admin', 'freelancer'].indexOf(u.role) >= 0)); });
        E.notify(parties, 'notif.dispute_resolved', { ref: d.ref, outcome: outcome }, 'dispute:' + d.id);
        return d;
      });
    }
  };
})();
