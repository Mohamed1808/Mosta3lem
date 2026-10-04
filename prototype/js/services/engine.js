/* Mock backend engine. This file plays the role a real backend would: it knows who is
   signed in, applies workflow transitions, writes timeline, audit and notification
   records, recalculates scores and runs the demo clock. Service modules build on it.
   Replace js/services/*.js with a Supabase implementation of the same contracts and
   no page needs to change. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var U = ICM.util, wf = ICM.wf, D = ICM.domain, C = ICM.config;

  function ServiceError(key, params) {
    this.name = 'ServiceError';
    this.key = key;
    this.params = params || null;
    this.message = key;
  }
  ServiceError.prototype = Object.create(Error.prototype);

  var E = {};
  E.ServiceError = ServiceError;
  E.db = function () { return ICM.store.db; };
  E.now = function () { return ICM.clock.now(); };

  // ---------------------------------------------------------------- session
  E.sessionUserId = function () {
    try { return localStorage.getItem(C.SESSION_KEY); } catch (e) { return null; }
  };
  E.setSession = function (userId) {
    try {
      if (userId) localStorage.setItem(C.SESSION_KEY, userId);
      else localStorage.removeItem(C.SESSION_KEY);
    } catch (e) { /* ignore */ }
  };
  E.currentUser = function () {
    var id = E.sessionUserId();
    if (!id) return null;
    var u = E.userById(id);
    return u && u.active !== false ? u : null;
  };
  E.actor = function () {
    var u = E.currentUser();
    if (!u) throw new ServiceError('errors.notSignedIn');
    return D.actorOf(u);
  };
  E.requireRole = function (roles) {
    var a = E.actor();
    if (roles.indexOf(a.role) < 0) throw new ServiceError('errors.forbidden');
    return a;
  };

  // ---------------------------------------------------------------- lookups
  function finder(coll) {
    return function (id) { return E.db()[coll].filter(function (x) { return x.id === id; })[0] || null; };
  }
  E.userById = finder('users');
  E.entityById = finder('entities');
  E.providerById = finder('providers');
  E.agentById = finder('agents');
  E.caseById = finder('cases');
  E.offerById = finder('offers');
  E.batchById = finder('batches');
  E.ratingById = finder('ratings');
  E.disputeById = finder('disputes');
  E.invoiceById = finder('invoices');

  E.mustCase = function (id) {
    var c = E.caseById(id);
    if (!c) throw new ServiceError('errors.notFound');
    return c;
  };

  // ---------------------------------------------------------------- results
  /** Wrap a synchronous body into a Promise and hand back a deep copy. */
  E.run = function (fn) {
    try { return Promise.resolve(U.clone(fn())); }
    catch (e) { return Promise.reject(e); }
  };
  /** Run a mutation inside a store transaction, then recalculate derived data. */
  E.mutate = function (fn) {
    return E.run(function () {
      return ICM.store.tx(function (db) {
        var r = fn(db);
        E.recalc(db);
        return r;
      });
    });
  };

  // ---------------------------------------------------------------- records
  E.notify = function (users, key, params, link) {
    var db = E.db(), now = E.now(), seen = {};
    (users || []).forEach(function (u) {
      var uid = typeof u === 'string' ? u : u && u.id;
      if (!uid || seen[uid]) return;
      seen[uid] = true;
      db.notifications.push({ id: U.uid('ntf'), userId: uid, key: key, params: params || {}, link: link || null, at: now, read: false });
    });
  };

  E.audit = function (action, targetType, targetId, targetRef, before, after, reason, actor) {
    var a = actor || (E.currentUser() ? D.actorOf(E.currentUser()) : wf.SYSTEM);
    E.db().audit.push({
      id: U.uid('aud'), at: E.now(), actorId: a.userId, actorName: a.name, actorRole: a.role,
      action: action, targetType: targetType, targetId: targetId, targetRef: targetRef || null,
      before: before == null ? null : before, after: after == null ? null : after, reason: reason || null
    });
  };

  E.ctxFor = function (c) {
    return { now: E.now(), provider: c.providerId ? E.providerById(c.providerId) : null, inquiryTypes: E.db().config.lists.inquiryTypes };
  };

  E.replaceCase = function (next) {
    var db = E.db();
    for (var i = 0; i < db.cases.length; i++) if (db.cases[i].id === next.id) { db.cases[i] = next; return next; }
    db.cases.push(next);
    return next;
  };

  // Recipient helpers
  E.entityUsers = function (c) { return D.entityUsersFor(E.db(), c); };
  E.providerManagers = function (pid) { return pid ? D.providerUsers(E.db(), pid, ['provider_admin', 'provider_supervisor', 'freelancer']) : []; };
  E.providerSupervisors = function (pid) { return pid ? D.providerUsers(E.db(), pid, ['provider_supervisor', 'freelancer']) : []; };
  E.agentUsers = function (c) { var u = c.agentId ? D.agentUser(E.db(), c.agentId) : null; return u ? [u] : []; };
  E.admins = function () { return D.platformUsers(E.db(), 'platform_admin'); };
  E.qa = function () { return D.platformUsers(E.db(), 'platform_qa'); };
  E.reviewersFor = function (c) {
    var p = E.providerById(c.providerId);
    return wf.reviewedByQa(c, { provider: p }) ? E.qa() : D.companyReviewers(E.db(), c);
  };

  /** Default notifications for each transition. Batch flows pass silent and notify themselves. */
  function notifyTransition(prev, next, action, actor, payload) {
    var link = 'case:' + next.id, ref = next.ref;
    var prov = E.providerById(next.providerId || prev.providerId);
    var provName = prov ? prov.name : '';
    switch (action) {
      case 'send_offer': E.notify(E.providerManagers(next.providerId), 'notif.offer_new', { count: 1 }, 'provider:offers'); break;
      case 'accept': E.notify(E.entityUsers(next), 'notif.offer_accepted', { ref: ref, provider: provName }, link); break;
      case 'decline': E.notify(E.entityUsers(next), 'notif.offer_declined', { ref: ref, provider: provName }, link); break;
      case 'assign': E.notify(E.agentUsers(next), 'notif.case_assigned', { ref: ref }, link); break;
      case 'submit_report': E.notify(E.reviewersFor(next), 'notif.report_submitted', { ref: ref }, link); break;
      case 'return_to_agent': E.notify(E.agentUsers(next), 'notif.report_returned', { ref: ref }, link); break;
      case 'approve': E.notify(E.entityUsers(next), 'notif.report_delivered', { ref: ref }, link); break;
      case 'request_rework': E.notify(E.providerManagers(next.providerId), 'notif.rework_requested', { ref: ref }, link); break;
      case 'accept_report': E.notify(E.providerManagers(next.providerId), 'notif.report_accepted', { ref: ref }, link); break;
      case 'close':
        if (next.service === 'collection') E.notify(E.entityUsers(next), 'notif.case_closed_outcome', { ref: ref, outcome: next.outcome }, link);
        else E.notify(E.providerManagers(next.providerId), 'notif.case_closed', { ref: ref }, link);
        break;
      case 'request_settlement': E.notify(E.entityUsers(next), 'notif.settlement_pending', { ref: ref }, link); break;
      case 'approve_settlement':
      case 'reject_settlement':
        E.notify(E.providerSupervisors(next.providerId).concat(E.agentUsers(next)), 'notif.settlement_decided', { ref: ref, decision: action === 'approve_settlement' ? 'approved' : 'rejected' }, link);
        break;
      case 'recall': E.notify(E.providerManagers(next.providerId).concat(E.agentUsers(next)), 'notif.case_recalled', { ref: ref }, link); break;
      case 'cancel':
        if (prev.providerId) E.notify(E.providerManagers(prev.providerId).concat(E.agentUsers(prev)), 'notif.case_cancelled', { ref: ref }, link);
        if (actor.role === 'platform_admin') E.notify(E.entityUsers(next), 'notif.case_cancelled', { ref: ref }, link);
        break;
      case 'force_reassign':
        E.notify(E.providerManagers(next.providerId), 'notif.offer_new', { count: 1 }, 'provider:offers');
        if (prev.providerId) E.notify(E.providerManagers(prev.providerId), 'notif.case_reassigned_away', { ref: ref }, link);
        E.notify(E.entityUsers(next), 'notif.case_reassigned', { ref: ref, provider: provName }, link);
        break;
    }
  }

  /** Apply a transition through the state machine and record everything around it. */
  E.transition = function (c, action, payload, actor, opts) {
    opts = opts || {};
    var M = wf.machineFor(c.service);
    var next = M.apply(c, action, actor, payload || {}, E.ctxFor(c));
    E.replaceCase(next);
    E.audit('case.' + action, 'case', next.id, next.ref, { status: c.status }, { status: next.status }, (payload && (payload.reason || payload.comment || payload.note)) || null, actor);
    if (!opts.silent) notifyTransition(c, next, action, actor, payload || {});
    if (next.status === 'closed' && c.status !== 'closed') E.addInvoiceLine(next);
    if (wf.isTerminal(next.status) && next.offerId) {
      var o = E.offerById(next.offerId);
      if (o && o.status === 'pending') o.status = 'withdrawn';
    }
    return next;
  };

  /** Freelancers are their own agent: accepting assigns the case to them immediately. */
  E.autoAssignFreelancer = function (c, actor) {
    var p = E.providerById(c.providerId);
    if (!p || p.kind !== 'freelancer') return c;
    var agent = E.db().agents.filter(function (a) { return a.providerId === p.id; })[0];
    if (!agent) return c;
    return E.transition(c, 'assign', { agentId: agent.id }, actor, { silent: true });
  };

  // ---------------------------------------------------------------- billing
  E.addInvoiceLine = function (c) {
    var db = E.db(), month = U.monthKey(c.closedAt || E.now());
    var inv = db.invoices.filter(function (i) { return i.entityId === c.entityId && i.providerId === c.providerId && i.month === month && i.status === 'draft'; })[0];
    if (!inv) {
      inv = { id: U.uid('inv'), ref: D.nextRef(db, 'invoice'), entityId: c.entityId, providerId: c.providerId, month: month, status: 'draft', platformFeePct: db.config.pricing.platformFeePct, lines: [], issuedAt: null, paidAt: null };
      db.invoices.push(inv);
    }
    if (inv.lines.some(function (l) { return l.caseId === c.id; })) return;
    inv.lines.push({ caseId: c.id, caseRef: c.ref, service: c.service, closedAt: c.closedAt, amount: D.billableAmount(c), adjustment: 1 });
  };

  // ---------------------------------------------------------------- scores
  E.recalc = function (db) {
    var now = E.now();
    db.providers.forEach(function (p) {
      if (!p.verification || p.verification.status !== 'verified') return;
      var s = wf.scoring.providerScore(p, db.cases, db.ratings, db.config.scoring, now);
      db.scores[p.id] = s;
      if (!p.enforcement || p.enforcement.source !== 'auto') return;
      var level = wf.scoring.enforcementLevel(s.overall, db.config.scoring);
      if (level !== p.enforcement.level) {
        var before = p.enforcement.level;
        p.enforcement = { level: level, source: 'auto', since: now };
        E.audit('provider.enforcement_auto', 'provider', p.id, p.name, { level: before }, { level: level, score: s.overall }, null, wf.SYSTEM);
        E.notify(D.providerUsers(db, p.id, ['provider_admin', 'freelancer']), 'notif.enforcement_changed', { level: level }, 'provider:dashboard');
        E.notify(E.admins(), 'notif.enforcement_admin', { provider: p.name, level: level }, 'provider-admin:' + p.id);
      }
    });
  };

  // ---------------------------------------------------------------- clock tick
  /** Expire offers, warn about expiring offers, raise SLA warnings and flag broken promises. */
  E.tick = function () {
    var db = E.db(), now = E.now();
    var warnMs = (db.config.pricing.offerWarnMinutes || 60) * U.MIN;
    var work = false;
    db.offers.forEach(function (o) {
      if (o.status !== 'pending') return;
      if (now >= o.expiresAt || (!o.warned && o.expiresAt - now <= warnMs)) work = true;
    });
    db.cases.forEach(function (c) {
      if (wf.sla.pendingEvents(c, now).length) work = true;
      if ((c.promises || []).some(function (p) { return p.status === 'pending' && now > p.dueDate; })) work = true;
    });
    var liveDocs = function (p) { return p.verification && p.verification.status === 'verified' ? p.verification.documents : []; };
    db.providers.forEach(function (p) { if (liveDocs(p).some(function (d) { return wf.dueReminder(d, now); })) work = true; });
    if (!work) return { changed: false };

    var summary = { expired: 0, warned: 0, atRisk: 0, breached: 0, brokenPromises: 0, docReminders: 0, changed: true };
    ICM.store.tx(function () {
      // Document expiry: reminders 30 and 7 days before, then a notice when it lapses.
      db.providers.forEach(function (p) {
        liveDocs(p).forEach(function (d) {
          var due = wf.dueReminder(d, now);
          if (!due) return;
          var sent = Object.assign({}, d.reminders);
          wf.EXPIRY_REMINDER_DAYS.forEach(function (k) { if (due === 'expired' || k >= due) sent[k] = true; });
          if (due === 'expired') sent.expired = true;
          d.reminders = sent;
          var owners = D.providerUsers(db, p.id, ['provider_admin', 'freelancer']);
          if (due === 'expired') {
            E.notify(owners, 'notif.document_expired', { doc: d.type }, 'provider:profile');
            E.notify(E.admins(), 'notif.document_expired_admin', { name: p.name, doc: d.type }, 'provider-admin:' + p.id);
            E.audit('provider.document_expired', 'provider', p.id, p.name, null, { type: d.type }, null, wf.SYSTEM);
          } else {
            E.notify(owners, 'notif.document_expiring', { doc: d.type, days: Math.max(1, Math.ceil((d.expiresAt - now) / U.DAY)) }, 'provider:profile');
          }
          summary.docReminders++;
        });
      });

      db.offers.forEach(function (o) {
        if (o.status !== 'pending') return;
        if (now >= o.expiresAt) {
          o.status = 'expired';
          o.respondedAt = now;
          var first = null;
          o.caseIds.forEach(function (cid) {
            var c = E.caseById(cid);
            if (c && c.status === 'awaiting_acceptance' && c.offerId === o.id) {
              first = first || c;
              E.transition(c, 'expire', {}, wf.SYSTEM, { silent: true });
            }
          });
          if (first) {
            var batch = o.batchId ? E.batchById(o.batchId) : null;
            var ref = batch ? batch.ref : first.ref;
            var link = batch ? 'batch:' + batch.id : 'case:' + first.id;
            E.notify(E.entityUsers(first), 'notif.offer_expired', { ref: ref, count: o.caseIds.length }, link);
            E.notify(E.providerManagers(o.providerId), 'notif.offer_expired_provider', { count: o.caseIds.length }, 'provider:offers');
            summary.expired++;
          }
        } else if (!o.warned && o.expiresAt - now <= warnMs) {
          o.warned = true;
          E.notify(E.providerManagers(o.providerId), 'notif.offer_expiring', { count: o.caseIds.length, minutes: Math.max(1, Math.round((o.expiresAt - now) / U.MIN)) }, 'provider:offers');
          summary.warned++;
        }
      });

      db.cases.forEach(function (c, idx) {
        var events = wf.sla.pendingEvents(c, now);
        if (events.length) {
          var n = Object.assign({}, c, { slaFlags: Object.assign({}, c.slaFlags) });
          events.forEach(function (ev) {
            if (ev === 'at_risk') {
              n.slaFlags.atRisk = true;
              n = wf.withEntry(n, wf.SYSTEM, now, 'sla_at_risk');
              E.notify(E.entityUsers(n).concat(E.providerManagers(n.providerId), E.agentUsers(n)), 'notif.sla_at_risk', { ref: n.ref }, 'case:' + n.id);
              summary.atRisk++;
            } else {
              n.slaFlags.breached = true;
              n = wf.withEntry(n, wf.SYSTEM, now, 'sla_breached');
              E.notify(E.entityUsers(n).concat(E.providerManagers(n.providerId), E.agentUsers(n), E.admins()), 'notif.sla_breached', { ref: n.ref }, 'case:' + n.id);
              E.audit('case.sla_breached', 'case', n.id, n.ref, null, { dueAt: n.dueAt }, null, wf.SYSTEM);
              summary.breached++;
            }
          });
          db.cases[idx] = n;
          c = n;
        }
        if (c.service === 'collection') {
          var r = wf.collection.evaluatePromises(c, now);
          if (r.broken.length) {
            db.cases[idx] = r.case;
            r.broken.forEach(function (b) {
              E.notify(E.providerSupervisors(c.providerId).concat(E.agentUsers(c), E.entityUsers(c)), 'notif.ptp_broken', { ref: c.ref, amount: b.amount }, 'case:' + c.id);
              summary.brokenPromises++;
            });
          }
        }
      });
      E.recalc(db);
    });
    return summary;
  };

  ICM.engine = E;
})();
