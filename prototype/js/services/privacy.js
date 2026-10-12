/* Mock services: data protection (Egypt's Personal Data Protection Law, Law 151 of 2020).

   - Requests from people about their data (see it, correct it, delete it, object). Legal
     (with Management) logs each one, the platform finds the cases about that person and tells the
     organisations who sent them (they decided to collect the data), and Legal answers
     before the deadline.
   - Breaches: any staff member can report one; Legal tracks the 72 hours to report it to
     the data protection centre and tells the people affected.
   - Retention: the clock tick erases photos, then all personal data, from closed cases
     (wf.privacy.eraseDue). With the real backend the stored files go with them.
   Rules live in workflow/privacy.js. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;
  var P = wf.privacy;

  // Older data was saved before these lists existed.
  function requestsOf(db) { return (db.dataRequests = db.dataRequests || []); }
  function breachesOf(db) { return (db.breaches = db.breaches || []); }
  function settingsOf(db) { return P.settings(db.config); }

  function mustRequest(id) {
    var r = requestsOf(E.db()).filter(function (x) { return x.id === id; })[0];
    if (!r) throw new Err('errors.notFound');
    return r;
  }
  function mustBreach(id) {
    var b = breachesOf(E.db()).filter(function (x) { return x.id === id; })[0];
    if (!b) throw new Err('errors.notFound');
    return b;
  }

  /**
   * The cases about the person: those that match now, plus those found when the request was
   * logged (after a deletion they no longer match, but the request still points to them).
   */
  function matchingCases(db, subject, known) {
    var ids = known || [];
    return db.cases.filter(function (c) { return ids.indexOf(c.id) >= 0 || P.matchesCase(c, subject); });
  }

  function caseSummary(c) {
    var ent = E.entityById(c.entityId), prv = c.providerId ? E.providerById(c.providerId) : null;
    return {
      id: c.id, ref: c.ref, service: c.service, status: c.status, entityId: c.entityId, entityName: ent ? ent.name : '',
      providerName: prv ? prv.name : null, createdAt: c.createdAt, closedAt: c.closedAt || null,
      open: !wf.isTerminal(c.status), erased: c.erased || null
    };
  }

  /** Days left (working days for requests, hours for breaches) and whether it is late. */
  function requestRow(r, now) {
    var done = r.status === 'done' || r.status === 'refused';
    return Object.assign({}, r, { late: !done && now > r.dueAt, dueSoon: !done && now <= r.dueAt && r.dueAt - now < 2 * U.DAY });
  }
  function breachRow(b, now) {
    var waiting = !b.reportedAt && b.status !== 'closed';
    return Object.assign({}, b, { late: waiting && now > b.dueAt, hoursLeft: waiting ? Math.ceil((b.dueAt - now) / U.HOUR) : null });
  }

  function legalTeam() { return E.staffWith('privacy.manage'); }

  /** Run by the clock tick: erase what retention says is due. Returns how many cases changed. */
  E.applyRetention = function (db, now) {
    var s = settingsOf(db), n = 0;
    db.cases.forEach(function (c, i) {
      var scope = P.eraseDue(c, now, s);
      if (!scope) return;
      db.cases[i] = P.eraseCase(c, now, scope, 'retention');
      E.audit('privacy.erased_' + scope, 'case', c.id, c.ref, null, { reason: 'retention' }, null, wf.SYSTEM);
      n++;
    });
    if (n) db.privacyRuns = { at: now, cases: n };
    return n;
  };
  /** Does the tick have retention or deadline work to do? */
  E.privacyWork = function (db, now) {
    var s = settingsOf(db);
    if (db.cases.some(function (c) { return P.eraseDue(c, now, s); })) return true;
    if (requestsOf(db).some(function (r) { return reminderDue(r, now); })) return true;
    return breachesOf(db).some(function (b) { return breachReminderDue(b, now); });
  };

  function reminderDue(r, now) {
    if (r.status === 'done' || r.status === 'refused') return null;
    if (now > r.dueAt && !r.reminded.late) return 'late';
    if (now <= r.dueAt && r.dueAt - now < U.DAY && !r.reminded.soon) return 'soon';
    return null;
  }
  function breachReminderDue(b, now) {
    if (b.reportedAt || b.status === 'closed') return null;
    if (now > b.dueAt && !b.reminded.late) return 'late';
    if (now <= b.dueAt && b.dueAt - now < 24 * U.HOUR && !b.reminded.soon) return 'soon';
    return null;
  }
  /** Run by the clock tick: remind Legal about deadlines. */
  E.privacyReminders = function (db, now) {
    requestsOf(db).forEach(function (r) {
      var due = reminderDue(r, now);
      if (!due) return;
      r.reminded = Object.assign({}, r.reminded, due === 'late' ? { soon: true, late: true } : { soon: true });
      E.notify(legalTeam(), due === 'late' ? 'notif.privacy_request_late' : 'notif.privacy_request_due', { ref: r.ref }, 'privacy-request:' + r.id);
    });
    breachesOf(db).forEach(function (b) {
      var due = breachReminderDue(b, now);
      if (!due) return;
      b.reminded = Object.assign({}, b.reminded, due === 'late' ? { soon: true, late: true } : { soon: true });
      E.notify(legalTeam(), due === 'late' ? 'notif.breach_late' : 'notif.breach_due', { ref: b.ref }, 'breach:' + b.id);
    });
  };

  S.privacy = {
    /** The retention and deadline settings, with what retention will erase next. */
    status: function () {
      return E.run(function () {
        E.requirePermission('privacy.manage');
        var db = E.db(), now = E.now(), s = settingsOf(db);
        var due = { photos: 0, all: 0 }, erased = 0;
        db.cases.forEach(function (c) {
          var scope = P.eraseDue(c, now, s);
          if (scope) due[scope]++;
          if (c.erased) erased++;
        });
        return {
          settings: s, limits: P.LIMITS, termsVersion: P.TERMS_VERSION, dpaVersion: P.DPA_VERSION, due: due, erased: erased,
          lastRun: db.privacyRuns || null,
          openRequests: requestsOf(db).filter(function (r) { return r.status === 'open' || r.status === 'in_review'; }).length,
          openBreaches: breachesOf(db).filter(function (b) { return b.status !== 'closed'; }).length,
          organisations: db.entities.map(function (e) { return { id: e.id, name: e.name, dpa: e.dpa || null, current: !!(e.dpa && e.dpa.version === P.DPA_VERSION) }; })
        };
      });
    },
    updateSettings: function (patch) {
      return E.mutate(function (db) {
        var a = E.requirePermission('privacy.manage');
        var before = settingsOf(db);
        var next = Object.assign({}, before);
        ['photosDays', 'personalDays', 'requestDays'].forEach(function (k) { if (patch && patch[k] != null && patch[k] !== '') next[k] = +patch[k]; });
        var bad = P.validateSettings(next);
        if (bad) throw new Err(bad.key, { field: bad.field, min: bad.min, max: bad.max });
        db.config.privacy = { photosDays: next.photosDays, personalDays: next.personalDays, requestDays: next.requestDays, breachHours: before.breachHours };
        E.audit('privacy.settings', 'config', 'privacy', null, before, db.config.privacy, null, a);
        return settingsOf(db);
      });
    },

    // ------------------------------------------------------------ requests from people
    requests: function () {
      return E.run(function () {
        E.requirePermission('privacy.manage');
        var now = E.now();
        return requestsOf(E.db()).slice().sort(function (x, y) { return y.receivedAt - x.receivedAt; }).map(function (r) { return requestRow(r, now); });
      });
    },
    request: function (id) {
      return E.run(function () {
        E.requirePermission('privacy.manage');
        var r = mustRequest(id), db = E.db();
        var cases = matchingCases(db, r.subject, r.caseIds).map(caseSummary);
        return Object.assign(requestRow(r, E.now()), {
          cases: cases,
          organisations: U.uniq(cases.map(function (c) { return c.entityId; })).map(function (eid) { var e = E.entityById(eid); return { id: eid, name: e ? e.name : '' }; })
        });
      });
    },
    /** values: { kind, name, nationalId?, phone?, email?, channel, details?, receivedAt? } */
    logRequest: function (values) {
      return E.mutate(function (db) {
        var a = E.requirePermission('privacy.manage');
        var v = values || {}, now = E.now();
        var bad = P.validateRequest(v, P.REQUEST_KINDS);
        if (bad) throw new Err(bad.key, { field: bad.field });
        if (v.channel && P.REQUEST_CHANNELS.indexOf(v.channel) < 0) throw new Err('errors.required', { field: 'channel' });
        var receivedAt = v.receivedAt && +v.receivedAt <= now ? +v.receivedAt : now;
        var r = {
          id: U.uid('dpr'), ref: D.nextRef(db, 'dataRequest'), kind: v.kind, status: 'open', channel: v.channel || 'email',
          subject: { name: String(v.name).trim(), nationalId: String(v.nationalId || '').replace(/\D/g, '') || null, phone: v.phone ? P.phoneKey(v.phone) : null, email: String(v.email || '').trim() || null },
          details: String(v.details || '').trim() || null, receivedAt: receivedAt, dueAt: P.requestDueAt(receivedAt, settingsOf(db)),
          loggedBy: a.userId, loggedByName: a.name, loggedAt: now, steps: [], reminded: {}
        };
        var cases = matchingCases(db, r.subject);
        r.matchedCases = cases.length;
        r.caseIds = cases.map(function (c) { return c.id; });
        // The organisations who sent these cases decided to collect the data: they are told.
        var orgs = U.uniq(cases.map(function (c) { return c.entityId; }));
        r.organisationsTold = orgs;
        requestsOf(db).push(r);
        orgs.forEach(function (eid) {
          E.notify(db.users.filter(function (u) { return u.entityId === eid && u.role === 'entity_admin' && u.active !== false; }), 'notif.privacy_request_org', { ref: r.ref, kind: r.kind, count: cases.filter(function (c) { return c.entityId === eid; }).length }, null);
        });
        E.notify(legalTeam().filter(function (u) { return u.id !== a.userId; }), 'notif.privacy_request_new', { ref: r.ref }, 'privacy-request:' + r.id);
        E.audit('privacy.request_logged', 'privacy', r.id, r.ref, null, { kind: r.kind, cases: cases.length }, null, a);
        return requestRow(r, now);
      });
    },
    startReview: function (id) {
      return E.mutate(function () {
        var a = E.requirePermission('privacy.manage');
        var r = mustRequest(id);
        if (r.status !== 'open') throw new Err('wf.err.invalidState');
        r.status = 'in_review';
        r.steps = r.steps.concat([{ at: E.now(), by: a.name, step: 'in_review' }]);
        E.audit('privacy.request_review', 'privacy', r.id, r.ref, null, null, null, a);
        return requestRow(r, E.now());
      });
    },
    /**
     * Answer the request. outcome 'done' or 'refused' (refusing needs a reason). A done
     * deletion request erases the person's data from their closed cases; their open cases
     * stay until they close, and the answer says so.
     */
    complete: function (id, outcome, note) {
      return E.mutate(function (db) {
        var a = E.requirePermission('privacy.manage');
        var r = mustRequest(id), now = E.now();
        if (r.status === 'done' || r.status === 'refused') throw new Err('wf.err.invalidState');
        if (outcome !== 'done' && outcome !== 'refused') throw new Err('errors.required', { field: 'outcome' });
        note = String(note || '').trim();
        if (outcome === 'refused' && !note) throw new Err('wf.err.reasonRequired');
        var result = {};
        if (outcome === 'done' && r.kind === 'deletion') {
          var erased = [], open = [];
          var mine = matchingCases(db, r.subject, r.caseIds).map(function (c) { return c.id; });
          r.caseIds = mine;
          db.cases.forEach(function (c, i) {
            if (mine.indexOf(c.id) < 0) return;
            if (!wf.isTerminal(c.status)) { open.push(c.ref); return; }
            if (c.erased && c.erased.scope === 'all') return;
            db.cases[i] = P.eraseCase(c, now, 'all', 'request');
            E.audit('privacy.erased_all', 'case', c.id, c.ref, null, { reason: 'request', request: r.ref }, null, a);
            erased.push(c.ref);
          });
          result = { erasedCases: erased, openCases: open };
        }
        r.status = outcome;
        r.outcome = Object.assign({ note: note || null, at: now, by: a.name }, result);
        r.steps = r.steps.concat([{ at: now, by: a.name, step: outcome, note: note || null }]);
        E.audit('privacy.request_' + outcome, 'privacy', r.id, r.ref, null, result, note || null, a);
        return requestRow(r, now);
      });
    },
    /** Everything held about the person, for an access request. Recorded in the activity log. */
    exportRequest: function (id) {
      return E.mutate(function (db) {
        var a = E.requirePermission('privacy.manage');
        var r = mustRequest(id);
        var cases = matchingCases(db, r.subject, r.caseIds).map(function (c) {
          var ent = E.entityById(c.entityId), prv = c.providerId ? E.providerById(c.providerId) : null;
          return {
            ref: c.ref, service: c.service, status: c.status, organisation: ent ? ent.name : null, provider: prv ? prv.name : null,
            createdAt: c.createdAt, closedAt: c.closedAt || null, customer: c.customer, addresses: c.addresses,
            employerName: c.employerName || null, businessName: c.businessName || null, guarantor: c.guarantor || null,
            report: c.report || null, checkIn: c.checkIn || null, photos: (c.photos || []).length,
            clientDecision: c.clientDecision || null, erased: c.erased || null
          };
        });
        r.steps = r.steps.concat([{ at: E.now(), by: a.name, step: 'exported' }]);
        E.audit('privacy.exported', 'privacy', r.id, r.ref, null, { cases: cases.length }, null, a);
        return { ref: r.ref, generatedAt: E.now(), subject: r.subject, cases: cases };
      });
    },

    // ------------------------------------------------------------ breaches
    breaches: function () {
      return E.run(function () {
        var a = E.actor();
        if (!wf.isPlatformRole(a.role)) throw new Err('errors.forbidden');
        var now = E.now(), all = wf.can(a.role, 'privacy.manage');
        return breachesOf(E.db()).filter(function (b) { return all || b.reportedBy === a.userId; })
          .slice().sort(function (x, y) { return y.discoveredAt - x.discoveredAt; }).map(function (b) { return breachRow(b, now); });
      });
    },
    breach: function (id) {
      return E.run(function () {
        var a = E.actor(), b = mustBreach(id);
        if (!wf.can(a.role, 'privacy.manage') && b.reportedBy !== a.userId) throw new Err('errors.forbidden');
        return breachRow(b, E.now());
      });
    },
    /** Any staff member reports a suspected breach. values: { title, description, discoveredAt?, severity, dataTypes[], peopleAffected? } */
    reportBreach: function (values) {
      return E.mutate(function (db) {
        var a = E.actor();
        if (!wf.isPlatformRole(a.role)) throw new Err('errors.forbidden');
        var v = values || {}, now = E.now();
        var title = String(v.title || '').trim(), description = String(v.description || '').trim();
        if (!title) throw new Err('errors.required', { field: 'title' });
        if (!description) throw new Err('errors.required', { field: 'description' });
        if (P.BREACH_SEVERITIES.indexOf(v.severity) < 0) throw new Err('errors.required', { field: 'severity' });
        var types = (v.dataTypes || []).filter(function (t) { return P.BREACH_DATA.indexOf(t) >= 0; });
        var discoveredAt = v.discoveredAt && +v.discoveredAt <= now ? +v.discoveredAt : now;
        var b = {
          id: U.uid('brc'), ref: D.nextRef(db, 'breach'), title: title, description: description, severity: v.severity, dataTypes: types,
          peopleAffected: v.peopleAffected != null && v.peopleAffected !== '' ? Math.max(0, Math.round(+v.peopleAffected)) : null,
          discoveredAt: discoveredAt, dueAt: P.breachDueAt(discoveredAt, settingsOf(db)), status: 'open',
          reportedBy: a.userId, reportedByName: a.name, createdAt: now, reportedAt: null, centreRef: null, peopleToldAt: null, containedAt: null,
          steps: [], reminded: {}
        };
        breachesOf(db).push(b);
        E.notify(legalTeam().filter(function (u) { return u.id !== a.userId; }), 'notif.breach_new', { ref: b.ref }, 'breach:' + b.id);
        E.audit('privacy.breach_logged', 'breach', b.id, b.ref, null, { severity: b.severity }, null, a);
        return breachRow(b, now);
      });
    },
    /**
     * Legal records what was done. step: 'contained' | 'reported' (to the data protection
     * centre; centreRef optional) | 'people_told' | 'note' | 'closed' (needs the report
     * to the centre first, or a note saying why none was needed).
     */
    updateBreach: function (id, step, values) {
      return E.mutate(function () {
        var a = E.requirePermission('privacy.manage');
        var b = mustBreach(id), now = E.now(), v = values || {};
        var note = String(v.note || '').trim();
        if (b.status === 'closed') throw new Err('wf.err.invalidState');
        switch (step) {
          case 'contained': if (b.containedAt) throw new Err('wf.err.invalidState'); b.containedAt = now; break;
          case 'reported':
            if (b.reportedAt) throw new Err('wf.err.invalidState');
            b.reportedAt = now; b.centreRef = String(v.centreRef || '').trim() || null; b.status = 'reported';
            break;
          case 'people_told': if (b.peopleToldAt) throw new Err('wf.err.invalidState'); b.peopleToldAt = now; break;
          case 'note': if (!note) throw new Err('errors.required', { field: 'note' }); break;
          case 'closed':
            if (!b.reportedAt && !note) throw new Err('errors.breachCloseReason');
            b.status = 'closed'; b.closedAt = now;
            break;
          default: throw new Err('errors.notFound');
        }
        b.steps = b.steps.concat([{ at: now, by: a.name, step: step, note: note || null, centreRef: step === 'reported' ? b.centreRef : undefined }]);
        E.audit('privacy.breach_' + step, 'breach', b.id, b.ref, null, step === 'reported' ? { centreRef: b.centreRef } : null, note || null, a);
        return breachRow(b, now);
      });
    }
  };
})();
