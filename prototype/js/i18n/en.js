/* English strings. Every UI string goes through ICM.t(); keep keys in sync with ar.js
   (node tests/i18n-check.js reports gaps). No em dashes in copy. */
(function () {
  var I = window.ICM.i18n;
  I.dict.en = {
    common: {
      actions: 'Actions', active: 'Active', all: 'All', any: 'Any', back: 'Back', backHome: 'Back to home', by: 'By',
      cancel: 'Cancel', clearFilters: 'Clear filters', close: 'Close', comment: 'Comment', confirm: 'Confirm', date: 'Date',
      delete: 'Delete', email: 'Email', empty: 'Nothing here', from: 'From', inactive: 'Inactive', name: 'Name',
      noResults: 'No results', note: 'Note', optional: 'optional', phone: 'Phone', reason: 'Reason', role: 'Role',
      save: 'Save', saveChanges: 'Save changes', search: 'Search', select: 'Select', selectAll: 'Select all', status: 'Status',
      to: 'To', updated: 'Updated', view: 'View', when: 'When', yes: 'Yes', no: 'No'
    },
    time: { dh: '{d}d {h}h', hm: '{h}h {m}m', m: '{m}m', hoursShort: '{h} h' },
    portal: { entity: 'Clients', provider: 'Service providers', agent: 'Field agents', admin: 'Platform' },
    service: { investigation: 'Investigation', collection: 'Collection' },
    kind: { company: 'Company', freelancer: 'Individual' },
    entityType: { bank: 'Bank', auto_finance: 'Auto finance', consumer_finance: 'Consumer finance', corporate: 'Company', insurance: 'Insurance', real_estate: 'Real estate', employer: 'Employer', other: 'Other organisation' },
    role: {
      entity_admin: 'Admin', entity_credit: 'Investigations', entity_operations: 'Operations', entity_collections: 'Collections',
      provider_admin: 'Owner', provider_supervisor: 'Supervisor', agent: 'Field agent', freelancer: 'Individual provider',
      platform_admin: 'Super admin', platform_qa: 'Quality', platform_management: 'Management', platform_ops: 'Operations team',
      platform_finance: 'Finance', platform_legal: 'Legal', platform_support: 'Customer support', platform_sales: 'Sales', platform_data: 'Data', system: 'System'
    },
    roleHint: {
      entity_admin: 'all work and users', entity_credit: 'investigations', entity_operations: 'investigations and collections',
      entity_collections: 'collections', provider_admin: 'manages the account and team', provider_supervisor: 'assigns and reviews',
      agent: 'field app', freelancer: 'own offers and field work', platform_admin: 'full control, staff and settings', platform_qa: 'reviews reports from individuals and owners',
      platform_management: 'everything; final sign-offs', platform_ops: 'providers, cases and documents', platform_finance: 'invoices, payments and fees',
      platform_legal: 'disputes and the audit log', platform_support: 'cases and accounts, without personal data', platform_sales: 'organisations and providers',
      platform_data: 'reports, without personal data'
    },
    nav: {
      main: 'Main navigation', menu: 'Menu', dashboard: 'Dashboard', newRequest: 'New request', bulkUpload: 'Bulk upload',
      cases: 'Cases', batches: 'Batches', ratings: 'Ratings', invoices: 'Invoices', reports: 'Reports', users: 'Users',
      offers: 'Offers', caseBoard: 'Cases', assignment: 'Assignment', reviewQueue: 'Review queue', team: 'Team',
      portfolio: 'Portfolio report', feedback: 'Ratings and feedback', rateClients: 'Rate clients', earnings: 'Earnings',
      profile: 'Profile and settings', groupAccount: 'Account', overview: 'Overview', onboarding: 'Onboarding',
      providers: 'Providers', entities: 'Clients', allCases: 'Cases and batches', qaQueue: 'QA queue', disputes: 'Disputes',
      moderation: 'Ratings moderation', billing: 'Billing', groupConfig: 'Configuration', scoring: 'Scoring', pricing: 'Pricing and SLA',
      settings: 'Settings', audit: 'Audit log', demo: 'Demo controls', workspace: 'Workspace', fieldApp: 'Open field app',
      providerPortal: 'Provider portal', privacy: 'Privacy Policy', terms: 'Terms and Conditions'
    },
    header: {
      switchUser: 'Switch user', demoClock: 'Demo clock', demoClockHint: 'All timers use the demo clock. Admins can move it forward in Demo controls.',
      language: 'Language', notifications: 'Notifications', markAllRead: 'Mark all as read', noNotifications: 'No notifications yet', signOut: 'Sign out'
    },
    login: {
      title: 'Sign in', headline: 'Field investigations and collections, from request to rating',
      body1: 'Companies and organisations send customer verifications and overdue accounts to verified investigation and collection providers. They pick a provider from a ranked list and follow every step.',
      body2: 'Providers see only masked details until they accept. Every action is timed, logged and rated.',
      demoNote: 'This is a demo. Pick any user to sign in; switch users at any time from the header.',
      tests: 'Workflow tests', pick: 'Choose a demo user', pickHint: 'Users are grouped by portal and organisation.',
      providers: 'Service providers and field agents', entityGroupHint: 'Requesting client', companyGroupHint: 'Provider company with field team',
      freelancers: 'Individual providers', freelancerHint: 'Works alone and does the field work personally'
    },
    status: {
      draft: 'Draft', submitted: 'Submitted', awaiting_acceptance: 'Awaiting acceptance', declined: 'Declined', expired: 'Expired',
      accepted: 'Accepted', assigned: 'Assigned', in_field: 'In field', submitted_for_review: 'Submitted for review',
      returned_to_agent: 'Returned to agent', delivered: 'Delivered', rework_requested: 'Rework requested',
      accepted_by_entity: 'Accepted by client', closed: 'Closed', cancelled: 'Cancelled', active: 'Active',
      awaiting_entity_approval: 'Awaiting client approval', recalled: 'Recalled', accepted_offer: 'Accepted', withdrawn: 'Withdrawn',
      pending: 'Pending', issued: 'Issued', paid: 'Paid', open: 'Open', resolved: 'Resolved', pending_acceptance: 'Pending acceptance',
      in_progress: 'In progress', partially_closed: 'Partially closed', verified: 'Verified', rejected: 'Rejected',
      info_requested: 'Info requested', kept: 'Kept', broken: 'Broken', approved: 'Approved'
    },
    invoiceStatus: { draft: 'Draft', draft_invoice: 'Draft', issued: 'Issued', paid: 'Paid' },
    action: {
      submit: 'Submit', send_offer: 'Send offer', decline: 'Decline', expire: 'Expire', accept: 'Accept', assign: 'Assign agent',
      check_in: 'Check in at address', submit_report: 'Submit for review', return_to_agent: 'Return to agent', resume: 'Resume work',
      approve: 'Approve and deliver', request_rework: 'Request rework', accept_report: 'Accept report', close: 'Close case',
      cancel: 'Cancel case', force_reassign: 'Force reassign', start: 'Start work', request_settlement: 'Request settlement',
      approve_settlement: 'Approve settlement', reject_settlement: 'Reject settlement', recall: 'Recall case'
    },
    timeline: {
      title: 'Timeline', empty: 'No activity yet', created: 'Request created', submit: 'Request submitted', send_offer: 'Offer sent to provider',
      decline: 'Offer declined', expire: 'Offer expired', accept: 'Offer accepted, data released', assign: 'Agent assigned',
      check_in: 'Agent checked in', submit_report: 'Report submitted for review', return_to_agent: 'Report returned to agent',
      resume: 'Agent resumed work', approve: 'Report delivered to client', request_rework: 'Rework requested',
      accept_report: 'Report accepted by client', close: 'Case closed', cancel: 'Case cancelled', force_reassign: 'Reassigned by admin',
      start: 'Collection work started', request_settlement: 'Settlement requested', approve_settlement: 'Settlement approved',
      reject_settlement: 'Settlement rejected', recall: 'Recalled by client', log_action: 'Action logged',
      promise_to_pay: 'Promise to pay recorded', payment_recorded: 'Payment recorded', promise_broken: 'Promise to pay broken',
      sla_at_risk: 'SLA at risk', sla_breached: 'SLA breached', sla_extended: 'SLA extended', dispute_opened: 'Dispute opened',
      dispute_resolved: 'Dispute resolved', rated: 'Provider rated'
    },
    sla: {
      title: 'SLA', on_track: 'On track', at_risk: 'At risk', breached: 'Breached', met: 'Met', missed: 'Missed',
      left: '{time} left', overdue: 'Overdue {time}', due: 'Due {date}', notRunning: 'Not running'
    },
    avail: { high: 'High availability', medium: 'Medium availability', low: 'Low availability', full: 'Full', none: 'Not covered' },
    enforcement: {
      none: 'In good standing', warned: 'Warned', reduced: 'Reduced ranking', suspended: 'Suspended',
      notice: {
        warned: 'Your score is below the warning threshold. Improve on-time delivery and client ratings to avoid reduced ranking.',
        reduced: 'Your ranking in the marketplace is reduced because your score is below the threshold.',
        suspended: 'Your account is suspended. You will not receive new offers until the platform reactivates it.'
      }
    },
    enforcementSource: { auto: 'Automatic', manual: 'Set by admin' },
    criteria: {
      accuracy: 'Accuracy', evidence: 'Evidence completeness', timeliness: 'Timeliness', communication: 'Communication',
      conduct: 'Professional conduct', instructions: 'Following instructions', updates: 'Update quality', results: 'Results'
    },
    outcome: { fully_recovered: 'Fully recovered', partially_recovered: 'Partially recovered', unrecoverable: 'Unrecoverable', returned_to_entity: 'Returned to client' },
    paymentMethod: { cash: 'Cash', bank_transfer: 'Bank transfer', instapay: 'InstaPay', fawry: 'Fawry', cheque: 'Cheque' },
    amountRange: { r0: 'Up to EGP 10,000', r1: 'EGP 10,000 to 25,000', r2: 'EGP 25,000 to 50,000', r3: 'EGP 50,000 to 100,000', r4: 'EGP 100,000 to 250,000', r5: 'Above EGP 250,000' },
    address: { home: 'Home address', work: 'Work address', business: 'Business address', governorate: 'Governorate', city: 'City / district', street: 'Street and building', landmark: 'Landmark' },
    doc: { commercial_register: 'Commercial register', tax_card: 'Tax card', insurance: 'Insurance certificate', national_id: 'National ID', training_certificate: 'Training certificate' },
    payout: { accruing: 'Accruing', pending: 'Payout pending', paid_out: 'Paid out' },
    mask: {
      hidden: 'Hidden', preAcceptNotice: 'Customer details are hidden until you accept this case. You can see the service, type, governorate, amount range, deadline and price.',
      retentionNotice: 'This case closed more than 30 days ago, so customer details are masked again.'
    },
    kpi: {
      openCases: 'Open cases', slaAtRisk: 'SLA at risk', slaAtRiskSub: '80% of time used', slaBreached: 'SLA breached',
      deliveredMonth: 'Delivered this month', recoveredMonth: 'Recovered this month', turnaround: 'Avg. turnaround',
      turnaroundSub: 'Acceptance to delivery, 90 days', spendMonth: 'Spend this month', ratingsPending: 'Ratings to give',
      newOffers: 'New offers', dueToday: 'Due today', rejectionRate: 'Rejection rate', rejectionSub: 'Returns and rework per report',
      earningsMonth: 'Earnings this month', earningsSub: 'After platform fee'
    },
    metric: {
      onTime: 'On-time rate', firstTime: 'First-time acceptance', evidence: 'Evidence complete', recovery: 'Recovery rate',
      recoveryNorm: 'Recovery vs bucket benchmark', ptpKept: 'Promises kept', complaints: 'Complaint rate'
    },
    score: {
      title: 'Provider score from 0 to 100', label: 'Score', short: 'score {n}', breakdown: 'Score breakdown',
      operational: 'Operational part', ratingPart: 'Client rating part', none: 'No score yet'
    },
    rating: {
      title: 'Rating', new: 'New', count: '{n} ratings', outOf: '{n} out of 5', overall: 'Overall rating', tags: 'Tags',
      feedback: 'Written feedback', feedbackHint: 'What went well, what should improve', rateProvider: 'Rate {name}',
      caseIntro: 'Case {ref} is closed. Your rating updates the provider score. Other clients see feedback without your name.',
      later: 'Later', submit: 'Submit rating', saved: 'Rating saved', removed: 'Removed from score', providerReply: 'Provider reply',
      yourReply: 'Your reply', reply: 'Reply', editReply: 'Edit reply', replyHint: 'Replies are public and shown under the feedback.',
      replyLabel: 'Reply', publishReply: 'Publish reply', replySaved: 'Reply published', dispute: 'Dispute rating',
      report: 'Report feedback', reportBody: 'Tell the moderators what is wrong with this feedback.', reported: 'Reported',
      reportedToast: 'Sent to moderation', hiddenByAdmin: 'Hidden by moderator', archived: 'Archived case',
      criteria: 'Criteria', newShort: 'New ({n} ratings)', avgShort: '{avg} from {n} ratings'
    },
    ratings: {
      entitySubtitle: 'Rate providers after a case or batch closes. One rating per case or batch.', pending: 'To rate', given: 'Given',
      pendingCases: 'Closed cases', pendingBatches: 'Closed batches', closedOn: 'Closed', rateNow: 'Rate now',
      nonePending: 'Nothing waiting for a rating', noneGiven: 'You have not rated anyone yet', batchRating: 'Batch rating'
    },
    entity: {
      dashboard: {
        title: 'Good day, {name}', attention: 'Needs your attention', nothingPending: 'Nothing needs you right now',
        byStatus: 'Open cases by status', volume: 'Monthly volume', created: 'Created', closed: 'Closed'
      }
    },
    request: {
      subtitle: 'Choose the service, fill in the details, then choose a provider.', stepService: 'Service', stepDetails: 'Details',
      stepProvider: 'Provider', serviceHint: { investigation: 'Verify residence, employment, business activity or a guarantor.', collection: 'Recover an overdue amount on your behalf.' },
      newTitle: 'New {service} request', editDraft: 'Edit draft {ref}', formSubtitle: 'Fields marked * are required.',
      changeService: 'Change service', saveDraft: 'Save draft', continue: 'Continue to provider selection',
      deadlineHint: 'The deadline defaults to the SLA of the selected inquiry types. You can shorten or extend it.',
      bucketHint: 'The days-past-due bucket is set automatically from days past due.', draftSaved: 'Draft {ref} saved', editDraftBtn: 'Edit draft'
    },
    forms: {
      addMobile: 'Add another mobile', nidPlaceholder: '14 digits',
      investigationRequest: {
        sections: { customer: 'Customer', inquiry: 'Inquiry', addresses: 'Addresses', details: 'Details and deadline' },
        fullName: 'Customer full name', nationalId: 'National ID', mobile: 'Mobile', inquiryTypes: 'Inquiry types',
        home: 'Home address', work: 'Work address', business: 'Business address', employerName: 'Employer name',
        businessName: 'Business name', guarantorName: 'Guarantor name', guarantorNationalId: 'Guarantor national ID',
        guarantorMobile: 'Guarantor mobile', guarantorRelationship: 'Relationship to customer', instructions: 'Specific questions or instructions',
        deadline: 'Deadline', internalRef: 'Internal reference'
      },
      collectionRequest: {
        sections: { customer: 'Customer', addresses: 'Addresses', contract: 'Contract and amounts', collateral: 'Collateral', authority: 'Allowed actions and authority' },
        fullName: 'Customer full name', nationalId: 'National ID', mobiles: 'Mobiles', home: 'Home address', work: 'Work address',
        contractNumber: 'Contract number', productType: 'Product type', originalAmount: 'Original amount (EGP)', overdueAmount: 'Overdue amount (EGP)',
        instalmentAmount: 'Instalment amount (EGP)', dpd: 'Days past due', dpdHint: 'Sets the days-past-due bucket.',
        collateralMake: 'Make', collateralModel: 'Model', collateralPlate: 'Plate number', collateralNotes: 'Other collateral details',
        allowedActions: 'Allowed actions', allowed: { calls: 'Calls', messages: 'Messages', visits: 'Field visits' },
        settlementMode: 'Settlement authority', settlement: { none: 'None', discount: 'Discount up to a maximum', instalments: 'Instalment plans allowed' },
        maxDiscountPct: 'Maximum discount (%)', periodEnd: 'Collection period ends', internalRef: 'Internal reference'
      },
      report_residence: {
        customerFound: 'Customer found at address', residenceConfirmed: 'Residence confirmed', ownership: 'Ownership',
        ownershipOpt: { owned: 'Owned', rented: 'Rented', family: 'Family home' }, yearsAtAddress: 'Years at address',
        neighbourConfirmation: 'Neighbour confirmation', notes: 'Notes'
      },
      report_employment: {
        employerConfirmed: 'Employer confirmed', jobTitle: 'Job title', tenureYears: 'Years with employer', hrContact: 'HR contact',
        salaryConfirmed: 'Salary confirmed', notes: 'Notes'
      },
      report_business: {
        businessExists: 'Business exists', activityMatches: 'Activity matches the application', estimatedSize: 'Estimated size',
        sizeOpt: { micro: 'Micro', small: 'Small', medium: 'Medium', large: 'Large' }, employees: 'Employees seen', notes: 'Notes'
      },
      report_guarantor: {
        guarantorFound: 'Guarantor found', willingToGuarantee: 'Willing to guarantee', relationship: 'Relationship',
        relOpt: { family: 'Family', friend: 'Friend', colleague: 'Colleague', employer: 'Employer', other: 'Other' }, notes: 'Notes'
      },
      collAction: { type: 'Action type', note: 'Note' },
      collPromise: { amount: 'Promised amount (EGP)', dueDate: 'Promised date', note: 'Note' },
      collPayment: { amount: 'Amount (EGP)', method: 'Method', receipt: 'Receipt photo', note: 'Note' },
      collSettlement: { kind: 'Settlement type', discountPct: 'Discount (%)', instalmentCount: 'Number of instalments', note: 'Justification' },
      collClose: { outcome: 'Outcome', reason: 'Reason' }
    },
    settlement: {
      kind: { discount: 'Discount', instalments: 'Instalment plan' }, title: 'Settlement requests', request: 'Request settlement', short: 'Settlement',
      discountText: '{pct}% discount', instalmentsText: '{count} instalments', requestedBy: 'Requested by {name}, {time}',
      decidedBy: 'Decided by {name}, {time}', outstandingAt: 'outstanding {amount} at request', newTarget: 'New amount to collect: {amount}',
      approveBody: 'The customer can settle on these terms. The outstanding balance will be recalculated.', approved: 'Settlement approved',
      rejected: 'Settlement rejected', sent: 'Settlement sent to the client for approval', waitingEntity: 'Waiting for the client to approve or reject the settlement.',
      authorityDiscount: 'The client allows discounts up to {pct}%.', authorityInstalments: 'The client allows instalment plans.'
    },
    collection: {
      balance: 'Balance', recovered: 'Recovered', outstanding: 'Outstanding', settledTarget: 'Settled amount', instalmentPlan: 'Instalment plan',
      planText: '{count} x {amount}', outcome: 'Outcome', log: 'Action log', entry: 'Entry', noActions: 'No actions logged yet',
      promise: 'Promise to pay', promises: 'Promises to pay', payment: 'Payment', receipt: 'Receipt', dueOn: 'due {date}',
      logAction: 'Log action', recordPromise: 'Record promise to pay', recordPayment: 'Record payment', closeCase: 'Close case',
      allowedIntro: 'Allowed by the client: {list}.', actionLogged: 'Action logged', promiseIntro: 'Outstanding balance: {amount}.',
      promiseRecorded: 'Promise recorded', paymentIntro: 'Outstanding balance: {amount}. Attach the receipt if you have it.',
      paymentRecorded: 'Payment recorded', closeIntro: 'Closing is final. Fully recovered needs a zero balance; partial needs at least one payment.',
      closed: 'Case closed'
    },
    case: {
      ref: 'Reference', service: 'Service', customer: 'Customer', customerName: 'Customer name', nationalId: 'National ID', mobiles: 'Mobiles',
      inquiryTypes: 'Inquiry types', guarantor: 'Guarantor', deadline: 'Deadline', contractNumber: 'Contract number', product: 'Product',
      dpd: 'Days past due', dpdBucket: 'Days past due', amountRange: 'Amount range', originalAmount: 'Original amount', overdueAmount: 'Overdue amount',
      instalmentAmount: 'Instalment', collateral: 'Collateral', allowedActions: 'Allowed actions', settlementAuthority: 'Settlement authority',
      maxDiscount: 'Discount up to {pct}%', periodEnd: 'Collection period ends', instructions: 'Instructions', internalRef: 'Internal reference',
      details: 'Request details', addresses: 'Addresses', provider: 'Provider', agent: 'Agent', client: 'Client', price: 'Price',
      feeTerms: '{pct}% of recovered + {fixed}', due: 'Due', createdOn: 'created {date}', noActions: 'No actions for you at this stage.',
      selectProvider: 'Select a provider', declinedNotice: 'The provider declined: {reason}. Choose another provider.',
      expiredNotice: 'The provider did not answer in time. Choose another provider.', awaitingNotice: 'Waiting for {name} to accept.',
      rateViaBatch: 'This case is rated with its batch:', acceptReportTitle: 'Accept report',
      acceptReportBody: 'Accepting closes the case and adds it to this month\'s invoice. You will be asked to rate the provider.',
      reportAccepted: 'Report accepted and case closed', reworkBody: 'The case goes back to the provider, who reassigns it to an agent.',
      reworkReasonLabel: 'What needs to be fixed', reworkSent: 'Rework requested', recallBody: 'The provider stops all work on this case.',
      recalled: 'Case recalled', cancelBody: 'The case is cancelled and any pending offer is withdrawn.', cancelled: 'Case cancelled'
    },
    cases: { count: '{n} cases', searchHint: 'Name, national ID, contract or reference', none: 'No cases match these filters' },
    select: {
      title: 'Choose a provider', autoBest: 'Auto-select best', notSelectable: 'This case is {status}; a provider cannot be selected now.',
      backToCase: 'Back to case', afterDecline: 'The previous provider declined. Pick another provider.', afterExpiry: 'The previous offer expired. Pick another provider.',
      sortBy: 'Sort by', sort: { rank: 'Best match', score: 'Score', price: 'Price', availability: 'Availability', sla: 'SLA' },
      eligibleCount: '{n} eligible providers', hiddenFull: '{n} hidden: full capacity', hiddenSuspended: '{n} suspended',
      type: 'Type', minRating: 'Minimum rating', priceMin: 'Price from', priceMax: 'Price to', feeMin: 'Fee % from', feeMax: 'Fee % to',
      noneEligible: 'No provider covers this area (governorate and city) with spare capacity right now.', bestMatch: 'Best match',
      feeText: '{pct}% + {fixed}', perCase: 'per case', feeTerms: 'of recovered, plus fixed fee', sla: 'SLA', spare: 'Spare capacity',
      profile: 'Profile', select: 'Select', selectThis: 'Select this provider', confirmTitle: 'Send offer',
      confirmBody: 'Send this case to {name} for {price}? They have {hours} hours to accept or decline.', sendOffer: 'Send offer',
      offerSent: 'Offer sent to {name}'
    },
    provider: {
      verified: 'Verified', memberSince: 'On the platform since {date}', coverage: 'Coverage and capacity', recentFeedback: 'Recent feedback',
      anonymised: 'Feedback is shown without the name of the client that wrote it.', noFeedback: 'No written feedback yet',
      openInFieldApp: 'Open in field app',
      dashboard: {
        title: '{service} workspace', byStatus: 'Cases by status', byBucket: 'Recovery rate by days-past-due bucket', promises: 'Promises to pay',
        unassigned: '{n} cases to assign', toReview: '{n} reports to review'
      }
    },
    offers: {
      subtitle: 'Offers show masked details only. You have {hours} hours to respond.', pending: 'Pending', history: 'History',
      nonePending: 'No open offers', noneHistory: 'No past offers', batchOffer: 'Batch {ref}: {n} cases', caseOffer: 'Case {ref}',
      from: 'From', maskedNotice: 'Customer details are released when you accept.', feeTerms: 'Fee terms', total: 'Total',
      all: '({n})', expiresIn: '{time} to respond', expired: 'Expired', acceptanceWindow: 'Acceptance window',
      declinedWith: 'Declined: {reason}', acceptTitle: 'Accept offer', acceptBody: 'Accept {n} case(s)? Full customer data is released and the SLA starts.',
      accepted: 'Offer accepted', declineTitle: 'Decline offer', declineBody: 'The client is told the reason and picks another provider.',
      declined: 'Offer declined', openOffer: 'This case is an open offer.'
    },
    board: { kanban: 'Board', table: 'Table' },
    assign: {
      title: 'Assign agent', routeTitle: 'Assign {n} cases as a route', intro: 'Agents covering the case area are listed first.',
      areas: 'Areas', load: 'Open load', coversArea: 'Covers area', noAgents: 'No active agents for this service', confirm: 'Assign',
      pickAgent: 'Pick an agent', done: '{n} case(s) assigned', reassign: 'Reassign agent', sendBack: 'Send back to agent',
      takeBack: 'Take the case back', subtitle: 'Assign accepted cases. Select several cases in one area to send them as a route.',
      assignSelected: 'Assign selected ({n})', routeHint: 'Filter by governorate to build a route.', unassigned: 'To assign ({n})',
      allAssigned: 'Every accepted case has an agent', assignedWaiting: 'Assigned, not started ({n})', open: 'open'
    },
    review: {
      title: 'Review report {ref}', subtitle: 'Reports from your field team waiting for review.', open: 'Review report', submitted: 'Submitted',
      photosOk: 'Minimum met', photosShort: 'Below minimum', comment: 'Comment for the agent', commentHint: 'Required when returning the report',
      approveDeliver: 'Approve and deliver', approveBody: 'The report goes to the client and the delivery time is recorded.',
      returned: 'Report returned to the agent', delivered: 'Report delivered to the client', empty: 'No reports waiting for review',
      returnedWith: 'Returned with comments:', reworkReason: 'Rework requested by the client:', previouslyReturned: 'Returned {n} time(s) before.',
      evidenceShort: '{photos}/{min} photos, {distance} m'
    },
    evidence: {
      title: 'Evidence and report', checkIn: 'Check-in', notCheckedIn: 'Not checked in yet', checkedInAt: 'Checked in at {time}, {distance} m from address',
      farFromAddress: 'More than {max} m from the address', photos: 'Photos ({n} of {min} required)', photo: 'Evidence photo', noReport: 'No report answers yet',
      label: { entrance: 'Entrance', building: 'Building', door: 'Door', street: 'Street', premises: 'Premises', signboard: 'Signboard' }
    },
    dispute: {
      title: 'Disputes', flag: 'Disputed', raise: 'Raise a dispute', raiseCase: 'Dispute case {ref}', raiseRating: 'Dispute this rating',
      caseIntro: 'The platform reviews both sides and the case timeline, then decides.', ratingIntro: 'If the platform upholds your dispute, the rating is removed from your score.',
      reasonLabel: 'Reason', details: 'Details', submit: 'Open dispute', opened: 'Dispute opened',
      reason: { report_inaccurate: 'Report inaccurate', evidence_missing: 'Evidence missing', sla_missed: 'SLA missed', conduct: 'Conduct', billing: 'Billing', other: 'Other', rating_unfair: 'Rating unfair', wrong_case: 'Wrong case', abusive: 'Abusive language' },
      outcome: { upheld: 'Upheld', rejected: 'Rejected', partial: 'Partially upheld' },
      proposalTitle: 'Proposed decision, waiting for confirmation', proposedBy: 'Proposed by {name} ({team})', sendBack: 'Send back',
      confirmDecision: 'Confirm decision', confirmBody: 'The decision takes effect for both parties, with its effects on ratings and invoices.',
      proposed: 'Decision proposed. Waiting for the other team to confirm.',
      party: { entity: 'Client', provider: 'Provider', admin: 'Platform' },
      kindLabel: { case: 'Case', rating: 'Rating' },
      adminSubtitle: 'Disputes raised by clients about cases and by providers about ratings.', ref: 'Dispute', kind: 'About', raisedBy: 'Raised by',
      parties: 'Client / provider', none: 'No disputes', entitySide: 'Client: {name}', providerSide: 'Provider: {name}', noStatement: 'No statement yet',
      disputedRating: 'Disputed rating', caseTimeline: 'Case {ref} timeline', openCase: 'Open case', adminNotes: 'Platform notes',
      resolve: 'Resolve dispute', outcomeLabel: 'Outcome', resolutionNote: 'Decision note',
      ratingEffects: 'Upheld removes the rating from the score. Partial halves its weight. Rejected keeps it.',
      caseEffects: 'Upheld credits the case on the invoice. Partial credits half. Rejected changes nothing.',
      addNote: 'Add note', resolution: 'Resolution', needOutcome: 'Choose an outcome and write a note.',
      resolveConfirm: 'Resolve as {outcome}? Both parties are notified.', resolved: 'Dispute resolved',
      openBadge: 'Dispute open', resolvedBadge: 'Dispute: {outcome}'
    },
    batch: {
      label: 'Batch {ref}', subtitle: 'Groups of cases created from bulk uploads.', none: 'No batches yet', ref: 'Batch', created: 'Created',
      progress: 'Progress', providers: 'Providers', ratingPending: 'Rating pending', createdOn: 'created {date}', closedOf: '{closed} of {total} closed',
      needsRatingNotice: 'All cases are finished. Close the batch by giving one rating per provider.', offers: 'Offers', group: 'Group',
      wholeBatch: 'Whole batch', cases: 'Cases', ratingsGiven: 'Batch rating', caseFlags: 'Flags on individual cases',
      casesTitle: 'Cases ({n})', assignTitle: 'Assign {n} cases', modeSingle: 'One provider for the whole batch', modeSplit: 'Split by governorate',
      oneProvider: 'Provider', noSingleProvider: 'No single provider covers every governorate in this batch. Split by governorate instead.',
      noProviderForGroup: 'No eligible provider', sendOffers: 'Send offers', sendOffersBody: 'Offers are accepted or declined as a whole. Providers have {hours} hours.',
      offersSent: 'Offers sent', pickAll: 'Choose a provider for every group', acceptAll: 'Accept {n} delivered reports',
      acceptAllTitle: 'Accept all delivered reports', acceptAllBody: 'Every delivered report in this batch is accepted and its case closed.',
      accepted: '{n} reports accepted', closeAndRate: 'Close batch and rate', closeTitle: 'Close batch {ref}',
      closeIntro: 'Give one rating per provider for this batch. You can flag individual cases with a short note.',
      casesClosed: '{n} cases closed', flagNote: 'Flag', flagHint: 'Optional note about this case', closed: 'Batch closed'
    },
    bulk: {
      subtitle: 'Upload an Excel or CSV file, fix any rows with errors, then create a batch.', step1: '1. Service and template',
      step2: '2. Upload file', step3: '3. Check rows', step4: '4. Create batch', downloadTemplate: 'Download Excel template',
      downloadDemo: 'Download sample file (30 rows, 3 with errors)', templateHint: 'Governorate accepts the English or Arabic name. Inquiry types are separated by commas.',
      loaded: '{name}: {n} rows', validRows: '{n} valid', errorRows: '{n} with errors', excludedRows: '{n} excluded', onlyErrors: 'Only rows with errors',
      fixHint: 'Edit a cell to fix it, or untick a row to exclude it.', row: 'Row', include: 'Include', issues: 'Issues', ok: 'OK',
      batchName: 'Batch name', batchNameHint: 'For example: September applications', periodDays: 'Collection period (days)',
      fixBeforeCreate: 'Fix or exclude {n} rows before creating the batch.', create: 'Create batch with {n} cases',
      confirmTitle: 'Create batch', confirmBody: '{n} cases will be created as drafts. You assign providers on the next screen.', created: 'Batch {ref} created',
      col: {
        full_name: 'Full name', national_id: 'National ID', mobile: 'Mobile', mobile_2: 'Mobile 2', inquiry_types: 'Inquiry types', governorate: 'Governorate',
        city: 'City', street: 'Street', landmark: 'Landmark', employer_name: 'Employer', business_name: 'Business', guarantor_name: 'Guarantor',
        guarantor_mobile: 'Guarantor mobile', instructions: 'Instructions', internal_ref: 'Internal ref', contract_number: 'Contract',
        product_type: 'Product', original_amount: 'Original', overdue_amount: 'Overdue', instalment_amount: 'Instalment', days_past_due: 'DPD', collateral: 'Collateral'
      }
    },
    invoice: {
      subtitle: 'Monthly invoices per provider. Lines are added when cases close.', outstanding: 'Outstanding', accruing: 'Accruing this month',
      accruingSub: 'Draft, not issued yet', paidTotal: 'Paid', ref: 'Invoice', month: 'Month', provider: 'Provider', client: 'Client', lines: 'Lines',
      total: 'Total', markPaid: 'Mark as paid', payBody: 'Record that this invoice is paid. This is a simulation; no money moves.', paid: 'Invoice marked as paid',
      none: 'No invoices', title: 'Invoice {ref}', closed: 'Closed', amount: 'Amount', adjusted: 'adjusted to {pct}% after dispute',
      platformFee: 'Platform fee', issue: 'Issue', issueBody: 'Issue this invoice to the client. It can then be paid.', issued: 'Invoice issued'
    },
    earnings: {
      subtitle: 'Per case earnings after the {pct}% platform fee.', monthGross: 'This month, gross', monthNet: 'This month, net', afterFee: 'after platform fee',
      accruing: 'Accruing', accruingSub: 'Invoice not issued yet', pending: 'Payout pending', pendingSub: 'Invoice issued, not paid', paidOut: 'Paid out',
      perCase: 'Per case', gross: 'Gross', fee: 'Platform fee', net: 'Net', payout: 'Payout', none: 'No earnings yet', adjusted: 'adjusted by dispute'
    },
    reports: {
      subtitle: 'How the providers you work with perform.', onTime: 'On-time rate by provider (%)', volume: 'Cases per month by provider',
      comparison: 'Provider comparison', cases: 'Cases', turnaround: 'Turnaround', avgRating: 'Your avg. rating', breaches: 'SLA misses', spend: 'Spend'
    },
    users: {
      subtitle: 'People in your organisation who can use the platform.', invite: 'Invite user', invited: 'Invited', access: 'Access',
      deactivate: 'Deactivate', reactivate: 'Reactivate', deactivateBody: 'The user can no longer sign in. Their past actions stay in the audit log.',
      inviteNote: 'In this demo the invitation is simulated; the user appears in the switcher straight away.', sendInvite: 'Send invite',
      invitedToast: 'Invitation sent to {email}', roleChanged: 'Role changed'
    },
    team: {
      subtitle: '{n} field agents', delivered: 'Delivered', returns: 'Returns and rework', collected: 'Collected', closed: 'Closed',
      actions: 'Actions logged', activate: 'Activate', deactivate: 'Deactivate', deactivateBody: 'The agent stops receiving assignments and cannot sign in.'
    },
    profile: {
      basics: 'Company details', description: 'Description', city: 'City', services: 'Services', documents: 'Documents',
      upload: 'Upload', uploadBody: 'Upload {doc}? In this demo the upload is simulated.', uploaded: 'Document uploaded',
      docsNote: 'The platform checks documents before verification.', coverage: 'Coverage and capacity',
      coverageHint: 'Tick the governorates you cover and set how many open cases you can handle in each.', capacity: 'Capacity', load: 'open now: {n}',
      invPricing: 'Investigation prices (EGP) and SLA commitment', pricingHint: 'Prices must stay inside the platform bands shown under each cell.',
      slaHours: 'SLA (hours)', colPricing: 'Collection fees', feeHint: 'Fee as a percentage of the amount recovered, per days-past-due bucket.',
      fixedFee: 'Fixed fee per case (EGP)', max: 'max {n}', firstContact: 'First contact within (hours)', saved: 'Profile saved'
    },
    providerRatings: {
      subtitle: 'Ratings from clients. Reply publicly or dispute a rating through the platform.', none: 'No ratings yet', summary: 'Summary',
      newExplain: 'Stars are shown to clients once you have {n} ratings.', weighting: 'Ratings from the last {days} days count double. One client can contribute at most {cap}% of the rating part.'
    },
    clientRating: {
      subtitle: 'Rate the clients you work for on data quality and payment timeliness. Other providers see the averages.',
      pending: 'Waiting for your rating ({n})', nonePending: 'Nothing to rate', given: 'Your ratings', rateBtn: 'Rate client', rateTitle: 'Rate {name}',
      intro: 'About {ref}.', dataQuality: 'Data quality', dataQualityHint: 'Were addresses, phones and instructions complete and correct?',
      paymentTimeliness: 'Payment timeliness', none: 'No client ratings yet', basedOn: 'from {n} provider ratings', batchOf: 'batch, {n} cases'
    },
    portfolio: {
      subtitle: 'Recovery per batch and per client for the selected month.', collectionOnly: 'Available in the collection workspace.',
      overdue: 'Overdue', recoveredMonth: 'Recovered in month', byBatch: 'By batch', portfolio: 'Portfolio', singles: 'Single cases',
      openN: '{n} open', ptp: 'Promises kept', ptpConversion: 'Promise conversion'
    },
    agent: {
      tabs: { tasks: 'Tasks', returned: 'Returned', performance: 'Performance', earnings: 'Earnings' },
      myTasks: 'My tasks', overdue: 'Overdue', today: 'Today', upcoming: 'Upcoming', route: 'Route order', waiting: 'Waiting for review',
      noneOverdue: 'Nothing overdue', noneToday: 'Nothing due today', noneUpcoming: 'Nothing upcoming', noRoute: 'No open tasks',
      waitingQa: 'Submitted. Waiting for platform QA review.', waitingSupervisor: 'Submitted. Waiting for your supervisor.',
      checkInHint: 'Check in when you reach the address. Your location is recorded and report submission unlocks.',
      addPhoto: 'Take or add photo', photoStamp: 'Each photo is stamped with the time and your location.', photoAdded: 'Photo added',
      removePhoto: 'Remove photo', removePhotoBody: 'Remove this photo from the evidence?', reportFor: 'Report: {type}', saved: 'Saved',
      saveAnswers: 'Save answers', answersSaved: 'Answers saved', savedIncomplete: 'Saved, but some required answers are missing',
      submit: 'Submit for review', chkCheckIn: 'Checked in at the address', chkPhotos: 'Photos: {n} of {min}', chkForms: 'All report forms complete',
      goesToQa: 'Reports from individual providers go to platform QA.', goesToSupervisor: 'The report goes to your supervisor.',
      submitBody: 'You cannot edit the report after submitting.', submitted: 'Report submitted', yourReport: 'Your report',
      logWork: 'Log work', returnedTitle: 'Returned tasks', noneReturned: 'Nothing returned to you', performanceTitle: 'My performance',
      openTasks: 'Open tasks', completedMonth: 'Completed this month', returnRate: 'Return rate', avgDistance: 'Avg. check-in distance',
      meters: '{n} m', collectedMonth: 'Collected this month', collectedTotal: 'Collected in total'
    },
    admin: {
      overviewTitle: 'Platform overview', gmvMonth: 'GMV this month', gmvTotal: '{amount} all time', gmv: 'GMV', revenueMonth: 'Platform revenue this month',
      missedTotal: '{n} missed in total', activeEntities: 'Active clients', activeProviders: 'Active providers', suspendedN: '{n} suspended',
      openDisputes: 'Open disputes', casesByStatus: 'Cases by status', gmvSeries: 'GMV by month', topProviders: 'Top providers', bottomProviders: 'Lowest scores',
      providersSubtitle: 'Verified providers with score and enforcement status.', openCases: 'Open cases', enforcement: 'Enforcement',
      warn: 'Warn', reduce: 'Reduce ranking', suspend: 'Suspend', reactivate: 'Reactivate', backToAuto: 'Back to automatic',
      scoreFor: '{service} score', volume: 'Volume', team: 'Team', ratingsReceived: 'Ratings received ({n})', history: 'History',
      enforceTitle: 'Set status: {level}',
      enforceBody: {
        none: 'The provider returns to good standing and appears in the marketplace. Automatic enforcement stays off until you switch it back on.',
        warned: 'The provider is warned. Ranking is lowered slightly.', reduced: 'The provider is ranked lower in the marketplace.',
        suspended: 'The provider disappears from the marketplace and cannot accept offers.'
      },
      enforced: 'Status updated', entitiesSubtitle: 'Clients with volume, spend and data quality ratings from providers.',
      spend: 'Spend', dataQualityRating: 'Rated by providers', forceReassign: 'Force reassign', extendSla: 'Extend SLA', reasonRequired: 'Admin actions need a reason.',
      reassignBody: 'The current provider loses the case and a new offer goes to the provider you pick.', reassigned: 'Offer sent to the new provider',
      extendHours: 'Extend by (hours)', extended: 'SLA extended', cancelBody: 'The case is cancelled for both sides.', billingSubtitle: 'Issue draft invoices to clients.'
    },
    onboarding: {
      subtitle: 'Applications from companies and individuals, self-registered or registered by the platform.', applied: 'Applied {date}', contact: 'Contact', freelancerChecks: 'Checks for individuals',
      idVerified: 'ID verified', certified: 'Passed training', verify: 'Verify', verifyBody: 'The provider goes live in the marketplace and gets a login.',
      verified: 'Provider verified', reject: 'Reject', requestInfo: 'Request more info', whatIsMissing: 'What is missing', send: 'Send', none: 'No applications waiting'
    },
    qa: { subtitle: 'Reports from individual providers. Approve to deliver to the client, or return with comments.' },
    moderation: {
      subtitle: 'Flagged or reported feedback. Hiding keeps the rating in the score but hides the text.', flagged: 'Flagged', hidden: 'Hidden', all: 'All feedback',
      by: 'by {name}', hiddenBadge: 'Hidden', flagReason: 'Reported by provider: {reason}', hide: 'Hide', restore: 'Restore', dismiss: 'Dismiss report',
      hideBody: 'The feedback text is hidden from everyone except admins.', none: 'Nothing to moderate'
    },
    scoring: {
      subtitle: 'Changes recalculate every provider score and enforcement level immediately.', weights: 'Weights and window',
      operationalWeight: 'Operational metrics (%)', ratingWeight: 'Client ratings (%)', sumHint: 'The two weights must add up to 100.',
      recencyDays: 'Recency window (days)', recencyHint: 'Ratings inside the window count {x} times.', minRatings: 'Minimum ratings before stars show',
      minRatingsHint: 'Below this, a New badge is shown.', entityCap: 'Max share of one client (%)', entityCapHint: 'Stops a single client dominating the rating part.',
      thresholds: 'Enforcement thresholds', thresholdsHint: 'A provider whose score falls below a threshold is warned, ranked lower, or suspended automatically. Suspend < reduce < warn.',
      warnBelow: 'Warn below', reduceBelow: 'Reduce ranking below', suspendBelow: 'Suspend below', saveRecalc: 'Save and recalculate',
      confirmBody: 'All scores and enforcement levels are recalculated now.', saved: 'Scores recalculated', savedChanges: 'Scores recalculated. Changed: {list}',
      formula: 'How the score works', formulaText: 'Score = operational weight x operational metrics + rating weight x client ratings, each on a 0 to 100 scale.',
      noComplaints: 'No complaints', rankingText: 'Marketplace ranking multiplies the score by availability and any enforcement penalty. Providers at full capacity are hidden.',
      current: 'Current scores'
    },
    pricing: {
      subtitle: 'Price bands, platform fee, default SLAs and the offer window.', general: 'General', fee: 'Platform fee (%)', feeHint: 'Deducted from provider payouts.',
      window: 'Offer acceptance window (hours)', windowHint: 'Offers expire after this.', warn: 'Expiry warning (minutes before)', collectionDays: 'Default collection period (days)',
      invBands: 'Investigation price bands (EGP, Greater Cairo base)', min: 'Min', max: 'Max', defaultSla: 'Default SLA (hours)', minPhotos: 'Min photos',
      zones: 'Zone multipliers', colBands: 'Collection fee bands (% of recovered)', fixedFeeMax: 'Max fixed fee per case (EGP)', saved: 'Pricing saved'
    },
    settings: {
      subtitle: 'Lists used across the platform.', list: { governorates: 'Governorates', inquiryTypes: 'Inquiry types', actionTypes: 'Collection actions', ratingTags: 'Rating tags', declineReasons: 'Decline reasons', productTypes: 'Product types' },
      id: 'ID', en: 'English', ar: 'Arabic', field: { zone: 'Zone', code: 'ID code', lat: 'Lat', lng: 'Lng', defaultSlaHours: 'SLA h', minPhotos: 'Photos', kind: 'Kind', sentiment: 'Tone' },
      opt: { contact: 'Contact', visit: 'Visit', result: 'Result', note: 'Note', positive: 'Positive', negative: 'Negative' },
      addRow: 'Add row', discard: 'Discard changes', removeTitle: 'Remove item', removeBody: 'Existing cases keep the value; it is no longer offered for new ones.',
      saved: 'List saved', note: 'IDs of existing items cannot change because cases refer to them.'
    },
    audit: {
      subtitle: '{n} entries shown, newest first.', who: 'Who', what: 'What', target: 'Target', beforeAfter: 'Before and after',
      type: { case: 'Case', offer: 'Offer', batch: 'Batch', provider: 'Provider', rating: 'Rating', dispute: 'Dispute', invoice: 'Invoice', config: 'Config', user: 'User', agent: 'Agent', entity: 'Client', clock: 'Clock' },
      action: {
        case_submit: 'Case submitted', case_send_offer: 'Offer sent', case_decline: 'Offer declined', case_expire: 'Offer expired', case_accept: 'Case accepted',
        case_assign: 'Agent assigned', case_check_in: 'Checked in', case_submit_report: 'Report submitted', case_return_to_agent: 'Report returned',
        case_resume: 'Work resumed', case_approve: 'Report delivered', case_request_rework: 'Rework requested', case_accept_report: 'Report accepted',
        case_close: 'Case closed', case_cancel: 'Case cancelled', case_force_reassign: 'Force reassigned', case_start: 'Work started',
        case_request_settlement: 'Settlement requested', case_approve_settlement: 'Settlement approved', case_reject_settlement: 'Settlement rejected',
        case_recall: 'Case recalled', case_created: 'Case created', case_updated: 'Draft updated', case_photo_added: 'Photo added',
        case_action_logged: 'Collection action logged', case_promise_recorded: 'Promise to pay recorded', case_payment_recorded: 'Payment recorded',
        case_sla_extended: 'SLA extended', case_sla_breached: 'SLA breached', offer_sent: 'Offer sent', offer_accept: 'Offer accepted', offer_decline: 'Offer declined',
        batch_created: 'Batch created', batch_assigned: 'Batch assigned', batch_closed: 'Batch closed', rating_created: 'Rating given', rating_reply: 'Rating reply',
        rating_flagged: 'Feedback reported', rating_hidden: 'Feedback hidden', rating_restored: 'Feedback restored', rating_flag_dismissed: 'Report dismissed',
        client_rating_created: 'Client rated', dispute_opened: 'Dispute opened', dispute_response: 'Dispute note', dispute_resolved: 'Dispute resolved', dispute_decision_proposed: 'Dispute decision proposed', dispute_decision_sent_back: 'Dispute decision sent back',
        invoice_paid: 'Invoice paid', invoice_issued: 'Invoice issued', provider_verify: 'Provider verified', provider_reject: 'Application rejected',
        provider_request_info: 'More info requested', provider_check_idVerified: 'ID check updated', provider_check_certified: 'Training check updated',
        provider_enforcement_auto: 'Automatic enforcement', provider_enforcement_manual: 'Enforcement set by admin', provider_enforcement_auto_on: 'Automatic enforcement on',
        provider_profile_updated: 'Profile updated', provider_document_uploaded: 'Document uploaded', provider_agent_activated: 'Agent activated',
        provider_agent_deactivated: 'Agent deactivated', entity_user_invited: 'User invited', entity_user_role: 'Role changed',
        entity_user_activated: 'User activated', entity_user_deactivated: 'User deactivated', config_scoring: 'Scoring changed',
        config_pricing: 'Pricing changed', config_list: 'Settings list changed', demo_clock_advance: 'Demo clock advanced'
      }
    },
    demo: {
      subtitle: 'Move time forward to trigger offer expiry, SLA warnings, breaches and broken promises.', clock: 'Demo clock',
      ahead: '{time} ahead of real time', realTime: 'Running at real time', advance1h: 'Advance 1 hour', advance5h: 'Advance 5 hours',
      advance1d: 'Advance 1 day', hours: 'Hours', advanceBy: 'Advance', resetClock: 'Back to real time', advanced: 'Clock advanced',
      tickSummary: 'Last jump: {expired} offers expired, {warned} expiry warnings, {atRisk} at risk, {breached} breached, {promises} promises broken.',
      clockHint: 'The clock also ticks every 30 seconds in real time.', data: 'Demo data', reset: 'Reset demo data',
      resetHint: 'Restore the seed: 3 clients, 8 providers, about 90 cases, ratings, disputes and invoices.', resetTitle: 'Reset demo data',
      resetMessage: 'All changes are lost and the seed data is restored.', resetDone: 'Demo data restored',
      simulateHint: 'Drive every open case of a batch through the workflow (accept, assign, check in, report, approve or collect).',
      simulate: 'Simulate field work', simulateBody: 'Every open case in this batch moves forward through the real workflow.', simulated: '{n} cases moved forward',
      guide: 'Test scenarios',
      scenario: {
        1: 'Investigation: as Tamer Lotfy (Horus, Credit) create a residence request in Giza, sort by score and select. Accept as the provider admin, assign as the supervisor, check in, add 3 photos and submit as the agent, approve as the supervisor, then accept and rate as Tamer.',
        2: 'Rework: on a delivered report, request rework as the client. The supervisor sends it back to the agent, the agent resubmits. The first-time acceptance rate drops on the provider profile.',
        3: 'Offer expiry: send an offer, then advance the clock 5 hours here. The client is notified; use Auto-select best on the case.',
        4: 'Collection: as Youssef Kamel create a collection with a 20% discount authority for Recovery Partners. As Tarek Helmy log a call and a promise, advance a day, record a partial payment and request a 15% discount. Approve as Youssef, pay the rest, close as Rehab Anwar, rate as Youssef.',
        5: 'Bulk: download the sample file on Bulk upload, fix the 3 bad rows, create the batch, split by governorate (Giza to Omar Hassan, the rest to Sphinx), accept as providers, simulate field work here, accept all and close the batch with a rating.',
        6: 'Individual provider: send a Giza residence case to Omar Hassan. His report goes to the QA queue (Ziad Ezzat), not a supervisor.',
        7: 'Rating dispute: as Adel Morsy (Recovery Partners) dispute a 1-star rating. Uphold it as admin; the rating leaves the score.',
        8: 'Enforcement: raise the suspension threshold to 85 (reduce 90, warn 95) in Scoring. Recovery Partners is suspended and leaves the marketplace. Set it back to 40, 50 and 60 afterwards.',
        9: 'SLA: advance the clock on an accepted case; it turns amber at 80% and red at the deadline. Client, provider and admin are notified.',
        10: 'Arabic: switch the language in the header and repeat scenario 1. The layout mirrors right to left.'
      }
    },
    charts: { unavailable: 'Charts need an internet connection to load.' },
    notif: {
      offer_new: 'New offer: {count} case(s) waiting for your answer', offer_expiring: 'Offer for {count} case(s) expires in {minutes} minutes',
      offer_accepted: '{provider} accepted {ref}', offer_declined: '{provider} declined {ref}. Choose another provider.',
      offer_expired: 'Offer for {ref} expired. Choose another provider.', offer_expired_provider: 'An offer for {count} case(s) expired',
      case_assigned: 'You were assigned {ref}', route_assigned: 'You were assigned a route of {count} cases', report_submitted: 'Report for {ref} is waiting for review',
      report_returned: 'Report for {ref} was returned to you', report_delivered: 'Report for {ref} was delivered', rework_requested: 'The client requested rework on {ref}',
      report_accepted: 'The client accepted the report for {ref}', case_closed: '{ref} is closed', case_closed_outcome: '{ref} closed: {outcome}',
      settlement_pending: 'Settlement request on {ref} needs your decision', settlement_decided: 'Settlement on {ref}: {decision}',
      case_recalled: '{ref} was recalled by the client', case_cancelled: '{ref} was cancelled', case_reassigned: '{ref} was reassigned to {provider}',
      case_reassigned_away: '{ref} was reassigned to another provider', sla_at_risk: '{ref} is at risk of missing its SLA', sla_breached: '{ref} breached its SLA',
      sla_extended: 'SLA for {ref} extended by {hours} hours', ptp_broken: 'Promise to pay on {ref} was broken', payment_recorded: 'Payment of {amount} recorded on {ref}',
      rating_received: 'You received a {stars}-star rating', rating_flagged: 'Feedback on {ref} was reported', dispute_opened: 'Dispute {ref} was opened',
      dispute_resolved: 'Dispute {ref} resolved: {outcome}', dispute_decision_pending: 'A decision on dispute {ref} waits for your confirmation',
      dispute_decision_sent_back: 'Your proposed decision on dispute {ref} was sent back', invoice_issued: 'Invoice {ref} was issued', invoice_paid: 'Invoice {ref} was paid',
      enforcement_changed: 'Your account status changed: {level}', enforcement_admin: '{provider} status changed automatically: {level}',
      provider_verified: 'Your account is verified', batch_progress: 'Batch {ref} moved forward'
    },
    errors: {
      wrongPassword: 'Wrong email or password', signInLocked: 'Too many wrong tries. Try again in {min} minutes.',
      generic: 'Something went wrong', required: 'Required', number: 'Enter a number', min: 'Value too low', max: 'Value too high', date: 'Enter a valid date',
      nationalIdFormat: 'National ID must be 14 digits starting with 2 or 3', nationalIdDate: 'National ID has an invalid birth date',
      nationalIdGov: 'National ID has an unknown governorate code', mobileFormat: 'Mobile must be 11 digits starting with 010, 011, 012 or 015',
      unknownGovernorate: 'Unknown governorate', unknownInquiryType: 'Unknown inquiry type', unknownProduct: 'Unknown product type',
      deadlinePast: 'Must be in the future', overdueAboveOriginal: 'Overdue amount cannot exceed the original amount', fixHighlighted: 'Fix the highlighted fields',
      formInvalid: 'Some fields need attention', notSignedIn: 'Sign in first', forbidden: 'You do not have access to this', forbiddenService: 'Your role does not cover this service',
      sameApprover: 'Another person must sign this off: you approved it for Operations.', notFound: 'Not found', notEditable: 'This can no longer be edited', providerNotEligible: 'This provider is not eligible for this case',
      useDedicatedAction: 'Use the dedicated screen for this action', agentInactive: 'This agent is inactive', agentWrongService: 'This agent does not work on this service',
      checkInFirst: 'Check in at the address first', offerNotPending: 'This offer is no longer open', offerExpired: 'This offer has expired',
      providerSuspended: 'Your account is suspended', ratingRequired: 'Choose a rating from 1 to 5', criteriaRequired: 'Rate every criterion',
      ratingIncomplete: 'Rate overall and every criterion', rateAfterClose: 'You can rate once the case is closed', rateBatchInstead: 'Rate this case through its batch',
      alreadyRated: 'Already rated', disputeExists: 'A dispute is already open', disputeClosed: 'This dispute is closed', outcomeRequired: 'Choose an outcome', decisionPending: 'A decision is already waiting for confirmation',
      noDecisionPending: 'No decision is waiting for confirmation', otherTeam: 'The confirmation must come from {team}',
      reasonRequired: 'A reason is required', batchHasErrors: 'Fix or exclude rows with errors first', batchEmpty: 'No rows to create',
      nothingToAssign: 'No cases need a provider', groupWithoutProvider: 'A governorate group has no provider', fileRead: 'Could not read that file',
      fileEmpty: 'The file has no rows', xlsxMissing: 'The Excel library did not load. Check your internet connection.',
      weightsSum: 'Weights must add up to 100', thresholdOrder: 'Thresholds must be ordered: suspend < reduce < warn', capRange: 'Cap must be between 10 and 100',
      feeRange: 'Fee must be between 0 and 50', windowRange: 'Window must be between 1 and 72 hours', bandOrder: 'Band minimum must be below the maximum',
      listItemInvalid: 'Every row needs an ID and an English name', listDuplicate: 'IDs must be unique',
      priceOutOfBand: 'Price for {type} in {zone} must be between {min} and {max}', feeOutOfBand: 'Fee for {bucket} must be between {min}% and {max}%',
      fixedFeeOutOfBand: 'Fixed fee must be at most {max}', coverageRequired: 'Cover at least one governorate',
      freelancerChecks: 'Individual providers need ID verification and training before verification', documentsMissing: 'Some documents are missing',
      emailFormat: 'Enter a valid email', emailTaken: 'This email is already used', lastAdmin: 'Keep at least one admin', cannotDeactivateSelf: 'You cannot deactivate yourself',
      invoiceNotIssued: 'Only issued invoices can be paid', invoiceNotDraft: 'Only draft invoices can be issued', invoiceEmpty: 'The invoice has no lines',
      storageFull: 'Browser storage is full. Reset the demo data or remove photos.'
    },
    wf: {
      err: {
        unknownAction: 'Unknown action', wrongService: 'Wrong service for this case', invalidState: 'Not possible at this stage',
        role: 'Your role cannot do this', notOwner: 'This case is not yours', providerRequired: 'Choose a provider',
        providerDeclined: 'This provider already declined the case', sameProvider: 'Choose a different provider', reasonRequired: 'A reason is required',
        agentRequired: 'Choose an agent', checkInRequired: 'Check in at the address first', photosRequired: 'Add the minimum number of photos',
        reportIncomplete: 'Complete every report form', commentRequired: 'Add a comment for the agent', reviewerQa: 'Reports from individual providers are reviewed by platform QA',
        reviewerSupervisor: 'Company reports are reviewed by their supervisor', entityCancelAfterAccept: 'Clients can cancel only before acceptance. Recall or ask the platform.',
        settlementKind: 'Choose a settlement type', noSettlementAuthority: 'The client gave no settlement authority on this case',
        settlementKindNotAllowed: 'This settlement type is not allowed on this case', discountRequired: 'Enter a discount',
        discountAboveAuthority: 'Discount is above the authority set by the client', instalmentsRequired: 'Enter at least 2 instalments',
        outcomeRequired: 'Choose an outcome', balanceNotZero: 'Fully recovered needs a zero outstanding balance',
        partialNeedsPayment: 'Partially recovered needs a payment and a remaining balance', actionTypeRequired: 'Choose an action type',
        actionNotAllowed: 'The client did not allow this type of action', amountRequired: 'Enter an amount', promiseDatePast: 'The promised date must not be in the past',
        amountAboveOutstanding: 'Amount is above the outstanding balance', methodRequired: 'Choose a payment method',
        batchClosed: 'The batch is already closed', batchOpenCases: 'Some cases in the batch are still open', ratingRequired: 'Rate every provider in the batch'
      }
    }
  };
})();
