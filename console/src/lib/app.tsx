/**
 * Console state: engine readiness, the signed-in staff member, language (with right to
 * left for Arabic) and a revision counter that bumps whenever data changes.
 */
"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { icm, services, startBackend } from "@/backend/engine";
import { installStrings } from "@/i18n/strings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
export type Lang = "en" | "ar";
export type Session = { user: Any; portal: string } | null;

type State = {
  ready: boolean;
  error: string | null;
  session: Session;
  lang: Lang;
  rev: number;
  setLang: (l: Lang) => void;
  signIn: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  can: (permission: string) => boolean;
};

const Ctx = createContext<State | null>(null);

/** Only platform staff use the console; anyone else signed in here is signed out. */
const staffOnly = (s: Session): Session => (s && s.portal === "admin" ? s : null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session>(null);
  const [lang, setLangState] = useState<Lang>("en");
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let tick: ReturnType<typeof setInterval> | null = null;
    startBackend()
      .then(async (ICM) => {
        installStrings(ICM);
        const l: Lang = ICM.i18n.lang() === "ar" ? "ar" : "en";
        setLangState(l);
        document.documentElement.lang = l;
        document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
        unsub = services().subscribe(() => setRev((r) => r + 1));
        const s = staffOnly(await services().auth.currentUser());
        if (!s) await services().auth.logout();
        setSession(s);
        setReady(true);
        // The demo clock moves deadlines, offer expiry and SLA flags forward.
        try { await services().demo.tick(); } catch { /* ignore */ }
        tick = setInterval(() => { services().demo.tick().catch(() => undefined); }, 30000);
      })
      .catch((e) => setError(String(e && e.message ? e.message : e)));
    return () => { if (unsub) unsub(); if (tick) clearInterval(tick); };
  }, []);

  const setLang = useCallback((l: Lang) => {
    icm().i18n.setLang(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    setLangState(l);
    setRev((r) => r + 1);
  }, []);

  const signIn = useCallback(async (userId: string) => {
    setSession(staffOnly(await services().auth.loginAs(userId)));
    setRev((r) => r + 1);
  }, []);

  const signOut = useCallback(async () => {
    await services().auth.logout();
    setSession(null);
    setRev((r) => r + 1);
  }, []);

  const value = useMemo<State>(() => ({
    ready, error, session, lang, rev, setLang, signIn, signOut,
    can: (p: string) => !!session && icm().wf.can(session.user.role, p),
  }), [ready, error, session, lang, rev, setLang, signIn, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

/** Translate with the engine's dictionaries (shared strings plus the console's own). */
export function useT() {
  const { lang } = useApp();
  return useCallback((key: string, params?: Record<string, unknown>) => {
    void lang;
    return icm().t(key, params) as string;
  }, [lang]);
}

/** Load data from the service layer and reload it whenever data changes. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const { rev, ready, session } = useApp();
  const [state, setState] = useState<{ data: T | undefined; error: Any; loading: boolean }>({ data: undefined, error: null, loading: true });
  useEffect(() => {
    if (!ready || !session) return;
    let alive = true;
    fn().then(
      (data) => { if (alive) setState({ data, error: null, loading: false }); },
      (error) => { if (alive) setState((s) => ({ data: s.data, error, loading: false })); }
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, ready, session, ...deps]);
  return state;
}
