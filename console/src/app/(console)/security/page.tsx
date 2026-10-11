/**
 * Security log (Legal, Super admin): sign-ins, failed passwords and codes, lockouts,
 * password requests and changes, and sign-outs everywhere, with the address and device
 * they came from. The last 24 hours at a glance, filters, search, older events page by page.
 * The log is kept by the server, so this page needs the real API; opening it is recorded.
 */
"use client";

import { useState } from "react";

import { icm, remoteMode } from "@/backend/engine";
import { Badge, Button, Card, inputClass, Kpi, Loading, Notice, PageHead } from "@/components/ui";
import { dateTime, num } from "@/lib/format";
import { useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const GROUPS = ["signin", "failed", "locked", "password", "signout", "log"];
const PERIODS = [1, 7, 30, 90];
const BAD = new Set(["signin.password_failed", "signin.code_failed", "signin.unknown_email", "signin.while_locked", "signin.locked"]);

/** "Chrome on Windows", "iPhone", ... from a browser's description of itself. */
function device(ua: string | null) {
  if (!ua) return "-";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : null;
  const app = /Expo|okhttp|CFNetwork/.test(ua) ? "App" : /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : null;
  return [app, os].filter(Boolean).join(" · ") || ua.slice(0, 40);
}

export default function SecurityLog() {
  const t = useT();
  const [group, setGroup] = useState("");
  const [days, setDays] = useState(7);
  const [q, setQ] = useState("");
  const [more, setMore] = useState<{ key: string; events: Any[]; next: number | null }>({ key: "", events: [], next: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const key = [group, days, q].join("|");
  const data = useQuery<Any>(() => (remoteMode() ? icm().remote.security.events({ group: group || undefined, days, q: q || undefined }) : Promise.resolve(null)), [group, days, q]);

  if (!remoteMode()) {
    return (
      <>
        <PageHead title={t("console.nav.security")} sub={t("console.security.sub")} />
        <Notice>{t("console.security.needsServer")}</Notice>
      </>
    );
  }

  const first = data.data;
  const extra = more.key === key ? more : { key, events: [], next: null };
  const events: Any[] = first ? first.events.concat(extra.events) : [];
  const next = extra.events.length ? extra.next : first && first.next;

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const r = await icm().remote.security.events({ group: group || undefined, days, q: q || undefined, before: next });
      setMore({ key, events: extra.events.concat(r.events), next: r.next });
    } finally { setLoadingMore(false); }
  };

  const detail = (e: Any): string => {
    const d = e.detail || {};
    if (e.kind === "signin.password_failed") return t("console.security.attempt", { n: num(d.fails) });
    if (e.kind === "signin.locked") return t("console.security.lockedAfter", { n: num(d.fails) });
    if (e.kind === "signin.code_failed") return t("console.security.codeAttempt", { channel: t("console.security.channel." + d.channel), n: num(d.attempt) });
    if (e.kind === "signin.ok") return t("console.security.channel." + d.channel);
    if (e.kind === "password.set") return t("console.security.from." + d.from);
    if (e.kind === "signout.everywhere") return d.after === "staff.setActive" ? t("console.security.afterDeactivate") : t("console.security.afterReset");
    if (e.kind === "security_log.viewed") return [d.group ? t("console.security.group." + d.group) : t("console.security.allEvents"), t("console.security.days." + d.days), d.q ? "\"" + d.q + "\"" : ""].filter(Boolean).join(" · ");
    return "";
  };

  return (
    <>
      <PageHead title={t("console.nav.security")} sub={t("console.security.sub")} />
      {first && first.summary ? (
        <>
          <div className="mb-3 text-xs font-medium text-ink2">{t("console.security.last24")}</div>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label={t("console.security.kpi.signins")} value={num(first.summary.signins)} />
            <Kpi label={t("console.security.kpi.failures")} value={num(first.summary.failures)} />
            <Kpi label={t("console.security.kpi.lockouts")} value={num(first.summary.lockouts)} tone={first.summary.lockouts ? "bad" : undefined} />
            <Kpi label={t("console.security.kpi.addresses")} value={num(first.summary.failingAddresses)} />
          </div>
          {first.summary.topFailing.length ? (
            <Card title={t("console.security.topFailing")} className="mb-4">
              <ul className="space-y-1.5 text-sm">
                {first.summary.topFailing.map((x: Any) => (
                  <li key={x.ip} className="flex items-center justify-between gap-3">
                    <button type="button" className="font-mono text-accent hover:underline" onClick={() => { setGroup("failed"); setDays(1); setQ(x.ip); }}><bdi dir="ltr">{x.ip}</bdi></button>
                    <span className="text-ink2">{t("console.security.failuresN", { n: num(x.n) })}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("console.security.search")} aria-label={t("console.security.search")} />
        <select className={inputClass} value={group} onChange={(e) => setGroup(e.target.value)} aria-label={t("console.security.kind")}>
          <option value="">{t("console.security.allEvents")}</option>
          {GROUPS.map((g) => <option key={g} value={g}>{t("console.security.group." + g)}</option>)}
        </select>
        <select className={inputClass} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label={t("console.security.period")}>
          {PERIODS.map((d) => <option key={d} value={d}>{t("console.security.days." + d)}</option>)}
        </select>
      </div>

      <Card>
        {data.error && !first ? <Notice tone="danger">{t(data.error.key || "errors.generic")}</Notice>
          : !first ? <Loading label={t("console.loading")} />
            : !events.length ? <p className="text-sm text-ink3">{t("console.security.none")}</p> : (
              <div className="-m-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-surface2 text-xs text-ink2">
                    <tr>
                      {["when", "event", "who", "address", "device", "details"].map((h) => <th key={h} className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("console.security.col." + h)}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {events.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap px-4 py-2.5 ps-5 text-xs text-ink2"><bdi dir="ltr">{dateTime(e.at)}</bdi></td>
                        <td className="px-4 py-2.5"><Badge tone={BAD.has(e.kind) ? (e.kind === "signin.locked" ? "danger" : "warning") : "neutral"}>{t("console.security.event." + e.kind.replace(/\./g, "_"))}</Badge></td>
                        <td className="px-4 py-2.5">
                          {e.user ? (
                            <button type="button" className="text-start hover:underline" onClick={() => setQ(e.user.name || "")}>
                              <div className="font-medium">{e.user.name || t("console.security.removedUser")}</div>
                              {e.user.role ? <div className="text-xs text-ink3">{t("role." + e.user.role)}</div> : null}
                            </button>
                          ) : <span className="text-ink3">{t("console.security.noAccount")}</span>}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs"><bdi dir="ltr">{e.ip || "-"}</bdi></td>
                        <td className="px-4 py-2.5 text-xs text-ink2">{device(e.userAgent)}</td>
                        <td className="px-4 py-2.5 pe-5 text-xs text-ink2">{detail(e)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </Card>
      {next ? <div className="mt-3 text-center"><Button kind="ghost" busy={loadingMore} onClick={loadMore}>{t("console.security.older")}</Button></div> : null}
    </>
  );
}
