/**
 * One case for platform staff: what was requested, the evidence and report, the
 * timeline, and the platform's actions for Operations and Management (extend the
 * deadline, move the case to another provider, cancel). Quality reviews a report from
 * here too. Customer details are hidden for teams without access to personal data.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { icm, services } from "@/backend/engine";
import { Balance, CheckIn, Photos, ReportView, RequestDetails, slaBadge, Timeline } from "@/components/caseParts";
import { useAction, useDialog } from "@/components/dialog";
import { Badge, Button, Card, Loading, Notice, PageHead } from "@/components/ui";
import { money } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const q = useQuery<Any>(() => services().cases.get(id), [id]);
  if (q.error && !q.data) return <Notice tone="danger">{t(q.error.key || "errors.generic")}</Notice>;
  if (!q.data) return <Loading label={t("console.loading")} />;
  return <Body d={q.data} />;
}

function Body({ d }: { d: Any }) {
  const t = useT();
  const { can } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const c = d.case, a: string[] = d.actions || [];
  const manage = can("cases.manage");

  const extend = async () => {
    const v = await ask({
      title: t("admin.extendSla"), options: [12, 24, 48, 72].map((h) => ({ value: String(h), label: t("console.cases.hours", { n: h }) })),
      optionLabel: t("admin.extendHours"), note: "required", noteLabel: t("common.reason"), confirmLabel: t("admin.extendSla"),
    });
    if (v) await run(() => services().cases.extendSla(c.id, +(v.option || 24), v.note), t("admin.extended"));
  };
  const reassign = async () => {
    const m: Any = await services().marketplace.eligible({ service: c.service, demand: { [c.governorate]: 1 }, inquiryTypes: c.inquiryTypes, bucket: c.bucket, caseId: c.id });
    const options = m.providers.filter((p: Any) => p.id !== c.providerId).map((p: Any) => ({ value: p.id, label: p.name + " · " + (c.service === "investigation" ? money(p.price) : p.feePct + "%") }));
    if (!options.length) { await ask({ title: t("admin.forceReassign"), message: t("console.cases.noOtherProvider"), confirmLabel: t("common.close") }); return; }
    const v = await ask({ title: t("admin.forceReassign"), message: t("admin.reassignBody"), options, optionLabel: t("console.cases.provider"), note: "required", noteLabel: t("common.reason"), confirmLabel: t("admin.forceReassign") });
    if (v && v.option) await run(() => services().cases.forceReassign(c.id, v.option, v.note), t("admin.reassigned"));
  };
  const cancel = async () => {
    const v = await ask({ title: t("action.cancel"), message: t("admin.cancelBody"), note: "required", noteLabel: t("common.reason"), danger: true, confirmLabel: t("action.cancel") });
    if (v) await run(() => services().cases.transition(c.id, "cancel", { reason: v.note }), t("case.cancelled"));
  };
  const approve = async () => {
    if (await ask({ title: t("action.approve"), message: t("review.approveBody"), confirmLabel: t("action.approve") })) await run(() => services().cases.transition(c.id, "approve", {}), t("review.delivered"));
  };
  const giveBack = async () => {
    const v = await ask({ title: t("action.return_to_agent"), message: t("console.cases.returnBody"), note: "required", noteLabel: t("review.comment"), confirmLabel: t("action.return_to_agent") });
    if (v) await run(() => services().cases.transition(c.id, "return_to_agent", { comment: v.note }), t("review.returned"));
  };

  const openDispute = async () => {
    const v = await ask({
      title: t("console.cases.disputeForClient"), message: t("console.cases.disputeForClientBody", { client: c.entityName }),
      options: ["report_inaccurate", "evidence_missing", "sla_missed", "conduct", "billing", "other"].map((r) => ({ value: r, label: t("dispute.reason." + r) })),
      optionLabel: t("dispute.reasonLabel"), note: "required", noteLabel: t("dispute.details"), confirmLabel: t("dispute.submit"),
    });
    if (v && v.option) await run(() => services().disputes.open({ kind: "case", caseId: c.id, reason: v.option, details: v.note }), t("dispute.opened"));
  };
  const disputeOpen = (d.disputes || []).some((x: Any) => x.kind === "case" && x.status === "open");

  const actions = [
    a.indexOf("approve") >= 0 ? <Button key="approve" kind="primary" onClick={approve}>{t("action.approve")}</Button> : null,
    a.indexOf("return_to_agent") >= 0 ? <Button key="back" onClick={giveBack}>{t("action.return_to_agent")}</Button> : null,
    manage && c.dueAt && !icm().wf.isTerminal(c.status) ? <Button key="extend" onClick={extend}>{t("admin.extendSla")}</Button> : null,
    a.indexOf("force_reassign") >= 0 ? <Button key="reassign" onClick={reassign}>{t("admin.forceReassign")}</Button> : null,
    a.indexOf("cancel") >= 0 ? <Button key="cancel" kind="danger" onClick={cancel}>{t("action.cancel")}</Button> : null,
    can("disputes.openOnBehalf") && c.providerId && c.acceptedAt && !disputeOpen && ["cancelled", "awaiting_acceptance"].indexOf(c.status) < 0
      ? <Button key="dispute" onClick={openDispute}>{t("console.cases.disputeForClient")}</Button> : null,
  ].filter(Boolean);

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/cases" className="text-accent hover:underline">{t("console.nav.cases")}</Link></div>
      <PageHead title={c.ref} sub={c.entityName + (c.providerName ? " → " + c.providerName : "")}
        right={<div className="flex flex-wrap gap-1"><Badge>{t("status." + c.status)}</Badge>{slaBadge(c, t)}<Badge tone="info">{t("service." + c.service)}</Badge>{c.disputed ? <Badge tone="danger">{t("dispute.flag")}</Badge> : null}</div>} />
      {c.masked ? <div className="mb-4"><Notice>{t("console.cases.maskedNote")}</Notice></div> : null}
      {actions.length ? <div className="mb-4 flex flex-wrap gap-2">{actions}</div> : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("console.cases.request")}><RequestDetails c={c} /></Card>
          {c.service === "investigation" ? (
            <Card title={t("console.cases.evidence")}>
              <div className="space-y-4">
                <CheckIn ci={c.checkIn} masked={c.masked} />
                <Photos photos={c.photos} />
                <ReportView c={c} />
              </div>
            </Card>
          ) : !c.masked ? <Card title={t("collection.balance")}><Balance c={c} /></Card> : null}
        </div>
        <Card title={t("console.cases.timeline")}><Timeline c={c} /></Card>
      </div>
    </>
  );
}
