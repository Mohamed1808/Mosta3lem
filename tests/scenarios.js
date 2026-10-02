/* Headless run of the acceptance scenarios against the service layer:
     node tests/scenarios.js
   Each scenario switches users exactly as a tester would with the header switcher. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const files = ['js/core/util.js', 'js/core/i18n.js', 'js/config/platform.js', 'js/config/geo.js', 'js/config/services.js', 'js/config/ratings.js', 'js/config/status.js', 'js/config/defaults.js', 'js/config/forms.js', 'js/config/reportForms.js',
  'js/workflow/common.js', 'js/workflow/validation.js', 'js/workflow/investigation.js', 'js/workflow/collection.js', 'js/workflow/batch.js', 'js/workflow/sla.js', 'js/workflow/masking.js', 'js/workflow/scoring.js', 'js/workflow/registration.js', 'js/workflow/reports.js',
  'js/store/store.js', 'js/store/domain.js', 'js/store/seed.js',
  'js/services/engine.js', 'js/services/contracts.js', 'js/services/core.js', 'js/services/cases.js', 'js/services/batches.js', 'js/services/providers.js', 'js/services/ratings.js', 'js/services/billing.js', 'js/services/registration.js', 'js/services/exports.js', 'js/services/index.js'];
const mem = {};
const ctx = { console, Intl, Date, Math, JSON, setTimeout, clearTimeout, Promise };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
ctx.document = { documentElement: {} };
vm.createContext(ctx);
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const ICM = ctx.ICM, S = ICM.services;
ICM.store.load();

const H = 3600e3, D = 24 * H;
const results = [];
let current = null;
function ok(cond, msg) { if (!cond) throw new Error(msg); current.steps.push(msg); }
async function scenario(name, fn) {
  current = { name, steps: [], ok: true };
  try { await fn(); } catch (e) { current.ok = false; current.error = (e.key || e.message) + (e.params ? ' ' + JSON.stringify(e.params) : ''); }
  results.push(current);
}
function uid(name) { const u = ICM.store.db.users.find((x) => x.name === name); if (!u) throw new Error('no user ' + name); return u.id; }
async function as(name) { await S.auth.loginAs(uid(name)); }
function usersOf(pid, role) { return ICM.store.db.users.filter((u) => u.providerId === pid && u.role === role); }
async function as_id(id) { await S.auth.loginAs(id); }
const pad = (n) => String(n).padStart(2, '0');
function localIn(h) { const d = new Date(ICM.clock.now() + h * H); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function dateIn(days) { return localIn(days * 24).slice(0, 10); }
const addr = (gov) => ({ governorate: gov, city: 'Dokki', street: '12 Tahrir St', landmark: 'Near the metro' });
const invValues = (gov) => ({ fullName: 'Hossam Adel Mahmoud', nationalId: '29003150112345', mobile: '01012345678', inquiryTypes: ['residence'], home: addr(gov), instructions: 'Visit after 5 pm', deadline: localIn(48), internalRef: 'T-1' });
// A complete Residence report (client template) for the case, as an agent would fill it.
const goodResidence = (caseId) => ICM.wf.reports.sample('residence', ICM.store.db.cases.find((x) => x.id === caseId), ICM.clock.now(), ICM.util.prng(9).next);
const PHOTO = 'data:image/jpeg;base64,AAAA';
function score(pid, svc) { return ICM.store.db.scores[pid].byService[svc]; }
function notifs(userId, key) { return ICM.store.db.notifications.filter((n) => n.userId === userId && n.key === key); }

async function runInvestigation(caseId, providerId, opts) {
  opts = opts || {};
  const p = ICM.store.db.providers.find((x) => x.id === providerId);
  if (p.kind === 'freelancer') {
    await as_id(usersOf(providerId, 'freelancer')[0].id);
  } else {
    await as_id(usersOf(providerId, 'provider_admin')[0].id);
  }
  const inbox = await S.offers.inbox('investigation');
  const offer = inbox.find((o) => o.caseIds.includes(caseId));
  ok(offer && offer.cases[0].masked === true && offer.cases[0].customer.name === null, 'provider sees only masked data in the offer');
  await S.offers.accept(offer.id);
  let d = await S.cases.get(caseId);
  ok(d.case.masked === false && d.case.customer.name, 'full data appears after acceptance');
  let agentUser;
  if (p.kind === 'freelancer') {
    ok(d.case.status === 'assigned', 'freelancer is assigned automatically');
    agentUser = usersOf(providerId, 'freelancer')[0];
  } else {
    await as_id(usersOf(providerId, 'provider_supervisor')[0].id);
    const team = await S.providers.team('investigation');
    const ag = team.find((a) => a.active);
    await S.cases.assign([caseId], ag.id);
    agentUser = ICM.store.db.users.find((u) => u.id === ag.userId);
    ok(true, 'supervisor assigns ' + ag.name);
  }
  await as_id(agentUser.id);
  let fail = null;
  try { await S.cases.transition(caseId, 'submit_report'); } catch (e) { fail = e.key; }
  ok(fail === 'wf.err.invalidState', 'report submission blocked before check-in');
  const ci = await S.cases.checkIn(caseId);
  ok(ci.status === 'in_field' && ci.checkIn.distanceM >= 0, 'agent checks in ' + ci.checkIn.distanceM + ' m from address');
  for (let i = 0; i < 3; i++) await S.cases.addPhoto(caseId, PHOTO);
  await S.cases.saveReport(caseId, 'residence', goodResidence(caseId));
  await S.cases.transition(caseId, 'submit_report');
  ok(true, 'agent submits report with 3 photos');
  return agentUser;
}

(async function main() {
  // ---------------------------------------------------------------- 1
  await scenario('1. Investigation happy path', async () => {
    await as('Tamer Lotfy');
    const c = await S.cases.createDraft('investigation', invValues('giza'));
    const m = await S.marketplace.eligible({ service: 'investigation', demand: { giza: 1 }, inquiryTypes: ['residence'], caseId: c.id });
    const best = m.providers.slice().sort((a, b) => (b.score || 0) - (a.score || 0)).filter((p) => p.kind === 'company')[0];
    ok(m.providers.length > 1, 'marketplace lists ' + m.providers.length + ' eligible providers');
    await S.cases.sendOffer(c.id, best.id);
    ok(true, 'offer sent to ' + best.name);
    const before = score(best.id, 'investigation').score;
    await runInvestigation(c.id, best.id);
    await as_id(usersOf(best.id, 'provider_supervisor')[0].id);
    const q = await S.cases.reviewQueue();
    ok(q.some((x) => x.id === c.id), 'report is in the supervisor review queue');
    await S.cases.transition(c.id, 'approve');
    await as('Tamer Lotfy');
    let d = await S.cases.get(c.id);
    ok(d.case.status === 'delivered' && d.actions.includes('accept_report'), 'entity sees delivered report');
    await S.cases.transition(c.id, 'accept_report');
    d = await S.cases.get(c.id);
    ok(d.case.status === 'closed' && d.canRate, 'case closed, rating available');
    await S.ratings.rateCase(c.id, { overall: 4, criteria: { accuracy: 4, evidence: 4, timeliness: 5, communication: 4 }, tags: ['accurate_report', 'fast_turnaround'], feedback: 'Good work.' });
    const after = score(best.id, 'investigation').score;
    ok(after !== before, 'provider score updated ' + before + ' -> ' + after);
  });

  // ---------------------------------------------------------------- 2
  await scenario('2. Rework loop', async () => {
    await as('Tamer Lotfy');
    const c = await S.cases.createDraft('investigation', invValues('cairo'));
    await S.cases.sendOffer(c.id, 'prv_sphinx');
    const agentUser = await runInvestigation(c.id, 'prv_sphinx');
    await as_id(usersOf('prv_sphinx', 'provider_supervisor')[0].id);
    await S.cases.transition(c.id, 'approve');
    const ftBefore = score('prv_sphinx', 'investigation').metrics.firstTime;
    await as('Tamer Lotfy');
    await S.cases.transition(c.id, 'request_rework', { reason: 'Neighbour confirmation missing' });
    const ftAfter = score('prv_sphinx', 'investigation').metrics.firstTime;
    ok(ftAfter < ftBefore, 'first-time acceptance rate drops ' + ftBefore.toFixed(4) + ' -> ' + ftAfter.toFixed(4));
    await as_id(usersOf('prv_sphinx', 'provider_supervisor')[0].id);
    const d0 = await S.cases.get(c.id);
    await S.cases.assign([c.id], d0.case.agentId);
    ok(true, 'supervisor sends the case back to the same agent');
    await as_id(agentUser.id);
    await S.cases.checkIn(c.id);
    await S.cases.transition(c.id, 'submit_report');
    await as_id(usersOf('prv_sphinx', 'provider_supervisor')[0].id);
    await S.cases.transition(c.id, 'approve');
    await as('Tamer Lotfy');
    const d = await S.cases.get(c.id);
    ok(d.case.status === 'delivered' && d.case.reworkCount === 1, 'resubmitted report delivered again');
  });

  // ---------------------------------------------------------------- 3
  await scenario('3. Offer expiry and auto-select', async () => {
    await as('Tamer Lotfy');
    const c = await S.cases.createDraft('investigation', invValues('giza'));
    await S.cases.sendOffer(c.id, 'prv_amana');
    await as('Laila Hosny');
    await S.demo.advance(5 * H);
    await as('Tamer Lotfy');
    let d = await S.cases.get(c.id);
    ok(d.case.status === 'expired', 'offer expired after 5 hours');
    ok(notifs(uid('Tamer Lotfy'), 'notif.offer_expired').length > 0, 'entity notified');
    const m = await S.marketplace.eligible({ service: 'investigation', demand: { giza: 1 }, inquiryTypes: ['residence'], caseId: c.id });
    await S.cases.sendOffer(c.id, m.providers[0].id);
    d = await S.cases.get(c.id);
    ok(d.case.status === 'awaiting_acceptance' && d.case.providerId === m.providers[0].id, 'auto-select best sent a new offer to ' + m.providers[0].name);
  });

  // ---------------------------------------------------------------- 4
  await scenario('4. Collection with settlement', async () => {
    await as('Youssef Kamel');
    const v = { fullName: 'Walid Samy Ibrahim', nationalId: '28807120112345', mobiles: ['01112223344'], home: addr('cairo'), contractNumber: 'CN-2025-77001', productType: 'auto_loan', originalAmount: 400000, overdueAmount: 40000, instalmentAmount: 11000, dpd: 48, allowedActions: ['calls', 'messages', 'visits'], settlementMode: 'discount', maxDiscountPct: 20, periodEnd: dateIn(30) };
    const c = await S.cases.createDraft('collection', v);
    await S.cases.sendOffer(c.id, 'prv_recovery');
    await as('Adel Morsy');
    const inbox = await S.offers.inbox('collection');
    const off = inbox.find((o) => o.caseIds.includes(c.id));
    ok(off.cases[0].overdueAmount === null && off.cases[0].amountRange, 'offer shows amount range only');
    await S.offers.accept(off.id);
    await as('Rehab Anwar');
    await S.cases.assign([c.id], 'ag_tarek_helmy');
    await as('Tarek Helmy');
    await S.cases.logAction(c.id, { type: 'call', note: 'Customer answered' });
    let d = await S.cases.get(c.id);
    ok(d.case.status === 'active', 'case goes Active on first action');
    await S.cases.addPromise(c.id, { amount: 10000, dueDate: dateIn(1) });
    await as('Laila Hosny');
    await S.demo.advance(3 * D);
    await as('Tarek Helmy');
    d = await S.cases.get(c.id);
    ok(d.case.promises[0].status === 'broken', 'promise flagged as broken after the clock passes its date');
    await S.cases.addPayment(c.id, { amount: 5000, method: 'cash' });
    await S.cases.requestSettlement(c.id, { kind: 'discount', discountPct: 15, note: 'Lump sum for the rest' });
    await as('Youssef Kamel');
    d = await S.cases.get(c.id);
    ok(d.case.status === 'awaiting_entity_approval' && d.actions.includes('approve_settlement'), 'entity sees settlement request');
    await S.cases.transition(c.id, 'approve_settlement', { note: 'OK' });
    await as('Tarek Helmy');
    d = await S.cases.get(c.id);
    ok(d.case.outstanding === 29000, 'outstanding after 15% discount: ' + d.case.outstanding);
    await S.cases.addPayment(c.id, { amount: d.case.outstanding, method: 'bank_transfer' });
    await as('Rehab Anwar');
    await S.cases.closeCollection(c.id, { outcome: 'fully_recovered' });
    await as('Youssef Kamel');
    d = await S.cases.get(c.id);
    ok(d.case.status === 'closed' && d.case.outcome === 'fully_recovered' && d.canRate, 'closed as Fully Recovered');
    await S.ratings.rateCase(c.id, { overall: 5, criteria: { conduct: 5, instructions: 5, updates: 4, results: 5 }, tags: ['strong_results'] });
    ok(true, 'entity rated the case');
  });

  // ---------------------------------------------------------------- 5
  await scenario('5. Bulk batch', async () => {
    await as('Tamer Lotfy');
    const govs = [['Giza', '21'], ['Cairo', '01'], ['Alexandria', '02']];
    let rows = [];
    for (let i = 0; i < 30; i++) {
      const g = govs[i % 3];
      rows.push({ rowNo: i + 2, excluded: false, raw: { full_name: 'Row Person ' + i, national_id: i === 4 ? '' : '2900101' + g[1] + String(1000 + i) + '1', mobile: i === 11 ? '0123' : '010' + String(10000000 + i), inquiry_types: 'residence', governorate: i === 19 ? 'Atlantis' : g[0], city: 'Dokki', street: '1 St', landmark: '' } });
    }
    rows = await S.batches.validateRows('investigation', rows);
    const bad = rows.filter((r) => !r.valid);
    ok(bad.length === 3, '3 invalid rows detected: ' + bad.map((r) => Object.values(r.errors).join(',')).join(' | '));
    rows[4].raw.national_id = '29001012112345';
    rows[11].raw.mobile = '01098765432';
    rows[19].raw.governorate = 'Giza';
    rows = await S.batches.validateRows('investigation', rows);
    ok(rows.every((r) => r.valid), 'rows fixed');
    const b = await S.batches.create('investigation', 'Test batch', rows);
    const plan = await S.batches.plan(b.id);
    ok(plan.groups.length === 3, 'batch split into ' + plan.groups.length + ' governorate groups');
    const assignments = {};
    plan.groups.forEach((g) => {
      const pick = g.eligible.providers.find((p) => p.id === (g.governorate === 'alexandria' ? 'prv_nile' : 'prv_sphinx')) || g.eligible.providers[0];
      assignments[g.governorate] = pick.id;
    });
    await S.batches.assign(b.id, 'split', assignments);
    const provs = new Set(Object.values(assignments));
    ok(provs.size === 2, 'split across 2 providers: ' + [...provs].join(', '));
    for (const pid of provs) {
      await as_id(usersOf(pid, 'provider_admin')[0].id);
      const inbox = await S.offers.inbox('investigation');
      for (const o of inbox.filter((o) => o.batchId === b.id && o.status === 'pending')) await S.offers.accept(o.id);
    }
    ok(true, 'providers accepted their batch offers as a whole');
    await as('Laila Hosny');
    const sim = await S.demo.simulateBatchWork(b.id);
    ok(sim.advanced === 30, 'field work processed for ' + sim.advanced + ' cases');
    await as('Tamer Lotfy');
    const acc = await S.batches.acceptAllDelivered(b.id);
    ok(acc.accepted === 30, 'entity accepted all delivered reports');
    let fail = null;
    try { await S.batches.close(b.id, []); } catch (e) { fail = e.key; }
    ok(fail === 'wf.err.ratingRequired', 'closing without rating is refused');
    const bd = await S.batches.get(b.id);
    await S.batches.close(b.id, bd.rateProviders.map((p) => ({ providerId: p.id, overall: 4, criteria: { accuracy: 4, evidence: 4, timeliness: 4, communication: 4 }, tags: [] })), [{ caseId: bd.cases[0].id, note: 'Photo angle poor' }]);
    const after = await S.batches.get(b.id);
    ok(after.closedAt && after.ratings.length === 2, 'batch closed with one rating per provider');
  });

  // ---------------------------------------------------------------- 6
  await scenario('6. Individual provider report goes to QA', async () => {
    await as('Tamer Lotfy');
    const c = await S.cases.createDraft('investigation', invValues('giza'));
    await S.cases.sendOffer(c.id, 'prv_fl_omar');
    await runInvestigation(c.id, 'prv_fl_omar');
    await as('Ziad Ezzat');
    const q = await S.cases.reviewQueue();
    ok(q.some((x) => x.id === c.id), 'report is in the platform QA queue');
    await as('Salma Reda');
    const sq = await S.cases.reviewQueue();
    ok(!sq.some((x) => x.id === c.id), 'not in any supervisor queue');
    await as('Ziad Ezzat');
    await S.cases.transition(c.id, 'approve');
    const d = await S.cases.get(c.id);
    ok(d.case.status === 'delivered', 'QA approved and delivered');
  });

  // ---------------------------------------------------------------- 7
  await scenario('7. Rating dispute upheld', async () => {
    await as('Fady Mikhail');
    const rs = await S.ratings.received('collection');
    const oneStar = rs.find((r) => r.overall === 1 && r.status === 'active' && !r.disputed);
    ok(!!oneStar, 'provider finds a 1-star rating');
    const before = score('prv_cairocollect', 'collection').score;
    const dsp = await S.disputes.open({ kind: 'rating', ratingId: oneStar.id, reason: 'rating_unfair', details: 'No complaint was ever raised.' });
    await as('Laila Hosny');
    await S.disputes.resolve(dsp.id, 'upheld', 'Evidence supports the provider.');
    const after = score('prv_cairocollect', 'collection').score;
    const r = ICM.store.db.ratings.find((x) => x.id === oneStar.id);
    ok(r.status === 'removed' && after > before, 'rating removed, score ' + before + ' -> ' + after);
  });

  // ---------------------------------------------------------------- 8
  await scenario('8. Automatic enforcement', async () => {
    await as('Laila Hosny');
    const cc = ICM.store.db.scores.prv_cairocollect.overall;
    await S.config.updateScoring({ suspendBelow: 50, reduceBelow: 55, warnBelow: 60 });
    const p = ICM.store.db.providers.find((x) => x.id === 'prv_cairocollect');
    ok(p.enforcement.level === 'suspended', 'Cairo Collect (score ' + cc + ') suspended automatically');
    await as('Youssef Kamel');
    const m = await S.marketplace.eligible({ service: 'collection', demand: { cairo: 1 }, buckets: ['b31_60'] });
    ok(!m.providers.some((x) => x.id === 'prv_cairocollect'), 'it disappears from the marketplace');
    await as('Laila Hosny');
    await S.config.updateScoring({ suspendBelow: 40, reduceBelow: 50, warnBelow: 60 });
  });

  // ---------------------------------------------------------------- 9
  await scenario('9. SLA breach', async () => {
    await as('Tamer Lotfy');
    const v = invValues('cairo'); v.deadline = localIn(20);
    const c = await S.cases.createDraft('investigation', v);
    await S.cases.sendOffer(c.id, 'prv_sphinx');
    await as('Hany Wagdy');
    const inbox = await S.offers.inbox('investigation');
    await S.offers.accept(inbox.find((o) => o.caseIds.includes(c.id)).id);
    await as('Laila Hosny');
    await S.demo.advance(17 * H);
    await as('Tamer Lotfy');
    let d = await S.cases.get(c.id);
    ok(d.case.sla === 'at_risk', 'case turns amber');
    ok(notifs(uid('Tamer Lotfy'), 'notif.sla_at_risk').some((n) => n.params.ref === d.case.ref), 'entity notified: at risk');
    await as('Laila Hosny');
    await S.demo.advance(4 * H);
    await as('Tamer Lotfy');
    d = await S.cases.get(c.id);
    ok(d.case.sla === 'breached', 'case turns red');
    const ref = d.case.ref;
    const got = (name) => notifs(uid(name), 'notif.sla_breached').some((n) => n.params.ref === ref);
    ok(got('Tamer Lotfy') && got('Hany Wagdy') && got('Laila Hosny'), 'entity, provider and admin notified of the breach');
  });

  // ---------------------------------------------------------------- 10
  const newCompany = {
    kind: 'company', services: ['investigation', 'collection'], companyName: 'Canal Field Partners', taxId: '482-615-903', commercialRegNo: '77410',
    mainPhone: '0643345566', companyEmail: 'info@canalfield.example', ownerName: 'Sherif Mansour', ownerPhone: '01066554433', ownerNationalId: '27805121912345',
    focalSame: false, focalName: 'Dina Abbas', focalTitle: 'Operations manager', focalPhone: '01266554433',
    addrGov: 'ismailia', addrCity: 'ismailia_city', addrStreet: '8 Sultan Hussein St', addrLandmark: 'Near the canal authority',
    coverage: { ismailia: [], port_said: ['port_fouad', 'el_sharq'], suez: [] }, docs: { commercial_register: 'cr.pdf' }, terms: true
  };
  await scenario('10. Provider registration: self sign-up and admin registration', async () => {
    await S.auth.logout();
    let fail = null;
    try { await S.registration.submit(Object.assign({}, newCompany, { terms: false })); } catch (e) { fail = e; }
    ok(fail && fail.key === 'errors.termsRequired' && fail.params.field === 'terms', 'sign-up blocked until the terms are accepted');
    const r = await S.registration.submit(newCompany);
    ok(/^REG-\d{4}-\d{5}$/.test(r.ref), 'application gets a reference ' + r.ref);
    let s = await S.auth.currentUser();
    ok(s.portal === 'applicant' && s.home === '#/application' && s.user.role === 'provider_admin', 'owner is signed in to the applicant portal');
    let app = await S.registration.mine();
    ok(app.verification.status === 'pending' && app.legal.taxId === '482615903' && app.focalPoint.name === 'Dina Abbas', 'tax ID, commercial registration, owner and focal point stored');
    ok(app.coverageCities.port_said.join() === 'port_fouad,el_sharq' && app.coverageCities.ismailia.length === 0, 'coverage keeps governorates and cities');
    ok(app.verification.documents.find((d) => d.type === 'tax_card').status === 'missing', 'documents not attached are marked missing');
    ok(notifs(uid('Laila Hosny'), 'notif.application_new').some((n) => n.params.name === 'Canal Field Partners'), 'platform admin notified of the application');
    await S.auth.logout();
    fail = null;
    try { await S.registration.submit(Object.assign({}, newCompany, { ownerPhone: '01099887766' })); } catch (e) { fail = e; }
    ok(fail && fail.key === 'errors.taxIdTaken' && fail.params.field === 'taxId', 'a second company with the same tax ID is refused');

    await as('Laila Hosny');
    await S.providers.requestInfo(r.providerId, 'Please attach the tax card.');
    await as('Sherif Mansour');
    ok(notifs(uid('Sherif Mansour'), 'notif.application_info_requested').length === 1, 'applicant notified of the request');
    await S.registration.uploadDocument('tax_card', 'tax-card.pdf');
    await S.registration.resubmit('Tax card attached.');
    app = await S.registration.mine();
    ok(app.verification.status === 'pending', 'applicant answers and the application returns to review');
    await as('Laila Hosny');
    await S.providers.verify(r.providerId);
    await as('Sherif Mansour');
    s = await S.auth.currentUser();
    ok(s.portal === 'provider' && s.home === '#/provider/investigation', 'after verification the owner opens the provider portal');

    const ind = {
      kind: 'individual', services: ['investigation'], fullName: 'Youssef Hamdy Salem', nationalId: '29406152112345', phone: '01555443322',
      addrGov: 'giza', addrCity: 'faisal', addrStreet: '22 Faisal St', coverage: { giza: ['faisal', 'haram'] }
    };
    await as('Laila Hosny');
    const r2 = await S.registration.adminRegister(ind, { verifyNow: true });
    ok(r2.status === 'verified', 'admin registers an individual and verifies on the spot');
    const fu = ICM.store.db.users.find((u) => u.id === r2.userId);
    const fa = ICM.store.db.agents.find((a) => a.id === fu.agentId);
    ok(fu.role === 'freelancer' && fa && fa.coverageCities.giza.join() === 'faisal,haram', 'individual gets a login and a field agent record with city coverage');
    ok(ICM.store.db.providers.find((p) => p.id === r2.providerId).registration.source === 'admin', 'registration source recorded as admin');
  });

  // ---------------------------------------------------------------- 11
  await scenario('11. Company team hierarchy: owner, supervisors, field agents', async () => {
    await as('Sherif Mansour');
    const s1 = await S.team.addSupervisor({ name: 'Hala Fikry', phone: '01033221100', services: ['investigation'] });
    const s2 = await S.team.addSupervisor({ name: 'Omar Zaki', phone: '01133221100', services: ['collection'] });
    ok(s1.role === 'provider_supervisor' && s2.role === 'provider_supervisor', 'owner adds two supervisors');
    const a1 = await S.team.addAgent({ name: 'Karim Adel Nour', phone: '01233221100', nationalId: '29502141912345', services: ['investigation'], coverage: { ismailia: [] }, supervisorId: s1.id });
    ok(a1.supervisorId === s1.id, 'owner adds a field agent under the first supervisor');
    let fail = null;
    try { await S.team.addAgent({ name: 'Nader Samir Aly', phone: '01533221100', nationalId: '29502141912346', services: ['investigation'], coverage: { cairo: [] }, supervisorId: s1.id }); } catch (e) { fail = e.key; }
    ok(fail === 'errors.outsideCompanyCoverage', 'agents cannot cover areas outside the company coverage');
    fail = null;
    try { await S.team.addAgent({ name: 'Nader Samir Aly', phone: '01233221100', nationalId: '29502141912346', services: ['investigation'], coverage: { suez: [] }, supervisorId: s1.id }); } catch (e) { fail = e.key; }
    ok(fail === 'errors.phoneTaken', 'a mobile number can only belong to one person');
    fail = null;
    try { await S.team.addAgent({ name: 'Nader Samir Aly', phone: '01533221100', nationalId: '29502141912346', services: ['investigation'], coverage: { suez: [] } }); } catch (e) { fail = e.key; }
    ok(fail === 'errors.supervisorRequired', 'every field agent needs a supervisor');

    await as('Omar Zaki');
    const a2 = await S.team.addAgent({ name: 'Tamer Wagih Fouad', phone: '01533221100', nationalId: '29502141912346', services: ['collection'], coverage: { port_said: ['port_fouad'] } });
    ok(a2.supervisorId === s2.id, 'a supervisor adds an agent, who reports to them automatically');
    let st = await S.team.structure();
    ok(st.supervisors.length === 1 && st.supervisors[0].id === s2.id && !st.canManage, 'a supervisor sees only their own team');
    fail = null;
    try { await S.team.setActive(a1.id, false); } catch (e) { fail = e.key; }
    ok(fail === 'errors.notYourAgent', 'a supervisor cannot manage another supervisor\'s agent');

    await as('Sherif Mansour');
    await S.team.moveAgent(a2.id, s1.id);
    st = await S.team.structure();
    ok(st.supervisors.find((x) => x.id === s1.id).agents.length === 2 && st.supervisors.find((x) => x.id === s2.id).agents.length === 0, 'owner moves an agent to another supervisor');
    fail = null;
    try { await S.team.setActive(s1.id, false); } catch (e) { fail = e.key; }
    ok(fail === 'errors.supervisorHasAgents', 'a supervisor with active agents cannot be deactivated');

    // Scope in an existing company: Recovery Partners has two supervisors.
    await as('Rehab Anwar');
    const team = await S.providers.team('collection');
    ok(team.map((a) => a.name).sort().join() === 'Tarek Helmy,Yasser Fawzy', 'Rehab sees only her field agents for assignment');
    const col = ICM.store.db.cases.find((c) => c.providerId === 'prv_recovery' && c.status === 'accepted');
    if (col) {
      fail = null;
      try { await S.cases.assign([col.id], 'ag_mahmoud_saad'); } catch (e) { fail = e.key; }
      ok(fail === 'errors.notYourAgent', 'Rehab cannot assign to an agent of Khaled Samy');
      await as('Adel Morsy');
      await S.cases.assign([col.id], 'ag_mahmoud_saad');
      ok(true, 'the owner can assign to any agent');
    }

    // Reports go to the agent's own supervisor.
    await as('Hany Wagdy');
    const sup2 = await S.team.addSupervisor({ name: 'Mervat Lotfy', phone: '01011112222', services: ['investigation'] });
    await S.team.moveAgent('ag_amr_saeed', sup2.id);
    await as('Tamer Lotfy');
    const c = await S.cases.createDraft('investigation', invValues('giza'));
    await S.cases.sendOffer(c.id, 'prv_sphinx');
    await as('Hany Wagdy');
    const inbox = await S.offers.inbox('investigation');
    await S.offers.accept(inbox.find((o) => o.caseIds.includes(c.id)).id);
    await as('Salma Reda');
    fail = null;
    try { await S.cases.assign([c.id], 'ag_amr_saeed'); } catch (e) { fail = e.key; }
    ok(fail === 'errors.notYourAgent', 'Salma cannot assign Amr after he moved to Mervat');
    await as('Mervat Lotfy');
    await S.cases.assign([c.id], 'ag_amr_saeed');
    await as('Amr Saeed');
    await S.cases.checkIn(c.id);
    for (let i = 0; i < 3; i++) await S.cases.addPhoto(c.id, PHOTO);
    await S.cases.saveReport(c.id, 'residence', goodResidence(c.id));
    await S.cases.transition(c.id, 'submit_report');
    const ref = (await S.cases.get(c.id)).case.ref;
    const got = (name) => notifs(uid(name), 'notif.report_submitted').some((n) => n.params.ref === ref);
    ok(got('Mervat Lotfy') && got('Hany Wagdy') && !got('Salma Reda'), 'report notification goes to Mervat and the owner, not Salma');
    await as('Salma Reda');
    ok(!(await S.cases.reviewQueue()).some((x) => x.id === c.id), 'Salma does not see it in her review queue');
    fail = null;
    try { await S.cases.transition(c.id, 'approve'); } catch (e) { fail = e.key; }
    ok(fail === 'errors.notYourAgent', 'Salma cannot approve it');
    await as('Mervat Lotfy');
    ok((await S.cases.reviewQueue()).some((x) => x.id === c.id), 'Mervat sees it and can review');
    await S.cases.transition(c.id, 'approve');
    ok((await S.cases.get(c.id)).case.status === 'delivered', 'Mervat approves and the report is delivered');
  });

  // ---------------------------------------------------------------- 12
  await scenario('12. Residence and Business templates: OCR, report, decision and Excel export', async () => {
    await as('Tamer Lotfy');
    const v = Object.assign(invValues('cairo'), {
      inquiryTypes: ['residence', 'business'], accountNumber: '3118007', telephone: '0233456789',
      business: { governorate: 'cairo', city: 'Nasr City', street: '4 Abbas El Akkad St', landmark: 'Near the mall' },
      businessName: 'Delta Print House', businessPhone: '0224445566', orderNumber: 'ORD-55120'
    });
    const c = await S.cases.createDraft('investigation', v);
    await S.cases.sendOffer(c.id, 'prv_sphinx');
    await as('Hany Wagdy');
    const off = (await S.offers.inbox('investigation')).find((o) => o.caseIds.includes(c.id));
    ok(off.cases[0].accountNumber === null && off.cases[0].businessName === null, 'account number and company stay hidden before acceptance');
    await S.offers.accept(off.id);
    await as('Salma Reda');
    await S.cases.assign([c.id], 'ag_mostafa_ali');
    await as('Mostafa Ali');
    let fail = null;
    try { await S.cases.scanDocument(c.id, 'national_id_card'); } catch (e) { fail = e.key; }
    ok(fail === 'errors.checkInFirst', 'documents can only be scanned after check-in');
    await S.cases.checkIn(c.id);
    const idScan = await S.cases.scanDocument(c.id, 'national_id_card');
    ok(idScan.fields.idName === v.fullName && idScan.fields.idNationalId === v.nationalId, 'ID card OCR reads the customer name and national ID');
    const crScan = await S.cases.scanDocument(c.id, 'commercial_register_extract');
    ok(crScan.fields.tradeName === 'Delta Print House' && crScan.fields.commercialRegister, 'commercial register OCR fills the register fields');
    const home = Object.assign(goodResidence(c.id), idScan.fields, { maritalStatus: 'MARRIED', spouseName: '', title: 'Mr' });
    await S.cases.saveReport(c.id, 'residence', home);
    let d = await S.cases.get(c.id);
    ok(Object.keys(ICM.wf.reports.validate(ICM.config.REPORT_FORMS.residence, d.case.report.residence)).join() === 'spouseName', 'a married customer needs the spouse name');
    await S.cases.saveReport(c.id, 'residence', Object.assign(home, { spouseName: 'Hala Samir', streetAllowsCars: 'no' }));
    const biz = Object.assign(ICM.wf.reports.sample('business', ICM.store.db.cases.find((x) => x.id === c.id), ICM.clock.now(), ICM.util.prng(21).next), crScan.fields, { maleWorkers: 9, femaleWorkers: 4, mainCenterOwnership: 'RENTED' });
    await S.cases.saveReport(c.id, 'business', biz);
    d = await S.cases.get(c.id);
    ok(d.case.report.business.numberOfWorkers === 13 && d.case.report.residence.age > 0, 'total workers and age are calculated');
    for (const slot of ['building', 'entrance', 'door']) await S.cases.addPhoto(c.id, PHOTO, slot);
    ok((await S.cases.get(c.id)).case.photos.map((p) => p.label).join() === 'building,entrance,door', 'photos are stored against their slots');
    await S.cases.transition(c.id, 'submit_report');
    await as('Tamer Lotfy');
    fail = null;
    try { await S.cases.setClientDecision(c.id, 'APPROVED'); } catch (e) { fail = e.key; }
    ok(fail === 'errors.decisionAfterDelivery', 'the bank decides only after delivery');
    await as('Salma Reda');
    await S.cases.transition(c.id, 'approve');
    await as('Tamer Lotfy');
    await S.cases.setClientDecision(c.id, 'REJECTED', 'Income below policy');
    ok((await S.cases.get(c.id)).case.clientDecision.value === 'REJECTED', 'bank records its credit decision');

    const sheets = await S.exports.investigations({});
    const [hs, cs] = sheets;
    ok(hs.sheet === 'DRIVE_HOME_INVESTIGATION' && cs.sheet === 'DRIVE_CORP_INVESTIGATION' && hs.headers.length === 68 && cs.headers.length === 68, 'export has both template sheets with 68 headers each');
    const col = (sh, ref, name) => sh.rows.find((r) => r[0] === ref)[sh.headers.indexOf(name)];
    ok(col(hs, d.case.ref, 'ACCOUNT_NUMBER') === '3118007' && col(hs, d.case.ref, 'NAME') === v.fullName && col(hs, d.case.ref, 'NICK_NAME') === 'Mr', 'request and ID card values land in their columns');
    ok(col(hs, d.case.ref, 'MARITAL_STATUS') === 'MARRIED' && col(hs, d.case.ref, 'NAME_OF_THE_CLIENT_WIFE') === 'Hala Samir' && col(hs, d.case.ref, 'STREET_ALLOWS_CARS_TO_PASS') === 0, 'answers use the template codes');
    ok(col(hs, d.case.ref, 'Final Decision Home') === 'REJECTED' && col(hs, d.case.ref, 'STATUS') === 'COMPLETED' && col(hs, d.case.ref, 'IS_FINAL') === 1, 'status and the bank decision are filled');
    ok(/^\d{4}-\d{2}-\d{2}$/.test(col(hs, d.case.ref, 'VISIT_DATE')) && col(hs, d.case.ref, 'LATITUDE') !== '' && col(hs, d.case.ref, 'LOCATION_ACCURACY') > 0, 'visit date, time and GPS come from the check-in');
    ok(col(cs, d.case.ref, 'NUMBER_OF_WORKERS') === 13 && col(cs, d.case.ref, 'MAIN_CENTER').indexOf('RENTED') === 0 && col(cs, d.case.ref, 'COMPANY_NAME') === 'Delta Print House', 'business answers and request fields are exported');
    ok(col(cs, d.case.ref, 'ORDER_NUMBER') === 'ORD-55120' && col(cs, d.case.ref, 'SIGNATURE_OF_THE_WORK_VISI3729') === 'SIGNED' && col(cs, d.case.ref, 'Review Status') === 'APPROVED', 'order number, signature and review status are exported');
    await as('Hany Wagdy');
    fail = null;
    try { await S.exports.investigations({}); } catch (e) { fail = e.key; }
    ok(fail === 'errors.forbidden', 'providers cannot export the bank\'s results');
  });

  // ---------------------------------------------------------------- report
  const missing = S.verify();
  results.forEach((r) => {
    console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name);
    r.steps.forEach((s) => console.log('     - ' + s));
    if (!r.ok) console.log('     ! ' + r.error);
  });
  console.log('contracts missing: ' + (missing.length ? missing.join(', ') : 'none'));
  process.exit(results.every((r) => r.ok) && !missing.length ? 0 : 1);
})();
