/* i18n engine. Dictionaries live in js/i18n/en.js and js/i18n/ar.js. */
(function () {
  var ICM = (window.ICM = window.ICM || {});
  var KEY = 'icm-lang';
  var current = 'en';
  try { current = localStorage.getItem(KEY) || 'en'; } catch (e) { /* storage unavailable */ }
  var missing = {};

  function lookup(dict, key) {
    var parts = key.split('.'), node = dict;
    for (var i = 0; i < parts.length; i++) {
      if (node == null) return undefined;
      node = node[parts[i]];
    }
    return typeof node === 'string' ? node : undefined;
  }

  function t(key, params) {
    var dicts = ICM.i18n.dict;
    var s = lookup(dicts[current] || {}, key);
    if (s === undefined) s = lookup(dicts.en || {}, key);
    if (s === undefined) {
      if (!missing[key]) { missing[key] = true; if (window.console) console.warn('[i18n] missing key', key); }
      return key;
    }
    if (params) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) {
        var v = params[k];
        if (v == null) return '';
        // Numbers follow the UI locale (Arabic-Indic digits in Arabic).
        if (typeof v === 'number' && isFinite(v)) return new Intl.NumberFormat(current === 'ar' ? 'ar-EG' : 'en-GB', { maximumFractionDigits: 2 }).format(v);
        return String(v);
      });
    }
    return s;
  }

  /** True when a key exists, used for optional labels. */
  function has(key) { return lookup(ICM.i18n.dict[current] || {}, key) !== undefined || lookup(ICM.i18n.dict.en || {}, key) !== undefined; }

  function apply() {
    document.documentElement.lang = current;
    document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
  }

  ICM.i18n = {
    dict: ICM.i18n && ICM.i18n.dict ? ICM.i18n.dict : {},
    t: t,
    has: has,
    lang: function () { return current; },
    dir: function () { return current === 'ar' ? 'rtl' : 'ltr'; },
    setLang: function (l) {
      current = l;
      try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
      apply();
    },
    apply: apply,
    missing: function () { return Object.keys(missing); }
  };
  ICM.t = t;
})();
