/* Service registry. Checks at startup that the active implementation satisfies every
   contract in contracts.js, so a replacement backend fails loudly if it misses a method. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var S = ICM.services;

  S.verify = function () {
    var missing = [];
    Object.keys(ICM.contracts).forEach(function (svc) {
      Object.keys(ICM.contracts[svc]).forEach(function (m) {
        if (!S[svc] || typeof S[svc][m] !== 'function') missing.push(svc + '.' + m);
      });
    });
    if (missing.length && window.console) console.error('[services] missing implementations:', missing);
    return missing;
  };

  /** Pages subscribe here to re-render when data changes (a realtime channel in a real backend). */
  S.subscribe = function (fn) { return ICM.store.subscribe(fn); };
})();
