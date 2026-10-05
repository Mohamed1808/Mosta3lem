/** Display helpers on top of the engine's utilities (labels, money, dates, places). */
"use client";

import { icm } from "@/backend/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const U = () => icm().util;

export function listLabel(list: string, id: string | null | undefined): string {
  if (id == null || id === "") return "-";
  const it = ((icm().store.db.config.lists[list] || []) as Any[]).find((x) => x.id === id);
  return it ? U().label(it) : String(id);
}
export const gov = (id: string | null | undefined) => listLabel("governorates", id);
export const money = (n: number | null | undefined) => (n == null ? "-" : U().money(n));
export const num = (n: number | null | undefined, d?: number) => (n == null ? "-" : U().num(n, d));
export const pct = (x: number | null | undefined) => (x == null ? "-" : U().pct(x));
export const date = (ms: number | null | undefined) => (ms == null ? "-" : U().fmtDate(ms));
export const dateTime = (ms: number | null | undefined) => (ms == null ? "-" : U().fmtDateTime(ms));

export function cityName(govId: string, cityId: string) {
  const c = icm().config.cityLabel(govId, cityId);
  return c ? U().label(c) : cityId;
}
/** "Dokki, Giza" for a case's place; just the governorate when the city is unknown. */
export function placeText(place: { gov: string; city: string | null } | null | undefined, govId?: string) {
  const g = (place && place.gov) || govId;
  if (!g) return "-";
  return place && place.city ? cityName(g, place.city) + icm().t("common.listSep") + gov(g) : gov(g);
}
/** "Giza (Dokki, Haram), Cairo" from { governorate: [cities] }. */
export function coverageText(cov: Record<string, string[]> | null | undefined) {
  const t = icm().t;
  return Object.keys(cov || {}).map((g) => {
    const cities = (cov as Any)[g] || [];
    return gov(g) + (cities.length ? " (" + cities.map((c: string) => cityName(g, c)).join(t("common.listSep")) + ")" : "");
  }).join(t("common.listSep"));
}
export function addressLine(a: Any): string {
  if (!a) return "-";
  const cityId = a.city ? icm().config.cityIdOf(a.governorate, a.city) : null;
  const city = cityId ? cityName(a.governorate, cityId) : a.city;
  return [a.street, city, gov(a.governorate)].filter(Boolean).join(icm().t("common.listSep"));
}

/** A service error as a readable sentence. */
export function errorText(e: Any): string {
  const t = icm().t;
  if (e && e.key) return t(e.key, e.params || {});
  return (e && e.message) || t("errors.generic");
}

/** The prices a request changes, as "from -> to" lines. */
export function priceChanges(cur: Any, next: Any): { label: string; from: string; to: string }[] {
  const out: { label: string; from: string; to: string }[] = [];
  const C = icm().config, t = icm().t;
  Object.keys((next && next.investigation) || {}).forEach((tp) => {
    Object.keys(next.investigation[tp]).forEach((z) => {
      const a = ((cur.investigation || {})[tp] || {})[z], b = next.investigation[tp][z];
      if (a !== b) out.push({ label: listLabel("inquiryTypes", tp) + " · " + U().label(C.ZONES.find((x: Any) => x.id === z)), from: a == null ? "-" : money(a), to: money(b) });
    });
  });
  if (next && next.collection) {
    Object.keys(next.collection.feePct).forEach((k) => {
      const a = ((cur.collection || {}).feePct || {})[k], b = next.collection.feePct[k];
      if (a !== b) out.push({ label: U().label(C.DPD_BUCKETS.find((x: Any) => x.id === k)), from: a == null ? "-" : a + "%", to: b + "%" });
    });
    const fa = (cur.collection || {}).fixedFee, fb = next.collection.fixedFee;
    if (fa !== fb) out.push({ label: t("profile.fixedFee"), from: fa == null ? "-" : money(fa), to: money(fb) });
  }
  return out;
}
