/** Pieces shared by the e-invoicing (ETA) screens. */
"use client";

import { services } from "@/backend/engine";
import { useDialog } from "@/components/dialog";
import { Badge, Button, Card, Notice } from "@/components/ui";
import { errorText, money } from "@/lib/format";
import { useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** What is still missing before e-invoices can be sent. */
export function EtaProblems({ problems }: { problems: Any[] }) {
  const t = useT();
  return (
    <Notice tone="warning">
      <div className="mb-1 font-medium">{t("console.eta.missing")}</div>
      <ul className="list-disc space-y-0.5 ps-5">
        {problems.map((p, i) => <li key={i}>{t(p.key, { service: p.service ? t("service." + p.service) : "" })}</li>)}
      </ul>
    </Notice>
  );
}

/** Save JSON as a file in the browser. */
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** One invoice as an ETA document: ready or not, the VAT figures, and the file. */
export function EtaCard({ invoiceId, invoiceRef }: { invoiceId: string; invoiceRef: string }) {
  const t = useT();
  const { toast } = useDialog();
  const q = useQuery<Any>(() => services().billing.etaDocument(invoiceId), [invoiceId]);
  if (!q.data) return q.error ? <Notice tone="danger">{errorText(q.error)}</Notice> : null;
  const d = q.data.document;
  return (
    <Card title={t("console.eta.invoiceTitle")} className="mt-4"
      right={<Badge tone={q.data.ready ? "success" : "warning"}>{q.data.ready ? t("console.eta.ready") : t("console.eta.notReady")}</Badge>}>
      {q.data.problems.length ? <div className="mb-3"><EtaProblems problems={q.data.problems} /></div> : null}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-ink2">{t("console.eta.net")}</dt><dd>{money(d.netAmount)}</dd></div>
        <div><dt className="text-xs text-ink2">{t("console.eta.vatAmount")}</dt><dd>{money(d.taxTotals[0].amount)}</dd></div>
        <div><dt className="text-xs text-ink2">{t("console.eta.total")}</dt><dd className="font-semibold">{money(d.totalAmount)}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => { download(`${invoiceRef}-eta.json`, d); toast(t("console.eta.downloaded")); }}>{t("console.eta.download")}</Button>
        <span className="text-xs text-ink3">{t("console.eta.signNote")}</span>
      </div>
    </Card>
  );
}
