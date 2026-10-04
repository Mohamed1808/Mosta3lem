/**
 * Simulated backend. Until the real API exists, the app runs the prototype's engine
 * (prototype/js: workflow rules, demo data and mock services) inside the app, so the
 * app and the prototype behave exactly the same. Every screen talks to it only through
 * `services()` (the same contract the real API will implement), never to the data directly.
 *
 * On a phone the engine's localStorage is a memory copy saved to AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const g: any = globalThis;
const PREFIX = 'icm-';

async function installStorage() {
  if (Platform.OS === 'web' && g.localStorage) return;
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
  const pairs = await AsyncStorage.multiGet(keys);
  const mem: Record<string, string> = {};
  pairs.forEach(([k, v]) => { if (v != null) mem[k] = v; });
  const timers: Record<string, ReturnType<typeof setTimeout>> = {};
  const persist = (k: string) => {
    clearTimeout(timers[k]);
    timers[k] = setTimeout(() => {
      if (k in mem) AsyncStorage.setItem(k, mem[k]);
      else AsyncStorage.removeItem(k);
    }, 250);
  };
  g.localStorage = {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = String(v); persist(k); },
    removeItem: (k: string) => { delete mem[k]; persist(k); },
  };
}

/* eslint-disable @typescript-eslint/no-require-imports -- the engine scripts must run in this exact order */
function loadScripts() {
  // Same order as prototype/index.html, without the web pages.
  require('../../../prototype/js/core/util.js');
  require('../../../prototype/js/core/i18n.js');
  require('../../../prototype/js/i18n/en.js');
  require('../../../prototype/js/i18n/ar.js');
  require('../../../prototype/js/i18n/registration.en.js');
  require('../../../prototype/js/i18n/registration.ar.js');
  require('../../../prototype/js/i18n/investigation.en.js');
  require('../../../prototype/js/i18n/investigation.ar.js');
  require('../../../prototype/js/config/platform.js');
  require('../../../prototype/js/config/geo.js');
  require('../../../prototype/js/config/services.js');
  require('../../../prototype/js/config/ratings.js');
  require('../../../prototype/js/config/status.js');
  require('../../../prototype/js/config/defaults.js');
  require('../../../prototype/js/config/forms.js');
  require('../../../prototype/js/config/reportForms.js');
  require('../../../prototype/js/workflow/common.js');
  require('../../../prototype/js/workflow/validation.js');
  require('../../../prototype/js/workflow/investigation.js');
  require('../../../prototype/js/workflow/collection.js');
  require('../../../prototype/js/workflow/batch.js');
  require('../../../prototype/js/workflow/sla.js');
  require('../../../prototype/js/workflow/masking.js');
  require('../../../prototype/js/workflow/scoring.js');
  require('../../../prototype/js/workflow/registration.js');
  require('../../../prototype/js/workflow/settings.js');
  require('../../../prototype/js/workflow/reports.js');
  require('../../../prototype/js/store/store.js');
  require('../../../prototype/js/store/domain.js');
  require('../../../prototype/js/store/seed.js');
  require('../../../prototype/js/services/engine.js');
  require('../../../prototype/js/services/contracts.js');
  require('../../../prototype/js/services/core.js');
  require('../../../prototype/js/services/cases.js');
  require('../../../prototype/js/services/batches.js');
  require('../../../prototype/js/services/providers.js');
  require('../../../prototype/js/services/ratings.js');
  require('../../../prototype/js/services/billing.js');
  require('../../../prototype/js/services/registration.js');
  require('../../../prototype/js/services/exports.js');
  require('../../../prototype/js/services/index.js');
  require('../../../prototype/js/ui/icons.js');
}
/* eslint-enable @typescript-eslint/no-require-imports */

let ready: Promise<any> | null = null;

/** Start the simulated backend once. Resolves to the engine namespace. */
export function startBackend(): Promise<any> {
  if (ready) return ready;
  ready = (async () => {
    if (!g.window) g.window = g;
    if (!g.document) g.document = { documentElement: {} };
    await installStorage();
    loadScripts();
    g.ICM.store.load();
    return g.ICM;
  })();
  return ready;
}

/** The engine namespace (config, workflow rules, translations). Only valid after startBackend(). */
export function icm(): any {
  return g.ICM;
}

/** The service layer: the contract the real API will implement. */
export function services(): any {
  return g.ICM.services;
}
