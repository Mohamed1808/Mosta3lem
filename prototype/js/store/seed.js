/* Demo seed. Egypt-based and entirely fictional: every company, person, national ID and
   phone number here is invented. Cases are built by replaying real workflow transitions
   through the state machines, so every timeline, offer and SLA field is consistent.
   All times are relative to the moment of the reset (T). */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var U = ICM.util, wf = ICM.wf, C = ICM.config;
  var H = U.HOUR, DAY = U.DAY;

  // ---------------------------------------------------------------- reference data
  var MALE = ['Ahmed', 'Mohamed', 'Mahmoud', 'Mostafa', 'Omar', 'Youssef', 'Khaled', 'Tarek', 'Hassan', 'Ibrahim', 'Amr', 'Karim', 'Sherif', 'Hany', 'Walid', 'Ayman', 'Ashraf', 'Hossam', 'Islam', 'Mina', 'Bishoy', 'Ramy', 'Adham', 'Ziad'];
  var FEMALE = ['Mona', 'Nour', 'Salma', 'Heba', 'Dina', 'Rania', 'Aya', 'Yasmin', 'Mariam', 'Nadia', 'Eman', 'Reem', 'Shaimaa', 'Marwa', 'Sara', 'Fatma', 'Hoda', 'Nesma', 'Doaa', 'Ghada'];
  var LAST = ['Ali', 'Hassan', 'Ibrahim', 'Mahmoud', 'Abdelrahman', 'Farouk', 'Soliman', 'El Sayed', 'Mansour', 'Fathy', 'Shehata', 'Gaber', 'Nasr', 'Hegazy', 'Ramadan', 'Samir', 'Kamal', 'Zaki', 'Morsy', 'Anwar', 'Fouad', 'Lotfy', 'Wahba', 'Girgis', 'Tadros', 'Badawy', 'Sabry', 'Metwally'];
  var CITIES = {
    cairo: ['Nasr City', 'Heliopolis', 'Maadi', 'Shubra', 'Mokattam', 'New Cairo'],
    giza: ['Dokki', 'Mohandessin', 'Haram', 'Faisal', '6th of October', 'Sheikh Zayed'],
    alexandria: ['Smouha', 'Sidi Gaber', 'Miami', 'Stanley', 'Agami'],
    qalyubia: ['Banha', 'Shubra El Kheima', 'Qalyub'],
    sharqia: ['Zagazig', '10th of Ramadan', 'Belbeis'],
    dakahlia: ['Mansoura', 'Talkha', 'Mit Ghamr'],
    gharbia: ['Tanta', 'El Mahalla El Kubra'],
    monufia: ['Shebin El Kom', 'Menouf'],
    assiut: ['Assiut City', 'Dairut'],
    minya: ['Minya City', 'Mallawi'],
    sohag: ['Sohag City', 'Akhmim'],
    beheira: ['Damanhour', 'Kafr El Dawar'],
    ismailia: ['Ismailia City'], port_said: ['Port Fouad', 'El Arab'], suez: ['Suez City']
  };
  var STREETS = ['Tahrir St', '26th of July St', 'Gameat El Dowal St', 'Abbas El Akkad St', 'Makram Ebeid St', 'Port Said St', 'El Horreya Rd', 'El Geish St', 'Salah Salem St', 'El Nasr Rd', 'Corniche St', 'Saad Zaghloul St', 'El Galaa St', 'Mostafa El Nahas St'];
  var LANDMARKS = ['Next to the pharmacy', 'Opposite the mosque', 'Behind the primary school', 'Above the bakery', 'Near the metro station', 'Beside the post office', 'Across from the petrol station'];
  var EMPLOYERS = ['Nile Textiles Co.', 'Delta Foods Industries', 'Pyramids Logistics', 'Cairo Ceramics Factory', 'Misr Pharma Distribution', 'Red Sea Tourism Group', 'Giza Engineering Office', 'Al Nour Hospital'];
  var BUSINESSES = ['Hassan Mobile Shop', 'El Sayed Grocery', 'Farouk Auto Parts', 'Nour Beauty Salon', 'Delta Print House', 'Samir Furniture Workshop', 'Kamal Pharmacy'];
  var CARS = [['Hyundai', 'Elantra'], ['Kia', 'Cerato'], ['Toyota', 'Corolla'], ['Chevrolet', 'Optra'], ['Nissan', 'Sunny'], ['MG', 'ZS'], ['Chery', 'Tiggo 4'], ['Renault', 'Logan']];
  var PLATE_LETTERS = ['أ ب ج', 'س ط ر', 'ن ه و', 'ع ف ق', 'ل م ى', 'د ر س'];
  var JOBS = ['Accountant', 'Sales supervisor', 'Pharmacist', 'Site engineer', 'Teacher', 'Customer service agent', 'Branch cashier'];
  var REPORT_NOTES = [
    'Doorman confirmed the customer lives on the third floor.',
    'Visited in the evening, customer present and cooperative.',
    'Neighbour on the same floor confirmed the family has lived here for years.',
    'HR office confirmed employment by phone and in person.',
    'Shop open during the visit, stock consistent with the declared activity.'
  ];
  var RETURN_COMMENTS = ['The building entrance photo is missing.', 'Please confirm ownership with a second source.', 'Years at address conflicts with the application. Please recheck.'];
  var REWORK_REASONS = ['Neighbour confirmation was not obtained.', 'Employment section does not include the HR contact.', 'Business premises photos do not show the signboard.'];

  var FEEDBACK = {
    investigation: {
      good: [
        'Report was thorough and the photos clearly showed the building entrance and the unit number.',
        'Investigator confirmed with two neighbours and the doorman. Very reliable.',
        'Delivered a day early with clear answers to all of our questions.',
        'Good coverage of the employer visit, HR contact details were verified.'
      ],
      mid: [
        'Report was correct but arrived close to the deadline.',
        'Photos were acceptable, though the notes could have been more detailed.'
      ],
      bad: [
        'Report came back late and one required photo was missing.',
        'The address was confirmed without speaking to anyone at the property.',
        'We had to request rework because the employment section was incomplete.'
      ]
    },
    collection: {
      good: [
        'Recovered most of the balance within the first two weeks.',
        'Regular updates and a clean action log. The customer kept the promise to pay.',
        'Handled a difficult customer professionally and negotiated a workable plan.'
      ],
      mid: [
        'Recovery was reasonable but updates came in only once a week.',
        'Followed the instructions, results were average for this bucket.'
      ],
      bad: [
        'Very few contact attempts logged during the first week.',
        'The customer complained about the tone of the calls.',
        'Promises to pay were recorded but not followed up.'
      ]
    }
  };
  var REPLIES = [
    'Thank you for the feedback, we have shared it with the field team.',
    'We reviewed this case with the investigator and added a second photo check to our process.',
    'The customer was unreachable for the first week. We have since added evening call slots.'
  ];

  // ---------------------------------------------------------------- people and organisations
  var ENTITIES = [
    { id: 'ent_horus', name: 'Horus Auto Finance', type: 'auto_finance', city: 'Cairo', mail: 'horus-auto.example',
      products: ['auto_loan'], users: [['Nadia Samir', 'entity_admin'], ['Tamer Lotfy', 'entity_credit'], ['Heba Mansour', 'entity_operations'], ['Youssef Kamel', 'entity_collections']] },
    { id: 'ent_tahrir', name: 'Tahrir Consumer Finance', type: 'consumer_finance', city: 'Giza', mail: 'tahrir-cf.example',
      products: ['consumer_finance', 'personal_loan'], users: [['Rania Fouad', 'entity_admin'], ['Ahmed Zaki', 'entity_credit'], ['Dina Hamdy', 'entity_collections']] },
    { id: 'ent_delta', name: 'Delta Crest Bank', type: 'bank', city: 'Cairo', mail: 'deltacrest.example',
      products: ['credit_card', 'personal_loan', 'sme_loan'], users: [['Sherif Nabil', 'entity_admin'], ['Mona Ashraf', 'entity_credit'], ['Khaled Sobhy', 'entity_operations'], ['Aya Gamal', 'entity_collections']] }
  ];

  var PROVIDERS = [
    { id: 'prv_sphinx', name: 'Sphinx Verification Services', kind: 'company', city: 'Cairo', services: ['investigation'], joined: 720,
      govs: { cairo: 30, giza: 30, qalyubia: 20, alexandria: 20, sharqia: 15, dakahlia: 15, gharbia: 15, monufia: 10 },
      inv: { residence: 420, employment: 480, business: 560, guarantor: 400 }, sla: { residence: 36, employment: 60, business: 60, guarantor: 36 },
      history: { investigation: { delivered: 240, onTime: 222, firstTime: 215, accepted: 230, evidence: 232 } },
      admin: 'Hany Wagdy', supervisor: 'Salma Reda',
      agents: [['Mostafa Ali', ['cairo', 'giza']], ['Amr Saeed', ['giza', 'qalyubia']], ['Nourhan Ibrahim', ['alexandria']], ['Walid Hegazy', ['dakahlia', 'gharbia', 'sharqia', 'monufia']]] },
    { id: 'prv_recovery', name: 'Recovery Partners Egypt', kind: 'company', city: 'Cairo', services: ['collection'], joined: 900,
      govs: { cairo: 40, giza: 35, alexandria: 25, qalyubia: 20, dakahlia: 15, sharqia: 15, ismailia: 10, port_said: 10 },
      coll: { b1_30: 8, b31_60: 12, b61_90: 17, b90p: 26 }, fixedFee: 150, firstContactHours: 24,
      history: { collection: { closed: 180, recoveryNormSum: 150, ptpKept: 300, ptpBroken: 90, complaints: 6, onTime: 165, recoveredAmount: 5400000, overdueAmount: 7800000 } },
      admin: 'Adel Morsy', supervisor: 'Rehab Anwar',
      agents: [['Tarek Helmy', ['cairo']], ['Yasser Fawzy', ['giza', 'qalyubia']], ['Mahmoud Saad', ['alexandria']], ['Ibrahim Nour', ['dakahlia', 'sharqia', 'ismailia', 'port_said']]] },
    { id: 'prv_fl_omar', name: 'Omar Hassan', kind: 'freelancer', city: 'Giza', services: ['investigation'], joined: 40,
      govs: { giza: 15, cairo: 10 }, inv: { residence: 300, employment: 340, business: 400, guarantor: 290 }, sla: { residence: 30, employment: 48, business: 48, guarantor: 30 },
      history: { investigation: { delivered: 6, onTime: 5, firstTime: 5, accepted: 6, evidence: 6 } } }
  ];

  // Pending applications: none in the demo; register one from the sign-in page.
  var APPLICATIONS = [];

  // ---------------------------------------------------------------- builder
  function build(T) {
    var R = U.prng(20260926);
    var rnd = R.next;
    var db = {
      version: C.DATA_VERSION,
      seededAt: T,
      clock: { offsetMs: 0 },
      config: {
        scoring: U.clone(C.DEFAULT_SCORING),
        pricing: U.clone(C.DEFAULT_PRICING),
        lists: {
          governorates: U.clone(C.GOVERNORATES),
          inquiryTypes: U.clone(C.INQUIRY_TYPES),
          productTypes: U.clone(C.PRODUCT_TYPES),
          actionTypes: U.clone(C.COLLECTION_ACTION_TYPES),
          ratingTags: U.clone(C.RATING_TAGS),
          declineReasons: U.clone(C.DECLINE_REASONS)
        }
      },
      users: [], entities: [], providers: [], agents: [],
      cases: [], offers: [], batches: [],
      ratings: [], clientRatings: [], disputes: [], invoices: [],
      notifications: [], audit: [], scores: {}, counters: {}
    };
    var lists = db.config.lists;
    var idn = 0;
    function id(prefix) { idn++; return prefix + '_' + String(idn).padStart(4, '0'); }
    function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '_'); }
    function mobile() { return '01' + R.pick(['0', '1', '2', '5']) + String(R.int(10000000, 99999999)); }
    function nationalId(gov) {
      var g = lists.governorates.filter(function (x) { return x.id === gov; })[0] || { code: '01' };
      var year = R.int(1965, 2002), century = year >= 2000 ? '3' : '2';
      var mm = String(R.int(1, 12)).padStart(2, '0'), dd = String(R.int(1, 28)).padStart(2, '0');
      return century + String(year % 100).padStart(2, '0') + mm + dd + g.code + String(R.int(1000, 9999)) + String(R.int(1, 9));
    }
    function person() {
      var female = rnd() < 0.4;
      return (female ? R.pick(FEMALE) : R.pick(MALE)) + ' ' + R.pick(MALE) + ' ' + R.pick(LAST);
    }
    function address(gov) {
      return { governorate: gov, city: R.pick(CITIES[gov] || [lists.governorates.filter(function (g) { return g.id === gov; })[0].en]), street: R.int(2, 140) + ' ' + R.pick(STREETS), landmark: R.pick(LANDMARKS) };
    }
    function round10(n) { return Math.round(n / 10) * 10; }

    // ---------- users & orgs
    function addUser(name, role, extra) {
      var u = Object.assign({ id: 'u_' + slug(name), name: name, role: role, active: true, phone: mobile(), createdAt: T - R.int(60, 700) * DAY }, extra || {});
      db.users.push(u);
      return u;
    }

    ENTITIES.forEach(function (e) {
      db.entities.push({ id: e.id, name: e.name, type: e.type, city: e.city, products: e.products, createdAt: T - R.int(300, 900) * DAY, active: true });
      e.users.forEach(function (pair) {
        addUser(pair[0], pair[1], { entityId: e.id, email: slug(pair[0]).replace(/_/g, '.') + '@' + e.mail });
      });
    });

    function providerRecord(p, verification) {
      var zones = C.ZONES.map(function (z) { return z.id; });
      var pricing = {};
      if (p.inv) {
        pricing.investigation = {};
        Object.keys(p.inv).forEach(function (t) {
          pricing.investigation[t] = {};
          zones.forEach(function (z) { pricing.investigation[t][z] = round10(p.inv[t] * db.config.pricing.zoneMultiplier[z]); });
        });
      }
      if (p.coll) pricing.collection = { feePct: U.clone(p.coll), fixedFee: p.fixedFee };
      return {
        id: p.id, name: p.name, kind: p.kind, city: p.city, services: p.services.slice(),
        governorates: Object.keys(p.govs), capacity: U.clone(p.govs), pricing: pricing,
        sla: { investigation: p.sla ? U.clone(p.sla) : null, collectionFirstContactHours: p.firstContactHours || null },
        verification: verification, history: U.clone(p.history || {}),
        enforcement: { level: 'none', source: 'auto', since: T },
        joinedAt: T - p.joined * DAY, phone: mobile(), email: 'ops@' + slug(p.name).replace(/_/g, '-') + '.example',
        description: p.kind === 'freelancer' ? 'Independent field ' + (p.services[0] === 'collection' ? 'collector' : 'investigator') + ' based in ' + p.city + '.' : p.name + ' operates field teams from ' + p.city + '.'
      };
    }

    // Days until each company's commercial register and tax card expire. Sphinx's register is
    // inside the 30-day reminder window so the reminder and renewal can be tried straight away.
    var DOC_EXPIRY_DAYS = { prv_sphinx: { commercial_register: 20, tax_card: 210 }, prv_recovery: { commercial_register: 300, tax_card: 160 } };
    PROVIDERS.forEach(function (p) {
      var exp = DOC_EXPIRY_DAYS[p.id] || { commercial_register: 365, tax_card: 365 };
      var docs = p.kind === 'freelancer'
        ? [{ type: 'national_id', status: 'verified' }, { type: 'training_certificate', status: 'verified' }]
        : [{ type: 'commercial_register', status: 'verified', expiresAt: U.endOfDay(T + exp.commercial_register * DAY) },
          { type: 'tax_card', status: 'verified', expiresAt: U.endOfDay(T + exp.tax_card * DAY) }, { type: 'insurance', status: 'verified' }];
      var rec = providerRecord(p, { status: 'verified', documents: docs, idVerified: p.kind === 'freelancer' ? true : null, certified: p.kind === 'freelancer' ? true : null, verifiedAt: T - (p.joined - 2) * DAY, notes: [] });
      db.providers.push(rec);
      if (p.kind === 'freelancer') {
        var agentId = 'ag_' + slug(p.name);
        var u = addUser(p.name, 'freelancer', { providerId: p.id, agentId: agentId, email: slug(p.name).replace(/_/g, '.') + '@freelance.example' });
        db.agents.push({ id: agentId, providerId: p.id, userId: u.id, name: p.name, governorates: Object.keys(p.govs), services: p.services.slice(), active: true });
      } else {
        var mail = slug(p.name).replace(/_/g, '-') + '.example';
        addUser(p.admin, 'provider_admin', { providerId: p.id, email: slug(p.admin).replace(/_/g, '.') + '@' + mail });
        addUser(p.supervisor, 'provider_supervisor', { providerId: p.id, email: slug(p.supervisor).replace(/_/g, '.') + '@' + mail });
        p.agents.forEach(function (a) {
          var agentId2 = 'ag_' + slug(a[0]);
          var u2 = addUser(a[0], 'agent', { providerId: p.id, agentId: agentId2, email: slug(a[0]).replace(/_/g, '.') + '@' + mail });
          db.agents.push({ id: agentId2, providerId: p.id, userId: u2.id, name: a[0], governorates: a[1], services: a[2] || p.services.slice(), active: true });
        });
      }
    });

    APPLICATIONS.forEach(function (p) {
      var docs = Object.keys(p.docs).map(function (k) { return { type: k, status: p.docs[k] === 'uploaded' ? 'uploaded' : 'missing' }; });
      var rec = providerRecord(p, { status: 'pending', documents: docs, idVerified: p.kind === 'freelancer' ? false : null, certified: p.kind === 'freelancer' ? false : null, submittedAt: T - p.joined * DAY, notes: [] });
      rec.contactName = p.contact;
      db.providers.push(rec);
    });

    addUser('Laila Hosny', 'platform_admin', { email: 'laila.hosny@platform.example' });
    addUser('Ziad Ezzat', 'platform_qa', { email: 'ziad.ezzat@platform.example' });

    // ---------- registration details and team hierarchy
    // A separate generator, so adding registration data never shifts the case history below.
    var R2 = U.prng(4242);
    function mobile2() { return '01' + R2.pick(['0', '1', '2', '5']) + String(R2.int(10000000, 99999999)); }
    function nid2(gov, minYear, maxYear) {
      var g = lists.governorates.filter(function (x) { return x.id === gov; })[0] || { code: '01' };
      var year = R2.int(minYear || 1970, maxYear || 1998);
      return (year >= 2000 ? '3' : '2') + String(year % 100).padStart(2, '0') + String(R2.int(1, 12)).padStart(2, '0') + String(R2.int(1, 28)).padStart(2, '0') + g.code + String(R2.int(1000, 9999)) + String(R2.int(1, 9));
    }
    var HQ = { Cairo: ['cairo', 'nasr_city'], Giza: ['giza', 'dokki'], Alexandria: ['alexandria', 'smouha'], Mansoura: ['dakahlia', 'mansoura'], Zagazig: ['sharqia', 'zagazig'] };
    var CITY_COVERAGE = { prv_fl_omar: { giza: ['dokki', 'haram', 'faisal', 'october'], cairo: ['downtown', 'zamalek'] } };
    var regN = 0;
    db.providers.forEach(function (p) {
      var hq = HQ[p.city] || ['cairo', 'nasr_city'];
      p.address = { governorate: hq[0], city: hq[1], street: R2.int(2, 90) + ' ' + R2.pick(STREETS), landmark: R2.pick(LANDMARKS) };
      p.coverageCities = {};
      p.governorates.forEach(function (g) { p.coverageCities[g] = ((CITY_COVERAGE[p.id] || {})[g] || []).slice(); });
      var pending = p.verification.status !== 'verified';
      regN++;
      p.registration = { ref: 'REG-' + new Date(T).getFullYear() + '-' + String(regN).padStart(5, '0'), source: pending ? 'self' : 'admin', at: pending ? p.verification.submittedAt : p.joinedAt };
      var users = db.users.filter(function (u) { return u.providerId === p.id; });
      if (p.kind === 'company') {
        var src = APPLICATIONS.concat(PROVIDERS).filter(function (x) { return x.id === p.id; })[0];
        var ownerName = src.admin || src.contact;
        var owner = users.filter(function (u) { return u.role === 'provider_admin'; })[0];
        var sup = users.filter(function (u) { return u.role === 'provider_supervisor'; })[0];
        p.legal = { taxId: String(R2.int(100000000, 999999999)), commercialRegNo: String(R2.int(10000, 999999)), commercialRegOffice: hq[0] };
        p.owner = { name: ownerName, phone: owner ? owner.phone : mobile2(), email: owner ? owner.email : null, nationalId: nid2(hq[0], 1962, 1985) };
        p.focalPoint = sup ? { name: sup.name, title: 'Operations manager', phone: sup.phone, email: sup.email } : { name: ownerName, title: 'Owner', phone: p.owner.phone, email: null };
        p.contactName = p.focalPoint.name;
        if (owner) owner.owner = true;
        // Every agent reports to a supervisor.
        if (sup) {
          sup.services = p.services.slice();
          db.agents.forEach(function (a) { if (a.providerId === p.id) a.supervisorId = sup.id; });
        }
      } else {
        p.nationalId = nid2(hq[0], 1975, 1999);
        p.contactName = p.name;
      }
      db.agents.forEach(function (a) {
        if (a.providerId !== p.id) return;
        a.coverageCities = {};
        a.governorates.forEach(function (g) { a.coverageCities[g] = ((p.coverageCities || {})[g] || []).slice(); });
        a.nationalId = p.kind === 'freelancer' ? p.nationalId : nid2(a.governorates[0], 1978, 2001);
        var au = db.users.filter(function (u) { return u.id === a.userId; })[0];
        if (au) a.phone = au.phone;
      });
    });

    // Recovery Partners runs two field teams: Cairo and Giza under Rehab, the Delta and
    // Alexandria under Khaled.
    var rp = 'prv_recovery';
    var khaled = { id: 'u_khaled_samy', name: 'Khaled Samy', role: 'provider_supervisor', providerId: rp, active: true, phone: mobile2(), email: 'khaled.samy@recovery-partners-egypt.example', services: ['collection'], createdAt: T - 200 * DAY };
    db.users.push(khaled);
    db.agents.forEach(function (a) { if (a.providerId === rp && ['ag_mahmoud_saad', 'ag_ibrahim_nour'].indexOf(a.id) >= 0) a.supervisorId = khaled.id; });

    // Applicants can sign in to follow their application.
    db.providers.filter(function (p) { return p.verification.status !== 'verified'; }).forEach(function (p) {
      if (db.users.some(function (u) { return u.providerId === p.id; })) return;
      var at = p.verification.submittedAt;
      if (p.kind === 'company') {
        var ou = { id: 'u_' + slug(p.owner.name), name: p.owner.name, role: 'provider_admin', providerId: p.id, owner: true, active: true, phone: p.owner.phone, email: null, createdAt: at };
        db.users.push(ou);
        p.focalPoint = { name: 'Nadia Fawzy', title: 'Field operations lead', phone: mobile2(), email: null };
        p.contactName = p.focalPoint.name;
      } else {
        var agId = 'ag_' + slug(p.name);
        var fu = { id: 'u_' + slug(p.name), name: p.name, role: 'freelancer', providerId: p.id, agentId: agId, active: true, phone: mobile2(), email: null, createdAt: at };
        db.users.push(fu);
        db.agents.push({ id: agId, providerId: p.id, userId: fu.id, name: p.name, governorates: p.governorates.slice(), coverageCities: U.clone(p.coverageCities), services: p.services.slice(), active: true, nationalId: p.nationalId, phone: fu.phone });
      }
      p.phone = db.users[db.users.length - 1].phone;
    });
    db.counters.registration = regN;

    // ---------- lookups for replay
    function providerById(pid) { return db.providers.filter(function (p) { return p.id === pid; })[0] || null; }
    function userById(uid) { return db.users.filter(function (u) { return u.id === uid; })[0]; }
    function actor(u) { return ICM.domain.actorOf(u); }
    function managerActor(pid, which) {
      var p = providerById(pid);
      if (p.kind === 'freelancer') return actor(db.users.filter(function (u) { return u.providerId === pid; })[0]);
      return actor(db.users.filter(function (u) { return u.providerId === pid && u.role === (which || 'provider_supervisor'); })[0]);
    }
    function agentActor(c) {
      var a = db.agents.filter(function (x) { return x.id === c.agentId; })[0];
      return actor(userById(a.userId));
    }
    function pickAgent(pid, gov, service) {
      var agents = db.agents.filter(function (a) { return a.providerId === pid && a.services.indexOf(service) >= 0; });
      var local = agents.filter(function (a) { return a.governorates.indexOf(gov) >= 0; });
      return (local.length ? local : agents)[0];
    }
    function entityCreator(entityId, service) {
      var us = db.users.filter(function (u) { return u.entityId === entityId && wf.entityServes(u.role, service); });
      var pref = us.filter(function (u) { return u.role === (service === 'investigation' ? 'entity_credit' : 'entity_collections'); });
      return (pref.length ? pref : us)[0];
    }
    var admin = actor(db.users.filter(function (u) { return u.role === 'platform_admin'; })[0]);

    // ---------- case factory
    function newCase(service, o) {
      var gov = o.gov;
      var creator = entityCreator(o.entity, service);
      var c = {
        id: id('case'), ref: ICM.domain.nextRef(db, service), service: service, entityId: o.entity,
        createdBy: creator.id, createdAt: 0, updatedAt: 0, batchId: o.batchId || null, status: 'draft',
        providerId: null, offerId: null, agentId: null, declinedProviderIds: [], expiredProviderIds: [],
        governorate: gov, geo: ICM.domain.randomGeo(db, gov, rnd),
        customer: { name: person(), nationalId: nationalId(gov), mobiles: [mobile()] },
        addresses: {}, internalRef: (service === 'investigation' ? 'APP-' : 'COLL-') + R.int(100000, 999999),
        instructions: '', timeline: [], slaFlags: {}, reworkCount: 0, returnCount: 0, disputed: false, ratingId: null, price: null
      };
      if (service === 'investigation') {
        c.inquiryTypes = o.types || ['residence'];
        if (c.inquiryTypes.indexOf('residence') >= 0 || c.inquiryTypes.indexOf('guarantor') >= 0) c.addresses.home = address(gov);
        if (c.inquiryTypes.indexOf('employment') >= 0) { c.addresses.work = address(gov); c.employerName = R.pick(EMPLOYERS); }
        if (c.inquiryTypes.indexOf('business') >= 0) { c.addresses.business = address(gov); c.businessName = R.pick(BUSINESSES); }
        if (c.inquiryTypes.indexOf('guarantor') >= 0) c.guarantor = { name: person(), nationalId: nationalId(gov), mobile: mobile(), relationship: R.pick(['Brother', 'Father', 'Colleague', 'Uncle']) };
        c.instructions = R.pick(['Visit after 5 pm, the customer works mornings.', 'Confirm the apartment number with the doorman.', 'Customer prefers a call before the visit.', '']);
        c.photos = []; c.report = {}; c.checkIn = null;
      } else {
        var ent = db.entities.filter(function (e) { return e.id === o.entity; })[0];
        c.productType = o.product || R.pick(ent.products);
        c.contractNumber = 'CN-' + R.int(2021, 2025) + '-' + R.int(10000, 99999);
        c.originalAmount = round10(o.original || (c.productType === 'auto_loan' ? R.int(250, 900) * 1000 : c.productType === 'sme_loan' ? R.int(200, 600) * 1000 : R.int(30, 180) * 1000));
        c.overdueAmount = round10(o.overdue || Math.round(c.originalAmount * (0.08 + rnd() * 0.22)));
        c.instalmentAmount = round10(Math.round(c.originalAmount / R.pick([24, 36, 48, 60])));
        c.dpd = o.dpd || R.int(10, 150);
        c.bucket = C.bucketFor(c.dpd);
        c.customer.mobiles.push(mobile());
        c.addresses.home = address(gov);
        if (rnd() < 0.5) c.addresses.work = address(gov);
        if (c.productType === 'auto_loan') {
          var car = R.pick(CARS);
          c.collateral = { make: car[0], model: car[1] + ' ' + R.int(2018, 2024), plate: R.pick(PLATE_LETTERS) + ' ' + R.int(1000, 9999), notes: '' };
        } else c.collateral = null;
        c.allowedActions = { calls: true, messages: true, visits: o.visits !== false };
        c.settlementAuthority = o.authority || R.pick([{ mode: 'discount', maxDiscountPct: 20 }, { mode: 'discount', maxDiscountPct: 15 }, { mode: 'instalments' }, { mode: 'none' }]);
        c.actions = []; c.promises = []; c.payments = []; c.settlements = []; c.settledTarget = null;
      }
      return c;
    }

    function makeOffer(p, cases, at, batchId, groupKey) {
      var o = {
        id: id('off'), providerId: p.id, entityId: cases[0].entityId, service: cases[0].service,
        caseIds: cases.map(function (c) { return c.id; }), batchId: batchId || null, groupKey: groupKey || null,
        sentAt: at, expiresAt: at + db.config.pricing.offerWindowHours * H, status: 'pending',
        respondedAt: null, respondedBy: null, declineReason: null, declineNote: null, warned: false
      };
      db.offers.push(o);
      return o;
    }
    function offerById(oid) { return db.offers.filter(function (o) { return o.id === oid; })[0]; }

    function hashId(str) { var x = 7; for (var i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) >>> 0; return x; }
    function fillEvidence(c, at) {
      var n = ICM.domain.minPhotos(db, c) + (rnd() < 0.4 ? 1 : 0);
      var labels = wf.reports.photoSlots(c.inquiryTypes).concat(['street']);
      c.photos = [];
      for (var i = 0; i < n; i++) c.photos.push({ id: id('ph'), at: at - (n - i) * 5 * U.MIN, lat: c.checkIn.lat, lng: c.checkIn.lng, placeholder: true, label: labels[i % labels.length] });
      c.report = {};
      c.inquiryTypes.forEach(function (t) {
        var note = R.pick(REPORT_NOTES);
        if (t === 'residence') c.report[t] = { customerFound: 'yes', residenceConfirmed: rnd() < 0.9 ? 'yes' : 'no', ownership: R.pick(['owned', 'rented', 'family']), yearsAtAddress: R.int(1, 15), neighbourConfirmation: rnd() < 0.8 ? 'yes' : 'no', notes: note };
        if (t === 'employment') c.report[t] = { employerConfirmed: 'yes', jobTitle: R.pick(JOBS), tenureYears: R.int(1, 12), hrContact: 'HR office, ext. ' + R.int(100, 499), salaryConfirmed: rnd() < 0.8 ? 'yes' : 'no', notes: note };
        if (t === 'business') c.report[t] = { businessExists: 'yes', activityMatches: rnd() < 0.85 ? 'yes' : 'no', estimatedSize: R.pick(['micro', 'small', 'medium']), employees: R.int(1, 14), notes: note };
        if (t === 'guarantor') c.report[t] = { guarantorFound: 'yes', willingToGuarantee: rnd() < 0.85 ? 'yes' : 'no', relationship: R.pick(['family', 'friend', 'colleague']), notes: note };
        if (t === 'residence' || t === 'business') c.report[t] = wf.reports.sample(t, c, at, U.prng(hashId(c.id + t)).next);
      });
    }

    /** Apply one scripted step to a case at time `now`. */
    function step(c, s, now) {
      var M = wf.machineFor(c.service);
      var ctx = { now: now, provider: providerById(c.providerId || s.providerId), inquiryTypes: lists.inquiryTypes };
      var ent = actor(userById(c.createdBy));
      var off;
      switch (s.a) {
        case 'submit': return M.apply(c, 'submit', ent, {}, ctx);
        case 'send_offer':
          var p = providerById(s.providerId);
          off = s.offerId ? offerById(s.offerId) : makeOffer(p, [c], now, c.batchId);
          return M.apply(c, 'send_offer', ent, { providerId: p.id, offerId: off.id, price: ICM.domain.priceFor(db, p, c) }, ctx);
        case 'accept':
          off = offerById(c.offerId);
          var acc = managerActor(c.providerId, 'provider_admin');
          if (off.status === 'pending') { off.status = 'accepted'; off.respondedAt = now; off.respondedBy = acc.userId; }
          return M.apply(c, 'accept', acc, {}, ctx);
        case 'decline':
          off = offerById(c.offerId);
          var dec = managerActor(c.providerId, 'provider_admin');
          off.status = 'declined'; off.respondedAt = now; off.respondedBy = dec.userId; off.declineReason = s.reason || 'no_capacity';
          return M.apply(c, 'decline', dec, { reason: off.declineReason }, ctx);
        case 'expire':
          off = offerById(c.offerId);
          off.status = 'expired'; off.respondedAt = now;
          return M.apply(c, 'expire', wf.SYSTEM, {}, ctx);
        case 'assign':
          var ag = s.agentId ? { id: s.agentId } : pickAgent(c.providerId, c.governorate, c.service);
          return M.apply(c, 'assign', managerActor(c.providerId), { agentId: ag.id }, ctx);
        case 'check_in':
          return M.apply(c, 'check_in', agentActor(c), { checkIn: ICM.domain.simulateCheckIn(c, now, rnd) }, ctx);
        case 'submit_report':
          var c2 = Object.assign({}, c);
          fillEvidence(c2, now);
          return M.apply(c2, 'submit_report', agentActor(c), {}, ctx);
        case 'return_to_agent':
          var rv = ctx.provider.kind === 'freelancer' ? actor(db.users.filter(function (u) { return u.role === 'platform_qa'; })[0]) : managerActor(c.providerId);
          return M.apply(c, 'return_to_agent', rv, { comment: R.pick(RETURN_COMMENTS) }, ctx);
        case 'resume': return M.apply(c, 'resume', agentActor(c), {}, ctx);
        case 'approve':
          var ap = ctx.provider.kind === 'freelancer' ? actor(db.users.filter(function (u) { return u.role === 'platform_qa'; })[0]) : managerActor(c.providerId);
          return M.apply(c, 'approve', ap, {}, ctx);
        case 'request_rework': return M.apply(c, 'request_rework', ent, { reason: R.pick(REWORK_REASONS) }, ctx);
        case 'accept_report': return M.apply(c, 'accept_report', ent, {}, ctx);
        case 'close':
          if (c.service === 'investigation') return M.apply(c, 'close', ent, {}, ctx);
          return M.apply(c, 'close', managerActor(c.providerId), { outcome: s.outcome, reason: s.reason }, ctx);
        case 'cancel':
          return M.apply(c, 'cancel', s.by === 'admin' ? admin : ent, { reason: s.reason }, ctx);
        case 'recall': return M.apply(c, 'recall', ent, { reason: s.reason }, ctx);
        case 'start': return M.apply(c, 'start', agentActor(c), {}, ctx);
        case 'action':
          var ci = s.type === 'field_visit' ? ICM.domain.simulateCheckIn(c, now, rnd) : null;
          return M.logAction(c, agentActor(c), now, { type: s.type, note: s.note || '', checkIn: ci });
        case 'promise':
          return M.addPromise(c, agentActor(c), now, { amount: Math.round(M.outstanding(c) * (s.frac || 0.3)), dueDate: now + (s.dueInD || 3) * DAY, note: s.note || '' });
        case 'payment':
          var amt = s.all ? M.outstanding(c) : Math.round(M.outstanding(c) * (s.frac || 0.3));
          return M.addPayment(c, agentActor(c), now, { amount: amt, method: s.method || R.pick(['cash', 'bank_transfer', 'instapay', 'fawry']) });
        case 'evaluate': return M.evaluatePromises(c, now).case;
        case 'request_settlement':
          return M.apply(c, 'request_settlement', agentActor(c), { kind: s.kind, discountPct: s.discountPct, instalmentCount: s.instalmentCount, note: s.note || 'Customer offered a settlement.' }, ctx);
        case 'approve_settlement': return M.apply(c, 'approve_settlement', ent, { note: 'Approved' }, ctx);
        case 'reject_settlement': return M.apply(c, 'reject_settlement', ent, { reason: 'Discount too high for this bucket.' }, ctx);
        default: throw new Error('unknown seed step ' + s.a);
      }
    }

    var INV_FLOW = ['submit', 'send_offer', 'accept', 'assign', 'check_in', 'submit_report', 'approve', 'accept_report', 'close'];
    var INV_UNTIL = {
      draft: 0, submitted: 1, awaiting_acceptance: 2, accepted: 3, assigned: 4, in_field: 5,
      submitted_for_review: 6, delivered: 7, accepted_by_entity: 8, closed: 9
    };
    function invSteps(target, o) {
      var s;
      if (target === 'declined') s = INV_FLOW.slice(0, 2).concat(['decline']);
      else if (target === 'expired') s = INV_FLOW.slice(0, 2).concat(['expire']);
      else if (target === 'returned_to_agent') s = INV_FLOW.slice(0, 6).concat(['return_to_agent']);
      else if (target === 'rework_requested') s = INV_FLOW.slice(0, 7).concat(['request_rework']);
      else if (target === 'cancelled_entity') s = ['submit', 'cancel'];
      else if (target === 'cancelled_admin') s = INV_FLOW.slice(0, 4).concat(['cancel']);
      else if (o.rework && target === 'closed') s = INV_FLOW.slice(0, 7).concat(['request_rework', 'assign', 'check_in', 'submit_report', 'approve', 'accept_report', 'close']);
      else s = INV_FLOW.slice(0, INV_UNTIL[target]);
      return s.map(function (a) {
        var x = { a: a };
        if (a === 'send_offer') { x.providerId = o.provider; x.offerId = o.offerId; }
        if (a === 'cancel') { x.by = target === 'cancelled_admin' ? 'admin' : 'entity'; x.reason = target === 'cancelled_admin' ? 'Provider could not reach the address after two attempts.' : 'Application withdrawn by the customer.'; }
        return x;
      });
    }

    var COL_BASE = ['submit', 'send_offer', 'accept', 'assign', 'start'];
    function colSteps(target, o) {
      var s;
      var ops = o.ops || [{ a: 'action', type: 'call', note: 'No answer' }, { a: 'action', type: 'reached', note: 'Customer asked for a few days.' }];
      if (target === 'draft') s = [];
      else if (target === 'awaiting_acceptance') s = COL_BASE.slice(0, 2);
      else if (target === 'declined') s = COL_BASE.slice(0, 2).concat(['decline']);
      else if (target === 'expired') s = COL_BASE.slice(0, 2).concat(['expire']);
      else if (target === 'accepted') s = COL_BASE.slice(0, 3);
      else if (target === 'assigned') s = COL_BASE.slice(0, 4);
      else if (target === 'active') s = COL_BASE.concat(ops);
      else if (target === 'awaiting_entity_approval') s = COL_BASE.concat(ops, [{ a: 'request_settlement', kind: o.settle.kind, discountPct: o.settle.discountPct, instalmentCount: o.settle.instalmentCount, note: o.settle.note }]);
      else if (target === 'closed') s = COL_BASE.concat(ops, o.closeOps || [], [{ a: 'close', outcome: o.outcome, reason: o.reason }]);
      else if (target === 'recalled') s = COL_BASE.concat(ops, [{ a: 'recall', reason: 'Customer settled directly at the branch.' }]);
      else if (target === 'cancelled_entity') s = ['submit', { a: 'cancel', by: 'entity', reason: 'Account restructured internally.' }];
      return s.map(function (x) {
        var y = typeof x === 'string' ? { a: x } : Object.assign({}, x);
        if (y.a === 'send_offer') { y.providerId = o.provider; y.offerId = o.offerId; }
        return y;
      });
    }

    /** Build one case, replay it to its target, and fix its SLA window as requested. */
    function seedCase(service, o) {
      var c = newCase(service, o);
      var steps = service === 'investigation' ? invSteps(o.status, o) : colSteps(o.status, o);
      var end, start;
      if (o.closedDaysAgo != null) { end = T - o.closedDaysAgo * DAY; start = end - (o.spanD || (service === 'investigation' ? 3 : 18)) * DAY; }
      else { end = T - (o.lastH != null ? o.lastH : 0.4) * H; start = T - (o.ageH || 24) * H; }
      if (o.offerAt) { start = o.offerAt - 0.2 * H; end = o.offerAt; }
      var n = steps.length;
      var times = steps.map(function (s, i) { return Math.round(start + ((i + 1) * (end - start)) / (n + 1)); });
      if (o.offerAt) times = steps.map(function (s, i) { return s.a === 'send_offer' ? o.offerAt : o.offerAt - (n - i) * 5 * U.MIN; });
      c.createdAt = start;
      c.updatedAt = start;

      var accIdx = steps.map(function (s) { return s.a; }).indexOf('accept');
      var acc = accIdx >= 0 ? times[accIdx] : null;
      var due;
      if (acc == null) due = T + (service === 'collection' ? 30 * DAY : 48 * H);
      else if (o.closedDaysAgo != null) due = o.late ? acc + 0.3 * (end - acc) : end + 12 * H;
      else if (o.sla === 'risk') due = acc + (T - acc) / 0.88;
      else if (o.sla === 'breach') due = T - 2 * H;
      else due = T + Math.max(service === 'collection' ? 10 * DAY : 30 * H, 1.6 * (T - acc));
      if (service === 'investigation') c.deadline = Math.round(due);
      else c.periodEnd = U.endOfDay(due) - (o.sla === 'breach' ? DAY : 0);
      if (service === 'collection' && o.sla === 'breach') c.periodEnd = T - 3 * H;
      if (service === 'collection' && o.sla === 'risk') c.periodEnd = Math.round(acc + (T - acc) / 0.86);

      steps.forEach(function (s, i) { c = step(c, s, times[i]); });
      db.cases.push(c);
      return c;
    }

    // ---------- investigation singles
    var INV = [
      { entity: 'ent_horus', gov: 'giza', types: ['residence'], status: 'draft', ageH: 2 },
      { entity: 'ent_delta', gov: 'cairo', types: ['employment'], status: 'draft', ageH: 5 },
      { entity: 'ent_tahrir', gov: 'giza', types: ['residence', 'employment'], status: 'submitted', ageH: 1 },
      { entity: 'ent_horus', gov: 'cairo', types: ['residence'], provider: 'prv_sphinx', status: 'awaiting_acceptance', offerAt: T - 1 * H },
      { entity: 'ent_tahrir', gov: 'giza', types: ['guarantor'], provider: 'prv_fl_omar', status: 'awaiting_acceptance', offerAt: T - 0.7 * H },
      { entity: 'ent_delta', gov: 'cairo', types: ['employment'], provider: 'prv_sphinx', status: 'accepted', ageH: 4 },
      { entity: 'ent_horus', gov: 'cairo', types: ['residence'], provider: 'prv_sphinx', status: 'assigned', ageH: 14 },
      { entity: 'ent_delta', gov: 'giza', types: ['residence', 'guarantor'], provider: 'prv_sphinx', status: 'assigned', ageH: 20, sla: 'risk' },
      { entity: 'ent_delta', gov: 'cairo', types: ['residence'], provider: 'prv_sphinx', status: 'in_field', ageH: 22 },
      { entity: 'ent_horus', gov: 'giza', types: ['residence'], provider: 'prv_fl_omar', status: 'in_field', ageH: 9 },
      { entity: 'ent_delta', gov: 'giza', types: ['employment'], provider: 'prv_sphinx', status: 'submitted_for_review', ageH: 30 },
      { entity: 'ent_horus', gov: 'giza', types: ['guarantor'], provider: 'prv_fl_omar', status: 'returned_to_agent', ageH: 25 },
      { entity: 'ent_horus', gov: 'cairo', types: ['employment'], provider: 'prv_sphinx', status: 'delivered', ageH: 44, key: 'disputedCase' },
      { entity: 'ent_delta', gov: 'alexandria', types: ['business'], provider: 'prv_sphinx', status: 'rework_requested', ageH: 60 },
      { entity: 'ent_tahrir', gov: 'cairo', types: ['residence'], provider: 'prv_sphinx', status: 'accepted_by_entity', ageH: 70 },
      { entity: 'ent_horus', gov: 'giza', types: ['residence'], provider: 'prv_sphinx', status: 'closed', closedDaysAgo: 3, rate: 5 },
      { entity: 'ent_horus', gov: 'cairo', types: ['guarantor'], provider: 'prv_fl_omar', status: 'closed', closedDaysAgo: 1 },
      { entity: 'ent_delta', gov: 'dakahlia', types: ['business'], provider: 'prv_sphinx', status: 'closed', closedDaysAgo: 35, rate: 5 },
      { entity: 'ent_delta', gov: 'giza', types: ['residence', 'employment'], provider: 'prv_sphinx', status: 'closed', closedDaysAgo: 55, rate: 4 },
      { entity: 'ent_horus', gov: 'giza', types: ['residence'], status: 'cancelled_entity', ageH: 30 },
    ];
    var keyed = {};
    INV.forEach(function (o) { var c = seedCase('investigation', o); c._rate = o.rate; if (o.key) keyed[o.key] = c; });

    // ---------- collection singles
    var PTP_KEPT = [{ a: 'action', type: 'call', note: 'No answer' }, { a: 'action', type: 'reached', note: 'Customer agreed to pay part this week.' }, { a: 'promise', frac: 0.3, dueInD: 5 }, { a: 'payment', frac: 0.3 }];
    var PTP_BROKEN = [{ a: 'action', type: 'call', note: 'Customer promised to pay on Thursday.' }, { a: 'promise', frac: 0.25, dueInD: 1 }, { a: 'action', type: 'not_reached', note: 'Phone switched off.' }, { a: 'action', type: 'sms', note: 'Reminder sent.' }, { a: 'evaluate' }];
    var COL = [
      { entity: 'ent_horus', gov: 'cairo', dpd: 25, status: 'draft', ageH: 3 },
      { entity: 'ent_tahrir', gov: 'giza', dpd: 45, provider: 'prv_recovery', status: 'awaiting_acceptance', offerAt: T - 1 * H },
      { entity: 'ent_delta', gov: 'alexandria', dpd: 95, provider: 'prv_recovery', status: 'expired', ageH: 20, lastH: 14 },
      { entity: 'ent_delta', gov: 'dakahlia', dpd: 50, provider: 'prv_recovery', status: 'accepted', ageH: 3 },
      { entity: 'ent_horus', gov: 'cairo', dpd: 55, provider: 'prv_recovery', status: 'assigned', ageH: 10, authority: { mode: 'discount', maxDiscountPct: 20 }, product: 'auto_loan' },
      { entity: 'ent_horus', gov: 'cairo', dpd: 65, provider: 'prv_recovery', status: 'active', ageH: 240, ops: PTP_KEPT },
      { entity: 'ent_tahrir', gov: 'alexandria', dpd: 33, provider: 'prv_recovery', status: 'active', ageH: 120 },
      { entity: 'ent_horus', gov: 'qalyubia', dpd: 40, provider: 'prv_recovery', status: 'active', ageH: 90, ops: [{ a: 'action', type: 'whatsapp', note: 'Payment link sent.' }, { a: 'action', type: 'reached' }, { a: 'promise', frac: 0.5, dueInD: 9 }] },
      { entity: 'ent_horus', gov: 'cairo', dpd: 88, provider: 'prv_recovery', status: 'awaiting_entity_approval', ageH: 260, authority: { mode: 'discount', maxDiscountPct: 15 }, ops: PTP_KEPT, settle: { kind: 'discount', discountPct: 10, note: 'Customer can pay the rest in one transfer if we waive 10%.' } },
      { entity: 'ent_horus', gov: 'cairo', dpd: 30, provider: 'prv_recovery', status: 'closed', closedDaysAgo: 4, outcome: 'fully_recovered', closeOps: [{ a: 'payment', all: true }] },
      { entity: 'ent_tahrir', gov: 'giza', dpd: 60, provider: 'prv_recovery', status: 'closed', closedDaysAgo: 9, outcome: 'partially_recovered', closeOps: [{ a: 'payment', frac: 0.3 }], rate: 1, key: 'oneStarDisputed' },
      { entity: 'ent_horus', gov: 'giza', dpd: 100, provider: 'prv_recovery', status: 'closed', closedDaysAgo: 15, outcome: 'unrecoverable', reason: 'Customer relocated abroad, no assets found.', rate: 1, key: 'oneStarOpen' },
      { entity: 'ent_delta', gov: 'alexandria', dpd: 45, provider: 'prv_recovery', status: 'closed', closedDaysAgo: 22, outcome: 'fully_recovered', authority: { mode: 'discount', maxDiscountPct: 20 }, closeOps: [{ a: 'request_settlement', kind: 'discount', discountPct: 12, note: 'Lump sum offer.' }, { a: 'approve_settlement' }, { a: 'payment', all: true }], rate: 5 },
      { entity: 'ent_horus', gov: 'cairo', dpd: 20, provider: 'prv_recovery', status: 'closed', closedDaysAgo: 48, outcome: 'fully_recovered', closeOps: [{ a: 'payment', all: true }], rate: 4 },
      { entity: 'ent_tahrir', gov: 'giza', dpd: 36, provider: 'prv_recovery', status: 'recalled', ageH: 200 },
      { entity: 'ent_delta', gov: 'cairo', dpd: 22, status: 'cancelled_entity', ageH: 40 }
    ];
    COL.forEach(function (o) { var c = seedCase('collection', o); c._rate = o.rate; if (o.key) keyed[o.key] = c; });

    // ---------- batches
    function addBatch(entity, service, name, createdAt) {
      var b = { id: id('bat'), ref: ICM.domain.nextRef(db, 'batch'), entityId: entity, service: service, name: name, createdAt: createdAt, createdBy: entityCreator(entity, service).id, caseIds: [], assignMode: 'single', groups: [], closedAt: null, ratingIds: [], caseFlags: [] };
      db.batches.push(b);
      return b;
    }
    // A: closed and waiting for its rating
    var bA = addBatch('ent_delta', 'investigation', 'Branch onboarding, early September', T - 9 * DAY);
    var offA = makeOffer(providerById('prv_sphinx'), [{ entityId: 'ent_delta', service: 'investigation' }], T - 9 * DAY + H, bA.id, null);
    offA.caseIds = [];
    ['cairo', 'giza', 'cairo', 'giza', 'giza', 'cairo'].forEach(function (g, i) {
      var c = seedCase('investigation', { entity: 'ent_delta', gov: g, types: ['residence'], provider: 'prv_sphinx', status: 'closed', closedDaysAgo: 4 + (i % 2) * 0.5, spanD: 5, batchId: bA.id, offerId: offA.id });
      bA.caseIds.push(c.id); offA.caseIds.push(c.id);
    });
    bA.groups = [{ key: 'all', governorates: ['cairo', 'giza'], providerId: 'prv_sphinx', offerId: offA.id, caseIds: bA.caseIds.slice() }];

    // B: collection batch in progress
    var bB = addBatch('ent_tahrir', 'collection', 'Consumer portfolio 31-90 DPD', T - 14 * DAY);
    var offB = makeOffer(providerById('prv_recovery'), [{ entityId: 'ent_tahrir', service: 'collection' }], T - 14 * DAY + 2 * H, bB.id, null);
    offB.caseIds = [];
    var bBspec = [
      ['cairo', 'active', 45, PTP_KEPT], ['giza', 'active', 62, null], ['alexandria', 'active', 38, PTP_BROKEN],
      ['cairo', 'assigned', 55, null], ['giza', 'assigned', 70, null], ['alexandria', 'accepted', 33, null],
      ['cairo', 'closed', 41, null], ['giza', 'closed', 85, null]
    ];
    bBspec.forEach(function (s, i) {
      var o = { entity: 'ent_tahrir', gov: s[0], dpd: s[2], provider: 'prv_recovery', status: s[1], batchId: bB.id, offerId: offB.id, ops: s[3] || undefined, product: 'consumer_finance' };
      if (s[1] === 'closed') { o.closedDaysAgo = 1 + i * 0.2; o.spanD = 12; o.outcome = i === 6 ? 'fully_recovered' : 'partially_recovered'; o.closeOps = [{ a: 'payment', all: i === 6, frac: 0.5 }]; }
      else { o.ageH = 14 * 24 - i; }
      var c = seedCase('collection', o);
      bB.caseIds.push(c.id); offB.caseIds.push(c.id);
    });
    bB.groups = [{ key: 'all', governorates: ['cairo', 'giza', 'alexandria'], providerId: 'prv_recovery', offerId: offB.id, caseIds: bB.caseIds.slice() }];

    // C: split by governorate, offers pending
    var bC = addBatch('ent_horus', 'investigation', 'New auto loans, week 39', T - 2 * H);
    bC.assignMode = 'split';
    var offC1 = makeOffer(providerById('prv_fl_omar'), [{ entityId: 'ent_horus', service: 'investigation' }], T - 1.5 * H, bC.id, 'giza');
    var offC2 = makeOffer(providerById('prv_sphinx'), [{ entityId: 'ent_horus', service: 'investigation' }], T - 1.5 * H, bC.id, 'alexandria');
    offC1.caseIds = []; offC2.caseIds = [];
    [['giza', offC1, 'prv_fl_omar'], ['giza', offC1, 'prv_fl_omar'], ['alexandria', offC2, 'prv_sphinx'], ['alexandria', offC2, 'prv_sphinx']].forEach(function (s) {
      var c = seedCase('investigation', { entity: 'ent_horus', gov: s[0], types: ['residence'], provider: s[2], status: 'awaiting_acceptance', offerAt: T - 1.5 * H, batchId: bC.id, offerId: s[1].id });
      bC.caseIds.push(c.id); s[1].caseIds.push(c.id);
    });
    bC.groups = [
      { key: 'giza', governorates: ['giza'], providerId: 'prv_fl_omar', offerId: offC1.id, caseIds: offC1.caseIds.slice() },
      { key: 'alexandria', governorates: ['alexandria'], providerId: 'prv_sphinx', offerId: offC2.id, caseIds: offC2.caseIds.slice() }
    ];

    // ---------- ratings on seeded closed cases
    function ratingFor(c, overall, at) {
      var fb = FEEDBACK[c.service];
      var bandKey = overall >= 4 ? 'good' : overall === 3 ? 'mid' : 'bad';
      var tagPool = overall >= 4
        ? (c.service === 'investigation' ? ['accurate_report', 'fast_turnaround', 'excellent_communication'] : ['strong_results', 'professional_conduct', 'excellent_communication'])
        : overall === 3 ? ['late', 'poor_updates'] : (c.service === 'investigation' ? ['late', 'missing_photos', 'incomplete_report'] : ['customer_complaint', 'poor_updates']);
      var criteria = {};
      C.RATING_CRITERIA[c.service].forEach(function (k) { criteria[k] = U.clamp(overall + R.pick([-1, 0, 0, 0, 1]), 1, 5); });
      var r = {
        id: id('rat'), providerId: c.providerId, entityId: c.entityId, service: c.service,
        caseId: c.id || null, caseRef: c.ref, batchId: c.batchId || null,
        overall: overall, criteria: criteria, feedback: R.pick(fb[bandKey]),
        tags: R.shuffle(tagPool).slice(0, R.int(1, 2)), createdAt: at, createdBy: c.createdBy,
        reply: null, status: 'active', hidden: false, flagged: false, flagReason: null
      };
      if (rnd() < 0.3) {
        var pu = db.users.filter(function (u) { return u.providerId === c.providerId && (u.role === 'provider_admin' || u.role === 'freelancer'); })[0];
        r.reply = { text: R.pick(REPLIES), at: at + R.int(2, 40) * H, by: pu.id, byName: pu.name };
      }
      db.ratings.push(r);
      return r;
    }
    db.cases.forEach(function (c) {
      if (c._rate) {
        var r = ratingFor(c, c._rate, c.closedAt + R.int(2, 30) * H);
        c.ratingId = r.id;
        if (c.service === 'collection' && c._rate === 1 && c === keyed.oneStarDisputed) r.tags = ['customer_complaint'];
      }
      delete c._rate;
    });
    // Recovery Partners: two low ratings that read clearly (one is disputed below)
    if (keyed.oneStarDisputed) {
      var r1 = db.ratings.filter(function (r) { return r.caseId === keyed.oneStarDisputed.id; })[0];
      r1.feedback = 'The customer filed a complaint about repeated calls late at night. Recovery was minimal.';
      r1.tags = ['customer_complaint', 'poor_updates'];
    }
    if (keyed.oneStarOpen) {
      var r2 = db.ratings.filter(function (r) { return r.caseId === keyed.oneStarOpen.id; })[0];
      r2.feedback = 'No field visit was logged before the case was closed as unrecoverable.';
      r2.tags = ['poor_updates'];
      r2.reply = null;
    }

    // ---------- historical (archived) ratings
    var HIST = [
      ['prv_sphinx', 'investigation', 12, [4, 5, 5, 4, 5, 4, 5, 3, 5, 4, 5, 4]],
      ['prv_recovery', 'collection', 11, [4, 4, 5, 4, 3, 4, 5, 4, 4, 3, 5]],
      ['prv_fl_omar', 'investigation', 1, [5]]
    ];
    var archiveN = 100;
    HIST.forEach(function (h) {
      var p = providerById(h[0]);
      h[3].forEach(function (overall, i) {
        archiveN += R.int(3, 17);
        var ent = R.pick(ENTITIES);
        var fake = { id: null, service: h[1], providerId: p.id, entityId: ent.id, ref: (h[1] === 'investigation' ? 'INV' : 'COL') + '-2025-' + String(archiveN).padStart(5, '0'), createdBy: entityCreator(ent.id, h[1]).id };
        var r = ratingFor(fake, overall, T - R.int(6, 200) * DAY);
        r.archived = true;
      });
    });

    // ---------- client ratings (providers rate entities)
    var clientPairs = [
      ['prv_sphinx', 'ent_delta', 5, 4, 'Complete addresses and clear instructions.'],
      ['prv_sphinx', 'ent_horus', 4, 5, 'Pays on time, occasionally missing landmarks.'],
      ['prv_sphinx', 'ent_tahrir', 4, 3, 'Good data, invoices settled late twice.'],
      ['prv_recovery', 'ent_horus', 5, 5, 'Excellent contract data and quick settlement decisions.'],
      ['prv_recovery', 'ent_tahrir', 4, 4, ''],
      ['prv_recovery', 'ent_delta', 4, 3, 'Settlement approvals take several days.']
    ];
    clientPairs.forEach(function (x) {
      var u = db.users.filter(function (u) { return u.providerId === x[0] && (u.role === 'provider_admin' || u.role === 'freelancer'); })[0];
      db.clientRatings.push({ id: id('crt'), providerId: x[0], entityId: x[1], caseId: null, batchId: null, dataQuality: x[2], paymentTimeliness: x[3], comment: x[4], createdAt: T - R.int(5, 120) * DAY, createdBy: u.id });
    });

    // ---------- disputes
    var dc = keyed.disputedCase;
    if (dc) {
      dc.disputed = true;
      var d1 = {
        id: id('dsp'), ref: ICM.domain.nextRef(db, 'dispute'), kind: 'case', caseId: dc.id, caseRef: dc.ref, ratingId: null,
        raisedBy: dc.createdBy, raisedByName: userById(dc.createdBy).name, raisedByParty: 'entity',
        entityId: dc.entityId, providerId: dc.providerId, reason: 'report_inaccurate',
        details: 'The report says the customer lives at this address, but our branch confirmed the customer moved to Sheikh Zayed in March.',
        status: 'open', outcome: null, resolutionNote: null, createdAt: T - 20 * H, resolvedAt: null, resolvedBy: null,
        responses: []
      };
      var sup = managerActor(dc.providerId);
      d1.responses.push({ by: sup.userId, byName: sup.name, party: 'provider', text: 'Our investigator confirmed with the doorman and a neighbour. The photos show the name on the mailbox.', at: T - 14 * H });
      db.disputes.push(d1);
      dc.disputeIds = [d1.id];
      dc.timeline = dc.timeline.concat([wf.entry(actor(userById(dc.createdBy)), T - 20 * H, 'dispute_opened', { note: d1.details })]);
    }
    var ratedTahrir = db.ratings.filter(function (r) { return keyed.oneStarDisputed && r.caseId === keyed.oneStarDisputed.id; })[0];
    if (ratedTahrir) {
      var owner = db.users.filter(function (u) { return u.providerId === ratedTahrir.providerId && u.role === 'provider_admin'; })[0];
      db.disputes.push({
        id: id('dsp'), ref: ICM.domain.nextRef(db, 'dispute'), kind: 'rating', caseId: ratedTahrir.caseId, caseRef: ratedTahrir.caseRef, ratingId: ratedTahrir.id,
        raisedBy: owner.id, raisedByName: owner.name, raisedByParty: 'provider', entityId: ratedTahrir.entityId, providerId: ratedTahrir.providerId,
        reason: 'rating_unfair',
        details: 'The complaint mentioned in the review was never raised with us, and our call log shows no calls after 8 pm.',
        status: 'open', outcome: null, resolutionNote: null, createdAt: T - 30 * H, resolvedAt: null, resolvedBy: null, responses: []
      });
      ratedTahrir.disputed = true;
    }

    // ---------- invoices from closed cases
    var fee = db.config.pricing.platformFeePct;
    var thisMonth = U.monthKey(T);
    var prevMonth = U.monthKey(new Date(new Date(T).getFullYear(), new Date(T).getMonth() - 1, 15).getTime());
    var groups = {};
    db.cases.filter(function (c) { return c.status === 'closed'; }).forEach(function (c) {
      var k = c.entityId + '|' + c.providerId + '|' + U.monthKey(c.closedAt);
      (groups[k] = groups[k] || []).push(c);
    });
    Object.keys(groups).sort().forEach(function (k) {
      var parts = k.split('|'), month = parts[2];
      var status = month === thisMonth ? 'draft' : month === prevMonth ? 'issued' : 'paid';
      var inv = {
        id: id('inv'), ref: ICM.domain.nextRef(db, 'invoice'), entityId: parts[0], providerId: parts[1], month: month, status: status,
        platformFeePct: fee, lines: groups[k].map(function (c) {
          return { caseId: c.id, caseRef: c.ref, service: c.service, closedAt: c.closedAt, amount: ICM.domain.billableAmount(c), adjustment: 1 };
        }),
        issuedAt: status === 'draft' ? null : new Date(+month.slice(0, 4), +month.slice(5, 7), 1).getTime(),
        paidAt: status === 'paid' ? new Date(+month.slice(0, 4), +month.slice(5, 7), 12).getTime() : null
      };
      db.invoices.push(inv);
    });

    // ---------- scores and enforcement
    db.providers.forEach(function (p) {
      if (p.verification.status !== 'verified') return;
      var s = wf.scoring.providerScore(p, db.cases, db.ratings, db.config.scoring, T);
      db.scores[p.id] = s;
      p.enforcement = { level: wf.scoring.enforcementLevel(s.overall, db.config.scoring), source: 'auto', since: T - 10 * DAY };
    });

    // ---------- SLA flags (silently, notifications below cover the interesting ones)
    db.cases.forEach(function (c) { c.slaFlags = wf.sla.resetFlags(c, T); });

    // ---------- notifications
    function notify(userId, key, params, link, at, read) {
      db.notifications.push({ id: id('ntf'), userId: userId, key: key, params: params || {}, link: link || null, at: at, read: !!read });
    }
    db.offers.filter(function (o) { return o.status === 'pending'; }).forEach(function (o) {
      ICM.domain.providerUsers(db, o.providerId, ['provider_admin', 'provider_supervisor', 'freelancer']).forEach(function (u) {
        notify(u.id, 'notif.offer_new', { count: o.caseIds.length }, 'provider:offers', o.sentAt, false);
      });
    });
    db.cases.forEach(function (c) {
      var link = 'case:' + c.id;
      if (c.status === 'delivered') ICM.domain.entityUsersFor(db, c).forEach(function (u) { notify(u.id, 'notif.report_delivered', { ref: c.ref }, link, c.deliveredAt, u.id !== c.createdBy); });
      if (c.status === 'submitted_for_review') {
        var reviewers = c.reviewerRole === 'qa' ? ICM.domain.platformUsers(db, 'platform_qa') : ICM.domain.providerUsers(db, c.providerId, ['provider_supervisor']);
        reviewers.forEach(function (u) { notify(u.id, 'notif.report_submitted', { ref: c.ref }, link, c.reportSubmittedAt, false); });
      }
      if (c.status === 'returned_to_agent') { var au = ICM.domain.agentUser(db, c.agentId); if (au) notify(au.id, 'notif.report_returned', { ref: c.ref }, link, c.updatedAt, false); }
      if (c.status === 'rework_requested') ICM.domain.providerUsers(db, c.providerId, ['provider_supervisor', 'provider_admin', 'freelancer']).forEach(function (u) { notify(u.id, 'notif.rework_requested', { ref: c.ref }, link, c.updatedAt, false); });
      if (c.status === 'awaiting_entity_approval') ICM.domain.entityUsersFor(db, c).forEach(function (u) { notify(u.id, 'notif.settlement_pending', { ref: c.ref }, link, c.updatedAt, false); });
      if (c.status === 'assigned') { var au2 = ICM.domain.agentUser(db, c.agentId); if (au2) notify(au2.id, 'notif.case_assigned', { ref: c.ref }, link, c.assignedAt, false); }
      if (c.slaFlags && c.slaFlags.breached) {
        ICM.domain.entityUsersFor(db, c).concat(ICM.domain.providerUsers(db, c.providerId, ['provider_admin', 'provider_supervisor', 'freelancer']), ICM.domain.platformUsers(db, 'platform_admin')).forEach(function (u) {
          notify(u.id, 'notif.sla_breached', { ref: c.ref }, link, c.dueAt, false);
        });
      }
      (c.promises || []).filter(function (p) { return p.status === 'broken'; }).forEach(function (p) {
        ICM.domain.providerUsers(db, c.providerId, ['provider_supervisor', 'freelancer']).forEach(function (u) { notify(u.id, 'notif.ptp_broken', { ref: c.ref }, link, p.brokenAt, true); });
      });
    });
    db.disputes.forEach(function (d) {
      ICM.domain.platformUsers(db, 'platform_admin').forEach(function (u) { notify(u.id, 'notif.dispute_opened', { ref: d.ref }, 'dispute:' + d.id, d.createdAt, false); });
    });
    db.ratings.filter(function (r) { return !r.archived && r.createdAt > T - 10 * DAY; }).forEach(function (r) {
      ICM.domain.providerUsers(db, r.providerId, ['provider_admin', 'freelancer']).forEach(function (u) { notify(u.id, 'notif.rating_received', { stars: r.overall }, 'provider:ratings', r.createdAt, true); });
    });
    db.invoices.filter(function (i) { return i.status === 'issued'; }).forEach(function (inv) {
      db.users.filter(function (u) { return u.entityId === inv.entityId && (u.role === 'entity_admin' || u.role === 'entity_operations'); }).forEach(function (u) {
        notify(u.id, 'notif.invoice_issued', { ref: inv.ref }, 'entity:invoices', inv.issuedAt, true);
      });
    });

    // ---------- audit trail from case timelines
    db.cases.forEach(function (c) {
      c.timeline.forEach(function (e) {
        db.audit.push({
          id: id('aud'), at: e.at, actorId: e.actorId, actorName: e.actorName, actorRole: e.actorRole,
          action: 'case.' + e.action, targetType: 'case', targetId: c.id, targetRef: c.ref,
          before: e.from ? { status: e.from } : null, after: e.to ? { status: e.to } : null, reason: e.note || null
        });
      });
    });
    db.providers.filter(function (p) { return p.verification.status === 'verified'; }).forEach(function (p) {
      db.audit.push({ id: id('aud'), at: p.verification.verifiedAt, actorId: 'u_laila_hosny', actorName: 'Laila Hosny', actorRole: 'platform_admin', action: 'provider.verify', targetType: 'provider', targetId: p.id, targetRef: p.name, before: { status: 'pending' }, after: { status: 'verified' }, reason: null });
    });
    db.audit.sort(function (a, b) { return a.at - b.at; });

    db.cases.forEach(function (c) { if (!c.updatedAt) c.updatedAt = c.createdAt; });

    var R3 = U.prng(5150);
    db.cases.filter(function (c) { return c.service === 'investigation'; }).forEach(function (c) {
      c.accountNumber = String(R3.int(3000000, 3199999));
      c.customer.telephone = R3.next() < 0.4 ? '02' + R3.int(20000000, 39999999) : null;
      if ((c.inquiryTypes || []).indexOf('business') >= 0) { c.orderNumber = 'ORD-' + R3.int(10000, 99999); c.businessPhone = '02' + R3.int(20000000, 39999999); }
      if (['accepted_by_entity', 'closed'].indexOf(c.status) >= 0 && R3.next() < 0.8) {
        var rec = ((c.report || {}).residence || (c.report || {}).business || {}).recommendation;
        c.clientDecision = { value: rec === 'REJECTED' ? 'REJECTED' : (R3.next() < 0.9 ? 'APPROVED' : 'REJECTED'), note: '', at: c.updatedAt, by: c.createdBy, byName: (db.users.filter(function (u) { return u.id === c.createdBy; })[0] || {}).name };
      }
    });
    return db;
  }

  ICM.seed = { build: build };
})();
