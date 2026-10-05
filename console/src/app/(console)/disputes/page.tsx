/**
 * Disputes: open ones (waiting for a proposed decision, or for the other team to confirm
 * one) and resolved ones. Legal and Management decide together.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

import { services } from "@/backend/engine";
import { Badge, Card, Loading, PageHead } from "@/components/ui";
import { date, num } from "@/lib/format";
import { useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const TABS = ["toDecide", "toConfirm", "resolved"];

export default function Disputes() {
  const t = useT();
  const [tab, setTab] = useState("toDecide");
  const q = useQuery<Any[]>(() => services().disputes.list());
  if (!q.data) return <Loading label={t("console.loading")} />;
  const group = (d: Any) => (d.status !== "open" ? "resolved" : d.proposal ? "toConfirm" : "toDecide");
  const rows = q.data.filter((d) => group(d) === tab);
  const counts: Record<string, number> = {};
  TABS.forEach((k) => { counts[k] = q.data!.filter((d) => group(d) === k).length; });
  return (
    <>
      <PageHead title={t("console.nav.disputes")} sub={t("console.disputes.sub")} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? "bg-accent text-white" : "border border-line bg-surface text-ink2 hover:bg-surface2"}`}>
            {t("console.disputes.tab." + k)} <span className="opacity-80">({num(counts[k])})</span>
          </button>
        ))}
      </div>
      <Card>
        {!rows.length ? <p className="text-sm text-ink3">{t("console.disputes.empty." + tab)}</p> : (
          <ul className="-m-5 divide-y divide-line">
            {rows.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/disputes/${d.id}`} className="font-mono font-medium text-accent hover:underline">{d.ref}</Link>
                  <span className="ms-2 text-sm">{t("dispute.kindLabel." + d.kind)} · {t("dispute.reason." + d.reason)}</span>
                  <div className="text-xs text-ink2">{d.entityName} / {d.providerName}{d.caseRef ? " · " + d.caseRef : ""} · {date(d.createdAt)}</div>
                </div>
                {d.status !== "open" ? <Badge tone={d.outcome === "rejected" ? "neutral" : "info"}>{t("dispute.outcome." + d.outcome)}</Badge>
                  : d.proposal ? <Badge tone="warning">{t("console.disputes.proposed", { outcome: t("dispute.outcome." + d.proposal.outcome) })}</Badge>
                  : <Badge tone="danger">{t("console.disputes.waiting")}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
