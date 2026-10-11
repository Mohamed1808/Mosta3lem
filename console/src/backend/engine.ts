/**
 * The console's backend. With NEXT_PUBLIC_API_URL set (see .env.example) the console talks
 * to the Mosta3lem API: the engine is loaded for translations, settings lists and workflow
 * rules, and every service call goes to the server (prototype/js/services/remote.js).
 * Without it the console runs the shared engine in the browser on its own demo data, as
 * before. Screens talk only to services(), the same contract either way.
 *
 * The sign-in token is kept in sessionStorage: closing the browser signs the person out.
 */
"use client";

import { SCRIPTS } from "./scripts.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const g = globalThis as Any;

/** The API address, or empty for the in-browser demo. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
export const remoteMode = (): boolean => !!API_URL;

let started: Promise<Any> | null = null;
let signedOutHandler: (() => void) | null = null;

/** Called when the server stops accepting the sign-in (expired, signed out elsewhere, deactivated). */
export function onSignedOut(fn: () => void) { signedOutHandler = fn; }

const tokenStorage = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* unavailable */ } },
  remove: (k: string) => { try { sessionStorage.removeItem(k); } catch { /* unavailable */ } },
};

/** Load the engine once (scripts in order), then connect to the API or load the demo data. */
export function startBackend(): Promise<Any> {
  if (!started) {
    started = (async () => {
      for (const load of SCRIPTS as (() => Promise<unknown>)[]) await load();
      const ICM = g.ICM;
      if (API_URL) {
        await ICM.remote.connect({ baseUrl: API_URL, storage: tokenStorage, onSignedOut: () => signedOutHandler && signedOutHandler() });
      } else {
        ICM.store.load();
      }
      return ICM;
    })();
    // A failed start (no connection) can be retried by reloading.
    started.catch(() => { started = null; });
  }
  return started;
}

export const icm = (): Any => g.ICM;
export const services = (): Any => g.ICM.services;
