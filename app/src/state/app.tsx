/**
 * App-wide state: backend readiness, the signed-in session, language and a revision
 * counter that bumps whenever data changes, so screens reload what they show.
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { icm, services, startBackend } from '@/backend/engine';
import { installStrings } from '@/i18n/strings';

export type Lang = 'en' | 'ar';

export type Session = {
  user: any;
  portal: 'provider' | 'agent' | 'entity' | 'admin' | 'applicant';
  provider: any | null;
  agent: any | null;
};

type AppState = {
  ready: boolean;
  error: string | null;
  session: Session | null;
  lang: Lang;
  rtl: boolean;
  rev: number;
  service: string | null;
  setService: (s: string) => void;
  setLang: (l: Lang) => void;
  signIn: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => void;
  syncSession: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [lang, setLangState] = useState<Lang>('en');
  const [rev, setRev] = useState(0);
  const [service, setService] = useState<string | null>(null);

  const refresh = useCallback(() => setRev((r) => r + 1), []);

  /** Re-read the signed-in person; keeps the same object unless their part of the app changed. */
  const syncSession = useCallback(async () => {
    try {
      const s: Session | null = await services().auth.currentUser();
      setSession((prev) => (prev && s && prev.user.id === s.user.id && prev.portal !== s.portal ? s : prev));
      if (s && s.provider) setService((cur) => cur || s.provider.services[0]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let tick: ReturnType<typeof setInterval> | null = null;
    startBackend()
      .then(async (ICM) => {
        installStrings(ICM);
        setLangState(ICM.i18n.lang() === 'ar' ? 'ar' : 'en');
        unsub = services().subscribe(() => {
          setRev((r) => r + 1);
          // An approval moves an applicant into the provider app, so re-read who is signed in
          // once the change has finished.
          setTimeout(() => { syncSession(); }, 0);
        });
        const s = await services().auth.currentUser();
        setSession(s);
        setService(s && s.provider ? s.provider.services[0] : null);
        setReady(true);
        // The demo clock moves deadlines, offer expiry and SLA flags forward.
        try { await services().demo.tick(); } catch { /* ignore */ }
        tick = setInterval(() => { services().demo.tick().catch(() => undefined); }, 30000);
      })
      .catch((e) => setError(String(e && e.message ? e.message : e)));
    return () => { if (unsub) unsub(); if (tick) clearInterval(tick); };
  }, [syncSession]);

  const setLang = useCallback((l: Lang) => {
    icm().i18n.setLang(l);
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.documentElement) document.documentElement.dir = 'ltr';
    setLangState(l);
    setRev((r) => r + 1);
  }, []);

  const signIn = useCallback(async (userId: string) => {
    const s = await services().auth.loginAs(userId);
    setSession(s);
    setService(s && s.provider ? s.provider.services[0] : null);
    setRev((r) => r + 1);
  }, []);

  const signOut = useCallback(async () => {
    await services().auth.logout();
    setSession(null);
    setService(null);
    setRev((r) => r + 1);
  }, []);

  const value = useMemo<AppState>(() => ({
    ready, error, session, lang, rtl: lang === 'ar', rev, service,
    setService: (s: string) => { setService(s); setRev((r) => r + 1); },
    setLang, signIn, signOut, refresh, syncSession,
  }), [ready, error, session, lang, rev, service, setLang, signIn, signOut, refresh, syncSession]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

/** Translate with the engine's dictionaries (prototype strings plus the app's own). */
export function useT() {
  const { lang } = useApp();
  return useCallback((key: string, params?: Record<string, unknown>) => {
    void lang;
    return icm().t(key, params) as string;
  }, [lang]);
}

/**
 * Load data from the service layer and reload it whenever data changes.
 * fn must return a Promise; deps are extra reasons to reload.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const { rev, ready } = useApp();
  const [state, setState] = useState<{ data: T | undefined; error: any; loading: boolean }>({ data: undefined, error: null, loading: true });
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    fn().then(
      (data) => { if (alive) setState({ data, error: null, loading: false }); },
      (error) => { if (alive) setState((s) => ({ data: s.data, error, loading: false })); }
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, ready, ...deps]);
  return state;
}
