/* Mock services: bulk upload and batches. Excel/CSV parsing uses SheetJS (window.XLSX). */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var E = ICM.engine, U = ICM.util, wf = ICM.wf, D = ICM.domain, C = ICM.config;
  var S = (ICM.services = ICM.services || {});
  var Err = E.ServiceError;

  var FIELD_TO_COLUMN = {
    fullName: 'full_name', nationalId: 'national_id', mobile: 'mobile', mobiles: 'mobile', inquiryTypes: 'inquiry_types',
    employerName: 'employer_name', businessName: 'business_name', guarantorName: 'guarantor_name', guarantorMobile: 'guarantor_mobile',
    contractNumber: 'contract_number', productType: 'product_type', originalAmount: 'original_amount', overdueAmount: 'overdue_amount',
    instalmentAmount: 'instalment_amount', dpd: 'days_past_due', accountNumber: 'account_number', telephone: 'telephone',
    businessPhone: 'business_phone', orderNumber: 'order_number'
  };

  function norm(s) { return String(s == null ? '' : s).trim(); }
  function key(s) { return norm(s).toLowerCase().replace(/[\s-]+/g, '_'); }

  function resolveFromList(list, raw) {
    var k = key(raw);
    if (!k) return '';
    var hit = list.filter(function (x) { return x.id === k || key(x.en) === k || norm(x.ar) === norm(raw); })[0];
    return hit ? hit.id : '__unknown__:' + norm(raw);
  }

  function defaultsFor(service, d) {
    d = d || {};
    return service === 'investigation'
      ? { deadlineHours: +d.deadlineHours || null }
      : { periodDays: +d.periodDays || E.db().config.pricing.defaultCollectionDays, settlementMode: d.settlementMode || 'none', maxDiscountPct: +d.maxDiscountPct || null, allowed: d.allowed || ['calls', 'messages', 'visits'] };
  }

  /** Raw spreadsheet row -> request form values. */
  function rowToValues(service, raw, defaults) {
    var lists = E.db().config.lists, now = E.now();
    var gov = resolveFromList(lists.governorates, raw.governorate);
    var address = { governorate: gov, city: norm(raw.city), street: norm(raw.street), landmark: norm(raw.landmark) };
    if (service === 'investigation') {
      var types = norm(raw.inquiry_types).split(/[,;|/]+/).map(function (t) { return resolveFromList(lists.inquiryTypes, t); }).filter(Boolean);
      var hours = defaults.deadlineHours || Math.max.apply(null, types.map(function (t) {
        var it = lists.inquiryTypes.filter(function (x) { return x.id === t; })[0]; return it ? it.defaultSlaHours : 48;
      }).concat([24]));
      var v = {
        fullName: norm(raw.full_name), nationalId: norm(raw.national_id), mobile: norm(raw.mobile).replace(/\s+/g, ''),
        inquiryTypes: types, employerName: norm(raw.employer_name), businessName: norm(raw.business_name),
        guarantorName: norm(raw.guarantor_name), guarantorMobile: norm(raw.guarantor_mobile), instructions: norm(raw.instructions),
        internalRef: norm(raw.internal_ref), deadline: U.toLocalInput(now + hours * U.HOUR),
        accountNumber: norm(raw.account_number), telephone: norm(raw.telephone).replace(/\s+/g, ''),
        businessPhone: norm(raw.business_phone).replace(/\s+/g, ''), orderNumber: norm(raw.order_number)
      };
      if (types.indexOf('employment') >= 0 && types.indexOf('residence') < 0 && types.indexOf('guarantor') < 0) v.work = address;
      else if (types.indexOf('business') >= 0 && types.indexOf('residence') < 0 && types.indexOf('guarantor') < 0) v.business = address;
      else v.home = address;
      if (types.indexOf('employment') >= 0 && !v.work) v.work = address;
      if (types.indexOf('business') >= 0 && !v.business) v.business = address;
      return v;
    }
    var product = resolveFromList(lists.productTypes, raw.product_type);
    var collateral = norm(raw.collateral);
    return {
      fullName: norm(raw.full_name), nationalId: norm(raw.national_id),
      mobiles: [norm(raw.mobile).replace(/\s+/g, ''), norm(raw.mobile_2).replace(/\s+/g, '')].filter(Boolean),
      home: address, contractNumber: norm(raw.contract_number), productType: product,
      originalAmount: norm(raw.original_amount), overdueAmount: norm(raw.overdue_amount), instalmentAmount: norm(raw.instalment_amount),
      dpd: norm(raw.days_past_due), collateralNotes: collateral, collateralMake: collateral ? collateral.split(' ')[0] : '',
      allowedActions: defaults.allowed, settlementMode: defaults.settlementMode, maxDiscountPct: defaults.maxDiscountPct,
      periodEnd: U.toDateInput(now + defaults.periodDays * U.DAY), internalRef: norm(raw.internal_ref)
    };
  }

  function validateRow(service, row, defaults) {
    var values = rowToValues(service, row.raw, defaults);
    var govs = E.db().config.lists.governorates.map(function (g) { return g.id; });
    var form = service === 'investigation' ? C.FORMS.investigationRequest : C.FORMS.collectionRequest;
    var errs = wf.validateForm(form, values, { now: E.now(), governorates: govs });
    var errors = {};
    Object.keys(errs).forEach(function (f) {
      var col = FIELD_TO_COLUMN[f] || (f.indexOf('.') > 0 ? f.split('.')[1] : f);
      if (!errors[col]) errors[col] = errs[f];
    });
    if (service === 'investigation') {
      if (!norm(row.raw.inquiry_types)) errors.inquiry_types = 'errors.required';
      else if ((values.inquiryTypes || []).some(function (t) { return t.indexOf('__unknown__') === 0; })) errors.inquiry_types = 'errors.unknownInquiryType';
    } else if (values.productType && values.productType.indexOf('__unknown__') === 0) errors.product_type = 'errors.unknownProduct';
    if (errors.governorate === 'errors.unknownGovernorate' || (row.raw.governorate && String(values.home ? values.home.governorate : (values.work || values.business || {}).governorate).indexOf('__unknown__') === 0)) errors.governorate = 'errors.unknownGovernorate';
    return Object.assign({}, row, { values: values, errors: errors, valid: Object.keys(errors).length === 0 });
  }

  function batchCases(b) { return b.caseIds.map(function (id) { return E.caseById(id); }).filter(Boolean); }

  function batchRow(b) {
    var cases = batchCases(b);
    var status = b.closedAt ? 'closed' : wf.batch.status(b, cases);
    var providers = U.uniq(cases.map(function (c) { return c.providerId; }).filter(Boolean)).map(function (pid) { var p = E.providerById(pid); return { id: pid, name: p.name }; });
    return Object.assign({}, b, {
      status: status, progress: wf.batch.progress(cases), needsRating: wf.batch.needsRating(b, cases),
      providers: providers, entityName: E.entityById(b.entityId).name,
      counts: U.groupBy(cases, function (c) { return c.status; })
    });
  }

  function canSeeBatch(b, a) {
    if (a.role === 'platform_admin' || a.role === 'platform_qa') return true;
    return wf.isEntityRole(a.role) && a.entityId === b.entityId && wf.entityServes(a.role, b.service);
  }

  function mustBatch(id, a) {
    var b = E.batchById(id);
    if (!b) throw new Err('errors.notFound');
    if (!canSeeBatch(b, a)) throw new Err('errors.forbidden');
    return b;
  }

  var ASSIGNABLE = ['draft', 'submitted', 'declined', 'expired'];

  /** The distinct places ({ gov, city }) of some cases, for city-level matching. */
  function placesOf(cases) {
    var seen = {};
    return cases.map(D.casePlace).filter(function (pl) {
      var k = pl.gov + '|' + (pl.city || '');
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  S.batches = {
    parseFile: function (file, service) {
      return new Promise(function (resolve, reject) {
        if (!window.XLSX) return reject(new Err('errors.xlsxMissing'));
        var reader = new FileReader();
        reader.onerror = function () { reject(new Err('errors.fileRead')); };
        reader.onload = function () {
          try {
            var wb = window.XLSX.read(new Uint8Array(reader.result), { type: 'array', raw: false });
            var sheet = wb.Sheets[wb.SheetNames[0]];
            var json = window.XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
            var rows = json.map(function (r, i) {
              var raw = {};
              Object.keys(r).forEach(function (k) { raw[key(k)] = norm(r[k]); });
              return { rowNo: i + 2, raw: raw, excluded: false };
            }).filter(function (r) { return Object.keys(r.raw).some(function (k) { return r.raw[k]; }); });
            if (!rows.length) return reject(new Err('errors.fileEmpty'));
            var d = defaultsFor(service);
            resolve(rows.map(function (r) { return validateRow(service, r, d); }));
          } catch (e) { reject(new Err('errors.fileRead')); }
        };
        reader.readAsArrayBuffer(file);
      });
    },
    validateRows: function (service, rows, defaults) {
      return E.run(function () { var d = defaultsFor(service, defaults); return rows.map(function (r) { return validateRow(service, r, d); }); });
    },
    downloadTemplate: function (service) {
      return E.run(function () {
        var t = C.BULK_TEMPLATES[service], lists = E.db().config.lists;
        var wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([t.columns, t.example]), 'Cases');
        var ref = [['governorate', 'inquiry_type / product_type']];
        var second = service === 'investigation' ? lists.inquiryTypes : lists.productTypes;
        var n = Math.max(lists.governorates.length, second.length);
        for (var i = 0; i < n; i++) ref.push([(lists.governorates[i] || {}).en || '', (second[i] || {}).id || '']);
        window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(ref), 'Reference');
        window.XLSX.writeFile(wb, service + '-bulk-template.xlsx');
        return null;
      });
    },
    /** A 30-row demo file with 3 invalid rows, for trying the bulk flow end to end. */
    downloadDemoFile: function (service) {
      return E.run(function () {
        var R = U.prng(4242);
        var t = C.BULK_TEMPLATES[service];
        var first = ['Ahmed', 'Mona', 'Youssef', 'Salma', 'Karim', 'Heba', 'Omar', 'Nour', 'Tarek', 'Dina'];
        var last = ['Hassan', 'Farouk', 'Mansour', 'Gaber', 'Nasr', 'Kamal', 'Soliman', 'Zaki'];
        var govs = [['Giza', '21'], ['Cairo', '01'], ['Alexandria', '02']];
        var aoa = [t.columns];
        for (var i = 0; i < 30; i++) {
          var g = govs[i % 3];
          var nid = '2' + String(R.int(70, 99)) + String(R.int(1, 12)).padStart(2, '0') + String(R.int(1, 28)).padStart(2, '0') + g[1] + String(R.int(1000, 9999)) + '1';
          var mob = '01' + R.pick(['0', '1', '2', '5']) + String(R.int(10000000, 99999999));
          var name = R.pick(first) + ' ' + R.pick(first) + ' ' + R.pick(last);
          if (i === 4) nid = '';                 // missing national ID
          if (i === 11) mob = '0123';            // invalid phone
          if (i === 19) g = ['Atlantis', '01'];  // unknown governorate
          if (service === 'investigation') {
            aoa.push([name, nid, mob, 'residence', g[0], R.pick(['Dokki', 'Maadi', 'Smouha', 'Haram']), R.int(2, 99) + ' Tahrir St', 'Near the pharmacy', '', '', '', '', '', 'BULK-' + (1000 + i), String(3100000 + i * 37)]);
          } else {
            var original = R.int(40, 400) * 1000, overdue = Math.round(original * 0.15);
            aoa.push([name, nid, mob, '', g[0], R.pick(['Dokki', 'Maadi', 'Smouha']), R.int(2, 99) + ' Tahrir St', 'Near the pharmacy', 'CN-2025-' + R.int(10000, 99999), 'consumer_finance', original, overdue, Math.round(original / 36), R.int(31, 89), '', 'BULK-' + (2000 + i)]);
          }
        }
        var wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(aoa), 'Cases');
        window.XLSX.writeFile(wb, service + '-demo-30-rows.xlsx');
        return null;
      });
    },
    create: function (service, name, rows, defaults) {
      return E.mutate(function (db) {
        var a = E.actor();
        if (!wf.isEntityRole(a.role) || !wf.entityServes(a.role, service)) throw new Err('errors.forbidden');
        var d = defaultsFor(service, defaults);
        var valid = rows.filter(function (r) { return !r.excluded; }).map(function (r) { return validateRow(service, r, d); });
        if (valid.some(function (r) { return !r.valid; })) throw new Err('errors.batchHasErrors');
        if (!valid.length) throw new Err('errors.batchEmpty');
        var now = E.now();
        var b = { id: U.uid('bat'), ref: D.nextRef(db, 'batch'), entityId: a.entityId, service: service, name: name || '', createdAt: now, createdBy: a.userId, caseIds: [], assignMode: null, groups: [], closedAt: null, ratingIds: [], caseFlags: [] };
        valid.forEach(function (r) {
          var c = Object.assign(S.cases._blankCase(service, a, now), S.cases._formToCase(service, r.values));
          c.batchId = b.id;
          c.geo = D.randomGeo(db, c.governorate);
          c.timeline = [wf.entry(a, now, 'created', { to: 'draft', note: 'Bulk upload row ' + r.rowNo })];
          db.cases.push(c);
          b.caseIds.push(c.id);
        });
        db.batches.push(b);
        E.audit('batch.created', 'batch', b.id, b.ref, null, { cases: b.caseIds.length }, null, a);
        return b;
      });
    },
    plan: function (batchId) {
      return E.run(function () {
        var a = E.actor(), b = mustBatch(batchId, a);
        var open = batchCases(b).filter(function (c) { return ASSIGNABLE.indexOf(c.status) >= 0; });
        var byGov = U.groupBy(open, function (c) { return D.caseGov(c); });
        var types = U.uniq([].concat.apply([], open.map(function (c) { return c.inquiryTypes || []; })));
        var buckets = U.uniq(open.map(function (c) { return c.bucket; }).filter(Boolean));
        var groups = Object.keys(byGov).sort().map(function (g) {
          var demand = {}; demand[g] = byGov[g].length;
          var declined = U.uniq([].concat.apply([], byGov[g].map(function (c) { return c.declinedProviderIds || []; })));
          var el = S.marketplace._eligible({ service: b.service, demand: demand, places: placesOf(byGov[g]), inquiryTypes: types.length ? types : null, buckets: buckets });
          el.providers = el.providers.filter(function (p) { return declined.indexOf(p.id) < 0; });
          return { governorate: g, count: byGov[g].length, caseIds: byGov[g].map(function (c) { return c.id; }), eligible: el };
        });
        var all = {};
        open.forEach(function (c) { var g = D.caseGov(c); all[g] = (all[g] || 0) + 1; });
        var whole = open.length ? S.marketplace._eligible({ service: b.service, demand: all, places: placesOf(open), inquiryTypes: types.length ? types : null, buckets: buckets }) : { providers: [], excluded: {} };
        var declinedAll = U.uniq([].concat.apply([], open.map(function (c) { return c.declinedProviderIds || []; })));
        whole.providers = whole.providers.filter(function (p) { return declinedAll.indexOf(p.id) < 0; });
        return { batch: batchRow(b), open: open.length, groups: groups, whole: whole, inquiryTypes: types, buckets: buckets };
      });
    },
    assign: function (batchId, mode, assignments) {
      return E.mutate(function (db) {
        var a = E.actor(), b = mustBatch(batchId, a);
        if (!wf.isEntityRole(a.role)) throw new Err('errors.forbidden');
        var open = batchCases(b).filter(function (c) { return ASSIGNABLE.indexOf(c.status) >= 0; });
        if (!open.length) throw new Err('errors.nothingToAssign');
        var types = U.uniq([].concat.apply([], open.map(function (c) { return c.inquiryTypes || []; })));
        var buckets = U.uniq(open.map(function (c) { return c.bucket; }).filter(Boolean));
        var groups;
        if (mode === 'single') {
          if (!assignments.all) throw new Err('wf.err.providerRequired');
          groups = [{ key: 'all', cases: open, providerId: assignments.all }];
        } else {
          var byGov = U.groupBy(open, function (c) { return D.caseGov(c); });
          groups = Object.keys(byGov).map(function (g) {
            if (!assignments[g]) throw new Err('errors.groupWithoutProvider', { gov: g });
            return { key: g, cases: byGov[g], providerId: assignments[g] };
          });
        }
        groups.forEach(function (g) {
          var demand = {};
          g.cases.forEach(function (c) { var gv = D.caseGov(c); demand[gv] = (demand[gv] || 0) + 1; });
          var el = S.marketplace._eligible({ service: b.service, demand: demand, places: placesOf(g.cases), inquiryTypes: types.length ? types : null, buckets: buckets });
          if (!el.providers.some(function (p) { return p.id === g.providerId; })) throw new Err('errors.providerNotEligible');
          if (g.cases.some(function (c) { return (c.declinedProviderIds || []).indexOf(g.providerId) >= 0; })) throw new Err('wf.err.providerDeclined');
        });
        b.assignMode = b.assignMode || mode;
        groups.forEach(function (g) {
          var p = E.providerById(g.providerId);
          var subs = g.cases.map(function (c) { return c.status === 'draft' ? E.transition(c, 'submit', {}, a, { silent: true }) : c; });
          var o = S.offers._create(p, subs, b.id, g.key);
          subs.forEach(function (c) { E.transition(c, 'send_offer', { providerId: p.id, offerId: o.id, price: D.priceFor(db, p, c) }, a, { silent: true }); });
          E.notify(E.providerManagers(p.id), 'notif.offer_new', { count: subs.length }, 'provider:offers');
          b.groups = b.groups.filter(function (x) { return x.key !== g.key; }).concat([{ key: g.key, governorates: U.uniq(subs.map(function (c) { return D.caseGov(c); })), providerId: p.id, offerId: o.id, caseIds: subs.map(function (c) { return c.id; }) }]);
        });
        E.audit('batch.assigned', 'batch', b.id, b.ref, null, { mode: mode, groups: groups.map(function (g) { return g.key + ':' + g.providerId; }) }, null, a);
        return b;
      });
    },
    list: function () {
      return E.run(function () {
        var a = E.actor();
        return E.db().batches.filter(function (b) { return canSeeBatch(b, a); }).map(batchRow).sort(function (x, y) { return y.createdAt - x.createdAt; });
      });
    },
    get: function (id) {
      return E.run(function () {
        var a = E.actor(), b = mustBatch(id, a), now = E.now();
        var cases = batchCases(b);
        var row = batchRow(b);
        row.cases = cases.map(function (c) { return S.cases._decorate(c, a, now); }).filter(Boolean);
        row.offers = E.db().offers.filter(function (o) { return o.batchId === b.id; }).map(function (o) {
          var p = E.providerById(o.providerId); return Object.assign({}, o, { providerName: p.name, remaining: o.expiresAt - now });
        });
        row.rateProviders = wf.batch.ratedProviders(cases).map(function (pid) { var p = E.providerById(pid); return { id: pid, name: p.name, cases: cases.filter(function (c) { return c.providerId === pid && c.status === 'closed'; }).length }; });
        row.ratings = E.db().ratings.filter(function (r) { return r.batchId === b.id; });
        row.assignable = cases.filter(function (c) { return ASSIGNABLE.indexOf(c.status) >= 0; }).length;
        row.delivered = cases.filter(function (c) { return c.status === 'delivered'; }).length;
        return row;
      });
    },
    acceptAllDelivered: function (id) {
      return E.mutate(function () {
        var a = E.actor(), b = mustBatch(id, a), n = 0;
        batchCases(b).forEach(function (c) {
          if (c.status !== 'delivered') return;
          c = E.transition(c, 'accept_report', {}, a);
          E.transition(c, 'close', {}, a, { silent: true });
          n++;
        });
        return { accepted: n };
      });
    },
    close: function (id, ratings, caseFlags) {
      return E.mutate(function (db) {
        var a = E.actor(), b = mustBatch(id, a);
        if (!wf.isEntityRole(a.role)) throw new Err('errors.forbidden');
        var cases = batchCases(b);
        var err = wf.batch.checkClose(b, cases, ratings || []);
        if (err) throw new Err(err);
        var now = E.now();
        (ratings || []).forEach(function (r) {
          if (!cases.some(function (c) { return c.providerId === r.providerId && c.status === 'closed'; })) return;
          var rating = S.ratings._build({ providerId: r.providerId, entityId: b.entityId, service: b.service, caseId: null, caseRef: b.ref, batchId: b.id, values: r, by: a });
          db.ratings.push(rating);
          b.ratingIds.push(rating.id);
          cases.forEach(function (c) { if (c.providerId === r.providerId) E.replaceCase(Object.assign({}, E.caseById(c.id), { ratingId: rating.id })); });
          E.notify(D.providerUsers(db, r.providerId, ['provider_admin', 'provider_supervisor', 'freelancer']), 'notif.rating_received', { stars: rating.overall }, 'provider:ratings');
        });
        b.caseFlags = (caseFlags || []).filter(function (f) { return f.note && b.caseIds.indexOf(f.caseId) >= 0; });
        b.closedAt = now;
        E.audit('batch.closed', 'batch', b.id, b.ref, null, { ratings: b.ratingIds.length, flags: b.caseFlags.length }, null, a);
        return b;
      });
    },
    /** Demo helper: drive every open case of a batch through the real workflow. */
    _simulate: function (id) {
      return E.mutate(function (db) {
        E.requireRole(['platform_admin']);
        var b = E.batchById(id);
        if (!b) throw new Err('errors.notFound');
        var advanced = 0, now = E.now();
        function user(pid, role) { return D.actorOf(db.users.filter(function (u) { return u.providerId === pid && (u.role === role || u.role === 'freelancer'); })[0]); }
        function qa() { return D.actorOf(E.qa()[0]); }
        batchCases(b).forEach(function (c) {
          var start = c.status;
          var guard = 0;
          while (!wf.isTerminal(c.status) && guard++ < 12) {
            var p = c.providerId ? E.providerById(c.providerId) : null;
            if (c.status === 'awaiting_acceptance') {
              var o = E.offerById(c.offerId);
              c = E.transition(c, 'accept', {}, user(p.id, 'provider_admin'), { silent: true });
              if (o && o.status === 'pending') { o.status = 'accepted'; o.respondedAt = now; }
            } else if (c.status === 'accepted' || c.status === 'rework_requested') {
              var ag = db.agents.filter(function (x) { return x.providerId === p.id && x.active && x.services.indexOf(c.service) >= 0; })
                .sort(function (x, y) { return (x.governorates.indexOf(c.governorate) >= 0 ? 0 : 1) - (y.governorates.indexOf(c.governorate) >= 0 ? 0 : 1); })[0];
              c = E.transition(c, 'assign', { agentId: ag.id }, user(p.id, 'provider_supervisor'), { silent: true });
            } else if (c.status === 'assigned' && c.service === 'investigation') {
              var agA = D.actorOf(D.agentUser(db, c.agentId));
              c = E.transition(c, 'check_in', { checkIn: Object.assign(D.simulateCheckIn(c, now), { distanceM: 40 }) }, agA, { silent: true });
            } else if (c.status === 'in_field' || c.status === 'returned_to_agent') {
              var agB = D.actorOf(D.agentUser(db, c.agentId));
              if (c.status === 'returned_to_agent') c = E.transition(c, 'resume', {}, agB, { silent: true });
              var photos = [];
              var slots = wf.reports.photoSlots(c.inquiryTypes);
              for (var i = 0; i < D.minPhotos(db, c); i++) photos.push({ id: U.uid('ph'), at: now, lat: c.checkIn.lat, lng: c.checkIn.lng, placeholder: true, label: slots[i % slots.length] || 'building' });
              var report = {};
              c.inquiryTypes.forEach(function (t) {
                report[t] = wf.reports.sample(t, c, now) || {
                  employment: { employerConfirmed: 'yes', jobTitle: 'Accountant', tenureYears: 3, hrContact: 'HR office', salaryConfirmed: 'yes' },
                  guarantor: { guarantorFound: 'yes', willingToGuarantee: 'yes', relationship: 'family' } }[t];
              });
              c = E.replaceCase(Object.assign({}, c, { photos: (c.photos || []).length >= photos.length ? c.photos : photos, report: report }));
              c = E.transition(c, 'submit_report', {}, agB, { silent: true });
            } else if (c.status === 'submitted_for_review') {
              c = E.transition(c, 'approve', {}, p.kind === 'freelancer' ? qa() : user(p.id, 'provider_supervisor'), { silent: true });
            } else if (c.status === 'delivered') {
              break; // the entity accepts reports itself
            } else if (c.status === 'assigned' && c.service === 'collection') {
              c = E.transition(c, 'start', {}, D.actorOf(D.agentUser(db, c.agentId)), { silent: true });
            } else if (c.status === 'active') {
              var agC = D.actorOf(D.agentUser(db, c.agentId));
              var out = wf.collection.outstanding(c);
              if (out > 0) { c = E.replaceCase(wf.collection.addPayment(c, agC, now, { amount: out, method: 'bank_transfer' })); }
              c = E.transition(c, 'close', { outcome: 'fully_recovered' }, user(p.id, 'provider_supervisor'), { silent: true });
            } else if (c.status === 'awaiting_entity_approval') {
              break;
            } else {
              break;
            }
          }
          if (c.status !== start) advanced++;
        });
        E.notify(E.entityUsers({ entityId: b.entityId, service: b.service }), 'notif.batch_progress', { ref: b.ref }, 'batch:' + b.id);
        return { advanced: advanced };
      });
    }
  };
})();
