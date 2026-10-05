/**
 * Overview: the platform at a glance for every team. Money figures appear only for teams
 * that handle billing (the engine leaves them out for the others).
 */
"use client";

import { icm, services } from "@/backend/engine";
import { Badge, Card, Kpi, Loading, Notice, PageHead } from "@/components/ui";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function Overview() {
  const t = useT();
  const { session, can } = useApp();
  const q = useQuery<Any>(() => (can("overview") ? services().analytics.adminOverview() : Promise.resolve(null)));
  const U = icm().util;
  const d = q.data;
  const name = (session?.user?.name || "").split(" ")[0];
  if (!can("overview")) return <PageHead title={t("console.hello", { name })} />;
  if (!d) return <Loading label={t("console.loading")} />;
  const open = (svc: string) => Object.keys(d.byStatus[svc]).filter((s) => !icm().wf.isTerminal(s)).reduce((a, s) => a + d.byStatus[svc][s], 0);
  const money = d.gmvMonth !== null;
  // Best and lowest scores, once each (they overlap while there are few providers).
  const ranked = [...d.top, ...d.bottom].filter((p: Any, i: number, all: Any[]) => all.findIndex((x) => x.id === p.id) === i).sort((a: Any, b: Any) => b.score - a.score);
  const waiting: [string, number][] = [
    [t("console.overview.applications"), d.pendingApplications],
    [t("console.overview.disputes"), d.openDisputes],
    [t("console.overview.qa"), d.qaQueue],
    [t("console.overview.flagged"), d.flaggedRatings],
  ];
  return (
    <>
      <PageHead title={t("console.hello", { name })} sub={t("console.overview.sub")} />
      {money ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label={t("console.overview.gmvMonth")} value={U.money(d.gmvMonth)} />
          <Kpi label={t("console.overview.revenue")} value={U.money(d.platformRevenueMonth)} tone="ok" />
          <Kpi label={t("console.overview.gmvTotal")} value={U.money(d.gmvTotal)} />
        </div>
      ) : <div className="mb-4"><Notice>{t("console.overview.moneyHidden")}</Notice></div>}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("console.overview.openWork")} value={U.num(open("investigation") + open("collection"))}
          sub={t("service.investigation") + " " + U.num(open("investigation")) + " · " + t("service.collection") + " " + U.num(open("collection"))} />
        <Kpi label={t("console.overview.atRisk")} value={U.num(d.atRiskNow)} tone={d.atRiskNow ? "warn" : undefined} />
        <Kpi label={t("console.overview.breached")} value={U.num(d.breachedNow)} tone={d.breachedNow ? "bad" : undefined} />
        <Kpi label={t("console.overview.missed")} value={U.num(d.missedTotal)} />
        <Kpi label={t("console.overview.activeEntities")} value={U.num(d.activeEntities)} sub={t("console.overview.totalEntities", { n: U.num(d.totalEntities) })} />
        <Kpi label={t("console.overview.activeProviders")} value={U.num(d.activeProviders)} />
        <Kpi label={t("console.overview.suspended")} value={U.num(d.suspendedProviders)} tone={d.suspendedProviders ? "warn" : undefined} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("console.overview.attention")}>
          <ul className="divide-y divide-line">
            {waiting.map(([label, n]) => (
              <li key={label} className="flex items-center justify-between py-2.5 text-sm">
                <span>{label}</span>
                {n ? <Badge tone="warning">{U.num(n)}</Badge> : <span className="text-ink3">0</span>}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("console.overview.scores")}>
          <ul className="divide-y divide-line text-sm">
            {ranked.map((p: Any) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                <span className="truncate">{p.name}</span>
                <Badge tone={p.score >= 85 ? "success" : p.score >= 70 ? "info" : "warning"}>{U.num(p.score, 1)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        {money && d.gmvSeries ? (
          <Card title={t("console.overview.trend")} className="lg:col-span-2">
            <div className="flex h-40 items-end gap-6">
              {d.gmvSeries.map((m: Any) => {
                const max = Math.max(1, ...d.gmvSeries.map((x: Any) => x.gmv));
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs text-ink2">{U.money(m.gmv)}</span>
                    <div className="w-full max-w-24 rounded-t bg-accent" style={{ height: Math.max(4, (m.gmv / max) * 100) }} />
                    <span className="text-xs text-ink2">{U.fmtMonth(m.month)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
