/**
 * Any staff member reports a suspected breach of personal data. Legal and Management are
 * told at once and have 72 hours to report it to the data protection centre. The person
 * who reported it sees their reports below.
 */
"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { icm, services } from "@/backend/engine";
import { useDialog } from "@/components/dialog";
import { BreachList } from "@/components/privacy";
import { Button, Card, Field, inputClass, PageHead } from "@/components/ui";
import { errorText } from "@/lib/format";
import { useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** "2026-10-12T14:30" in local time, for a datetime-local field. */
function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function ReportBreach() {
  const t = useT();
  const router = useRouter();
  const { toast } = useDialog();
  const P = icm().wf.privacy;
  const mine = useQuery<Any[]>(() => services().privacy.breaches());
  const [v, setV] = useState({ title: "", description: "", severity: "medium", discoveredAt: localNow(), peopleAffected: "" });
  const [types, setTypes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: string) => setV({ ...v, [k]: val });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const found = new Date(v.discoveredAt).getTime();
      const b: Any = await services().privacy.reportBreach({ ...v, dataTypes: types, discoveredAt: Math.min(found || Date.now(), Date.now()) });
      toast(t("console.privacy.breach.sent", { ref: b.ref }));
      router.push("/privacy/breaches/" + b.id);
    } catch (ex) { toast(errorText(ex), "danger"); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title={t("console.privacy.breach.report")} sub={t("console.privacy.breach.reportSub")} />
      <form onSubmit={submit} className="mb-6">
        <Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Field label={t("console.privacy.breach.title")}><input className={inputClass} value={v.title} onChange={(e) => set("title", e.target.value)} /></Field></div>
            <Field label={t("console.privacy.breach.severity")}>
              <select className={inputClass} value={v.severity} onChange={(e) => set("severity", e.target.value)}>{P.BREACH_SEVERITIES.map((s: string) => <option key={s} value={s}>{t("privacy.severity." + s)}</option>)}</select>
            </Field>
            <div className="md:col-span-3"><Field label={t("console.privacy.breach.description")}><textarea className={inputClass} rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} /></Field></div>
            <Field label={t("console.privacy.breach.discoveredAt")}><input type="datetime-local" className={inputClass} value={v.discoveredAt} max={localNow()} onChange={(e) => set("discoveredAt", e.target.value)} /></Field>
            <Field label={`${t("console.privacy.breach.peopleAffected")} (${t("common.optional")})`}><input className={`${inputClass} ltr`} inputMode="numeric" value={v.peopleAffected} onChange={(e) => set("peopleAffected", e.target.value)} /></Field>
          </div>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium text-ink2">{t("console.privacy.breach.dataTypes")}</legend>
            <div className="flex flex-wrap gap-2">
              {P.BREACH_DATA.map((d: string) => {
                const on = types.includes(d);
                return (
                  <button key={d} type="button" aria-pressed={on} onClick={() => setTypes(on ? types.filter((x) => x !== d) : types.concat([d]))}
                    className={`rounded-full px-3 py-1 text-sm ${on ? "bg-accent text-white" : "border border-line bg-surface text-ink2 hover:bg-surface2"}`}>
                    {t("privacy.data." + d)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-4 flex justify-end"><Button type="submit" kind="danger" busy={busy}>{t("console.privacy.breach.report")}</Button></div>
        </Card>
      </form>
      {mine.data && mine.data.length ? (
        <>
          <h2 className="mb-3 text-sm font-semibold">{t("console.privacy.breach.mine")}</h2>
          <BreachList rows={mine.data} />
        </>
      ) : null}
    </>
  );
}
