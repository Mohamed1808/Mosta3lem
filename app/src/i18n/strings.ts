/**
 * The app's own strings. Everything shared with the prototype (statuses, form labels,
 * errors, report templates) comes from prototype/js/i18n; these add the app screens.
 * No em dashes in copy.
 */
const en = {
  app: { name: 'Mosta3lem', tagline: 'Field investigations and collections for banks and finance companies.' },
  login: {
    title: 'Sign in', phoneLabel: 'Mobile number', phoneHint: 'The number registered with your company, or with your own provider account.',
    sendCode: 'Send code', notFound: 'No account uses this number. Check it, or pick a demo account below.',
    codeTitle: 'Enter the code', codeSent: 'We sent a 6-digit code to {phone}.', demoCode: 'Demo: no SMS is sent. Your code is {code}.',
    verify: 'Verify and sign in', wrongCode: 'The code is not correct.', changeNumber: 'Change number',
    demoAccounts: 'Demo accounts', demoAccountsHint: 'Sign in as a demo user without a code.', providersOnly: 'The app currently covers service providers.'
  },
  gate: {
    requesterTitle: 'The requester side comes next', requesterBody: 'The screens for banks and finance companies are built after the service provider side. Sign out and use a provider account to try the app.',
    adminTitle: 'Use the internal console', adminBody: 'Platform staff work in the internal web console, not in the mobile app.',
    applicantTitle: 'Your application is under review', applicantBody: 'The platform team is checking your details. You can sign in again once it is approved.'
  },
  tabs: { home: 'Home', offers: 'Offers', cases: 'Cases', tasks: 'My tasks', team: 'Team', more: 'More' },
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
    company: 'Company', role: 'Role', phone: 'Mobile', noNotifications: 'No notifications yet', markAllRead: 'Mark all as read', simulated: 'Simulated backend: data lives on this device.'
  },
  teamScreen: { moveTo: 'Move to supervisor', moved: 'Agent moved' },
  form: { pick: 'Choose', datePlaceholder: 'YYYY-MM-DD', scanHint: 'Take a clear photo of the document.', signHere: 'Sign here', clear: 'Clear', addRow: 'Add' }
};

const ar: typeof en = {
  app: { name: 'مستعلم', tagline: 'الاستعلامات الميدانية والتحصيل للبنوك وشركات التمويل.' },
  login: {
    title: 'تسجيل الدخول', phoneLabel: 'رقم الموبايل', phoneHint: 'الرقم المسجل لدى شركتك أو في حسابك كمقدم خدمة.',
    sendCode: 'إرسال الرمز', notFound: 'لا يوجد حساب بهذا الرقم. راجعه أو اختر حسابًا تجريبيًا بالأسفل.',
    codeTitle: 'أدخل الرمز', codeSent: 'أرسلنا رمزًا من 6 أرقام إلى {phone}.', demoCode: 'نسخة تجريبية: لا تُرسل رسالة. الرمز هو {code}.',
    verify: 'تحقق وسجّل الدخول', wrongCode: 'الرمز غير صحيح.', changeNumber: 'تغيير الرقم',
    demoAccounts: 'حسابات تجريبية', demoAccountsHint: 'سجّل الدخول كمستخدم تجريبي بدون رمز.', providersOnly: 'يغطي التطبيق حاليًا مقدمي الخدمة.'
  },
  gate: {
    requesterTitle: 'جانب الجهات الطالبة هو التالي', requesterBody: 'تُبنى شاشات البنوك وشركات التمويل بعد جانب مقدمي الخدمة. سجّل الخروج واستخدم حساب مقدم خدمة لتجربة التطبيق.',
    adminTitle: 'استخدم لوحة التحكم الداخلية', adminBody: 'يعمل فريق المنصة من لوحة التحكم الداخلية على الويب، وليس من تطبيق الموبايل.',
    applicantTitle: 'طلبك قيد المراجعة', applicantBody: 'يراجع فريق المنصة بياناتك، ويمكنك تسجيل الدخول مجددًا بعد الاعتماد.'
  },
  tabs: { home: 'الرئيسية', offers: 'العروض', cases: 'الحالات', tasks: 'مهامي', team: 'الفريق', more: 'المزيد' },
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
    company: 'الشركة', role: 'الدور', phone: 'الموبايل', noNotifications: 'لا توجد إشعارات بعد', markAllRead: 'تحديد الكل كمقروء', simulated: 'خادم تجريبي: البيانات محفوظة على هذا الجهاز.'
  },
  teamScreen: { moveTo: 'نقل إلى مشرف', moved: 'تم نقل المندوب' },
  form: { pick: 'اختر', datePlaceholder: 'سنة-شهر-يوم', scanHint: 'التقط صورة واضحة للمستند.', signHere: 'وقّع هنا', clear: 'مسح', addRow: 'إضافة' }
};

export function installStrings(ICM: any) {
  ICM.i18n.extend('en', en);
  ICM.i18n.extend('ar', ar);
  ICM.config.PLATFORM_NAME = 'Mosta3lem';
}
