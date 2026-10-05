/* Headless run of the acceptance scenarios against the service layer:
     node tests/scenarios.js
   Each scenario switches users exactly as a tester would with the header switcher. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const files = ['js/core/util.js', 'js/core/i18n.js', 'js/i18n/en.js', 'js/i18n/ar.js', 'js/i18n/registration.en.js', 'js/i18n/registration.ar.js', 'js/i18n/investigation.en.js', 'js/i18n/investigation.ar.js', 'js/config/platform.js', 'js/config/geo.js', 'js/config/services.js', 'js/config/ratings.js', 'js/config/status.js', 'js/config/defaults.js', 'js/config/forms.js', 'js/config/reportForms.js',
  'js/workflow/common.js', 'js/workflow/validation.js', 'js/workflow/investigation.js', 'js/workflow/collection.js', 'js/workflow/batch.js', 'js/workflow/sla.js', 'js/workflow/masking.js', 'js/workflow/scoring.js', 'js/workflow/registration.js', 'js/workflow/settings.js', 'js/workflow/reports.js',
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
    await S.cases.sendOffer(c.id, 'prv_fl_omar');
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
      const pick = g.eligible.providers.find((p) => p.id === (g.governorate === 'giza' ? 'prv_fl_omar' : 'prv_sphinx')) || g.eligible.providers[0];
      assignments[g.governorate] = pick.id;
    });
    await S.batches.assign(b.id, 'split', assignments);
    const provs = new Set(Object.values(assignments));
    ok(provs.size === 2, 'split across 2 providers: ' + [...provs].join(', '));
    for (const pid of provs) {
      await as_id((usersOf(pid, 'provider_admin')[0] || usersOf(pid, 'freelancer')[0]).id);
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
    await as('Adel Morsy');
    const rs = await S.ratings.received('collection');
    const oneStar = rs.find((r) => r.overall === 1 && r.status === 'active' && !r.disputed);
    ok(!!oneStar, 'provider finds a 1-star rating');
    const before = score('prv_recovery', 'collection').score;
    const dsp = await S.disputes.open({ kind: 'rating', ratingId: oneStar.id, reason: 'rating_unfair', details: 'No complaint was ever raised.' });
    await as('Nermine Saad');
    await S.disputes.propose(dsp.id, 'upheld', 'Evidence supports the provider.');
    await as('Karim Fawzy');
    await S.disputes.confirm(dsp.id);
    const after = score('prv_recovery', 'collection').score;
    const r = ICM.store.db.ratings.find((x) => x.id === oneStar.id);
    ok(r.status === 'removed' && after > before, 'rating removed, score ' + before + ' -> ' + after);
  });

  // ---------------------------------------------------------------- 8
  await scenario('8. Automatic enforcement', async () => {
    await as('Laila Hosny');
    const cc = ICM.store.db.scores.prv_recovery.overall;
    await S.config.updateScoring({ suspendBelow: 85, reduceBelow: 90, warnBelow: 95 });
    const p = ICM.store.db.providers.find((x) => x.id === 'prv_recovery');
    ok(p.enforcement.level === 'suspended', 'Recovery Partners (score ' + cc + ') suspended automatically');
    await as('Youssef Kamel');
    const m = await S.marketplace.eligible({ service: 'collection', demand: { cairo: 1 }, buckets: ['b31_60'] });
    ok(!m.providers.some((x) => x.id === 'prv_recovery'), 'it disappears from the marketplace');
    await as('Laila Hosny');
    await S.config.updateScoring({ suspendBelow: 40, reduceBelow: 50, warnBelow: 60 });
    await S.providers.setAutomatic('prv_recovery');
    ok(ICM.store.db.providers.find((x) => x.id === 'prv_recovery').enforcement.level === 'none', 'back in good standing once the thresholds are restored');
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
    ok(app.canEdit === false, 'details are locked while the platform reviews them');
    app = await S.registration.mine();
    ok(app.canEdit === true && app.verification.status === 'info_requested', 'details open for changes after a request for information');
    await S.registration.uploadDocument('tax_card', 'tax-card.pdf');
    await S.registration.update(Object.assign({}, app.values, { companyName: 'Canal Field Partners LLC' }));
    await S.registration.resubmit('Tax card attached, legal name corrected.');
    app = await S.registration.mine();
    ok(app.verification.status === 'pending' && app.name === 'Canal Field Partners LLC', 'applicant answers, corrects the name and the application returns to review');
    fail = null;
    try { await S.registration.update(app.values); } catch (e) { fail = e.key; }
    ok(fail === 'errors.applicationLocked', 'details lock again once the application is back in review');

    await as('Mai Adel');
    fail = null;
    try { await S.providers.approve(r.providerId); } catch (e) { fail = e.key; }
    ok(fail === 'errors.documentsMissing', 'operations cannot approve while documents are missing');
    await S.providers.reject(r.providerId, 'Owner national ID is missing.');
    await as('Sherif Mansour');
    app = await S.registration.mine();
    ok(app.verification.status === 'rejected' && app.canEdit && app.stage === 3, 'a rejected applicant can fix the application');
    await S.registration.uploadDocument('owner_id_front', 'id-front.jpg', 'data:image/jpeg;base64,AAAA');
    await S.registration.uploadDocument('owner_id_back', 'id-back.jpg');
    await S.registration.resubmit('Owner ID attached.');
    app = await S.registration.mine();
    ok(app.verification.status === 'pending' && app.verification.documents.find((d) => d.type === 'owner_id_front').url, 'resent after a rejection, with the document image kept');

    await as('Karim Fawzy');
    fail = null;
    try { await S.providers.verify(r.providerId); } catch (e) { fail = e.key; }
    ok(fail === 'errors.notAwaitingSignoff', 'management cannot sign off before operations approves');
    await as('Mai Adel');
    await S.providers.approve(r.providerId);
    fail = null;
    try { await S.providers.verify(r.providerId); } catch (e) { fail = e.key; }
    ok(fail === 'errors.forbidden', 'Operations cannot sign off');
    await as('Sherif Mansour');
    app = await S.registration.mine();
    s = await S.auth.currentUser();
    ok(app.verification.status === 'awaiting_signoff' && app.stage === 2 && s.portal === 'applicant', 'operations approves; the applicant waits for management sign-off');
    ok(notifs(uid('Sherif Mansour'), 'notif.application_ops_approved').length === 1, 'applicant told operations approved');
    await as('Karim Fawzy');
    await S.providers.verify(r.providerId);
    await as('Sherif Mansour');
    s = await S.auth.currentUser();
    ok(s.portal === 'provider' && s.home === '#/provider/investigation', 'after management sign-off the owner opens the provider portal');

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

  // ---------------------------------------------------------------- 13
  await scenario('13. Provider settings: response times, price approval, document expiry', async () => {
    const T0 = ICM.clock.now();
    await as('Hany Wagdy');
    let st = await S.providers.settings();
    const cr = st.documents.find((d) => d.type === 'commercial_register');
    ok(st.canEdit && cr.expiry.state === 'expiring' && cr.expiry.daysLeft <= 30, 'owner sees the commercial register expiring in ' + cr.expiry.daysLeft + ' days');
    await S.demo.tick(); await S.demo.tick();
    const reminders = notifs(uid('Hany Wagdy'), 'notif.document_expiring').filter((n) => n.params.doc === 'commercial_register');
    ok(reminders.length === 1, 'the 30-day reminder is sent once');

    let fail = null;
    const sla = { investigation: Object.assign({}, st.provider.sla.investigation), collectionFirstContactHours: null };
    sla.investigation.residence = st.limits.investigation.residence + 1;
    try { await S.providers.updateResponseTimes(sla); } catch (e) { fail = e; }
    ok(fail && fail.key === 'errors.slaTooSlow' && fail.params.field === 'sla_residence', 'a response time slower than the platform allows is refused');
    sla.investigation.residence = 24;
    st = { ...st, provider: await S.providers.updateResponseTimes(sla) };
    ok(st.provider.sla.investigation.residence === 24, 'a faster response time applies at once');

    const before = JSON.parse(JSON.stringify(st.provider.pricing));
    const next = JSON.parse(JSON.stringify(before));
    next.investigation.residence.greater_cairo = 99999;
    fail = null;
    try { await S.providers.requestPriceChange(next); } catch (e) { fail = e; }
    ok(fail && fail.key === 'errors.outOfBand' && fail.params.field === 'price_residence_greater_cairo', 'a price outside the band is refused with its field');
    next.investigation.residence.greater_cairo = before.investigation.residence.greater_cairo + 20;
    await S.providers.requestPriceChange(next, 'Fuel costs');
    st = await S.providers.settings();
    ok(st.priceRequest && st.provider.pricing.investigation.residence.greater_cairo === before.investigation.residence.greater_cairo, 'the request waits; current prices still apply');
    ok(notifs(uid('Laila Hosny'), 'notif.price_change_requested').length >= 1, 'operations is told about the request');

    await as('Laila Hosny');
    fail = null;
    try { await S.providers.decidePriceChange('prv_sphinx', false); } catch (e) { fail = e.key; }
    ok(fail === 'wf.err.reasonRequired', 'turning a request down needs a reason');
    await S.providers.decidePriceChange('prv_sphinx', true);
    await as('Hany Wagdy');
    st = await S.providers.settings();
    ok(!st.priceRequest && st.provider.pricing.investigation.residence.greater_cairo === next.investigation.residence.greater_cairo && st.lastPriceDecision.approved, 'operations approves and the new price is live');

    fail = null;
    try { await S.providers.submitDocument('commercial_register', { fileName: 'cr.jpg', expiresAt: T0 - 1000 }); } catch (e) { fail = e; }
    ok(fail && fail.key === 'errors.expiryInPast' && fail.params.field === 'expiresAt', 'a renewal with a past expiry date is refused');
    await S.demo.reviewMyProvider('expireDocument', 'commercial_register');
    st = await S.providers.settings();
    ok(st.expired.join() === 'commercial_register' && notifs(uid('Hany Wagdy'), 'notif.document_expired').length === 1, 'the register lapses and the owner is told');
    await as('Laila Hosny');
    let market = await S.marketplace.eligible({ service: 'investigation', demand: { cairo: 1 }, inquiryTypes: ['residence'] });
    ok(!market.providers.some((p) => p.id === 'prv_sphinx') && market.excluded.documents >= 1, 'no new offers while it is expired');
    await as('Hany Wagdy');
    await S.providers.submitDocument('commercial_register', { fileName: 'cr-2027.jpg', url: 'data:image/jpeg;base64,AAAA', expiresAt: T0 + 400 * 86400000 });
    st = await S.providers.settings();
    ok(st.documents.find((d) => d.type === 'commercial_register').renewal && st.expired.length === 1, 'the renewal waits for operations; offers stay paused');
    await as('Laila Hosny');
    await S.providers.verifyDocument('prv_sphinx', 'commercial_register');
    market = await S.marketplace.eligible({ service: 'investigation', demand: { cairo: 1 }, inquiryTypes: ['residence'] });
    ok(market.providers.some((p) => p.id === 'prv_sphinx'), 'operations verifies the renewal and offers resume');

    await as('Hany Wagdy');
    st = await S.providers.settings();
    const team = await S.team.structure();
    const agent = team.supervisors.flatMap((s) => s.agents).concat(team.unassigned).find((a) => a.active);
    const cov = Object.assign({}, st.provider.coverageCities);
    delete cov[agent.governorates[0]];
    fail = null;
    try { await S.providers.updateCoverage(cov, st.provider.capacity); } catch (e) { fail = e.key; }
    ok(fail === 'errors.agentsOutsideCoverage', 'a governorate cannot be dropped while active agents still cover it');
  });

  // ---------------------------------------------------------------- 14
  await scenario('14. Offers matched by city', async () => {
    await as('Tamer Lotfy');
    const at = (gov, city) => Object.assign(invValues(gov), { home: { governorate: gov, city: city, street: '5 Nile St', landmark: '' } });
    const ids = async (gov, city) => {
      const c = await S.cases.createDraft('investigation', at(gov, city));
      const m = await S.marketplace.eligible({ service: 'investigation', demand: { [gov]: 1 }, inquiryTypes: ['residence'], caseId: c.id });
      return { c, ids: m.providers.map((p) => p.id) };
    };
    let r = await ids('giza', 'Dokki');
    ok(r.ids.includes('prv_fl_omar') && r.ids.includes('prv_sphinx'), 'a Dokki case reaches Omar (covers Dokki) and Sphinx (all of Giza)');
    r = await ids('giza', 'Agouza');
    ok(!r.ids.includes('prv_fl_omar') && r.ids.includes('prv_sphinx'), 'an Agouza case does not reach Omar, who does not cover Agouza');
    let fail = null;
    try { await S.cases.sendOffer(r.c.id, 'prv_fl_omar'); } catch (e) { fail = e.key; }
    ok(fail === 'errors.providerNotEligible', 'the bank cannot send that case to Omar directly either');
    const agouza = r.c.id;
    r = await ids('giza', 'العجوزة');
    ok(!r.ids.includes('prv_fl_omar'), 'the city is recognised when written in Arabic too');
    r = await ids('giza', 'Kafr Ghatati');
    ok(r.ids.includes('prv_fl_omar'), 'a city not on the list falls back to the governorate, so the case is never stuck');
    r = await ids('cairo', 'Zamalek');
    ok(r.ids.includes('prv_fl_omar'), 'a Zamalek case reaches Omar in Cairo');
    r = await ids('cairo', 'Maadi');
    ok(!r.ids.includes('prv_fl_omar'), 'a Maadi case does not');

    await as('Omar Hassan');
    const st = await S.providers.settings();
    const cov = JSON.parse(JSON.stringify(st.provider.coverageCities));
    cov.giza.push('agouza');
    await S.providers.updateCoverage(cov, st.provider.capacity);
    await as('Tamer Lotfy');
    const m = await S.marketplace.eligible({ service: 'investigation', demand: { giza: 1 }, inquiryTypes: ['residence'], caseId: agouza });
    ok(m.providers.some((p) => p.id === 'prv_fl_omar'), 'after Omar adds Agouza to his coverage, the Agouza case reaches him');
    const row = (await S.cases.list({})).find((c) => c.id === agouza);
    ok(row.place.gov === 'giza' && row.place.city === 'agouza', 'case rows carry the area (governorate and city) for agent matching');
  });

  // ---------------------------------------------------------------- 15
  await scenario('15. Company owner does field work', async () => {
    await as('Hany Wagdy');
    let fail = null;
    try { await S.team.setOwnerFieldWork(true, { coverage: { matrouh: [] } }); } catch (e) { fail = e.key; }
    ok(fail === 'errors.outsideCompanyCoverage', 'the owner can only cover areas the company covers');
    const ag = await S.team.setOwnerFieldWork(true, { coverage: { cairo: [] }, services: ['investigation'] });
    let team = await S.team.structure();
    const hany = team.owners.find((u) => u.name === 'Hany Wagdy');
    ok(hany.fieldWork && hany.fieldWork.id === ag.id && !team.unassigned.some((a) => a.id === ag.id), 'the owner gets a field profile, shown with the owner and not as an agent without a supervisor');
    ok((await S.providers.team('investigation')).some((a) => a.id === ag.id), 'the owner appears in the agent list for assignment');

    await as('Tamer Lotfy');
    const c = await S.cases.createDraft('investigation', invValues('cairo'));
    await S.cases.sendOffer(c.id, 'prv_sphinx');
    await as('Hany Wagdy');
    const offer = (await S.offers.inbox('investigation')).find((o) => o.caseIds.includes(c.id));
    await S.offers.accept(offer.id);
    await S.cases.assign([c.id], ag.id);
    await as('Salma Reda');
    fail = null;
    try { await S.team.setActive(ag.id, false); } catch (e) { fail = e.key; }
    ok(fail === 'errors.ownerFieldProfile', 'a supervisor cannot switch off the owner\'s field work');
    fail = null;
    try { await S.cases.checkIn(c.id); } catch (e) { fail = e.key; }
    ok(fail === 'errors.forbidden', 'only the assigned person checks in');

    await as('Hany Wagdy');
    const ci = await S.cases.checkIn(c.id);
    for (let i = 0; i < 3; i++) await S.cases.addPhoto(c.id, PHOTO);
    await S.cases.saveReport(c.id, 'residence', goodResidence(c.id));
    await S.cases.transition(c.id, 'submit_report');
    let d = await S.cases.get(c.id);
    ok(ci.status === 'in_field' && d.case.status === 'submitted_for_review' && d.case.reviewerRole === 'qa', 'the owner checks in, reports and submits; the report goes to platform QA');
    fail = null;
    try { await S.cases.transition(c.id, 'approve'); } catch (e) { fail = e.key; }
    ok(fail === 'wf.err.reviewerQa', 'the owner cannot approve their own report');
    fail = null;
    try { await S.team.setOwnerFieldWork(false); } catch (e) { fail = e.key; }
    ok(fail === 'errors.agentHasOpenCases', 'field work cannot stop while the owner has an open case');

    await as('Salma Reda');
    ok(!(await S.cases.reviewQueue()).some((x) => x.id === c.id), 'it is not in the supervisor\'s review queue');
    await as('Ziad Ezzat');
    ok((await S.cases.reviewQueue()).some((x) => x.id === c.id), 'it is in the platform QA queue');
    ok(notifs(uid('Ziad Ezzat'), 'notif.report_submitted').some((n) => n.params.ref === d.case.ref), 'platform QA is notified');
    await S.cases.transition(c.id, 'approve');
    d = await S.cases.get(c.id);
    ok(d.case.status === 'delivered', 'QA approves and the report is delivered to the bank');

    await as('Hany Wagdy');
    await S.team.setOwnerFieldWork(false);
    team = await S.team.structure();
    ok(!team.owners.find((u) => u.name === 'Hany Wagdy').fieldWork && !(await S.providers.team('investigation')).some((a) => a.id === ag.id && a.active), 'the owner stops field work once the case is delivered');
  });

  // ---------------------------------------------------------------- 16
  await scenario('16. Provider ratings, disputes and rating the bank', async () => {
    await as('Hany Wagdy');
    const ratings = await S.ratings.received('investigation');
    const low = ratings.filter((r) => r.status === 'active' && !(r.dispute && r.dispute.status === 'open')).sort((a, b) => a.overall - b.overall)[0];
    ok(ratings.length > 0 && low, 'the provider sees ' + ratings.length + ' ratings; lowest ' + low.overall + ' stars');
    await S.ratings.reply(low.id, 'Thank you, we have retrained the field team.');
    ok((await S.ratings.received('investigation')).find((r) => r.id === low.id).reply.text.includes('retrained'), 'the provider replies publicly');
    let fail = null;
    try { await S.disputes.open({ kind: 'rating', ratingId: low.id, reason: 'rating_unfair', details: '' }); } catch (e) { fail = e.key; }
    ok(fail === 'wf.err.reasonRequired', 'a dispute needs details');
    const d = await S.disputes.open({ kind: 'rating', ratingId: low.id, reason: 'wrong_case', details: 'This rating belongs to another provider\'s case.' });
    fail = null;
    try { await S.disputes.open({ kind: 'rating', ratingId: low.id, reason: 'other', details: 'Again' }); } catch (e) { fail = e.key; }
    ok(fail === 'errors.disputeExists', 'one open dispute per rating');
    await S.disputes.respond(d.id, 'Check-in times show we were not at that address.');
    let got = await S.disputes.get(d.id);
    ok(got.responses.length === 1 && got.responses[0].party === 'provider' && got.rating.id === low.id, 'the provider adds a statement to the dispute');
    const scoreBefore = (await S.providers.mine()).score.overall;
    await S.demo.resolveMyDispute(d.id, 'upheld', 'Rating was for a different case.');
    got = await S.disputes.get(d.id);
    const removed = (await S.ratings.received('investigation')).find((r) => r.id === low.id);
    ok(got.status === 'resolved' && got.outcome === 'upheld' && removed.status === 'removed', 'the platform upholds it and the rating leaves the score');
    ok(notifs(uid('Hany Wagdy'), 'notif.dispute_resolved').some((n) => n.params.ref === got.ref), 'the owner is told the outcome');
    ok((await S.providers.mine()).score.overall >= scoreBefore, 'the score does not drop after a ' + low.overall + '-star rating is removed');
    fail = null;
    try { await S.demo.resolveMyDispute('dsp_missing', 'upheld', 'x'); } catch (e) { fail = e.key; }
    ok(fail === 'errors.forbidden', 'the demo decision only reaches the provider\'s own disputes');

    const pending = await S.ratings.clientPending();
    ok(pending.length > 0, pending.length + ' closed jobs wait for a client rating');
    const item = pending[0];
    fail = null;
    try { await S.ratings.rateClient({ caseId: item.kind === 'case' ? item.id : null, batchId: item.kind === 'batch' ? item.id : null, dataQuality: 0, paymentTimeliness: 4 }); } catch (e) { fail = e.key; }
    ok(fail === 'errors.ratingRequired', 'both scores are required');
    await S.ratings.rateClient({ caseId: item.kind === 'case' ? item.id : null, batchId: item.kind === 'batch' ? item.id : null, dataQuality: 2, paymentTimeliness: 4, comment: 'Two phone numbers were wrong.' });
    ok(!(await S.ratings.clientPending()).some((x) => x.id === item.id) && (await S.ratings.clientRatings()).some((r) => r.dataQuality === 2 && r.entityName === item.entityName), 'the provider rates the bank and the job leaves the list');
    ok((await S.analytics.navCounts(null)).openDisputes >= 0, 'open disputes are counted for the provider');
  });

  // ---------------------------------------------------------------- 17
  await scenario('17. Earnings follow the team structure', async () => {
    await as('Adel Morsy');
    const all = await S.billing.earnings(null);
    ok(all.scope === 'all' && all.rows.length > 0 && all.byAgent.length > 0, 'the owner sees the whole company: ' + all.rows.length + ' paid cases across ' + all.byAgent.length + ' agent(s)');
    ok((await S.billing.invoices()).length > 0, 'the owner sees the invoices');

    await as('Rehab Anwar');
    let rehab = await S.billing.earnings(null);
    ok(rehab.scope === 'team' && rehab.rows.length > 0 && rehab.rows.every((r) => r.agentId), 'a supervisor sees only cases done by their own agents');
    ok((await S.billing.invoices()).length === 0, 'a supervisor does not see the company invoices');
    await as('Khaled Samy');
    let khaled = await S.billing.earnings(null);
    const supOf = (agentId) => ICM.store.db.agents.find((x) => x.id === agentId).supervisorId;
    const kId = ICM.store.db.users.find((u) => u.name === 'Khaled Samy').id, rId = ICM.store.db.users.find((u) => u.name === 'Rehab Anwar').id;
    ok(khaled.rows.every((r) => supOf(r.agentId) === kId) && rehab.rows.every((r) => supOf(r.agentId) === rId) && !khaled.rows.some((r) => rehab.rows.some((x) => x.caseId === r.caseId)),
      'two supervisors see separate teams: Rehab ' + rehab.rows.length + ' case(s), Khaled ' + khaled.rows.length);

    await as('Adel Morsy');
    const top = rehab.byAgent[0];
    const khaledBefore = khaled.rows.length;
    const supK = ICM.store.db.users.find((u) => u.name === 'Khaled Samy');
    await S.team.moveAgent(top.agentId, supK.id);
    await as('Khaled Samy');
    khaled = await S.billing.earnings(null);
    await as('Rehab Anwar');
    rehab = await S.billing.earnings(null);
    ok(khaled.rows.length === khaledBefore + top.cases && khaled.rows.some((r) => r.agentId === top.agentId) && !rehab.rows.some((r) => r.agentId === top.agentId), 'when ' + top.name + ' moves to Khaled, their earnings move with them');

    const agentUser = ICM.store.db.users.find((u) => u.agentId === top.agentId);
    await as_id(agentUser.id);
    let fail = null;
    try { await S.billing.earnings(null); } catch (e) { fail = e.key; }
    ok(fail === 'errors.forbidden', 'a field agent cannot open the earnings');
    ok((await S.billing.invoices()).length === 0, 'nor the invoices');
    const work = await S.billing.myWork(null);
    ok(work.total > 0 && work.rows.every((r) => r.gross === undefined && r.net === undefined && r.price === undefined), 'the agent sees ' + work.total + ' completed cases with their status and no amounts');
    const mine = await S.cases.agentTasks();
    ok(mine.length > 0 && mine.every((c) => c.price == null), 'case prices are hidden from the agent');
    const dash = await S.analytics.providerDashboard('collection').catch(() => null);
    ok(!dash || dash.earningsThisMonth == null, 'no earnings figure reaches the agent');

    await as('Omar Hassan');
    const omar = await S.billing.earnings(null);
    ok(omar.scope === 'all' && omar.byAgent.length === 0, 'an individual provider sees their own money');
  });

  // ---------------------------------------------------------------- 18
  await scenario('18. Editing team members', async () => {
    const db = ICM.store.db;
    const rehab = db.users.find((u) => u.name === 'Rehab Anwar'), khaled = db.users.find((u) => u.name === 'Khaled Samy');
    const recAgents = db.agents.filter((a) => a.providerId === 'prv_recovery' && a.active && !a.owner);
    const rAgent = recAgents.find((a) => a.supervisorId === rehab.id), kAgent = recAgents.find((a) => a.supervisorId === khaled.id);
    const valuesOf = (a, over) => Object.assign({ name: a.name, phone: a.phone, nationalId: a.nationalId, email: '', services: a.services.slice(), coverage: JSON.parse(JSON.stringify(a.coverageCities || {})) }, over || {});

    await as('Adel Morsy');
    let fail = null;
    try { await S.team.updateMember(rAgent.id, valuesOf(rAgent, { phone: kAgent.phone })); } catch (e) { fail = e; }
    ok(fail && fail.key === 'errors.phoneTaken' && fail.params.field === 'phone', 'a mobile already used by someone else is refused');
    fail = null;
    try { await S.team.updateMember(rAgent.id, valuesOf(rAgent, { coverage: { aswan: [] } })); } catch (e) { fail = e.key; }
    ok(fail === 'errors.outsideCompanyCoverage', 'coverage cannot go outside the company');
    const newPhone = '01244556677';
    await S.team.updateMember(rAgent.id, valuesOf(rAgent, { name: rAgent.name + ' Ali', phone: newPhone, coverage: { cairo: ['nasr_city', 'heliopolis'] } }));
    let ag = db.agents.find((a) => a.id === rAgent.id), au = db.users.find((u) => u.id === rAgent.userId);
    ok(ag.name.endsWith(' Ali') && au.phone === newPhone && ag.coverageCities.cairo.join() === 'nasr_city,heliopolis' && ag.governorates.join() === 'cairo', 'the owner changes an agent\'s name, mobile and areas; the login follows the new mobile');

    await as('Rehab Anwar');
    await S.team.updateMember(rAgent.id, valuesOf(ag, { coverage: { cairo: [], giza: [] } }));
    ok(db.agents.find((a) => a.id === rAgent.id).governorates.length === 2, 'a supervisor edits their own agent');
    fail = null;
    try { await S.team.updateMember(kAgent.id, valuesOf(kAgent)); } catch (e) { fail = e.key; }
    ok(fail === 'errors.notYourAgent', 'but not an agent of another supervisor');
    await S.team.updateMember(rehab.id, { name: 'Rehab Anwar', phone: rehab.phone, email: 'rehab@recovery.example', services: ['collection'] });
    ok(db.users.find((u) => u.id === rehab.id).email === 'rehab@recovery.example', 'a supervisor updates their own details');
    fail = null;
    try { await S.team.updateMember(khaled.id, { name: 'Khaled', phone: khaled.phone, services: ['collection'] }); } catch (e) { fail = e.key; }
    ok(fail === 'errors.forbidden', 'and cannot edit another supervisor');

    await as_id(rAgent.userId);
    fail = null;
    try { await S.team.updateMember(rAgent.id, valuesOf(ag)); } catch (e) { fail = e.key; }
    ok(fail === 'errors.forbidden', 'field agents cannot edit the team');
  });

  // ---------------------------------------------------------------- 19
  await scenario('19. Check-in with the phone\'s real location', async () => {
    const db = ICM.store.db, D = ICM.domain;
    const giza = db.config.lists.governorates.find((g) => g.id === 'giza');
    const prep = async () => {
      await as('Tamer Lotfy');
      const c = await S.cases.createDraft('investigation', invValues('giza'));
      await S.cases.sendOffer(c.id, 'prv_fl_omar');
      await as('Omar Hassan');
      const o = (await S.offers.inbox('investigation')).find((x) => x.caseIds.includes(c.id));
      await S.offers.accept(o.id);
      return c.id;
    };
    let id = await prep();
    let fail = null;
    try { await S.cases.checkIn(id, { lat: 'north', lng: 31.2 }); } catch (e) { fail = e.key; }
    ok(fail === 'errors.locationInvalid', 'a broken location is refused');
    const near = { lat: giza.lat + 0.01, lng: giza.lng + 0.01, accuracyM: 12 };
    let c = await S.cases.checkIn(id, near);
    ok(c.checkIn.source === 'device' && c.checkIn.accuracyM === 12 && c.checkIn.distanceM === null && c.checkIn.addressApprox && !c.checkIn.outsideArea,
      'the phone location is kept with its accuracy; the address is approximate, so no distance is claimed');
    await S.cases.addPhoto(id, PHOTO, 'building', { lat: near.lat, lng: near.lng, accuracyM: 8 });
    c = (await S.cases.get(id)).case;
    ok(c.photos[0].source === 'device' && c.photos[0].accuracyM === 8, 'a camera photo carries where it was taken');

    id = await prep();
    c = await S.cases.checkIn(id, { lat: 31.2, lng: 29.92, accuracyM: 20 });
    ok(c.checkIn.outsideArea === true, 'a check-in in Alexandria for a Giza case is flagged as outside the case area');
    ok(ICM.wf.investigation.evidenceComplete(Object.assign({}, c, { photos: [1, 2, 3].map(() => ({})) }), {}) === false, 'and does not count as complete evidence');

    // Once an address is geocoded, the real distance is measured against the 300 m limit.
    id = await prep();
    const raw = db.cases.find((x) => x.id === id);
    raw.geo = { lat: 30.05, lng: 31.2, source: 'geocoded' };
    c = await S.cases.checkIn(id, { lat: 30.0509, lng: 31.2, accuracyM: 6 });
    ok(c.checkIn.distanceM > 80 && c.checkIn.distanceM < 120 && !c.checkIn.addressApprox, 'with a geocoded address the distance is measured: ' + c.checkIn.distanceM + ' m');

    id = await prep();
    c = await S.cases.checkIn(id);
    ok(c.checkIn.source === 'simulated' && c.checkIn.distanceM != null, 'without a location (demo) a simulated one is recorded and labelled');
  });

  // ---------------------------------------------------------------- 20
  await scenario('20. Field work done without signal and sent later', async () => {
    const db = ICM.store.db;
    await as('Tamer Lotfy');
    const c0 = await S.cases.createDraft('investigation', invValues('giza'));
    await S.cases.sendOffer(c0.id, 'prv_fl_omar');
    await as('Omar Hassan');
    const o = (await S.offers.inbox('investigation')).find((x) => x.caseIds.includes(c0.id));
    await S.offers.accept(o.id);
    const assignedAt = db.cases.find((x) => x.id === c0.id).assignedAt;

    // The agent visited 10 minutes after assignment without signal; the phone sends it all an hour later.
    await as('Laila Hosny');
    await S.demo.advance(H);
    await as('Omar Hassan');
    const t0 = ICM.clock.now();
    const visitAt = assignedAt + 10 * 60 * 1000;
    let c = await S.cases.checkIn(c0.id, { lat: 30.01, lng: 31.21, accuracyM: 15, at: visitAt });
    ok(c.checkIn.at === visitAt && c.checkIn.sentAt >= t0, 'the check-in keeps the time it happened, and when it arrived');
    await S.cases.addPhoto(c0.id, PHOTO, 'building', { at: visitAt + 60000 });
    await S.cases.addPhoto(c0.id, PHOTO, 'entrance', { at: t0 + 10 * 60 * 60 * 1000 });
    c = (await S.cases.get(c0.id)).case;
    ok(c.photos[0].at === visitAt + 60000 && c.photos[1].at <= ICM.clock.now(), 'photo times are kept, but a time in the future is not accepted');
    await S.cases.addPhoto(c0.id, PHOTO, 'door');
    await S.cases.saveReport(c0.id, 'residence', goodResidence(c0.id));
    const finished = visitAt + 20 * 60000;
    c = await S.cases.transition(c0.id, 'submit_report', { finishedAt: finished });
    ok(c.status === 'submitted_for_review' && c.reportFinishedOfflineAt === finished && c.reportSubmittedAt >= finished, 'the report records when it was finished offline and when it arrived');

    await as('Tamer Lotfy');
    const c1 = await S.cases.createDraft('investigation', invValues('giza'));
    await S.cases.sendOffer(c1.id, 'prv_fl_omar');
    await as('Omar Hassan');
    await S.offers.accept((await S.offers.inbox('investigation')).find((x) => x.caseIds.includes(c1.id)).id);
    const a1 = db.cases.find((x) => x.id === c1.id).assignedAt;
    c = await S.cases.checkIn(c1.id, { at: a1 - 3600000 });
    ok(c.checkIn.at >= a1 && c.checkIn.source === 'simulated', 'a time before the case was assigned is not accepted');
  });

  await scenario('21. Organisation sign-in with email and password', async () => {
    const db = ICM.store.db, C = ICM.config;
    const errOf = async (p) => { try { await p; return null; } catch (e) { return e.key; } };
    const tamer = db.users.find((u) => u.name === 'Tamer Lotfy');
    const r = await S.auth.checkPassword('  ' + tamer.email.toUpperCase() + ' ', C.DEMO_PASSWORD);
    ok(r.userId === tamer.id && r.maskedEmail.indexOf('****@') === 1 && !('passwordHash' in r), 'the right email and password pass, with the email masked for the code step');
    ok(await errOf(S.auth.checkPassword(tamer.email, 'wrong')) === 'errors.wrongPassword', 'a wrong password is refused');
    ok(await errOf(S.auth.checkPassword('nobody@nowhere.example', C.DEMO_PASSWORD)) === 'errors.wrongPassword', 'an unknown email gets the same message, so emails cannot be guessed');
    const hany = db.users.find((u) => u.name === 'Hany Wagdy');
    hany.email = 'hany@sphinx.example';
    ok(await errOf(S.auth.checkPassword(hany.email, C.DEMO_PASSWORD)) === 'errors.wrongPassword', 'service providers cannot use the email sign-in');
    for (let i = 0; i < C.SIGN_IN_MAX_TRIES - 1; i++) await errOf(S.auth.checkPassword(tamer.email, 'wrong'));
    ok(await errOf(S.auth.checkPassword(tamer.email, C.DEMO_PASSWORD)) === 'errors.signInLocked', 'after ' + C.SIGN_IN_MAX_TRIES + ' wrong tries even the right password is refused for a while');
    await as('Laila Hosny');
    await S.demo.advance((C.SIGN_IN_LOCK_MINUTES + 1) * 60000);
    ok((await S.auth.checkPassword(tamer.email, C.DEMO_PASSWORD)).userId === tamer.id, 'the lock ends after ' + C.SIGN_IN_LOCK_MINUTES + ' minutes');

    await as('Tamer Lotfy');
    const s = await S.auth.currentUser();
    const d = await S.analytics.entityDashboard();
    ok(s.portal === 'entity' && s.entity.id === tamer.entityId && d.services.join() === 'investigation', 'the Investigations role sees only investigation work on its home');
    await as('Nadia Samir');
    ok((await S.analytics.entityDashboard()).services.join() === 'investigation,collection', 'the Admin sees both services');
  });

  await scenario('22. Clients see the provider, not the names of its staff', async () => {
    const db = ICM.store.db;
    await as('Nadia Samir');
    const ent = db.users.find((u) => u.name === 'Nadia Samir').entityId;
    const worked = db.cases.filter((c) => c.entityId === ent && c.agentId && (c.timeline || []).some((e) => e.actorRole === 'agent'));
    ok(worked.length > 0, 'the client has cases worked by field agents');
    const staff = db.users.filter((u) => u.providerId).map((u) => u.name);
    for (const c of worked) {
      const d = await S.cases.get(c.id);
      // Customer details are left out: a customer can share a name with someone on the provider's team.
      const text = JSON.stringify(Object.assign({}, d.case, { customer: null, guarantor: null, report: null })) + JSON.stringify(d.agent);
      const leaked = staff.filter((n) => text.indexOf(n) >= 0 && n !== d.case.providerName);
      if (leaked.length) throw new Error(c.ref + ' shows ' + leaked.join(', '));
    }
    ok(true, 'no field agent, supervisor or owner name appears in ' + worked.length + ' case details');
    const list = await S.cases.list({});
    ok(list.every((c) => !c.agentName && !c.agentId), 'the case list leaves the agent out');
    const d = await S.cases.get(worked[0].id);
    ok(d.case.timeline.some((e) => e.actorRole === 'agent' && e.actorName === d.case.providerName), 'field steps in the timeline show the provider company');
    await as('Hany Wagdy');
    const own = db.cases.find((c) => c.providerId === 'prv_sphinx' && c.agentId);
    ok(!!(await S.cases.get(own.id)).case.agentName, 'the provider still sees its own agent');
  });

  await scenario('23. A request with the city picked from the list', async () => {
    await as('Tamer Lotfy');
    const v = invValues('giza');
    v.home = Object.assign({}, v.home, { city: 'dokki' });
    const c = await S.cases.createDraft('investigation', v);
    const d = await S.cases.get(c.id);
    ok(d.case.place.gov === 'giza' && d.case.place.city === 'dokki', 'the city id from the list is the case\'s place');
    const m = await S.marketplace.eligible({ service: 'investigation', demand: { giza: 1 }, inquiryTypes: ['residence'], caseId: c.id });
    ok(m.providers.length > 0 && m.providers.every((p) => ICM.wf.coversPlace(ICM.wf.coverageOf(ICM.store.db.providers.find((x) => x.id === p.id)), 'giza', 'dokki')), 'only providers covering Dokki are offered');
    const sent = await S.cases.sendOffer(c.id, m.providers[0].id);
    ok(sent.status === 'awaiting_acceptance', 'the offer goes to the chosen provider');
    const other = Object.assign({}, invValues('giza'), { home: Object.assign({}, v.home, { city: 'Kafr Ghatati' }) });
    const c2 = await S.cases.createDraft('investigation', other);
    ok((await S.cases.get(c2.id)).case.place.city === null, 'a place typed under Other falls back to the governorate');
  });

  await scenario('24. Bulk upload from rows read on the phone', async () => {
    await as('Tamer Lotfy');
    const sheets = await S.batches.templateSheets('investigation');
    ok(sheets[0].name === 'Cases' && sheets[0].rows[0].indexOf('national_id') >= 0 && sheets[1].rows.length > 20, 'the template has the columns and the accepted values');
    const demo = await S.batches.demoRows('investigation');
    let rows = await S.batches.parseRows(demo, 'investigation');
    ok(rows.length === 30 && rows.filter((r) => !r.valid).length === 3, 'the demo file gives 30 rows, 3 with errors');
    const noId = rows.find((r) => r.errors.national_id);
    noId.raw.national_id = '29001150101235';
    rows.find((r) => r.errors.mobile).excluded = true;
    rows = await S.batches.validateRows('investigation', rows, {});
    ok(rows.filter((r) => !r.excluded && !r.valid).length === 1, 'fixing one row and leaving one out leaves one error');
    let failed = null;
    try { await S.batches.create('investigation', 'Phone upload', rows, {}); } catch (e) { failed = e.key; }
    ok(failed === 'errors.batchHasErrors', 'a batch cannot be created while a row has errors');
    rows.find((r) => r.errors.governorate).excluded = true;
    const b = await S.batches.create('investigation', 'Phone upload', rows, {});
    ok(b.caseIds.length === 28, 'the batch holds the 28 included rows');
    const plan = await S.batches.plan(b.id);
    const assignments = {};
    plan.groups.forEach((g) => { assignments[g.governorate] = g.eligible.providers[0].id; });
    await S.batches.assign(b.id, 'split', assignments);
    const got = await S.batches.get(b.id);
    ok(got.offers.length === plan.groups.length && got.assignable === 0, 'one offer per governorate, nothing left to assign');
    let empty = null;
    try { await S.batches.parseRows([{ full_name: '' }], 'investigation'); } catch (e) { empty = e.key; }
    ok(empty === 'errors.fileEmpty', 'a file with no filled rows is refused');
  });

  await scenario('25. The client rates, closes a batch and disputes, without seeing provider staff', async () => {
    const db = ICM.store.db;
    await as('Nadia Samir');
    const ent = db.users.find((u) => u.name === 'Nadia Samir').entityId;
    const pending = await S.ratings.pending();
    const c = pending.cases[0];
    ok(!!c, 'a closed case is waiting for a rating');
    const crit = {};
    ICM.config.RATING_CRITERIA[c.service].forEach((k) => { crit[k] = 4; });
    await S.ratings.rateCase(c.id, { overall: 4, criteria: crit, tags: ['accurate_report'], feedback: 'Clear report.' });
    ok((await S.ratings.pending()).cases.every((x) => x.id !== c.id), 'once rated it leaves the list');

    const target = db.cases.find((x) => x.entityId === ent && x.providerId && x.acceptedAt && x.status === 'in_field' && !x.disputed)
      || db.cases.find((x) => x.entityId === ent && x.providerId && x.acceptedAt && !x.disputed && ['cancelled', 'awaiting_acceptance'].indexOf(x.status) < 0);
    const dsp = await S.disputes.open({ kind: 'case', caseId: target.id, reason: 'sla_missed', details: 'The visit was late.' });
    const prov = db.providers.find((p) => p.id === target.providerId);
    const owner = db.users.find((u) => u.providerId === prov.id && u.role === 'provider_admin') || db.users.find((u) => u.providerId === prov.id);
    await S.auth.loginAs(owner.id);
    await S.disputes.respond(dsp.id, 'The customer asked us to come later.');
    await as('Nadia Samir');
    let seen = await S.disputes.get(dsp.id);
    ok(seen.responses[0].byName === prov.name && seen.responses[0].by === null, 'the provider\'s statement shows the company, not the person');
    await S.disputes.respond(dsp.id, 'Noted, thank you.');
    await S.demo.resolveMyDispute(dsp.id, 'partial', 'Both sides had a point.');
    seen = await S.disputes.get(dsp.id);
    ok(seen.status === 'resolved' && seen.outcome === 'partial' && seen.responses.length === 2, 'the client adds a statement and can play the decision in the demo');

    // A batch where every case is finished needs one rating per provider to close.
    const b = db.batches.find((x) => x.entityId === ent && !x.closedAt && x.caseIds.length);
    b.caseIds.forEach((id) => { const k = db.cases.find((x) => x.id === id); if (!ICM.wf.isTerminal(k.status)) { k.status = 'closed'; k.closedAt = ICM.clock.now(); if (!k.providerId) k.providerId = prov.id; } });
    const got = await S.batches.get(b.id);
    ok(got.needsRating && got.rateProviders.length > 0, 'the finished batch asks for ' + got.rateProviders.length + ' provider rating(s)');
    const ratings = got.rateProviders.map((p) => {
      const cr = {}; ICM.config.RATING_CRITERIA[b.service].forEach((k) => { cr[k] = 5; });
      return { providerId: p.id, overall: 5, criteria: cr, tags: [], feedback: '' };
    });
    await S.batches.close(b.id, ratings, [{ caseId: b.caseIds[0], note: 'Check the address' }]);
    const after = await S.batches.get(b.id);
    ok(!!after.closedAt && after.ratings.length === ratings.length && after.caseFlags.length === 1, 'the batch closes with its ratings and a case flag');
  });

  await scenario('26. Client billing is for its Admin; the export names the provider, not its staff', async () => {
    const db = ICM.store.db;
    const errOf = async (p) => { try { await p; return null; } catch (e) { return e.key; } };
    await as('Nadia Samir');
    const mine = await S.billing.invoices();
    ok(mine.length > 0 && (await S.analytics.entityDashboard()).spendThisMonth !== null, 'the Admin sees invoices and spending');
    ok((await S.analytics.entityReports()).providers.every((r) => r.spend !== null), 'the Admin sees spend per provider');
    for (const who of ['Heba Mansour', 'Tamer Lotfy', 'Youssef Kamel']) {
      await as(who);
      ok((await S.billing.invoices()).length === 0 && (await S.analytics.entityDashboard()).spendThisMonth === null && (await S.analytics.entityReports()).providers.every((r) => r.spend === null), who + ' sees no invoices or spending');
    }
    await as('Heba Mansour');
    const issued = db.invoices.find((i) => i.entityId === db.users.find((u) => u.name === 'Heba Mansour').entityId && i.status === 'issued');
    if (issued) ok(await errOf(S.billing.markPaid(issued.id)) === 'errors.forbidden', 'Operations can no longer mark an invoice paid');

    await as('Nadia Samir');
    const sheets = await S.exports.investigations({});
    const staff = db.users.filter((u) => u.providerId && u.role !== 'freelancer').map((u) => u.name.toLowerCase());
    const staffIds = db.users.filter((u) => u.providerId).map((u) => u.id);
    const cells = [].concat(...sheets.map((s) => [].concat(...s.rows))).map((v) => String(v).toLowerCase());
    ok(sheets.some((s) => s.rows.length) && !cells.some((v) => staff.indexOf(v) >= 0 || staffIds.indexOf(v) >= 0), 'the client\'s Excel export holds no provider staff names or ids');
    const userCol = sheets[0].headers.indexOf('USER_NAME');
    const filled = sheets[0].rows.map((r) => r[userCol]).filter(Boolean);
    ok(filled.length > 0 && filled.every((n) => db.providers.some((p) => p.name === n)), 'USER_NAME holds the provider company');
  });

  await scenario('27. The client Admin manages its users', async () => {
    const C = ICM.config;
    const errOf = async (p) => { try { await p; return null; } catch (e) { return e.key; } };
    await as('Tamer Lotfy');
    ok(await errOf(S.entities.invite({ name: 'X', email: 'x@horus-auto.example', role: 'entity_credit' })) === 'errors.forbidden', 'only the Admin can invite');
    await as('Nadia Samir');
    const u = await S.entities.invite({ name: 'Laila Fathy', email: 'laila.fathy@horus-auto.example', role: 'entity_collections' });
    ok(u.invited && u.active, 'the Admin invites a new user');
    ok(await errOf(S.entities.invite({ name: 'Again', email: 'laila.fathy@horus-auto.example', role: 'entity_credit' })) === 'errors.emailTaken', 'an email can only be used once');
    const signIn = await S.auth.checkPassword('laila.fathy@horus-auto.example', C.DEMO_PASSWORD);
    ok(signIn.userId === u.id, 'the invited user can sign in with email and password');
    await S.entities.setRole(u.id, 'entity_operations');
    await S.auth.loginAs(u.id);
    ok((await S.analytics.entityDashboard()).services.length === 2 && (await S.billing.invoices()).length === 0, 'as Operations they see both services but no invoices');
    await as('Nadia Samir');
    const me = ICM.store.db.users.find((x) => x.name === 'Nadia Samir');
    ok(await errOf(S.entities.setRole(me.id, 'entity_credit')) === 'errors.lastAdmin', 'the last Admin cannot be demoted');
    ok(await errOf(S.entities.setActive(me.id, false)) === 'errors.cannotDeactivateSelf', 'the Admin cannot deactivate themselves');
    await S.entities.setActive(u.id, false);
    ok(await errOf(S.auth.checkPassword('laila.fathy@horus-auto.example', C.DEMO_PASSWORD)) === 'errors.wrongPassword', 'a deactivated user can no longer sign in');
  });

  await scenario('28. Platform staff see and do what their team allows', async () => {
    const db = ICM.store.db, wf = ICM.wf, C = ICM.config;
    const errOf = async (p) => { try { await p; return null; } catch (e) { return e.key; } };
    const staff = wf.PLATFORM_ROLES.map((r) => db.users.find((u) => u.role === r));
    ok(staff.every(Boolean), 'there is one staff member per team (' + staff.length + ')');
    for (const u of staff) {
      const r = await S.auth.checkPassword(u.email, C.DEMO_PASSWORD);
      if (r.userId !== u.id) throw new Error(u.name + ' cannot sign in');
    }
    ok(true, 'every staff member signs in with email and password');
    const withCustomer = db.cases.find((c) => c.acceptedAt && c.customer && c.customer.nationalId);
    await as('Amira Galal');
    const sup = await S.cases.get(withCustomer.id);
    ok(sup.case.masked && !sup.case.customer.nationalId && !sup.case.customer.name && Object.keys(sup.case.report || {}).length === 0, 'Customer support sees cases without personal data');
    ok((await S.analytics.adminOverview()).gmvMonth === null, 'Customer support sees no money on the overview');
    await as('Mai Adel');
    const ops = await S.cases.get(withCustomer.id);
    ok(!ops.case.masked && ops.case.customer.nationalId === withCustomer.customer.nationalId, 'Operations sees the customer details');
    await as('Yara Nabil');
    ok(await errOf(S.cases.get(withCustomer.id)) !== null && (await S.cases.list({})).length === 0, 'Data does not open individual cases');
    await as('Hossam Tawfik');
    ok((await S.analytics.adminOverview()).gmvMonth !== null, 'Finance sees money on the overview');
    ok(wf.can('platform_management', 'disputes.decide') && wf.can('platform_legal', 'disputes.decide') && !wf.can('platform_ops', 'disputes.decide'), 'disputes are decided by Legal and Management');
    ok(wf.DUAL_APPROVAL['fee.change'].join() === 'platform_finance,platform_management' && wf.DUAL_APPROVAL['disputes.decide'].join() === 'platform_legal,platform_management', 'fee changes and dispute decisions need two teams');
    ok(wf.can('platform_admin', 'anything.at.all') && wf.permissionsOf('platform_admin').indexOf('staff.manage') >= 0, 'the Super admin can do everything, including staff and settings');
  });

  await scenario('29. Provider decisions follow the teams', async () => {
    const db = ICM.store.db;
    const errOf = async (p) => { try { await p; return null; } catch (e) { return e.key; } };
    const app = db.providers.find((p) => p.verification.status === 'verified' && p.kind === 'company');
    // A fresh application, registered by Operations.
    await as('Mai Adel');
    const reg = await S.registration.adminRegister(Object.assign({}, newCompany, { companyName: 'Delta Field Checks', taxId: '519-204-776', commercialRegNo: '88213', companyEmail: 'info@deltafield.example', ownerPhone: '01099887711', mainPhone: '0239988771', focalPhone: '01299887722', ownerNationalId: '28501010112345' }), {}).catch((e) => ({ error: e.key, params: e.params }));
    ok(!reg.error, 'Operations registers a provider (' + (reg.error || 'ok') + ')');
    ok(await errOf(S.registration.adminRegister({}, { verifyNow: true })) === 'errors.forbidden', 'Operations cannot verify a provider on the spot');
    const pid = reg.providerId;
    db.providers.find((p) => p.id === pid).verification.documents.forEach((d) => { d.status = 'uploaded'; });
    await as('Hossam Tawfik');
    ok(await errOf(S.providers.approve(pid)) === 'errors.forbidden', 'Finance cannot approve applications');
    await as('Karim Fawzy');
    await S.providers.approve(pid);
    ok(await errOf(S.providers.verify(pid)) === 'errors.sameApprover', 'the Management member who approved cannot also sign off');
    await as('Laila Hosny');
    await S.providers.verify(pid);
    ok(db.providers.find((p) => p.id === pid).verification.status === 'verified', 'another person signs it off and the provider goes live');

    await as('Sherif Lotfy');
    const seen = await S.providers.get(app.id);
    ok(seen.verification.documents.every((d) => !d.url) && !(seen.owner && seen.owner.nationalId), 'Sales sees the provider without document images or the owner national ID');
    ok(await errOf(S.providers.enforce(app.id, 'warned', 'x')) === 'errors.forbidden', 'Sales cannot warn or suspend');
    await as('Mai Adel');
    ok(await errOf(S.providers.enforce(app.id, 'suspended', 'x')) === 'errors.forbidden', 'Operations cannot suspend; Management decides');
    await as('Karim Fawzy');
    await S.providers.enforce(app.id, 'warned', 'Late reports this month');
    ok(db.providers.find((p) => p.id === app.id).enforcement.level === 'warned', 'Management warns a provider');
    await S.providers.setAutomatic(app.id);
    const n = db.notifications.filter((x) => x.key === 'notif.application_new');
    ok(n.length && n.every((x) => ICM.wf.can(db.users.find((u) => u.id === x.userId).role, 'providers.approve')), 'new applications are announced to the teams that review them');
  });

  await scenario('30. Platform staff on cases and the Quality queue', async () => {
    const db = ICM.store.db;
    const errOf = async (p) => { try { await p; return null; } catch (e) { return e.key; } };
    const open = db.cases.find((c) => c.providerId && c.dueAt && !ICM.wf.isTerminal(c.status) && c.status !== 'awaiting_acceptance');
    await as('Amira Galal');
    ok(await errOf(S.cases.extendSla(open.id, 24, 'x')) === 'errors.forbidden', 'Customer support cannot extend a deadline');
    ok((await S.cases.get(open.id)).actions.indexOf('cancel') < 0, 'Customer support cannot cancel');
    const noted = db.cases.find((c) => (c.timeline || []).some((e) => e.note));
    ok((await S.cases.get(noted.id)).case.timeline.every((e) => !e.note), 'Customer support sees the timeline without free-text notes');
    await as('Mai Adel');
    const before = db.cases.find((c) => c.id === open.id).dueAt;
    await S.cases.extendSla(open.id, 24, 'Customer travelling');
    ok(db.cases.find((c) => c.id === open.id).dueAt === before + 24 * 3600e3, 'Operations extends the deadline by 24 hours');
    ok((await S.cases.get(open.id)).actions.indexOf('force_reassign') >= 0, 'Operations may move a case to another provider');

    // An individual provider's report waits for Quality.
    await as('Tamer Lotfy');
    const c0 = await S.cases.createDraft('investigation', invValues('giza'));
    await S.cases.sendOffer(c0.id, 'prv_fl_omar');
    await as('Omar Hassan');
    await S.offers.accept((await S.offers.inbox('investigation')).find((x) => x.caseIds.includes(c0.id)).id);
    await S.cases.checkIn(c0.id);
    for (const l of ['building', 'entrance', 'door']) await S.cases.addPhoto(c0.id, PHOTO, l);
    await S.cases.saveReport(c0.id, 'residence', goodResidence(c0.id));
    await S.cases.transition(c0.id, 'submit_report', {});
    await as('Mai Adel');
    ok((await S.cases.reviewQueue()).length === 0 && (await S.cases.get(c0.id)).actions.indexOf('approve') < 0, 'Operations does not review reports');
    await as('Ziad Ezzat');
    ok((await S.cases.reviewQueue()).some((c) => c.id === c0.id), 'the report is in the Quality queue');
    await S.cases.transition(c0.id, 'return_to_agent', { comment: 'Photo of the door is blurred' });
    ok(db.cases.find((c) => c.id === c0.id).status === 'returned_to_agent', 'Quality returns it to the provider with a comment');
    await as('Yara Nabil');
    ok((await S.cases.list({})).length === 0 && (await errOf(S.cases.get(c0.id))) !== null, 'Data sees no individual cases');
  });

  await scenario('31. Disputes are decided by Legal and Management together', async () => {
    const db = ICM.store.db;
    const errOf = async (p) => { try { await p; return null; } catch (e) { return e.key; } };
    const target = db.cases.find((c) => c.providerId && c.acceptedAt && !c.disputed && ['cancelled', 'awaiting_acceptance'].indexOf(c.status) < 0 && !ICM.wf.isTerminal(c.status));
    await as('Amira Galal');
    const d = await S.disputes.open({ kind: 'case', caseId: target.id, reason: 'sla_missed', details: 'Client called: the visit is three days late.' });
    ok(d.onBehalfOf && d.raisedByParty === 'entity', 'Customer support opens a dispute on the client\'s behalf');
    ok((await S.disputes.get(d.id)).details === null, 'Customer support does not see the statements');
    ok(await errOf(S.disputes.propose(d.id, 'upheld', 'x')) === 'errors.forbidden', 'Customer support cannot decide');

    await as('Nermine Saad');
    ok((await S.disputes.get(d.id)).details.indexOf('three days late') > 0, 'Legal sees the statements');
    await S.disputes.propose(d.id, 'upheld', 'The provider missed the deadline without notice.');
    ok(await errOf(S.disputes.confirm(d.id)) === 'errors.sameApprover', 'the person who proposed cannot confirm');
    ok(db.disputes.find((x) => x.id === d.id).status === 'open', 'nothing changes until it is confirmed');
    db.users.push({ id: 'u_legal_two', name: 'Second Legal', role: 'platform_legal', email: 'legal2@platform.example', active: true });
    await S.auth.loginAs('u_legal_two');
    ok(await errOf(S.disputes.confirm(d.id)) === 'errors.otherTeam', 'another person from the same team cannot confirm');
    await as('Mai Adel');
    ok(await errOf(S.disputes.confirm(d.id)) === 'errors.forbidden', 'Operations cannot confirm');

    await as('Karim Fawzy');
    await S.disputes.sendBack(d.id, 'Check whether the client changed the address first.');
    let x = db.disputes.find((y) => y.id === d.id);
    ok(!x.proposal && x.proposals.length === 1 && x.status === 'open', 'Management sends the proposal back with a note');
    await S.disputes.propose(d.id, 'partial', 'Late, but the address changed during the visit window.');
    await as('Nermine Saad');
    await S.disputes.confirm(d.id);
    x = db.disputes.find((y) => y.id === d.id);
    ok(x.status === 'resolved' && x.outcome === 'partial' && x.decision.proposedRole === 'platform_management' && x.decision.confirmedRole === 'platform_legal', 'Legal confirms Management\'s proposal and the decision takes effect');
    ok(db.cases.find((c) => c.id === target.id).billingAdjustment === 0.5, 'a partly upheld case dispute halves the billed amount');
  });

  await scenario('32. Finance: invoices, payments, adjustments and the fee', async () => {
    const db = ICM.store.db;
    const errOf = async (p) => { try { await p; return null; } catch (e) { return e.key; } };
    await as('Mai Adel');
    ok((await S.billing.invoices()).length === 0 && await errOf(S.billing.proposeFee(12, 'x')) === 'errors.forbidden', 'Operations sees no invoices and cannot change the fee');
    await as('Hossam Tawfik');
    const all = await S.billing.invoices();
    ok(all.length === db.invoices.length, 'Finance sees every invoice (' + all.length + ')');

    const draft = db.invoices.find((i) => i.status === 'draft' && i.lines.length);
    const line = draft.lines[0];
    const before = (await S.billing.invoices()).find((i) => i.id === draft.id).subtotal;
    const adj = await S.billing.adjustLine(draft.id, line.caseId, 50, 'Photos were missing on the first visit');
    ok(adj.subtotal < before && db.invoices.find((i) => i.id === draft.id).lines[0].adjustReason, 'Finance bills a case at 50% with a reason');
    await S.billing.issue(draft.id);
    await S.billing.markPaid(draft.id);
    const paid = db.invoices.find((i) => i.id === draft.id);
    ok(paid.status === 'paid' && paid.paidBy.side === 'platform', 'Finance issues it and records the payment received');
    ok(await errOf(S.billing.adjustLine(draft.id, line.caseId, 100, 'x')) === 'errors.invoicePaid', 'a paid invoice cannot be adjusted');

    const fee = db.config.pricing.platformFeePct;
    await S.billing.proposeFee(12, 'Market average is 12%');
    ok(db.config.pricing.platformFeePct === fee && db.config.feeProposal.pct === 12, 'the proposed fee does not apply yet');
    ok(await errOf(S.billing.confirmFee()) === 'errors.sameApprover', 'the person who proposed cannot confirm');
    await as('Karim Fawzy');
    await S.billing.sendBackFee('Wait for the Q4 review');
    ok(!db.config.feeProposal && db.config.pricing.platformFeePct === fee, 'Management sends the first proposal back');
    await S.billing.proposeFee(12, 'Agreed in the Q4 review');
    await as('Hossam Tawfik');
    await S.billing.confirmFee();
    ok(db.config.pricing.platformFeePct === 12 && db.config.feeHistory.length === 2, 'Finance confirms Management\'s proposal: the fee is 12%');
    ok(db.invoices.filter((i) => i.status === 'draft').every((i) => i.platformFeePct === fee), 'invoices already open keep their fee');
    await as('Laila Hosny');
    const cfg = await S.config.get();
    ok(await errOf(S.config.updatePricing({ pricing: Object.assign({}, cfg.pricing, { platformFeePct: 15 }) })) === 'errors.feeNeedsTwoTeams', 'the pricing settings cannot change the fee on their own');
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
