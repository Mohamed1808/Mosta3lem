/**
 * The console's own strings. Everything shared with the engine (statuses, roles, errors)
 * comes from prototype/js/i18n; these add the console screens. No em dashes in copy.
 * Permission keys use "_" where the engine uses "." (cases.view -> cases_view).
 */
const en = {
  console: {
    name: 'Mosta3lem Console', tagline: 'Internal console for the Mosta3lem team.',
    signIn: 'Sign in', email: 'Work email', password: 'Password', show: 'Show', hide: 'Hide', continue: 'Continue',
    codeTitle: 'Enter the code', codeSent: 'We sent a 6-digit code to {email}.', demoCode: 'Demo: no email is sent. Your code is {code}.',
    verify: 'Verify and sign in', wrongCode: 'The code is not correct.', back: 'Back',
    demoPassword: 'Demo: every staff account uses the password {pw}.',
    staffOnly: 'This console is for Mosta3lem staff. Organisations and service providers use the mobile app.',
    demoAccounts: 'Demo staff accounts', demoHint: 'Sign in as one person per team, without a code.',
    loading: 'Loading', signOut: 'Sign out', language: 'العربية', hello: 'Hello, {name}', menu: 'Menu',
    nav: { overview: 'Overview', providers: 'Providers', cases: 'Cases', quality: 'Quality review', disputes: 'Disputes', access: 'Teams and access' },
    disputes: {
      sub: 'Legal and Management decide together: one proposes, the other team confirms.', tab: { toDecide: 'To decide', toConfirm: 'To confirm', resolved: 'Resolved' },
      empty: { toDecide: 'No dispute waits for a decision.', toConfirm: 'No proposed decision waits for confirmation.', resolved: 'No resolved disputes yet.' },
      proposed: 'Proposed: {outcome}', waiting: 'Waiting for a decision', onBehalf: 'for the client', textHidden: 'Hidden for your team',
      hiddenNote: 'Statements from the parties are hidden for your team; times, names and decisions stay visible.',
      propose: 'Propose a decision', twoSteps: 'Your proposal takes effect once a person from the other team confirms it.',
      decidedBy: 'Legal and Management decide disputes.', waitingFor: 'Waiting for {team} to confirm.', sentBack: 'Decision sent back',
      noteAdded: 'Note added', decision: 'Decision', sentBackTitle: 'Sent back earlier', noNotes: 'No platform notes yet.', case: 'Case',
      proposedLine: 'Proposed by {name} ({team}), {at}', confirmedLine: 'Confirmed by {name} ({team}), {at}'
    },
    cases: {
      sub: 'Every case on the platform.', scope: { open: 'Open', late: 'Past deadline', atRisk: 'At risk', closed: 'Closed', all: 'All' },
      search: 'Search by reference, name or national ID', service: 'Service', allServices: 'All services', client: 'Client', allClients: 'All clients',
      provider: 'Provider', allProviders: 'All providers', none: 'No cases match.', more: 'Show more ({n} left)', hidden: 'Hidden',
      col: { ref: 'Case', customer: 'Customer', client: 'Client', provider: 'Provider', status: 'Status', due: 'Due' },
      price: 'Price', agent: 'Field agent', hours: '{n} hours', reportHidden: 'Report answers are hidden for your team.',
      maskedNote: 'Customer details and report answers are hidden for your team.', noOtherProvider: 'No other provider covers this case right now.',
      returnBody: 'The report goes back to the field agent with your comment.', request: 'Request', evidence: 'Evidence and report', timeline: 'Timeline',
      checkInHidden: 'Check-in location is hidden for your team.', disputeForClient: 'Open a dispute for the client',
      disputeForClientBody: 'Opened on behalf of {client}. Legal and Management will decide it.'
    },
    quality: { sub: 'Reports from individual providers and owners doing their own field work, oldest first.' },
    providers: {
      sub: 'Applications, live providers and their requests.', tab: { applications: 'Applications', live: 'Live providers', requests: 'Requests' },
      empty: { applications: 'No applications.', live: 'No live providers.', requests: 'No price changes or documents waiting.' },
      services: 'Services', applied: 'Applied', waiting: 'Waiting', openCases: 'Open cases', priceChange: 'Price change', docsN: 'Documents: {n}',
      review: 'Application review', stepApplied: 'Applied', stepOps: 'Operations approval', stepMgmt: 'Management sign-off', notYet: 'Not yet',
      sameApprover: 'You approved this for Operations, so another person in Management must sign it off.',
      noReviewAction: 'Nothing for your team to do on this application right now.', infoRequested: 'Request sent to the applicant', rejected: 'Application rejected',
      source: 'Registered', hidden: 'Hidden for your team', docRejected: 'Renewal turned down', pricesRejected: 'Price change turned down',
      backToAuto: 'Standing is automatic again', enforceTeam: 'Management decides on suspensions and warnings.', rating: 'Rating', newProvider: 'New, few ratings',
      doc: { missing: 'Missing', uploaded: 'To check', verified: 'Checked' }
    },
    overview: {
      sub: 'The platform at a glance.', gmvMonth: 'Value of work this month', gmvTotal: 'Value of work to date', revenue: 'Platform revenue this month',
      moneyHidden: 'Money figures are shown to the teams that handle billing.',
      openWork: 'Work in progress', atRisk: 'Cases at risk of missing the deadline', breached: 'Cases past the deadline', missed: 'Deadlines missed to date',
      activeEntities: 'Organisations with open work', totalEntities: 'of {n}', activeProviders: 'Active providers', suspended: 'Suspended providers',
      attention: 'Waiting for the platform', applications: 'Provider applications', disputes: 'Open disputes', qa: 'Reports for Quality to review', flagged: 'Flagged ratings',
      scores: 'Provider scores (best and lowest)', trend: 'Value of work, last 3 months', none: 'Nothing waiting.'
    },
    access: {
      sub: 'What each team can see and do. Agreed with the business on 5 Oct 2026.', yours: 'Your team', team: 'Team',
      twoTeams: 'Needs two teams', twoTeamsBody: '{action}: the first approval waits for {teams}.', and: ' and ',
      personal: 'Customer personal data (national ID, phones, addresses, report answers)', personalNo: 'Hidden', personalYes: 'Visible',
      all: 'Everything, including staff accounts and platform settings'
    },
    perm: {
      overview: 'Platform overview', cases_view: 'See cases', personalData: 'See customer personal data', cases_manage: 'Reassign, extend or cancel cases',
      providers_view: 'See providers', providers_approve: 'Approve provider applications (first step)', providers_signoff: 'Final sign-off on new providers',
      providers_prices: 'Approve price changes', providers_documents: 'Approve document renewals', providers_enforce: 'Suspend or reinstate providers',
      qa_review: 'Review reports (Quality)', disputes_view: 'See disputes', disputes_decide: 'Decide disputes', disputes_openOnBehalf: 'Open a dispute on behalf of a client',
      billing_view: 'See invoices and payments', billing_issue: 'Issue invoices', billing_pay: 'Record payments', billing_adjust: 'Adjust invoices after disputes',
      fee_change: 'Change the platform fee', orgs_view: 'See organisations', orgs_create: 'Create organisation accounts', accounts_resetLogin: 'Reset logins',
      reports_view: 'Platform reports', audit_view: 'Audit log', staff_manage: 'Manage staff accounts', settings_manage: 'Platform settings'
    }
  }
};

