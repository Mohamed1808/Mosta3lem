/* Batch logic. A batch's status is derived from its cases, never stored. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var wf = (ICM.wf = ICM.wf || {});

  var PRE = ['draft', 'submitted', 'awaiting_acceptance', 'declined', 'expired'];

  wf.batch = {
    /** pending_acceptance | in_progress | partially_closed | closed */
    status: function (batch, cases) {
      if (!cases.length) return 'pending_acceptance';
      var terminal = cases.filter(function (c) { return wf.isTerminal(c.status); }).length;
      if (terminal === cases.length) return 'closed';
      var pre = cases.filter(function (c) { return PRE.indexOf(c.status) >= 0; }).length;
      if (pre === cases.length) return 'pending_acceptance';
      if (terminal > 0) return 'partially_closed';
      return 'in_progress';
    },
    progress: function (cases) {
      var closed = cases.filter(function (c) { return wf.isTerminal(c.status); }).length;
      return { total: cases.length, closed: closed, pct: cases.length ? closed / cases.length : 0 };
    },
    /** All cases finished and the batch has not been rated/closed yet. */
    needsRating: function (batch, cases) {
      return !batch.closedAt && cases.length > 0 && cases.every(function (c) { return wf.isTerminal(c.status); });
    },
    /** A batch closes only with a rating for every provider that closed at least one case. */
    checkClose: function (batch, cases, ratings) {
      if (batch.closedAt) return 'wf.err.batchClosed';
      if (!cases.every(function (c) { return wf.isTerminal(c.status); })) return 'wf.err.batchOpenCases';
      var providers = ratedProviders(cases);
      var missing = providers.filter(function (pid) {
        var r = ratings.filter(function (x) { return x.providerId === pid; })[0];
        return !r || !(r.overall >= 1 && r.overall <= 5);
      });
      return missing.length ? 'wf.err.ratingRequired' : null;
    },
    ratedProviders: function (cases) { return ratedProviders(cases); },
    groupByGovernorate: function (items, getGov) {
      return items.reduce(function (m, x) { var g = getGov(x); (m[g] = m[g] || []).push(x); return m; }, {});
    }
  };

  function ratedProviders(cases) {
    var ids = [];
    cases.forEach(function (c) {
      if (c.status === 'closed' && c.providerId && ids.indexOf(c.providerId) < 0) ids.push(c.providerId);
    });
    return ids;
  }
})();
