/**
 * One request from a person about their data: who they are, the cases about them and the
 * organisations told, then the answer. Exporting downloads everything held about them;
 * answering a deletion request deletes them from their closed cases.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { DueBadge, STATUS_TONE } from "@/components/privacy";
import { Badge, Button, Card, Loading, Notice, PageHead } from "@/components/ui";
import { date, dateTime, errorText } from "@/lib/format";
import { useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Save JSON as a file in the browser. */
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function RequestPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const q = useQuery<Any>(() => services().privacy.request(id), [id]);
  if (q.error && !q.data) return <Notice tone="danger">{errorText(q.error)}</Notice>;
  if (!q.data) return <Loading label={t("console.loading")} />;
  return <Body r={q.data} />;
}

function Body({ r }: { r: Any }) {
  const t = useT();
  const { ask, toast } = useDialog();
  const run = useAction();
  const open = r.status === "open" || r.status === "in_review";
  const closedCases = r.cases.filter((c: Any) => !c.open && !(c.erased && c.erased.scope === "all"));

  const exportData = async () => {
    try {
      const data = await services().privacy.exportRequest(r.id);
      download(`${r.ref}.json`, data);
      toast(t("console.privacy.request.exported"));
    } catch (e) { toast(errorText(e), "danger"); }
  };
  const answer = async () => {
    const deletion = r.kind === "deletion";
    const v = await ask({
      title: deletion ? t("console.privacy.request.deleteTitle") : t("console.privacy.request.answerTitle"),
      message: deletion ? t("console.privacy.request.deleteBody", { n: closedCases.length }) : t("console.privacy.request.answerBody", { date: date(r.dueAt) }),
      note: "required", noteLabel: t("common.note"), danger: deletion,
      confirmLabel: deletion ? t("console.privacy.request.deleteConfirm") : t("console.privacy.request.answer"),
    });
    if (v) await run(() => services().privacy.complete(r.id, "done", v.note), t("console.privacy.request.answered"));
  };
  const refuse = async () => {
    const v = await ask({ title: t("console.privacy.request.refuse"), message: t("console.privacy.request.refuseBody"), note: "required", noteLabel: t("common.reason"), confirmLabel: t("console.privacy.request.refuse") });
    if (v) await run(() => services().privacy.complete(r.id, "refused", v.note), t("console.privacy.request.refused"));
  };

  return (
    <>
      <PageHead title={r.ref} sub={t("privacy.kind." + r.kind)} right={
        <div className="flex flex-wrap items-center gap-2"><Badge tone={STATUS_TONE[r.status]}>{t("privacy.status." + r.status)}</Badge><DueBadge late={r.late} soon={r.dueSoon} /></div>
      } />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={t("console.privacy.request.person")}>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-ink2">{t("console.privacy.name")}</dt><dd className="font-medium">{r.subject.name}</dd></div>
              <div><dt className="text-xs text-ink2">{t("console.privacy.nationalId")}</dt><dd className="font-mono"><bdi dir="ltr">{r.subject.nationalId || "-"}</bdi></dd></div>
              <div><dt className="text-xs text-ink2">{t("console.privacy.phone")}</dt><dd className="font-mono"><bdi dir="ltr">{r.subject.phone || "-"}</bdi></dd></div>
              <div><dt className="text-xs text-ink2">{t("console.privacy.email")}</dt><dd><bdi dir="ltr">{r.subject.email || "-"}</bdi></dd></div>
              <div><dt className="text-xs text-ink2">{t("console.privacy.channel")}</dt><dd>{t("privacy.channel." + r.channel)}</dd></div>
              <div><dt className="text-xs text-ink2">{t("console.privacy.col.received")} / {t("console.privacy.col.due")}</dt><dd>{date(r.receivedAt)} / <span className={r.late ? "font-semibold text-bad" : ""}>{date(r.dueAt)}</span></dd></div>
            </dl>
            {r.details ? <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface2 p-3 text-sm">{r.details}</p> : null}
          </Card>
          <Card title={t("console.privacy.request.cases")}>
            {!r.cases.length ? <p className="text-sm text-ink3">{t("console.privacy.request.noCases")}</p> : (
              <ul className="-m-5 divide-y divide-line">
                {r.cases.map((c: Any) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                    <div>
                      <Link href={`/cases/${c.id}`} className="font-mono font-medium text-accent hover:underline">{c.ref}</Link>
                      <span className="ms-2">{t("service." + c.service)}</span>
                      <div className="text-xs text-ink2">{c.entityName}{c.providerName ? " / " + c.providerName : ""} · {date(c.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={c.open ? "info" : "neutral"}>{t("status." + c.status)}</Badge>
                      {c.erased && c.erased.scope === "all" ? <Badge tone="danger">{t("console.privacy.request.erasedTag")}</Badge> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {r.outcome ? (
            <Card title={t("console.privacy.request.outcome")}>
              <p className="whitespace-pre-wrap text-sm">{r.outcome.note}</p>
              {r.outcome.erasedCases && r.outcome.erasedCases.length ? <p className="mt-2 text-xs text-ink2">{t("console.privacy.request.erased", { refs: r.outcome.erasedCases.join(", ") })}</p> : null}
              {r.outcome.openCases && r.outcome.openCases.length ? <p className="mt-1 text-xs text-warn">{t("console.privacy.request.stillOpen", { refs: r.outcome.openCases.join(", ") })}</p> : null}
              <p className="mt-2 text-xs text-ink3">{r.outcome.by} · {dateTime(r.outcome.at)}</p>
            </Card>
          ) : null}
        </div>
        <div className="space-y-4">
          <Card title={t("common.actions")}>
            <div className="flex flex-col gap-2">
              {r.status === "open" ? <Button onClick={() => run(() => services().privacy.startReview(r.id))}>{t("console.privacy.request.startReview")}</Button> : null}
              <Button onClick={exportData}>{t("console.privacy.request.export")}</Button>
              {open ? <Button kind={r.kind === "deletion" ? "danger" : "primary"} onClick={answer}>{r.kind === "deletion" ? t("console.privacy.request.deleteTitle") : t("console.privacy.request.answer")}</Button> : null}
              {open ? <Button kind="ghost" onClick={refuse}>{t("console.privacy.request.refuse")}</Button> : null}
            </div>
          </Card>
          <Card title={t("console.privacy.request.orgs")}>
            {r.organisations.length ? (
              <>
                <ul className="space-y-1 text-sm">{r.organisations.map((o: Any) => <li key={o.id}><Link href={`/organisations/${o.id}`} className="text-accent hover:underline">{o.name}</Link></li>)}</ul>
                <p className="mt-2 text-xs text-ink3">{t("console.privacy.request.orgsNote")}</p>
              </>
            ) : <p className="text-sm text-ink3">-</p>}
          </Card>
          <Card title={t("console.privacy.request.steps")}>
            <ul className="space-y-2 text-sm">
              <li className="text-xs text-ink2">{t("console.privacy.request.loggedBy", { name: r.loggedByName, date: dateTime(r.loggedAt) })}</li>
              {r.steps.map((s: Any, i: number) => (
                <li key={i}>
                  <div className="font-medium">{t("privacy.step." + s.step)}</div>
                  <div className="text-xs text-ink2">{s.by} · {dateTime(s.at)}</div>
                  {s.note ? <div className="mt-0.5 text-xs">{s.note}</div> : null}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
