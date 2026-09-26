/* Headless run of the acceptance scenarios against the service layer:
     node tests/scenarios.js
   Each scenario switches users exactly as a tester would with the header switcher. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const files = ['js/core/util.js', 'js/core/i18n.js', 'js/config/platform.js', 'js/config/geo.js', 'js/config/services.js', 'js/config/ratings.js', 'js/config/status.js', 'js/config/defaults.js', 'js/config/forms.js',
  'js/workflow/common.js', 'js/workflow/validation.js', 'js/workflow/investigation.js', 'js/workflow/collection.js', 'js/workflow/batch.js', 'js/workflow/sla.js', 'js/workflow/masking.js', 'js/workflow/scoring.js',
  'js/store/store.js', 'js/store/domain.js', 'js/store/seed.js',
  'js/services/engine.js', 'js/services/contracts.js', 'js/services/core.js', 'js/services/cases.js', 'js/services/batches.js', 'js/services/providers.js', 'js/services/ratings.js', 'js/services/billing.js', 'js/services/index.js'];
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
const goodResidence = { customerFound: 'yes', residenceConfirmed: 'yes', ownership: 'rented', yearsAtAddress: 6, neighbourConfirmation: 'yes', notes: 'Doorman confirmed.' };
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
  await S.cases.saveReport(caseId, 'residence', goodResidence);
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
  await scenario('6. Freelancer report goes to QA', async () => {
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
