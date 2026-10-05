/**
 * The app's own strings. Everything shared with the prototype (statuses, form labels,
 * errors, report templates) comes from prototype/js/i18n; these add the app screens.
 * No em dashes in copy.
 */
const en = {
  app: { name: 'Mosta3lem', tagline: 'Field investigations and collections for companies and organisations.' },
  login: {
    title: 'Sign in', phoneLabel: 'Mobile number', phoneHint: 'The number registered with your company, or with your own provider account.',
    sendCode: 'Send code', notFound: 'No account uses this number. Check it, or pick a demo account below.',
    codeTitle: 'Enter the code', codeSent: 'We sent a 6-digit code to {phone}.', demoCode: 'Demo: no SMS is sent. Your code is {code}.', demoCodeEmail: 'Demo: no email is sent. Your code is {code}.',
    verify: 'Verify and sign in', wrongCode: 'The code is not correct.', changeNumber: 'Change number',
    demoAccounts: 'Demo accounts', demoAccountsHint: 'Sign in as a demo user without a code.', demoProviders: 'Service providers', demoClients: 'Organisations requesting work',
    asProvider: 'Service provider', asClient: 'Organisation', clientIntro: 'For companies and organisations that request investigations or collections. Mosta3lem creates your account.',
    emailLabel: 'Work email', passwordLabel: 'Password', show: 'Show', hide: 'Hide', continue: 'Continue',
    forgot: 'Forgot your password?', forgotBody: 'Ask your organisation admin or Mosta3lem support to reset it. Passwords are never sent by email.',
    codeSentEmail: 'We sent a 6-digit code to {email}.', demoPassword: 'Demo: every organisation account uses the password {pw}.', back: 'Back'
  },
  gate: {
    adminTitle: 'Use the internal console', adminBody: 'Platform staff work in the internal web console, not in the mobile app.'
  },
  signup: {
    step: { type: 'Type and services', details: 'Details', area: 'Address and coverage', docs: 'Documents', confirm: 'Confirm and submit' },
    leaveTitle: 'Leave registration?', leaveBody: 'What you entered so far will be lost.', leave: 'Leave',
    docsIntro: 'Take a clear photo of each document, flat and in good light, with all four corners showing.',
    docsLater: 'You can submit without some documents and add them later from your application. The platform approves an application only once all of them are attached.',
    docsCount: '{n} of {total} documents attached', docsMissing: '{n} document(s) still missing. You can add them after you submit.',
    docsNote: 'Photos are kept with your application. Verified documents cannot be replaced.',
    terms: 'I have read and agree to the terms of use and the privacy policy.',
    verifyTitle: 'Confirm your mobile', verifyBody: 'We send a code to {phone}. You sign in with this number.',
    received: 'Application {ref} received', attached: 'Attached',
    editTitle: 'Edit your application', editDetails: 'Edit details', saveChanges: 'Save changes',
    saved: 'Changes saved. Send the application again when you are ready.',
    demo: {
      title: 'Demo: the platform review', body: 'In the live app, operations and management review from the internal console. Use these to try each outcome.',
      approve: 'Operations approves', verify: 'Management signs off', requestInfo: 'Ask for more information', reject: 'Reject', noteLabel: 'Message to the applicant'
    }
  },
  tabs: { home: 'Home', offers: 'Offers', cases: 'Cases', tasks: 'My tasks', team: 'Team', more: 'More', newRequest: 'New' },
  client: {
    services: 'Your work covers', trend: 'Last 6 months', sent: 'Sent', closed: 'Closed', toRate: 'Providers to rate',
    organisation: 'Organisation', type: 'Type', email: 'Email', waitingDecision: 'Reports waiting for your decision',
    bulkTitle: 'Many cases at once?', bulkBody: 'Upload an Excel or CSV file and send them as one batch.', bulkGetFile: 'Excel template',
    pickFile: 'Choose Excel or CSV file', tryDemo: 'Try with the demo file (30 rows, 3 with errors)', demoFileName: 'Demo file',
    fixHint: 'Tap a row to fix it or leave it out.', leftOut: 'Left out', fix: 'Fix', recheck: 'Check again', upload: 'Upload',
    modeSingle: 'One provider', modeSplit: 'By governorate', pickBest: 'Pick the best match', casesN: '{n} cases',
    rateBatchNext: 'Rating and closing batches comes with the ratings update.', reportsAccepted: 'Delivered reports accepted',
    allServices: 'All', toProvider: 'Choose provider', sendBest: 'Send to best match: {name}', rating: 'Rating', newProvider: 'New',
    group: { needs: 'Needs you', waiting: 'Waiting for provider', progress: 'In progress', drafts: 'Drafts', done: 'Done', stopped: 'Cancelled' },
    groupEmpty: {
      needs: 'Nothing needs your decision right now.', waiting: 'No offers waiting for a provider.', progress: 'No cases in progress.',
      drafts: 'No drafts.', done: 'No finished cases yet.', stopped: 'No cancelled or recalled cases.'
    }
  },
  home: {
    hello: 'Hello, {name}', workspace: 'Workspace', toAssign: 'Cases waiting for an agent', toReview: 'Reports to review',
    overdue: 'Overdue', today: 'Due today', upcoming: 'Upcoming', waiting: 'Waiting for review', noTasks: 'No tasks right now',
    shortcuts: 'Needs your attention', allClear: 'Nothing needs your attention right now.'
  },
  cases: { all: 'All open', closed: 'Closed', todo: 'To do', search: 'Search by reference or name', none: 'No cases here' },
  caseScreen: {
    request: 'Request details', addresses: 'Addresses', evidence: 'Evidence and report', timeline: 'Timeline', actions: 'Actions',
    openFieldWork: 'Open field work', client: 'Client', agent: 'Field agent', due: 'Due', price: 'Price', masked: 'Customer details are hidden until you accept the offer.'
  },
  field: {
    title: 'Field work', checkInTitle: 'Check in at the address', photos: 'Photos', reports: 'Report', submitTitle: 'Submit the report',
    saveSection: 'Save answers', takePhoto: 'Take photo', choosePhoto: 'Choose photo', extraPhoto: 'Add another photo', done: 'Done',
    autoSaved: 'Saved', notInField: 'Check in first to start the report.'
  },
  assignScreen: { title: 'Assign cases', pick: 'Pick the field agent', selected: '{n} selected', assignTo: 'Assign to agent', covers: 'Covers this area', none: 'No active agents for this service' },
  reviewScreen: { title: 'Review report', approve: 'Approve and deliver', returnTo: 'Return to agent', returnBody: 'Tell the agent what to fix.', approved: 'Report delivered to the client', returned: 'Report returned to the agent' },
  more: {
    account: 'Account', language: 'Language', notifications: 'Notifications', demo: 'Demo', resetDemo: 'Reset demo data',
    resetBody: 'All demo data returns to its starting state.', resetDone: 'Demo data reset', signOut: 'Sign out', version: 'Version {v}',
    company: 'Company', role: 'Role', phone: 'Mobile', email: 'Email', noNotifications: 'No notifications yet', markAllRead: 'Mark all as read', simulated: 'Simulated backend: data lives on this device.'
  },
  teamScreen: { moveTo: 'Move to supervisor', moved: 'Agent moved' },
  offline: {
    fieldBanner: 'No signal. Keep working: your check-in, photos and answers are saved on this phone and sent when you are back online.',
    notSaved: 'This case is not saved on the phone yet. Open it once with signal so it can be used without signal.',
    savedOnPhone: 'Saved on the phone. It is sent when you are back online.',
    submitBody: 'There is no signal. The report is saved on the phone and sent for review as soon as you are back online. The time you finished is kept.',
    submittedQueued: 'Report finished. It is sent for review as soon as you are back online.',
    waitingN: '{n} change(s) waiting to be sent', failedN: '{n} change(s) were not accepted', review: 'Review',
    notSentYet: 'Not sent yet', photosWaiting: '{n} photo(s) waiting to be sent',
    scanLater: 'Document photo kept. Reading it needs signal: fill the fields yourself or scan again when back online.',
    visitDetails: 'Visit details', phone: 'Phone', instructions: 'Instructions',
    syncTitle: 'Work saved on the phone', onlineNow: 'Online. Waiting work is sent automatically.',
    offlineNow: 'No signal. Work is kept on this phone until you are back online.',
    demoOfflineNow: 'Demo: no signal is being simulated. Switch it off in More to send the waiting work.',
    syncNow: 'Send now', saveCases: 'Save my cases for offline', casesSaved: 'Your open cases are saved on the phone', lastSync: 'Last sent {time}',
    waitingTitle: 'Waiting to be sent ({n})', nothingWaiting: 'Nothing is waiting.',
    failedTitle: 'Not accepted ({n})', retry: 'Try again', discard: 'Drop it', discardBody: 'This change is removed from the phone and will not be sent.',
    savedTitle: 'Cases on this phone ({n})', noneSaved: 'No cases saved yet. They are saved automatically while you have signal.',
    explain: 'Open cases assigned to you are kept on the phone while you have signal, so you can check in, take photos and fill reports without signal. Everything is sent in order when the signal comes back, with the time it really happened.',
    homeOffline: 'No signal', homeOfflineBody: 'Your saved cases still open. {n} change(s) are waiting to be sent.', open: 'Open',
    savedShort: '{n} case(s) saved for offline', noSignalShort: 'No signal now',
    demoSwitch: 'Simulate no signal', demoSwitchHint: 'Try field work without signal. Real phones switch automatically when the signal drops.', signalOn: 'Signal', signalOff: 'No signal',
    op: { checkIn: 'Check-in', addPhoto: 'Photo', removePhoto: 'Photo removed', saveReport: 'Report answers', submit: 'Report submitted', resume: 'Back to field work' }
  },
  earningsApp: {
    privacy: 'Who sees what: the owner sees the whole company, a supervisor sees only the agents they supervise, field agents see their completed work without amounts.',
    myWork: 'My completed work', myWorkSub: 'Cases you finished and where they are now.',
    doneThisMonth: 'Completed this month', doneTotal: 'Completed in total', openNow: 'Open now',
    completedCases: 'Completed cases', late: 'late', noneDone: 'No completed cases yet'
  },
  disputeApp: {
    subtitle: 'Raised by clients about your cases, or by you about a rating. The platform decides.', openShort: 'Open disputes',
    youRaised: 'You raised it', raisedAgainst: 'Raised by the client', opened: 'Opened', statements: 'Statements',
    statementPlaceholder: 'Explain your side. Mention evidence such as photos, check-in times or messages.', yourStatement: 'Your statement',
    sendStatement: 'Add statement', statementSent: 'Statement added',
    demoTitle: 'Demo: the platform decision', demoBody: 'In the live app the platform team decides from the internal console. Use this to try each outcome.'
  },
  settingsApp: {
    title: 'Settings', moreSub: 'Coverage, response times, prices and documents', coverage: 'Coverage', responseTimes: 'Response times', prices: 'Prices',
    pricesSub: 'Changes are approved by operations', priceWaitingShort: 'Change sent {date}, waiting for operations', hoursShort: '{n} h',
    ownerOnly: 'Only the owner can change settings.', saved: 'Saved',
    coverageAgents: 'Field agents only work inside your coverage. To drop a governorate, first change the agents who cover it.',
    capacity: 'Open cases you can take', capacityHint: 'Offers stop when this many cases are open in a governorate.',
    maxHours: 'Platform maximum: {n} h', hours: 'h',
    responseIntro: 'How fast you promise to work. Clients see these when they choose a provider, and they apply to new offers straight away.',
    deliverWithin: 'Deliver the report within', firstContactTitle: 'First contact with the customer',
    priceSent: 'Sent to operations. Current prices apply until they approve.', nowIs: 'Now {v}',
    replaceRequest: 'Replace the request', sendPrices: 'Send for approval',
    pricesIntro: 'Set prices inside the platform ranges. Operations approves every change; your current prices apply until then.',
    withdraw: 'Withdraw the request', withdrawn: 'Request withdrawn',
    range: 'Allowed {min} to {max}', rangePct: 'Allowed {min}% to {max}%',
    noteForOps: 'Note for operations', notePlaceholder: 'Why are you changing prices?', changedCount: '{n} price(s) changed',
    demoOps: 'Demo: the operations team',
    expiredAgo: 'expired', daysLeft: '{n} days left',
    alertExpired: '{docs} expired. You get no new offers until operations checks the renewed one.',
    alertWaiting: 'Your renewed {docs} is with operations. New offers resume once they check it.',
    alertExpiring: '{docs} expires in {n} days. Send the renewed one in time to keep receiving offers.',
    sendRenewal: 'Send renewed document', replaceRenewal: 'Replace the renewal you sent',
    pausedBody: 'New offers are paused because a document has expired. Cases you already have continue as normal.',
    docsIntro: 'The commercial register and tax card expire. You get reminders 30 and 7 days before.',
    verifiedOn: 'Verified {date}', renewalBody: 'Operations checks it. The current document stays in force until then.',
    renewalBodyExpired: 'Operations checks it. New offers resume once they verify it.',
    renewTitle: 'Renewed document', newExpiry: 'New expiry date', expiryHint: 'As printed on the document, for example 2027-06-30.',
    send: 'Send', renewalSentToast: 'Sent to operations', demoExpire: 'Move the date past expiry'
  },
  form: { pick: 'Choose', datePlaceholder: 'YYYY-MM-DD', scanHint: 'Take a clear photo of the document.', signHere: 'Sign here', clear: 'Clear', addRow: 'Add',
    timePlaceholder: 'HH:MM', otherCity: 'Other (not on the list)', otherCityHint: 'Type the area or village', cityFirst: 'Choose the governorate first' }
};

