/* Mock services: service provider registration (self sign-up from the app and admin
   registration from the panel), the applicant's view of their application, and the
   company team hierarchy (owner -> supervisors -> field agents). */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain, C = ICM.config;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;

  function govIds() { return E.db().config.lists.governorates.map(function (g) { return g.id; }); }
  function cityName(gov, city) { var x = C.cityLabel(gov, city); return x ? x.en : city; }

  /** Raise the first validation error with the field it belongs to, so the form can point at it. */
  function check(errors) {
    var keys = Object.keys(errors);
    if (keys.length) throw new Err(errors[keys[0]], { field: keys[0], errors: errors });
  }

  function taken(field, key) { throw new Err(key, { field: field }); }

  /** Phone numbers and national IDs identify people across the whole platform. */
  function assertUnique(v, except) {
    var db = E.db();
    except = except || {};
    var others = db.providers.filter(function (p) { return p.id !== except.providerId && p.verification.status !== 'rejected'; });
    if (v.kind === 'company') {
      if (others.some(function (p) { return p.legal && p.legal.taxId === v.taxId; })) taken('taxId', 'errors.taxIdTaken');
      if (others.some(function (p) { return p.legal && p.legal.commercialRegNo === v.commercialRegNo; })) taken('commercialRegNo', 'errors.commercialRegTaken');
      if (phoneUsed(v.ownerPhone, except.userId)) taken('ownerPhone', 'errors.phoneTaken');
    } else {
      if (others.some(function (p) { return p.nationalId === v.nationalId; }) ||
        E.db().agents.some(function (a) { return a.id !== except.agentId && a.nationalId === v.nationalId; })) taken('nationalId', 'errors.nationalIdTaken');
      if (phoneUsed(v.phone, except.userId)) taken('phone', 'errors.phoneTaken');
    }
  }
  function phoneUsed(phone, exceptUserId) {
    return E.db().users.some(function (u) { return u.id !== exceptUserId && u.phone === phone && u.active !== false; });
  }
  function nationalIdUsed(nid, exceptAgentId) {
    var db = E.db();
    return db.providers.some(function (p) { return p.nationalId === nid && p.verification.status !== 'rejected'; }) ||
      db.agents.some(function (a) { return a.id !== exceptAgentId && a.nationalId === nid; });
  }

  /** Starting prices at the middle of each platform band. The provider tunes them after approval. */
  function defaultPricing(services) {
    var cfg = E.db().config.pricing, out = {};
    var mid = function (b) { return (b.min + b.max) / 2; };
    if (services.indexOf('investigation') >= 0) {
      out.investigation = {};
      Object.keys(cfg.investigationBands).forEach(function (tp) {
        out.investigation[tp] = {};
        C.ZONES.forEach(function (z) { out.investigation[tp][z.id] = Math.round(mid(cfg.investigationBands[tp]) * (cfg.zoneMultiplier[z.id] || 1) / 10) * 10; });
      });
    }
    if (services.indexOf('collection') >= 0) {
      out.collection = { feePct: {}, fixedFee: 0 };
      Object.keys(cfg.collectionFeeBands).forEach(function (b) { out.collection.feePct[b] = Math.round(mid(cfg.collectionFeeBands[b]) * 2) / 2; });
    }
    return out;
  }
  function defaultSla(services) {
    var sla = { investigation: null, collectionFirstContactHours: null };
    if (services.indexOf('investigation') >= 0) {
      sla.investigation = {};
      E.db().config.lists.inquiryTypes.forEach(function (tp) { sla.investigation[tp.id] = tp.defaultSlaHours; });
    }
    if (services.indexOf('collection') >= 0) sla.collectionFirstContactHours = 24;
    return sla;
  }

  function cleanCoverage(cov) {
    var out = {};
    Object.keys(cov || {}).forEach(function (g) { out[g] = U.uniq((cov[g] || []).slice()); });
    return out;
  }

  /** An agent never covers more than the company: where the company lists cities, so does the agent. */
  function withinCompany(cov, p) {
    var limit = p.coverageCities || {};
    Object.keys(cov).forEach(function (g) {
      var allowed = limit[g] || [];
      if (!allowed.length) return;
      var mine = cov[g].filter(function (c) { return allowed.indexOf(c) >= 0; });
      cov[g] = mine.length ? mine : allowed.slice();
    });
    return cov;
  }

  /** A document value from the form: a file name, or { name, url } when the app sends the image. */
  function docFile(x) {
    if (!x) return null;
    if (typeof x === 'string') return { name: x, url: null };
    return x.name || x.url ? { name: x.name || null, url: x.url || null, expiresAt: x.expiresAt || null } : null;
  }

  /**
   * Copy registration values onto the provider record, its login and (for an individual) its
   * field agent record. Used when the application is created and when the applicant edits it.
   */
  function fillDetails(p, v, user, agent) {
    var company = v.kind === 'company';
    var services = C.SERVICES.filter(function (s) { return v.services.indexOf(s) >= 0; });
    var coverage = cleanCoverage(v.coverage);
    var govs = Object.keys(coverage);
    var cap = {};
    govs.forEach(function (g) { cap[g] = (p.capacity || {})[g] || (company ? 10 : 5); });
    var sameServices = p.services && p.services.join() === services.join();
    Object.assign(p, {
      name: company ? v.companyName : v.fullName, city: cityName(v.addrGov, v.addrCity), services: services,
      governorates: govs, capacity: cap, coverageCities: coverage,
      pricing: sameServices && p.pricing ? p.pricing : defaultPricing(services), sla: sameServices && p.sla ? p.sla : defaultSla(services),
      phone: company ? v.mainPhone : v.phone, email: (company ? v.companyEmail : v.email) || null,
      address: { governorate: v.addrGov, city: v.addrCity, street: v.addrStreet, landmark: v.addrLandmark || '' }
    });
    if (company) {
      p.legal = { taxId: v.taxId, commercialRegNo: v.commercialRegNo };
      p.owner = { name: v.ownerName, nationalId: v.ownerNationalId || null, phone: v.ownerPhone, email: v.ownerEmail || null };
      p.focalPoint = { name: v.focalName, title: v.focalTitle || '', phone: v.focalPhone, email: v.focalEmail || null, sameAsOwner: !!v.focalSame };
      p.contactName = v.focalName;
      Object.assign(user, { name: v.ownerName, phone: v.ownerPhone, email: v.ownerEmail || null, nationalId: v.ownerNationalId || null });
    } else {
      p.nationalId = v.nationalId;
      p.contactName = v.fullName;
      Object.assign(user, { name: v.fullName, phone: v.phone, email: v.email || null, nationalId: v.nationalId });
      if (agent) Object.assign(agent, { name: v.fullName, governorates: govs.slice(), coverageCities: U.clone(coverage), services: services.slice(), nationalId: v.nationalId, phone: v.phone });
    }
  }

  /** The registration values a provider was created with, for the edit form. */
  function valuesOf(p) {
    var company = p.kind === 'company';
    var a = p.address || {};
    var v = {
      kind: company ? 'company' : 'individual', services: p.services.slice(), coverage: U.clone(p.coverageCities || {}),
      addrGov: a.governorate || '', addrCity: a.city || '', addrStreet: a.street || '', addrLandmark: a.landmark || ''
    };
    if (company) {
      Object.assign(v, {
        companyName: p.name, taxId: p.legal.taxId, commercialRegNo: p.legal.commercialRegNo, mainPhone: p.phone, companyEmail: p.email || '',
        ownerName: p.owner.name, ownerPhone: p.owner.phone, ownerNationalId: p.owner.nationalId || '', ownerEmail: p.owner.email || '',
        focalSame: !!p.focalPoint.sameAsOwner, focalName: p.focalPoint.name, focalTitle: p.focalPoint.title || '', focalPhone: p.focalPoint.phone, focalEmail: p.focalPoint.email || ''
      });
    } else {
      Object.assign(v, { fullName: p.name, nationalId: p.nationalId, phone: p.phone, email: p.email || '' });
    }
    return v;
  }

  /** Create the provider, its owner login (and, for an individual, its field agent record). */
  function createApplication(raw, source, actor) {
    var db = E.db(), now = E.now();
    var v = wf.normalizeRegistration(raw);
    check(wf.validateRegistration(v, { governorates: govIds(), now: now, requireTerms: source === 'self' }));
    assertUnique(v);
    var company = v.kind === 'company';
    var pid = U.uid('prv');
    var docTypes = wf.registrationDocs(company ? 'company' : 'individual');
    var p = {
      id: pid, kind: company ? 'company' : 'freelancer',
      verification: {
        status: 'pending', submittedAt: now, notes: [],
        documents: docTypes.map(function (tp) {
          var f = docFile(v.docs[tp]);
          return { type: tp, status: f ? 'uploaded' : 'missing', fileName: f ? f.name : null, url: f ? f.url : null, expiresAt: f && wf.isExpiringDoc(tp) ? f.expiresAt : null, uploadedAt: f ? now : null };
        }),
        idVerified: company ? null : false, certified: company ? null : false
      },
      history: {}, enforcement: { level: 'none', source: 'auto', since: now }, joinedAt: now, description: '',
      registration: { ref: D.nextRef(db, 'registration'), source: source, at: now, byUserId: actor ? actor.userId : null, byName: actor ? actor.name : null }
    };
    var user, agent = null;
    if (company) {
      user = { id: U.uid('u'), role: 'provider_admin', owner: true, providerId: pid, active: true, createdAt: now };
    } else {
      var agentId = U.uid('ag');
      user = { id: U.uid('u'), role: 'freelancer', providerId: pid, agentId: agentId, active: true, createdAt: now };
      agent = { id: agentId, providerId: pid, userId: user.id, active: true };
      db.agents.push(agent);
    }
    fillDetails(p, v, user, agent);
    db.users.push(user);
    db.providers.push(p);
    var by = actor || D.actorOf(user);
    E.audit(source === 'self' ? 'provider.registered' : 'provider.registered_by_admin', 'provider', p.id, p.name, null, { kind: p.kind, services: p.services, ref: p.registration.ref }, null, by);
    E.notify(E.admins().filter(function (u) { return !actor || u.id !== actor.userId; }), 'notif.application_new', { name: p.name }, 'admin:onboarding');
    return { provider: p, user: user };
  }

  function myApplicationProvider() {
    var a = E.actor();
    var p = a.providerId ? E.providerById(a.providerId) : null;
    if (!p) throw new Err('errors.forbidden');
    return { a: a, p: p };
  }

  S.registration = {
    /** Self sign-up from the app. Signs the new owner in so they can follow the application. */
    submit: function (values) {
      return E.mutate(function () {
        var r = createApplication(values, 'self', null);
        E.setSession(r.user.id);
        return { ref: r.provider.registration.ref, providerId: r.provider.id, userId: r.user.id };
      });
    },
    /** Admin registration from the panel. verifyNow: documents were checked in person. */
    adminRegister: function (values, opts) {
      return E.mutate(function (db) {
        var a = E.requireRole(['platform_admin']);
        var r = createApplication(values, 'admin', a);
        var p = r.provider;
        if (opts && opts.verifyNow) {
          p.verification.documents.forEach(function (d) { d.status = 'verified'; });
          if (p.kind === 'freelancer') { p.verification.idVerified = true; p.verification.certified = true; }
          p.verification.status = 'verified';
          p.verification.verifiedAt = E.now();
          p.verification.opsApproval = { by: a.name, at: E.now(), inPerson: true };
          p.verification.signoff = { by: a.name, at: E.now(), inPerson: true };
          E.audit('provider.verify', 'provider', p.id, p.name, { status: 'pending' }, { status: 'verified' }, null, a);
          E.notify(D.providerUsers(db, p.id), 'notif.provider_verified', {}, 'provider:dashboard');
        }
        return { ref: p.registration.ref, providerId: p.id, userId: r.user.id, status: p.verification.status };
      });
    },
    /**
     * The applicant's own application: status, what they sent, notes from the platform,
     * plus the stage on the review track, the values for the edit form and what they may do.
     */
    mine: function () {
      return E.run(function () {
        var x = myApplicationProvider(), st = x.p.verification.status;
        var owner = ['provider_admin', 'freelancer'].indexOf(x.a.role) >= 0;
        return Object.assign({}, x.p, {
          me: x.a, values: valuesOf(x.p), stage: wf.applicationStage(st),
          canEdit: owner && wf.applicationEditable(st), canUpload: owner && st !== 'verified'
        });
      });
    },
    /** Attach or replace a document. url: the image itself when the app sends it (a data URL). */
    uploadDocument: function (type, fileName, url, expiresAt) {
      return E.mutate(function () {
        var x = myApplicationProvider();
        if (['provider_admin', 'freelancer'].indexOf(x.a.role) < 0) throw new Err('errors.forbidden');
        if (x.p.verification.status === 'verified') throw new Err('errors.documentLocked');
        var d = x.p.verification.documents.filter(function (k) { return k.type === type; })[0];
        if (!d) throw new Err('errors.notFound');
        if (d.status === 'verified') throw new Err('errors.documentLocked');
        if (expiresAt && wf.isExpiringDoc(type)) { var ee = wf.validateExpiry(expiresAt, E.now()); if (ee) throw new Err(ee, { field: 'expiresAt' }); d.expiresAt = expiresAt; }
        d.status = 'uploaded'; d.fileName = fileName || d.fileName || null; d.url = url || null; d.uploadedAt = E.now();
        E.audit('provider.document_uploaded', 'provider', x.p.id, x.p.name, null, { type: type }, null, x.a);
        return x.p;
      });
    },
    /**
     * Change the application's details after the platform asked for more information or did
     * not approve it. The provider type cannot change; register again for that.
     */
    update: function (values) {
      return E.mutate(function () {
        var x = myApplicationProvider(), p = x.p;
        if (['provider_admin', 'freelancer'].indexOf(x.a.role) < 0) throw new Err('errors.forbidden');
        if (!wf.applicationEditable(p.verification.status)) throw new Err('errors.applicationLocked');
        var v = wf.normalizeRegistration(Object.assign({}, values, { kind: p.kind === 'company' ? 'company' : 'individual' }));
        check(wf.validateRegistration(v, { governorates: govIds(), now: E.now() }));
        var user = E.userById(x.a.userId);
        var agent = p.kind === 'freelancer' ? E.db().agents.filter(function (a) { return a.providerId === p.id; })[0] : null;
        assertUnique(v, { providerId: p.id, userId: user.id, agentId: agent ? agent.id : null });
        var before = { name: p.name, services: p.services.slice(), governorates: p.governorates.slice() };
        fillDetails(p, v, user, agent);
        E.audit('provider.application_updated', 'provider', p.id, p.name, before, { name: p.name, services: p.services, governorates: p.governorates }, null, x.a);
        return p;
      });
    },
    /**
     * Send the application back to Operations: an answer to a request for information, or a
     * fixed application after a rejection. Any earlier Operations approval no longer counts.
     */
    resubmit: function (note) {
      return E.mutate(function () {
        var x = myApplicationProvider(), ver = x.p.verification, before = ver.status;
        if (!wf.applicationEditable(before)) throw new Err('errors.notAwaitingInfo');
        if (!note || !String(note).trim()) throw new Err('wf.err.reasonRequired');
        ver.status = 'pending';
        ver.opsApproval = null;
        ver.submittedAt = E.now();
        ver.notes.push({ at: E.now(), by: x.a.name, text: String(note).trim(), kind: 'resubmitted' });
        E.audit('provider.resubmitted', 'provider', x.p.id, x.p.name, { status: before }, { status: 'pending' }, note, x.a);
        E.notify(E.admins(), 'notif.application_updated', { name: x.p.name }, 'admin:onboarding');
        return x.p;
      });
    }
  };

  // ================================================================ team hierarchy
  function companyManager(allowSupervisor) {
    var a = E.actor();
    var roles = allowSupervisor ? ['provider_admin', 'provider_supervisor'] : ['provider_admin'];
    if (roles.indexOf(a.role) < 0) throw new Err('errors.forbidden');
    var p = E.providerById(a.providerId);
    if (!p || p.kind !== 'company') throw new Err('errors.forbidden');
    return { a: a, p: p };
  }

  function supervisorsOf(pid) {
    return E.db().users.filter(function (u) { return u.providerId === pid && u.role === 'provider_supervisor'; });
  }

  function memberFields(v) {
    return {
      name: String(v.name || '').trim(), phone: String(v.phone || '').replace(/[\s\-]/g, ''), email: v.email ? String(v.email).trim() : null,
      nationalId: v.nationalId ? String(v.nationalId).replace(/[\s\-]/g, '') : null, services: (v.services || []).slice()
    };
  }

  S.team = {
    /**
     * The company's hierarchy. Owners see everyone; a supervisor sees themselves and their agents.
     * service: optional, adds that service's performance stats to each agent.
     */
    structure: function () {
      return E.run(function () {
        var x = companyManager(true), a = x.a, p = x.p, db = E.db();
        var agents = db.agents.filter(function (ag) { return ag.providerId === p.id; }).map(function (ag) {
          var u = E.userById(ag.userId);
          return Object.assign({}, ag, { email: u ? u.email : null, stats: S.providers._agentStats(ag) });
        });
        var sups = supervisorsOf(p.id).filter(function (u) { return a.role === 'provider_admin' || u.id === a.userId; }).map(function (u) {
          var mine = agents.filter(function (ag) { return ag.supervisorId === u.id; });
          return Object.assign({}, u, { agents: mine, activeAgents: mine.filter(function (ag) { return ag.active; }).length });
        });
        var supIds = supervisorsOf(p.id).map(function (u) { return u.id; });
        return {
          provider: { id: p.id, name: p.name, services: p.services, governorates: p.governorates, coverageCities: p.coverageCities || {} },
          owners: db.users.filter(function (u) { return u.providerId === p.id && u.role === 'provider_admin'; }),
          supervisors: sups,
          unassigned: agents.filter(function (ag) { return !ag.supervisorId || supIds.indexOf(ag.supervisorId) < 0; }),
          canManage: a.role === 'provider_admin',
          me: a
        };
      });
    },
    addSupervisor: function (v) {
      return E.mutate(function (db) {
        var x = companyManager(false);
        var m = memberFields(v);
        check(wf.validateTeamMember('provider_supervisor', m, { services: x.p.services }));
        if (phoneUsed(m.phone)) taken('phone', 'errors.phoneTaken');
        var u = { id: U.uid('u'), name: m.name, role: 'provider_supervisor', providerId: x.p.id, active: true, phone: m.phone, email: m.email, nationalId: m.nationalId, services: m.services, createdAt: E.now() };
        db.users.push(u);
        E.audit('team.supervisor_added', 'user', u.id, u.name, null, { services: m.services }, null, x.a);
        return u;
      });
    },
    addAgent: function (v) {
      return E.mutate(function (db) {
        var x = companyManager(true);
        var m = memberFields(v);
        m.coverage = withinCompany(cleanCoverage(v.coverage), x.p);
        m.supervisorId = x.a.role === 'provider_supervisor' ? x.a.userId : v.supervisorId;
        var sups = supervisorsOf(x.p.id).filter(function (u) { return u.active !== false; }).map(function (u) { return u.id; });
        check(wf.validateTeamMember('agent', m, { services: x.p.services, supervisors: sups, governorates: govIds(), now: E.now() }));
        var outside = Object.keys(m.coverage).filter(function (g) { return x.p.governorates.indexOf(g) < 0; });
        if (outside.length) throw new Err('errors.outsideCompanyCoverage', { field: 'coverage' });
        if (phoneUsed(m.phone)) taken('phone', 'errors.phoneTaken');
        if (nationalIdUsed(m.nationalId)) taken('nationalId', 'errors.nationalIdTaken');
        var agentId = U.uid('ag');
        var u = { id: U.uid('u'), name: m.name, role: 'agent', providerId: x.p.id, agentId: agentId, active: true, phone: m.phone, email: m.email, nationalId: m.nationalId, createdAt: E.now() };
        db.users.push(u);
        var ag = { id: agentId, providerId: x.p.id, userId: u.id, name: m.name, governorates: Object.keys(m.coverage), coverageCities: m.coverage, services: m.services, active: true, nationalId: m.nationalId, phone: m.phone, supervisorId: m.supervisorId };
        db.agents.push(ag);
        E.audit('team.agent_added', 'agent', ag.id, ag.name, null, { supervisorId: ag.supervisorId, governorates: ag.governorates }, null, x.a);
        E.notify(D.providerUsers(db, x.p.id).filter(function (k) { return k.id === m.supervisorId && k.id !== x.a.userId; }), 'notif.agent_joined_team', { name: ag.name }, 'provider:team');
        return ag;
      });
    },
    /** Edit a supervisor (by user id) or an agent (by agent id). */
    updateMember: function (id, v) {
      return E.mutate(function () {
        var x = companyManager(true), a = x.a;
        var ag = E.agentById(id);
        var m = memberFields(v);
        if (ag) {
          if (ag.providerId !== x.p.id || !D.agentInScope(a, ag)) throw new Err('errors.notYourAgent');
          m.coverage = withinCompany(cleanCoverage(v.coverage), x.p);
          m.supervisorId = ag.supervisorId || (a.role === 'provider_supervisor' ? a.userId : null);
          var sups = supervisorsOf(x.p.id).map(function (u) { return u.id; });
          var errs = wf.validateTeamMember('agent', m, { services: x.p.services, supervisors: sups, governorates: govIds(), now: E.now() });
          if (!ag.supervisorId) delete errs.supervisorId;
          check(errs);
          if (Object.keys(m.coverage).some(function (g) { return x.p.governorates.indexOf(g) < 0; })) throw new Err('errors.outsideCompanyCoverage', { field: 'coverage' });
          if (phoneUsed(m.phone, ag.userId)) taken('phone', 'errors.phoneTaken');
          if (nationalIdUsed(m.nationalId, ag.id)) taken('nationalId', 'errors.nationalIdTaken');
          var before = { governorates: ag.governorates.slice(), services: ag.services.slice() };
          Object.assign(ag, { name: m.name, phone: m.phone, nationalId: m.nationalId, services: m.services, governorates: Object.keys(m.coverage), coverageCities: m.coverage });
          var au = E.userById(ag.userId);
          if (au) Object.assign(au, { name: m.name, phone: m.phone, email: m.email, nationalId: m.nationalId });
          E.audit('team.member_updated', 'agent', ag.id, ag.name, before, { governorates: ag.governorates, services: ag.services }, null, a);
          return ag;
        }
        var u = E.userById(id);
        if (!u || u.providerId !== x.p.id || u.role !== 'provider_supervisor') throw new Err('errors.notFound');
        if (a.role !== 'provider_admin' && u.id !== a.userId) throw new Err('errors.forbidden');
        check(wf.validateTeamMember('provider_supervisor', m, { services: x.p.services }));
        if (phoneUsed(m.phone, u.id)) taken('phone', 'errors.phoneTaken');
        Object.assign(u, { name: m.name, phone: m.phone, email: m.email, nationalId: m.nationalId, services: m.services });
        E.audit('team.member_updated', 'user', u.id, u.name, null, { services: u.services }, null, a);
        return u;
      });
    },
    /** Move a field agent under another supervisor. Owner only. */
    moveAgent: function (agentId, supervisorId) {
      return E.mutate(function (db) {
        var x = companyManager(false);
        var ag = E.agentById(agentId);
        if (!ag || ag.providerId !== x.p.id) throw new Err('errors.notFound');
        var sup = E.userById(supervisorId);
        if (!sup || sup.providerId !== x.p.id || sup.role !== 'provider_supervisor' || sup.active === false) throw new Err('errors.supervisorRequired');
        var before = ag.supervisorId || null;
        if (before === sup.id) return ag;
        ag.supervisorId = sup.id;
        E.audit('team.agent_moved', 'agent', ag.id, ag.name, { supervisorId: before }, { supervisorId: sup.id }, null, x.a);
        E.notify([sup], 'notif.agent_joined_team', { name: ag.name }, 'provider:team');
        return ag;
      });
    },
    /** Activate or deactivate a supervisor (user id) or a field agent (agent id). */
    setActive: function (id, active) {
      return E.mutate(function (db) {
        var x = companyManager(true), a = x.a;
        var ag = E.agentById(id);
        if (ag) {
          if (ag.providerId !== x.p.id || !D.agentInScope(a, ag)) throw new Err('errors.notYourAgent');
          if (!active && D.agentLoad(db, ag.id) > 0) throw new Err('errors.agentHasOpenCases', { n: D.agentLoad(db, ag.id) });
          ag.active = !!active;
          var au = E.userById(ag.userId);
          if (au) au.active = !!active;
          E.audit('provider.agent_' + (active ? 'activated' : 'deactivated'), 'agent', ag.id, ag.name, null, null, null, a);
          return ag;
        }
        if (a.role !== 'provider_admin') throw new Err('errors.forbidden');
        var u = E.userById(id);
        if (!u || u.providerId !== x.p.id || u.role !== 'provider_supervisor') throw new Err('errors.notFound');
        if (!active && db.agents.some(function (k) { return k.supervisorId === u.id && k.active; })) throw new Err('errors.supervisorHasAgents');
        u.active = !!active;
        E.audit('team.supervisor_' + (active ? 'activated' : 'deactivated'), 'user', u.id, u.name, null, null, null, a);
        return u;
      });
    },
    /** Read-only hierarchy for the platform admin's provider page. */
    ofProvider: function (providerId) {
      return E.run(function () {
        E.requireRole(['platform_admin']);
        var db = E.db();
        var agents = db.agents.filter(function (ag) { return ag.providerId === providerId; });
        var sups = supervisorsOf(providerId);
        return {
          owners: db.users.filter(function (u) { return u.providerId === providerId && u.role === 'provider_admin'; }),
          supervisors: sups.map(function (u) { return Object.assign({}, u, { agents: agents.filter(function (ag) { return ag.supervisorId === u.id; }) }); }),
          unassigned: agents.filter(function (ag) { return !sups.some(function (u) { return u.id === ag.supervisorId; }); })
        };
      });
    }
  };
})();
