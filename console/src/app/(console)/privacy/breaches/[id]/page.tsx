/**
 * One breach: what happened and the 72 hours to report it to the data protection centre.
 * Legal and Management record each step (contained, reported, people told, notes, closed);
 * the person who reported it can follow it.
 */
"use client";

import { useParams } from "next/navigation";

import { services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { SEVERITY_TONE } from "@/components/privacy";
import { Badge, Button, Card, Loading, Notice, PageHead } from "@/components/ui";
import { dateTime, errorText, num } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function BreachPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const q = useQuery<Any>(() => services().privacy.breach(id), [id]);
  if (q.error && !q.data) return <Notice tone="danger">{errorText(q.error)}</Notice>;
  if (!q.data) return <Loading label={t("console.loading")} />;
  return <Body b={q.data} />;
}

function Body({ b }: { b: Any }) {
  const t = useT();
  const { can } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const manage = can("privacy.manage") && b.status !== "closed";
  const step = (s: string, values?: Any) => run(() => services().privacy.updateBreach(b.id, s, values || {}), t("console.privacy.breach.saved"));

  const reported = async () => {
    const v = await ask({ title: t("console.privacy.breach.reportedTitle"), note: "optional", noteLabel: t("console.privacy.breach.reportedNote"), confirmLabel: t("common.save") });
    if (v) await step("reported", { centreRef: v.note });
  };
  const note = async () => {
    const v = await ask({ title: t("console.privacy.breach.addNote"), note: "required", confirmLabel: t("common.save") });
    if (v) await step("note", { note: v.note });
  };
  const close = async () => {
    const v = await ask({ title: t("console.privacy.breach.closeTitle"), message: t("console.privacy.breach.closeBody"), note: b.reportedAt ? "optional" : "required", confirmLabel: t("console.privacy.breach.close") });
    if (v) await step("closed", { note: v.note });
  };

  return (
    <>
      <PageHead title={b.ref} sub={b.title} right={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={SEVERITY_TONE[b.severity]}>{t("privacy.severity." + b.severity)}</Badge>
          <Badge tone={b.status === "open" ? (b.late ? "danger" : "warning") : b.status === "reported" ? "info" : "neutral"}>{t("privacy.breachStatus." + b.status)}</Badge>
        </div>
      } />
      {b.status === "open" ? (
        <div className="mb-4">
          <Notice tone={b.late ? "danger" : "warning"}>
            {t("console.privacy.breach.deadline", { date: dateTime(b.dueAt) })} · {b.late ? t("console.privacy.late") : t("console.privacy.hoursLeft", { h: num(b.hoursLeft) })}
          </Notice>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <p className="whitespace-pre-wrap text-sm">{b.description}</p>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-ink2">{t("console.privacy.breach.discoveredAt")}</dt><dd>{dateTime(b.discoveredAt)}</dd></div>
              <div><dt className="text-xs text-ink2">{t("console.privacy.breach.peopleAffected")}</dt><dd>{b.peopleAffected == null ? "-" : num(b.peopleAffected)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-ink2">{t("console.privacy.breach.dataTypes")}</dt><dd>{b.dataTypes.length ? b.dataTypes.map((d: string) => t("privacy.data." + d)).join(" · ") : "-"}</dd></div>
              <div><dt className="text-xs text-ink2">{t("common.by")}</dt><dd>{b.reportedByName}</dd></div>
              {b.reportedAt ? <div><dt className="text-xs text-ink2">{t("console.privacy.breach.centreRef")}</dt><dd>{b.centreRef || "-"} · {dateTime(b.reportedAt)}</dd></div> : null}
            </dl>
          </Card>
          <Card title={t("console.privacy.request.steps")}>
            {!b.steps.length ? <p className="text-sm text-ink3">-</p> : (
              <ul className="space-y-2 text-sm">
                {b.steps.map((s: Any, i: number) => (
                  <li key={i}>
                    <div className="font-medium">{t("privacy.step." + s.step)}{s.centreRef ? " · " + s.centreRef : ""}</div>
                    <div className="text-xs text-ink2">{s.by} · {dateTime(s.at)}</div>
                    {s.note ? <div className="mt-0.5 text-xs">{s.note}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        {manage ? (
          <Card title={t("common.actions")}>
            <div className="flex flex-col gap-2">
              {!b.containedAt ? <Button onClick={() => step("contained")}>{t("console.privacy.breach.contained")}</Button> : null}
              {!b.reportedAt ? <Button kind="primary" onClick={reported}>{t("console.privacy.breach.reported")}</Button> : null}
              {!b.peopleToldAt ? <Button onClick={() => step("people_told")}>{t("console.privacy.breach.peopleTold")}</Button> : null}
              <Button kind="ghost" onClick={note}>{t("console.privacy.breach.addNote")}</Button>
              <Button kind="ghost" onClick={close}>{t("console.privacy.breach.close")}</Button>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
