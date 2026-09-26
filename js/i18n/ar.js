/* النصوص العربية. يجب أن تطابق المفاتيح ملف en.js (node tests/i18n-check.js). */
(function () {
  var I = window.ICM.i18n;
  I.dict.ar = {
    common: {
      actions: 'الإجراءات', active: 'نشط', all: 'الكل', any: 'أي', back: 'رجوع', backHome: 'العودة للرئيسية', by: 'بواسطة',
      cancel: 'إلغاء', clearFilters: 'مسح الفلاتر', close: 'إغلاق', comment: 'تعليق', confirm: 'تأكيد', date: 'التاريخ',
      delete: 'حذف', email: 'البريد الإلكتروني', empty: 'لا يوجد شيء هنا', from: 'من', inactive: 'غير نشط', name: 'الاسم',
      noResults: 'لا توجد نتائج', note: 'ملاحظة', optional: 'اختياري', phone: 'الهاتف', reason: 'السبب', role: 'الدور',
      save: 'حفظ', saveChanges: 'حفظ التغييرات', search: 'بحث', select: 'اختر', selectAll: 'تحديد الكل', status: 'الحالة',
      to: 'إلى', updated: 'آخر تحديث', view: 'عرض', when: 'التوقيت', yes: 'نعم', no: 'لا'
    },
    time: { dh: '{d} يوم {h} س', hm: '{h} س {m} د', m: '{m} د', hoursShort: '{h} ساعة' },
    portal: { entity: 'الجهات الطالبة', provider: 'مقدمو الخدمة', agent: 'المندوبون الميدانيون', admin: 'المنصة' },
    service: { investigation: 'التحري', collection: 'التحصيل' },
    kind: { company: 'شركة', freelancer: 'عمل حر' },
    entityType: { bank: 'بنك', auto_finance: 'تمويل سيارات', consumer_finance: 'تمويل استهلاكي', corporate: 'شركة' },
    role: {
      entity_admin: 'مدير', entity_credit: 'الائتمان', entity_operations: 'العمليات', entity_collections: 'التحصيل',
      provider_admin: 'مدير الشركة', provider_supervisor: 'مشرف', agent: 'مندوب ميداني', freelancer: 'مستقل',
      platform_admin: 'مدير المنصة', platform_qa: 'مراجع الجودة', system: 'النظام'
    },
    roleHint: {
      entity_admin: 'كل الأعمال والمستخدمين', entity_credit: 'التحريات', entity_operations: 'التحريات والتحصيل',
      entity_collections: 'التحصيل', provider_admin: 'العروض والأسعار والفريق', provider_supervisor: 'التكليف والمراجعة',
      agent: 'التطبيق الميداني', freelancer: 'عروضه وعمله الميداني', platform_admin: 'تحكم كامل', platform_qa: 'مراجعة تقارير المستقلين'
    },
    nav: {
      main: 'التنقل الرئيسي', menu: 'القائمة', dashboard: 'لوحة التحكم', newRequest: 'طلب جديد', bulkUpload: 'رفع مجمّع',
      cases: 'الحالات', batches: 'الدفعات', ratings: 'التقييمات', invoices: 'الفواتير', reports: 'التقارير', users: 'المستخدمون',
      offers: 'العروض', caseBoard: 'الحالات', assignment: 'التكليف', reviewQueue: 'قائمة المراجعة', team: 'الفريق',
      portfolio: 'تقرير المحفظة', feedback: 'التقييمات والملاحظات', rateClients: 'تقييم العملاء', earnings: 'الأرباح',
      profile: 'الملف والإعدادات', groupAccount: 'الحساب', overview: 'نظرة عامة', onboarding: 'الانضمام',
      providers: 'مقدمو الخدمة', entities: 'الجهات', allCases: 'الحالات والدفعات', qaQueue: 'قائمة الجودة', disputes: 'النزاعات',
      moderation: 'إشراف التقييمات', billing: 'الفوترة', groupConfig: 'الإعدادات', scoring: 'التقييم الرقمي', pricing: 'الأسعار ومستوى الخدمة',
      settings: 'الإعدادات العامة', audit: 'سجل التدقيق', demo: 'أدوات العرض', workspace: 'مساحة العمل', fieldApp: 'فتح التطبيق الميداني',
      providerPortal: 'بوابة مقدم الخدمة', privacy: 'سياسة الخصوصية', terms: 'الشروط والأحكام'
    },
    header: {
      switchUser: 'تبديل المستخدم', demoClock: 'ساعة العرض', demoClockHint: 'كل المؤقتات تستخدم ساعة العرض، ويمكن لمدير المنصة تقديمها من أدوات العرض.',
      language: 'اللغة', notifications: 'الإشعارات', markAllRead: 'تعليم الكل كمقروء', noNotifications: 'لا توجد إشعارات بعد', signOut: 'تسجيل الخروج'
    },
    login: {
      title: 'تسجيل الدخول', headline: 'التحريات الميدانية والتحصيل، من الطلب حتى التقييم',
      body1: 'ترسل البنوك وشركات التمويل طلبات التحقق من العملاء والحسابات المتأخرة إلى مقدمي خدمة معتمدين للتحري والتحصيل، وتختار مقدم الخدمة من قائمة مرتبة وتتابع كل خطوة.',
      body2: 'لا يرى مقدم الخدمة إلا بيانات مخفية حتى يقبل الطلب، وكل إجراء يُسجل ويُوقّت ويُقيّم.',
      demoNote: 'هذه نسخة عرض. اختر أي مستخدم للدخول، ويمكنك التبديل بين المستخدمين في أي وقت من أعلى الصفحة.',
      tests: 'اختبارات سير العمل', pick: 'اختر مستخدمًا تجريبيًا', pickHint: 'المستخدمون مجمعون حسب البوابة والجهة.',
      providers: 'مقدمو الخدمة والمندوبون', entityGroupHint: 'جهة طالبة', companyGroupHint: 'شركة مقدمة خدمة لها فريق ميداني',
      freelancers: 'المستقلون', freelancerHint: 'يعمل لحسابه ويقوم بالعمل الميداني بنفسه'
    },
    status: {
      draft: 'مسودة', submitted: 'مُرسل', awaiting_acceptance: 'بانتظار القبول', declined: 'مرفوض', expired: 'منتهي',
      accepted: 'مقبول', assigned: 'مُكلَّف', in_field: 'في الميدان', submitted_for_review: 'مُرسل للمراجعة',
      returned_to_agent: 'مُعاد للمندوب', delivered: 'تم التسليم', rework_requested: 'طُلب تعديل',
      accepted_by_entity: 'قبلته الجهة', closed: 'مغلق', cancelled: 'ملغي', active: 'نشط',
      awaiting_entity_approval: 'بانتظار موافقة الجهة', recalled: 'مسحوب', accepted_offer: 'مقبول', withdrawn: 'مسحوب',
      pending: 'معلق', issued: 'صادرة', paid: 'مدفوعة', open: 'مفتوح', resolved: 'محسوم', pending_acceptance: 'بانتظار القبول',
      in_progress: 'قيد التنفيذ', partially_closed: 'مغلق جزئيًا', verified: 'معتمد', rejected: 'مرفوض',
      info_requested: 'طُلبت معلومات', kept: 'تم الوفاء', broken: 'لم يتم الوفاء', approved: 'موافق عليه'
    },
    invoiceStatus: { draft: 'مسودة', draft_invoice: 'مسودة', issued: 'صادرة', paid: 'مدفوعة' },
    action: {
      submit: 'إرسال', send_offer: 'إرسال العرض', decline: 'رفض', expire: 'انتهاء', accept: 'قبول', assign: 'تكليف مندوب',
      check_in: 'تسجيل الوصول للعنوان', submit_report: 'إرسال للمراجعة', return_to_agent: 'إعادة للمندوب', resume: 'استئناف العمل',
      approve: 'اعتماد وتسليم', request_rework: 'طلب تعديل', accept_report: 'قبول التقرير', close: 'إغلاق الحالة',
      cancel: 'إلغاء الحالة', force_reassign: 'إعادة إسناد إجبارية', start: 'بدء العمل', request_settlement: 'طلب تسوية',
      approve_settlement: 'الموافقة على التسوية', reject_settlement: 'رفض التسوية', recall: 'سحب الحالة'
    },
    timeline: {
      title: 'السجل الزمني', empty: 'لا يوجد نشاط بعد', created: 'تم إنشاء الطلب', submit: 'تم إرسال الطلب', send_offer: 'أُرسل العرض لمقدم الخدمة',
      decline: 'رُفض العرض', expire: 'انتهت مهلة العرض', accept: 'قُبل العرض وكُشفت البيانات', assign: 'تم تكليف مندوب',
      check_in: 'سجل المندوب وصوله', submit_report: 'أُرسل التقرير للمراجعة', return_to_agent: 'أُعيد التقرير للمندوب',
      resume: 'استأنف المندوب العمل', approve: 'سُلّم التقرير للجهة', request_rework: 'طُلب تعديل',
      accept_report: 'قبلت الجهة التقرير', close: 'أُغلقت الحالة', cancel: 'أُلغيت الحالة', force_reassign: 'أعاد مدير المنصة الإسناد',
      start: 'بدأ التحصيل', request_settlement: 'طُلبت تسوية', approve_settlement: 'تمت الموافقة على التسوية',
      reject_settlement: 'رُفضت التسوية', recall: 'سحبت الجهة الحالة', log_action: 'تم تسجيل إجراء',
      promise_to_pay: 'تم تسجيل وعد بالسداد', payment_recorded: 'تم تسجيل دفعة', promise_broken: 'لم يُوفَ بالوعد بالسداد',
      sla_at_risk: 'مستوى الخدمة معرض للتأخير', sla_breached: 'تم تجاوز مستوى الخدمة', sla_extended: 'تم تمديد مستوى الخدمة', dispute_opened: 'فُتح نزاع',
      dispute_resolved: 'حُسم النزاع', rated: 'تم تقييم مقدم الخدمة'
    },
    sla: {
      title: 'مستوى الخدمة', on_track: 'في الموعد', at_risk: 'معرض للتأخير', breached: 'متجاوز', met: 'تم الالتزام', missed: 'لم يتم الالتزام',
      left: 'متبقٍ {time}', overdue: 'متأخر {time}', due: 'الاستحقاق {date}', notRunning: 'غير جارٍ'
    },
    avail: { high: 'توافر مرتفع', medium: 'توافر متوسط', low: 'توافر منخفض', full: 'ممتلئ', none: 'غير مغطى' },
    enforcement: {
      none: 'وضع جيد', warned: 'إنذار', reduced: 'ترتيب مخفّض', suspended: 'موقوف',
      notice: {
        warned: 'درجتك أقل من حد الإنذار. حسّن الالتزام بالمواعيد وتقييمات العملاء لتجنب خفض الترتيب.',
        reduced: 'تم خفض ترتيبك في السوق لأن درجتك أقل من الحد المطلوب.',
        suspended: 'حسابك موقوف ولن تصلك عروض جديدة حتى تعيد المنصة تفعيله.'
      }
    },
    enforcementSource: { auto: 'تلقائي', manual: 'بقرار من المدير' },
    criteria: {
      accuracy: 'الدقة', evidence: 'اكتمال الأدلة', timeliness: 'الالتزام بالوقت', communication: 'التواصل',
      conduct: 'السلوك المهني', instructions: 'الالتزام بالتعليمات', updates: 'جودة التحديثات', results: 'النتائج'
    },
    outcome: { fully_recovered: 'تحصيل كامل', partially_recovered: 'تحصيل جزئي', unrecoverable: 'غير قابل للتحصيل', returned_to_entity: 'أُعيد للجهة' },
    paymentMethod: { cash: 'نقدي', bank_transfer: 'تحويل بنكي', instapay: 'إنستاباي', fawry: 'فوري', cheque: 'شيك' },
    amountRange: { r0: 'حتى 10,000 جنيه', r1: 'من 10,000 إلى 25,000 جنيه', r2: 'من 25,000 إلى 50,000 جنيه', r3: 'من 50,000 إلى 100,000 جنيه', r4: 'من 100,000 إلى 250,000 جنيه', r5: 'أكثر من 250,000 جنيه' },
    address: { home: 'عنوان السكن', work: 'عنوان العمل', business: 'عنوان النشاط', governorate: 'المحافظة', city: 'المدينة / الحي', street: 'الشارع والعقار', landmark: 'علامة مميزة' },
    doc: { commercial_register: 'السجل التجاري', tax_card: 'البطاقة الضريبية', insurance: 'شهادة التأمين', national_id: 'بطاقة الرقم القومي', training_certificate: 'شهادة التدريب' },
    payout: { accruing: 'قيد الاستحقاق', pending: 'بانتظار الصرف', paid_out: 'تم الصرف' },
    mask: {
      hidden: 'مخفي', preAcceptNotice: 'بيانات العميل مخفية حتى تقبل هذه الحالة. يمكنك رؤية الخدمة والنوع والمحافظة ونطاق المبلغ والموعد والسعر.',
      retentionNotice: 'أُغلقت هذه الحالة منذ أكثر من 30 يومًا، لذا أُخفيت بيانات العميل مجددًا.'
    },
    kpi: {
      openCases: 'الحالات المفتوحة', slaAtRisk: 'معرضة للتأخير', slaAtRiskSub: 'استُهلك 80% من الوقت', slaBreached: 'تجاوزت مستوى الخدمة',
      deliveredMonth: 'المسلّم هذا الشهر', recoveredMonth: 'المحصّل هذا الشهر', turnaround: 'متوسط مدة الإنجاز',
      turnaroundSub: 'من القبول حتى التسليم، 90 يومًا', spendMonth: 'الإنفاق هذا الشهر', ratingsPending: 'تقييمات مطلوبة',
      newOffers: 'عروض جديدة', dueToday: 'مستحق اليوم', rejectionRate: 'نسبة الرفض', rejectionSub: 'الإعادات والتعديلات لكل تقرير',
      earningsMonth: 'أرباح هذا الشهر', earningsSub: 'بعد رسوم المنصة'
    },
    metric: {
      onTime: 'نسبة الالتزام بالموعد', firstTime: 'القبول من أول مرة', evidence: 'اكتمال الأدلة', recovery: 'نسبة التحصيل',
      recoveryNorm: 'التحصيل مقابل معيار الشريحة', ptpKept: 'الوعود المُوفى بها', complaints: 'نسبة الشكاوى'
    },
    score: {
      title: 'درجة مقدم الخدمة من 0 إلى 100', label: 'الدرجة', short: 'الدرجة {n}', breakdown: 'تفاصيل الدرجة',
      operational: 'الجزء التشغيلي', ratingPart: 'جزء تقييم العملاء', none: 'لا توجد درجة بعد'
    },
    rating: {
      title: 'التقييم', new: 'جديد', count: '{n} تقييم', outOf: '{n} من 5', overall: 'التقييم العام', tags: 'الوسوم',
      feedback: 'ملاحظات مكتوبة', feedbackHint: 'ما الذي كان جيدًا وما الذي يحتاج تحسينًا', rateProvider: 'تقييم {name}',
      caseIntro: 'أُغلقت الحالة {ref}. يحدّث تقييمك درجة مقدم الخدمة، وتظهر الملاحظات للجهات الأخرى دون اسمك.',
      later: 'لاحقًا', submit: 'إرسال التقييم', saved: 'تم حفظ التقييم', removed: 'مستبعد من الدرجة', providerReply: 'رد مقدم الخدمة',
      yourReply: 'ردك', reply: 'رد', editReply: 'تعديل الرد', replyHint: 'الردود علنية وتظهر أسفل الملاحظات.',
      replyLabel: 'الرد', publishReply: 'نشر الرد', replySaved: 'تم نشر الرد', dispute: 'الاعتراض على التقييم',
      report: 'الإبلاغ عن الملاحظة', reportBody: 'أخبر المشرفين بالمشكلة في هذه الملاحظة.', reported: 'تم الإبلاغ',
      reportedToast: 'أُرسل للإشراف', hiddenByAdmin: 'أخفاه المشرف', archived: 'حالة مؤرشفة',
      criteria: 'المعايير', newShort: 'جديد ({n} تقييم)', avgShort: '{avg} من {n} تقييم'
    },
    ratings: {
      entitySubtitle: 'قيّم مقدمي الخدمة بعد إغلاق الحالة أو الدفعة، تقييم واحد لكل حالة أو دفعة.', pending: 'بانتظار التقييم', given: 'تقييماتي',
      pendingCases: 'حالات مغلقة', pendingBatches: 'دفعات مغلقة', closedOn: 'تاريخ الإغلاق', rateNow: 'قيّم الآن',
      nonePending: 'لا يوجد ما ينتظر التقييم', noneGiven: 'لم تقيّم أحدًا بعد', batchRating: 'تقييم دفعة'
    },
    entity: {
      dashboard: {
        title: 'أهلًا {name}', attention: 'يحتاج انتباهك', nothingPending: 'لا يوجد ما يحتاجك الآن',
        byStatus: 'الحالات المفتوحة حسب الحالة', volume: 'الحجم الشهري', created: 'المنشأة', closed: 'المغلقة'
      }
    },
    request: {
      subtitle: 'اختر الخدمة وأدخل التفاصيل ثم اختر مقدم الخدمة.', stepService: 'الخدمة', stepDetails: 'التفاصيل',
      stepProvider: 'مقدم الخدمة', serviceHint: { investigation: 'التحقق من السكن أو العمل أو النشاط التجاري أو الضامن.', collection: 'تحصيل مبلغ متأخر نيابة عنك.' },
      newTitle: 'طلب {service} جديد', editDraft: 'تعديل المسودة {ref}', formSubtitle: 'الحقول المميزة بعلامة * مطلوبة.',
      changeService: 'تغيير الخدمة', saveDraft: 'حفظ كمسودة', continue: 'متابعة لاختيار مقدم الخدمة',
      deadlineHint: 'يُحدد الموعد تلقائيًا من مستوى الخدمة لأنواع التحري المختارة، ويمكنك تقديمه أو تأخيره.',
      bucketHint: 'تُحدد شريحة أيام التأخير تلقائيًا من عدد أيام التأخير.', draftSaved: 'تم حفظ المسودة {ref}', editDraftBtn: 'تعديل المسودة'
    },
    forms: {
      addMobile: 'إضافة رقم آخر', nidPlaceholder: '14 رقمًا',
      investigationRequest: {
        sections: { customer: 'العميل', inquiry: 'التحري', addresses: 'العناوين', details: 'التفاصيل والموعد' },
        fullName: 'اسم العميل بالكامل', nationalId: 'الرقم القومي', mobile: 'الموبايل', inquiryTypes: 'أنواع التحري',
        home: 'عنوان السكن', work: 'عنوان العمل', business: 'عنوان النشاط', employerName: 'جهة العمل',
        businessName: 'اسم النشاط', guarantorName: 'اسم الضامن', guarantorNationalId: 'الرقم القومي للضامن',
        guarantorMobile: 'موبايل الضامن', guarantorRelationship: 'صلة القرابة بالعميل', instructions: 'أسئلة أو تعليمات محددة',
        deadline: 'الموعد النهائي', internalRef: 'المرجع الداخلي'
      },
      collectionRequest: {
        sections: { customer: 'العميل', addresses: 'العناوين', contract: 'العقد والمبالغ', collateral: 'الضمان', authority: 'الإجراءات المسموحة والصلاحيات' },
        fullName: 'اسم العميل بالكامل', nationalId: 'الرقم القومي', mobiles: 'أرقام الموبايل', home: 'عنوان السكن', work: 'عنوان العمل',
        contractNumber: 'رقم العقد', productType: 'نوع المنتج', originalAmount: 'المبلغ الأصلي (جنيه)', overdueAmount: 'المبلغ المتأخر (جنيه)',
        instalmentAmount: 'قيمة القسط (جنيه)', dpd: 'أيام التأخير', dpdHint: 'تحدد شريحة أيام التأخير.',
        collateralMake: 'الماركة', collateralModel: 'الموديل', collateralPlate: 'رقم اللوحة', collateralNotes: 'تفاصيل أخرى عن الضمان',
        allowedActions: 'الإجراءات المسموحة', allowed: { calls: 'المكالمات', messages: 'الرسائل', visits: 'الزيارات الميدانية' },
        settlementMode: 'صلاحية التسوية', settlement: { none: 'لا يوجد', discount: 'خصم حتى حد أقصى', instalments: 'مسموح بخطط تقسيط' },
        maxDiscountPct: 'أقصى خصم (%)', periodEnd: 'نهاية فترة التحصيل', internalRef: 'المرجع الداخلي'
      },
      report_residence: {
        customerFound: 'العميل موجود بالعنوان', residenceConfirmed: 'تم تأكيد السكن', ownership: 'نوع الحيازة',
        ownershipOpt: { owned: 'ملك', rented: 'إيجار', family: 'منزل العائلة' }, yearsAtAddress: 'سنوات الإقامة بالعنوان',
        neighbourConfirmation: 'تأكيد الجيران', notes: 'ملاحظات'
      },
      report_employment: {
        employerConfirmed: 'تم تأكيد جهة العمل', jobTitle: 'المسمى الوظيفي', tenureYears: 'سنوات العمل بالجهة', hrContact: 'جهة الاتصال بالموارد البشرية',
        salaryConfirmed: 'تم تأكيد الراتب', notes: 'ملاحظات'
      },
      report_business: {
        businessExists: 'النشاط موجود', activityMatches: 'النشاط مطابق للطلب', estimatedSize: 'الحجم التقديري',
        sizeOpt: { micro: 'متناهي الصغر', small: 'صغير', medium: 'متوسط', large: 'كبير' }, employees: 'عدد العاملين المشاهدين', notes: 'ملاحظات'
      },
      report_guarantor: {
        guarantorFound: 'تم العثور على الضامن', willingToGuarantee: 'موافق على الضمان', relationship: 'صلة القرابة',
        relOpt: { family: 'عائلة', friend: 'صديق', colleague: 'زميل', employer: 'صاحب العمل', other: 'أخرى' }, notes: 'ملاحظات'
      },
      collAction: { type: 'نوع الإجراء', note: 'ملاحظة' },
      collPromise: { amount: 'المبلغ الموعود (جنيه)', dueDate: 'تاريخ الوعد', note: 'ملاحظة' },
      collPayment: { amount: 'المبلغ (جنيه)', method: 'طريقة الدفع', receipt: 'صورة الإيصال', note: 'ملاحظة' },
      collSettlement: { kind: 'نوع التسوية', discountPct: 'الخصم (%)', instalmentCount: 'عدد الأقساط', note: 'المبرر' },
      collClose: { outcome: 'النتيجة', reason: 'السبب' }
    },
    settlement: {
      kind: { discount: 'خصم', instalments: 'خطة تقسيط' }, title: 'طلبات التسوية', request: 'طلب تسوية', short: 'تسوية',
      discountText: 'خصم {pct}%', instalmentsText: '{count} أقساط', requestedBy: 'طلبها {name}، {time}',
      decidedBy: 'قرر {name}، {time}', outstandingAt: 'المتبقي {amount} وقت الطلب', newTarget: 'المبلغ الجديد المطلوب تحصيله: {amount}',
      approveBody: 'يمكن للعميل السداد بهذه الشروط، وسيُعاد حساب الرصيد المتبقي.', approved: 'تمت الموافقة على التسوية',
      rejected: 'تم رفض التسوية', sent: 'أُرسلت التسوية للجهة للموافقة', waitingEntity: 'بانتظار موافقة الجهة على التسوية أو رفضها.',
      authorityDiscount: 'تسمح الجهة بخصم حتى {pct}%.', authorityInstalments: 'تسمح الجهة بخطط التقسيط.'
    },
    collection: {
      balance: 'الرصيد', recovered: 'المحصّل', outstanding: 'المتبقي', settledTarget: 'مبلغ التسوية', instalmentPlan: 'خطة التقسيط',
      planText: '{count} × {amount}', outcome: 'النتيجة', log: 'سجل الإجراءات', entry: 'القيد', noActions: 'لم تُسجل إجراءات بعد',
      promise: 'وعد بالسداد', promises: 'الوعود بالسداد', payment: 'دفعة', receipt: 'الإيصال', dueOn: 'مستحق {date}',
      logAction: 'تسجيل إجراء', recordPromise: 'تسجيل وعد بالسداد', recordPayment: 'تسجيل دفعة', closeCase: 'إغلاق الحالة',
      allowedIntro: 'المسموح من الجهة: {list}.', actionLogged: 'تم تسجيل الإجراء', promiseIntro: 'الرصيد المتبقي: {amount}.',
      promiseRecorded: 'تم تسجيل الوعد', paymentIntro: 'الرصيد المتبقي: {amount}. أرفق الإيصال إن وُجد.',
      paymentRecorded: 'تم تسجيل الدفعة', closeIntro: 'الإغلاق نهائي. التحصيل الكامل يتطلب رصيدًا صفريًا، والجزئي يتطلب دفعة واحدة على الأقل.',
      closed: 'تم إغلاق الحالة'
    },
    case: {
      ref: 'المرجع', service: 'الخدمة', customer: 'العميل', customerName: 'اسم العميل', nationalId: 'الرقم القومي', mobiles: 'أرقام الموبايل',
      inquiryTypes: 'أنواع التحري', guarantor: 'الضامن', deadline: 'الموعد النهائي', contractNumber: 'رقم العقد', product: 'المنتج',
      dpd: 'أيام التأخير', dpdBucket: 'أيام التأخير', amountRange: 'نطاق المبلغ', originalAmount: 'المبلغ الأصلي', overdueAmount: 'المبلغ المتأخر',
      instalmentAmount: 'القسط', collateral: 'الضمان', allowedActions: 'الإجراءات المسموحة', settlementAuthority: 'صلاحية التسوية',
      maxDiscount: 'خصم حتى {pct}%', periodEnd: 'نهاية فترة التحصيل', instructions: 'التعليمات', internalRef: 'المرجع الداخلي',
      details: 'تفاصيل الطلب', addresses: 'العناوين', provider: 'مقدم الخدمة', agent: 'المندوب', client: 'العميل (الجهة)', price: 'السعر',
      feeTerms: '{pct}% من المحصّل + {fixed}', due: 'الاستحقاق', createdOn: 'أُنشئ {date}', noActions: 'لا توجد إجراءات مطلوبة منك في هذه المرحلة.',
      selectProvider: 'اختر مقدم خدمة', declinedNotice: 'رفض مقدم الخدمة: {reason}. اختر مقدم خدمة آخر.',
      expiredNotice: 'لم يرد مقدم الخدمة في الوقت المحدد. اختر مقدم خدمة آخر.', awaitingNotice: 'بانتظار قبول {name}.',
      rateViaBatch: 'تُقيّم هذه الحالة ضمن دفعتها:', acceptReportTitle: 'قبول التقرير',
      acceptReportBody: 'يؤدي القبول إلى إغلاق الحالة وإضافتها لفاتورة هذا الشهر، وسيُطلب منك تقييم مقدم الخدمة.',
      reportAccepted: 'تم قبول التقرير وإغلاق الحالة', reworkBody: 'تعود الحالة لمقدم الخدمة ليكلف بها مندوبًا من جديد.',
      reworkReasonLabel: 'ما الذي يجب تصحيحه', reworkSent: 'تم طلب التعديل', recallBody: 'يتوقف مقدم الخدمة عن أي عمل على هذه الحالة.',
      recalled: 'تم سحب الحالة', cancelBody: 'تُلغى الحالة ويُسحب أي عرض معلق.', cancelled: 'تم إلغاء الحالة'
    },
    cases: { count: '{n} حالة', searchHint: 'الاسم أو الرقم القومي أو العقد أو المرجع', none: 'لا توجد حالات مطابقة' },
    select: {
      title: 'اختر مقدم الخدمة', autoBest: 'اختيار الأفضل تلقائيًا', notSelectable: 'حالة هذه القضية {status}، ولا يمكن اختيار مقدم خدمة الآن.',
      backToCase: 'العودة للحالة', afterDecline: 'رفض مقدم الخدمة السابق. اختر مقدم خدمة آخر.', afterExpiry: 'انتهت مهلة العرض السابق. اختر مقدم خدمة آخر.',
      sortBy: 'ترتيب حسب', sort: { rank: 'الأنسب', score: 'الدرجة', price: 'السعر', availability: 'التوافر', sla: 'مستوى الخدمة' },
      eligibleCount: '{n} مقدم خدمة مؤهل', hiddenFull: '{n} مخفي لامتلاء السعة', hiddenSuspended: '{n} موقوف',
      type: 'النوع', minRating: 'أقل تقييم', priceMin: 'السعر من', priceMax: 'السعر إلى', feeMin: 'النسبة من', feeMax: 'النسبة إلى',
      noneEligible: 'لا يوجد مقدم خدمة يغطي هذه المحافظة ولديه سعة متاحة الآن.', bestMatch: 'الأنسب',
      feeText: '{pct}% + {fixed}', perCase: 'للحالة', feeTerms: 'من المحصّل بالإضافة لرسم ثابت', sla: 'مستوى الخدمة', spare: 'السعة المتاحة',
      profile: 'الملف', select: 'اختيار', selectThis: 'اختيار مقدم الخدمة هذا', confirmTitle: 'إرسال العرض',
      confirmBody: 'إرسال هذه الحالة إلى {name} مقابل {price}؟ لديه {hours} ساعات للقبول أو الرفض.', sendOffer: 'إرسال العرض',
      offerSent: 'أُرسل العرض إلى {name}'
    },
    provider: {
      verified: 'معتمد', memberSince: 'على المنصة منذ {date}', coverage: 'التغطية والسعة', recentFeedback: 'أحدث الملاحظات',
      anonymised: 'تظهر الملاحظات دون اسم الجهة التي كتبتها.', noFeedback: 'لا توجد ملاحظات مكتوبة بعد',
      openInFieldApp: 'فتح في التطبيق الميداني',
      dashboard: {
        title: 'مساحة {service}', byStatus: 'الحالات حسب الحالة', byBucket: 'نسبة التحصيل حسب شريحة أيام التأخير', promises: 'الوعود بالسداد',
        unassigned: '{n} حالة بحاجة لتكليف', toReview: '{n} تقرير بحاجة لمراجعة'
      }
    },
    offers: {
      subtitle: 'تعرض العروض بيانات مخفية فقط، ولديك {hours} ساعات للرد.', pending: 'المعلقة', history: 'السابقة',
      nonePending: 'لا توجد عروض مفتوحة', noneHistory: 'لا توجد عروض سابقة', batchOffer: 'الدفعة {ref}: {n} حالة', caseOffer: 'الحالة {ref}',
      from: 'من', maskedNotice: 'تُكشف بيانات العميل عند القبول.', feeTerms: 'شروط الأتعاب', total: 'الإجمالي',
      all: '({n})', expiresIn: 'متبقٍ {time} للرد', expired: 'منتهي', acceptanceWindow: 'مهلة القبول',
      declinedWith: 'مرفوض: {reason}', acceptTitle: 'قبول العرض', acceptBody: 'قبول {n} حالة؟ ستُكشف بيانات العملاء ويبدأ احتساب مستوى الخدمة.',
      accepted: 'تم قبول العرض', declineTitle: 'رفض العرض', declineBody: 'ستُبلغ الجهة بالسبب لتختار مقدم خدمة آخر.',
      declined: 'تم رفض العرض', openOffer: 'هذه الحالة عرض مفتوح.'
    },
    board: { kanban: 'لوحة', table: 'جدول' },
    assign: {
      title: 'تكليف مندوب', routeTitle: 'تكليف {n} حالة كمسار واحد', intro: 'يظهر أولًا المندوبون الذين يغطون منطقة الحالة.',
      areas: 'المناطق', load: 'الحمل الحالي', coversArea: 'يغطي المنطقة', noAgents: 'لا يوجد مندوبون نشطون لهذه الخدمة', confirm: 'تكليف',
      pickAgent: 'اختر مندوبًا', done: 'تم تكليف {n} حالة', reassign: 'تغيير المندوب', sendBack: 'إعادة للمندوب',
      takeBack: 'استلام الحالة مجددًا', subtitle: 'كلّف مندوبين بالحالات المقبولة. اختر عدة حالات في منطقة واحدة لإرسالها كمسار.',
      assignSelected: 'تكليف المحدد ({n})', routeHint: 'صفِّ حسب المحافظة لبناء مسار.', unassigned: 'بحاجة لتكليف ({n})',
      allAssigned: 'كل الحالات المقبولة لها مندوب', assignedWaiting: 'مُكلَّفة ولم تبدأ ({n})', open: 'مفتوحة'
    },
    review: {
      title: 'مراجعة التقرير {ref}', subtitle: 'تقارير فريقك الميداني بانتظار المراجعة.', open: 'مراجعة التقرير', submitted: 'تاريخ الإرسال',
      photosOk: 'مستوفٍ للحد الأدنى', photosShort: 'أقل من الحد الأدنى', comment: 'تعليق للمندوب', commentHint: 'مطلوب عند إعادة التقرير',
      approveDeliver: 'اعتماد وتسليم', approveBody: 'يذهب التقرير للعميل ويُسجل وقت التسليم.',
      returned: 'أُعيد التقرير للمندوب', delivered: 'سُلّم التقرير للعميل', empty: 'لا توجد تقارير بانتظار المراجعة',
      returnedWith: 'أُعيد مع التعليقات:', reworkReason: 'طلب العميل تعديلًا:', previouslyReturned: 'أُعيد {n} مرة من قبل.',
      evidenceShort: '{photos}/{min} صور، {distance} م'
    },
    evidence: {
      title: 'الأدلة والتقرير', checkIn: 'تسجيل الوصول', notCheckedIn: 'لم يُسجَّل الوصول بعد', checkedInAt: 'تم تسجيل الوصول {time} على بعد {distance} م من العنوان',
      farFromAddress: 'أبعد من {max} م عن العنوان', photos: 'الصور ({n} من {min} مطلوبة)', photo: 'صورة دليل', noReport: 'لا توجد إجابات بعد',
      label: { entrance: 'المدخل', building: 'العقار', door: 'الباب', street: 'الشارع', premises: 'المقر', signboard: 'اللافتة' }
    },
    dispute: {
      title: 'النزاعات', flag: 'متنازع عليه', raise: 'فتح نزاع', raiseCase: 'نزاع على الحالة {ref}', raiseRating: 'الاعتراض على هذا التقييم',
      caseIntro: 'تراجع المنصة موقف الطرفين والسجل الزمني للحالة ثم تقرر.', ratingIntro: 'إذا قبلت المنصة اعتراضك يُستبعد التقييم من درجتك.',
      reasonLabel: 'السبب', details: 'التفاصيل', submit: 'فتح النزاع', opened: 'تم فتح النزاع',
      reason: { report_inaccurate: 'تقرير غير دقيق', evidence_missing: 'أدلة ناقصة', sla_missed: 'عدم الالتزام بالموعد', conduct: 'السلوك', billing: 'الفوترة', other: 'أخرى', rating_unfair: 'تقييم غير منصف', wrong_case: 'حالة خاطئة', abusive: 'ألفاظ مسيئة' },
      outcome: { upheld: 'مقبول', rejected: 'مرفوض', partial: 'مقبول جزئيًا' },
      party: { entity: 'الجهة', provider: 'مقدم الخدمة', admin: 'المنصة' },
      kindLabel: { case: 'حالة', rating: 'تقييم' },
      adminSubtitle: 'نزاعات الجهات حول الحالات ونزاعات مقدمي الخدمة حول التقييمات.', ref: 'النزاع', kind: 'بخصوص', raisedBy: 'مقدم من',
      parties: 'الجهة / مقدم الخدمة', none: 'لا توجد نزاعات', entitySide: 'الجهة: {name}', providerSide: 'مقدم الخدمة: {name}', noStatement: 'لا يوجد بيان بعد',
      disputedRating: 'التقييم محل النزاع', caseTimeline: 'السجل الزمني للحالة {ref}', openCase: 'فتح الحالة', adminNotes: 'ملاحظات المنصة',
      resolve: 'حسم النزاع', outcomeLabel: 'القرار', resolutionNote: 'مذكرة القرار',
      ratingEffects: 'القبول يستبعد التقييم من الدرجة، والقبول الجزئي يخفض وزنه للنصف، والرفض يُبقيه.',
      caseEffects: 'القبول يخصم الحالة من الفاتورة، والقبول الجزئي يخصم نصفها، والرفض لا يغير شيئًا.',
      addNote: 'إضافة ملاحظة', resolution: 'القرار', needOutcome: 'اختر القرار واكتب مذكرة.',
      resolveConfirm: 'حسم النزاع بقرار {outcome}؟ سيُبلغ الطرفان.', resolved: 'تم حسم النزاع',
      openBadge: 'نزاع مفتوح', resolvedBadge: 'النزاع: {outcome}'
    },
    batch: {
      label: 'الدفعة {ref}', subtitle: 'مجموعات حالات أُنشئت من الرفع المجمّع.', none: 'لا توجد دفعات بعد', ref: 'الدفعة', created: 'الإنشاء',
      progress: 'التقدم', providers: 'مقدمو الخدمة', ratingPending: 'بانتظار التقييم', createdOn: 'أُنشئت {date}', closedOf: '{closed} من {total} مغلقة',
      needsRatingNotice: 'انتهت كل الحالات. أغلق الدفعة بتقييم واحد لكل مقدم خدمة.', offers: 'العروض', group: 'المجموعة',
      wholeBatch: 'الدفعة كاملة', cases: 'الحالات', ratingsGiven: 'تقييم الدفعة', caseFlags: 'ملاحظات على حالات بعينها',
      casesTitle: 'الحالات ({n})', assignTitle: 'إسناد {n} حالة', modeSingle: 'مقدم خدمة واحد للدفعة كاملة', modeSplit: 'تقسيم حسب المحافظة',
      oneProvider: 'مقدم الخدمة', noSingleProvider: 'لا يوجد مقدم خدمة واحد يغطي كل محافظات الدفعة، قسّمها حسب المحافظة.',
      noProviderForGroup: 'لا يوجد مقدم خدمة مؤهل', sendOffers: 'إرسال العروض', sendOffersBody: 'تُقبل العروض أو تُرفض كاملة، ولدى مقدمي الخدمة {hours} ساعات.',
      offersSent: 'تم إرسال العروض', pickAll: 'اختر مقدم خدمة لكل مجموعة', acceptAll: 'قبول {n} تقرير مسلّم',
      acceptAllTitle: 'قبول كل التقارير المسلّمة', acceptAllBody: 'سيُقبل كل تقرير مسلّم في هذه الدفعة وتُغلق حالته.',
      accepted: 'تم قبول {n} تقرير', closeAndRate: 'إغلاق الدفعة وتقييمها', closeTitle: 'إغلاق الدفعة {ref}',
      closeIntro: 'قيّم كل مقدم خدمة في هذه الدفعة تقييمًا واحدًا، ويمكنك إضافة ملاحظة قصيرة على حالات بعينها.',
      casesClosed: '{n} حالة مغلقة', flagNote: 'ملاحظة', flagHint: 'ملاحظة اختيارية عن هذه الحالة', closed: 'تم إغلاق الدفعة'
    },
    bulk: {
      subtitle: 'ارفع ملف Excel أو CSV، وصحح الصفوف التي بها أخطاء، ثم أنشئ الدفعة.', step1: '1. الخدمة والنموذج',
      step2: '2. رفع الملف', step3: '3. مراجعة الصفوف', step4: '4. إنشاء الدفعة', downloadTemplate: 'تحميل نموذج Excel',
      downloadDemo: 'تحميل ملف تجريبي (30 صفًا، 3 بها أخطاء)', templateHint: 'تقبل المحافظة الاسم بالعربية أو الإنجليزية، وتُفصل أنواع التحري بفواصل.',
      loaded: '{name}: {n} صف', validRows: '{n} صحيح', errorRows: '{n} بها أخطاء', excludedRows: '{n} مستبعد', onlyErrors: 'الصفوف التي بها أخطاء فقط',
      fixHint: 'عدّل الخلية لتصحيحها أو ألغِ تحديد الصف لاستبعاده.', row: 'الصف', include: 'تضمين', issues: 'المشكلات', ok: 'سليم',
      batchName: 'اسم الدفعة', batchNameHint: 'مثال: طلبات سبتمبر', periodDays: 'فترة التحصيل (أيام)',
      fixBeforeCreate: 'صحح أو استبعد {n} صف قبل إنشاء الدفعة.', create: 'إنشاء دفعة من {n} حالة',
      confirmTitle: 'إنشاء الدفعة', confirmBody: 'ستُنشأ {n} حالة كمسودات، وتختار مقدمي الخدمة في الشاشة التالية.', created: 'تم إنشاء الدفعة {ref}',
      col: {
        full_name: 'الاسم بالكامل', national_id: 'الرقم القومي', mobile: 'الموبايل', mobile_2: 'موبايل 2', inquiry_types: 'أنواع التحري', governorate: 'المحافظة',
        city: 'المدينة', street: 'الشارع', landmark: 'علامة مميزة', employer_name: 'جهة العمل', business_name: 'النشاط', guarantor_name: 'الضامن',
        guarantor_mobile: 'موبايل الضامن', instructions: 'التعليمات', internal_ref: 'المرجع الداخلي', contract_number: 'العقد',
        product_type: 'المنتج', original_amount: 'الأصلي', overdue_amount: 'المتأخر', instalment_amount: 'القسط', days_past_due: 'أيام التأخير', collateral: 'الضمان'
      }
    },
    invoice: {
      subtitle: 'فواتير شهرية لكل مقدم خدمة، تُضاف البنود عند إغلاق الحالات.', outstanding: 'المستحق', accruing: 'قيد الاستحقاق هذا الشهر',
      accruingSub: 'مسودة لم تصدر بعد', paidTotal: 'المدفوع', ref: 'الفاتورة', month: 'الشهر', provider: 'مقدم الخدمة', client: 'الجهة', lines: 'البنود',
      total: 'الإجمالي', markPaid: 'تعليم كمدفوعة', payBody: 'تسجيل أن هذه الفاتورة مدفوعة. هذه محاكاة ولا تتحرك أموال فعلية.', paid: 'تم تعليم الفاتورة كمدفوعة',
      none: 'لا توجد فواتير', title: 'الفاتورة {ref}', closed: 'تاريخ الإغلاق', amount: 'المبلغ', adjusted: 'عُدّلت إلى {pct}% بعد نزاع',
      platformFee: 'رسوم المنصة', issue: 'إصدار', issueBody: 'إصدار هذه الفاتورة للجهة لتصبح قابلة للدفع.', issued: 'تم إصدار الفاتورة'
    },
    earnings: {
      subtitle: 'الأرباح لكل حالة بعد رسوم المنصة البالغة {pct}%.', monthGross: 'هذا الشهر، إجمالي', monthNet: 'هذا الشهر، صافي', afterFee: 'بعد رسوم المنصة',
      accruing: 'قيد الاستحقاق', accruingSub: 'لم تصدر الفاتورة بعد', pending: 'بانتظار الصرف', pendingSub: 'صدرت الفاتورة ولم تُدفع', paidOut: 'تم الصرف',
      perCase: 'لكل حالة', gross: 'الإجمالي', fee: 'رسوم المنصة', net: 'الصافي', payout: 'الصرف', none: 'لا توجد أرباح بعد', adjusted: 'معدلة بسبب نزاع'
    },
    reports: {
      subtitle: 'أداء مقدمي الخدمة الذين تتعامل معهم.', onTime: 'نسبة الالتزام بالموعد لكل مقدم خدمة (%)', volume: 'الحالات شهريًا لكل مقدم خدمة',
      comparison: 'مقارنة مقدمي الخدمة', cases: 'الحالات', turnaround: 'مدة الإنجاز', avgRating: 'متوسط تقييمك', breaches: 'حالات التأخير', spend: 'الإنفاق'
    },
    users: {
      subtitle: 'الأشخاص في جهتك الذين يمكنهم استخدام المنصة.', invite: 'دعوة مستخدم', invited: 'مدعو', access: 'الصلاحيات',
      deactivate: 'إيقاف', reactivate: 'إعادة التفعيل', deactivateBody: 'لن يتمكن المستخدم من الدخول، وتبقى إجراءاته السابقة في سجل التدقيق.',
      inviteNote: 'الدعوة في هذا العرض محاكاة، ويظهر المستخدم في قائمة التبديل فورًا.', sendInvite: 'إرسال الدعوة',
      invitedToast: 'أُرسلت الدعوة إلى {email}', roleChanged: 'تم تغيير الدور'
    },
    team: {
      subtitle: '{n} مندوب ميداني', delivered: 'المسلّم', returns: 'الإعادات والتعديلات', collected: 'المحصّل', closed: 'المغلق',
      actions: 'الإجراءات المسجلة', activate: 'تفعيل', deactivate: 'إيقاف', deactivateBody: 'يتوقف المندوب عن استلام التكليفات ولا يمكنه الدخول.'
    },
    profile: {
      basics: 'بيانات الشركة', description: 'الوصف', city: 'المدينة', services: 'الخدمات', documents: 'المستندات',
      upload: 'رفع', uploadBody: 'رفع {doc}؟ الرفع في هذا العرض محاكاة.', uploaded: 'تم رفع المستند',
      docsNote: 'تراجع المنصة المستندات قبل الاعتماد.', coverage: 'التغطية والسعة',
      coverageHint: 'حدد المحافظات التي تغطيها وعدد الحالات المفتوحة التي يمكنك إدارتها في كل منها.', capacity: 'السعة', load: 'مفتوح الآن: {n}',
      invPricing: 'أسعار التحري (جنيه) والتزام مستوى الخدمة', pricingHint: 'يجب أن تكون الأسعار ضمن نطاقات المنصة الموضحة أسفل كل خانة.',
      slaHours: 'مستوى الخدمة (ساعات)', colPricing: 'أتعاب التحصيل', feeHint: 'نسبة من المبلغ المحصّل لكل شريحة أيام تأخير.',
      fixedFee: 'رسم ثابت لكل حالة (جنيه)', max: 'الحد الأقصى {n}', firstContact: 'أول تواصل خلال (ساعات)', saved: 'تم حفظ الملف'
    },
    providerRatings: {
      subtitle: 'تقييمات العملاء. رد علنًا أو اعترض على تقييم عبر المنصة.', none: 'لا توجد تقييمات بعد', summary: 'الملخص',
      newExplain: 'تظهر النجوم للعملاء بعد وصولك إلى {n} تقييمات.', weighting: 'تحسب تقييمات آخر {days} يومًا مرتين، ولا يتجاوز نصيب عميل واحد {cap}% من جزء التقييم.'
    },
    clientRating: {
      subtitle: 'قيّم الجهات التي تعمل لصالحها في جودة البيانات والالتزام بالدفع، ويرى مقدمو الخدمة الآخرون المتوسطات.',
      pending: 'بانتظار تقييمك ({n})', nonePending: 'لا يوجد ما يُقيّم', given: 'تقييماتك', rateBtn: 'تقييم العميل', rateTitle: 'تقييم {name}',
      intro: 'بخصوص {ref}.', dataQuality: 'جودة البيانات', dataQualityHint: 'هل كانت العناوين والأرقام والتعليمات كاملة وصحيحة؟',
      paymentTimeliness: 'الالتزام بالدفع', none: 'لا توجد تقييمات للعميل بعد', basedOn: 'من {n} تقييم لمقدمي الخدمة', batchOf: 'دفعة، {n} حالة'
    },
    portfolio: {
      subtitle: 'التحصيل لكل دفعة ولكل عميل في الشهر المختار.', collectionOnly: 'متاح في مساحة التحصيل.',
      overdue: 'المتأخر', recoveredMonth: 'المحصّل خلال الشهر', byBatch: 'حسب الدفعة', portfolio: 'المحفظة', singles: 'حالات فردية',
      openN: '{n} مفتوحة', ptp: 'الوعود المُوفى بها', ptpConversion: 'تحويل الوعود'
    },
    agent: {
      tabs: { tasks: 'المهام', returned: 'المُعادة', performance: 'الأداء', earnings: 'الأرباح' },
      myTasks: 'مهامي', overdue: 'متأخرة', today: 'اليوم', upcoming: 'قادمة', route: 'ترتيب المسار', waiting: 'بانتظار المراجعة',
      noneOverdue: 'لا توجد مهام متأخرة', noneToday: 'لا يوجد مستحق اليوم', noneUpcoming: 'لا توجد مهام قادمة', noRoute: 'لا توجد مهام مفتوحة',
      waitingQa: 'تم الإرسال، بانتظار مراجعة جودة المنصة.', waitingSupervisor: 'تم الإرسال، بانتظار مشرفك.',
      checkInHint: 'سجل وصولك عند بلوغ العنوان، فيُحفظ موقعك ويُتاح إرسال التقرير.',
      addPhoto: 'التقاط أو إضافة صورة', photoStamp: 'تُختم كل صورة بالوقت وموقعك.', photoAdded: 'تمت إضافة الصورة',
      removePhoto: 'حذف الصورة', removePhotoBody: 'حذف هذه الصورة من الأدلة؟', reportFor: 'التقرير: {type}', saved: 'محفوظ',
      saveAnswers: 'حفظ الإجابات', answersSaved: 'تم حفظ الإجابات', savedIncomplete: 'تم الحفظ لكن بعض الإجابات المطلوبة ناقصة',
      submit: 'الإرسال للمراجعة', chkCheckIn: 'تم تسجيل الوصول للعنوان', chkPhotos: 'الصور: {n} من {min}', chkForms: 'كل نماذج التقرير مكتملة',
      goesToQa: 'تذهب تقارير المستقلين إلى جودة المنصة.', goesToSupervisor: 'يذهب التقرير إلى مشرفك.',
      submitBody: 'لا يمكنك تعديل التقرير بعد الإرسال.', submitted: 'تم إرسال التقرير', yourReport: 'تقريرك',
      logWork: 'تسجيل العمل', returnedTitle: 'المهام المُعادة', noneReturned: 'لا توجد مهام مُعادة إليك', performanceTitle: 'أدائي',
      openTasks: 'المهام المفتوحة', completedMonth: 'المنجز هذا الشهر', returnRate: 'نسبة الإعادة', avgDistance: 'متوسط مسافة تسجيل الوصول',
      meters: '{n} م', collectedMonth: 'المحصّل هذا الشهر', collectedTotal: 'إجمالي المحصّل'
    },
    admin: {
      overviewTitle: 'نظرة عامة على المنصة', gmvMonth: 'إجمالي المعاملات هذا الشهر', gmvTotal: '{amount} منذ البداية', gmv: 'إجمالي المعاملات', revenueMonth: 'إيراد المنصة هذا الشهر',
      missedTotal: '{n} حالة تأخير إجمالًا', activeEntities: 'الجهات النشطة', activeProviders: 'مقدمو الخدمة النشطون', suspendedN: '{n} موقوف',
      openDisputes: 'النزاعات المفتوحة', casesByStatus: 'الحالات حسب الحالة', gmvSeries: 'إجمالي المعاملات شهريًا', topProviders: 'أفضل مقدمي الخدمة', bottomProviders: 'أقل الدرجات',
      providersSubtitle: 'مقدمو الخدمة المعتمدون مع الدرجة وحالة الإجراءات.', openCases: 'الحالات المفتوحة', enforcement: 'الإجراءات',
      warn: 'إنذار', reduce: 'خفض الترتيب', suspend: 'إيقاف', reactivate: 'إعادة التفعيل', backToAuto: 'العودة للتلقائي',
      scoreFor: 'درجة {service}', volume: 'الحجم', team: 'الفريق', ratingsReceived: 'التقييمات المستلمة ({n})', history: 'السجل',
      enforceTitle: 'تعيين الحالة: {level}',
      enforceBody: {
        none: 'يعود مقدم الخدمة لوضع جيد ويظهر في السوق، وتبقى الإجراءات التلقائية متوقفة حتى تعيد تشغيلها.',
        warned: 'يتلقى مقدم الخدمة إنذارًا وينخفض ترتيبه قليلًا.', reduced: 'ينخفض ترتيب مقدم الخدمة في السوق.',
        suspended: 'يختفي مقدم الخدمة من السوق ولا يمكنه قبول العروض.'
      },
      enforced: 'تم تحديث الحالة', entitiesSubtitle: 'الجهات الطالبة مع الحجم والإنفاق وتقييم جودة البيانات من مقدمي الخدمة.',
      spend: 'الإنفاق', dataQualityRating: 'تقييم مقدمي الخدمة', forceReassign: 'إعادة إسناد إجبارية', extendSla: 'تمديد مستوى الخدمة', reasonRequired: 'إجراءات المدير تتطلب سببًا.',
      reassignBody: 'يفقد مقدم الخدمة الحالي الحالة ويُرسل عرض جديد لمقدم الخدمة الذي تختاره.', reassigned: 'أُرسل العرض لمقدم الخدمة الجديد',
      extendHours: 'التمديد بالساعات', extended: 'تم تمديد مستوى الخدمة', cancelBody: 'تُلغى الحالة للطرفين.', billingSubtitle: 'إصدار مسودات الفواتير للجهات.'
    },
    onboarding: {
      subtitle: 'طلبات الانضمام من الشركات والمستقلين.', applied: 'قُدّم {date}', contact: 'جهة الاتصال', freelancerChecks: 'فحوصات المستقل',
      idVerified: 'تم التحقق من الهوية', certified: 'اجتاز التدريب', verify: 'اعتماد', verifyBody: 'يظهر مقدم الخدمة في السوق ويحصل على حساب دخول.',
      verified: 'تم اعتماد مقدم الخدمة', reject: 'رفض', requestInfo: 'طلب معلومات إضافية', whatIsMissing: 'ما الناقص', send: 'إرسال', none: 'لا توجد طلبات معلقة'
    },
    qa: { subtitle: 'تقارير المستقلين. اعتمدها لتسليمها للعميل أو أعدها مع التعليقات.' },
    moderation: {
      subtitle: 'ملاحظات مُبلغ عنها. الإخفاء يُبقي التقييم في الدرجة ويخفي النص.', flagged: 'مُبلغ عنها', hidden: 'مخفية', all: 'كل الملاحظات',
      by: 'من {name}', hiddenBadge: 'مخفي', flagReason: 'أبلغ مقدم الخدمة: {reason}', hide: 'إخفاء', restore: 'استعادة', dismiss: 'تجاهل البلاغ',
      hideBody: 'يُخفى نص الملاحظة عن الجميع عدا المديرين.', none: 'لا يوجد ما يحتاج إشرافًا'
    },
    scoring: {
      subtitle: 'تعيد التغييرات حساب درجة كل مقدم خدمة ومستوى الإجراءات فورًا.', weights: 'الأوزان والفترة',
      operationalWeight: 'المؤشرات التشغيلية (%)', ratingWeight: 'تقييمات العملاء (%)', sumHint: 'يجب أن يكون مجموع الوزنين 100.',
      recencyDays: 'فترة الحداثة (أيام)', recencyHint: 'تُحسب التقييمات داخل الفترة {x} مرات.', minRatings: 'أقل عدد تقييمات لإظهار النجوم',
      minRatingsHint: 'أقل من ذلك تظهر شارة جديد.', entityCap: 'أقصى نصيب لجهة واحدة (%)', entityCapHint: 'يمنع سيطرة عميل واحد على جزء التقييم.',
      thresholds: 'حدود الإجراءات', thresholdsHint: 'مقدم الخدمة الذي تقل درجته عن حد يتلقى إنذارًا أو يُخفض ترتيبه أو يُوقف تلقائيًا. الإيقاف < الخفض < الإنذار.',
      warnBelow: 'إنذار أقل من', reduceBelow: 'خفض الترتيب أقل من', suspendBelow: 'إيقاف أقل من', saveRecalc: 'حفظ وإعادة الحساب',
      confirmBody: 'ستُعاد حساب كل الدرجات ومستويات الإجراءات الآن.', saved: 'أُعيد حساب الدرجات', savedChanges: 'أُعيد حساب الدرجات. تغيّر: {list}',
      formula: 'طريقة حساب الدرجة', formulaText: 'الدرجة = الوزن التشغيلي × المؤشرات التشغيلية + وزن التقييم × تقييمات العملاء، وكل منهما على مقياس من 0 إلى 100.',
      noComplaints: 'غياب الشكاوى', rankingText: 'يضرب ترتيب السوق الدرجة في معامل التوافر وأي خصم بسبب الإجراءات، ويُخفى مقدمو الخدمة الممتلئة سعتهم.',
      current: 'الدرجات الحالية'
    },
    pricing: {
      subtitle: 'نطاقات الأسعار ورسوم المنصة ومستويات الخدمة الافتراضية ومهلة العروض.', general: 'عام', fee: 'رسوم المنصة (%)', feeHint: 'تُخصم من مستحقات مقدمي الخدمة.',
      window: 'مهلة قبول العرض (ساعات)', windowHint: 'تنتهي العروض بعدها.', warn: 'تنبيه الانتهاء (دقائق قبل)', collectionDays: 'فترة التحصيل الافتراضية (أيام)',
      invBands: 'نطاقات أسعار التحري (جنيه، أساس القاهرة الكبرى)', min: 'الأدنى', max: 'الأقصى', defaultSla: 'مستوى الخدمة الافتراضي (ساعات)', minPhotos: 'أقل عدد صور',
      zones: 'معاملات المناطق', colBands: 'نطاقات أتعاب التحصيل (% من المحصّل)', fixedFeeMax: 'أقصى رسم ثابت للحالة (جنيه)', saved: 'تم حفظ الأسعار'
    },
    settings: {
      subtitle: 'القوائم المستخدمة في المنصة.', list: { governorates: 'المحافظات', inquiryTypes: 'أنواع التحري', actionTypes: 'إجراءات التحصيل', ratingTags: 'وسوم التقييم', declineReasons: 'أسباب الرفض', productTypes: 'أنواع المنتجات' },
      id: 'المعرّف', en: 'الإنجليزية', ar: 'العربية', field: { zone: 'المنطقة', code: 'كود الرقم القومي', lat: 'خط العرض', lng: 'خط الطول', defaultSlaHours: 'ساعات الخدمة', minPhotos: 'الصور', kind: 'النوع', sentiment: 'الطابع' },
      opt: { contact: 'تواصل', visit: 'زيارة', result: 'نتيجة', note: 'ملاحظة', positive: 'إيجابي', negative: 'سلبي' },
      addRow: 'إضافة صف', discard: 'تجاهل التغييرات', removeTitle: 'حذف عنصر', removeBody: 'تحتفظ الحالات الحالية بالقيمة، ولن تظهر للحالات الجديدة.',
      saved: 'تم حفظ القائمة', note: 'لا يمكن تغيير معرّفات العناصر الموجودة لأن الحالات تشير إليها.'
    },
    audit: {
      subtitle: 'يظهر {n} قيد، الأحدث أولًا.', who: 'من', what: 'ماذا', target: 'الهدف', beforeAfter: 'قبل وبعد',
      type: { case: 'حالة', offer: 'عرض', batch: 'دفعة', provider: 'مقدم خدمة', rating: 'تقييم', dispute: 'نزاع', invoice: 'فاتورة', config: 'إعدادات', user: 'مستخدم', agent: 'مندوب', entity: 'جهة', clock: 'الساعة' },
      action: {
        case_submit: 'أُرسلت الحالة', case_send_offer: 'أُرسل العرض', case_decline: 'رُفض العرض', case_expire: 'انتهى العرض', case_accept: 'قُبلت الحالة',
        case_assign: 'كُلّف مندوب', case_check_in: 'سُجل الوصول', case_submit_report: 'أُرسل التقرير', case_return_to_agent: 'أُعيد التقرير',
        case_resume: 'استُؤنف العمل', case_approve: 'سُلّم التقرير', case_request_rework: 'طُلب تعديل', case_accept_report: 'قُبل التقرير',
        case_close: 'أُغلقت الحالة', case_cancel: 'أُلغيت الحالة', case_force_reassign: 'إعادة إسناد إجبارية', case_start: 'بدأ العمل',
        case_request_settlement: 'طُلبت تسوية', case_approve_settlement: 'وُوفق على التسوية', case_reject_settlement: 'رُفضت التسوية',
        case_recall: 'سُحبت الحالة', case_created: 'أُنشئت الحالة', case_updated: 'عُدّلت المسودة', case_photo_added: 'أُضيفت صورة',
        case_action_logged: 'سُجل إجراء تحصيل', case_promise_recorded: 'سُجل وعد بالسداد', case_payment_recorded: 'سُجلت دفعة',
        case_sla_extended: 'مُدد مستوى الخدمة', case_sla_breached: 'تُجوز مستوى الخدمة', offer_sent: 'أُرسل عرض', offer_accept: 'قُبل عرض', offer_decline: 'رُفض عرض',
        batch_created: 'أُنشئت دفعة', batch_assigned: 'أُسندت دفعة', batch_closed: 'أُغلقت دفعة', rating_created: 'أُعطي تقييم', rating_reply: 'رد على تقييم',
        rating_flagged: 'أُبلغ عن ملاحظة', rating_hidden: 'أُخفيت ملاحظة', rating_restored: 'استُعيدت ملاحظة', rating_flag_dismissed: 'تُجوهل بلاغ',
        client_rating_created: 'قُيّم عميل', dispute_opened: 'فُتح نزاع', dispute_response: 'ملاحظة على نزاع', dispute_resolved: 'حُسم نزاع',
        invoice_paid: 'دُفعت فاتورة', invoice_issued: 'صدرت فاتورة', provider_verify: 'اعتُمد مقدم خدمة', provider_reject: 'رُفض طلب انضمام',
        provider_request_info: 'طُلبت معلومات إضافية', provider_check_idVerified: 'حُدّث فحص الهوية', provider_check_certified: 'حُدّث فحص التدريب',
        provider_enforcement_auto: 'إجراء تلقائي', provider_enforcement_manual: 'إجراء بقرار المدير', provider_enforcement_auto_on: 'تفعيل الإجراءات التلقائية',
        provider_profile_updated: 'حُدّث الملف', provider_document_uploaded: 'رُفع مستند', provider_agent_activated: 'فُعّل مندوب',
        provider_agent_deactivated: 'أُوقف مندوب', entity_user_invited: 'دُعي مستخدم', entity_user_role: 'تغير الدور',
        entity_user_activated: 'فُعّل مستخدم', entity_user_deactivated: 'أُوقف مستخدم', config_scoring: 'تغيرت إعدادات الدرجات',
        config_pricing: 'تغيرت الأسعار', config_list: 'تغيرت قائمة إعدادات', demo_clock_advance: 'تقدمت ساعة العرض'
      }
    },
    demo: {
      subtitle: 'قدّم الوقت لتفعيل انتهاء العروض وتنبيهات مستوى الخدمة والتجاوزات والوعود غير المُوفى بها.', clock: 'ساعة العرض',
      ahead: 'متقدمة {time} عن الوقت الفعلي', realTime: 'تعمل بالوقت الفعلي', advance1h: 'تقديم ساعة', advance5h: 'تقديم 5 ساعات',
      advance1d: 'تقديم يوم', hours: 'ساعات', advanceBy: 'تقديم', resetClock: 'العودة للوقت الفعلي', advanced: 'تم تقديم الساعة',
      tickSummary: 'آخر قفزة: انتهاء {expired} عرض، {warned} تنبيه انتهاء، {atRisk} معرضة للتأخير، {breached} متجاوزة، {promises} وعد لم يُوفَ.',
      clockHint: 'تتقدم الساعة أيضًا كل 30 ثانية بالوقت الفعلي.', data: 'بيانات العرض', reset: 'إعادة ضبط بيانات العرض',
      resetHint: 'استعادة البيانات الأولية: 3 جهات، 8 مقدمي خدمة، نحو 90 حالة، وتقييمات ونزاعات وفواتير.', resetTitle: 'إعادة ضبط بيانات العرض',
      resetMessage: 'ستُفقد كل التغييرات وتُستعاد البيانات الأولية.', resetDone: 'تمت استعادة بيانات العرض',
      simulateHint: 'تحريك كل حالة مفتوحة في دفعة عبر سير العمل (قبول، تكليف، تسجيل وصول، تقرير، اعتماد أو تحصيل).',
      simulate: 'محاكاة العمل الميداني', simulateBody: 'تتقدم كل حالة مفتوحة في هذه الدفعة عبر سير العمل الفعلي.', simulated: 'تقدمت {n} حالة',
      guide: 'سيناريوهات الاختبار',
      scenario: {
        1: 'التحري: بصفتك تامر لطفي (حورس، الائتمان) أنشئ طلب سكن في الجيزة، رتّب حسب الدرجة واختر. اقبل كمدير مقدم الخدمة، كلّف كمشرف، سجل الوصول وأضف 3 صور وأرسل كمندوب، اعتمد كمشرف، ثم اقبل وقيّم كتامر.',
        2: 'التعديل: على تقرير مسلّم اطلب تعديلًا كجهة. يعيده المشرف للمندوب ويعيد المندوب الإرسال، فتنخفض نسبة القبول من أول مرة في ملف مقدم الخدمة.',
        3: 'انتهاء العرض: أرسل عرضًا ثم قدّم الساعة 5 ساعات من هنا. تُبلغ الجهة، ثم استخدم اختيار الأفضل تلقائيًا على الحالة.',
        4: 'التحصيل: بصفتك يوسف كامل أنشئ حالة تحصيل بصلاحية خصم 20% لشركة ريكفري بارتنرز. بصفتك طارق حلمي سجل مكالمة ووعدًا، قدّم يومًا، سجل دفعة جزئية واطلب خصم 15%. وافق كيوسف، ادفع الباقي، أغلق كرحاب أنور، ثم قيّم كيوسف.',
        5: 'الرفع المجمّع: حمّل الملف التجريبي من الرفع المجمّع، صحح الصفوف الثلاثة، أنشئ الدفعة، قسّمها حسب المحافظة، اقبل كمقدمي خدمة، حاكِ العمل الميداني من هنا، اقبل الكل وأغلق الدفعة بتقييم.',
        6: 'المستقل: أرسل حالة سكن في الجيزة إلى عمر حسن، فيذهب تقريره إلى قائمة الجودة (زياد عزت) لا إلى مشرف.',
        7: 'نزاع التقييم: بصفتك فادي ميخائيل (كايرو كولكت) اعترض على تقييم بنجمة واحدة، واقبل الاعتراض كمدير فيُستبعد التقييم من الدرجة.',
        8: 'الإجراءات: ارفع حد الإيقاف إلى 50 (والخفض 55) في التقييم الرقمي، فتُوقف كايرو كولكت وتختفي من السوق.',
        9: 'مستوى الخدمة: قدّم الساعة على حالة مقبولة فتصبح برتقالية عند 80% وحمراء عند الموعد، وتُبلغ الجهة ومقدم الخدمة والمدير.',
        10: 'العربية: غيّر اللغة من أعلى الصفحة وكرر السيناريو 1، فتنعكس الواجهة من اليمين لليسار.'
      }
    },
    charts: { unavailable: 'تحتاج الرسوم البيانية اتصالًا بالإنترنت لتحميلها.' },
    notif: {
      offer_new: 'عرض جديد: {count} حالة بانتظار ردك', offer_expiring: 'ينتهي العرض على {count} حالة خلال {minutes} دقيقة',
      offer_accepted: 'قبل {provider} {ref}', offer_declined: 'رفض {provider} {ref}. اختر مقدم خدمة آخر.',
      offer_expired: 'انتهى العرض على {ref}. اختر مقدم خدمة آخر.', offer_expired_provider: 'انتهى عرض على {count} حالة',
      case_assigned: 'كُلّفت بالحالة {ref}', route_assigned: 'كُلّفت بمسار من {count} حالة', report_submitted: 'تقرير {ref} بانتظار المراجعة',
      report_returned: 'أُعيد إليك تقرير {ref}', report_delivered: 'سُلّم تقرير {ref}', rework_requested: 'طلب العميل تعديلًا على {ref}',
      report_accepted: 'قبل العميل تقرير {ref}', case_closed: 'أُغلقت {ref}', case_closed_outcome: 'أُغلقت {ref}: {outcome}',
      settlement_pending: 'طلب تسوية على {ref} يحتاج قرارك', settlement_decided: 'التسوية على {ref}: {decision}',
      case_recalled: 'سحب العميل {ref}', case_cancelled: 'أُلغيت {ref}', case_reassigned: 'أُعيد إسناد {ref} إلى {provider}',
      case_reassigned_away: 'أُعيد إسناد {ref} لمقدم خدمة آخر', sla_at_risk: '{ref} معرضة لتجاوز مستوى الخدمة', sla_breached: 'تجاوزت {ref} مستوى الخدمة',
      sla_extended: 'مُدد مستوى الخدمة لـ {ref} بمقدار {hours} ساعة', ptp_broken: 'لم يُوفَ بالوعد بالسداد على {ref}', payment_recorded: 'سُجلت دفعة {amount} على {ref}',
      rating_received: 'حصلت على تقييم {stars} نجوم', rating_flagged: 'أُبلغ عن ملاحظة على {ref}', dispute_opened: 'فُتح النزاع {ref}',
      dispute_resolved: 'حُسم النزاع {ref}: {outcome}', invoice_issued: 'صدرت الفاتورة {ref}', invoice_paid: 'دُفعت الفاتورة {ref}',
      enforcement_changed: 'تغيرت حالة حسابك: {level}', enforcement_admin: 'تغيرت حالة {provider} تلقائيًا: {level}',
      provider_verified: 'تم اعتماد حسابك', batch_progress: 'تقدمت الدفعة {ref}'
    },
    errors: {
      generic: 'حدث خطأ ما', required: 'مطلوب', number: 'أدخل رقمًا', min: 'القيمة أقل من المسموح', max: 'القيمة أكبر من المسموح', date: 'أدخل تاريخًا صحيحًا',
      nationalIdFormat: 'يجب أن يتكون الرقم القومي من 14 رقمًا ويبدأ بـ 2 أو 3', nationalIdDate: 'تاريخ الميلاد في الرقم القومي غير صحيح',
      nationalIdGov: 'كود المحافظة في الرقم القومي غير معروف', mobileFormat: 'يجب أن يتكون الموبايل من 11 رقمًا ويبدأ بـ 010 أو 011 أو 012 أو 015',
      unknownGovernorate: 'محافظة غير معروفة', unknownInquiryType: 'نوع تحري غير معروف', unknownProduct: 'نوع منتج غير معروف',
      deadlinePast: 'يجب أن يكون في المستقبل', overdueAboveOriginal: 'لا يمكن أن يتجاوز المبلغ المتأخر المبلغ الأصلي', fixHighlighted: 'صحح الحقول المميزة',
      formInvalid: 'بعض الحقول تحتاج مراجعة', notSignedIn: 'سجل الدخول أولًا', forbidden: 'ليست لديك صلاحية لذلك', forbiddenService: 'دورك لا يشمل هذه الخدمة',
      notFound: 'غير موجود', notEditable: 'لم يعد التعديل ممكنًا', providerNotEligible: 'مقدم الخدمة هذا غير مؤهل لهذه الحالة',
      useDedicatedAction: 'استخدم الشاشة المخصصة لهذا الإجراء', agentInactive: 'هذا المندوب غير نشط', agentWrongService: 'هذا المندوب لا يعمل في هذه الخدمة',
      checkInFirst: 'سجل الوصول للعنوان أولًا', offerNotPending: 'لم يعد هذا العرض مفتوحًا', offerExpired: 'انتهت مهلة هذا العرض',
      providerSuspended: 'حسابك موقوف', ratingRequired: 'اختر تقييمًا من 1 إلى 5', criteriaRequired: 'قيّم كل معيار',
      ratingIncomplete: 'قيّم التقييم العام وكل معيار', rateAfterClose: 'يمكنك التقييم بعد إغلاق الحالة', rateBatchInstead: 'قيّم هذه الحالة من خلال دفعتها',
      alreadyRated: 'تم التقييم مسبقًا', disputeExists: 'يوجد نزاع مفتوح بالفعل', disputeClosed: 'هذا النزاع مغلق', outcomeRequired: 'اختر القرار',
      reasonRequired: 'السبب مطلوب', batchHasErrors: 'صحح أو استبعد الصفوف التي بها أخطاء أولًا', batchEmpty: 'لا توجد صفوف للإنشاء',
      nothingToAssign: 'لا توجد حالات تحتاج مقدم خدمة', groupWithoutProvider: 'توجد مجموعة محافظة بلا مقدم خدمة', fileRead: 'تعذرت قراءة الملف',
      fileEmpty: 'الملف لا يحتوي صفوفًا', xlsxMissing: 'لم تُحمّل مكتبة Excel. تحقق من اتصالك بالإنترنت.',
      weightsSum: 'يجب أن يكون مجموع الأوزان 100', thresholdOrder: 'يجب ترتيب الحدود: الإيقاف < الخفض < الإنذار', capRange: 'يجب أن يكون الحد بين 10 و100',
      feeRange: 'يجب أن تكون الرسوم بين 0 و50', windowRange: 'يجب أن تكون المهلة بين 1 و72 ساعة', bandOrder: 'يجب أن يكون الحد الأدنى أقل من الأقصى',
      listItemInvalid: 'كل صف يحتاج معرّفًا واسمًا بالإنجليزية', listDuplicate: 'يجب ألا تتكرر المعرّفات',
      priceOutOfBand: 'سعر {type} في {zone} يجب أن يكون بين {min} و{max}', feeOutOfBand: 'أتعاب {bucket} يجب أن تكون بين {min}% و{max}%',
      fixedFeeOutOfBand: 'يجب ألا يتجاوز الرسم الثابت {max}', coverageRequired: 'غطِّ محافظة واحدة على الأقل',
      freelancerChecks: 'يحتاج المستقل للتحقق من الهوية واجتياز التدريب قبل الاعتماد', documentsMissing: 'بعض المستندات ناقصة',
      emailFormat: 'أدخل بريدًا إلكترونيًا صحيحًا', emailTaken: 'هذا البريد مستخدم بالفعل', lastAdmin: 'يجب الإبقاء على مدير واحد على الأقل', cannotDeactivateSelf: 'لا يمكنك إيقاف نفسك',
      invoiceNotIssued: 'يمكن دفع الفواتير الصادرة فقط', invoiceNotDraft: 'يمكن إصدار المسودات فقط', invoiceEmpty: 'الفاتورة بلا بنود',
      storageFull: 'مساحة تخزين المتصفح ممتلئة. أعد ضبط بيانات العرض أو احذف بعض الصور.'
    },
    wf: {
      err: {
        unknownAction: 'إجراء غير معروف', wrongService: 'خدمة غير مطابقة لهذه الحالة', invalidState: 'غير ممكن في هذه المرحلة',
        role: 'دورك لا يسمح بذلك', notOwner: 'هذه الحالة ليست لك', providerRequired: 'اختر مقدم خدمة',
        providerDeclined: 'رفض مقدم الخدمة هذه الحالة من قبل', sameProvider: 'اختر مقدم خدمة مختلفًا', reasonRequired: 'السبب مطلوب',
        agentRequired: 'اختر مندوبًا', checkInRequired: 'سجل الوصول للعنوان أولًا', photosRequired: 'أضف الحد الأدنى من الصور',
        reportIncomplete: 'أكمل كل نماذج التقرير', commentRequired: 'أضف تعليقًا للمندوب', reviewerQa: 'تراجع جودة المنصة تقارير المستقلين',
        reviewerSupervisor: 'يراجع مشرف الشركة تقاريرها', entityCancelAfterAccept: 'يمكن للجهة الإلغاء قبل القبول فقط. اسحب الحالة أو تواصل مع المنصة.',
        settlementKind: 'اختر نوع التسوية', noSettlementAuthority: 'لم تمنح الجهة صلاحية تسوية على هذه الحالة',
        settlementKindNotAllowed: 'نوع التسوية هذا غير مسموح على هذه الحالة', discountRequired: 'أدخل نسبة الخصم',
        discountAboveAuthority: 'الخصم أعلى من الصلاحية التي حددتها الجهة', instalmentsRequired: 'أدخل قسطين على الأقل',
        outcomeRequired: 'اختر النتيجة', balanceNotZero: 'التحصيل الكامل يتطلب رصيدًا متبقيًا صفريًا',
        partialNeedsPayment: 'التحصيل الجزئي يتطلب دفعة ورصيدًا متبقيًا', actionTypeRequired: 'اختر نوع الإجراء',
        actionNotAllowed: 'لم تسمح الجهة بهذا النوع من الإجراءات', amountRequired: 'أدخل المبلغ', promiseDatePast: 'يجب ألا يكون تاريخ الوعد في الماضي',
        amountAboveOutstanding: 'المبلغ أكبر من الرصيد المتبقي', methodRequired: 'اختر طريقة الدفع',
        batchClosed: 'الدفعة مغلقة بالفعل', batchOpenCases: 'بعض حالات الدفعة ما زالت مفتوحة', ratingRequired: 'قيّم كل مقدم خدمة في الدفعة'
      }
    }
  };
})();