const ar: typeof en = {
  console: {
    name: 'لوحة تحكم مستعلم', tagline: 'لوحة التحكم الداخلية لفريق مستعلم.',
    signIn: 'تسجيل الدخول', email: 'البريد الإلكتروني للعمل', password: 'كلمة المرور', show: 'إظهار', hide: 'إخفاء', continue: 'متابعة',
    codeTitle: 'أدخل الرمز', codeSent: 'أرسلنا رمزًا من 6 أرقام إلى {email}.', demoCode: 'نسخة تجريبية: لا يُرسل بريد. الرمز هو {code}.',
    verify: 'تحقق وسجّل الدخول', wrongCode: 'الرمز غير صحيح.', back: 'رجوع',
    demoPassword: 'نسخة تجريبية: كل حسابات الموظفين تستخدم كلمة المرور {pw}.',
    staffOnly: 'لوحة التحكم هذه لموظفي مستعلم. الجهات ومقدمو الخدمة يستخدمون تطبيق الموبايل.',
    demoAccounts: 'حسابات موظفين تجريبية', demoHint: 'سجّل الدخول كشخص من كل فريق بدون رمز.',
    loading: 'جارٍ التحميل', signOut: 'تسجيل الخروج', language: 'English', hello: 'مرحبًا، {name}', menu: 'القائمة',
    nav: { overview: 'نظرة عامة', providers: 'مقدمو الخدمة', cases: 'الحالات', quality: 'مراجعة الجودة', disputes: 'النزاعات', access: 'الفرق والصلاحيات' },
    disputes: {
      sub: 'تقرر الشؤون القانونية والإدارة معًا: أحدهما يقترح والفريق الآخر يؤكد.', tab: { toDecide: 'للقرار', toConfirm: 'للتأكيد', resolved: 'محسومة' },
      empty: { toDecide: 'لا يوجد نزاع بانتظار قرار.', toConfirm: 'لا يوجد قرار مقترح بانتظار التأكيد.', resolved: 'لا توجد نزاعات محسومة بعد.' },
      proposed: 'مقترح: {outcome}', waiting: 'بانتظار قرار', onBehalf: 'نيابة عن العميل', textHidden: 'مخفي لفريقك',
      hiddenNote: 'أقوال الطرفين مخفية لفريقك؛ تظل الأوقات والأسماء والقرارات ظاهرة.',
      propose: 'اقتراح قرار', twoSteps: 'يسري اقتراحك بعد أن يؤكده شخص من الفريق الآخر.',
      decidedBy: 'الشؤون القانونية والإدارة هما من يقرران في النزاعات.', waitingFor: 'بانتظار تأكيد {team}.', sentBack: 'أُعيد القرار',
      noteAdded: 'تمت إضافة الملاحظة', decision: 'القرار', sentBackTitle: 'أُعيد سابقًا', noNotes: 'لا توجد ملاحظات من المنصة بعد.', case: 'الحالة',
      proposedLine: 'اقترحه {name} ({team})، {at}', confirmedLine: 'أكده {name} ({team})، {at}'
    },
    cases: {
      sub: 'كل الحالات على المنصة.', scope: { open: 'مفتوحة', late: 'تجاوزت الموعد', atRisk: 'معرضة للتأخير', closed: 'مغلقة', all: 'الكل' },
      search: 'ابحث بالمرجع أو الاسم أو الرقم القومي', service: 'الخدمة', allServices: 'كل الخدمات', client: 'العميل', allClients: 'كل العملاء',
      provider: 'مقدم الخدمة', allProviders: 'كل مقدمي الخدمة', none: 'لا توجد حالات مطابقة.', more: 'عرض المزيد (متبقٍ {n})', hidden: 'مخفي',
      col: { ref: 'الحالة', customer: 'العميل النهائي', client: 'العميل', provider: 'مقدم الخدمة', status: 'الحالة', due: 'الموعد' },
      price: 'السعر', agent: 'المندوب الميداني', hours: '{n} ساعة', reportHidden: 'إجابات التقرير مخفية لفريقك.',
      maskedNote: 'بيانات العميل وإجابات التقرير مخفية لفريقك.', noOtherProvider: 'لا يوجد مقدم خدمة آخر يغطي هذه الحالة الآن.',
      returnBody: 'يعود التقرير إلى المندوب الميداني مع تعليقك.', request: 'الطلب', evidence: 'الأدلة والتقرير', timeline: 'السجل الزمني',
      checkInHidden: 'موقع تسجيل الوصول مخفي لفريقك.', disputeForClient: 'فتح نزاع نيابة عن العميل',
      disputeForClientBody: 'يُفتح نيابة عن {client}. تقرر فيه الشؤون القانونية والإدارة.'
    },
    quality: { sub: 'تقارير مقدمي الخدمة الأفراد والملاك الذين يعملون ميدانيًا بأنفسهم، الأقدم أولًا.' },
    providers: {
      sub: 'طلبات الانضمام ومقدمو الخدمة النشطون وطلباتهم.', tab: { applications: 'طلبات الانضمام', live: 'مقدمو خدمة نشطون', requests: 'الطلبات' },
      empty: { applications: 'لا توجد طلبات انضمام.', live: 'لا يوجد مقدمو خدمة نشطون.', requests: 'لا توجد تغييرات أسعار أو مستندات بالانتظار.' },
      services: 'الخدمات', applied: 'تاريخ الطلب', waiting: 'بالانتظار', openCases: 'حالات مفتوحة', priceChange: 'تغيير أسعار', docsN: 'المستندات: {n}',
      review: 'مراجعة الطلب', stepApplied: 'تم التقديم', stepOps: 'موافقة العمليات', stepMgmt: 'اعتماد الإدارة', notYet: 'لم يتم بعد',
      sameApprover: 'وافقت على هذا الطلب عن فريق العمليات، لذا يجب أن يعتمده شخص آخر من الإدارة.',
      noReviewAction: 'لا يوجد ما يقوم به فريقك في هذا الطلب الآن.', infoRequested: 'تم إرسال الطلب إلى مقدم الطلب', rejected: 'تم رفض الطلب',
      source: 'التسجيل', hidden: 'مخفي لفريقك', docRejected: 'تم رفض التجديد', pricesRejected: 'تم رفض تغيير الأسعار',
      backToAuto: 'عاد التصنيف تلقائيًا', enforceTeam: 'الإدارة هي التي تقرر الإيقاف والإنذارات.', rating: 'التقييم', newProvider: 'جديد، تقييمات قليلة',
      doc: { missing: 'ناقص', uploaded: 'للمراجعة', verified: 'تمت المراجعة' }
    },
    overview: {
      sub: 'المنصة في لمحة.', gmvMonth: 'قيمة الأعمال هذا الشهر', gmvTotal: 'قيمة الأعمال حتى الآن', revenue: 'إيراد المنصة هذا الشهر',
      moneyHidden: 'الأرقام المالية تظهر للفرق المسؤولة عن الفواتير.',
      openWork: 'الأعمال الجارية', atRisk: 'حالات معرضة لتجاوز الموعد', breached: 'حالات تجاوزت الموعد', missed: 'مواعيد فائتة حتى الآن',
      activeEntities: 'جهات لديها أعمال مفتوحة', totalEntities: 'من {n}', activeProviders: 'مقدمو خدمة نشطون', suspended: 'مقدمو خدمة موقوفون',
      attention: 'بانتظار المنصة', applications: 'طلبات انضمام مقدمي الخدمة', disputes: 'نزاعات مفتوحة', qa: 'تقارير بانتظار مراجعة الجودة', flagged: 'تقييمات مُبلّغ عنها',
      scores: 'درجات مقدمي الخدمة (الأعلى والأدنى)', trend: 'قيمة الأعمال، آخر 3 أشهر', none: 'لا شيء بالانتظار.'
    },
    access: {
      sub: 'ما يراه كل فريق وما يفعله. تم الاتفاق عليه مع الإدارة في 5 أكتوبر 2026.', yours: 'فريقك', team: 'الفريق',
      twoTeams: 'يحتاج فريقين', twoTeamsBody: '{action}: الموافقة الأولى تنتظر {teams}.', and: ' و',
      personal: 'البيانات الشخصية للعملاء (الرقم القومي والهواتف والعناوين وإجابات التقارير)', personalNo: 'مخفية', personalYes: 'ظاهرة',
      all: 'كل شيء، بما في ذلك حسابات الموظفين وإعدادات المنصة'
    },
    perm: {
      overview: 'نظرة عامة على المنصة', cases_view: 'عرض الحالات', personalData: 'عرض البيانات الشخصية للعملاء', cases_manage: 'إعادة إسناد الحالات أو تمديدها أو إلغاؤها',
      providers_view: 'عرض مقدمي الخدمة', providers_approve: 'الموافقة على طلبات مقدمي الخدمة (الخطوة الأولى)', providers_signoff: 'الاعتماد النهائي لمقدمي الخدمة الجدد',
      providers_prices: 'الموافقة على تغيير الأسعار', providers_documents: 'الموافقة على تجديد المستندات', providers_enforce: 'إيقاف مقدمي الخدمة أو إعادتهم',
      qa_review: 'مراجعة التقارير (الجودة)', disputes_view: 'عرض النزاعات', disputes_decide: 'الفصل في النزاعات', disputes_openOnBehalf: 'فتح نزاع نيابة عن جهة',
      billing_view: 'عرض الفواتير والمدفوعات', billing_issue: 'إصدار الفواتير', billing_pay: 'تسجيل المدفوعات', billing_adjust: 'تعديل الفواتير بعد النزاعات',
      fee_change: 'تغيير عمولة المنصة', orgs_view: 'عرض الجهات', orgs_create: 'إنشاء حسابات الجهات', accounts_resetLogin: 'إعادة تعيين الدخول',
      reports_view: 'تقارير المنصة', audit_view: 'سجل التدقيق', staff_manage: 'إدارة حسابات الموظفين', settings_manage: 'إعدادات المنصة'
    }
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installStrings(ICM: any) {
  ICM.i18n.extend('en', en);
  ICM.i18n.extend('ar', ar);
  ICM.config.PLATFORM_NAME = 'Mosta3lem';
}

/** "cases.view" -> "console.perm.cases_view" */
export const permKey = (p: string) => 'console.perm.' + p.replace(/\./g, '_');
