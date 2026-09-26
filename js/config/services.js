/* Service catalogue: inquiry types, collection products, days-past-due buckets,
   collection action types, payment methods and close outcomes. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  ICM.config = ICM.config || {};

  ICM.config.SERVICES = ['investigation', 'collection'];

  // defaultSlaHours: platform default deadline. minPhotos: evidence required before submit.
  ICM.config.INQUIRY_TYPES = [
    { id: 'residence', en: 'Residence', ar: 'السكن', defaultSlaHours: 48, minPhotos: 3 },
    { id: 'employment', en: 'Employment', ar: 'العمل', defaultSlaHours: 72, minPhotos: 2 },
    { id: 'business', en: 'Business activity', ar: 'النشاط التجاري', defaultSlaHours: 72, minPhotos: 3 },
    { id: 'guarantor', en: 'Guarantor', ar: 'الضامن', defaultSlaHours: 48, minPhotos: 2 }
  ];

  ICM.config.PRODUCT_TYPES = [
    { id: 'auto_loan', en: 'Auto loan', ar: 'تمويل سيارات' },
    { id: 'consumer_finance', en: 'Consumer finance', ar: 'تمويل استهلاكي' },
    { id: 'personal_loan', en: 'Personal loan', ar: 'قرض شخصي' },
    { id: 'credit_card', en: 'Credit card', ar: 'بطاقة ائتمان' },
    { id: 'sme_loan', en: 'SME loan', ar: 'تمويل مشروعات صغيرة' },
    { id: 'mortgage', en: 'Mortgage', ar: 'تمويل عقاري' }
  ];

  // benchmark: the recovery rate we expect in this bucket; used to normalise provider recovery.
  ICM.config.DPD_BUCKETS = [
    { id: 'b1_30', min: 1, max: 30, en: '1-30 days', ar: '1-30 يوم', benchmark: 0.85 },
    { id: 'b31_60', min: 31, max: 60, en: '31-60 days', ar: '31-60 يوم', benchmark: 0.65 },
    { id: 'b61_90', min: 61, max: 90, en: '61-90 days', ar: '61-90 يوم', benchmark: 0.45 },
    { id: 'b90p', min: 91, max: 100000, en: '90+ days', ar: 'أكثر من 90 يوم', benchmark: 0.25 }
  ];
  ICM.config.bucketFor = function (dpd) {
    var b = ICM.config.DPD_BUCKETS;
    for (var i = 0; i < b.length; i++) if (dpd >= b[i].min && dpd <= b[i].max) return b[i].id;
    return dpd <= 0 ? 'b1_30' : 'b90p';
  };

  // Editable by admin in Settings. `kind` groups them in the action log form.
  ICM.config.COLLECTION_ACTION_TYPES = [
    { id: 'call', en: 'Call attempt', ar: 'محاولة اتصال', kind: 'contact' },
    { id: 'sms', en: 'SMS sent', ar: 'رسالة نصية', kind: 'contact' },
    { id: 'whatsapp', en: 'WhatsApp sent', ar: 'رسالة واتساب', kind: 'contact' },
    { id: 'field_visit', en: 'Field visit', ar: 'زيارة ميدانية', kind: 'visit' },
    { id: 'reached', en: 'Customer reached', ar: 'تم الوصول للعميل', kind: 'result' },
    { id: 'not_reached', en: 'Customer not reached', ar: 'تعذر الوصول للعميل', kind: 'result' },
    { id: 'note', en: 'Note', ar: 'ملاحظة', kind: 'note' }
  ];

  ICM.config.PAYMENT_METHODS = ['cash', 'bank_transfer', 'instapay', 'fawry', 'cheque'];
  ICM.config.COLLECTION_OUTCOMES = ['fully_recovered', 'partially_recovered', 'unrecoverable', 'returned_to_entity'];
  ICM.config.OWNERSHIP = ['owned', 'rented', 'family'];
  ICM.config.ENTITY_TYPES = ['bank', 'auto_finance', 'consumer_finance', 'corporate'];

  ICM.config.PROVIDER_DOCUMENTS = ['commercial_register', 'tax_card', 'insurance', 'national_id', 'training_certificate'];

  // Amount ranges shown to providers before acceptance instead of the exact overdue amount.
  ICM.config.AMOUNT_RANGES = [
    { max: 10000, key: 'r0' }, { max: 25000, key: 'r1' }, { max: 50000, key: 'r2' },
    { max: 100000, key: 'r3' }, { max: 250000, key: 'r4' }, { max: Infinity, key: 'r5' }
  ];

  // Check-ins further than this from the address do not count as complete evidence.
  ICM.config.CHECKIN_MAX_DISTANCE_M = 300;
  // Days a provider keeps seeing customer data after a case closes.
  ICM.config.PII_RETENTION_DAYS = 30;
})();
