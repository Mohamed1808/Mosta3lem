/* Minimal test runner that works in the browser (tests.html) and in Node (tests/run-node.js). */
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var suites = [], current = null;

  function describe(name, fn) {
    var s = { name: name, tests: [] };
    suites.push(s);
    var prev = current; current = s; fn(); current = prev;
  }
  function it(name, fn) { current.tests.push({ name: name, fn: fn }); }

  function fmt(v) { try { return JSON.stringify(v); } catch (e) { return String(v); } }
  function expect(actual) {
    return {
      toBe: function (exp) { if (actual !== exp) throw new Error('expected ' + fmt(actual) + ' to be ' + fmt(exp)); },
      toEqual: function (exp) { if (fmt(actual) !== fmt(exp)) throw new Error('expected ' + fmt(actual) + ' to equal ' + fmt(exp)); },
      toBeTruthy: function () { if (!actual) throw new Error('expected truthy, got ' + fmt(actual)); },
      toBeFalsy: function () { if (actual) throw new Error('expected falsy, got ' + fmt(actual)); },
      toBeNull: function () { if (actual !== null) throw new Error('expected null, got ' + fmt(actual)); },
      toContain: function (x) { if (!actual || actual.indexOf(x) < 0) throw new Error('expected ' + fmt(actual) + ' to contain ' + fmt(x)); },
      notToContain: function (x) { if (actual && actual.indexOf(x) >= 0) throw new Error('expected ' + fmt(actual) + ' not to contain ' + fmt(x)); },
      toBeGreaterThan: function (x) { if (!(actual > x)) throw new Error('expected ' + fmt(actual) + ' > ' + fmt(x)); },
      toBeLessThan: function (x) { if (!(actual < x)) throw new Error('expected ' + fmt(actual) + ' < ' + fmt(x)); },
      toBeCloseTo: function (x, d) { if (Math.abs(actual - x) > Math.pow(10, -(d == null ? 2 : d))) throw new Error('expected ' + fmt(actual) + ' ~ ' + fmt(x)); },
      toThrowKey: function (key) {
        try { actual(); } catch (e) {
          if (e.key !== key) throw new Error('expected error ' + key + ', got ' + (e.key || e.message));
          return;
        }
        throw new Error('expected error ' + key + ', nothing thrown');
      }
    };
  }

  function run() {
    var results = [], passed = 0, failed = 0;
    suites.forEach(function (s) {
      s.tests.forEach(function (t) {
        try { t.fn(); passed++; results.push({ suite: s.name, name: t.name, ok: true }); }
        catch (e) { failed++; results.push({ suite: s.name, name: t.name, ok: false, error: e.message }); }
      });
    });
    return { passed: passed, failed: failed, results: results };
  }

  root.describe = describe;
  root.it = it;
  root.expect = expect;
  root.TestRunner = { run: run };
})();
