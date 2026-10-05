/**
 * Providers: applications waiting for review (Operations, then Management sign-off),
 * live providers, and requests from live providers (price changes and document
 * renewals). Each tab appears only for teams that use it.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

import { icm, services } from "@/backend/engine";
import { Badge, Card, Loading, PageHead, Tone } from "@/components/ui";
import { date, num } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const STATUS_TONE: Record<string, Tone> = { pending: "warning", awaiting_signoff: "info", info_requested: "neutral", rejected: "danger", verified: "success" };
const LEVEL_TONE: Record<string, Tone> = { none: "success", warned: "warning", reduced: "warning", suspended: "danger" };

export default function Providers() {
  const t = useT();
  const { can } = useApp();
  const reviewer = can("providers.approve") || can("providers.signoff");
  const requests = can("providers.prices") || can("providers.documents");
  const tabs = [reviewer ? "applications" : null, "live", requests ? "requests" : null].filter(Boolean) as string[];
  const [tab, setTab] = useState(tabs[0]);
  const q = useQuery<Any>(async () => ({
    apps: reviewer ? await services().providers.applications() : [],
    live: await services().providers.list(),
  }), [reviewer]);
  if (!q.data) return <Loading label={t("console.loading")} />;
  const now = icm().clock.now(), wf = icm().wf;
  const open = q.data.apps.filter((p: Any) => wf.applicationOpen(p.verification.status));
  const req = q.data.live.filter((p: Any) => p.priceRequest || p.verification.documents.some((d: Any) => d.renewal || d.status === "uploaded"));
  const counts: Record<string, number> = { applications: open.length, live: q.data.live.length, requests: req.length };
  const rows: Any[] = tab === "applications" ? q.data.apps : tab === "requests" ? req : q.data.live;

  return (
    <>
      <PageHead title={t("console.nav.providers")} sub={t("console.providers.sub")} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {tabs.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? "bg-accent text-white" : "border border-line bg-surface text-ink2 hover:bg-surface2"}`}>
            {t("console.providers.tab." + k)} <span className="opacity-80">({num(counts[k])})</span>
          </button>
        ))}
      </div>
      <Card>
        {!rows.length ? <p className="text-sm text-ink3">{t("console.providers.empty." + tab)}</p> : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface2 text-start text-xs text-ink2">
                <tr>
                  <th className="px-5 py-2.5 text-start font-medium">{t("common.name")}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t("console.providers.services")}</th>
                  {tab === "live" ? <th className="px-3 py-2.5 text-start font-medium">{t("score.label")}</th> : null}
                  <th className="px-3 py-2.5 text-start font-medium">{t("common.status")}</th>
                  <th className="px-5 py-2.5 text-start font-medium">{tab === "applications" ? t("console.providers.applied") : tab === "requests" ? t("console.providers.waiting") : t("console.providers.openCases")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => {
                  const st = p.verification.status;
                  const docs = p.verification.documents.filter((d: Any) => d.renewal || d.status === "uploaded").length;
                  const expired = wf.expiredDocs(p, now).length;
                  return (
                    <tr key={p.id} className="hover:bg-surface2">
                      <td className="px-5 py-3">
                        <Link href={`/providers/${p.id}`} className="font-medium text-accent hover:underline">{p.name}</Link>
                        <div className="text-xs text-ink3">{t("kind." + p.kind)} · {p.city}</div>
                      </td>
                      <td className="px-3 py-3">{p.services.map((s: string) => t("service." + s)).join(t("common.listSep"))}</td>
                      {tab === "live" ? <td className="px-3 py-3">{p.score ? num(p.score.overall, 1) : "-"}</td> : null}
                      <td className="px-3 py-3">
                        {tab === "live" ? <Badge tone={LEVEL_TONE[p.enforcement.level]}>{t("enforcement." + p.enforcement.level)}</Badge>
                          : <Badge tone={STATUS_TONE[st] || "neutral"}>{t("status." + st)}</Badge>}
                        {expired ? <span className="ms-1"><Badge tone="danger">{t("settings.state.expired")}</Badge></span> : null}
                      </td>
                      <td className="px-5 py-3 text-ink2">
                        {tab === "applications" ? date(p.verification.submittedAt)
                          : tab === "requests" ? [p.priceRequest ? t("console.providers.priceChange") : null, docs ? t("console.providers.docsN", { n: num(docs) }) : null].filter(Boolean).join(" · ")
                          : num(p.openCases)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
