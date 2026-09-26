/* Core helpers: safe HTML templating, formatting, ids, maths. No DOM state lives here. */
(function () {
  var ICM = (window.ICM = window.ICM || {});

  // ---------- Safe HTML ----------
  function SafeHtml(s) { this.s = s; }
  SafeHtml.prototype.toString = function () { return this.s; };

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

  function toHtml(v) {
    if (v == null || v === false || v === true) return '';
    if (v instanceof SafeHtml) return v.s;
    if (Array.isArray(v)) return v.map(toHtml).join('');
    return esc(v);
  }

  /** Tagged template: every interpolation is escaped unless it is already SafeHtml. */
  function h(strings) {
    var out = strings[0];
    for (var i = 1; i < arguments.length; i++) out += toHtml(arguments[i]) + strings[i];
    return new SafeHtml(out);
  }
  function raw(s) { return new SafeHtml(s == null ? '' : String(s)); }

  // ---------- Time ----------
  var MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  function locale() { return ICM.i18n && ICM.i18n.lang() === 'ar' ? 'ar-EG' : 'en-GB'; }

  function fmtDate(ts) {
    if (!ts) return '-';
    return new Intl.DateTimeFormat(locale(), { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ts));
  }
  function fmtDateTime(ts) {
    if (!ts) return '-';
    return new Intl.DateTimeFormat(locale(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  }
  function fmtTime(ts) {
    if (!ts) return '-';
    return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
  }
  function fmtMonth(key) {
    var p = key.split('-');
    return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(new Date(+p[0], +p[1] - 1, 1));
  }
  /** "2d 4h", "3h 12m", "45m". Negative values are formatted by absolute value. */
  function fmtDuration(ms) {
    var t = ICM.i18n.t;
    ms = Math.abs(ms);
    var d = Math.floor(ms / DAY), hh = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN);
    if (d > 0) return t('time.dh', { d: num(d), h: num(hh) });
    if (hh > 0) return t('time.hm', { h: num(hh), m: num(m) });
    return t('time.m', { m: num(m) });
  }
  function monthKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function startOfDay(ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function endOfDay(ts) { var d = new Date(ts); d.setHours(23, 59, 59, 999); return d.getTime(); }
  function toLocalInput(ts) {
    if (!ts) return '';
    var d = new Date(ts), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function toDateInput(ts) { return ts ? toLocalInput(ts).slice(0, 10) : ''; }
  function fromLocalInput(s) { return s ? new Date(s).getTime() : null; }

  // ---------- Numbers ----------
  function num(n, digits) {
    if (n == null || isNaN(n)) return '-';
    return new Intl.NumberFormat(locale(), { maximumFractionDigits: digits == null ? 0 : digits, minimumFractionDigits: digits == null ? 0 : digits }).format(n);
  }
  function money(n) {
    if (n == null || isNaN(n)) return '-';
    return new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n);
  }
  function pct(x, digits) {
    if (x == null || isNaN(x)) return '-';
    return new Intl.NumberFormat(locale(), { style: 'percent', maximumFractionDigits: digits == null ? 1 : digits, minimumFractionDigits: digits == null ? 1 : digits }).format(x);
  }
  function round(n, d) { var f = Math.pow(10, d || 0); return Math.round(n * f) / f; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function sum(arr, fn) { return arr.reduce(function (s, x) { return s + (fn ? fn(x) : x) || 0; }, 0); }
  function avg(arr, fn) { return arr.length ? sum(arr, fn) / arr.length : null; }
  function groupBy(arr, fn) {
    return arr.reduce(function (m, x) { var k = fn(x); (m[k] = m[k] || []).push(x); return m; }, {});
  }
  function sortBy(arr, fn, desc) {
    return arr.slice().sort(function (a, b) {
      var x = fn(a), y = fn(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : x > y ? 1 : 0) * (desc ? -1 : 1);
    });
  }
  function uniq(arr) { return Array.from(new Set(arr)); }

  // ---------- Ids / random ----------
  var counter = 0;
  function uid(prefix) {
    counter = (counter + 1) % 1e6;
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + counter.toString(36);
  }
  /** Deterministic PRNG (mulberry32) so the seed is identical on every reset. */
  function prng(seed) {
    var a = seed >>> 0;
    function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      next: next,
      int: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      chance: function (p) { return next() < p; },
      shuffle: function (arr) {
        var a2 = arr.slice();
        for (var i = a2.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)); var tmp = a2[i]; a2[i] = a2[j]; a2[j] = tmp; }
        return a2;
      }
    };
  }

  // ---------- Geo ----------
  function distanceM(lat1, lng1, lat2, lng2) {
    var R = 6371000, toRad = Math.PI / 180;
    var dLat = (lat2 - lat1) * toRad, dLng = (lng2 - lng1) * toRad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  // ---------- Misc ----------
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }
  /** Label for a config list item that carries en/ar names. */
  function label(item) {
    if (!item) return '-';
    var l = ICM.i18n ? ICM.i18n.lang() : 'en';
    return item[l] || item.en || item.id;
  }
  /** Downscale an image file to keep localStorage small. Resolves to a JPEG data URL. */
  function readImage(file, maxDim) {
    maxDim = maxDim || 640;
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.6));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function initials(name) {
    return String(name || '?').split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase();
  }
  function formData(form) {
    var out = {};
    new FormData(form).forEach(function (v, k) {
      if (k in out) { if (!Array.isArray(out[k])) out[k] = [out[k]]; out[k].push(v); }
      else out[k] = v;
    });
    return out;
  }
  function asArray(v) { return v == null || v === '' ? [] : Array.isArray(v) ? v : [v]; }

  ICM.SafeHtml = SafeHtml;
  ICM.h = h;
  ICM.raw = raw;
  ICM.esc = esc;
  ICM.util = {
    MIN: MIN, HOUR: HOUR, DAY: DAY,
    fmtDate: fmtDate, fmtDateTime: fmtDateTime, fmtTime: fmtTime, fmtMonth: fmtMonth, fmtDuration: fmtDuration,
    monthKey: monthKey, startOfDay: startOfDay, endOfDay: endOfDay,
    toLocalInput: toLocalInput, toDateInput: toDateInput, fromLocalInput: fromLocalInput,
    num: num, money: money, pct: pct, round: round, clamp: clamp, sum: sum, avg: avg,
    groupBy: groupBy, sortBy: sortBy, uniq: uniq, uid: uid, prng: prng, distanceM: distanceM,
    clone: clone, debounce: debounce, label: label, readImage: readImage, initials: initials,
    formData: formData, asArray: asArray
  };
})();
