/* Collection case state machine plus the pure operations that happen while a case is
   Active (action log, promises to pay, payments).

   Draft -> Submitted -> Awaiting Provider Acceptance -> Declined / Expired (entity reselects)
         -> Accepted (full data released) -> Assigned -> Active
   While Active: log actions, promises and payments; Settlement Request -> Awaiting Entity
   Approval -> Approved / Rejected -> Active. Broken promises are flagged by the clock.
   -> Closed with outcome. Also Recalled by Entity, Cancelled (admin), Disputed flag. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});
  var U = ICM.util;

  var ENTITY = wf.ENTITY_ROLES;
  var MANAGERS = wf.PROVIDER_MANAGER_ROLES;
  var WORKERS = ['agent', 'freelancer', 'provider_admin', 'provider_supervisor'];
  var CLOSERS = ['provider_admin', 'provider_supervisor', 'freelancer'];

  var OPEN = ['draft', 'submitted', 'awaiting_acceptance', 'declined', 'expired', 'accepted', 'assigned', 'active', 'awaiting_entity_approval'];

  function recovered(c) { return U.sum(c.payments || [], function (p) { return +p.amount; }); }
  function target(c) { return c.settledTarget != null ? c.settledTarget : +c.overdueAmount; }
  function outstanding(c) { return Math.max(0, U.round(target(c) - recovered(c), 2)); }

  var defs = wf.offerDefs(ENTITY, MANAGERS).map(function (d) {
    if (d.action !== 'submit') return d;
    return Object.assign({}, d, {
      effect: function (n, p, a, ctx) { n.submittedAt = ctx.now; n.dueAt = n.periodEnd || n.dueAt; }
    });
  }).concat([
    { action: 'assign', from: ['accepted', 'assigned'], to: 'assigned', roles: ['provider_admin', 'provider_supervisor', 'freelancer'],
      guard: function (c, a, p) { return p.agentId ? null : 'wf.err.agentRequired'; },
      effect: function (n, p, a, ctx) { n.agentId = p.agentId; n.assignedAt = ctx.now; } },
    { action: 'start', from: ['assigned'], to: 'active', roles: WORKERS,
      effect: function (n, p, a, ctx) { n.activeAt = ctx.now; } },
    { action: 'request_settlement', from: ['active'], to: 'awaiting_entity_approval', roles: WORKERS,
      guard: function (c, a, p) {
        var auth = c.settlementAuthority || { mode: 'none' };
        if (!p.kind) return 'wf.err.settlementKind';
        if (auth.mode === 'none') return 'wf.err.noSettlementAuthority';
        if (p.kind !== auth.mode) return 'wf.err.settlementKindNotAllowed';
        if (p.kind === 'discount') {
          if (!(+p.discountPct > 0)) return 'wf.err.discountRequired';
          if (+p.discountPct > +auth.maxDiscountPct) return 'wf.err.discountAboveAuthority';
        }
        if (p.kind === 'instalments' && !(+p.instalmentCount >= 2)) return 'wf.err.instalmentsRequired';
        if (!p.note) return 'wf.err.reasonRequired';
        return null;
      },
      effect: function (n, p, a, ctx) {
        n.settlements = (n.settlements || []).concat([{
          id: p.id || U.uid('st'), kind: p.kind, discountPct: p.kind === 'discount' ? +p.discountPct : null,
          instalmentCount: p.kind === 'instalments' ? +p.instalmentCount : null,
          note: p.note, status: 'pending', requestedAt: ctx.now, requestedBy: a.userId, requestedByName: a.name,
          outstandingAtRequest: outstanding(n)
        }]);
      } },
    { action: 'approve_settlement', from: ['awaiting_entity_approval'], to: 'active', roles: ENTITY,
      effect: function (n, p, a, ctx) {
        n.settlements = (n.settlements || []).map(function (s) {
          if (s.status !== 'pending') return s;
          var s2 = Object.assign({}, s, { status: 'approved', decidedAt: ctx.now, decidedBy: a.userId, decidedByName: a.name, decisionNote: p.note || null });
          if (s.kind === 'discount') n.settledTarget = U.round(+n.overdueAmount * (1 - s.discountPct / 100), 0);
          if (s.kind === 'instalments') {
            var rest = outstanding(n);
            n.instalmentPlan = { count: s.instalmentCount, amount: Math.ceil(rest / s.instalmentCount), approvedAt: ctx.now };
          }
          return s2;
        });
      } },
    { action: 'reject_settlement', from: ['awaiting_entity_approval'], to: 'active', roles: ENTITY,
      guard: function (c, a, p) { return p.reason ? null : 'wf.err.reasonRequired'; },
      effect: function (n, p, a, ctx) {
        n.settlements = (n.settlements || []).map(function (s) {
          return s.status === 'pending' ? Object.assign({}, s, { status: 'rejected', decidedAt: ctx.now, decidedBy: a.userId, decidedByName: a.name, decisionNote: p.reason }) : s;
        });
      } },
    { action: 'close', from: ['active'], to: 'closed', roles: CLOSERS,
      guard: function (c, a, p) {
        if (ICM.config.COLLECTION_OUTCOMES.indexOf(p.outcome) < 0) return 'wf.err.outcomeRequired';
        var out = outstanding(c), rec = recovered(c);
        if (p.outcome === 'fully_recovered' && out > 0) return 'wf.err.balanceNotZero';
        if (p.outcome === 'partially_recovered' && (rec <= 0 || out <= 0)) return 'wf.err.partialNeedsPayment';
        if ((p.outcome === 'returned_to_entity' || p.outcome === 'unrecoverable') && !p.reason) return 'wf.err.reasonRequired';
        return null;
      },
      effect: function (n, p, a, ctx) {
        n.closedAt = ctx.now;
        n.outcome = p.outcome;
        n.outcomeReason = p.reason || null;
        n.onTime = !n.dueAt || ctx.now <= U.endOfDay(n.dueAt);
        n.recoveredAtClose = recovered(n);
      } },
    { action: 'recall', from: ['accepted', 'assigned', 'active', 'awaiting_entity_approval'], to: 'recalled', roles: ENTITY,
      guard: function (c, a, p) { return p.reason ? null : 'wf.err.reasonRequired'; },
      effect: function (n, p, a, ctx) { n.closedAt = ctx.now; n.recallReason = p.reason; } },
    wf.cancelDef(OPEN, ENTITY),
    wf.forceReassignDef(OPEN)
  ]);

  var M = wf.createMachine('collection', defs);
  M.OPEN = OPEN;
  M.recovered = recovered;
  M.target = target;
  M.outstanding = outstanding;

  // ---------------- Operations while active ----------------

  /** Can this actor log work on the case? Assigned cases are started automatically. */
  M.checkOperate = function (c, actor) {
    if (c.service !== 'collection') return 'wf.err.wrongService';
    if (['assigned', 'active', 'awaiting_entity_approval'].indexOf(c.status) < 0) return 'wf.err.invalidState';
    if (WORKERS.indexOf(actor.role) < 0) return 'wf.err.role';
    if (!wf.relates(c, actor)) return 'wf.err.notOwner';
    return null;
  };

  var ALLOWED_BY = { call: 'calls', sms: 'messages', whatsapp: 'messages', field_visit: 'visits' };

  function ensureActive(c, actor, now) {
    if (c.status === 'assigned') return M.apply(c, 'start', actor, {}, { now: now });
    return c;
  }
  function fail(key) { throw new wf.WorkflowError(key); }

  M.logAction = function (c, actor, now, p) {
    var e = M.checkOperate(c, actor); if (e) fail(e);
    if (!p.type) fail('wf.err.actionTypeRequired');
    var perm = ALLOWED_BY[p.type];
    if (perm && !(c.allowedActions || {})[perm]) fail('wf.err.actionNotAllowed');
    if (p.type === 'field_visit' && !p.checkIn) fail('wf.err.checkInRequired');
    var n = ensureActive(c, actor, now);
    var entry = { id: p.id || U.uid('ac'), type: p.type, at: now, by: actor.userId, byName: actor.name, note: p.note || '', checkIn: p.checkIn || null };
    n = Object.assign({}, n, { actions: (n.actions || []).concat([entry]) });
    return wf.withEntry(n, actor, now, 'log_action', { data: { type: p.type }, note: p.note || undefined });
  };

  M.addPromise = function (c, actor, now, p) {
    var e = M.checkOperate(c, actor); if (e) fail(e);
    if (!(+p.amount > 0)) fail('wf.err.amountRequired');
    var due = typeof p.dueDate === 'number' ? p.dueDate : new Date(p.dueDate).getTime();
    if (!due || U.endOfDay(due) < now) fail('wf.err.promiseDatePast');
    var n = ensureActive(c, actor, now);
    var promise = { id: p.id || U.uid('ptp'), amount: +p.amount, dueDate: U.endOfDay(due), createdAt: now, by: actor.userId, byName: actor.name, note: p.note || '', status: 'pending' };
    n = Object.assign({}, n, { promises: (n.promises || []).concat([promise]) });
    return wf.withEntry(n, actor, now, 'promise_to_pay', { data: { amount: promise.amount, dueDate: promise.dueDate } });
  };

  /** A promise is kept when payments made after it and before its due date cover it. */
  function reconcile(c) {
    var payments = c.payments || [];
    var promises = (c.promises || []).map(function (pr) {
      if (pr.status !== 'pending') return pr;
      var paid = U.sum(payments.filter(function (p) { return p.at >= pr.createdAt && p.at <= pr.dueDate; }), function (p) { return +p.amount; });
      return paid >= pr.amount ? Object.assign({}, pr, { status: 'kept' }) : pr;
    });
    return Object.assign({}, c, { promises: promises });
  }

  M.addPayment = function (c, actor, now, p) {
    var e = M.checkOperate(c, actor); if (e) fail(e);
    if (!(+p.amount > 0)) fail('wf.err.amountRequired');
    if (+p.amount > outstanding(c) + 0.001) fail('wf.err.amountAboveOutstanding');
    if (!p.method) fail('wf.err.methodRequired');
    var n = ensureActive(c, actor, now);
    var pay = { id: p.id || U.uid('pay'), amount: +p.amount, method: p.method, at: now, by: actor.userId, byName: actor.name, receipt: p.receipt || null, note: p.note || '' };
    n = Object.assign({}, n, { payments: (n.payments || []).concat([pay]) });
    n = reconcile(n);
    return wf.withEntry(n, actor, now, 'payment_recorded', { data: { amount: pay.amount, method: pay.method } });
  };

  /** Flag pending promises whose date has passed. Returns the updated case and the broken ones. */
  M.evaluatePromises = function (c, now) {
    var broken = [];
    var promises = (c.promises || []).map(function (pr) {
      if (pr.status === 'pending' && now > pr.dueDate) {
        var b = Object.assign({}, pr, { status: 'broken', brokenAt: now });
        broken.push(b);
        return b;
      }
      return pr;
    });
    if (!broken.length) return { case: c, broken: [] };
    var n = Object.assign({}, c, { promises: promises });
    broken.forEach(function (b) { n = wf.withEntry(n, wf.SYSTEM, now, 'promise_broken', { data: { amount: b.amount, dueDate: b.dueDate } }); });
    return { case: n, broken: broken };
  };

  M.reconcile = reconcile;
  wf.collection = M;
})();
