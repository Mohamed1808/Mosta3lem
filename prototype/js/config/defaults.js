/* Default scoring, pricing and SLA configuration. The admin portal edits a copy of
   these that lives in the data store; Reset demo data restores these values. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  ICM.config = ICM.config || {};

  ICM.config.DEFAULT_SCORING = {
    operationalWeight: 60,     // % of the score from operational metrics
    ratingWeight: 40,          // % from client ratings
    recencyDays: 90,           // ratings inside this window count double
    recentMultiplier: 2,
    minRatings: 10,            // below this, show a "New" badge instead of stars
    entityCapPct: 40,          // max share of the rating part any one entity can contribute
    warnBelow: 60,             // score thresholds for automatic enforcement
    reduceBelow: 50,
    suspendBelow: 40
  };

  // Sub-weights inside the operational part. Fixed by design, shown on the scoring page.
  ICM.config.OPERATIONAL_WEIGHTS = {
    investigation: { onTime: 0.4, firstTime: 0.35, evidence: 0.25 },
    collection: { recovery: 0.5, ptpKept: 0.3, noComplaint: 0.2 }
  };

  // Price bands per service / inquiry type / zone. Providers must price inside them.
  ICM.config.DEFAULT_PRICING = {
    platformFeePct: 10,
    offerWindowHours: 4,
    offerWarnMinutes: 60,
    investigationBands: {
      residence: { min: 250, max: 600 },
      employment: { min: 300, max: 700 },
      business: { min: 350, max: 900 },
      guarantor: { min: 250, max: 600 }
    },
    zoneMultiplier: { greater_cairo: 1, alexandria: 1.1, delta: 1.15, canal: 1.2, upper: 1.35 },
    collectionFeeBands: {
      b1_30: { min: 5, max: 12 },
      b31_60: { min: 8, max: 16 },
      b61_90: { min: 12, max: 22 },
      b90p: { min: 18, max: 35 }
    },
    collectionFixedFeeMax: 400,
    defaultCollectionDays: 30
  };
})();
