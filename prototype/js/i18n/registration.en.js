/* English strings for the service provider module: registration, the applicant's
   application page and the company team hierarchy. Keep in sync with registration.ar.js. */
(function () {
  window.ICM.i18n.extend('en', {
    common: { next: 'Next', edit: 'Edit', listSep: ', ' },
    portal: { applicant: 'Applications' },
    nav: { application: 'My application' },
    login: {
      registerTitle: 'New service provider?', registerBody: 'Companies and individuals can register for investigation, collection or both. The platform reviews every application before it goes live.',
      registerCta: 'Register as a provider', applicants: 'Applications in review', applicantsGroup: 'Applicants',
      applicantsHint: 'Registered, waiting for platform verification'
    },
    coverage: {
      wholeHint: 'Leave every city unticked to cover the whole governorate, or tick the cities you cover.',
      limitedHint: 'Your company covers only these cities here. Tick the ones this agent covers, or none for all of them.',
      more: '{n} more'
    },
    reg: {
      title: 'Register as a service provider', intro: 'Tell us who you are, what you do and where you work. It takes about five minutes. You can attach documents now or later.',
      haveAccount: 'Back to sign in', demoNote: 'Demo: files are not uploaded, only their names are kept. After you submit you are signed in as the applicant.',
      adminTitle: 'Register a provider', adminIntro: 'Register a company or an individual on their behalf, for example after an onboarding meeting.',
      adminDone: 'Application {ref} created. It is waiting in onboarding.', adminDoneVerified: 'Provider {ref} registered and verified.',
      stepTitle: { type: 'Provider type and services', details: 'Details', area: 'Address and coverage', submit: 'Documents and review' },
      stepOf: 'Step {n} of {total}', fixErrors: 'Some fields need attention.', submitCta: 'Submit application', registerCta: 'Register provider',
      q: { kind: 'Are you registering a company or yourself?', services: 'Which services will you provide?' },
      kind: {
        company: 'Company', individual: 'Individual',
        companyBody: 'A registered company with a tax ID and a commercial registration. The owner manages the account and builds teams of supervisors and field agents.',
        individualBody: 'You work on your own and do the field work yourself. You need a valid national ID.'
      },
      svc: {
        investigationBody: 'Field inquiries for lenders: residence, employment, business and guarantor checks with photos and a report.',
        collectionBody: 'Recovering overdue payments through calls, messages and field visits, within the terms the client sets.',
        bothHint: 'Tick both if you provide both. Each service gets its own workspace after approval.'
      },
      sec: {
        company: 'Company', owner: 'Owner', focal: 'Focal point for this service', hq: 'Head office address', address: 'Your address',
        coverage: 'Where you work', documents: 'Documents', review: 'Check your details'
      },
      f: {
        kind: 'Provider type', companyName: 'Company name', taxId: 'Tax registration number', commercialRegNo: 'Commercial registration number',
        mainPhone: 'Main phone number', companyEmail: 'Company email', ownerName: 'Owner full name', ownerPhone: 'Owner mobile',
        ownerNationalId: 'Owner national ID', ownerEmail: 'Owner email', focalName: 'Full name', focalTitle: 'Job title', focalPhone: 'Mobile',
        focalEmail: 'Email', fullName: 'Full name', nationalId: 'National ID', phone: 'Mobile', email: 'Email',
        addrStreet: 'Street and building', addrLandmark: 'Landmark'
      },
      hint: {
        taxId: '9 digits, as printed on the tax card.', commercialReg: 'As printed on the commercial register extract.',
        mainPhone: 'Landline, mobile or a 5-digit hotline.', ownerPhone: 'The owner signs in with this number and manages the account.',
        fullName: 'As written on your national ID.', phone: 'You sign in with this number.'
      },
      ownerIntro: 'The owner manages the account: prices, offers and the team of supervisors and field agents.',
      focalIntro: 'The person the platform and clients contact about day-to-day work on this service.',
      focalSame: 'The owner is the focal point', focalIsOwner: 'Same as the owner',
      pickGovFirst: 'Pick a governorate first',
      coverageIntroCompany: 'Tick every governorate your teams cover. You can narrow a governorate to specific cities. Offers are matched on these areas.',
      coverageIntroIndividual: 'Tick the governorates you can travel to. Narrow each one to the cities you cover.',
      docsIntro: 'Attach them now or later from your application page. The platform checks them before approval.',
      docsIntroAdmin: 'Attach copies if you have them. Tick "verify now" below only if you checked the originals.',
      noFile: 'No file attached', attachFile: 'Attach', replaceFile: 'Replace',
      verifyNow: 'Documents checked in person: verify now',
      verifyNowHint: 'The provider goes live straight away and gets a login. Leave unticked to put the application in the onboarding queue.',
      termsPre: 'I have read and agree to the', termsAnd: 'and the',
      detail: { address: 'Address', coverage: 'Coverage' }
    },
    application: {
      title: 'Your application',
      welcome: 'Application {ref} received. You are signed in as the applicant and can follow it here.',
      track: { submitted: 'Submitted', review: 'Operations review', signoff: 'Management sign-off', info: 'More information needed', decision: 'Approved', rejected: 'Not approved' },
      pending: 'The operations team is reviewing your application. You get a notification when it moves on or if anything is missing.',
      pendingMissing: 'The operations team is reviewing your application. {n} document(s) are still missing; attach them below to avoid delays.',
      signoff: 'Operations approved your application. Management is doing the final sign-off.',
      rejected: 'Your application was not approved.',
      rejectedFix: 'Fix what is listed above: update your details or replace documents, then send it again.',
      resend: 'Send again for review', resendBody: 'Tell the team what you changed.', resent: 'Sent again for review',
      approved: 'Your application is approved. You can now use the app as a provider.', open: 'Open the app',
      infoRequested: 'The platform needs more information', yourReply: 'Your reply', replyPlaceholder: 'Answer the question and mention any documents you attached.',
      replyRequired: 'Write a reply first', resubmit: 'Send back for review', resubmitted: 'Sent back for review',
      docsNote: 'PDF or photo. Only the file name is kept in this demo.',
      next: 'After approval', submitted: 'What you sent', submittedAt: 'Submitted',
      after: {
        c1: 'Set your prices and SLA commitments inside the platform bands.',
        c2: 'Add supervisors, then add field agents under each supervisor.',
        c3: 'Offers from banks and finance companies start arriving for your coverage areas.',
        i1: 'Set your prices and SLA commitments inside the platform bands.',
        i2: 'Offers for your coverage areas arrive in your inbox.',
        i3: 'Do the field work in the field app. Platform QA reviews your reports.'
      }
    },
    docStatus: { pending: 'Uploaded, under review', rejected: 'Missing', verified: 'Verified' },
    team: {
      subtitleOwner: 'Supervisors: {s} · Field agents: {n}', subtitleSupervisor: 'Field agents in your team: {n}',
      owner: 'Owner', supervisors: 'Supervisors', fieldAgents: 'Field agents', you: '(you)', agentsN: 'Field agents: {n}', openN: 'Open: {n}',
      addSupervisor: 'Add supervisor', addAgent: 'Add field agent', editTitle: 'Edit {name}', saved: 'Changes saved',
      supervisorAdded: '{name} added as a supervisor', agentAdded: '{name} added to the team', moved: 'Agent moved to the new supervisor',
      mobile: 'Mobile', agentServices: 'Works on', supervisorServices: 'Supervises', reportsTo: 'Reports to', noSupervisor: 'No supervisor',
      moveHint: 'Change it from the team list.', coverage: 'Coverage', agentCoverage: 'Areas this agent covers',
      agentCoverageHint: 'Only your company coverage is shown. Assignment suggests agents who cover the case area.',
      noAgents: 'No field agents yet', startHint: 'Start by adding a supervisor, then add field agents under them. Each field agent reports to one supervisor.',
      unassigned: 'Field agents without a supervisor', unassignedHint: 'Pick a supervisor for each of them.',
      deactivateSupervisorBody: 'The supervisor can no longer sign in. Move or deactivate their field agents first.'
    },
    onboarding: {
      source: { self: 'Self-registered', admin: 'Registered by platform' },
      approve: 'Approve (Operations)', approveBody: 'Documents and details are checked. The application goes to management for the final sign-off.',
      approved: 'Approved by operations. Waiting for management sign-off.',
      signoff: 'Sign off (Management)', signoffBody: 'The provider goes live in the marketplace and can use the app.', signedOff: 'Signed off. The provider is live.',
      opsApproved: 'Operations approved: {name}, {date}'
    },
    doc: {
      owner_id_front: 'Owner national ID (front)', owner_id_back: 'Owner national ID (back)',
      id_front: 'National ID (front)', id_back: 'National ID (back)', criminal_record: 'Criminal record certificate'
    },
    status: { awaiting_signoff: 'Awaiting sign-off' },
    admin: { registration: 'Registration' },
    profile: { registration: 'Registration details', registrationHint: 'Legal and contact details from registration. Contact the platform to change them.' },
    errors: {
      phoneFormat: 'Enter a mobile, a landline with area code or a 5-digit hotline', taxIdFormat: 'Tax registration number must be 9 digits',
      commercialRegFormat: 'Commercial registration number must be 3 to 10 digits', underage: 'Must be at least 18 years old',
      unknownCity: 'Pick a city from the list', serviceRequired: 'Pick at least one service', fullNameShort: 'Enter the full name as on the national ID',
      termsRequired: 'Accept the terms to continue', supervisorRequired: 'Pick the supervisor this agent reports to',
      taxIdTaken: 'A provider with this tax registration number is already registered', commercialRegTaken: 'A provider with this commercial registration is already registered',
      phoneTaken: 'This mobile number is already registered', nationalIdTaken: 'This national ID is already registered',
      documentLocked: 'This document is already verified', notAwaitingInfo: 'The platform has not asked for more information',
      outsideCompanyCoverage: 'Agents can only cover areas your company covers', agentHasOpenCases: 'This agent still has {n} open case(s). Reassign them first.',
      supervisorHasAgents: 'Move or deactivate this supervisor\'s active field agents first', notYourAgent: 'This field agent reports to another supervisor',
      notInReview: 'This application is not under review', notAwaitingSignoff: 'Operations has to approve this application first',
      applicationLocked: 'You can change your application when the platform asks for more information or after it was not approved'
    },
    notif: {
      application_new: 'New provider application: {name}', application_updated: '{name} updated their application',
      application_rejected: 'Your application was not approved', application_info_requested: 'The platform needs more information about your application',
      application_signoff: '{name} is ready for management sign-off', application_ops_approved: 'Operations approved your application. It is with management for the final sign-off.',
      agent_joined_team: '{name} joined your team'
    },
    audit: {
      action: {
        provider_registered: 'Provider registered', provider_registered_by_admin: 'Provider registered by admin', provider_resubmitted: 'Application resubmitted',
        provider_ops_approved: 'Approved by operations', provider_application_updated: 'Application details changed',
        team_supervisor_added: 'Supervisor added', team_agent_added: 'Field agent added', team_member_updated: 'Team member updated',
        team_agent_moved: 'Agent moved to another supervisor', team_supervisor_activated: 'Supervisor activated', team_supervisor_deactivated: 'Supervisor deactivated'
      }
    }
  });
})();
