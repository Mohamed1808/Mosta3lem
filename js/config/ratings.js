/* Rating criteria per service, feedback tags and decline reasons. Tags and decline
   reasons are editable by admin at runtime; these are the defaults. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  ICM.config = ICM.config || {};

  ICM.config.RATING_CRITERIA = {
    investigation: ['accuracy', 'evidence', 'timeliness', 'communication'],
    collection: ['conduct', 'instructions', 'updates', 'results']
  };

  // sentiment is used only to colour the tag chip.
  ICM.config.RATING_TAGS = [
    { id: 'excellent_communication', en: 'Excellent communication', ar: 'تواصل ممتاز', sentiment: 'positive' },
    { id: 'accurate_report', en: 'Accurate report', ar: 'تقرير دقيق', sentiment: 'positive' },
    { id: 'fast_turnaround', en: 'Fast turnaround', ar: 'إنجاز سريع', sentiment: 'positive' },
    { id: 'strong_results', en: 'Strong results', ar: 'نتائج قوية', sentiment: 'positive' },
    { id: 'professional_conduct', en: 'Professional conduct', ar: 'سلوك مهني', sentiment: 'positive' },
    { id: 'late', en: 'Late', ar: 'متأخر', sentiment: 'negative' },
    { id: 'missing_photos', en: 'Missing photos', ar: 'صور ناقصة', sentiment: 'negative' },
    { id: 'incomplete_report', en: 'Incomplete report', ar: 'تقرير غير مكتمل', sentiment: 'negative' },
    { id: 'poor_updates', en: 'Poor updates', ar: 'تحديثات ضعيفة', sentiment: 'negative' },
    { id: 'customer_complaint', en: 'Customer complaint', ar: 'شكوى من العميل', sentiment: 'negative' }
  ];

  ICM.config.DECLINE_REASONS = [
    { id: 'no_capacity', en: 'No capacity right now', ar: 'لا توجد طاقة استيعابية حاليا' },
    { id: 'outside_coverage', en: 'Outside our coverage area', ar: 'خارج نطاق التغطية' },
    { id: 'deadline_too_short', en: 'Deadline too short', ar: 'المهلة قصيرة جدا' },
    { id: 'price_too_low', en: 'Price too low', ar: 'السعر منخفض' },
    { id: 'conflict_of_interest', en: 'Conflict of interest', ar: 'تعارض مصالح' },
    { id: 'other', en: 'Other', ar: 'أخرى' }
  ];

  ICM.config.CLIENT_RATING_CRITERIA = ['dataQuality', 'paymentTimeliness'];
})();
