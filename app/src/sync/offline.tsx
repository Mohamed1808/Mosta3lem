/**
 * Field work without signal.
 *
 * - Online: the field worker's open cases are saved on the phone (prefetch), so they can be
 *   opened without signal.
 * - Offline: check-ins, photos, report answers and submissions go into an outbox on the
 *   phone, with the time they really happened, and the screens show them on top of the
 *   saved case.
 * - Back online: the outbox is sent in order. Anything the server refuses (for example the
 *   case was taken back meanwhile) stays in the list with the reason, so nothing is lost.
 *
 * Offline means the phone has no internet, or the demo switch "Simulate no signal" is on.
 * Until the real backend exists the data lives on the phone anyway; this layer is what the
 * real API will need, and the demo switch lets it be tried.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkState } from 'expo-network';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { icm, services } from '@/backend/engine';
import { errorText } from '@/lib/format';
import { useApp } from '@/state/app';

const K_CASES = 'mosta3lem-offline-cases';
const K_OUTBOX = 'mosta3lem-outbox';
const K_DEMO = 'mosta3lem-demo-offline';
/** Cases a field worker can still act on, so they are worth keeping on the phone. */
const FIELD_STATES = ['assigned', 'in_field', 'returned_to_agent'];

export type OpKind = 'checkIn' | 'addPhoto' | 'removePhoto' | 'saveReport' | 'submit' | 'resume';
export type Op = {
  id: string; kind: OpKind; caseId: string; caseRef: string; at: number; args: any;
  status: 'pending' | 'failed'; error?: string; userId: string;
};

type OfflineState = {
  online: boolean; deviceOnline: boolean; demoOffline: boolean; setDemoOffline: (v: boolean) => void;
  outbox: Op[]; cases: Record<string, any>; syncing: boolean; lastSync: number | null;
  /** Queue an action (offline) or run it now (online). Resolves to true when done or queued. */
  act: (kind: OpKind, c: any, args: any) => Promise<void>;
  sync: () => Promise<void>;
  saveForOffline: () => Promise<number>;
  discard: (id: string) => Promise<void>;
  retry: (id: string) => Promise<void>;
  /** The saved case (with queued changes applied), for screens opened without signal. */
  cachedCase: (id: string) => any | null;
  cacheCase: (detail: any) => void;
};

const Ctx = createContext<OfflineState | null>(null);

const uid = () => 'op_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Run one queued action against the backend. */
async function send(op: Op) {
  const s = services().cases;
  switch (op.kind) {
    case 'checkIn': return s.checkIn(op.caseId, op.args.fix ? { ...op.args.fix, at: op.at } : { at: op.at });
    case 'addPhoto': return s.addPhoto(op.caseId, op.args.url, op.args.label, { ...(op.args.fix || {}), at: op.at });
    case 'removePhoto': return s.removePhoto(op.caseId, op.args.photoId);
    case 'saveReport': return s.saveReport(op.caseId, op.args.type, op.args.values);
    case 'submit': return s.transition(op.caseId, 'submit_report', { finishedAt: op.at });
    case 'resume': return s.transition(op.caseId, 'resume');
  }
}

