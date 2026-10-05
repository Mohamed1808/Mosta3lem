/**
 * Simulated backend for the internal console. Until the real API exists, the console runs
 * the shared engine (prototype/js: workflow rules, demo data, mock services) in the
 * browser, exactly like the mobile app, so all three behave the same. Screens talk to it
 * only through services(), the contract the real API will implement.
 *
 * Data lives in this browser's localStorage, separate from the phone app's demo data.
 */
"use client";

import { SCRIPTS } from "./scripts.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const g = globalThis as Any;

let started: Promise<Any> | null = null;

/** Load the engine once (scripts in order), load or seed the demo data, and return ICM. */
export function startBackend(): Promise<Any> {
  if (!started) {
    started = (async () => {
      for (const load of SCRIPTS as (() => Promise<unknown>)[]) await load();
      const ICM = g.ICM;
      ICM.store.load();
      return ICM;
    })();
  }
  return started;
}

export const icm = (): Any => g.ICM;
export const services = (): Any => g.ICM.services;
