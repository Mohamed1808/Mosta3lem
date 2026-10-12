/**
 * Data protection (Legal and Management): requests from people about their data, breaches,
 * and the retention periods with each organisation's data processing agreement. The rules
 * live in the engine (prototype/js/workflow/privacy.js, services/privacy.js).
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { icm, services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { BreachList, DueBadge, STATUS_TONE } from "@/components/privacy";
import { Badge, Button, Card, Field, inputClass, Loading, Notice, PageHead } from "@/components/ui";
import { date, dateTime, errorText, num } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const TABS = ["requests", "breaches", "settings"];

export default function Privacy() {
  const t = useT();
  const { can } = useApp();
  const [tab, setTab] = useState("requests");
  if (!can("privacy.manage")) return <Notice tone="warning">{t("errors.forbidden")}</Notice>;
  return (
    <>
      <PageHead title={t("console.nav.privacy")} sub={t("console.privacy.sub")} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === k ? "bg-accent text-white" : "border border-line bg-surface text-ink2 hover:bg-surface2"}`}>
            {t("console.privacy.tab." + k)}
          </button>
        ))}
      </div>
      {tab === "requests" ? <Requests /> : tab === "breaches" ? <Breaches /> : <Settings />}
    </>
  );
}

function Requests() {
  const t = useT();
  const q = useQuery<Any[]>(() => services().privacy.requests());
  const [adding, setAdding] = useState(false);
  if (!q.data) return q.error ? <Notice tone="danger">{errorText(q.error)}</Notice> : <Loading label={t("console.loading")} />;
  return (
    <>
      <div className="mb-4 flex justify-end">{!adding ? <Button kind="primary" onClick={() => setAdding(true)}>{t("console.privacy.newRequest")}</Button> : null}</div>
      {adding ? <NewRequest onDone={() => setAdding(false)} /> : null}
      <Card>
        {!q.data.length ? <p className="text-sm text-ink3">{t("console.privacy.noRequests")}</p> : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface2 text-xs text-ink2">
                <tr>{["ref", "kind", "person", "received", "due", "status"].map((h) => <th key={h} className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("console.privacy.col." + h)}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {q.data.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 ps-5"><Link href={`/privacy/requests/${r.id}`} className="font-mono font-medium text-accent hover:underline">{r.ref}</Link></td>
                    <td className="px-4 py-2.5">{t("privacy.kind." + r.kind)}</td>
                    <td className="px-4 py-2.5">{r.subject.name}</td>
                    <td className="px-4 py-2.5 text-xs text-ink2">{date(r.receivedAt)}</td>
                    <td className="px-4 py-2.5 text-xs"><span className="me-2">{date(r.dueAt)}</span><DueBadge late={r.late} soon={r.dueSoon} /></td>
                    <td className="px-4 py-2.5 pe-5"><Badge tone={STATUS_TONE[r.status]}>{t("privacy.status." + r.status)}</Badge></td>
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

const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

function NewRequest({ onDone }: { onDone: () => void }) {
  const t = useT();
  const router = useRouter();
  const { toast } = useDialog();
  const P = icm().wf.privacy;
  const [v, setV] = useState({ kind: "access", name: "", nationalId: "", phone: "", email: "", channel: "email", receivedAt: today(), details: "" });
  const [field, setField] = useState<{ name: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: string) => { setV({ ...v, [k]: val }); if (field && field.name === k) setField(null); };
  const err = (k: string) => (field && field.name === k ? <span className="block text-xs text-bad">{t(field.key)}</span> : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // The day it arrived, at the current time of day (a date alone would be midnight UTC).
      const now = new Date();
      const [y, m, d] = v.receivedAt.split("-").map(Number);
      const at = new Date(y, m - 1, d, now.getHours(), now.getMinutes()).getTime();
      const r: Any = await services().privacy.logRequest({ ...v, receivedAt: Math.min(at, Date.now()) });
      toast(t("console.privacy.logged", { ref: r.ref }));
      onDone();
      router.push("/privacy/requests/" + r.id);
    } catch (ex: Any) {
      if (ex && ex.params && ex.params.field) setField({ name: ex.params.field, key: ex.key });
      toast(errorText(ex), "danger");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mb-4">
      <Card title={t("console.privacy.newRequest")}>
        <p className="mb-4 text-sm text-ink2">{t("console.privacy.newRequestSub")}</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label={t("console.privacy.kind")}>
            <select className={inputClass} value={v.kind} onChange={(e) => set("kind", e.target.value)}>{P.REQUEST_KINDS.map((k: string) => <option key={k} value={k}>{t("privacy.kind." + k)}</option>)}</select>
          </Field>
          <Field label={t("console.privacy.channel")}>
            <select className={inputClass} value={v.channel} onChange={(e) => set("channel", e.target.value)}>{P.REQUEST_CHANNELS.map((k: string) => <option key={k} value={k}>{t("privacy.channel." + k)}</option>)}</select>
          </Field>
          <Field label={t("console.privacy.receivedAt")}><input type="date" className={inputClass} value={v.receivedAt} max={today()} onChange={(e) => set("receivedAt", e.target.value)} /></Field>
          <Field label={t("console.privacy.name")}><input className={inputClass} value={v.name} onChange={(e) => set("name", e.target.value)} />{err("name")}</Field>
          <Field label={t("console.privacy.nationalId")}><input className={`${inputClass} ltr`} inputMode="numeric" value={v.nationalId} onChange={(e) => set("nationalId", e.target.value)} />{err("nationalId")}</Field>
          <Field label={t("console.privacy.phone")}><input className={`${inputClass} ltr`} inputMode="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" />{err("phone")}</Field>
        </div>
        <p className="mt-2 text-xs text-ink3">{t("console.privacy.idOrPhoneHint")}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label={`${t("console.privacy.email")} (${t("common.optional")})`}><input className={`${inputClass} ltr`} type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <div className="md:col-span-2">
            <Field label={`${t("console.privacy.details")} (${t("common.optional")})`}><textarea className={inputClass} rows={2} value={v.details} onChange={(e) => set("details", e.target.value)} /></Field>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onDone}>{t("common.cancel")}</Button>
          <Button type="submit" kind="primary" busy={busy}>{t("console.privacy.newRequest")}</Button>
        </div>
      </Card>
    </form>
  );
}

function Breaches() {
  const t = useT();
  const q = useQuery<Any[]>(() => services().privacy.breaches());
  if (!q.data) return q.error ? <Notice tone="danger">{errorText(q.error)}</Notice> : <Loading label={t("console.loading")} />;
  return (
    <>
      <div className="mb-4 flex justify-end"><Link href="/report-breach" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[#174b8a]">{t("console.privacy.breach.report")}</Link></div>
      <BreachList rows={q.data} />
    </>
  );
}

function Settings() {
  const t = useT();
  const run = useAction();
  const q = useQuery<Any>(() => services().privacy.status());
  const [v, setV] = useState<Record<string, string> | null>(null);
  if (!q.data) return q.error ? <Notice tone="danger">{errorText(q.error)}</Notice> : <Loading label={t("console.loading")} />;
  const s = q.data;
  const values = v || { photosDays: String(s.settings.photosDays), personalDays: String(s.settings.personalDays), requestDays: String(s.settings.requestDays) };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => services().privacy.updateSettings(values), t("console.privacy.settings.saved"))) setV(null);
  };
  return (
    <div className="space-y-4">
      <form onSubmit={save}>
        <Card title={t("console.privacy.settings.retention")}>
          <p className="mb-4 text-sm text-ink2">{t("console.privacy.settings.retentionSub")}</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {["photosDays", "personalDays", "requestDays"].map((k) => (
              <Field key={k} label={t("console.privacy.settings." + k)} hint={`${num(s.limits[k][0])} - ${num(s.limits[k][1])}`}>
                <input className={`${inputClass} ltr`} inputMode="numeric" value={values[k]} onChange={(e) => setV({ ...values, [k]: e.target.value })} />
              </Field>
            ))}
          </div>
          <div className="mt-4 flex justify-end"><Button type="submit" kind="primary" disabled={!v}>{t("common.saveChanges")}</Button></div>
        </Card>
      </form>
      <Card title={t("console.privacy.settings.due")}>
        <ul className="space-y-1 text-sm">
          <li>{t("console.privacy.settings.duePhotos", { n: num(s.due.photos) })}</li>
          <li>{t("console.privacy.settings.dueAll", { n: num(s.due.all) })}</li>
          <li className="text-ink2">{t("console.privacy.settings.erased", { n: num(s.erased) })}</li>
          <li className="text-ink2">{s.lastRun ? t("console.privacy.settings.lastRun", { date: dateTime(s.lastRun.at), n: num(s.lastRun.cases) }) : t("console.privacy.settings.never")}</li>
        </ul>
      </Card>
      <Card title={t("console.privacy.settings.dpa")}>
        <p className="mb-3 text-sm text-ink2">{t("console.privacy.settings.dpaSub", { v: s.dpaVersion })}</p>
        <ul className="-mx-5 divide-y divide-line">
          {s.organisations.map((o: Any) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
              <Link href={`/organisations/${o.id}`} className="font-medium text-accent hover:underline">{o.name}</Link>
              {o.current ? <span className="text-xs text-ink2">{t("console.privacy.settings.accepted", { date: date(o.dpa.at), name: o.dpa.byName || "-" })}</span>
                : o.dpa ? <Badge tone="warning">{t("console.privacy.settings.oldVersion", { v: o.dpa.version })}</Badge>
                  : <Badge tone="danger">{t("console.privacy.settings.notAccepted")}</Badge>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
