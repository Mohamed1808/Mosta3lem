/**
 * One dispute: what each side said, the disputed rating or case, platform notes, and the
 * two-step decision. One person from Legal or Management proposes the outcome; a person
 * from the other team confirms it (it then takes effect) or sends it back with a note.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ReactNode } from "react";

import { icm, services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { Badge, Button, Card, Loading, Notice, PageHead } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function DisputePage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const q = useQuery<Any>(() => services().disputes.get(id), [id]);
  if (q.error && !q.data) return <Notice tone="danger">{t(q.error.key || "errors.generic")}</Notice>;
  if (!q.data) return <Loading label={t("console.loading")} />;
  return <Body d={q.data} />;
}

/** Can this person give the second approval on a proposal (mirrors the engine's rule)? */
function canConfirm(p: Any, me: Any) {
  if (!p || !me || p.by === me.id) return false;
  return me.role === "platform_admin" || p.role === "platform_admin" || me.role !== p.role;
}

function Body({ d }: { d: Any }) {
  const t = useT();
  const { can, session } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const open = d.status === "open";
  const me = session?.user;
  const decide = can("disputes.decide");
  const teams: string[] = icm().wf.DUAL_APPROVAL["disputes.decide"];
  const other = d.proposal ? teams.filter((r) => r !== d.proposal.role)[0] || teams[1] : null;
  const hiddenText = t("console.disputes.textHidden");

  const sides: { title: string; party: string; items: { by: string; text: string | null; at: number }[] }[] = [
    { title: t("dispute.entitySide", { name: d.entityName }), party: "entity", items: [] },
    { title: t("dispute.providerSide", { name: d.providerName }), party: "provider", items: [] },
  ];
  const first = { by: d.raisedByName + (d.onBehalfOf ? " (" + t("console.disputes.onBehalf") + ")" : ""), text: d.details, at: d.createdAt };
  (d.raisedByParty === "provider" ? sides[1] : sides[0]).items.push(first);
  (d.responses || []).forEach((r: Any) => { const s = sides.find((x) => x.party === r.party); if (s) s.items.push({ by: r.byName, text: r.text, at: r.at }); });
  const notes = (d.responses || []).filter((r: Any) => r.party === "admin");

  const propose = async () => {
    const v = await ask({
      title: t("console.disputes.propose"), message: d.kind === "rating" ? t("dispute.ratingEffects") : t("dispute.caseEffects"),
      options: ["upheld", "partial", "rejected"].map((o) => ({ value: o, label: t("dispute.outcome." + o) })), optionLabel: t("dispute.outcomeLabel"),
      note: "required", noteLabel: t("dispute.resolutionNote"), confirmLabel: t("console.disputes.propose"),
    });
    if (v && v.option) await run(() => services().disputes.propose(d.id, v.option, v.note), t("dispute.proposed"));
  };
  const confirm = async () => {
    if (await ask({ title: t("dispute.confirmDecision"), message: t("dispute.confirmBody"), confirmLabel: t("dispute.confirmDecision") })) await run(() => services().disputes.confirm(d.id), t("dispute.resolved"));
  };
  const sendBack = async () => {
    const v = await ask({ title: t("dispute.sendBack"), note: "required", noteLabel: t("common.reason"), confirmLabel: t("dispute.sendBack") });
    if (v) await run(() => services().disputes.sendBack(d.id, v.note), t("console.disputes.sentBack"));
  };
  const addNote = async () => {
    const v = await ask({ title: t("dispute.addNote"), note: "required", confirmLabel: t("common.save") });
    if (v) await run(() => services().disputes.respond(d.id, v.note), t("console.disputes.noteAdded"));
  };

  let decision: ReactNode;
  if (!open) {
    decision = (
      <div className="space-y-2 text-sm">
        <Badge tone={d.outcome === "rejected" ? "neutral" : "info"}>{t("dispute.outcome." + d.outcome)}</Badge>
        <p>{d.resolutionNote}</p>
        {d.decision ? (
          <ul className="text-xs text-ink2">
            <li>{t("console.disputes.proposedLine", { name: d.decision.proposedBy, team: t("role." + d.decision.proposedRole), at: dateTime(d.decision.proposedAt) })}</li>
            <li>{t("console.disputes.confirmedLine", { name: d.decision.confirmedBy, team: t("role." + d.decision.confirmedRole), at: dateTime(d.decision.confirmedAt) })}</li>
          </ul>
        ) : <p className="text-xs text-ink2">{d.resolvedBy} · {dateTime(d.resolvedAt)}</p>}
      </div>
    );
  } else if (d.proposal) {
    decision = (
      <div className="space-y-3 text-sm">
        <div className="rounded-lg bg-warn-bg p-3 text-warn">
          <div className="font-semibold">{t("dispute.proposalTitle")}: {t("dispute.outcome." + d.proposal.outcome)}</div>
          <p className="mt-1 text-ink">{d.proposal.note}</p>
          <div className="mt-1 text-xs">{t("console.disputes.proposedLine", { name: d.proposal.byName, team: t("role." + d.proposal.role), at: dateTime(d.proposal.at) })}</div>
        </div>
        {decide && canConfirm(d.proposal, me) ? (
          <div className="flex flex-wrap gap-2">
            <Button kind="primary" onClick={confirm}>{t("dispute.confirmDecision")}</Button>
            <Button onClick={sendBack}>{t("dispute.sendBack")}</Button>
          </div>
        ) : <p className="text-ink2">{t("console.disputes.waitingFor", { team: t("role." + other) })}</p>}
      </div>
    );
  } else {
    decision = decide ? (
      <div className="space-y-2 text-sm">
        <p className="text-ink2">{t("console.disputes.twoSteps")}</p>
        <Button kind="primary" onClick={propose}>{t("console.disputes.propose")}</Button>
      </div>
    ) : <p className="text-sm text-ink2">{t("console.disputes.decidedBy")}</p>;
  }

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/disputes" className="text-accent hover:underline">{t("console.nav.disputes")}</Link></div>
      <PageHead title={d.ref} sub={t("dispute.kindLabel." + d.kind) + " · " + t("dispute.reason." + d.reason) + " · " + dateTime(d.createdAt)}
        right={<Badge tone={open ? "warning" : "success"}>{t("status." + d.status)}</Badge>} />
      {d.textHidden ? <div className="mb-4"><Notice>{t("console.disputes.hiddenNote")}</Notice></div> : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sides.map((s) => (
              <Card key={s.party} title={s.title}>
                {s.items.length ? (
                  <ul className="space-y-3 text-sm">
                    {s.items.map((x, i) => <li key={i}><p>{x.text == null ? <span className="text-ink3">{hiddenText}</span> : x.text}</p><div className="text-xs text-ink3">{x.by} · <bdi dir="ltr">{dateTime(x.at)}</bdi></div></li>)}
                  </ul>
                ) : <p className="text-sm text-ink3">{t("dispute.noStatement")}</p>}
              </Card>
            ))}
          </div>
          {d.rating ? (
            <Card title={t("dispute.disputedRating")}>
              <div className="space-y-1 text-sm">
                <div><span className="font-semibold text-warn">{"★".repeat(d.rating.overall)}</span><span className="text-ink3">{"★".repeat(5 - d.rating.overall)}</span> <span className="ms-2">{d.rating.overall}/5</span></div>
                {d.rating.feedback && !d.textHidden ? <p className="text-ink2">{d.rating.feedback}</p> : null}
              </div>
            </Card>
          ) : null}
          {d.case ? (
            <Card title={t("console.disputes.case")}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/cases/${d.case.id}`} className="font-mono font-medium text-accent hover:underline">{d.case.ref}</Link>
                <Badge>{t("status." + d.case.status)}</Badge>
                <span className="text-ink2">{t("service." + d.case.service)}</span>
              </div>
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          <Card title={t("console.disputes.decision")}>{decision}</Card>
          {(d.proposals || []).length ? (
            <Card title={t("console.disputes.sentBackTitle")}>
              <ul className="space-y-2 text-xs text-ink2">
                {d.proposals.map((p: Any, i: number) => (
                  <li key={i}>{t("dispute.outcome." + p.outcome)} · {p.byName} → {p.sentBackBy}: {p.sentBackNote}</li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card title={t("dispute.adminNotes")} right={open && decide ? <Button kind="ghost" onClick={addNote}>{t("dispute.addNote")}</Button> : null}>
            {notes.length ? (
              <ul className="space-y-2 text-sm">{notes.map((n: Any, i: number) => <li key={i}><p>{n.text}</p><div className="text-xs text-ink3">{n.byName} · {dateTime(n.at)}</div></li>)}</ul>
            ) : <p className="text-sm text-ink3">{t("console.disputes.noNotes")}</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
