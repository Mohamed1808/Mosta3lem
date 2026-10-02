/* Form definitions. Every form in the app is rendered from these definitions by
   ICM.ui.forms, so fields can be changed here without touching any page.

   Field types: text, textarea, number, select, checkboxes, yesno, checkbox, date, datetime,
   phone, anyPhone (mobile, landline or hotline), nationalId, phones (a list of mobiles), address (governorate/city/street/landmark),
   governorate, photo.
   Options: `options` (array of ids, label key `${labelBase}.${id}`) or `list` (name of a runtime
   config list: governorates, inquiryTypes, productTypes, actionTypes, declineReasons).
   `showIf(values)` hides a field; `requiredIf(values)` makes it required conditionally.
   Labels: `forms.<formId>.<field>` in the i18n files unless `label` is given. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  ICM.config = ICM.config || {};

  function has(values, type) {
    var v = values.inquiryTypes;
    return Array.isArray(v) ? v.indexOf(type) >= 0 : v === type;
  }

  // ---------------- Entity request forms ----------------
  ICM.config.FORMS = {};

  ICM.config.FORMS.investigationRequest = {
    id: 'investigationRequest',
    sections: [
      { id: 'customer', fields: [
        { name: 'fullName', type: 'text', required: true },
        { name: 'nationalId', type: 'nationalId', required: true },
        { name: 'mobile', type: 'phone', required: true },
        { name: 'telephone', type: 'anyPhone' },
        { name: 'accountNumber', type: 'text' }
      ] },
      { id: 'inquiry', fields: [
        { name: 'inquiryTypes', type: 'checkboxes', list: 'inquiryTypes', required: true, full: true }
      ] },
      { id: 'addresses', fields: [
        { name: 'home', type: 'address', requiredIf: function (v) { return has(v, 'residence') || has(v, 'guarantor'); }, showIf: function (v) { return has(v, 'residence') || has(v, 'guarantor') || (!has(v, 'employment') && !has(v, 'business')); } },
        { name: 'work', type: 'address', requiredIf: function (v) { return has(v, 'employment'); }, showIf: function (v) { return has(v, 'employment'); } },
        { name: 'business', type: 'address', requiredIf: function (v) { return has(v, 'business'); }, showIf: function (v) { return has(v, 'business'); } }
      ] },
      { id: 'details', fields: [
        { name: 'employerName', type: 'text', showIf: function (v) { return has(v, 'employment'); }, requiredIf: function (v) { return has(v, 'employment'); } },
        { name: 'businessName', type: 'text', showIf: function (v) { return has(v, 'business'); }, requiredIf: function (v) { return has(v, 'business'); } },
        { name: 'businessPhone', type: 'anyPhone', showIf: function (v) { return has(v, 'business'); } },
        { name: 'orderNumber', type: 'text', showIf: function (v) { return has(v, 'business'); } },
        { name: 'guarantorName', type: 'text', showIf: function (v) { return has(v, 'guarantor'); }, requiredIf: function (v) { return has(v, 'guarantor'); } },
        { name: 'guarantorNationalId', type: 'nationalId', showIf: function (v) { return has(v, 'guarantor'); } },
        { name: 'guarantorMobile', type: 'phone', showIf: function (v) { return has(v, 'guarantor'); }, requiredIf: function (v) { return has(v, 'guarantor'); } },
        { name: 'guarantorRelationship', type: 'text', showIf: function (v) { return has(v, 'guarantor'); } },
        { name: 'instructions', type: 'textarea', full: true },
        { name: 'deadline', type: 'datetime', required: true },
        { name: 'internalRef', type: 'text' }
      ] }
    ],
    validate: function (v, ctx) {
      var e = {};
      if (v.deadline && ctx && ctx.now && new Date(v.deadline).getTime() <= ctx.now) e.deadline = 'errors.deadlinePast';
      return e;
    }
  };

  ICM.config.FORMS.collectionRequest = {
    id: 'collectionRequest',
    sections: [
      { id: 'customer', fields: [
        { name: 'fullName', type: 'text', required: true },
        { name: 'nationalId', type: 'nationalId', required: true },
        { name: 'mobiles', type: 'phones', required: true, full: true }
      ] },
      { id: 'addresses', fields: [
        { name: 'home', type: 'address', required: true },
        { name: 'work', type: 'address' }
      ] },
      { id: 'contract', fields: [
        { name: 'contractNumber', type: 'text', required: true },
        { name: 'productType', type: 'select', list: 'productTypes', required: true },
        { name: 'originalAmount', type: 'number', required: true, min: 1 },
        { name: 'overdueAmount', type: 'number', required: true, min: 1 },
        { name: 'instalmentAmount', type: 'number', required: true, min: 1 },
        { name: 'dpd', type: 'number', required: true, min: 1, hint: 'forms.collectionRequest.dpdHint' }
      ] },
      { id: 'collateral', fields: [
        { name: 'collateralMake', type: 'text' },
        { name: 'collateralModel', type: 'text' },
        { name: 'collateralPlate', type: 'text' },
        { name: 'collateralNotes', type: 'text' }
      ] },
      { id: 'authority', fields: [
        { name: 'allowedActions', type: 'checkboxes', options: ['calls', 'messages', 'visits'], labelBase: 'forms.collectionRequest.allowed', required: true, full: true },
        { name: 'settlementMode', type: 'select', options: ['none', 'discount', 'instalments'], labelBase: 'forms.collectionRequest.settlement', required: true },
        { name: 'maxDiscountPct', type: 'number', min: 1, max: 60, showIf: function (v) { return v.settlementMode === 'discount'; }, requiredIf: function (v) { return v.settlementMode === 'discount'; } },
        { name: 'periodEnd', type: 'date', required: true },
        { name: 'internalRef', type: 'text' }
      ] }
    ],
    validate: function (v, ctx) {
      var e = {};
      if (+v.overdueAmount > +v.originalAmount) e.overdueAmount = 'errors.overdueAboveOriginal';
      if (v.periodEnd && ctx && ctx.now && new Date(v.periodEnd).getTime() <= ctx.now) e.periodEnd = 'errors.deadlinePast';
      return e;
    }
  };

  // ---------------- Agent report forms (one per inquiry type) ----------------
  // Residence and Business are defined in js/config/reportForms.js (client templates).
  ICM.config.REPORT_FORMS = {
    employment: { id: 'report_employment', fields: [
      { name: 'employerConfirmed', type: 'yesno', required: true },
      { name: 'jobTitle', type: 'text', required: true },
      { name: 'tenureYears', type: 'number', min: 0, max: 60, required: true },
      { name: 'hrContact', type: 'text' },
      { name: 'salaryConfirmed', type: 'yesno', required: true },
      { name: 'notes', type: 'textarea', full: true }
    ] },
    guarantor: { id: 'report_guarantor', fields: [
      { name: 'guarantorFound', type: 'yesno', required: true },
      { name: 'willingToGuarantee', type: 'yesno', required: true },
      { name: 'relationship', type: 'select', options: ['family', 'friend', 'colleague', 'employer', 'other'], labelBase: 'forms.report_guarantor.relOpt', required: true },
      { name: 'notes', type: 'textarea', full: true }
    ] }
  };

  // ---------------- Collection field forms ----------------
  ICM.config.COLLECTION_FORMS = {
    action: { id: 'collAction', fields: [
      { name: 'type', type: 'select', list: 'actionTypes', required: true },
      { name: 'note', type: 'textarea', full: true, requiredIf: function (v) { return v.type === 'note'; } }
    ] },
    promise: { id: 'collPromise', fields: [
      { name: 'amount', type: 'number', min: 1, required: true },
      { name: 'dueDate', type: 'date', required: true },
      { name: 'note', type: 'text', full: true }
    ] },
    payment: { id: 'collPayment', fields: [
      { name: 'amount', type: 'number', min: 1, required: true },
      { name: 'method', type: 'select', options: ['cash', 'bank_transfer', 'instapay', 'fawry', 'cheque'], labelBase: 'paymentMethod', required: true },
      { name: 'receipt', type: 'photo', full: true },
      { name: 'note', type: 'text', full: true }
    ] },
    settlement: { id: 'collSettlement', fields: [
      { name: 'kind', type: 'select', options: ['discount', 'instalments'], labelBase: 'settlement.kind', required: true },
      { name: 'discountPct', type: 'number', min: 1, max: 90, showIf: function (v) { return v.kind === 'discount'; }, requiredIf: function (v) { return v.kind === 'discount'; } },
      { name: 'instalmentCount', type: 'number', min: 2, max: 36, showIf: function (v) { return v.kind === 'instalments'; }, requiredIf: function (v) { return v.kind === 'instalments'; } },
      { name: 'note', type: 'textarea', full: true, required: true }
    ] },
    close: { id: 'collClose', fields: [
      { name: 'outcome', type: 'select', options: ['fully_recovered', 'partially_recovered', 'unrecoverable', 'returned_to_entity'], labelBase: 'outcome', required: true },
      { name: 'reason', type: 'textarea', full: true, requiredIf: function (v) { return v.outcome === 'returned_to_entity' || v.outcome === 'unrecoverable'; } }
    ] }
  };

  // ---------------- Bulk upload templates ----------------
  ICM.config.BULK_TEMPLATES = {
    investigation: {
      columns: ['full_name', 'national_id', 'mobile', 'inquiry_types', 'governorate', 'city', 'street', 'landmark', 'employer_name', 'business_name', 'guarantor_name', 'guarantor_mobile', 'instructions', 'internal_ref', 'account_number', 'telephone', 'business_phone', 'order_number'],
      example: ['Ahmed Mohamed Ali', '29001010112345', '01001234567', 'residence', 'Giza', 'Dokki', '12 Tahrir St', 'Near the metro', '', '', '', '', 'Visit after 5pm', 'REF-1001', '3118007', '0233456789', '', '']
    },
    collection: {
      columns: ['full_name', 'national_id', 'mobile', 'mobile_2', 'governorate', 'city', 'street', 'landmark', 'contract_number', 'product_type', 'original_amount', 'overdue_amount', 'instalment_amount', 'days_past_due', 'collateral', 'internal_ref'],
      example: ['Mona Hassan Farouk', '28805150212345', '01112345678', '', 'Alexandria', 'Smouha', '5 Victor Emmanuel St', 'Opposite the club', 'CN-2024-5512', 'auto_loan', '350000', '42000', '9500', '45', 'Hyundai Elantra 2021 plate 1234 ABC', 'REF-2001']
    }
  };

  // ---------------- Validation patterns ----------------
  ICM.config.PATTERNS = {
    mobile: /^01[0125][0-9]{8}$/,
    nationalId: /^[23][0-9]{13}$/
  };
})();
