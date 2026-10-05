/**
 * Finance: what clients owe and have paid, platform revenue, the platform fee (changed
 * only by Finance and Management together) and every invoice by status.
 */
"use client";

import Link from "next/link";
import { useState } from "react";

import { icm, services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { Badge, Button, Card, Kpi, Loading, PageHead } from "@/components/ui";
import { dateTime, money, num } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const TABS = ["draft", "issued", "paid"];

export default function Finance() {
  const t = useT();
  const [tab, setTab] = useState("draft");
  const q = useQuery<Any>(async () => ({ invoices: await services().billing.invoices(), fee: await services().billing.fee() }));
  if (!q.data) return <Loading label={t("console.loading")} />;
  const U = icm().util, now = icm().clock.now(), month = U.monthKey(now);
  const list: Any[] = q.data.invoices;
  const sum = (rows: Any[], k: string) => rows.reduce((a, i) => a + (i[k] || 0), 0);
  const issued = list.filter((i) => i.status === "issued");
  const toIssue = list.filter((i) => i.status === "draft" && i.month < month && i.lines.length);
  const paidThisMonth = list.filter((i) => i.status === "paid" && i.paidAt && U.monthKey(i.paidAt) === month);
  const thisMonth = list.filter((i) => i.month === month);
  const rows = list.filter((i) => i.status === tab);

  return (
    <>
      <PageHead title={t("console.nav.finance")} sub={t("console.finance.sub")} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("console.finance.outstanding")} value={money(sum(issued, "subtotal"))} sub={t("console.finance.invoicesN", { n: num(issued.length) })} tone={issued.length ? "warn" : undefined} />
        <Kpi label={t("console.finance.toIssue")} value={money(sum(toIssue, "subtotal"))} sub={t("console.finance.invoicesN", { n: num(toIssue.length) })} tone={toIssue.length ? "warn" : undefined} />
        <Kpi label={t("console.finance.paidMonth")} value={money(sum(paidThisMonth, "subtotal"))} tone="ok" />
        <Kpi label={t("console.finance.revenueMonth")} value={money(sum(thisMonth, "platformFee"))} sub={t("console.finance.payouts", { amount: money(sum(issued, "providerNet")) })} />
      </div>
      <FeeCard fee={q.data.fee} />
      <div className="mb-3 mt-6 flex flex-wrap gap-2" role="tablist">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? "bg-accent text-white" : "border border-line bg-surface text-ink2 hover:bg-surface2"}`}>
            {t("invoiceStatus." + k)} <span className="opacity-80">({num(list.filter((i) => i.status === k).length)})</span>
          </button>
        ))}
      </div>
      <Card>
        {!rows.length ? <p className="text-sm text-ink3">{t("invoice.none")}</p> : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface2 text-xs text-ink2">
                <tr>{["ref", "month", "client", "provider", "total", "fee"].map((h) => <th key={h} className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("console.finance.col." + h)}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((i) => (
                  <tr key={i.id} className="hover:bg-surface2">
                    <td className="px-4 py-3 ps-5"><Link href={`/finance/${i.id}`} className="font-mono font-medium text-accent hover:underline">{i.ref}</Link>
                      {i.status === "draft" && i.month < month && i.lines.length ? <span className="ms-2"><Badge tone="warning">{t("console.finance.ready")}</Badge></span> : null}</td>
                    <td className="px-4 py-3">{U.fmtMonth(i.month)}</td>
                    <td className="px-4 py-3">{i.entityName}</td>
                    <td className="px-4 py-3">{i.providerName}</td>
                    <td className="px-4 py-3">{money(i.subtotal)} <span className="text-xs text-ink3">({t("console.finance.casesN", { n: num(i.lines.length) })})</span></td>
                    <td className="px-4 py-3 pe-5">{money(i.platformFee)} <span className="text-xs text-ink3">({num(i.platformFeePct, 1)}%)</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/** The platform fee, a change waiting for the other team, and past changes. */
function FeeCard({ fee }: { fee: Any }) {
  const t = useT();
  const { can, session } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const p = fee.proposal;
  const me = session?.user;
  const teams: string[] = icm().wf.DUAL_APPROVAL["fee.change"];
  const canSecond = !!p && !!me && p.by !== me.id && (me.role === "platform_admin" || p.role === "platform_admin" || me.role !== p.role);
  const other = p ? teams.filter((r) => r !== p.role)[0] || teams[1] : null;

  const propose = async () => {
    const v = await ask({
      title: t("console.finance.proposeFee"), message: t("console.finance.proposeBody", { pct: num(fee.pct, 1) }),
      options: [5, 7.5, 10, 12.5, 15, 20].filter((x) => x !== fee.pct).map((x) => ({ value: String(x), label: num(x, 1) + "%" })), optionLabel: t("console.finance.newFee"),
      note: "required", noteLabel: t("common.reason"), confirmLabel: t("console.finance.proposeFee"),
    });
    const pct = v && v.option ? +v.option : null;
    if (v && pct != null) await run(() => services().billing.proposeFee(pct, v.note), t("console.finance.feeProposed"));
  };
  const confirm = async () => {
    if (await ask({ title: t("console.finance.confirmFee"), message: t("console.finance.confirmBody", { pct: num(p.pct, 1) }), confirmLabel: t("console.finance.confirmFee") })) await run(() => services().billing.confirmFee(), t("console.finance.feeChanged"));
  };
  const sendBack = async () => {
    const v = await ask({ title: t("dispute.sendBack"), note: "required", noteLabel: t("common.reason"), confirmLabel: t("dispute.sendBack") });
    if (v) await run(() => services().billing.sendBackFee(v.note), t("console.finance.feeSentBack"));
  };

  return (
    <Card title={t("console.finance.fee")} right={!p && can("fee.change") ? <Button kind="ghost" onClick={propose}>{t("console.finance.proposeFee")}</Button> : null}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <div className="text-3xl font-semibold">{num(fee.pct, 1)}%</div>
          <p className="mt-1 text-xs text-ink2">{t("console.finance.feeHint")}</p>
        </div>
        <div className="md:col-span-2">
          {p ? (
            <div className="space-y-2 rounded-lg bg-warn-bg p-3 text-sm text-warn">
              <div className="font-semibold">{t("console.finance.pending", { from: num(p.from, 1), to: num(p.pct, 1) })}</div>
              <p className="text-ink">{p.note}</p>
              <div className="text-xs">{t("console.disputes.proposedLine", { name: p.byName, team: t("role." + p.role), at: dateTime(p.at) })}</div>
              {can("fee.change") && canSecond ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button kind="primary" onClick={confirm}>{t("console.finance.confirmFee")}</Button>
                  <Button onClick={sendBack}>{t("dispute.sendBack")}</Button>
                </div>
              ) : <div className="text-xs text-ink2">{t("console.disputes.waitingFor", { team: t("role." + other) })}</div>}
            </div>
          ) : fee.history.length ? (
            <ul className="space-y-1.5 text-xs text-ink2">
              {fee.history.slice(0, 4).map((h: Any, i: number) => (
                <li key={i}>
                  {h.confirmedBy
                    ? t("console.finance.changedLine", { from: num(h.from, 1), to: num(h.to, 1), by: h.proposedBy, by2: h.confirmedBy, at: dateTime(h.confirmedAt) })
                    : t("console.finance.sentBackLine", { to: num(h.to, 1), by: h.proposedBy, by2: h.sentBackBy, note: h.sentBackNote })}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink3">{t("console.finance.noChanges")}</p>}
        </div>
      </div>
    </Card>
  );
}
