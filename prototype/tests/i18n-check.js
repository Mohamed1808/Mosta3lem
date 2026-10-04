/* Checks that every translation key used in the code exists in en.js and ar.js, and that
   no English or Arabic string contains an em dash. Run: node tests/i18n-check.js [--list] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');

function walk(dir) {
  return fs.readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

// Literal keys: t('a.b'), ICM.t('a.b'), has('a.b')
const used = new Set();
const re = /\b(?:t|has)\(\s*'([a-zA-Z][\w.]*)'/g;
for (const file of walk(path.join(root, 'js'))) {
  if (file.includes(path.join('js', 'i18n'))) continue;
  const src = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = re.exec(src))) if (m[1].includes('.')) used.add(m[1]);
}

// Load the app config and dictionaries to expand dynamic key families.
const ctx = { console, Intl, Date, Math, JSON };
ctx.window = ctx; ctx.globalThis = ctx; ctx.localStorage = { getItem: () => null, setItem: () => {} }; ctx.document = { documentElement: {} };
vm.createContext(ctx);
['js/core/util.js', 'js/core/i18n.js', 'js/i18n/en.js', 'js/i18n/ar.js', 'js/i18n/registration.en.js', 'js/i18n/registration.ar.js', 'js/i18n/investigation.en.js', 'js/i18n/investigation.ar.js', 'js/config/platform.js', 'js/config/geo.js', 'js/config/services.js', 'js/config/ratings.js', 'js/config/status.js', 'js/config/defaults.js', 'js/config/forms.js', 'js/config/reportForms.js', 'js/workflow/common.js', 'js/workflow/validation.js', 'js/workflow/investigation.js', 'js/workflow/collection.js']
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const ICM = ctx.ICM, C = ICM.config;
const add = (k) => used.add(k);

C.INVESTIGATION_STATUSES.concat(C.COLLECTION_STATUSES, ['accepted_offer', 'withdrawn', 'pending', 'issued', 'paid', 'open', 'resolved', 'pending_acceptance', 'in_progress', 'partially_closed', 'verified', 'rejected', 'info_requested', 'kept', 'broken', 'approved', 'expired', 'declined']).forEach((s) => add('status.' + s));
ICM.wf.ALL_ROLES.forEach((r) => add('role.' + r));
ICM.wf.ENTITY_ROLES.forEach((r) => add('roleHint.' + r));
['investigation', 'collection'].forEach((s) => { add('service.' + s); add('request.serviceHint.' + s); });
ICM.wf.investigation.defs.concat(ICM.wf.collection.defs).forEach((d) => { add('action.' + d.action); add('timeline.' + d.action); });
['created', 'log_action', 'promise_to_pay', 'payment_recorded', 'promise_broken', 'sla_at_risk', 'sla_breached', 'sla_extended', 'dispute_opened', 'dispute_resolved', 'rated'].forEach((a) => add('timeline.' + a));
['on_track', 'at_risk', 'breached', 'met', 'missed'].forEach((s) => add('sla.' + s));
['high', 'medium', 'low', 'full', 'none'].forEach((a) => add('avail.' + a));
['none', 'warned', 'reduced', 'suspended'].forEach((l) => { add('enforcement.' + l); add('admin.enforceBody.' + l); if (l !== 'none') add('enforcement.notice.' + l); });
['auto', 'manual'].forEach((s) => add('enforcementSource.' + s));
C.ENTITY_TYPES.forEach((x) => add('entityType.' + x));
['company', 'freelancer'].forEach((x) => add('kind.' + x));
Object.values(C.RATING_CRITERIA).flat().forEach((x) => add('criteria.' + x));
C.COLLECTION_OUTCOMES.forEach((x) => add('outcome.' + x));
C.PAYMENT_METHODS.forEach((x) => add('paymentMethod.' + x));
['discount', 'instalments'].forEach((x) => add('settlement.kind.' + x));
C.AMOUNT_RANGES.forEach((r) => add('amountRange.' + r.key));
['entity', 'provider', 'agent', 'admin', 'applicant'].forEach((p) => add('portal.' + p));
['company', 'individual', 'companyBody', 'individualBody'].forEach((k) => add('reg.kind.' + k));
['type', 'details', 'area', 'submit'].forEach((s) => add('reg.stepTitle.' + s));
['self', 'admin'].forEach((s) => add('onboarding.source.' + s));
['pending', 'rejected', 'verified'].forEach((s) => add('docStatus.' + s));
['submitted', 'review', 'signoff', 'info', 'decision', 'rejected'].forEach((s) => add('application.track.' + s));
add('status.awaiting_signoff');
['c1', 'c2', 'c3', 'i1', 'i2', 'i3'].forEach((s) => add('application.after.' + s));
['companyName', 'taxId', 'commercialRegNo', 'mainPhone', 'companyEmail', 'ownerName', 'ownerNationalId', 'ownerPhone', 'ownerEmail', 'focalName', 'focalTitle', 'focalPhone', 'focalEmail', 'fullName', 'nationalId', 'phone', 'email', 'addrStreet', 'addrLandmark'].forEach((f) => add('reg.f.' + f));
['team_supervisor_activated', 'team_supervisor_deactivated'].forEach((a) => add('audit.action.' + a));
['home', 'work', 'business', 'governorate', 'city', 'street', 'landmark'].forEach((a) => add('address.' + a));
C.PROVIDER_DOCUMENTS.forEach((d) => add('doc.' + d));
['entrance', 'building', 'door', 'street', 'premises', 'signboard'].forEach((l) => add('evidence.label.' + l));
['draft', 'issued', 'paid', 'draft_invoice'].forEach((s) => add('invoiceStatus.' + s));
['accruing', 'pending', 'paid_out'].forEach((s) => add('payout.' + s));
['report_inaccurate', 'evidence_missing', 'sla_missed', 'conduct', 'billing', 'other', 'rating_unfair', 'wrong_case', 'abusive'].forEach((r) => add('dispute.reason.' + r));
['upheld', 'rejected', 'partial'].forEach((o) => add('dispute.outcome.' + o));
['entity', 'provider', 'admin'].forEach((p) => add('dispute.party.' + p));
['case', 'rating'].forEach((k) => add('dispute.kindLabel.' + k));
['governorates', 'inquiryTypes', 'actionTypes', 'ratingTags', 'declineReasons', 'productTypes'].forEach((l) => add('settings.list.' + l));
['zone', 'code', 'lat', 'lng', 'defaultSlaHours', 'minPhotos', 'kind', 'sentiment'].forEach((f) => add('settings.field.' + f));
['contact', 'visit', 'result', 'note', 'positive', 'negative'].forEach((o) => add('settings.opt.' + o));
['case', 'offer', 'batch', 'provider', 'rating', 'dispute', 'invoice', 'config', 'user', 'agent', 'entity', 'clock'].forEach((x) => add('audit.type.' + x));
for (let i = 1; i <= 10; i++) add('demo.scenario.' + i);
Object.values(C.BULK_TEMPLATES).forEach((tpl) => tpl.columns.forEach((c) => add('bulk.col.' + c)));

// Forms: every field label, section title and option label.
function formKeys(form) {
  const fields = form.sections ? form.sections.flatMap((s) => { add('forms.' + form.id + '.sections.' + s.id); return s.fields; }) : form.fields;
  fields.forEach((f) => {
    if (!f.label && f.type !== 'checkbox') add('forms.' + form.id + '.' + f.name);
    if (f.type === 'checkbox') add('forms.' + form.id + '.' + f.name);
    if (f.options) f.options.forEach((o) => add((f.labelBase || ('forms.' + form.id + '.' + f.name + 'Opt')) + '.' + o));
    if (f.hint) add(f.hint);
    if (f.ocr) add('ocr.short.' + f.ocr);
    if (f.doc) add('ocr.doc.' + f.doc);
    if (f.type === 'repeat') {
      add('forms.' + form.id + '.' + f.name + 'Row'); add('forms.' + form.id + '.' + f.name + 'Add');
      f.fields.forEach((sf) => {
        add('forms.' + form.id + '.' + f.name + 'Fields.' + sf.name);
        if (sf.options) sf.options.forEach((o) => add((sf.labelBase || ('forms.' + form.id + '.' + f.name + 'Fields.' + sf.name + 'Opt')) + '.' + o));
      });
    }
  });
}
C.CLIENT_DECISIONS.forEach((d) => add('decision.' + d));
Object.values(C.PHOTO_SLOTS).flat().forEach((s) => add('evidence.label.' + s));
Object.values(C.FORMS).forEach(formKeys);
Object.values(C.REPORT_FORMS).forEach(formKeys);
Object.values(C.COLLECTION_FORMS).forEach(formKeys);

// Error keys produced by workflow and validation code.
for (const file of walk(path.join(root, 'js'))) {
  const src = fs.readFileSync(file, 'utf8');
  let m;
  const er = /'((?:wf\.err|errors)\.[\w]+)'/g;
  while ((m = er.exec(src))) add(m[1]);
  const nr = /'(notif\.[\w]+)'/g;
  while ((m = nr.exec(src))) add(m[1]);
  const ar = /E\.audit\('([\w.]+)'/g;
  while ((m = ar.exec(src))) add('audit.action.' + m[1].replace(/\./g, '_'));
}
ICM.wf.investigation.defs.concat(ICM.wf.collection.defs).forEach((d) => add('audit.action.case_' + d.action));
['case.sla_breached', 'case.sla_extended', 'provider.agent_activated', 'provider.agent_deactivated', 'provider.check_idVerified', 'provider.check_certified', 'entity.user_activated', 'entity.user_deactivated'].forEach((a) => add('audit.action.' + a.replace(/\./g, '_')));

function lookup(dict, key) { return key.split('.').reduce((n, k) => (n == null ? undefined : n[k]), dict); }
function allStrings(o, prefix, out) {
  Object.keys(o).forEach((k) => { const v = o[k], p = prefix ? prefix + '.' + k : k; if (typeof v === 'string') out.push([p, v]); else allStrings(v, p, out); });
  return out;
}
const en = ICM.i18n.dict.en || {}, ar = ICM.i18n.dict.ar || {};
[...used].forEach((k) => { if (/[._]$/.test(k)) used.delete(k); });
const missEn = [...used].filter((k) => typeof lookup(en, k) !== 'string').sort();
const missAr = [...used].filter((k) => typeof lookup(ar, k) !== 'string').sort();
const enStrings = allStrings(en, '', []), arStrings = allStrings(ar, '', []);
const onlyEn = enStrings.map((x) => x[0]).filter((k) => typeof lookup(ar, k) !== 'string');
const dashes = enStrings.concat(arStrings).filter((x) => x[1].includes('—'));
if (process.argv.includes('--list')) { console.log([...used].sort().join('\n')); process.exit(0); }
console.log('keys used: ' + used.size + ', en strings: ' + enStrings.length + ', ar strings: ' + arStrings.length);
console.log('missing in en (' + missEn.length + '):\n  ' + missEn.join('\n  '));
console.log('missing in ar (' + missAr.length + '): ' + (missAr.length > 40 ? missAr.slice(0, 40).join(', ') + ' ...' : missAr.join(', ')));
console.log('in en but not ar (' + onlyEn.length + '): ' + onlyEn.slice(0, 40).join(', '));
console.log('em dashes: ' + dashes.length + (dashes.length ? ' ' + dashes.map((d) => d[0]).join(', ') : ''));
process.exit(missEn.length || missAr.length || onlyEn.length || dashes.length ? 1 : 0);
