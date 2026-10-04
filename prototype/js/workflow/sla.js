/* SLA timers. The clock is passed in, so the demo clock drives everything.
   On track (green) -> At risk at 80% elapsed (amber) -> Breached (red). */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});

  var RUNNING = {
    investigation: ['accepted', 'assigned', 'in_field', 'submitted_for_review', 'returned_to_agent', 'rework_requested'],
    collection: ['accepted', 'assigned', 'active', 'awaiting_entity_approval']
  };
  var AT_RISK = 0.8;

  function isRunning(c) { return (RUNNING[c.service] || []).indexOf(c.status) >= 0; }

  function windowOf(c) {
    var start = c.acceptedAt != null ? c.acceptedAt : c.submittedAt != null ? c.submittedAt : c.createdAt;
    return { start: start, end: c.dueAt };
  }

  /** on_track | at_risk | breached while running; met | missed once finished; none otherwise. */
  function state(c, now) {
    if (!c.dueAt) return 'none';
    if (isRunning(c)) {
      var w = windowOf(c);
      if (now >= w.end) return 'breached';
      var total = Math.max(1, w.end - w.start);
      return (now - w.start) / total >= AT_RISK ? 'at_risk' : 'on_track';
    }
    if (c.onTime === true) return 'met';
    if (c.onTime === false) return 'missed';
    return 'none';
  }

  /** Notifications still owed for this case, based on the flags already raised. */
  function pendingEvents(c, now) {
    var s = state(c, now), flags = c.slaFlags || {};
    var ev = [];
    if ((s === 'at_risk' || s === 'breached') && !flags.atRisk) ev.push('at_risk');
    if (s === 'breached' && !flags.breached) ev.push('breached');
    return ev;
  }

  wf.sla = {
    RUNNING: RUNNING,
    AT_RISK: AT_RISK,
    isRunning: isRunning,
    window: windowOf,
    state: state,
    remaining: function (c, now) { return c.dueAt ? c.dueAt - now : null; },
    elapsedRatio: function (c, now) {
      var w = windowOf(c);
      if (!w.end) return 0;
      return Math.max(0, Math.min(1.5, (now - w.start) / Math.max(1, w.end - w.start)));
    },
    pendingEvents: pendingEvents,
    /** Recompute flags after an SLA extension so the case can warn again later. */
    resetFlags: function (c, now) {
      var s = state(c, now);
      return { atRisk: s === 'at_risk' || s === 'breached', breached: s === 'breached' };
    }
  };
})();
