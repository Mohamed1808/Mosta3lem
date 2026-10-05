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
  /**
   * The client's billing (invoices, spending totals, paying) is for its Admin only. Other
   * roles still see each case's price, which they need to choose a provider.
   */
  function seesClientMoney(a) { return a && a.role === 'entity_admin'; }

  S.billing = {
    invoices: function () {
      return E.run(function () {
        var a = E.actor();
        return E.db().invoices.filter(function (i) {
          if (wf.isPlatformRole(a.role)) return wf.can(a.role, 'billing.view');
          if (wf.isEntityRole(a.role)) return seesClientMoney(a) && i.entityId === a.entityId;
          // Invoices show the whole company's billing: the owner or the individual provider only.
          if (a.providerId) return i.providerId === a.providerId && D.moneyScope(E.db(), a).all === true;
          return false;
        }).map(withTotals).sort(function (x, y) { return y.month.localeCompare(x.month) || x.providerName.localeCompare(y.providerName); });
      });
    },
    /** The client's Admin records paying it, or Finance records the payment received. */
    markPaid: function (id) {
      return E.mutate(function (db) {
        var a = E.actor();
        var finance = wf.isPlatformRole(a.role) && wf.can(a.role, 'billing.pay');
        if (!seesClientMoney(a) && !finance) throw new Err('errors.forbidden');
        var inv = E.invoiceById(id);
        if (!inv || (!finance && inv.entityId !== a.entityId)) throw new Err('errors.forbidden');
        if (inv.status !== 'issued') throw new Err('errors.invoiceNotIssued');
        inv.status = 'paid'; inv.paidAt = E.now(); inv.paidBy = { name: a.name, side: finance ? 'platform' : 'client' };
        E.audit('invoice.paid', 'invoice', inv.id, inv.ref, { status: 'issued' }, { status: 'paid' }, null, a);
        E.notify(D.providerUsers(db, inv.providerId, ['provider_admin', 'freelancer']), 'notif.invoice_paid', { ref: inv.ref }, 'provider:earnings');
        return withTotals(inv);
      });
    },
    issue: function (id) {
      return E.mutate(function (db) {
        var a = E.requirePermission('billing.issue');
        var inv = E.invoiceById(id);
        if (!inv || inv.status !== 'draft') throw new Err('errors.invoiceNotDraft');
        if (!inv.lines.length) throw new Err('errors.invoiceEmpty');
        inv.status = 'issued'; inv.issuedAt = E.now();
        E.audit('invoice.issued', 'invoice', inv.id, inv.ref, { status: 'draft' }, { status: 'issued' }, null, a);
        E.notify(db.users.filter(function (u) { return u.entityId === inv.entityId && seesClientMoney(u); }), 'notif.invoice_issued', { ref: inv.ref }, 'entity:invoices');
        return withTotals(inv);
      });
    },
    /**
     * Finance changes what one case is billed on an unpaid invoice: pct of the amount (0 to
     * 100), with a reason. Both the client's Admin and the provider's owner are told.
     */
    adjustLine: function (invoiceId, caseId, pct, reason) {
      return E.mutate(function (db) {
        var a = E.requirePermission('billing.adjust');
        var inv = E.invoiceById(invoiceId);
        if (!inv) throw new Err('errors.notFound');
        if (inv.status === 'paid') throw new Err('errors.invoicePaid');
        var line = inv.lines.filter(function (l) { return l.caseId === caseId; })[0];
        if (!line) throw new Err('errors.notFound');
        pct = +pct;
        if (!(pct >= 0 && pct <= 100)) throw new Err('errors.pctRange');
        if (!String(reason || '').trim()) throw new Err('wf.err.reasonRequired');
        var before = line.adjustment == null ? 1 : line.adjustment;
        line.adjustment = pct / 100;
        line.adjustReason = String(reason).trim();
        line.adjustedBy = a.name;
        line.adjustedAt = E.now();
        E.audit('invoice.line_adjusted', 'invoice', inv.id, inv.ref, { caseRef: line.caseRef, pct: Math.round(before * 100) }, { caseRef: line.caseRef, pct: pct }, reason, a);
        var who = db.users.filter(function (u) { return u.active !== false && ((u.entityId === inv.entityId && u.role === 'entity_admin') || (u.providerId === inv.providerId && ['provider_admin', 'freelancer'].indexOf(u.role) >= 0)); });
        E.notify(who, 'notif.invoice_adjusted', { ref: inv.ref, caseRef: line.caseRef, pct: pct }, 'entity:invoices');
        return withTotals(inv);
      });
    },

    // ---- the platform fee: Finance and Management decide together (wf.DUAL_APPROVAL)
    /** The current fee, a change waiting for the second team, and past changes. */
    fee: function () {
      return E.run(function () {
        E.requirePermission('billing.view');
        var c = E.db().config;
        return { pct: c.pricing.platformFeePct, proposal: c.feeProposal || null, history: (c.feeHistory || []).slice().reverse() };
      });
    },
    proposeFee: function (pct, note) {
      return E.mutate(function (db) {
        var a = E.requirePermission('fee.change');
        if (db.config.feeProposal) throw new Err('errors.decisionPending');
        pct = +pct;
        if (!(pct >= 0 && pct <= 50)) throw new Err('errors.feeRange');
        if (pct === db.config.pricing.platformFeePct) throw new Err('errors.feeUnchanged');
        if (!String(note || '').trim()) throw new Err('wf.err.reasonRequired');
        db.config.feeProposal = { pct: pct, from: db.config.pricing.platformFeePct, note: String(note).trim(), by: a.userId, byName: a.name, role: a.role, at: E.now() };
        E.audit('config.fee_change_proposed', 'config', 'pricing', null, { pct: db.config.pricing.platformFeePct }, { pct: pct }, note, a);
        E.notify(E.secondApprovers(a, 'fee.change'), 'notif.fee_change_pending', { pct: pct }, 'admin:finance');
        return db.config.feeProposal;
      });
    },
    /** The other team confirms: invoices opened from now on use the new fee. */
    confirmFee: function () {
      return E.mutate(function (db) {
        var a = E.requirePermission('fee.change');
        var p = db.config.feeProposal;
        if (!p) throw new Err('errors.noDecisionPending');
        var err = E.secondApproval(p, a, 'fee.change');
        if (err) throw new Err(err.key, err.params);
        var before = db.config.pricing.platformFeePct;
        db.config.pricing = Object.assign({}, db.config.pricing, { platformFeePct: p.pct });
        db.config.feeHistory = (db.config.feeHistory || []).concat([{ from: before, to: p.pct, note: p.note, proposedBy: p.byName, proposedRole: p.role, proposedAt: p.at, confirmedBy: a.name, confirmedRole: a.role, confirmedAt: E.now() }]);
        db.config.feeProposal = null;
        E.audit('config.fee_changed', 'config', 'pricing', null, { pct: before }, { pct: p.pct }, p.note, a);
        E.notify(E.staffWith('fee.change'), 'notif.fee_changed', { pct: p.pct }, 'admin:finance');
        E.notify(db.users.filter(function (u) { return u.active !== false && ['provider_admin', 'freelancer'].indexOf(u.role) >= 0; }), 'notif.platform_fee_changed', { pct: p.pct }, 'provider:earnings');
        return { pct: p.pct };
      });
    },
    sendBackFee: function (note) {
      return E.mutate(function (db) {
        var a = E.requirePermission('fee.change');
        var p = db.config.feeProposal;
        if (!p) throw new Err('errors.noDecisionPending');
        if (!String(note || '').trim()) throw new Err('wf.err.reasonRequired');
        var err = E.secondApproval(p, a, 'fee.change');
        if (err) throw new Err(err.key, err.params);
        db.config.feeHistory = (db.config.feeHistory || []).concat([{ from: p.from, to: p.pct, note: p.note, proposedBy: p.byName, proposedRole: p.role, proposedAt: p.at, sentBackBy: a.name, sentBackRole: a.role, sentBackNote: String(note).trim(), sentBackAt: E.now() }]);
        db.config.feeProposal = null;
        E.audit('config.fee_change_sent_back', 'config', 'pricing', null, null, null, note, a);
        var proposer = E.userById(p.by);
        if (proposer) E.notify([proposer], 'notif.fee_change_sent_back', { pct: p.pct }, 'admin:finance');
        return null;
      });
    },

    /**
     * Earnings per closed case, after the platform fee, following the team structure: the
     * owner and an individual provider see everything, a supervisor sees the cases of their
     * own agents (scope: 'team'), field agents see no money (use myWork). byAgent breaks the
     * totals down per field agent for owners and supervisors.
     */
    earnings: function (service) {
      return E.run(function () {
        var a = E.actor(), db = E.db();
        var scope = D.moneyScope(db, a);
        if (scope.none) throw new Err('errors.forbidden');
        var month = U.monthKey(E.now());
        var rows = [];
        db.invoices.filter(function (i) { return i.providerId === a.providerId; }).forEach(function (inv) {
          inv.lines.forEach(function (l) {
            if (service && l.service !== service) return;
            var c = E.caseById(l.caseId);
            if (!D.caseInMoneyScope(scope, c)) return;
            var ag = c && c.agentId ? E.agentById(c.agentId) : null;
            var gross = lineAmount(l), fee = U.round(gross * inv.platformFeePct / 100, 0);
            rows.push({ caseId: l.caseId, caseRef: l.caseRef, service: l.service, closedAt: l.closedAt, entityName: E.entityById(inv.entityId).name, invoiceRef: inv.ref, month: inv.month, gross: gross, fee: fee, net: gross - fee, payout: PAYOUT[inv.status], adjusted: l.adjustment != null && l.adjustment !== 1, agentId: ag ? ag.id : null, agentName: ag ? ag.name : null });
          });
        });
        rows.sort(function (x, y) { return y.closedAt - x.closedAt; });
        function tot(f) { return U.sum(rows.filter(f), function (r) { return r.net; }); }
        var p = E.providerById(a.providerId);
        var byAgent = [];
        if (p.kind === 'company') {
          var groups = U.groupBy(rows, function (r) { return r.agentId || ''; });
          byAgent = Object.keys(groups).map(function (id) {
            var rs = groups[id], ag = id ? E.agentById(id) : null, sup = ag && ag.supervisorId ? E.userById(ag.supervisorId) : null;
            return {
              agentId: id || null, name: ag ? ag.name : null, owner: !!(ag && ag.owner), supervisorName: sup ? sup.name : null,
              cases: rs.length, casesThisMonth: rs.filter(function (r) { return r.month === month; }).length,
              net: U.sum(rs, function (r) { return r.net; }), netThisMonth: U.sum(rs.filter(function (r) { return r.month === month; }), function (r) { return r.net; })
            };
          }).sort(function (x, y) { return y.netThisMonth - x.netThisMonth || y.net - x.net; });
        }
        return {
          scope: scope.all ? 'all' : 'team',
          rows: rows,
          byAgent: byAgent,
          thisMonthGross: U.sum(rows.filter(function (r) { return r.month === month; }), function (r) { return r.gross; }),
          thisMonthNet: tot(function (r) { return r.month === month; }),
          accruing: tot(function (r) { return r.payout === 'accruing'; }),
          pending: tot(function (r) { return r.payout === 'pending'; }),
          paidOut: tot(function (r) { return r.payout === 'paid_out'; }),
          feePct: db.config.pricing.platformFeePct
        };
      });
    },
    /**
     * A field agent's completed work, without any amounts: how many cases they finished this
     * month and in total, and each case with its status. Also for owners who do field work.
     */
    myWork: function (service) {
      return E.run(function () {
        var a = E.actor(), now = E.now();
        if (!a.agentId) throw new Err('errors.forbidden');
        var month = U.monthKey(now);
        var DONE = ['delivered', 'awaiting_entity_approval', 'accepted_by_entity', 'closed'];
        var rows = E.db().cases.filter(function (c) {
          if (c.agentId !== a.agentId || (service && c.service !== service)) return false;
          return DONE.indexOf(c.status) >= 0;
        }).map(function (c) {
          var at = c.closedAt || c.firstDeliveredAt || c.deliveredAt || c.updatedAt || c.createdAt;
          return { caseId: c.id, caseRef: c.ref, service: c.service, status: c.status, doneAt: at, month: U.monthKey(at), entityName: E.entityById(c.entityId).name, onTime: c.onTime == null ? null : !!c.onTime, inquiryTypes: c.inquiryTypes || null };
        }).sort(function (x, y) { return y.doneAt - x.doneAt; });
        var open = E.db().cases.filter(function (c) { return c.agentId === a.agentId && !wf.isTerminal(c.status) && DONE.indexOf(c.status) < 0; }).length;
        var timed = rows.filter(function (r) { return r.onTime != null; });
        return {
          rows: rows, open: open,
          thisMonth: rows.filter(function (r) { return r.month === month; }).length,
          total: rows.length,
          closed: rows.filter(function (r) { return r.status === 'closed'; }).length,
          onTimeRate: timed.length ? timed.filter(function (r) { return r.onTime; }).length / timed.length : null
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
          recoveredThisMonth: k.recoveredThisMonth, avgTurnaroundHours: k.avgTurnaroundHours, spendThisMonth: seesClientMoney(a) ? spend : null,
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
            spend: seesClientMoney(a) ? spend : null,
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
        // Earnings follow the team structure: company for the owner, own team for a supervisor, none for agents.
        var scope = D.moneyScope(db, a);
        var earnings = scope.none ? null : U.sum(db.invoices.filter(function (i) { return i.providerId === p.id && i.month === month; }), function (i) {
          return U.sum(i.lines.filter(function (l) { return l.service === service && D.caseInMoneyScope(scope, E.caseById(l.caseId)); }), function (l) { return lineAmount(l) * (1 - i.platformFeePct / 100); });
        });
        var out = {
          provider: { id: p.id, name: p.name, kind: p.kind, enforcement: p.enforcement },
          newOffers: db.offers.filter(function (o) { return o.providerId === p.id && o.service === service && o.status === 'pending'; }).length,
          open: running.length + cases.filter(function (c) { return c.status === 'delivered'; }).length,
          dueToday: running.filter(function (c) { return c.dueAt && c.dueAt <= endToday; }).length,
          atRisk: k.atRisk, breached: k.breached,
          score: sc || null, earningsThisMonth: earnings == null ? null : U.round(earnings, 0), earningsScope: scope.all ? 'all' : scope.none ? 'none' : 'team',
          reviewQueue: service === 'investigation' ? cases.filter(function (c) { return c.status === 'submitted_for_review' && p.kind === 'company' && !wf.reviewedByQa(c, { provider: p }); }).length : 0,
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
    /**
     * Platform report for Management and Data: totals only, never customer details.
     * Six months of volume and timeliness, and figures per service, provider, client and
     * governorate. Money only for teams that see billing.
     */
    platformReport: function () {
      return E.run(function () {
        var a = E.requirePermission('reports.view'), db = E.db(), now = E.now();
        var money = wf.can(a.role, 'billing.view');
        var cases = db.cases.filter(function (c) { return c.status !== 'draft'; });
        var rate = function (cs) { var d = cs.filter(function (c) { return c.onTime != null; }); return d.length ? d.filter(function (c) { return c.onTime; }).length / d.length : null; };
        var months = monthsBack(6, now).map(function (m) {
          var made = cases.filter(function (c) { return inMonth(c.createdAt, m); });
          var closed = cases.filter(function (c) { return c.status === 'closed' && inMonth(c.closedAt, m); });
          return { month: m, created: made.length, closed: closed.length, onTime: rate(closed),
            gmv: money ? U.sum(db.invoices.filter(function (i) { return i.month === m; }), function (i) { return U.sum(i.lines, lineAmount); }) : null };
        });
        var by = function (key, label) {
          var g = U.groupBy(cases.filter(function (c) { return key(c); }), key);
          return Object.keys(g).map(function (k) { var cs = g[k]; return { id: k, name: label(k), cases: cs.length, open: cs.filter(function (c) { return !wf.isTerminal(c.status); }).length, onTime: rate(cs) }; })
            .sort(function (x, y) { return y.cases - x.cases; });
        };
        return {
          months: months,
          services: ['investigation', 'collection'].map(function (s) { var cs = cases.filter(function (c) { return c.service === s; }); return { id: s, cases: cs.length, open: cs.filter(function (c) { return !wf.isTerminal(c.status); }).length, onTime: rate(cs) }; }),
          providers: by(function (c) { return c.providerId; }, function (k) { var p = E.providerById(k); return p ? p.name : k; }).map(function (r) { r.score = db.scores[r.id] ? db.scores[r.id].overall : null; return r; }),
          clients: by(function (c) { return c.entityId; }, function (k) { var e = E.entityById(k); return e ? e.name : k; }),
          governorates: by(function (c) { return D.caseGov(c); }, function (k) { return k; })
        };
      });
    },
    /** The platform at a glance for staff. Money figures only for teams that see billing. */
    adminOverview: function () {
      return E.run(function () {
        var staff = E.requirePermission('overview');
        var money = wf.can(staff.role, 'billing.view');
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
          gmvMonth: money ? gmvMonth : null, gmvTotal: money ? gmvTotal : null,
          platformRevenueMonth: money ? U.sum(db.invoices.filter(function (i) { return i.month === month; }), function (i) { return U.sum(i.lines, lineAmount) * i.platformFeePct / 100; }) : null,
          byStatus: byStatus,
          breachedNow: db.cases.filter(function (c) { return wf.sla.state(c, now) === 'breached'; }).length,
          atRiskNow: db.cases.filter(function (c) { return wf.sla.state(c, now) === 'at_risk'; }).length,
          missedTotal: db.cases.filter(function (c) { return c.onTime === false; }).length,
          activeEntities: db.entities.filter(function (e) { return db.cases.some(function (c) { return c.entityId === e.id && !wf.isTerminal(c.status); }); }).length,
          totalEntities: db.entities.length,
          activeProviders: verified.filter(function (p) { return p.enforcement.level !== 'suspended'; }).length,
          suspendedProviders: verified.filter(function (p) { return p.enforcement.level === 'suspended'; }).length,
          pendingApplications: db.providers.filter(function (p) { return wf.applicationOpen(p.verification.status); }).length,
          openDisputes: db.disputes.filter(function (d) { return d.status === 'open'; }).length,
          qaQueue: db.cases.filter(function (c) { return c.status === 'submitted_for_review' && wf.reviewedByQa(c, { provider: E.providerById(c.providerId) }); }).length,
          flaggedRatings: db.ratings.filter(function (r) { return r.flagged; }).length,
          top: ranked.slice(0, 3), bottom: ranked.slice(-3).reverse(),
          gmvSeries: money ? months.map(function (m) { return { month: m, gmv: U.sum(db.invoices.filter(function (i) { return i.month === m; }), function (i) { return U.sum(i.lines, lineAmount); }) }; }) : null
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
          c.review = p.kind === 'company' ? mine.filter(function (x) { return x.status === 'submitted_for_review' && !wf.reviewedByQa(x, { provider: p }) && D.caseInTeamScope(db, a, x); }).length : 0;
          c.clientPending = db.cases.filter(function (x) {
            return x.providerId === p.id && x.status === 'closed' && !x.batchId && E.now() - x.closedAt < 60 * U.DAY && !db.clientRatings.some(function (r) { return r.caseId === x.id; });
          }).length;
          c.openDisputes = db.disputes.filter(function (d) { return d.providerId === p.id && d.status === 'open'; }).length;
        }
        if (a.agentId) c.returned = db.cases.filter(function (x) { return x.agentId === a.agentId && x.status === 'returned_to_agent'; }).length;
        if (wf.isPlatformRole(a.role)) {
          // Badges only for the work the person's team does.
          if (wf.can(a.role, 'providers.approve') || wf.can(a.role, 'providers.signoff')) c.onboarding = db.providers.filter(function (p) { return wf.applicationOpen(p.verification.status); }).length;
          if (wf.can(a.role, 'qa.review')) c.qa = db.cases.filter(function (x) { return x.status === 'submitted_for_review' && wf.reviewedByQa(x, { provider: E.providerById(x.providerId) }); }).length;
          if (wf.can(a.role, 'disputes.view')) c.disputes = db.disputes.filter(function (d) { return d.status === 'open'; }).length;
          if (a.role === 'platform_admin') c.flagged = db.ratings.filter(function (r) { return r.flagged; }).length;
          if (wf.can(a.role, 'cases.manage')) c.late = db.cases.filter(function (x) { return wf.sla.state(x, E.now()) === 'breached'; }).length;
          if (wf.can(a.role, 'billing.issue')) {
            var thisMonth = U.monthKey(E.now());
            c.toIssue = db.invoices.filter(function (i) { return i.status === 'draft' && i.month < thisMonth && i.lines.length; }).length + (db.config.feeProposal ? 1 : 0);
          }
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
          avgDistanceM: delivered.some(function (c) { return c.checkIn && c.checkIn.distanceM != null; }) ? Math.round(U.avg(delivered.filter(function (c) { return c.checkIn && c.checkIn.distanceM != null; }), function (c) { return c.checkIn.distanceM; }) || 0) : null,
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
