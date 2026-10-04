/* English strings for the investigation report forms built from the client's templates
   (Residence and Business), document scanning, the bank's decision and the Excel export.
   Keep in sync with investigation.ar.js. Option labels use Title Case. */
(function () {
  window.ICM.i18n.extend('en', {
    condition: { GOOD: 'Good', AVERAGE: 'Average', POOR: 'Poor' },
    relation: {
      FATHER: 'Father', MOTHER: 'Mother', BROTHER: 'Brother', SISTER: 'Sister', SPOUSE: 'Spouse', SON: 'Son', DAUGHTER: 'Daughter',
      RELATIVE: 'Relative', NEIGHBOUR: 'Neighbour', DOORMAN: 'Doorman', FRIEND: 'Friend', COLLEAGUE: 'Colleague', LANDLORD: 'Landlord', OTHER: 'Other'
    },
    decision: {
      APPROVED: 'Approved', REJECTED: 'Rejected', PENDING: 'Pending', title: 'Your credit decision',
      hint: 'Recorded for your team and included in the Excel export.', setTitle: 'Set decision: {decision}',
      setBody: 'This is your own decision on the customer after reading the report. You can change it later.', saved: 'Decision saved'
    },
    ocr: {
      doc: { national_id_card: 'National ID card', commercial_register_extract: 'Commercial register extract', tax_card: 'Tax card' },
      short: { national_id_card: 'ID card', commercial_register_extract: 'Register', tax_card: 'Tax card' },
      scan: 'Scan document', rescan: 'Scan again', hint: 'Take a clear photo. {n} fields are read from it automatically.',
      scanned: 'Scanned and saved. Check the highlighted values below.', done: '{n} fields read from the document and saved. Check them and correct any mistakes.',
      tagHint: 'Filled from the scanned document. Correct it if the reading is wrong.'
    },
    export: {
      button: 'Export investigations', hint: 'Residence and Business results in your Excel template, using the current filters.',
      done: 'Exported {home} residence and {corp} business rows'
    },
    agent: { slotTake: 'Take photo', slotDone: 'Done' },
    errors: {
      licenseNumberRequired: 'Enter the number', decisionAfterDelivery: 'You can decide once the report is delivered'
    },
    bulk: { col: { account_number: 'Account number', telephone: 'Landline', business_phone: 'Company phone', order_number: 'Order number' } },
    audit: { action: { case_client_decision: 'Credit decision recorded' } },
    forms: {
      calculated: 'Calculated', signHint: 'Sign inside the box with your finger.', signClear: 'Clear',
      licenseNumber: 'Number', licensePhoto: 'Photo',
      investigationRequest: { telephone: 'Landline', accountNumber: 'Account number', businessPhone: 'Company phone', orderNumber: 'Order number' },
      report_residence: {
        sections: { idCard: 'Customer ID', personal: 'Personal and family', residence: 'Residence', interview: 'People met', references: 'References', result: 'Visit result' },
        idCardScan: 'National ID card', idName: 'Full name', idNationalId: 'National ID', idIssueDate: 'ID issue date', title: 'Title',
        titleOpt: { Mr: 'Mr', Mrs: 'Mrs', Miss: 'Miss' }, age: 'Age',
        maritalStatus: 'Marital status', maritalStatusOpt: { SINGLE: 'Single', MARRIED: 'Married', DIVORCED: 'Divorced', WIDOWED: 'Widowed' },
        spouseName: 'Spouse name', spouseJob: 'Spouse job', spousePhone: 'Spouse phone',
        livesWith: 'Client lives with', livesWithOpt: { WIFE: 'Wife', HUSBAND: 'Husband', PARENTS: 'Parents', CHILDREN: 'Children', RELATIVES: 'Relatives', ALONE: 'Alone' },
        healthCondition: 'Health condition', reputation: 'Customer reputation', reputationOpt: { GOOD: 'Good', AVERAGE: 'Average', BAD: 'Bad' },
        actualResidence: 'Actual place of residence', accessDescription: 'How to reach the residence',
        houseType: 'House type', houseTypeOpt: { OWN: 'Own', OLD_RENT: 'Old Rent', NEW_RENT: 'New Rent', FAMILY_HOUSE: 'Family House' },
        yearsOfResidence: 'Years of residence', propertyCondition: 'Property condition', areaCondition: 'Area condition',
        areaLevel: 'Area level', areaLevelOpt: { HIGH: 'High', GOOD: 'Good', MEDIUM: 'Medium', LOW: 'Low' },
        floors: 'Number of floors', floorsHint: 'Floors in the building', apartments: 'Apartments', apartmentsHint: 'Apartments per floor',
        streetAllowsCars: 'Street allows cars to pass', numberOfCars: 'Number of cars', numberOfCarsHint: 'Cars the client owns',
        onBehalfOf: 'Met on behalf of the client', onBehalfOfHint: 'The person standing in for the client when the client is absent',
        onBehalfRelation: 'Their relationship with the client',
        intervieweeName: 'Interviewee name', intervieweeNameHint: 'A neighbour, doorman or other person questioned about the client',
        intervieweeRelation: 'Interviewee relationship with the client', intervieweePhone: 'Interviewee phone',
        references: 'References', referencesRow: 'Reference {n}', referencesAdd: 'Add reference',
        referencesFields: { name: 'Name', relation: 'Relation', mobile: 'Mobile', address: 'Address' },
        visitNotes: 'Notes on the home visit', recommendation: 'Recommended to deal with', rejectionReason: 'Rejection reason'
      },
      report_business: {
        sections: { register: 'Commercial register', tax: 'Tax card', licenses: 'Licences and records', operations: 'Activity and premises', result: 'Visit result' },
        crScan: 'Commercial register extract', tradeName: 'Trade name', commercialRegister: 'Commercial register number', unifiedRegistryNumber: 'Unified registry number',
        issuingAuthority: 'Issuing authority', legalForm: 'Legal form',
        legalFormOpt: { SOLE_PROPRIETORSHIP: 'Sole Proprietorship', GENERAL_PARTNERSHIP: 'General Partnership', LIMITED_PARTNERSHIP: 'Limited Partnership', LLC: 'Limited Liability Company', JOINT_STOCK: 'Joint Stock Company', ONE_PERSON: 'One Person Company' },
        foundingDate: 'Founding date', registrationDate: 'Registration date', lastRenewalDate: 'Date of last renewal', crExpiryDate: 'Commercial register expiry',
        latestExtractDate: 'Date of the latest extract', companyDuration: 'Duration of the company (years)', authorizedCapital: 'Authorised capital (EGP)',
        issuedCapital: 'Issued capital (EGP)', paidUpCapital: 'Paid up capital (EGP)', activityPerRegister: 'Activity according to the commercial register',
        taxScan: 'Tax card', taxCardNumber: 'Tax card number', taxOffice: 'Tax office', taxCardIssueDate: 'Tax card issue date',
        operatingLicense: 'Operating licence', otherLicense: 'Other operating licence', importCard: 'Import card', exportersRegister: 'Exporters register', industrialRecord: 'Industrial record',
        actualActivity: 'Actual activity', suppliersLocal: 'Important local suppliers', suppliersImport: 'Important import suppliers',
        maleWorkers: 'Male workers', femaleWorkers: 'Female workers', numberOfWorkers: 'Number of workers',
        mainCenterOwnership: 'Main centre', mainCenterOwnershipOpt: { OWNED: 'Owned', RENTED: 'Rented' }, mainCenterAddress: 'Main centre address',
        storesCount: 'Stores', storesAddresses: 'Store addresses', branchesCount: 'Branches', branchesAddresses: 'Branch addresses',
        comments: 'Comments', recommendation: 'Recommended to deal with', visitorSignature: 'Signature of the visiting investigator', referenceSignature: 'Signature of the person met'
      }
    }
  });
})();