/** A saved case with the queued changes for it applied, as the field screens show it. */
export function applyOps(detail: any, ops: Op[]): any {
  if (!detail) return detail;
  // Only work still waiting to be sent; refused work is listed on the sync screen instead.
  const mine = ops.filter((o) => o.caseId === detail.case.id && o.status === 'pending');
  if (!mine.length) return detail;
  const c = { ...detail.case, photos: (detail.case.photos || []).slice(), report: { ...(detail.case.report || {}) } };
  const ICM = icm();
  mine.forEach((o) => {
    switch (o.kind) {
      case 'checkIn':
        c.checkIn = { at: o.at, lat: o.args.fix ? o.args.fix.lat : null, lng: o.args.fix ? o.args.fix.lng : null, accuracyM: o.args.fix ? o.args.fix.accuracyM : null, source: o.args.fix ? 'device' : 'simulated', distanceM: null, addressApprox: true, pending: true };
        c.status = 'in_field';
        break;
      case 'resume': c.status = 'in_field'; break;
      case 'addPhoto': c.photos.push({ id: o.id, at: o.at, dataUrl: o.args.url, label: o.args.label || null, pending: true }); break;
      case 'removePhoto': c.photos = c.photos.filter((p: any) => p.id !== o.args.photoId); break;
      case 'saveReport': c.report[o.args.type] = ICM.wf.reports.clean(ICM.config.REPORT_FORMS[o.args.type], o.args.values, { now: o.at }); break;
      case 'submit': c.status = 'submitted_for_review'; c.reportSubmittedAt = o.at; break;
    }
  });
  c.pendingSync = mine.filter((o) => o.status === 'pending').length;
  return { ...detail, case: c };
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { ready, session, refresh, rev } = useApp();
  const net = useNetworkState();
  const deviceOnline = net.isConnected !== false && net.isInternetReachable !== false;
  const [demoOffline, setDemo] = useState(false);
  const [outbox, setOutbox] = useState<Op[]>([]);
  const [cases, setCases] = useState<Record<string, any>>({});
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const loaded = useRef(false);
  const online = deviceOnline && !demoOffline;
  const userId = session?.user?.id || '';
  const fieldWorker = !!session?.user?.agentId;

  // Load what was saved on the phone.
  useEffect(() => {
    (async () => {
      try {
        const [c, o, d] = await AsyncStorage.multiGet([K_CASES, K_OUTBOX, K_DEMO]);
        if (c[1]) setCases(JSON.parse(c[1]));
        if (o[1]) setOutbox(JSON.parse(o[1]));
        setDemo(d[1] === '1');
      } catch { /* start empty */ }
      loaded.current = true;
    })();
  }, []);

  const saveOutbox = useCallback((next: Op[]) => { setOutbox(next); AsyncStorage.setItem(K_OUTBOX, JSON.stringify(next)).catch(() => undefined); }, []);
  const saveCases = useCallback((next: Record<string, any>) => { setCases(next); AsyncStorage.setItem(K_CASES, JSON.stringify(next)).catch(() => undefined); }, []);

  const setDemoOffline = useCallback((v: boolean) => { setDemo(v); AsyncStorage.setItem(K_DEMO, v ? '1' : '0').catch(() => undefined); }, []);

  const cacheCase = useCallback((detail: any) => {
    if (!detail || !detail.case) return;
    setCases((prev) => {
      const next = { ...prev, [detail.case.id]: detail };
      AsyncStorage.setItem(K_CASES, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  /** Save the field worker's open cases on the phone. Returns how many are saved. */
  const saveForOffline = useCallback(async () => {
    if (!online || !fieldWorker) return Object.keys(cases).length;
    const tasks: any[] = await services().cases.agentTasks();
    const open = tasks.filter((c) => FIELD_STATES.indexOf(c.status) >= 0);
    const next: Record<string, any> = {};
    for (const t of open) {
      try { next[t.id] = await services().cases.get(t.id); } catch { /* skip */ }
    }
    // Keep cases that still have queued work, even if they left the open list.
    outbox.forEach((o) => { if (!next[o.caseId] && cases[o.caseId]) next[o.caseId] = cases[o.caseId]; });
    saveCases(next);
    return Object.keys(next).length;
  }, [online, fieldWorker, cases, outbox, saveCases]);

  const sync = useCallback(async () => {
    if (!online || syncing) return;
    const pending = outbox.filter((o) => o.status === 'pending' && o.userId === userId);
    if (!pending.length) return;
    setSyncing(true);
    let next = outbox.slice();
    for (const op of pending) {
      try {
        await send(op);
        next = next.filter((o) => o.id !== op.id);
      } catch (e: any) {
        next = next.map((o) => (o.id === op.id ? { ...o, status: 'failed', error: errorText(e) } : o));
      }
    }
    saveOutbox(next);
    setSyncing(false);
    setLastSync(Date.now());
    refresh();
  }, [online, syncing, outbox, userId, saveOutbox, refresh]);

  // Send automatically when the signal comes back, and keep the open cases saved.
  useEffect(() => {
    if (!ready || !loaded.current || !online || !userId) return;
    (async () => {
      await sync();
      if (fieldWorker) await saveForOffline().catch(() => undefined);
    })();
    // Only when connectivity or the person changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, ready, userId]);

  // While online, keep the saved cases fresh a moment after data changes (a new assignment, a return).
  const saveRef = useRef(saveForOffline);
  useEffect(() => { saveRef.current = saveForOffline; }, [saveForOffline]);
  useEffect(() => {
    if (!online || !fieldWorker || !ready) return;
    const tm = setTimeout(() => { saveRef.current().catch(() => undefined); }, 2500);
    return () => clearTimeout(tm);
  }, [rev, online, fieldWorker, ready]);

  const act = useCallback(async (kind: OpKind, c: any, args: any) => {
    const op: Op = { id: uid(), kind, caseId: c.id, caseRef: c.ref, at: args?.at || icm().clock.now(), args: args || {}, status: 'pending', userId };
    if (online) {
      await send(op);
      return;
    }
    saveOutbox(outbox.concat([op]));
  }, [online, outbox, userId, saveOutbox]);

  const discard = useCallback(async (id: string) => { saveOutbox(outbox.filter((o) => o.id !== id)); }, [outbox, saveOutbox]);
  const retry = useCallback(async (id: string) => {
    saveOutbox(outbox.map((o) => (o.id === id ? { ...o, status: 'pending', error: undefined } : o)));
  }, [outbox, saveOutbox]);

  const cachedCase = useCallback((id: string) => applyOps(cases[id] || null, outbox), [cases, outbox]);

  const value = useMemo<OfflineState>(() => ({
    online, deviceOnline, demoOffline, setDemoOffline, outbox: outbox.filter((o) => o.userId === userId), cases, syncing, lastSync,
    act, sync, saveForOffline, discard, retry, cachedCase, cacheCase,
  }), [online, deviceOnline, demoOffline, setDemoOffline, outbox, userId, cases, syncing, lastSync, act, sync, saveForOffline, discard, retry, cachedCase, cacheCase]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOffline(): OfflineState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOffline outside OfflineProvider');
  return v;
}
