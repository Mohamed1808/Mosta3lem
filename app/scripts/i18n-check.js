/* Checks that every literal translation key used in the app exists in English and Arabic
   (prototype dictionaries plus src/i18n/strings.ts), and that no string has an em dash.
   Run: node scripts/i18n-check.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const app = path.join(__dirname, '..');
const proto = path.join(app, '..', 'prototype', 'js');

const ctx = { console, Intl, Date, Math, JSON };
ctx.window = ctx; ctx.localStorage = { getItem: () => null, setItem: () => {} }; ctx.document = { documentElement: {} };
vm.createContext(ctx);
['core/util.js', 'core/i18n.js', 'config/platform.js', 'i18n/en.js', 'i18n/ar.js', 'i18n/registration.en.js', 'i18n/registration.ar.js', 'i18n/investigation.en.js', 'i18n/investigation.ar.js']
  .forEach((f) => vm.runInContext(fs.readFileSync(path.join(proto, f), 'utf8'), ctx, { filename: f }));

// strings.ts is plain object literals; strip the TypeScript bits and run it.
let src = fs.readFileSync(path.join(app, 'src/i18n/strings.ts'), 'utf8');
src = src.replace(/const ar: typeof en = /, 'const ar = ').replace(/export function installStrings\(ICM: any\)/, 'function installStrings(ICM)') + '\ninstallStrings(window.ICM);';
vm.runInContext(src, ctx, { filename: 'strings.ts' });

function walk(dir) {
  return fs.readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return fs.statSync(p).isDirectory() ? walk(p) : /\.(tsx?|js)$/.test(f) ? [p] : [];
  });
}
const used = new Set();
const re = /\bt\(\s*'([a-zA-Z][\w.]*)'/g;
for (const file of walk(path.join(app, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = re.exec(text))) if (m[1].includes('.') && !/[._]$/.test(m[1])) used.add(m[1]);
}
const lookup = (d, k) => k.split('.').reduce((n, x) => (n == null ? undefined : n[x]), d);
const dict = ctx.ICM.i18n.dict;
const missEn = [...used].filter((k) => typeof lookup(dict.en, k) !== 'string').sort();
const missAr = [...used].filter((k) => typeof lookup(dict.ar, k) !== 'string').sort();
const all = [];
(function collect(o) { Object.values(o).forEach((v) => (typeof v === 'string' ? all.push(v) : collect(v))); })(dict);
const dashes = all.filter((s) => s.includes('—')).length;
console.log('keys used: ' + used.size);
console.log('missing in en (' + missEn.length + '): ' + missEn.join(', '));
console.log('missing in ar (' + missAr.length + '): ' + missAr.join(', '));
console.log('em dashes: ' + dashes);
process.exit(missEn.length || missAr.length || dashes ? 1 : 0);
