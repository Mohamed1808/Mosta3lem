/* Service contracts. Pages only ever call ICM.services.<service>.<method>(), and every
   method returns a Promise. The mock implementation in this folder satisfies these
   contracts against the local store; a Supabase implementation must provide the same
   names and shapes. ICM.services.verify() checks an implementation at startup.

   Errors reject with { key, params } where key is an i18n key. */
(function () {
  var ICM = (window.ICM = window.ICM || {});

  ICM.contracts = {
    auth: {
      listDemoUsers: '() -> User[] with orgName, portal',
      currentUser: '() -> SessionUser | null  (user + entity/provider/agent summary)',
      loginAs: '(userId) -> SessionUser',
      logout: '() -> void'
    },
    config: {
      get: '() -> PlatformConfig { scoring, pricing, lists }',
      updateScoring: '(patch) -> PlatformConfig   (admin; recalculates every score)',
      updatePricing: '(patch) -> PlatformConfig   (admin)',
      updateList: '(listName, items) -> PlatformConfig   (admin)'
    },
    demo: {
      clock: '() -> { now, offsetMs }',
      advance: '(ms) -> TickSummary   (admin)',
      resetClock: '() -> TickSummary   (admin)',
      reset: '() -> void   (restores the seed)',
      simulateBatchWork: '(batchId) -> { advanced }   (admin; drives open batch cases through the workflow)'
    },
    cases: {
      list: '(filters) -> CaseRow[]   (masked for provider users)',
      get: '(caseId) -> CaseDetail { case, actions, provider, agent, entity, batch, offer, disputes, rating }',
      createDraft: '(service, values) -> Case',
      updateDraft: '(caseId, values) -> Case',
      sendOffer: '(caseId, providerId) -> Case',
      transition: '(caseId, action, payload) -> Case',
      assign: '(caseIds[], agentId) -> Case[]',
      checkIn: '(caseId) -> Case',
      addPhoto: '(caseId, dataUrl) -> Case',
      removePhoto: '(caseId, photoId) -> Case',
      saveReport: '(caseId, inquiryType, values) -> Case',
      simulateFieldVisit: '(caseId) -> CheckIn',
      logAction: '(caseId, values) -> Case',
      addPromise: '(caseId, values) -> Case',
      addPayment: '(caseId, values) -> Case',
      requestSettlement: '(caseId, values) -> Case',
      closeCollection: '(caseId, values) -> Case',
      forceReassign: '(caseId, providerId, reason) -> Case   (admin)',
      extendSla: '(caseId, hours, reason) -> Case   (admin)',
      reviewQueue: '() -> CaseRow[]   (supervisor or platform QA)',
      agentTasks: '() -> CaseRow[]   (field agent)'
    },
    marketplace: {
      eligible: '({ service, demand: {gov: count}, inquiryTypes, bucket, caseId }) -> ProviderCard[]',
      profile: '(providerId, service) -> ProviderProfile (anonymised feedback)'
    },
    offers: {
      inbox: '(service) -> Offer[] with masked cases',
      accept: '(offerId) -> Offer',
      decline: '(offerId, reason, note) -> Offer'
    },
    providers: {
      mine: '() -> Provider with score',
      updateProfile: '(patch) -> Provider',
      team: '(service) -> Agent[] with load and performance',
      setAgentActive: '(agentId, active) -> Agent',
      list: '() -> Provider[]   (admin)',
      get: '(providerId) -> Provider   (admin)',
      applications: '() -> Provider[]   (admin)',
      verify: '(providerId) -> Provider',
      reject: '(providerId, reason) -> Provider',
      requestInfo: '(providerId, note) -> Provider',
      setCheck: '(providerId, field, value) -> Provider',
      enforce: '(providerId, level, reason) -> Provider',
      setAutomatic: '(providerId) -> Provider'
    },
    registration: {
      submit: '(values) -> { ref, providerId, userId }   (public self sign-up; signs the owner in)',
      adminRegister: '(values, { verifyNow }) -> { ref, providerId, userId, status }   (admin)',
      mine: '() -> Provider application   (applicant)',
      uploadDocument: '(type, fileName) -> Provider   (applicant)',
      resubmit: '(note) -> Provider   (applicant, after a request for information)'
    },
    team: {
      structure: '() -> { owners, supervisors[{ agents }], unassigned, canManage }   (owner: all, supervisor: own team)',
      addSupervisor: '(values) -> User   (owner)',
      addAgent: '(values) -> Agent   (owner, or supervisor for own team)',
      updateMember: '(agentId | supervisorUserId, values) -> Agent | User',
      moveAgent: '(agentId, supervisorUserId) -> Agent   (owner)',
      setActive: '(agentId | supervisorUserId, active) -> Agent | User',
      ofProvider: '(providerId) -> hierarchy   (admin, read only)'
    },
    entities: {
      list: '() -> Entity[] with volume, spend and data-quality rating   (admin)',
      mine: '() -> Entity',
      users: '(entityId?) -> User[]',
      invite: '(values) -> User',
      setRole: '(userId, role) -> User',
      setActive: '(userId, active) -> User',
      publicProfile: '(entityId) -> { name, type, clientRating }'
    },
    batches: {
      parseFile: '(file, service) -> { rows }',
      validateRows: '(service, rows) -> rows with errors',
      downloadTemplate: '(service) -> void',
      create: '(service, name, rows) -> Batch',
      plan: '(batchId) -> { groups, wholeBatchProviders }',
      assign: '(batchId, mode, assignments) -> Batch',
      list: '() -> BatchRow[]',
      get: '(batchId) -> BatchDetail',
      acceptAllDelivered: '(batchId) -> { accepted }',
      close: '(batchId, ratings[], caseFlags[]) -> Batch'
    },
    ratings: {
      pending: '() -> { cases, batches }   (entity)',
      given: '() -> Rating[]   (entity)',
      rateCase: '(caseId, values) -> Rating',
      received: '(service) -> Rating[]   (provider)',
      reply: '(ratingId, text) -> Rating',
      flag: '(ratingId, reason) -> Rating',
      moderation: '() -> Rating[]   (admin)',
      setHidden: '(ratingId, hidden) -> Rating',
      dismissFlag: '(ratingId) -> Rating',
      clientPending: '() -> Case[]   (provider)',
      rateClient: '(values) -> ClientRating',
      clientRatings: '(entityId?) -> ClientRating[]'
    },
    disputes: {
      list: '() -> Dispute[]',
      get: '(disputeId) -> DisputeDetail',
      open: '(values) -> Dispute',
      respond: '(disputeId, text) -> Dispute',
      resolve: '(disputeId, outcome, note) -> Dispute   (admin)'
    },
    billing: {
      invoices: '() -> Invoice[]',
      markPaid: '(invoiceId) -> Invoice',
      issue: '(invoiceId) -> Invoice   (admin)',
      earnings: '(service?) -> EarningsSummary   (provider)'
    },
    notifications: {
      list: '() -> Notification[] with href',
      unreadCount: '() -> number',
      markRead: '(id) -> void',
      markAllRead: '() -> void'
    },
    audit: { list: '(filters) -> AuditEntry[]   (admin)' },
    analytics: {
      entityDashboard: '() -> EntityKpis',
      entityReports: '() -> ProviderComparison',
      providerDashboard: '(service) -> ProviderKpis',
      portfolioReport: '() -> BatchPortfolio[]',
      adminOverview: '() -> PlatformKpis',
      agentPerformance: '() -> AgentKpis',
      navCounts: '(service?) -> badge counts for the current user navigation'
    }
  };
})();
