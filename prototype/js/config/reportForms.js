/* Investigation report forms built from the client's templates (INVESTIGATION11.xlsx):
   Residence = DRIVE_HOME_INVESTIGATION, Business = DRIVE_CORP_INVESTIGATION.

   Every field carries `col`, the template header it exports to. Dropdown values are the
   codes the template uses (MARRIED, GOOD, APPROVED); the screen shows translated labels.
   Columns with no field here are filled by the app (see js/services/exports.js).

   Extra field types used here (rendered by js/ui/forms.js, checked by validation.js):
     ocrDoc     photo of a document; the OCR service reads it and fills the fields that
                name it in `ocr`. The agent checks and corrects every value.
     computed   read only, calculated from other answers (`compute(values, ctx)`).
     repeat     a list of rows with the sub fields in `fields` (references).
     license    has it? yes/no, then number and photo.
     signature  drawn on the screen with a finger. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var C = (ICM.config = ICM.config || {});

  C.RELATIONS = ['FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'SPOUSE', 'SON', 'DAUGHTER', 'RELATIVE', 'NEIGHBOUR', 'DOORMAN', 'FRIEND', 'COLLEAGUE', 'LANDLORD', 'OTHER'];
  var REL = { options: C.RELATIONS, labelBase: 'relation' };
  var CONDITION = ['GOOD', 'AVERAGE', 'POOR'];
  var DECISION = ['APPROVED', 'REJECTED'];

  function sel(name, options, extra) { return Object.assign({ name: name, type: 'select', options: options }, extra || {}); }
  function is(field, value) { return function (v) { return v[field] === value; }; }

  /** Documents the agent scans, and the fields each one fills. */
  C.OCR_DOCS = {
    national_id_card: { fills: ['idName', 'idNationalId', 'idIssueDate'] },
    commercial_register_extract: {
      fills: ['tradeName', 'commercialRegister', 'unifiedRegistryNumber', 'issuingAuthority', 'legalForm', 'foundingDate', 'registrationDate',
        'lastRenewalDate', 'crExpiryDate', 'latestExtractDate', 'companyDuration', 'authorizedCapital', 'issuedCapital', 'paidUpCapital', 'activityPerRegister']
    },
    tax_card: { fills: ['taxCardNumber', 'taxOffice', 'taxCardIssueDate'] }
  };

  /** Labelled photos the agent is asked for, per inquiry type. */
  C.PHOTO_SLOTS = {
    residence: ['building', 'entrance', 'door'],
    employment: ['building', 'entrance'],
    business: ['signboard', 'premises', 'entrance'],
    guarantor: ['building', 'door']
  };

  C.REPORT_FORMS = C.REPORT_FORMS || {};

  // ---------------------------------------------------------------- Residence (home)
  C.REPORT_FORMS.residence = {
    id: 'report_residence',
    sections: [
      { id: 'idCard', fields: [
        { name: 'idCardScan', type: 'ocrDoc', doc: 'national_id_card', required: true, full: true },
        { name: 'idName', type: 'text', ocr: 'national_id_card', required: true, col: 'NAME' },
        { name: 'idNationalId', type: 'nationalId', ocr: 'national_id_card', required: true, live: true, col: 'NATIONAL_ID' },
        { name: 'idIssueDate', type: 'date', ocr: 'national_id_card', col: 'ISSUE_DATE' },
        sel('title', ['Mr', 'Mrs', 'Miss'], { required: true, col: 'NICK_NAME' }),
        { name: 'age', type: 'computed', col: 'AGE', compute: function (v, ctx) { return ICM.wf.ageFromNationalId(v.idNationalId, ctx && ctx.now); } }
      ] },
      { id: 'personal', fields: [
        sel('maritalStatus', ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], { required: true, col: 'MARITAL_STATUS' }),
        { name: 'spouseName', type: 'text', col: 'NAME_OF_THE_CLIENT_WIFE', showIf: is('maritalStatus', 'MARRIED'), requiredIf: is('maritalStatus', 'MARRIED') },
        { name: 'spouseJob', type: 'text', col: 'WIFE_JOB', showIf: is('maritalStatus', 'MARRIED') },
        { name: 'spousePhone', type: 'phone', col: 'WIFE_PHONE', showIf: is('maritalStatus', 'MARRIED') },
        sel('livesWith', ['WIFE', 'HUSBAND', 'PARENTS', 'CHILDREN', 'RELATIVES', 'ALONE'], { required: true, col: 'CLIENT_LIVES_WITH' }),
        sel('healthCondition', CONDITION, { required: true, col: 'HEALTH_CONDITION', labelBase: 'condition' }),
        sel('reputation', ['GOOD', 'AVERAGE', 'BAD'], { required: true, col: 'CUSTOMER_REPUTATION' })
      ] },
      { id: 'residence', fields: [
        { name: 'actualResidence', type: 'textarea', required: true, full: true, col: 'ACTUAL_PLACE_OF_RESIDENCE' },
        { name: 'accessDescription', type: 'textarea', full: true, col: 'DESCRIPTION_OF_ACCESS_TO_T1FEB' },
        sel('houseType', ['OWN', 'OLD_RENT', 'NEW_RENT', 'FAMILY_HOUSE'], { required: true, col: 'HOUSE_TYPE' }),
        { name: 'yearsOfResidence', type: 'number', min: 0, max: 90, required: true, col: 'YEARS_OF_RESIDENCE' },
        sel('propertyCondition', CONDITION, { required: true, col: 'PROPERTY_CONDITION', labelBase: 'condition' }),
        sel('areaCondition', CONDITION, { required: true, col: 'AREA_CONDITION', labelBase: 'condition' }),
        sel('areaLevel', ['HIGH', 'GOOD', 'MEDIUM', 'LOW'], { required: true, col: 'AREA_LEVEL' }),
        { name: 'floors', type: 'number', min: 0, max: 100, col: 'NUMBER_OF_FLOORS', hint: 'forms.report_residence.floorsHint' },
        { name: 'apartments', type: 'number', min: 0, max: 50, col: 'APARTMENTS', hint: 'forms.report_residence.apartmentsHint' },
        { name: 'streetAllowsCars', type: 'yesno', required: true, col: 'STREET_ALLOWS_CARS_TO_PASS' },
        { name: 'numberOfCars', type: 'number', min: 0, max: 20, col: 'NUMBER_OF_CARS', hint: 'forms.report_residence.numberOfCarsHint' }
      ] },
      { id: 'interview', fields: [
        { name: 'onBehalfOf', type: 'text', col: 'ON_BEHALF_OF', hint: 'forms.report_residence.onBehalfOfHint' },
        sel('onBehalfRelation', REL.options, { labelBase: REL.labelBase, col: 'HIS_RELATIONSHIP_WITH_THE_17C6', showIf: function (v) { return !!v.onBehalfOf; }, requiredIf: function (v) { return !!v.onBehalfOf; } }),
        { name: 'intervieweeName', type: 'text', col: 'NAME_OF_INTERVIEWEE', hint: 'forms.report_residence.intervieweeNameHint' },
        sel('intervieweeRelation', REL.options, { labelBase: REL.labelBase, col: 'INTERVIEWEE_RELATIONSHIP_WBC27', showIf: function (v) { return !!v.intervieweeName; }, requiredIf: function (v) { return !!v.intervieweeName; } }),
        { name: 'intervieweePhone', type: 'phone', col: 'INTERVIEWEE_PHONE', showIf: function (v) { return !!v.intervieweeName; } }
      ] },
      { id: 'references', fields: [
        { name: 'references', type: 'repeat', full: true, max: 5, fields: [
          { name: 'name', type: 'text', required: true, col: 'REF_NAME' },
          sel('relation', REL.options, { labelBase: REL.labelBase, required: true, col: 'REF_RELATION' }),
          { name: 'mobile', type: 'phone', col: 'REF_MOBILE' },
          { name: 'address', type: 'text', col: 'REF_ADDRESS' }
        ] }
      ] },
      { id: 'result', fields: [
        { name: 'visitNotes', type: 'textarea', required: true, full: true, col: 'NOTES_ON_HOME_VISIT' },
        sel('recommendation', DECISION, { required: true, col: 'RECOMMENDED_TO_DEAL_WITH', labelBase: 'decision' }),
        { name: 'rejectionReason', type: 'textarea', full: true, col: 'REJECTION_REASON', showIf: is('recommendation', 'REJECTED'), requiredIf: is('recommendation', 'REJECTED') }
      ] }
    ]
  };

  // ---------------------------------------------------------------- Business (company)
  var CR = 'commercial_register_extract', TAX = 'tax_card';
  C.REPORT_FORMS.business = {
    id: 'report_business',
    sections: [
      { id: 'register', fields: [
        { name: 'crScan', type: 'ocrDoc', doc: CR, required: true, full: true },
        { name: 'tradeName', type: 'text', ocr: CR, col: 'COMMERCIAL_CHARACTERISTIC' },
        { name: 'commercialRegister', type: 'text', ocr: CR, required: true, col: 'COMMERCIAL_REGISTER' },
        { name: 'unifiedRegistryNumber', type: 'text', ocr: CR, col: 'UNIFIED_REGISTRY_NUMBER' },
        { name: 'issuingAuthority', type: 'text', ocr: CR, col: 'ISSUING_AUTHORITY' },
        sel('legalForm', ['SOLE_PROPRIETORSHIP', 'GENERAL_PARTNERSHIP', 'LIMITED_PARTNERSHIP', 'LLC', 'JOINT_STOCK', 'ONE_PERSON'], { ocr: CR, required: true, col: 'LEGAL_FORM' }),
        { name: 'foundingDate', type: 'date', ocr: CR, col: 'FOUNDING_DATE' },
        { name: 'registrationDate', type: 'date', ocr: CR, col: 'REGISTRATION_DATE' },
        { name: 'lastRenewalDate', type: 'date', ocr: CR, col: 'DATE_OF_LAST_RENEWAL' },
        { name: 'crExpiryDate', type: 'date', ocr: CR, col: 'EXPIRATION_OF_THE_COMMERCI24A9' },
        { name: 'latestExtractDate', type: 'date', ocr: CR, col: 'DATE_OF_THE_LATEST_EXTRACTB9B6' },
        { name: 'companyDuration', type: 'number', min: 0, max: 200, ocr: CR, col: 'DURATION_OF_THE_COMPANY' },
        { name: 'authorizedCapital', type: 'number', min: 0, ocr: CR, col: 'AUTHORIZED_CAPITAL' },
        { name: 'issuedCapital', type: 'number', min: 0, ocr: CR, col: 'ISSUED_AND_PAID_UP_CAPITAL' },
        { name: 'paidUpCapital', type: 'number', min: 0, ocr: CR, col: 'PAID_UP_CAPITAL' },
        { name: 'activityPerRegister', type: 'textarea', full: true, ocr: CR, col: 'ACTIVITY_ACCORDING_TO_THE_9AAF' }
      ] },
      { id: 'tax', fields: [
        { name: 'taxScan', type: 'ocrDoc', doc: TAX, required: true, full: true },
        { name: 'taxCardNumber', type: 'text', ocr: TAX, required: true, col: 'TAX_CARD_NUMBER' },
        { name: 'taxOffice', type: 'text', ocr: TAX, col: 'ERRAND' },
        { name: 'taxCardIssueDate', type: 'date', ocr: TAX, col: 'RELEASE_DATE' }
      ] },
      { id: 'licenses', fields: [
        { name: 'operatingLicense', type: 'license', required: true, col: 'OPERATING_LICENSE' },
        { name: 'otherLicense', type: 'license', required: true, col: 'OTHER_OPERATING_LICENSE' },
        { name: 'importCard', type: 'license', required: true, col: 'IMPORT_CARD' },
        { name: 'exportersRegister', type: 'license', required: true, col: 'RECORD_TWO_SOURCES' },
        { name: 'industrialRecord', type: 'license', required: true, col: 'INDUSTRIAL_RECORD' }
      ] },
      { id: 'operations', fields: [
        { name: 'actualActivity', type: 'textarea', required: true, full: true, col: 'ACTUAL_ACTIVITY' },
        { name: 'suppliersLocal', type: 'textarea', col: 'IMPORTANT_SUPPLIERS_LOCAL' },
        { name: 'suppliersImport', type: 'textarea', col: 'IMPORTANT_SUPPLIERS_IMPORT' },
        { name: 'maleWorkers', type: 'number', min: 0, required: true, live: true, col: 'MALE_WORKERS_COUNT' },
        { name: 'femaleWorkers', type: 'number', min: 0, required: true, live: true, col: 'FEMALE_WORKERS_COUNT' },
        { name: 'numberOfWorkers', type: 'computed', col: 'NUMBER_OF_WORKERS', compute: function (v) {
          if (v.maleWorkers === '' || v.maleWorkers == null || v.femaleWorkers === '' || v.femaleWorkers == null) return null;
          return (+v.maleWorkers || 0) + (+v.femaleWorkers || 0);
        } },
        sel('mainCenterOwnership', ['OWNED', 'RENTED'], { required: true }),
        { name: 'mainCenterAddress', type: 'text', required: true },
        { name: 'storesCount', type: 'number', min: 0, required: true, live: true },
        { name: 'storesAddresses', type: 'textarea', showIf: function (v) { return +v.storesCount > 0; }, requiredIf: function (v) { return +v.storesCount > 0; } },
        { name: 'branchesCount', type: 'number', min: 0, required: true, live: true },
        { name: 'branchesAddresses', type: 'textarea', showIf: function (v) { return +v.branchesCount > 0; }, requiredIf: function (v) { return +v.branchesCount > 0; } }
      ] },
      { id: 'result', fields: [
        { name: 'comments', type: 'textarea', full: true, col: 'COMMENTS' },
        sel('recommendation', DECISION, { required: true, col: 'RECOMMENDED_TO_DEAL_WITH', labelBase: 'decision' }),
        { name: 'visitorSignature', type: 'signature', required: true, full: true, col: 'SIGNATURE_OF_THE_WORK_VISI3729' },
        { name: 'referenceSignature', type: 'signature', full: true, col: 'SIGNATURE_OF_REFERENCES' }
      ] }
    ]
  };

  // ---------------------------------------------------------------- Excel export layout
  // Exact headers and order of the client's template sheets.
  C.EXPORT_SHEETS = {
    residence: { sheet: 'DRIVE_HOME_INVESTIGATION', headers: ['ID', 'BATCH_NUMBER', 'ACCOUNT_NUMBER', 'INVESTIGATION_SEQUENCE', 'SEQUENCE_ADDRESS', 'VERSION', 'IS_ACTIVE', 'IS_FINAL', 'STATUS', 'NAME', 'NICK_NAME', 'NATIONAL_ID', 'ISSUE_DATE', 'TELEPHONE', 'MOBILE', 'AGE', 'MARITAL_STATUS', 'HEALTH_CONDITION', 'CUSTOMER_REPUTATION', 'NAME_OF_THE_CLIENT_WIFE', 'WIFE_JOB', 'WIFE_PHONE', 'CUSTOMER_ADDRESS', 'CLIENT_LIVES_WITH', 'ACTUAL_PLACE_OF_RESIDENCE', 'DESCRIPTION_OF_ACCESS_TO_T1FEB', 'STREET_ALLOWS_CARS_TO_PASS', 'NUMBER_OF_CARS', 'HOUSE_TYPE', 'YEARS_OF_RESIDENCE', 'PROPERTY_CONDITION', 'AREA_CONDITION', 'NUMBER_OF_FLOORS', 'APARTMENTS', 'AREA_LEVEL', 'ON_BEHALF_OF', 'HIS_RELATIONSHIP_WITH_THE_17C6', 'NAME_OF_INTERVIEWEE', 'INTERVIEWEE_RELATIONSHIP_WBC27', 'INTERVIEWEE_PHONE', 'REJECTION_REASON', 'REVISION_NOTES', 'VISIT_DATE', 'VISIT_TIME', 'NOTES_ON_HOME_VISIT', 'RECOMMENDED_TO_DEAL_WITH', 'LATITUDE', 'LONGITUDE', 'LOCATION_ACCURACY', 'LOCATION_TIMESTAMP', 'CREATED_ON', 'UPDATED_ON', 'ASSIGNED_TO_ID', 'CREATED_BY_ID', 'LAST_UPDATED_BY_ID', 'PREVIOUS_VERSION_ID', 'REVISION_REQUESTED_BY_ID', 'REF_ADDRESS', 'REF_MOBILE', 'REF_NAME', 'REF_RELATION', 'DATA_ENTRY_USER_ID', 'RETURN_REASON', 'RETURNED_AT', 'RETURNED_BY_ID', 'Final Decision Home', 'POSITION', 'USER_NAME'] },
    business: { sheet: 'DRIVE_CORP_INVESTIGATION', headers: ['ID', 'INVESTIGATION_SEQUENCE', 'SEQUENCE_ADDRESS', 'VERSION', 'IS_ACTIVE', 'IS_FINAL', 'BATCH_NUMBER', 'ACCOUNT_NUMBER', 'STATUS', 'ORDER_NUMBER', 'COMPANY_NAME', 'COMMERCIAL_CHARACTERISTIC', 'ADDRESS', 'PHONE', 'LEGAL_FORM', 'FOUNDING_DATE', 'DURATION_OF_THE_COMPANY', 'AUTHORIZED_CAPITAL', 'ISSUED_AND_PAID_UP_CAPITAL', 'PAID_UP_CAPITAL', 'ACTIVITY_ACCORDING_TO_THE_9AAF', 'ACTUAL_ACTIVITY', 'IMPORTANT_SUPPLIERS_LOCAL', 'IMPORTANT_SUPPLIERS_IMPORT', 'COMMERCIAL_REGISTER', 'EXPIRATION_OF_THE_COMMERCI24A9', 'ISSUING_AUTHORITY', 'REGISTRATION_DATE', 'DATE_OF_LAST_RENEWAL', 'DATE_OF_THE_LATEST_EXTRACTB9B6', 'OPERATING_LICENSE', 'TAX_CARD_NUMBER', 'ERRAND', 'RELEASE_DATE', 'IMPORT_CARD', 'RECORD_TWO_SOURCES', 'INDUSTRIAL_RECORD', 'OTHER_OPERATING_LICENSE', 'NUMBER_OF_WORKERS', 'MAIN_CENTER', 'STORES', 'BRANCHES', 'COMMENTS', 'RECOMMENDED_TO_DEAL_WITH', 'SIGNATURE_OF_THE_WORK_VISI3729', 'SIGNATURE_OF_REFERENCES', 'DATE_OF_VISIT', 'VISITING_TIME', 'LATITUDE', 'LONGITUDE', 'LOCATION_ACCURACY', 'LOCATION_TIMESTAMP', 'CREATED_ON', 'UPDATED_ON', 'ASSIGNED_TO_ID', 'CREATED_BY_ID', 'LAST_UPDATED_BY_ID', 'PREVIOUS_VERSION_ID', 'DATA_ENTRY_USER_ID', 'RETURN_REASON', 'RETURNED_AT', 'RETURNED_BY_ID', 'FEMALE_WORKERS_COUNT', 'MALE_WORKERS_COUNT', 'UNIFIED_REGISTRY_NUMBER', 'Decision Stage', 'Recommended Decision', 'Review Status'] }
  };

  C.CLIENT_DECISIONS = ['APPROVED', 'REJECTED', 'PENDING'];
})();
