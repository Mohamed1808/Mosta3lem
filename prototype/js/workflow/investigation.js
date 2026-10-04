/* Investigation case state machine.

   Draft -> Submitted -> Awaiting Provider Acceptance -> Declined / Expired (entity reselects)
         -> Accepted -> Assigned -> In Field -> Submitted for Review
              (Returned to Agent -> In Field)
         -> Delivered to Entity (Rework Requested -> Assigned)
         -> Accepted by Entity -> Closed
   Any open state -> Cancelled (entity before acceptance, admin with reason).
   "Disputed" is a flag on the case, not a state. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});

  var ENTITY = wf.ENTITY_ROLES;
  var MANAGERS = wf.PROVIDER_MANAGER_ROLES;
  var ASSIGNERS = ['provider_admin', 'provider_supervisor', 'freelancer'];
  var FIELD = wf.FIELD_ROLES;
  var REVIEWERS = ['provider_admin', 'provider_supervisor', 'platform_qa', 'platform_admin'];

  var OPEN = ['draft', 'submitted', 'awaiting_acceptance', 'declined', 'expired', 'accepted', 'assigned', 'in_field',
    'submitted_for_review', 'returned_to_agent', 'delivered', 'rework_requested', 'accepted_by_entity'];

  function inquiryTypes(ctx) {
    return (ctx && ctx.inquiryTypes) || ICM.config.INQUIRY_TYPES;
  }

  /** Minimum photos for this case: the highest minimum among its inquiry types. */
  function minPhotos(c, ctx) {
    var types = inquiryTypes(ctx);
    return (c.inquiryTypes || []).reduce(function (m, id) {
      var t = types.filter(function (x) { return x.id === id; })[0];
      return Math.max(m, t ? t.minPhotos : 0);
    }, 0);
  }

  /** Every inquiry type on the case has a report section that passes validation. */
  function reportComplete(c) {
    var forms = ICM.config.REPORT_FORMS;
    return (c.inquiryTypes || []).every(function (type) {
      var form = forms[type];
      if (!form) return true;
      return Object.keys(wf.reports.validate(form, (c.report || {})[type] || {})).length === 0;
    });
  }

  function evidenceComplete(c, ctx) {
    return !!c.checkIn && (c.photos || []).length >= minPhotos(c, ctx) &&
      c.checkIn.distanceM <= ICM.config.CHECKIN_MAX_DISTANCE_M;
  }

  /** Company reports go to the provider's supervisor; freelancer reports go to platform QA. */
  function reviewerWhen(c, actor, ctx) {
    var freelancer = ctx.provider && ctx.provider.kind === 'freelancer';
    var isPlatform = actor.role === 'platform_qa' || actor.role === 'platform_admin';
    if (freelancer && !isPlatform) return 'wf.err.reviewerQa';
    if (!freelancer && isPlatform) return 'wf.err.reviewerSupervisor';
    return null;
  }

  var defs = wf.offerDefs(ENTITY, MANAGERS).map(function (d) {
    if (d.action !== 'submit') return d;
    return Object.assign({}, d, {
      effect: function (n, p, a, ctx) { n.submittedAt = ctx.now; n.dueAt = n.deadline || n.dueAt; }
    });
  }).concat([
    { action: 'assign', from: ['accepted', 'assigned', 'rework_requested'], to: 'assigned', roles: ASSIGNERS,
      guard: function (c, a, p) { return p.agentId ? null : 'wf.err.agentRequired'; },
      effect: function (n, p, a, ctx, prev) {
        n.agentId = p.agentId;
        n.assignedAt = ctx.now;
        if (prev.status === 'rework_requested') n.checkIn = null;
      } },
    { action: 'check_in', from: ['assigned'], to: 'in_field', roles: FIELD,
      guard: function (c, a, p) { return p.checkIn ? null : 'wf.err.checkInRequired'; },
      effect: function (n, p) { n.checkIn = p.checkIn; } },
    { action: 'submit_report', from: ['in_field'], to: 'submitted_for_review', roles: FIELD,
      guard: function (c, a, p, ctx) {
        if (!c.checkIn) return 'wf.err.checkInRequired';
        if ((c.photos || []).length < minPhotos(c, ctx)) return 'wf.err.photosRequired';
        if (!reportComplete(c)) return 'wf.err.reportIncomplete';
        return null;
      },
      effect: function (n, p, a, ctx) {
        n.reportSubmittedAt = ctx.now;
        n.reviewerRole = ctx.provider && ctx.provider.kind === 'freelancer' ? 'qa' : 'supervisor';
        n.reviewComment = null;
      } },
    { action: 'return_to_agent', from: ['submitted_for_review'], to: 'returned_to_agent', roles: REVIEWERS,
      when: reviewerWhen,
      guard: function (c, a, p) { return p.comment ? null : 'wf.err.commentRequired'; },
      effect: function (n, p) { n.reviewComment = p.comment; n.returnCount = (n.returnCount || 0) + 1; } },
    { action: 'resume', from: ['returned_to_agent'], to: 'in_field', roles: FIELD },
    { action: 'approve', from: ['submitted_for_review'], to: 'delivered', roles: REVIEWERS,
      when: reviewerWhen,
      effect: function (n, p, a, ctx) {
        n.deliveredAt = ctx.now;
        if (!n.firstDeliveredAt) {
          n.firstDeliveredAt = ctx.now;
          n.onTime = !n.dueAt || ctx.now <= n.dueAt;
        }
        n.evidenceComplete = evidenceComplete(n, ctx);
        n.reviewComment = null;
      } },
    { action: 'request_rework', from: ['delivered'], to: 'rework_requested', roles: ENTITY,
      guard: function (c, a, p) { return p.reason ? null : 'wf.err.reasonRequired'; },
      effect: function (n, p) { n.reworkCount = (n.reworkCount || 0) + 1; n.reworkReason = p.reason; } },
    { action: 'accept_report', from: ['delivered'], to: 'accepted_by_entity', roles: ENTITY,
      effect: function (n, p, a, ctx) { n.entityAcceptedAt = ctx.now; } },
    { action: 'close', from: ['accepted_by_entity'], to: 'closed', roles: ENTITY.concat(['system']),
      effect: function (n, p, a, ctx) { n.closedAt = ctx.now; n.firstTimeAccepted = !n.reworkCount; } },
    wf.cancelDef(OPEN, ENTITY),
    wf.forceReassignDef(OPEN)
  ]);

  wf.investigation = wf.createMachine('investigation', defs);
  wf.investigation.OPEN = OPEN;
  wf.investigation.minPhotos = minPhotos;
  wf.investigation.reportComplete = reportComplete;
  wf.investigation.evidenceComplete = evidenceComplete;
})();
