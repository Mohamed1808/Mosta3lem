/* Workflow, SLA, masking, scoring, batch and validation tests. Pure functions only. */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var ICM = root.ICM, wf = ICM.wf;
  var H = 60 * 60 * 1000, D = 24 * H;

  var goodReport = {
    residence: { customerFound: 'yes', residenceConfirmed: 'yes', ownership: 'owned', yearsAtAddress: 5, neighbourConfirmation: 'yes' }
  };

  function makeCase(service, status, extra) {
    var pre = wf.PRE_ACCEPT.indexOf(status) >= 0;
    var c = {
      id: 'c1', ref: 'T-1', service: service, status: status, entityId: 'e1', providerId: 'p1', agentId: 'a1',
      createdAt: 0, submittedAt: 1, acceptedAt: pre ? null : 2, dueAt: 100 * H, deadline: 100 * H, periodEnd: 100 * H,
      timeline: [], declinedProviderIds: [],
      inquiryTypes: ['residence'], photos: [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }],
      checkIn: { at: 3, lat: 30, lng: 31, distanceM: 40 }, report: goodReport,
      overdueAmount: 10000, originalAmount: 50000, instalmentAmount: 2000, bucket: 'b31_60',
      payments: [], promises: [], actions: [], settlements: [],
      allowedActions: { calls: true, messages: true, visits: true },
      settlementAuthority: { mode: 'discount', maxDiscountPct: 20 },
      customer: { name: 'Test Name', nationalId: '29001010112345', mobiles: ['01001234567'] },
      addresses: { home: { governorate: 'giza', city: 'Dokki', street: '1 St', landmark: 'x' } },
      contractNumber: 'CN-1'
    };
    return Object.assign(c, extra || {});
  }

  function actorFor(role, over) {
    var a = { userId: 'u_' + role, name: role, role: role };
    if (wf.isEntityRole(role)) a.entityId = 'e1';
    if (role === 'provider_admin' || role === 'provider_supervisor') a.providerId = 'p1';
    if (role === 'agent') { a.providerId = 'p1'; a.agentId = 'a1'; }
    if (role === 'freelancer') { a.providerId = 'p1'; a.agentId = 'a1'; }
    return Object.assign(a, over || {});
  }

  function ctxFor(role) {
    var freelancer = role === 'freelancer' || role === 'platform_qa' || role === 'platform_admin';
    return { now: 10 * H, provider: { id: 'p1', kind: freelancer ? 'freelancer' : 'company' } };
  }

  var PAYLOADS = {
    send_offer: { providerId: 'p2' },
    decline: { reason: 'no_capacity' },
    assign: { agentId: 'a1' },
    check_in: { checkIn: { at: 5, lat: 30, lng: 31, distanceM: 20 } },
    return_to_agent: { comment: 'Photo of the entrance is missing' },
    request_rework: { reason: 'Neighbour not asked' },
    cancel: { reason: 'Customer withdrew' },
    force_reassign: { providerId: 'p9', reason: 'Provider unresponsive' },
    request_settlement: { kind: 'discount', discountPct: 10, note: 'Customer can pay lump sum' },
    reject_settlement: { reason: 'Too high' },
    close: { outcome: 'unrecoverable', reason: 'Customer abroad' },
    recall: { reason: 'Handled in house' }
  };
  function payloadFor(service, action) {
    if (service === 'investigation' && action === 'close') return {};
    return PAYLOADS[action] || {};
  }

  /** Roles whose relationship to a case depends on the service (Credit vs Collections). */
  function relatesForService(role, service) {
    return !wf.isEntityRole(role) || wf.entityServes(role, service);
  }

  ['investigation', 'collection'].forEach(function (service) {
    var M = wf.machineFor(service);
    var statuses = service === 'investigation' ? ICM.config.INVESTIGATION_STATUSES : ICM.config.COLLECTION_STATUSES;

    describe(service + ' machine: every allowed transition works', function () {
      M.defs.forEach(function (d) {
        d.from.forEach(function (from) {
          d.roles.forEach(function (role) {
            if (!relatesForService(role, service)) return;
            if (d.action === 'cancel' && wf.isEntityRole(role) && wf.PRE_ACCEPT.indexOf(from) < 0) return;
            it(d.action + ' from ' + from + ' as ' + role + ' -> ' + d.to, function () {
              var c = makeCase(service, from);
              var next = M.apply(c, d.action, actorFor(role), payloadFor(service, d.action), ctxFor(role));
              expect(next.status).toBe(d.to);
              expect(next.timeline.length).toBe(1);
              expect(next.timeline[0].from).toBe(from);
              expect(next.timeline[0].to).toBe(d.to);
            });
          });
        });
      });
    });

    describe(service + ' machine: disallowed states are rejected', function () {
      M.defs.forEach(function (d) {
        statuses.filter(function (s) { return d.from.indexOf(s) < 0; }).forEach(function (s) {
          it(d.action + ' is rejected from ' + s, function () {
            var role = d.roles[0];
            var c = makeCase(service, s);
            expect(M.check(c, d.action, actorFor(role), payloadFor(service, d.action), ctxFor(role))).toBe('wf.err.invalidState');
          });
        });
      });
    });

    describe(service + ' machine: disallowed roles are rejected', function () {
      M.defs.forEach(function (d) {
        wf.ALL_ROLES.filter(function (r) { return d.roles.indexOf(r) < 0; }).forEach(function (role) {
          it(d.action + ' is rejected for ' + role, function () {
            var c = makeCase(service, d.from[0]);
            expect(M.check(c, d.action, actorFor(role), payloadFor(service, d.action), ctxFor(role))).toBe('wf.err.role');
            expect(M.available(c, actorFor(role), ctxFor(role))).notToContain(d.action);
          });
        });
      });
    });

    describe(service + ' machine: ownership', function () {
      it('a provider user from another provider cannot accept', function () {
        var c = makeCase(service, 'awaiting_acceptance');
        expect(M.check(c, 'accept', actorFor('provider_admin', { providerId: 'p2' }), {}, ctxFor('provider_admin'))).toBe('wf.err.notOwner');
      });
      it('an entity user from another entity cannot cancel', function () {
        var c = makeCase(service, 'submitted');
        expect(M.check(c, 'cancel', actorFor('entity_admin', { entityId: 'e2' }), {}, ctxFor('entity_admin'))).toBe('wf.err.notOwner');
      });
      it('the wrong entity department is rejected', function () {
        var role = service === 'investigation' ? 'entity_collections' : 'entity_credit';
        var c = makeCase(service, 'draft');
        expect(M.check(c, 'submit', actorFor(role), {}, ctxFor(role))).toBe('wf.err.notOwner');
      });
      it('entity cannot cancel after acceptance', function () {
        var c = makeCase(service, 'assigned');
        expect(M.check(c, 'cancel', actorFor('entity_admin'), {}, ctxFor('entity_admin'))).toBe('wf.err.entityCancelAfterAccept');
        expect(M.available(c, actorFor('entity_admin'), ctxFor('entity_admin'))).notToContain('cancel');
      });
      it('admin cancel needs a reason', function () {
        var c = makeCase(service, 'assigned');
        expect(M.check(c, 'cancel', actorFor('platform_admin'), {}, ctxFor('platform_admin'))).toBe('wf.err.reasonRequired');
      });
      it('decline needs a reason and records the provider', function () {
        var c = makeCase(service, 'awaiting_acceptance');
        expect(M.check(c, 'decline', actorFor('provider_admin'), {}, ctxFor('provider_admin'))).toBe('wf.err.reasonRequired');
        var n = M.apply(c, 'decline', actorFor('provider_admin'), { reason: 'no_capacity' }, ctxFor('provider_admin'));
        expect(n.declinedProviderIds).toEqual(['p1']);
        expect(n.providerId).toBeNull();
      });
      it('a provider that declined cannot be offered the case again', function () {
        var c = makeCase(service, 'declined', { providerId: null, declinedProviderIds: ['p1'] });
        expect(M.check(c, 'send_offer', actorFor('entity_admin'), { providerId: 'p1' }, ctxFor('entity_admin'))).toBe('wf.err.providerDeclined');
      });
      it('expire is system only', function () {
        var c = makeCase(service, 'awaiting_acceptance');
        expect(M.check(c, 'expire', actorFor('entity_admin'), {}, ctxFor('entity_admin'))).toBe('wf.err.role');
        expect(M.apply(c, 'expire', wf.SYSTEM, {}, { now: 5 }).status).toBe('expired');
      });
    });
  });

  describe('investigation guards', function () {
    var M = wf.investigation;
    it('submit_report requires check-in', function () {
      var c = makeCase('investigation', 'in_field', { checkIn: null });
      expect(M.check(c, 'submit_report', actorFor('agent'), {}, ctxFor('agent'))).toBe('wf.err.checkInRequired');
    });
    it('submit_report requires the minimum photos', function () {
      var c = makeCase('investigation', 'in_field', { photos: [{ id: 'x' }] });
      expect(M.check(c, 'submit_report', actorFor('agent'), {}, ctxFor('agent'))).toBe('wf.err.photosRequired');
    });
    it('submit_report requires a complete form', function () {
      var c = makeCase('investigation', 'in_field', { report: { residence: { customerFound: 'yes' } } });
      expect(M.check(c, 'submit_report', actorFor('agent'), {}, ctxFor('agent'))).toBe('wf.err.reportIncomplete');
    });
    it('an agent not assigned to the case cannot check in', function () {
      var c = makeCase('investigation', 'assigned');
      expect(M.check(c, 'check_in', actorFor('agent', { agentId: 'a2' }), PAYLOADS.check_in, ctxFor('agent'))).toBe('wf.err.notOwner');
    });
    it('freelancer reports go to QA, not a supervisor', function () {
      var c = makeCase('investigation', 'submitted_for_review');
      var ctx = { now: 1, provider: { id: 'p1', kind: 'freelancer' } };
      expect(M.check(c, 'approve', actorFor('provider_supervisor'), {}, ctx)).toBe('wf.err.reviewerQa');
      expect(M.check(c, 'approve', actorFor('platform_qa'), {}, ctx)).toBeNull();
    });
    it('company reports go to the supervisor, not QA', function () {
      var c = makeCase('investigation', 'submitted_for_review');
      var ctx = { now: 1, provider: { id: 'p1', kind: 'company' } };
      expect(M.check(c, 'approve', actorFor('platform_qa'), {}, ctx)).toBe('wf.err.reviewerSupervisor');
    });
    it('return to agent needs a comment', function () {
      var c = makeCase('investigation', 'submitted_for_review');
      expect(M.check(c, 'return_to_agent', actorFor('provider_supervisor'), {}, ctxFor('provider_supervisor'))).toBe('wf.err.commentRequired');
    });
    it('approve records on-time and evidence on first delivery only', function () {
      var c = makeCase('investigation', 'submitted_for_review', { dueAt: 5 * H });
      var n = M.apply(c, 'approve', actorFor('provider_supervisor'), {}, { now: 4 * H, provider: { kind: 'company' } });
      expect(n.onTime).toBe(true);
      expect(n.evidenceComplete).toBe(true);
      var again = M.apply(Object.assign({}, n, { status: 'submitted_for_review' }), 'approve', actorFor('provider_supervisor'), {}, { now: 9 * H, provider: { kind: 'company' } });
      expect(again.onTime).toBe(true);
    });
    it('rework counts and closes with firstTimeAccepted false', function () {
      var c = makeCase('investigation', 'delivered');
      var n = M.apply(c, 'request_rework', actorFor('entity_credit'), { reason: 'x' }, ctxFor('entity_credit'));
      expect(n.reworkCount).toBe(1);
      n = M.apply(n, 'assign', actorFor('provider_supervisor'), { agentId: 'a1' }, ctxFor('provider_supervisor'));
      expect(n.checkIn).toBeNull();
      n = Object.assign({}, n, { status: 'accepted_by_entity' });
      n = M.apply(n, 'close', actorFor('entity_credit'), {}, ctxFor('entity_credit'));
      expect(n.firstTimeAccepted).toBe(false);
    });
    it('available actions for the assigned agent after check-in', function () {
      var c = makeCase('investigation', 'in_field');
      expect(M.available(c, actorFor('agent'), ctxFor('agent'))).toEqual(['submit_report']);
    });
  });

  describe('collection guards and operations', function () {
    var M = wf.collection;
    var agent = actorFor('agent');
    it('settlement above authority is rejected', function () {
      var c = makeCase('collection', 'active');
      expect(M.check(c, 'request_settlement', agent, { kind: 'discount', discountPct: 25, note: 'x' }, ctxFor('agent'))).toBe('wf.err.discountAboveAuthority');
    });
    it('settlement without authority is rejected', function () {
      var c = makeCase('collection', 'active', { settlementAuthority: { mode: 'none' } });
      expect(M.check(c, 'request_settlement', agent, { kind: 'discount', discountPct: 5, note: 'x' }, ctxFor('agent'))).toBe('wf.err.noSettlementAuthority');
    });
    it('approved discount lowers the target and allows full recovery', function () {
      var c = makeCase('collection', 'active');
      c = M.addPayment(c, agent, 1000, { amount: 3000, method: 'cash' });
      c = M.apply(c, 'request_settlement', agent, { kind: 'discount', discountPct: 15, note: 'x' }, { now: 2000 });
      expect(c.status).toBe('awaiting_entity_approval');
      c = M.apply(c, 'approve_settlement', actorFor('entity_collections'), {}, { now: 3000 });
      expect(c.settledTarget).toBe(8500);
      expect(M.outstanding(c)).toBe(5500);
      expect(M.check(c, 'close', actorFor('provider_supervisor'), { outcome: 'fully_recovered' }, {})).toBe('wf.err.balanceNotZero');
      c = M.addPayment(c, agent, 4000, { amount: 5500, method: 'bank_transfer' });
      var closed = M.apply(c, 'close', actorFor('provider_supervisor'), { outcome: 'fully_recovered' }, { now: 5000 });
      expect(closed.status).toBe('closed');
      expect(closed.outcome).toBe('fully_recovered');
    });
    it('partial recovery needs a payment and a remaining balance', function () {
      var c = makeCase('collection', 'active');
      expect(M.check(c, 'close', actorFor('provider_supervisor'), { outcome: 'partially_recovered' }, {})).toBe('wf.err.partialNeedsPayment');
    });
    it('payment above the outstanding balance is rejected', function () {
      var c = makeCase('collection', 'active');
      expect(function () { M.addPayment(c, agent, 1, { amount: 20000, method: 'cash' }); }).toThrowKey('wf.err.amountAboveOutstanding');
    });
    it('a disallowed action type is rejected', function () {
      var c = makeCase('collection', 'active', { allowedActions: { calls: true, messages: false, visits: false } });
      expect(function () { M.logAction(c, agent, 1, { type: 'sms' }); }).toThrowKey('wf.err.actionNotAllowed');
      expect(function () { M.logAction(c, agent, 1, { type: 'field_visit' }); }).toThrowKey('wf.err.actionNotAllowed');
    });
    it('logging on an assigned case starts it', function () {
      var c = makeCase('collection', 'assigned');
      var n = M.logAction(c, agent, 10, { type: 'call', note: 'No answer' });
      expect(n.status).toBe('active');
      expect(n.actions.length).toBe(1);
    });
    it('a promise is broken when its date passes without payment', function () {
      var c = makeCase('collection', 'active');
      c = M.addPromise(c, agent, 0, { amount: 2000, dueDate: 2 * D });
      var r = M.evaluatePromises(c, 4 * D);
      expect(r.broken.length).toBe(1);
      expect(r.case.promises[0].status).toBe('broken');
    });
    it('a promise is kept when payment covers it in time', function () {
      var c = makeCase('collection', 'active');
      c = M.addPromise(c, agent, 0, { amount: 2000, dueDate: 2 * D });
      c = M.addPayment(c, agent, 1 * D, { amount: 2000, method: 'cash' });
      expect(c.promises[0].status).toBe('kept');
      expect(M.evaluatePromises(c, 5 * D).broken.length).toBe(0);
    });
    it('another provider agent cannot log actions', function () {
      var c = makeCase('collection', 'active');
      expect(function () { M.logAction(c, actorFor('agent', { agentId: 'zz' }), 1, { type: 'call' }); }).toThrowKey('wf.err.notOwner');
    });
  });

  describe('SLA', function () {
    var c = makeCase('investigation', 'assigned', { acceptedAt: 0, dueAt: 10 * H });
    it('is on track before 80%', function () { expect(wf.sla.state(c, 7 * H)).toBe('on_track'); });
    it('is at risk from 80%', function () { expect(wf.sla.state(c, 8 * H)).toBe('at_risk'); });
    it('is breached at the due time', function () { expect(wf.sla.state(c, 10 * H)).toBe('breached'); });
    it('owes at-risk then breach notifications once', function () {
      expect(wf.sla.pendingEvents(c, 8.5 * H)).toEqual(['at_risk']);
      var flagged = Object.assign({}, c, { slaFlags: { atRisk: true } });
      expect(wf.sla.pendingEvents(flagged, 11 * H)).toEqual(['breached']);
      expect(wf.sla.pendingEvents(Object.assign({}, c, { slaFlags: { atRisk: true, breached: true } }), 11 * H)).toEqual([]);
    });
    it('reports met or missed after delivery', function () {
      expect(wf.sla.state(Object.assign({}, c, { status: 'delivered', onTime: true }), 20 * H)).toBe('met');
      expect(wf.sla.state(Object.assign({}, c, { status: 'closed', onTime: false }), 20 * H)).toBe('missed');
    });
    it('does not run before acceptance', function () {
      expect(wf.sla.state(makeCase('investigation', 'awaiting_acceptance'), 200 * H)).toBe('none');
    });
  });

  describe('masking', function () {
    var prov = actorFor('provider_admin');
    it('hides personal data before acceptance', function () {
      var m = wf.masking.maskCase(makeCase('collection', 'awaiting_acceptance'), prov, 5);
      expect(m.masked).toBe(true);
      expect(m.customer.name).toBeNull();
      expect(m.customer.nationalId).toBeNull();
      expect(m.customer.mobiles).toEqual([]);
      expect(m.contractNumber).toBeNull();
      expect(m.addresses.home.street).toBeNull();
      expect(m.addresses.home.governorate).toBe('giza');
      expect(m.overdueAmount).toBeNull();
      expect(m.amountRange).toBe('r0');
    });
    it('releases data after acceptance', function () {
      var m = wf.masking.maskCase(makeCase('collection', 'active'), prov, 5);
      expect(m.masked).toBe(false);
      expect(m.customer.name).toBe('Test Name');
    });
    it('keeps data for 30 days after close, then masks again', function () {
      var c = makeCase('investigation', 'closed', { closedAt: 0 });
      expect(wf.masking.maskCase(c, prov, 29 * D).masked).toBe(false);
      expect(wf.masking.maskCase(c, prov, 31 * D).masked).toBe(true);
    });
    it('never masks for the entity that owns the case', function () {
      var m = wf.masking.maskCase(makeCase('investigation', 'awaiting_acceptance'), actorFor('entity_credit'), 1);
      expect(m.masked).toBe(false);
    });
    it('gives other providers no access', function () {
      expect(wf.masking.maskCase(makeCase('investigation', 'active'), actorFor('provider_admin', { providerId: 'p2' }), 1)).toBeNull();
    });
    it('gives agents access only to their own cases', function () {
      expect(wf.masking.maskCase(makeCase('investigation', 'assigned'), actorFor('agent', { agentId: 'other' }), 1)).toBeNull();
    });
  });

  describe('scoring', function () {
    var cfg = ICM.config.DEFAULT_SCORING;
    var S = wf.scoring;
    it('caps a single entity share of rating weight', function () {
      var items = [];
      for (var i = 0; i < 8; i++) items.push({ entityId: 'big', w: 1 });
      items.push({ entityId: 'a', w: 1 }, { entityId: 'b', w: 1 });
      var f = S.entityCapFactors(items, 40);
      var big = 8 * f.big, total = big + f.a + f.b;
      expect(big / total).toBeCloseTo(0.4, 3);
    });
    it('weights recent ratings more', function () {
      var now = 200 * D;
      var r = [
        { entityId: 'a', overall: 5, createdAt: now - D },
        { entityId: 'b', overall: 1, createdAt: now - 150 * D }
      ];
      var res = S.weightedRating(r, Object.assign({}, cfg, { entityCapPct: 100 }), now);
      expect(res.avg).toBeGreaterThan(3);
    });
    it('excludes removed ratings from the score', function () {
      var p = { id: 'p1', services: ['investigation'], history: {} };
      var ratings = [
        { providerId: 'p1', service: 'investigation', entityId: 'a', overall: 5, createdAt: 0, status: 'active' },
        { providerId: 'p1', service: 'investigation', entityId: 'b', overall: 1, createdAt: 0, status: 'active' }
      ];
      var before = S.providerScore(p, [], ratings, cfg, 1).overall;
      ratings[1].status = 'removed';
      var after = S.providerScore(p, [], ratings, cfg, 1).overall;
      expect(after).toBeGreaterThan(before);
    });
    it('rework lowers the first-time acceptance rate', function () {
      var p = { id: 'p1', services: ['investigation'], history: { investigation: { delivered: 10, onTime: 10, firstTime: 10, accepted: 10, evidence: 10 } } };
      var clean = S.providerScore(p, [], [], cfg, 1).byService.investigation.metrics.firstTime;
      var rework = [makeCase('investigation', 'rework_requested', { reworkCount: 1 })];
      var after = S.providerScore(p, rework, [], cfg, 1).byService.investigation.metrics.firstTime;
      expect(clean).toBe(1);
      expect(after).toBeLessThan(1);
    });
    it('maps scores to enforcement levels', function () {
      expect(S.enforcementLevel(70, cfg)).toBe('none');
      expect(S.enforcementLevel(55, cfg)).toBe('warned');
      expect(S.enforcementLevel(45, cfg)).toBe('reduced');
      expect(S.enforcementLevel(30, cfg)).toBe('suspended');
      expect(S.enforcementLevel(45, Object.assign({}, cfg, { suspendBelow: 50 }))).toBe('suspended');
    });
    it('computes availability from spare capacity', function () {
      expect(S.availability(10, 0)).toBe('high');
      expect(S.availability(10, 5)).toBe('medium');
      expect(S.availability(10, 8)).toBe('low');
      expect(S.availability(10, 10)).toBe('full');
      expect(S.availability(0, 0)).toBe('none');
    });
    it('ranks full and suspended providers at zero', function () {
      expect(S.rankingScore(90, 'full', 'none')).toBe(0);
      expect(S.rankingScore(90, 'high', 'suspended')).toBe(0);
      expect(S.rankingScore(90, 'high', 'reduced')).toBeLessThan(S.rankingScore(90, 'high', 'none'));
    });
  });

  describe('batch', function () {
    var B = wf.batch;
    function cs(list) { return list.map(function (s, i) { return { id: 'c' + i, status: s, providerId: 'p1' }; }); }
    it('derives pending acceptance', function () { expect(B.status({}, cs(['awaiting_acceptance', 'expired']))).toBe('pending_acceptance'); });
    it('derives in progress', function () { expect(B.status({}, cs(['assigned', 'awaiting_acceptance']))).toBe('in_progress'); });
    it('derives partially closed', function () { expect(B.status({}, cs(['closed', 'assigned']))).toBe('partially_closed'); });
    it('derives closed', function () { expect(B.status({}, cs(['closed', 'cancelled']))).toBe('closed'); });
    it('closing requires a rating for each provider', function () {
      var cases = cs(['closed', 'closed']);
      expect(B.checkClose({}, cases, [])).toBe('wf.err.ratingRequired');
      expect(B.checkClose({}, cases, [{ providerId: 'p1', overall: 4 }])).toBeNull();
      expect(B.checkClose({}, cs(['closed', 'active']), [{ providerId: 'p1', overall: 4 }])).toBe('wf.err.batchOpenCases');
    });
  });

  describe('validation', function () {
    it('accepts a valid national ID', function () { expect(wf.validateNationalId('29001010112345')).toBeNull(); });
    it('rejects a short national ID', function () { expect(wf.validateNationalId('2900101011234')).toBe('errors.nationalIdFormat'); });
    it('rejects an invalid birth month', function () { expect(wf.validateNationalId('29013010112345')).toBe('errors.nationalIdDate'); });
    it('rejects an unknown governorate code', function () { expect(wf.validateNationalId('29001019912345')).toBe('errors.nationalIdGov'); });
    it('validates Egyptian mobiles', function () {
      expect(wf.validateMobile('01012345678')).toBeNull();
      expect(wf.validateMobile('0131234567')).toBe('errors.mobileFormat');
    });
  });
})();
