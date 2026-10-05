/**
 * Platform reports for Management and Data: six months of volume and timeliness, and
 * figures per service, provider, client and governorate. Totals only, no customer
 * details; value of work only for teams that see billing.
 */
"use client";

import { icm, services } from "@/backend/engine";
import { Card, Loading, PageHead } from "@/components/ui";
import { gov, money, num, pct } from "@/lib/format";
import { useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function Table({ title, rows, name, score }: { title: string; rows: Any[]; name: (r: Any) => string; score?: boolean }) {
  const t = useT();
  return (
    <Card title={title}>
      <div className="-m-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface2 text-xs text-ink2">
            <tr>{["name", "cases", "open", "onTime", ...(score ? ["score"] : [])].map((h) => <th key={h} className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("console.reports.col." + h)}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5 ps-5">{name(r)}</td>
                <td className="px-4 py-2.5">{num(r.cases)}</td>
                <td className="px-4 py-2.5">{num(r.open)}</td>
                <td className="px-4 py-2.5">{pct(r.onTime)}</td>
                {score ? <td className="px-4 py-2.5 pe-5">{r.score != null ? num(r.score, 1) : "-"}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function Reports() {
  const t = useT();
  const q = useQuery<Any>(() => services().analytics.platformReport());
  if (!q.data) return <Loading label={t("console.loading")} />;
  const d = q.data, U = icm().util;
  const max = Math.max(1, ...d.months.map((m: Any) => Math.max(m.created, m.closed)));
  const money_ = d.months[0].gmv !== null;
  return (
    <>
      <PageHead title={t("console.nav.reports")} sub={t("console.reports.sub")} />
      <div className="space-y-4">
        <Card title={t("console.reports.monthly")}>
          <div className="flex h-44 items-end gap-4">
            {d.months.map((m: Any) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1 text-xs text-ink2">
                <div className="flex h-28 items-end gap-1">
                  <div className="w-3 rounded-t bg-accent" style={{ height: Math.max(2, (m.created / max) * 112) }} title={t("console.reports.created") + " " + m.created} />
                  <div className="w-3 rounded-t bg-ok" style={{ height: Math.max(2, (m.closed / max) * 112) }} title={t("console.reports.closed") + " " + m.closed} />
                </div>
                <span>{num(m.created)} / {num(m.closed)}</span>
                <span>{U.fmtMonth(m.month)}</span>
                <span>{t("console.reports.onTimeShort", { pct: pct(m.onTime) })}</span>
                {money_ ? <span>{money(m.gmv)}</span> : null}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-ink2">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-accent" />{t("console.reports.created")}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-ok" />{t("console.reports.closed")}</span>
          </div>
        </Card>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Table title={t("console.reports.byService")} rows={d.services} name={(r) => t("service." + r.id)} />
          <Table title={t("console.reports.byGov")} rows={d.governorates} name={(r) => gov(r.id)} />
          <Table title={t("console.reports.byProvider")} rows={d.providers} name={(r) => r.name} score />
          <Table title={t("console.reports.byClient")} rows={d.clients} name={(r) => r.name} />
        </div>
      </div>
    </>
  );
}
