/** Display helpers shared by the screens (labels, money, dates, errors). */
import { icm } from '@/backend/engine';
import type { Tone } from '@/theme';

const U = () => icm().util;
const t = (k: string, p?: any) => icm().t(k, p) as string;

export function listLabel(list: string, id: string | null | undefined): string {
  if (id == null || id === '') return '-';
  const items = (icm().store.db.config.lists[list] || []) as any[];
  const it = items.find((x) => x.id === id);
  return it ? U().label(it) : String(id);
}
export const gov = (id: string | null | undefined) => listLabel('governorates', id);
export const types = (ids: string[] | null | undefined) => (ids || []).map((id) => listLabel('inquiryTypes', id)).join(t('common.listSep'));
export function bucket(id: string | null | undefined) {
  const b = icm().config.DPD_BUCKETS.find((x: any) => x.id === id);
  return b ? U().label(b) : '-';
}
export function cityName(govId: string, cityId: string) {
  const c = icm().config.cityLabel(govId, cityId);
  return c ? U().label(c) : cityId;
}
export function coverageText(cov: Record<string, string[]> | null | undefined, max?: number) {
  const govs = Object.keys(cov || {});
  const parts = govs.slice(0, max || govs.length).map((g) => {
    const cities = (cov as any)[g] || [];
    return gov(g) + (cities.length ? ' (' + cities.map((c: string) => cityName(g, c)).join(t('common.listSep')) + ')' : '');
  });
  if (max && govs.length > max) parts.push(t('coverage.more', { n: govs.length - max }));
  return parts.join(t('common.listSep'));
}

export const money = (n: number | null | undefined) => (n == null ? '-' : U().money(n));
export const num = (n: number | null | undefined, d?: number) => (n == null ? '-' : U().num(n, d));
export const pct = (x: number | null | undefined) => (x == null ? '-' : U().pct(x));
export const dateTime = (ms: number | null | undefined) => (ms == null ? '-' : U().fmtDateTime(ms));
export const date = (ms: number | null | undefined) => (ms == null ? '-' : U().fmtDate(ms));
export const time = (ms: number | null | undefined) => (ms == null ? '-' : U().fmtTime(ms));
export const duration = (ms: number) => U().fmtDuration(ms);
export const initials = (name: string) => U().initials(name || '');

/** Status badge tone from the engine's colour map. */
export function statusTone(status: string): Tone {
  const map: Record<string, string> = icm().config.STATUS_TONE || {};
  return ((map[status] as Tone) || 'neutral');
}

export function slaInfo(c: any): { text: string; tone: Tone } | null {
  if (!c || !c.sla || c.sla === 'none') return null;
  const tone = statusTone(c.sla);
  let text = t('sla.' + c.sla);
  if ((c.sla === 'on_track' || c.sla === 'at_risk') && c.slaRemaining != null) text = t('sla.left', { time: duration(c.slaRemaining) });
  if (c.sla === 'breached' && c.slaRemaining != null) text = t('sla.overdue', { time: duration(c.slaRemaining) });
  return { text, tone };
}

/** A service error as a readable sentence. */
export function errorText(e: any): string {
  if (!e) return t('errors.generic');
  if (e.key) {
    const p = Object.assign({}, e.params || {});
    if (p.type) p.type = listLabel('inquiryTypes', p.type);
    if (p.gov) p.gov = gov(p.gov);
    if (p.bucket) p.bucket = bucket(p.bucket);
    return t(e.key, p);
  }
  return e.message || t('errors.generic');
}

export function addressLine(a: any): string {
  if (!a) return '-';
  return [a.street, a.city, gov(a.governorate)].filter(Boolean).join(t('common.listSep'));
}
