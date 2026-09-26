/* Mock services: invoices, provider earnings and analytics for every dashboard. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain, C = ICM.config;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;

  function lineAmount(l) { return U.round(l.amount * (l.adjustment == null ? 1 : l.adjustment), 0); }
  function withTotals(inv) {
    var subtotal = U.sum(inv.lines, lineAmount);
    var fee = U.round(subtotal * inv.platformFeePct / 100, 0);
    return Object.assign({}, inv, {
      subtotal: subtotal, platformFee: fee, providerNet: subtotal - fee,
      entityName: E.entityById(inv.entityId).name, providerName: E.providerById(inv.providerId).name,
      lines: inv.lines.map(function (l) { return Object.assign({}, l, { billed: lineAmount(l) }); })
    });
  }
  var PAYOUT = { draft: 'accruing', issued: 'pending', paid: 'paid_out' };

  S.billing = {
    invoices: function () {
      return E.run(function () {
        var a = E.actor();
        return E.db().invoices.filter(function (i) {
          if (a.role === 'platform_admin') return true;
          if (wf.isEntityRole(a.role)) return i.entityId === a.entityId;
          if (a.providerId) return i.providerId === a.providerId;
          return false;
        }).map(withTotals).sort(function (x, y) { return y.month.localeCompare(x.month) || x.providerName.localeCompare(y.providerName); });
      });
    },
    markPaid: function (id) {
      return E.mutate(function (db) {
        var a = E.actor();
        if (['entity_admin', 'entity_operations'].indexOf(a.role) < 0) throw new Err('errors.forbidden');
        var inv = E.invoiceById(id);
        if (!inv || inv.entityId !== a.entityId) throw new Err('errors.forbidden');
        if (inv.status !== 'issued') throw new Err('errors.invoiceNotIssued');
        inv.status = 'paid'; inv.paidAt = E.now();
        E.audit('invoice.paid', 'invoice', inv.id, inv.ref, { status: 'issued' }, { status: 'paid' }, null, a);
        E.notify(D.providerUsers(db, inv.providerId, ['provider_admin', 'freelancer']), 'notif.invoice_paid', { ref: inv.ref }, 'provider:earnings');
        return withTotals(inv);
      });
    },
    issue: function (id) {
      return E.mutate(function (db) {
        var a = E.requireRole(['platform_admin']);
        var inv = E.invoiceById(id);
        if (!inv || inv.status !== 'draft') throw new Err('errors.invoiceNotDraft');
        if (!inv.lines.length) throw new Err('errors.invoiceEmpty');
        inv.status = 'issued'; inv.issuedAt = E.now();
        E.audit('invoice.issued', 'invoice', inv.id, inv.ref, { status: 'draft' }, { status: 'issued' }, null, a);
        E.notify(db.users.filter(function (u) { return u.entityId === inv.entityId && (u.role === 'entity_admin' || u.role === 'entity_operations'); }), 'notif.invoice_issued', { ref: inv.ref }, 'entity:invoices');
        return withTotals(inv);
      });
    },
    earnings: function (service) {
      return E.run(function () {
        var a = E.actor();
        if (!a.providerId) throw new Err('errors.forbidden');
        var month = U.monthKey(E.now());
        var rows = [];
        E.db().invoices.filter(function (i) { return i.providerId === a.providerId; }).forEach(function (inv) {
          inv.lines.forEach(function (l) {
            if (service && l.service !== service) return;
            var gross = lineAmount(l), fee = U.round(gross * inv.platformFeePct / 100, 0);
            rows.push({ caseId: l.caseId, caseRef: l.caseRef, service: l.service, closedAt: l.closedAt, entityName: E.entityById(inv.entityId).name, invoiceRef: inv.ref, month: inv.month, gross: gross, fee: fee, net: gross - fee, payout: PAYOUT[inv.status], adjusted: l.adjustment != null && l.adjustment !== 1 });
          });
        });
        rows.sort(function (x, y) { return y.closedAt - x.closedAt; });
        function tot(f) { return U.sum(rows.filter(f), function (r) { return r.net; }); }
        return {
          rows: rows,
          thisMonthGross: U.sum(rows.filter(function (r) { return r.month === month; }), function (r) { return r.gross; }),
          thisMonthNet: tot(function (r) { return r.month === month; }),
          accruing: tot(function (r) { return r.payout === 'accruing'; }),
          pending: tot(function (r) { return r.payout === 'pending'; }),
          paidOut: tot(function (r) { return r.payout === 'paid_out'; }),
          feePct: E.db().config.pricing.platformFeePct
        };
      });
    }
  };

  // ---------------------------------------------------------------- analytics
  function monthsBack(n, now) {
    var out = [], d = new Date(now);
    for (var i = n - 1; i >= 0; i--) out.push(U.monthKey(new Date(d.getFullYear(), d.getMonth() - i, 15).getTime()));
    return out;
  }
  function inMonth(ts, key) { return ts && U.monthKey(ts) === key; }

  function kpisFor(cases, now) {
    var month = U.monthKey(now);
    var inv = cases.filter(function (c) { return c.service === 'investigation'; });
    var col = cases.filter(function (c) { return c.service === 'collection'; });
    var delivered90 = inv.filter(function (c) { return c.firstDeliveredAt && now - c.firstDeliveredAt < 90 * U.DAY; });
    return {
      open: cases.filter(function (c) { return !wf.isTerminal(c.status) && c.status !== 'draft'; }).length,
      atRisk: cases.filter(function (c) { return wf.sla.state(c, now) === 'at_risk'; }).length,
      breached: cases.filter(function (c) { return wf.sla.state(c, now) === 'breached'; }).length,
      deliveredThisMonth: inv.filter(function (c) { return inMonth(c.firstDeliveredAt, month); }).length + col.filter(function (c) { return c.status === 'closed' && inMonth(c.closedAt, month); }).length,
      recoveredThisMonth: U.sum(col, function (c) { return U.sum((c.payments || []).filter(function (p) { return inMonth(p.at, month); }), function (p) { return p.amount; }); }),
      avgTurnaroundHours: delivered90.length ? U.round(U.avg(delivered90, function (c) { return (c.firstDeliveredAt - (c.acceptedAt || c.submittedAt)) / U.HOUR; }), 1) : null,
      byStatus: U.groupBy(cases.filter(function (c) { return !wf.isTerminal(c.status); }), function (c) { return c.status; })
    };
  }

  S.analytics = {
    entityDashboard: function () {
      return E.run(function () {
        var a = E.actor(), now = E.now(), db = E.db();
        if (!a.entityId) throw new Err('errors.forbidden');
        var cases = db.cases.filter(function (c) { return c.entityId === a.entityId && wf.entityServes(a.role, c.service); });
        var k = kpisFor(cases, now);
        var month = U.monthKey(now);
        var spend = U.sum(db.invoices.filter(function (i) { return i.entityId === a.entityId && i.month === month; }), function (i) { return U.sum(i.lines, lineAmount); });
        var statusCounts = {};
        Object.keys(k.byStatus).forEach(function (s) { statusCounts[s] = k.byStatus[s].length; });
        var attention = cases.filter(function (c) {
          return ['delivered', 'awaiting_entity_approval', 'declined', 'expired'].indexOf(c.status) >= 0 || wf.sla.state(c, now) === 'breached';
        }).map(function (c) { return S.cases._decorate(c, a, now); }).sort(function (x, y) { return (y.updatedAt || 0) - (x.updatedAt || 0); }).slice(0, 8);
        var series = monthsBack(6, now).map(function (m) {
          return {
            month: m,
            created: cases.filter(function (c) { return inMonth(c.createdAt, m); }).length,
            closed: cases.filter(function (c) { return c.status === 'closed' && inMonth(c.closedAt, m); }).length
          };
        });
        return {
          open: k.open, atRisk: k.atRisk, breached: k.breached, deliveredThisMonth: k.deliveredThisMonth,
          recoveredThisMonth: k.recoveredThisMonth, avgTurnaroundHours: k.avgTurnaroundHours, spendThisMonth: spend,
          statusCounts: statusCounts, attention: attention, series: series,
          pendingRatings: cases.filter(function (c) { return c.status === 'closed' && !c.ratingId && !c.batchId && c.providerId; }).length,
          services: ['investigation', 'collection'].filter(function (s) { return wf.entityServes(a.role, s); })
        };
      });
    },
    entityReports: function () {
      return E.run(function () {
        var a = E.actor(), now = E.now(), db = E.db();
        var cases = db.cases.filter(function (c) { return c.entityId === a.entityId && wf.entityServes(a.role, c.service) && c.providerId; });
        var byProv = U.groupBy(cases, function (c) { return c.providerId; });
        var rows = Object.keys(byProv).map(function (pid) {
          var cs = byProv[pid], p = E.providerById(pid);
          var inv = cs.filter(function (c) { return c.service === 'investigation'; });
          var col = cs.filter(function (c) { return c.service === 'collection'; });
          var delivered = inv.filter(function (c) { return c.firstDeliveredAt; });
          var accepted = inv.filter(function (c) { return c.status === 'closed' || c.status === 'accepted_by_entity'; });
          var closedCol = col.filter(function (c) { return c.status === 'closed'; });
          var ratings = db.ratings.filter(function (r) { return r.providerId === pid && r.entityId === a.entityId && r.status !== 'removed'; });
          var spend = U.sum(db.invoices.filter(function (i) { return i.providerId === pid && i.entityId === a.entityId; }), function (i) { return U.sum(i.lines, lineAmount); });
          return {
            providerId: pid, name: p.name, kind: p.kind, services: p.services, cases: cs.length,
            onTimeRate: delivered.length ? delivered.filter(function (c) { return c.onTime; }).length / delivered.length : (closedCol.length ? closedCol.filter(function (c) { return c.onTime; }).length / closedCol.length : null),
            turnaroundHours: delivered.length ? U.round(U.avg(delivered, function (c) { return (c.firstDeliveredAt - (c.acceptedAt || c.submittedAt)) / U.HOUR; }), 1) : null,
            firstTimeRate: accepted.length ? accepted.filter(function (c) { return !c.reworkCount; }).length / accepted.length : null,
            recoveryRate: closedCol.length ? U.sum(closedCol, function (c) { return wf.collection.recovered(c); }) / U.sum(closedCol, function (c) { return +c.overdueAmount; }) : null,
            avgRating: ratings.length ? U.round(U.avg(ratings, function (r) { return r.overall; }), 2) : null,
            breaches: cs.filter(function (c) { return wf.sla.state(c, now) === 'breached' || c.onTime === false; }).length,
            spend: spend,
            score: db.scores[pid] ? db.scores[pid].overall : null
          };
        }).sort(function (x, y) { return y.cases - x.cases; });
        var months = monthsBack(6, now);
        return {
          providers: rows,
          months: months,
          volume: rows.map(function (r) { return { name: r.name, data: months.map(function (m) { return byProv[r.providerId].filter(function (c) { return inMonth(c.createdAt, m); }).length; }) }; })
        };
      });
    },
    providerDashboard: function (service) {
      return E.run(function () {
        var a = E.actor(), now = E.now(), db = E.db();
        if (!a.providerId) throw new Err('errors.forbidden');
        var p = E.providerById(a.providerId);
        var cases = db.cases.filter(function (c) { return c.providerId === a.providerId && c.service === service; });
        var k = kpisFor(cases, now);
        var endToday = U.endOfDay(now);
        var running = cases.filter(function (c) { return wf.sla.isRunning(c); });
        var submitted = cases.filter(function (c) { return c.reportSubmittedAt; });
        var sc = db.scores[p.id] && db.scores[p.id].byService[service];
        var month = U.monthKey(now);
        var earnings = U.sum(db.invoices.filter(function (i) { return i.providerId === p.id && i.month === month; }), function (i) {
          return U.sum(i.lines.filter(function (l) { return l.service === service; }), function (l) { return lineAmount(l) * (1 - i.platformFeePct / 100); });
        });
        var out = {
          provider: { id: p.id, name: p.name, kind: p.kind, enforcement: p.enforcement },
          newOffers: db.offers.filter(function (o) { return o.providerId === p.id && o.service === service && o.status === 'pending'; }).length,
          open: running.length + cases.filter(function (c) { return c.status === 'delivered'; }).length,
          dueToday: running.filter(function (c) { return c.dueAt && c.dueAt <= endToday; }).length,
          atRisk: k.atRisk, breached: k.breached,
          score: sc || null, earningsThisMonth: U.round(earnings, 0),
          reviewQueue: service === 'investigation' ? cases.filter(function (c) { return c.status === 'submitted_for_review' && p.kind === 'company'; }).length : 0,
          unassigned: cases.filter(function (c) { return c.status === 'accepted' || c.status === 'rework_requested'; }).length,
          statusCounts: {}
        };
        Object.keys(k.byStatus).forEach(function (s) { out.statusCounts[s] = k.byStatus[s].length; });
        if (service === 'investigation') {
          out.onTimeRate = sc ? sc.metrics.onTime : null;
          out.rejectionRate = submitted.length ? U.sum(submitted, function (c) { return (c.returnCount || 0) + (c.reworkCount || 0); }) / submitted.length : null;
        } else {
          var closed = cases.filter(function (c) { return c.status === 'closed'; });
          out.byBucket = C.DPD_BUCKETS.map(function (b) {
            var cs = closed.filter(function (c) { return c.bucket === b.id; });
            var od = U.sum(cs, function (c) { return +c.overdueAmount; });
            return { bucket: b.id, cases: cs.length, rate: od ? U.sum(cs, function (c) { return wf.collection.recovered(c); }) / od : null };
          });
          var promises = [].concat.apply([], cases.map(function (c) { return c.promises || []; }));
          out.promises = { kept: promises.filter(function (x) { return x.status === 'kept'; }).length, broken: promises.filter(function (x) { return x.status === 'broken'; }).length, pending: promises.filter(function (x) { return x.status === 'pending'; }).length };
          out.recoveredThisMonth = k.recoveredThisMonth;
          out.onTimeRate = sc ? sc.metrics.onTime : null;
          out.settlementsPending = cases.filter(function (c) { return c.status === 'awaiting_entity_approval'; }).length;
        }
        return out;
      });
    },
    portfolioReport: function (month) {
      return E.run(function () {
        var a = E.actor(), db = E.db(), now = E.now();
        if (!a.providerId) throw new Err('errors.forbidden');
        var m = month || U.monthKey(now);
        var cases = db.cases.filter(function (c) { return c.providerId === a.providerId && c.service === 'collection' && c.acceptedAt; });
        var groups = U.groupBy(cases, function (c) { return c.batchId || ('single:' + c.entityId); });
        return Object.keys(groups).map(function (k) {
          var cs = groups[k];
          var b = k.indexOf('single:') === 0 ? null : E.batchById(k);
          var overdue = U.sum(cs, function (c) { return +c.overdueAmount; });
          var recovered = U.sum(cs, function (c) { return wf.collection.recovered(c); });
          var recoveredMonth = U.sum(cs, function (c) { return U.sum((c.payments || []).filter(function (p) { return inMonth(p.at, m); }), function (p) { return p.amount; }); });
          var promises = [].concat.apply([], cs.map(function (c) { return c.promises || []; }));
          var resolved = promises.filter(function (p) { return p.status !== 'pending'; });
          return {
            key: k, batchRef: b ? b.ref : null, batchName: b ? b.name : null, entityName: E.entityById(cs[0].entityId).name,
            cases: cs.length, open: cs.filter(function (c) { return !wf.isTerminal(c.status); }).length,
            overdue: overdue, recovered: recovered, recoveredMonth: recoveredMonth,
            recoveryRate: overdue ? recovered / overdue : null,
            ptpTotal: promises.length, ptpKept: promises.filter(function (p) { return p.status === 'kept'; }).length,
            ptpConversion: resolved.length ? resolved.filter(function (p) { return p.status === 'kept'; }).length / resolved.length : null
          };
        }).sort(function (x, y) { return y.overdue - x.overdue; });
      });
    },
    adminOverview: function () {
      return E.run(function () {
        E.requireRole(['platform_admin', 'platform_qa']);
        var db = E.db(), now = E.now(), month = U.monthKey(now);
        var gmvMonth = U.sum(db.invoices.filter(function (i) { return i.month === month; }), function (i) { return U.sum(i.lines, lineAmount); });
        var gmvTotal = U.sum(db.invoices, function (i) { return U.sum(i.lines, lineAmount); });
        var byStatus = { investigation: {}, collection: {} };
        db.cases.forEach(function (c) { byStatus[c.service][c.status] = (byStatus[c.service][c.status] || 0) + 1; });
        var verified = db.providers.filter(function (p) { return p.verification.status === 'verified'; });
        var ranked = verified.map(function (p) { return { id: p.id, name: p.name, kind: p.kind, score: db.scores[p.id] ? db.scores[p.id].overall : null, enforcement: p.enforcement.level }; })
          .filter(function (p) { return p.score != null; }).sort(function (a, b) { return b.score - a.score; });
        var months = monthsBack(3, now);
        return {
          gmvMonth: gmvMonth, gmvTotal: gmvTotal,
          platformRevenueMonth: U.sum(db.invoices.filter(function (i) { return i.month === month; }), function (i) { return U.sum(i.lines, lineAmount) * i.platformFeePct / 100; }),
          byStatus: byStatus,
          breachedNow: db.cases.filter(function (c) { return wf.sla.state(c, now) === 'breached'; }).length,
          atRiskNow: db.cases.filter(function (c) { return wf.sla.state(c, now) === 'at_risk'; }).length,
          missedTotal: db.cases.filter(function (c) { return c.onTime === false; }).length,
          activeEntities: db.entities.filter(function (e) { return db.cases.some(function (c) { return c.entityId === e.id && !wf.isTerminal(c.status); }); }).length,
          totalEntities: db.entities.length,
          activeProviders: verified.filter(function (p) { return p.enforcement.level !== 'suspended'; }).length,
          suspendedProviders: verified.filter(function (p) { return p.enforcement.level === 'suspended'; }).length,
          pendingApplications: db.providers.filter(function (p) { return p.verification.status === 'pending' || p.verification.status === 'info_requested'; }).length,
          openDisputes: db.disputes.filter(function (d) { return d.status === 'open'; }).length,
          qaQueue: db.cases.filter(function (c) { return c.status === 'submitted_for_review' && E.providerById(c.providerId).kind === 'freelancer'; }).length,
          flaggedRatings: db.ratings.filter(function (r) { return r.flagged; }).length,
          top: ranked.slice(0, 3), bottom: ranked.slice(-3).reverse(),
          gmvSeries: months.map(function (m) { return { month: m, gmv: U.sum(db.invoices.filter(function (i) { return i.month === m; }), function (i) { return U.sum(i.lines, lineAmount); }) }; })
        };
      });
    },
    navCounts: function (service) {
      return E.run(function () {
        var a = E.actor(), db = E.db(), c = {};
        if (wf.isEntityRole(a.role)) {
          var cases = db.cases.filter(function (x) { return x.entityId === a.entityId && wf.entityServes(a.role, x.service); });
          var batches = db.batches.filter(function (b) {
            if (b.entityId !== a.entityId || !wf.entityServes(a.role, b.service)) return false;
            return wf.batch.needsRating(b, b.caseIds.map(function (id) { return E.caseById(id); }));
          });
          c.pendingRatings = cases.filter(function (x) { return x.status === 'closed' && !x.ratingId && !x.batchId && x.providerId; }).length + batches.length;
          c.entityAttention = cases.filter(function (x) { return ['delivered', 'awaiting_entity_approval', 'declined', 'expired'].indexOf(x.status) >= 0; }).length;
        } else if (a.providerId && wf.PROVIDER_MANAGER_ROLES.indexOf(a.role) >= 0) {
          var p = E.providerById(a.providerId);
          c.offers = db.offers.filter(function (o) { return o.providerId === p.id && o.status === 'pending' && (!service || o.service === service); }).length;
          var mine = db.cases.filter(function (x) { return x.providerId === p.id && (!service || x.service === service); });
          c.unassigned = mine.filter(function (x) { return x.status === 'accepted' || x.status === 'rework_requested'; }).length;
          c.review = p.kind === 'company' ? mine.filter(function (x) { return x.status === 'submitted_for_review'; }).length : 0;
          c.clientPending = db.cases.filter(function (x) {
            return x.providerId === p.id && x.status === 'closed' && !x.batchId && E.now() - x.closedAt < 60 * U.DAY && !db.clientRatings.some(function (r) { return r.caseId === x.id; });
          }).length;
        }
        if (a.agentId) c.returned = db.cases.filter(function (x) { return x.agentId === a.agentId && x.status === 'returned_to_agent'; }).length;
        if (a.role === 'platform_admin' || a.role === 'platform_qa') {
          c.onboarding = db.providers.filter(function (p) { return p.verification.status === 'pending' || p.verification.status === 'info_requested'; }).length;
          c.qa = db.cases.filter(function (x) { return x.status === 'submitted_for_review' && E.providerById(x.providerId).kind === 'freelancer'; }).length;
          c.disputes = db.disputes.filter(function (d) { return d.status === 'open'; }).length;
          c.flagged = db.ratings.filter(function (r) { return r.flagged; }).length;
        }
        return c;
      });
    },
    agentPerformance: function () {
      return E.run(function () {
        var a = E.actor(), db = E.db(), now = E.now();
        if (!a.agentId) throw new Err('errors.forbidden');
        var cases = db.cases.filter(function (c) { return c.agentId === a.agentId; });
        var delivered = cases.filter(function (c) { return c.firstDeliveredAt; });
        var submitted = cases.filter(function (c) { return c.reportSubmittedAt; });
        var month = U.monthKey(now);
        var col = cases.filter(function (c) { return c.service === 'collection'; });
        var promises = [].concat.apply([], col.map(function (c) { return c.promises || []; }));
        return {
          open: cases.filter(function (c) { return !wf.isTerminal(c.status) && ['delivered', 'accepted_by_entity'].indexOf(c.status) < 0; }).length,
          completedThisMonth: delivered.filter(function (c) { return inMonth(c.firstDeliveredAt, month); }).length + col.filter(function (c) { return c.status === 'closed' && inMonth(c.closedAt, month); }).length,
          delivered: delivered.length,
          onTimeRate: delivered.length ? delivered.filter(function (c) { return c.onTime; }).length / delivered.length : null,
          returnRate: submitted.length ? submitted.filter(function (c) { return c.returnCount > 0; }).length / submitted.length : null,
          evidenceRate: delivered.length ? delivered.filter(function (c) { return c.evidenceComplete; }).length / delivered.length : null,
          avgDistanceM: delivered.length ? Math.round(U.avg(delivered.filter(function (c) { return c.checkIn; }), function (c) { return c.checkIn.distanceM; }) || 0) : null,
          collected: U.sum(col, function (c) { return wf.collection.recovered(c); }),
          collectedThisMonth: U.sum(col, function (c) { return U.sum((c.payments || []).filter(function (p) { return inMonth(p.at, month); }), function (p) { return p.amount; }); }),
          promisesKept: promises.filter(function (p) { return p.status === 'kept'; }).length,
          promisesBroken: promises.filter(function (p) { return p.status === 'broken'; }).length,
          isFreelancer: a.role === 'freelancer'
        };
      });
    }
  };
})();
