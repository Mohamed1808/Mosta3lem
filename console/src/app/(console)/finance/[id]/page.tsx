/**
 * One invoice: client, provider, month, totals (billed, platform fee, provider net), and
 * each closed case with its amount. Finance issues it, records the payment received, and
 * adjusts what a case is billed (with a reason) while the invoice is unpaid.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { icm, services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { Badge, Button, Card, Kpi, Loading, Notice, PageHead } from "@/components/ui";
import { date, dateTime, money, num } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const q = useQuery<Any>(async () => (await services().billing.invoices()).find((i: Any) => i.id === id) || null, [id]);
  if (q.loading && !q.data) return <Loading label={t("console.loading")} />;
  if (!q.data) return <Notice tone="danger">{t("errors.notFound")}</Notice>;
  return <Body inv={q.data} />;
}

function Body({ inv }: { inv: Any }) {
  const t = useT();
  const { can } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const U = icm().util;
  const tone = inv.status === "paid" ? "success" : inv.status === "issued" ? "warning" : "neutral";

  const issue = async () => {
    if (await ask({ title: t("invoice.issue"), message: t("invoice.issueBody"), confirmLabel: t("invoice.issue") })) await run(() => services().billing.issue(inv.id), t("invoice.issued"));
  };
  const pay = async () => {
    if (await ask({ title: t("console.finance.recordPayment"), message: t("console.finance.recordPaymentBody", { amount: money(inv.subtotal), client: inv.entityName }), confirmLabel: t("console.finance.recordPayment") })) {
      await run(() => services().billing.markPaid(inv.id), t("invoice.paid"));
    }
  };
  const adjust = async (l: Any) => {
    const v = await ask({
      title: t("console.finance.adjustTitle", { ref: l.caseRef }), message: t("console.finance.adjustBody"),
      options: [100, 75, 50, 25, 0].map((p) => ({ value: String(p), label: t("console.finance.billPct", { pct: p }) })), optionLabel: t("console.finance.billAt"),
      note: "required", noteLabel: t("common.reason"), confirmLabel: t("console.finance.adjust"),
    });
    const pct = v && v.option != null ? +v.option : null;
    if (v && pct != null) await run(() => services().billing.adjustLine(inv.id, l.caseId, pct, v.note), t("console.finance.adjusted"));
  };

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/finance" className="text-accent hover:underline">{t("console.nav.finance")}</Link></div>
      <PageHead title={t("invoice.title", { ref: inv.ref })} sub={inv.entityName + " → " + inv.providerName + " · " + U.fmtMonth(inv.month)}
        right={<Badge tone={tone}>{t("invoiceStatus." + inv.status)}</Badge>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {inv.status === "draft" && can("billing.issue") ? <Button kind="primary" onClick={issue} disabled={!inv.lines.length}>{t("invoice.issue")}</Button> : null}
        {inv.status === "issued" && can("billing.pay") ? <Button kind="primary" onClick={pay}>{t("console.finance.recordPayment")}</Button> : null}
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label={t("console.finance.billed")} value={money(inv.subtotal)} />
        <Kpi label={t("invoice.platformFee")} value={money(inv.platformFee)} sub={num(inv.platformFeePct, 1) + "%"} tone="ok" />
        <Kpi label={t("console.finance.providerNet")} value={money(inv.providerNet)} />
      </div>
      <Card title={t("console.finance.lines", { n: num(inv.lines.length) })}>
        <div className="-m-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface2 text-xs text-ink2">
              <tr>{["case", "service", "closed", "amount", ""].map((h, i) => <th key={i} className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{h ? t("console.finance.line." + h) : ""}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {inv.lines.map((l: Any) => {
                const adjusted = l.adjustment != null && l.adjustment !== 1;
                return (
                  <tr key={l.caseId}>
                    <td className="px-4 py-3 ps-5"><Link href={`/cases/${l.caseId}`} className="font-mono text-accent hover:underline">{l.caseRef}</Link></td>
                    <td className="px-4 py-3">{t("service." + l.service)}</td>
                    <td className="px-4 py-3">{date(l.closedAt)}</td>
                    <td className="px-4 py-3">
                      {money(l.billed)}
                      {adjusted ? <div className="text-xs text-warn">{t("console.finance.billedAt", { pct: Math.round(l.adjustment * 100) })}{l.adjustReason ? ": " + l.adjustReason : ""}{l.adjustedBy ? " · " + l.adjustedBy + ", " + dateTime(l.adjustedAt) : ""}</div> : null}
                    </td>
                    <td className="px-4 py-3 pe-5 text-end">{inv.status !== "paid" && can("billing.adjust") ? <Button kind="ghost" onClick={() => adjust(l)}>{t("console.finance.adjust")}</Button> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {inv.paidAt ? <p className="mt-3 text-xs text-ink2">{t("console.finance.paidLine", { at: dateTime(inv.paidAt), by: inv.paidBy ? inv.paidBy.name : "-" })}</p> : null}
    </>
  );
}
