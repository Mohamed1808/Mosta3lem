/* Provider scoring (0-100), availability and marketplace ranking. Pure.

   score = operationalWeight * operational + ratingWeight * ratingPart   (weights from admin config)
   Investigation operational: on-time rate, first-time acceptance (no rework), evidence completeness.
   Collection operational: recovery rate normalised by days-past-due bucket, promise-to-pay kept
   rate, and the absence of complaints.
   Rating part: recency-weighted average of client ratings, with each entity's share capped.
   `provider.history` holds counters from work done before the demo data window. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});
  var U = ICM.util;
  var DAY = 24 * 60 * 60 * 1000;

  function rate(n, d) { return d > 0 ? n / d : null; }

  /** Per-entity multipliers so no single entity exceeds capPct of the total weight. */
  function entityCapFactors(items, capPct) {
    var totals = {};
    items.forEach(function (i) { totals[i.entityId] = (totals[i.entityId] || 0) + i.w; });
    var ids = Object.keys(totals), factors = {};
    ids.forEach(function (e) { factors[e] = 1; });
    if (ids.length < 2) return factors;
    var cap = capPct / 100;
    if (ids.length * cap < 1) {
      // The cap cannot be met; the fairest result is an equal share per entity.
      ids.forEach(function (e) { factors[e] = 1 / totals[e]; });
      return factors;
    }
    var capped = {};
    for (var guard = 0; guard < ids.length; guard++) {
      var free = ids.filter(function (e) { return !capped[e]; });
      var freeTotal = U.sum(free, function (e) { return totals[e]; });
      var total = freeTotal / (1 - cap * Object.keys(capped).length);
      var over = free.filter(function (e) { return totals[e] > cap * total + 1e-9; });
      if (!over.length) {
        Object.keys(capped).forEach(function (e) { factors[e] = (cap * total) / totals[e]; });
        break;
      }
      over.forEach(function (e) { capped[e] = true; });
    }
    return factors;
  }

  /** Recency-weighted, entity-capped average of `overall`. */
  function weightedRating(ratings, cfg, now) {
    if (!ratings.length) return { avg: null, count: 0 };
    var cutoff = now - cfg.recencyDays * DAY;
    var items = ratings.map(function (r) {
      return { r: r, entityId: r.entityId, w: (r.createdAt >= cutoff ? cfg.recentMultiplier || 2 : 1) * (r.weight == null ? 1 : r.weight) };
    }).filter(function (i) { return i.w > 0; });
    if (!items.length) return { avg: null, count: 0 };
    var f = entityCapFactors(items, cfg.entityCapPct);
    var num = 0, den = 0;
    items.forEach(function (i) { var w = i.w * f[i.entityId]; num += i.r.overall * w; den += w; });
    return { avg: den ? num / den : null, count: ratings.length, simpleAvg: U.avg(ratings, function (r) { return r.overall; }) };
  }

  function blend(parts, weights) {
    var num = 0, den = 0;
    Object.keys(weights).forEach(function (k) {
      if (parts[k] != null) { num += parts[k] * weights[k]; den += weights[k]; }
    });
    return den ? num / den : null;
  }

  function investigationOps(provider, cases) {
    var h = (provider.history && provider.history.investigation) || {};
    var delivered = cases.filter(function (c) { return c.firstDeliveredAt; });
    var accepted = cases.filter(function (c) { return c.status === 'closed' || c.status === 'accepted_by_entity'; });
    var reworkOpen = cases.filter(function (c) { return c.reworkCount > 0 && c.status !== 'closed' && c.status !== 'accepted_by_entity'; });
    var deliveredN = (h.delivered || 0) + delivered.length;
    var m = {
      onTime: rate((h.onTime || 0) + delivered.filter(function (c) { return c.onTime; }).length, deliveredN),
      firstTime: rate((h.firstTime || 0) + accepted.filter(function (c) { return !c.reworkCount; }).length,
        (h.accepted || 0) + accepted.length + reworkOpen.length),
      evidence: rate((h.evidence || 0) + delivered.filter(function (c) { return c.evidenceComplete; }).length, deliveredN)
    };
    m.volume = deliveredN;
    m.operational = blend(m, ICM.config.OPERATIONAL_WEIGHTS.investigation);
    return m;
  }

  function collectionOps(provider, cases, ratings) {
    var h = (provider.history && provider.history.collection) || {};
    var closed = cases.filter(function (c) { return c.status === 'closed'; });
    var buckets = {};
    ICM.config.DPD_BUCKETS.forEach(function (b) { buckets[b.id] = b.benchmark; });
    var norm = U.sum(closed, function (c) {
      if (c.outcome === 'fully_recovered') return 1;
      var ratio = +c.overdueAmount ? wf.collection.recovered(c) / +c.overdueAmount : 0;
      return Math.min(1, ratio / (buckets[c.bucket] || 0.5));
    });
    var kept = 0, broken = 0;
    cases.forEach(function (c) {
      (c.promises || []).forEach(function (p) { if (p.status === 'kept') kept++; if (p.status === 'broken') broken++; });
    });
    var complaintCases = closed.filter(function (c) {
      if (c.complaint) return true;
      return ratings.some(function (r) { return r.caseId === c.id && (r.tags || []).indexOf('customer_complaint') >= 0; });
    }).length;
    var closedN = (h.closed || 0) + closed.length;
    var complaintRate = rate((h.complaints || 0) + complaintCases, closedN);
    var m = {
      recovery: rate((h.recoveryNormSum || 0) + norm, closedN),
      ptpKept: rate((h.ptpKept || 0) + kept, (h.ptpKept || 0) + (h.ptpBroken || 0) + kept + broken),
      noComplaint: complaintRate == null ? null : 1 - complaintRate,
      complaintRate: complaintRate,
      // plain (not normalised) recovery rate for display
      rawRecovery: rate(U.sum(closed, function (c) { return wf.collection.recovered(c); }) + (h.recoveredAmount || 0),
        U.sum(closed, function (c) { return +c.overdueAmount; }) + (h.overdueAmount || 0))
    };
    m.volume = closedN;
    m.onTime = rate((h.onTime || 0) + closed.filter(function (c) { return c.onTime; }).length, closedN);
    m.operational = blend({ recovery: m.recovery, ptpKept: m.ptpKept, noComplaint: m.noComplaint }, ICM.config.OPERATIONAL_WEIGHTS.collection);
    return m;
  }

  function serviceScore(provider, service, cases, ratings, cfg, now) {
    var svcCases = cases.filter(function (c) { return c.service === service && c.providerId === provider.id; });
    var svcRatings = ratings.filter(function (r) { return r.service === service && r.providerId === provider.id && r.status !== 'removed'; });
    var ops = service === 'investigation' ? investigationOps(provider, svcCases) : collectionOps(provider, svcCases, svcRatings);
    var wr = weightedRating(svcRatings, cfg, now);
    var ratingPart = wr.avg == null ? null : ((wr.avg - 1) / 4) * 100;
    var opPart = ops.operational == null ? null : ops.operational * 100;
    var score = blend({ op: opPart, rt: ratingPart }, { op: cfg.operationalWeight, rt: cfg.ratingWeight });
    var criteria = {};
    ICM.config.RATING_CRITERIA[service].forEach(function (k) {
      var vals = svcRatings.filter(function (r) { return r.criteria && r.criteria[k]; });
      criteria[k] = vals.length ? U.avg(vals, function (r) { return r.criteria[k]; }) : null;
    });
    return {
      service: service,
      score: score == null ? null : U.round(score, 1),
      operational: opPart == null ? null : U.round(opPart, 1),
      ratingPart: ratingPart == null ? null : U.round(ratingPart, 1),
      avgRating: wr.avg == null ? null : U.round(wr.avg, 2),
      simpleAvgRating: wr.simpleAvg == null ? null : U.round(wr.simpleAvg, 2),
      ratingCount: svcRatings.length,
      isNew: svcRatings.length < cfg.minRatings,
      metrics: ops,
      criteria: criteria
    };
  }

  function providerScore(provider, cases, ratings, cfg, now) {
    var byService = {};
    provider.services.forEach(function (s) { byService[s] = serviceScore(provider, s, cases, ratings, cfg, now); });
    var scores = provider.services.map(function (s) { return byService[s].score; }).filter(function (x) { return x != null; });
    return {
      providerId: provider.id,
      overall: scores.length ? U.round(U.avg(scores), 1) : null,
      byService: byService,
      computedAt: now
    };
  }

  function enforcementLevel(score, cfg) {
    if (score == null) return 'none';
    if (score < cfg.suspendBelow) return 'suspended';
    if (score < cfg.reduceBelow) return 'reduced';
    if (score < cfg.warnBelow) return 'warned';
    return 'none';
  }

  /** capacity 0 means not covered. */
  function availability(capacity, load) {
    if (!capacity) return 'none';
    var spare = capacity - load;
    if (spare <= 0) return 'full';
    var ratio = spare / capacity;
    if (ratio < 0.25) return 'low';
    if (ratio < 0.6) return 'medium';
    return 'high';
  }

  var AVAIL_FACTOR = { high: 1, medium: 0.93, low: 0.85, full: 0, none: 0 };
  var ENFORCE_FACTOR = { none: 1, warned: 0.95, reduced: 0.75, suspended: 0 };

  function rankingScore(score, avail, enforcement) {
    var base = score == null ? 60 : score;
    return U.round(base * (AVAIL_FACTOR[avail] || 0) * (ENFORCE_FACTOR[enforcement] == null ? 1 : ENFORCE_FACTOR[enforcement]), 2);
  }

  wf.scoring = {
    entityCapFactors: entityCapFactors,
    weightedRating: weightedRating,
    serviceScore: serviceScore,
    providerScore: providerScore,
    enforcementLevel: enforcementLevel,
    availability: availability,
    rankingScore: rankingScore,
    AVAIL_FACTOR: AVAIL_FACTOR,
    ENFORCE_FACTOR: ENFORCE_FACTOR
  };
})();
