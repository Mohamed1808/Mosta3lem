/* Run the workflow tests from the command line: node tests/run-node.js
   Loads the same classic scripts the browser loads, into one shared context. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const files = [
  'js/core/util.js', 'js/core/i18n.js',
  'js/config/platform.js', 'js/config/geo.js', 'js/config/services.js', 'js/config/ratings.js',
  'js/config/status.js', 'js/config/defaults.js', 'js/config/forms.js', 'js/config/reportForms.js',
  'js/workflow/common.js', 'js/workflow/validation.js', 'js/workflow/investigation.js',
  'js/workflow/collection.js', 'js/workflow/batch.js', 'js/workflow/sla.js',
  'js/workflow/masking.js', 'js/workflow/scoring.js', 'js/workflow/registration.js', 'js/workflow/reports.js',
  'tests/runner.js', 'tests/workflow.test.js'
].concat(process.argv.slice(2));

const ctx = { console, Intl, Date, Math, JSON, setTimeout, clearTimeout };
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.localStorage = { getItem: () => null, setItem: () => {} };
ctx.document = { documentElement: {} };
vm.createContext(ctx);
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });

const res = ctx.TestRunner.run();
const failed = res.results.filter((r) => !r.ok);
const bySuite = {};
res.results.forEach((r) => { bySuite[r.suite] = bySuite[r.suite] || [0, 0]; bySuite[r.suite][r.ok ? 0 : 1]++; });
Object.keys(bySuite).forEach((s) => console.log((bySuite[s][1] ? 'FAIL ' : 'ok   ') + s + '  (' + bySuite[s][0] + ' passed' + (bySuite[s][1] ? ', ' + bySuite[s][1] + ' failed' : '') + ')'));
failed.forEach((r) => console.log('  x ' + r.suite + ' > ' + r.name + ': ' + r.error));
console.log('\n' + res.passed + ' passed, ' + res.failed + ' failed');
process.exit(res.failed ? 1 : 0);
