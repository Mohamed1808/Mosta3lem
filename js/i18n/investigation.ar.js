/* النصوص العربية لنماذج الاستعلام المبنية على قوالب العميل (السكن والنشاط التجاري)،
   ومسح المستندات، وقرار البنك، والتصدير إلى Excel. حافظ على تطابق المفاتيح مع investigation.en.js. */
(function () {
  window.ICM.i18n.extend('ar', {
    condition: { GOOD: 'جيدة', AVERAGE: 'متوسطة', POOR: 'سيئة' },
    relation: {
      FATHER: 'الأب', MOTHER: 'الأم', BROTHER: 'الأخ', SISTER: 'الأخت', SPOUSE: 'الزوج/الزوجة', SON: 'الابن', DAUGHTER: 'الابنة',
      RELATIVE: 'قريب', NEIGHBOUR: 'جار', DOORMAN: 'بواب', FRIEND: 'صديق', COLLEAGUE: 'زميل عمل', LANDLORD: 'مالك العقار', OTHER: 'أخرى'
    },
    decision: {
      APPROVED: 'موافقة', REJECTED: 'رفض', PENDING: 'قيد الدراسة', title: 'قرارك الائتماني',
      hint: 'يُسجَّل لفريقك ويظهر في ملف Excel المُصدَّر.', setTitle: 'تسجيل القرار: {decision}',
      setBody: 'هذا قرارك أنت بشأن العميل بعد قراءة التقرير، ويمكنك تغييره لاحقًا.', saved: 'تم حفظ القرار'
    },
    ocr: {
      doc: { national_id_card: 'بطاقة الرقم القومي', commercial_register_extract: 'مستخرج السجل التجاري', tax_card: 'البطاقة الضريبية' },
      short: { national_id_card: 'البطاقة', commercial_register_extract: 'السجل', tax_card: 'الضريبية' },
      scan: 'مسح المستند', rescan: 'مسح مرة أخرى', hint: 'التقط صورة واضحة، وستُقرأ منها {n} حقول تلقائيًا.',
      scanned: 'تم المسح والحفظ. راجع القيم المميزة بالأسفل.', done: 'تمت قراءة {n} حقول من المستند وحفظها. راجعها وصحّح أي خطأ.',
      tagHint: 'مُعبأ من المستند الممسوح. صحّحه إذا كانت القراءة خاطئة.'
    },
    export: {
      button: 'تصدير الاستعلامات', hint: 'نتائج استعلامات السكن والنشاط التجاري في قالب Excel الخاص بكم، حسب عوامل التصفية الحالية.',
      done: 'تم تصدير {home} صف سكن و{corp} صف نشاط تجاري'
    },
    agent: { slotTake: 'التقاط صورة', slotDone: 'تم' },
    errors: {
      licenseNumberRequired: 'أدخل الرقم', decisionAfterDelivery: 'يمكنك اتخاذ القرار بعد تسليم التقرير'
    },
    bulk: { col: { account_number: 'رقم الحساب', telephone: 'التليفون الأرضي', business_phone: 'تليفون الشركة', order_number: 'رقم الطلب' } },
    audit: { action: { case_client_decision: 'تسجيل القرار الائتماني' } },
    forms: {
      calculated: 'محسوب تلقائيًا', signHint: 'وقّع داخل المربع بإصبعك.', signClear: 'مسح',
      licenseNumber: 'الرقم', licensePhoto: 'الصورة',
      investigationRequest: { telephone: 'التليفون الأرضي', accountNumber: 'رقم الحساب', businessPhone: 'تليفون الشركة', orderNumber: 'رقم الطلب' },
      report_residence: {
        sections: { idCard: 'هوية العميل', personal: 'البيانات الشخصية والأسرية', residence: 'السكن', interview: 'الأشخاص الذين تمت مقابلتهم', references: 'المعرّفون', result: 'نتيجة الزيارة' },
        idCardScan: 'بطاقة الرقم القومي', idName: 'الاسم بالكامل', idNationalId: 'الرقم القومي', idIssueDate: 'تاريخ إصدار البطاقة', title: 'اللقب',
        titleOpt: { Mr: 'السيد', Mrs: 'السيدة', Miss: 'الآنسة' }, age: 'السن',
        maritalStatus: 'الحالة الاجتماعية', maritalStatusOpt: { SINGLE: 'أعزب', MARRIED: 'متزوج', DIVORCED: 'مطلق', WIDOWED: 'أرمل' },
        spouseName: 'اسم الزوج/الزوجة', spouseJob: 'وظيفة الزوج/الزوجة', spousePhone: 'هاتف الزوج/الزوجة',
        livesWith: 'يقيم العميل مع', livesWithOpt: { WIFE: 'الزوجة', HUSBAND: 'الزوج', PARENTS: 'الوالدين', CHILDREN: 'الأبناء', RELATIVES: 'الأقارب', ALONE: 'بمفرده' },
        healthCondition: 'الحالة الصحية', reputation: 'سمعة العميل', reputationOpt: { GOOD: 'جيدة', AVERAGE: 'متوسطة', BAD: 'سيئة' },
        actualResidence: 'محل الإقامة الفعلي', accessDescription: 'وصف الوصول إلى السكن',
        houseType: 'نوع السكن', houseTypeOpt: { OWN: 'ملك', OLD_RENT: 'إيجار قديم', NEW_RENT: 'إيجار جديد', FAMILY_HOUSE: 'بيت العائلة' },
        yearsOfResidence: 'سنوات الإقامة', propertyCondition: 'حالة العقار', areaCondition: 'حالة المنطقة',
        areaLevel: 'مستوى المنطقة', areaLevelOpt: { HIGH: 'راقية', GOOD: 'جيدة', MEDIUM: 'متوسطة', LOW: 'شعبية' },
        floors: 'عدد الأدوار', floorsHint: 'أدوار العقار', apartments: 'الشقق', apartmentsHint: 'عدد الشقق في الدور',
        streetAllowsCars: 'الشارع يسمح بمرور السيارات', numberOfCars: 'عدد السيارات', numberOfCarsHint: 'السيارات التي يملكها العميل',
        onBehalfOf: 'تمت المقابلة نيابة عن العميل مع', onBehalfOfHint: 'الشخص الذي حضر بدلًا من العميل عند غيابه',
        onBehalfRelation: 'صلته بالعميل',
        intervieweeName: 'اسم من تم سؤاله', intervieweeNameHint: 'جار أو بواب أو أي شخص تم سؤاله عن العميل',
        intervieweeRelation: 'صلة من تم سؤاله بالعميل', intervieweePhone: 'هاتف من تم سؤاله',
        references: 'المعرّفون', referencesRow: 'معرّف {n}', referencesAdd: 'إضافة معرّف',
        referencesFields: { name: 'الاسم', relation: 'الصلة', mobile: 'الموبايل', address: 'العنوان' },
        visitNotes: 'ملاحظات الزيارة المنزلية', recommendation: 'التوصية بالتعامل', rejectionReason: 'سبب الرفض'
      },
      report_business: {
        sections: { register: 'السجل التجاري', tax: 'البطاقة الضريبية', licenses: 'التراخيص والسجلات', operations: 'النشاط والمقرات', result: 'نتيجة الزيارة' },
        crScan: 'مستخرج السجل التجاري', tradeName: 'الاسم التجاري', commercialRegister: 'رقم السجل التجاري', unifiedRegistryNumber: 'الرقم الموحد',
        issuingAuthority: 'جهة الإصدار', legalForm: 'الشكل القانوني',
        legalFormOpt: { SOLE_PROPRIETORSHIP: 'منشأة فردية', GENERAL_PARTNERSHIP: 'شركة تضامن', LIMITED_PARTNERSHIP: 'شركة توصية بسيطة', LLC: 'شركة ذات مسئولية محدودة', JOINT_STOCK: 'شركة مساهمة', ONE_PERSON: 'شركة الشخص الواحد' },
        foundingDate: 'تاريخ التأسيس', registrationDate: 'تاريخ القيد', lastRenewalDate: 'تاريخ آخر تجديد', crExpiryDate: 'تاريخ انتهاء السجل التجاري',
        latestExtractDate: 'تاريخ آخر مستخرج', companyDuration: 'مدة الشركة (بالسنوات)', authorizedCapital: 'رأس المال المرخص به (جنيه)',
        issuedCapital: 'رأس المال المصدر (جنيه)', paidUpCapital: 'رأس المال المدفوع (جنيه)', activityPerRegister: 'النشاط طبقًا للسجل التجاري',
        taxScan: 'البطاقة الضريبية', taxCardNumber: 'رقم البطاقة الضريبية', taxOffice: 'المأمورية', taxCardIssueDate: 'تاريخ إصدار البطاقة الضريبية',
        operatingLicense: 'رخصة التشغيل', otherLicense: 'رخصة تشغيل أخرى', importCard: 'البطاقة الاستيرادية', exportersRegister: 'سجل المصدرين', industrialRecord: 'السجل الصناعي',
        actualActivity: 'النشاط الفعلي', suppliersLocal: 'أهم الموردين المحليين', suppliersImport: 'أهم الموردين من الخارج',
        maleWorkers: 'عدد العمال الذكور', femaleWorkers: 'عدد العاملات الإناث', numberOfWorkers: 'إجمالي عدد العمال',
        mainCenterOwnership: 'المقر الرئيسي', mainCenterOwnershipOpt: { OWNED: 'ملك', RENTED: 'إيجار' }, mainCenterAddress: 'عنوان المقر الرئيسي',
        storesCount: 'المخازن', storesAddresses: 'عناوين المخازن', branchesCount: 'الفروع', branchesAddresses: 'عناوين الفروع',
        comments: 'ملاحظات', recommendation: 'التوصية بالتعامل', visitorSignature: 'توقيع الباحث الزائر', referenceSignature: 'توقيع الشخص الذي تمت مقابلته'
      }
    }
  });
})();
