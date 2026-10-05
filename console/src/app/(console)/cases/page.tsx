/**
 * All cases on the platform, for the teams that see cases: filter by state (open, late,
 * at risk, closed), service, client and provider, and search by reference or name.
 * Customer names stay hidden for teams without access to personal data.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

import { icm, services } from "@/backend/engine";
import { slaBadge, whatOf } from "@/components/caseParts";
import { Badge, Card, inputClass, Loading, PageHead } from "@/components/ui";
import { date, num, placeText } from "@/lib/format";
import { useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const SCOPES = ["open", "late", "atRisk", "closed", "all"];
const PAGE = 60;

export default function Cases() {
  const t = useT();
  const [scope, setScope] = useState("open");
  const [service, setService] = useState("");
  const [entityId, setEntity] = useState("");
  const [providerId, setProvider] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const data = useQuery<Any>(async () => ({
    cases: await services().cases.list({ service: service || undefined, entityId: entityId || undefined, providerId: providerId || undefined, q: q || undefined }),
    db: icm().store.db,
  }), [service, entityId, providerId, q]);
  if (!data.data) return <Loading label={t("console.loading")} />;
  const wf = icm().wf;
  const all: Any[] = data.data.cases;
  const pick: Record<string, (c: Any) => boolean> = {
    open: (c) => !wf.isTerminal(c.status),
    late: (c) => c.sla === "breached",
    atRisk: (c) => c.sla === "at_risk",
    closed: (c) => wf.isTerminal(c.status),
    all: () => true,
  };
  const rows = all.filter(pick[scope]);
  const entities: Any[] = data.data.db.entities;
  const providers: Any[] = data.data.db.providers.filter((p: Any) => p.verification.status === "verified");
  const counts: Record<string, number> = {};
  SCOPES.forEach((s) => { counts[s] = all.filter(pick[s]).length; });

  return (
    <>
      <PageHead title={t("console.nav.cases")} sub={t("console.cases.sub")} />
      <div className="mb-3 flex flex-wrap gap-2" role="tablist">
        {SCOPES.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={scope === s} onClick={() => { setScope(s); setLimit(PAGE); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${scope === s ? "bg-accent text-white" : "border border-line bg-surface text-ink2 hover:bg-surface2"}`}>
            {t("console.cases.scope." + s)} <span className="opacity-80">({num(counts[s])})</span>
          </button>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("console.cases.search")} aria-label={t("console.cases.search")} />
        <select className={inputClass} value={service} onChange={(e) => setService(e.target.value)} aria-label={t("console.cases.service")}>
          <option value="">{t("console.cases.allServices")}</option>
          {["investigation", "collection"].map((s) => <option key={s} value={s}>{t("service." + s)}</option>)}
        </select>
        <select className={inputClass} value={entityId} onChange={(e) => setEntity(e.target.value)} aria-label={t("console.cases.client")}>
          <option value="">{t("console.cases.allClients")}</option>
          {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select className={inputClass} value={providerId} onChange={(e) => setProvider(e.target.value)} aria-label={t("console.cases.provider")}>
          <option value="">{t("console.cases.allProviders")}</option>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <Card>
        {!rows.length ? <p className="text-sm text-ink3">{t("console.cases.none")}</p> : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface2 text-xs text-ink2">
                <tr>
                  {["ref", "customer", "client", "provider", "status", "due"].map((h) => <th key={h} className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("console.cases.col." + h)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.slice(0, limit).map((c) => (
                  <tr key={c.id} className="hover:bg-surface2">
                    <td className="px-4 py-3 ps-5">
                      <Link href={`/cases/${c.id}`} className="font-mono font-medium text-accent hover:underline">{c.ref}</Link>
                      <div className="text-xs text-ink3">{t("service." + c.service)} · {whatOf(c)}</div>
                    </td>
                    <td className="px-4 py-3">{c.customer && c.customer.name ? c.customer.name : <span className="text-ink3">{t("console.cases.hidden")}</span>}<div className="text-xs text-ink3">{placeText(c.place, c.governorate)}</div></td>
                    <td className="px-4 py-3">{c.entityName}</td>
                    <td className="px-4 py-3">{c.providerName || "-"}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1"><Badge>{t("status." + c.status)}</Badge>{slaBadge(c, t)}{c.disputed ? <Badge tone="danger">{t("dispute.flag")}</Badge> : null}</div></td>
                    <td className="px-4 py-3 pe-5 text-ink2">{date(c.dueAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > limit ? <div className="mt-4 text-center"><button type="button" className="text-sm font-medium text-accent" onClick={() => setLimit(limit + PAGE)}>{t("console.cases.more", { n: num(rows.length - limit) })}</button></div> : null}
      </Card>
    </>
  );
}