const ar: typeof en = {
  app: { name: 'مستعلم', tagline: 'الاستعلامات الميدانية والتحصيل للشركات والجهات.' },
  login: {
    title: 'تسجيل الدخول', phoneLabel: 'رقم الموبايل', phoneHint: 'الرقم المسجل لدى شركتك أو في حسابك كمقدم خدمة.',
    sendCode: 'إرسال الرمز', notFound: 'لا يوجد حساب بهذا الرقم. راجعه أو اختر حسابًا تجريبيًا بالأسفل.',
    codeTitle: 'أدخل الرمز', codeSent: 'أرسلنا رمزًا من 6 أرقام إلى {phone}.', demoCode: 'نسخة تجريبية: لا تُرسل رسالة. الرمز هو {code}.', demoCodeEmail: 'نسخة تجريبية: لا يُرسل بريد إلكتروني. الرمز هو {code}.',
    verify: 'تحقق وسجّل الدخول', wrongCode: 'الرمز غير صحيح.', changeNumber: 'تغيير الرقم',
    demoAccounts: 'حسابات تجريبية', demoAccountsHint: 'سجّل الدخول كمستخدم تجريبي بدون رمز.', demoProviders: 'مقدمو الخدمة', demoClients: 'الجهات الطالبة',
    asProvider: 'مقدم خدمة', asClient: 'جهة', clientIntro: 'للشركات والجهات التي تطلب الاستعلامات أو التحصيل. ينشئ مستعلم حسابك.',
    emailLabel: 'البريد الإلكتروني للعمل', passwordLabel: 'كلمة المرور', show: 'إظهار', hide: 'إخفاء', continue: 'متابعة',
    forgot: 'نسيت كلمة المرور؟', forgotBody: 'اطلب من مدير الحساب في جهتك أو من دعم مستعلم إعادة تعيينها. لا تُرسل كلمات المرور بالبريد الإلكتروني.',
    codeSentEmail: 'أرسلنا رمزًا من 6 أرقام إلى {email}.', demoPassword: 'نسخة تجريبية: كل حسابات الجهات تستخدم كلمة المرور {pw}.', back: 'رجوع'
  },
  gate: {
    adminTitle: 'استخدم لوحة التحكم الداخلية', adminBody: 'يعمل فريق المنصة من لوحة التحكم الداخلية على الويب، وليس من تطبيق الموبايل.'
  },
  signup: {
    step: { type: 'النوع والخدمات', details: 'البيانات', area: 'العنوان ونطاق التغطية', docs: 'المستندات', confirm: 'التأكيد والإرسال' },
    leaveTitle: 'الخروج من التسجيل؟', leaveBody: 'ستفقد ما أدخلته حتى الآن.', leave: 'خروج',
    docsIntro: 'التقط صورة واضحة لكل مستند، مستوية وفي إضاءة جيدة، مع ظهور الأركان الأربعة.',
    docsLater: 'يمكنك إرسال الطلب دون بعض المستندات وإضافتها لاحقًا من صفحة طلبك. لا تعتمد المنصة الطلب إلا بعد إرفاقها كلها.',
    docsCount: 'تم إرفاق {n} من {total} مستندات', docsMissing: 'ما زال {n} مستند ناقصًا. يمكنك إضافته بعد الإرسال.',
    docsNote: 'تُحفظ الصور مع طلبك. لا يمكن استبدال المستندات المعتمدة.',
    terms: 'قرأت وأوافق على شروط الاستخدام وسياسة الخصوصية.',
    verifyTitle: 'تأكيد رقم الموبايل', verifyBody: 'نرسل رمزًا إلى {phone}. تسجل الدخول بهذا الرقم.',
    received: 'تم استلام الطلب {ref}', attached: 'مُرفق',
    editTitle: 'تعديل طلبك', editDetails: 'تعديل البيانات', saveChanges: 'حفظ التعديلات',
    saved: 'تم حفظ التعديلات. أعد إرسال الطلب عندما تكون جاهزًا.',
    demo: {
      title: 'نسخة تجريبية: مراجعة المنصة', body: 'في التطبيق الفعلي يراجع فريق العمليات والإدارة الطلب من لوحة التحكم الداخلية. استخدم هذه الأزرار لتجربة كل نتيجة.',
      approve: 'موافقة العمليات', verify: 'اعتماد الإدارة', requestInfo: 'طلب معلومات إضافية', reject: 'رفض', noteLabel: 'رسالة إلى المتقدم'
    }
  },
  tabs: { home: 'الرئيسية', offers: 'العروض', cases: 'الحالات', tasks: 'مهامي', team: 'الفريق', more: 'المزيد', newRequest: 'طلب جديد' },
  client: {
    services: 'يشمل عملك', trend: 'آخر 6 أشهر', sent: 'مُرسلة', closed: 'مغلقة', toRate: 'مقدمو خدمة بانتظار تقييمك',
    organisation: 'الجهة', type: 'النوع', email: 'البريد الإلكتروني', waitingDecision: 'تقارير بانتظار قرارك',
    bulkTitle: 'حالات كثيرة مرة واحدة؟', bulkBody: 'ارفع ملف Excel أو CSV وأرسلها كدفعة واحدة.', bulkGetFile: 'نموذج Excel',
    pickFile: 'اختر ملف Excel أو CSV', tryDemo: 'جرّب بالملف التجريبي (30 صفًا، 3 بها أخطاء)', demoFileName: 'ملف تجريبي',
    fixHint: 'اضغط على أي صف لتصحيحه أو استبعاده.', leftOut: 'مستبعد', fix: 'يحتاج تصحيح', recheck: 'تحقق مرة أخرى', upload: 'رفع ملف',
    modeSingle: 'مقدم خدمة واحد', modeSplit: 'حسب المحافظة', pickBest: 'اختر الأنسب', casesN: '{n} حالة',
    rateBatchNext: 'تقييم الدفعات وإغلاقها يأتي مع تحديث التقييمات.', reportsAccepted: 'تم قبول التقارير المسلّمة',
    allServices: 'الكل', toProvider: 'اختيار مقدم الخدمة', sendBest: 'إرسال للأنسب: {name}', rating: 'التقييم', newProvider: 'جديد',
    group: { needs: 'تحتاجك', waiting: 'بانتظار مقدم الخدمة', progress: 'قيد التنفيذ', drafts: 'مسودات', done: 'منتهية', stopped: 'ملغاة' },
    groupEmpty: {
      needs: 'لا شيء يحتاج قرارك الآن.', waiting: 'لا توجد عروض بانتظار مقدم خدمة.', progress: 'لا توجد حالات قيد التنفيذ.',
      drafts: 'لا توجد مسودات.', done: 'لا توجد حالات منتهية بعد.', stopped: 'لا توجد حالات ملغاة أو مسحوبة.'
    }
  },
  home: {
    hello: 'مرحبًا، {name}', workspace: 'مساحة العمل', toAssign: 'حالات تنتظر مندوبًا', toReview: 'تقارير للمراجعة',
    overdue: 'متأخرة', today: 'مستحقة اليوم', upcoming: 'قادمة', waiting: 'بانتظار المراجعة', noTasks: 'لا توجد مهام الآن',
    shortcuts: 'يحتاج انتباهك', allClear: 'لا شيء يحتاج انتباهك الآن.'
  },
  cases: { all: 'كل المفتوحة', closed: 'المغلقة', todo: 'للتنفيذ', search: 'ابحث بالمرجع أو الاسم', none: 'لا توجد حالات هنا' },
  caseScreen: {
    request: 'تفاصيل الطلب', addresses: 'العناوين', evidence: 'الأدلة والتقرير', timeline: 'السجل الزمني', actions: 'الإجراءات',
    openFieldWork: 'فتح العمل الميداني', client: 'العميل', agent: 'المندوب الميداني', due: 'الموعد', price: 'السعر', masked: 'تظل بيانات العميل مخفية حتى تقبل العرض.'
  },
  field: {
    title: 'العمل الميداني', checkInTitle: 'سجّل الوصول إلى العنوان', photos: 'الصور', reports: 'التقرير', submitTitle: 'إرسال التقرير',
    saveSection: 'حفظ الإجابات', takePhoto: 'التقاط صورة', choosePhoto: 'اختيار صورة', extraPhoto: 'إضافة صورة أخرى', done: 'تم',
    autoSaved: 'تم الحفظ', notInField: 'سجّل الوصول أولًا لبدء التقرير.'
  },
  assignScreen: { title: 'تكليف الحالات', pick: 'اختر المندوب الميداني', selected: 'تم اختيار {n}', assignTo: 'تكليف المندوب', covers: 'يغطي هذه المنطقة', none: 'لا يوجد مندوبون نشطون لهذه الخدمة' },
  reviewScreen: { title: 'مراجعة التقرير', approve: 'اعتماد وتسليم', returnTo: 'إعادة للمندوب', returnBody: 'أخبر المندوب بما يجب تصحيحه.', approved: 'تم تسليم التقرير للعميل', returned: 'أُعيد التقرير للمندوب' },
  more: {
    account: 'الحساب', language: 'اللغة', notifications: 'الإشعارات', demo: 'النسخة التجريبية', resetDemo: 'إعادة ضبط البيانات التجريبية',
    resetBody: 'تعود كل البيانات التجريبية إلى حالتها الأولى.', resetDone: 'تمت إعادة ضبط البيانات', signOut: 'تسجيل الخروج', version: 'الإصدار {v}',
    company: 'الشركة', role: 'الدور', phone: 'الموبايل', email: 'البريد الإلكتروني', noNotifications: 'لا توجد إشعارات بعد', markAllRead: 'تحديد الكل كمقروء', simulated: 'خادم تجريبي: البيانات محفوظة على هذا الجهاز.'
  },
  teamScreen: { moveTo: 'نقل إلى مشرف', moved: 'تم نقل المندوب' },
  offline: {
    fieldBanner: 'لا توجد إشارة. واصل العمل: تسجيل الوصول والصور والإجابات محفوظة على هذا الهاتف وتُرسل عند عودة الاتصال.',
    notSaved: 'هذه الحالة غير محفوظة على الهاتف بعد. افتحها مرة واحدة أثناء وجود إشارة لتعمل بدونها.',
    savedOnPhone: 'تم الحفظ على الهاتف، ويُرسل عند عودة الاتصال.',
    submitBody: 'لا توجد إشارة. يُحفظ التقرير على الهاتف ويُرسل للمراجعة فور عودة الاتصال، مع الاحتفاظ بوقت انتهائك منه.',
    submittedQueued: 'انتهى التقرير، ويُرسل للمراجعة فور عودة الاتصال.',
    waitingN: '{n} تغيير بانتظار الإرسال', failedN: 'لم يُقبل {n} تغيير', review: 'مراجعة',
    notSentYet: 'لم يُرسل بعد', photosWaiting: '{n} صورة بانتظار الإرسال',
    scanLater: 'تم الاحتفاظ بصورة المستند. قراءتها تحتاج إشارة: املأ الحقول بنفسك أو أعد المسح عند عودة الاتصال.',
    visitDetails: 'تفاصيل الزيارة', phone: 'الهاتف', instructions: 'التعليمات',
    syncTitle: 'العمل المحفوظ على الهاتف', onlineNow: 'متصل. يُرسل العمل المنتظر تلقائيًا.',
    offlineNow: 'لا توجد إشارة. يبقى العمل على هذا الهاتف حتى عودة الاتصال.',
    demoOfflineNow: 'نسخة تجريبية: انقطاع الإشارة مُحاكى. أوقفه من المزيد لإرسال العمل المنتظر.',
    syncNow: 'إرسال الآن', saveCases: 'حفظ حالاتي للعمل بدون إشارة', casesSaved: 'تم حفظ حالاتك المفتوحة على الهاتف', lastSync: 'آخر إرسال {time}',
    waitingTitle: 'بانتظار الإرسال ({n})', nothingWaiting: 'لا شيء بانتظار الإرسال.',
    failedTitle: 'لم يُقبل ({n})', retry: 'إعادة المحاولة', discard: 'حذف', discardBody: 'يُحذف هذا التغيير من الهاتف ولن يُرسل.',
    savedTitle: 'الحالات على هذا الهاتف ({n})', noneSaved: 'لا توجد حالات محفوظة بعد. تُحفظ تلقائيًا أثناء وجود إشارة.',
    explain: 'تُحفظ الحالات المفتوحة المكلف بها على الهاتف أثناء وجود إشارة، لتتمكن من تسجيل الوصول والتصوير وملء التقارير بدونها. يُرسل كل شيء بالترتيب عند عودة الإشارة، مع الوقت الفعلي لكل خطوة.',
    homeOffline: 'لا توجد إشارة', homeOfflineBody: 'حالاتك المحفوظة ما زالت تفتح. {n} تغيير بانتظار الإرسال.', open: 'فتح',
    savedShort: '{n} حالة محفوظة للعمل بدون إشارة', noSignalShort: 'لا توجد إشارة الآن',
    demoSwitch: 'محاكاة انقطاع الإشارة', demoSwitchHint: 'جرّب العمل الميداني بدون إشارة. الهواتف الفعلية تتحول تلقائيًا عند انقطاع الإشارة.', signalOn: 'متصل', signalOff: 'بدون إشارة',
    op: { checkIn: 'تسجيل الوصول', addPhoto: 'صورة', removePhoto: 'حذف صورة', saveReport: 'إجابات التقرير', submit: 'إرسال التقرير', resume: 'العودة للعمل الميداني' }
  },
  earningsApp: {
    privacy: 'من يرى ماذا: المالك يرى الشركة كلها، والمشرف يرى المندوبين الذين يشرف عليهم فقط، والمندوب الميداني يرى أعماله المنجزة دون مبالغ.',
    myWork: 'أعمالي المنجزة', myWorkSub: 'الحالات التي أنجزتها وأين وصلت الآن.',
    doneThisMonth: 'المنجز هذا الشهر', doneTotal: 'إجمالي المنجز', openNow: 'المفتوح الآن',
    completedCases: 'الحالات المنجزة', late: 'متأخرة', noneDone: 'لا توجد حالات منجزة بعد'
  },
  disputeApp: {
    subtitle: 'نزاعات فتحها العملاء بخصوص حالاتك، أو فتحتها أنت بخصوص تقييم. المنصة هي التي تقرر.', openShort: 'نزاعات مفتوحة',
    youRaised: 'فتحته أنت', raisedAgainst: 'فتحه العميل', opened: 'تاريخ الفتح', statements: 'الإفادات',
    statementPlaceholder: 'اشرح موقفك، واذكر أي أدلة مثل الصور أو وقت تسجيل الوصول أو الرسائل.', yourStatement: 'إفادتك',
    sendStatement: 'إضافة إفادة', statementSent: 'تمت إضافة الإفادة',
    demoTitle: 'نسخة تجريبية: قرار المنصة', demoBody: 'في التطبيق الفعلي يقرر فريق المنصة من لوحة التحكم الداخلية. استخدم هذا لتجربة كل نتيجة.'
  },
  settingsApp: {
    title: 'الإعدادات', moreSub: 'نطاق التغطية وأوقات الاستجابة والأسعار والمستندات', coverage: 'نطاق التغطية', responseTimes: 'أوقات الاستجابة', prices: 'الأسعار',
    pricesSub: 'يعتمد فريق العمليات أي تغيير', priceWaitingShort: 'أُرسل التغيير {date}، بانتظار فريق العمليات', hoursShort: '{n} س',
    ownerOnly: 'المالك فقط يمكنه تغيير الإعدادات.', saved: 'تم الحفظ',
    coverageAgents: 'يعمل المندوبون داخل نطاق تغطيتك فقط. لحذف محافظة، عدّل أولًا المندوبين الذين يغطونها.',
    capacity: 'عدد الحالات المفتوحة التي يمكنك استقبالها', capacityHint: 'تتوقف العروض عند بلوغ هذا العدد من الحالات المفتوحة في المحافظة.',
    maxHours: 'الحد الأقصى للمنصة: {n} س', hours: 'س',
    responseIntro: 'السرعة التي تلتزم بها في العمل. يراها العملاء عند اختيار مقدم الخدمة، وتُطبق على العروض الجديدة فورًا.',
    deliverWithin: 'تسليم التقرير خلال', firstContactTitle: 'أول تواصل مع العميل',
    priceSent: 'أُرسل لفريق العمليات. تُطبق الأسعار الحالية حتى الاعتماد.', nowIs: 'الحالي {v}',
    replaceRequest: 'استبدال الطلب', sendPrices: 'إرسال للاعتماد',
    pricesIntro: 'حدد أسعارك ضمن نطاقات المنصة. يعتمد فريق العمليات كل تغيير، وتُطبق أسعارك الحالية حتى ذلك الحين.',
    withdraw: 'سحب الطلب', withdrawn: 'تم سحب الطلب',
    range: 'المسموح من {min} إلى {max}', rangePct: 'المسموح من {min}% إلى {max}%',
    noteForOps: 'ملاحظة لفريق العمليات', notePlaceholder: 'لماذا تغيّر الأسعار؟', changedCount: 'تم تغيير {n} سعر',
    demoOps: 'نسخة تجريبية: فريق العمليات',
    expiredAgo: 'منتهي', daysLeft: 'متبقٍ {n} يوم',
    alertExpired: 'انتهى {docs}. لن تصلك عروض جديدة حتى يراجع فريق العمليات النسخة المجددة.',
    alertWaiting: 'النسخة المجددة من {docs} لدى فريق العمليات. تعود العروض الجديدة بعد مراجعتها.',
    alertExpiring: 'ينتهي {docs} خلال {n} يوم. أرسل النسخة المجددة في الوقت المناسب لتستمر في تلقي العروض.',
    sendRenewal: 'إرسال المستند المجدد', replaceRenewal: 'استبدال التجديد المرسل',
    pausedBody: 'توقفت العروض الجديدة لأن أحد المستندات انتهى. تستمر الحالات الموجودة لديك كالمعتاد.',
    docsIntro: 'السجل التجاري والبطاقة الضريبية لهما تاريخ انتهاء. تصلك تذكيرات قبل الانتهاء بـ 30 يومًا و7 أيام.',
    verifiedOn: 'اعتُمد في {date}', renewalBody: 'يراجعه فريق العمليات، ويظل المستند الحالي ساريًا حتى ذلك الحين.',
    renewalBodyExpired: 'يراجعه فريق العمليات، وتعود العروض الجديدة بعد اعتماده.',
    renewTitle: 'المستند المجدد', newExpiry: 'تاريخ الانتهاء الجديد', expiryHint: 'كما هو مطبوع على المستند، مثل 2027-06-30.',
    send: 'إرسال', renewalSentToast: 'أُرسل لفريق العمليات', demoExpire: 'تقديم التاريخ لما بعد الانتهاء'
  },
  form: { pick: 'اختر', datePlaceholder: 'سنة-شهر-يوم', scanHint: 'التقط صورة واضحة للمستند.', signHere: 'وقّع هنا', clear: 'مسح', addRow: 'إضافة',
    timePlaceholder: 'سا:دق', otherCity: 'أخرى (غير موجودة بالقائمة)', otherCityHint: 'اكتب المنطقة أو القرية', cityFirst: 'اختر المحافظة أولًا' }
};

export function installStrings(ICM: any) {
  ICM.i18n.extend('en', en);
  ICM.i18n.extend('ar', ar);
  ICM.config.PLATFORM_NAME = 'Mosta3lem';
}
