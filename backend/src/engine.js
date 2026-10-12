/**
 * The shared engine (prototype/js: workflow rules, permissions, data hiding, services),
 * loaded into its own sandbox on the server, exactly as the app and the console load it.
 *
 * The engine was written for one signed-in person in a browser: it reads the session and
 * the language from localStorage. Here localStorage is a shim that answers with the
 * person and language of the request being served, and the engine's own saving is
 * switched off: the server writes changes to PostgreSQL itself (see state.js).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..', 'prototype', 'js');

// Same order as prototype/index.html, without the web pages.
const SCRIPTS = [
  'core/util.js', 'core/i18n.js',
  'i18n/en.js', 'i18n/ar.js', 'i18n/registration.en.js', 'i18n/registration.ar.js',
  'i18n/investigation.en.js', 'i18n/investigation.ar.js',
  'config/platform.js', 'config/geo.js', 'config/services.js', 'config/ratings.js',
  'config/status.js', 'config/defaults.js', 'config/forms.js', 'config/reportForms.js',
  'workflow/common.js', 'workflow/validation.js', 'workflow/investigation.js',
  'workflow/collection.js', 'workflow/batch.js', 'workflow/sla.js', 'workflow/masking.js',
  'workflow/scoring.js', 'workflow/registration.js', 'workflow/settings.js', 'workflow/reports.js', 'workflow/privacy.js',
  'store/store.js', 'store/domain.js', 'store/seed.js',
  'services/engine.js', 'services/contracts.js', 'services/core.js', 'services/cases.js',
  'services/batches.js', 'services/providers.js', 'services/ratings.js', 'services/billing.js',
  'services/registration.js', 'services/exports.js', 'services/privacy.js', 'services/index.js'
];

/** Load a fresh engine. Returns { ICM, as(userId, lang) } where as() sets who is calling. */
function loadEngine() {
  const request = { userId: null, lang: 'en', sessionChange: undefined };
  let SESSION_KEY = null;

  const localStorage = {
    getItem(k) {
      if (k === SESSION_KEY) return request.userId;
      if (k === 'icm-lang') return request.lang;
      return null;
    },
    setItem(k, v) { if (k === SESSION_KEY) request.sessionChange = String(v); },
    removeItem(k) { if (k === SESSION_KEY) request.sessionChange = null; }
  };

  const ctx = {
    console, Intl, Date, Math, JSON, Promise, setTimeout, clearTimeout,
    localStorage,
    document: { documentElement: {} }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of SCRIPTS) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: 'prototype/js/' + f });
  }

  const ICM = ctx.ICM;
  SESSION_KEY = ICM.config.SESSION_KEY;
  // Persistence belongs to the server: the engine only changes the data in memory.
  ICM.store.save = () => true;

  const missing = ICM.services.verify();
  if (missing.length) throw new Error('Engine is missing service methods: ' + missing.join(', '));

  return {
    ICM,
    /** Serve the next engine call as this person, in this language. */
    as(userId, lang) {
      request.userId = userId || null;
      request.lang = lang === 'ar' ? 'ar' : 'en';
      request.sessionChange = undefined;
      ICM.i18n.setLang(request.lang);
    },
    /** undefined: no change; a user id: signed in as that person; null: signed out. */
    sessionChange() { return request.sessionChange; }
  };
}

module.exports = { loadEngine, SCRIPTS };
