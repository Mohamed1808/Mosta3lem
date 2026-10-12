/**
 * One organisation: its details, its users (with sign-in help from Customer support),
 * work volume, how providers rate it as a client, spending for billing teams and recent
 * history for teams with the audit log.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { icm, remoteMode, services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { Badge, Button, Card, Field, inputClass, Kpi, Loading, Notice, PageHead } from "@/components/ui";
import { date, dateTime, gov, money, num, orgPlace } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function OrganisationPage() {
  const { id } = useParams<{ id: string }>();
  // Set when Sales has just opened the account (read on the client; this page renders there).
  const created = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("created");
  const t = useT();
  const { can } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const q = useQuery<Any>(() => services().entities.get(id), [id]);
  if (q.error && !q.data) return <Notice tone="danger">{t(q.error.key || "errors.generic")}</Notice>;
  if (!q.data) return <Loading label={t("console.loading")} />;
  const e = q.data;
  const now = icm().clock.now();

  const changeFra = async () => {
    const v = await ask({
      title: t("console.orgs.fraTitle"), message: t("console.orgs.fraBody"),
      options: [{ value: "yes", label: t("fra.regulated") }, { value: "no", label: t("fra.notRegulated") }], optionLabel: t("console.orgs.fraTitle"),
      note: "required", noteLabel: t("common.reason"), confirmLabel: t("common.save"),
    });
    if (v && v.option) await run(() => services().entities.setFraRegulated(e.id, v.option === "yes", v.note), t("console.orgs.fraSaved"));
  };

  const reset = async (u: Any) => {
    if (await ask({ title: t("console.accounts.reset"), message: t("console.accounts.resetBody", { name: u.name }), confirmLabel: t("console.accounts.reset") })) {
      await run(async () => {
        const r: Any = await services().accounts.resetLogin(u.id);
        return r;
      }, t("console.accounts.resetDone", { name: u.name }));
    }
  };

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/organisations" className="text-accent hover:underline">{t("console.nav.organisations")}</Link></div>
      <PageHead title={e.name} sub={t("entityType." + e.type) + " · " + orgPlace(e) + " · " + t("console.orgs.since", { date: date(e.createdAt) })} />
      {created ? <div className="mb-4"><Notice tone="success">{(remoteMode() ? t("console.linkNoteCreated") : t("console.orgs.createdNote", { pw: icm().config.DEMO_PASSWORD }))}</Notice></div> : null}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("console.orgs.col.open")} value={num(e.open)} />
        <Kpi label={t("console.orgs.col.volume")} value={num(e.volume)} />
        {e.spend !== null ? <Kpi label={t("console.orgs.col.spend")} value={money(e.spend)} /> : null}
        <Kpi label={t("console.orgs.col.rating")} value={e.clientRating.count ? num(e.clientRating.dataQuality, 1) + " / " + num(e.clientRating.paymentTimeliness, 1) : "-"}
          sub={e.clientRating.count ? t("console.orgs.ratingSub", { n: num(e.clientRating.count) }) : t("console.orgs.noRatings")} />
      </div>
      <Card title={t("console.orgs.compliance")} className="mb-4" right={can("orgs.create") ? <Button kind="ghost" onClick={changeFra}>{t("console.orgs.fraChange")}</Button> : undefined}>
        <ul className="space-y-1.5 text-sm">
          <li className="flex flex-wrap items-center gap-2">
            <Badge tone={e.fraRegulated ? "info" : "neutral"}>{e.fraRegulated ? t("fra.regulated") : t("fra.notRegulated")}</Badge>
            <span className="text-xs text-ink2">{e.fraRegulated ? t("fra.requiredNote") : t("console.orgs.fraNotNeeded")}</span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <Badge tone={e.dpaCurrent ? "success" : "warning"}>{t("console.privacy.settings.dpa")}</Badge>
            <span className="text-xs text-ink2">{e.dpaCurrent ? t("console.privacy.settings.accepted", { date: date(e.dpa.at), name: e.dpa.byName || "-" }) : t("console.privacy.settings.notAccepted")}</span>
          </li>
        </ul>
      </Card>
      <TaxDetails e={e} edit={can("orgs.create") || can("billing.issue")} />
      <Card title={t("console.orgs.users", { n: num(e.users.length) })}>
        <ul className="-m-5 divide-y divide-line">
          {e.users.map((u: Any) => {
            const locked = u.lockedUntil && u.lockedUntil > now;
            return (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{u.name}</span>
                    <Badge>{t("role." + u.role)}</Badge>
                    {!u.active ? <Badge tone="neutral">{t("common.inactive")}</Badge> : null}
                    {u.invited ? <Badge tone="info">{t("users.invited")}</Badge> : null}
                    {locked ? <Badge tone="danger">{t("console.accounts.locked")}</Badge> : null}
                  </div>
                  <div className="text-xs text-ink2"><bdi dir="ltr">{u.email}</bdi>{u.passwordResetAt ? " · " + t("console.accounts.resetAt", { at: dateTime(u.passwordResetAt) }) : ""}</div>
                </div>
                {can("accounts.resetLogin") && u.active ? <Button kind="ghost" onClick={() => reset(u)}>{t("console.accounts.reset")}</Button> : null}
              </li>
            );
          })}
        </ul>
      </Card>
      {e.audit && e.audit.length ? (
        <Card title={t("admin.history")} className="mt-4">
          <ul className="space-y-1.5 text-sm">
            {e.audit.map((a: Any) => <li key={a.id}><span className="font-mono text-xs text-ink3"><bdi dir="ltr">{dateTime(a.at)}</bdi></span> · {a.actorName}: {auditLabel(a.action)} · {a.targetRef}</li>)}
          </ul>
        </Card>
      ) : null}
    </>
  );
}

function auditLabel(action: string) {
  const key = "audit.action." + action.replace(/\./g, "_");
  return icm().i18n.has(key) ? icm().t(key) : action;
}

/** The organisation's tax number and registered address, which e-invoices to it carry. */
function TaxDetails({ e, edit }: { e: Any; edit: boolean }) {
  const t = useT();
  const run = useAction();
  const [open, setOpen] = useState(false);
  const tax = e.tax || { taxId: "", address: { governorate: e.governorate || "cairo", regionCity: "", street: "", buildingNumber: "" } };
  const [v, setV] = useState<Any>(tax);
  const govs: Any[] = icm().store.db.config.lists.governorates;
  const setAd = (k: string, val: string) => setV({ ...v, address: { ...v.address, [k]: val } });
  const save = async (ev: FormEvent) => {
    ev.preventDefault();
    if (await run(() => services().entities.setTaxDetails(e.id, v), t("console.eta.saved"))) setOpen(false);
  };
  const a = e.tax && e.tax.address;
  return (
    <Card title={t("console.eta.taxDetails")} className="mb-4"
      right={edit && !open ? <Button kind="ghost" onClick={() => { setV(tax); setOpen(true); }}>{t("common.edit")}</Button> : undefined}>
      {open ? (
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Field label={t("console.eta.taxId")}><input className={`${inputClass} ltr`} value={v.taxId} onChange={(x) => setV({ ...v, taxId: x.target.value })} /></Field>
            <Field label={t("address.governorate")}>
              <select className={inputClass} value={v.address.governorate} onChange={(x) => setAd("governorate", x.target.value)}>{govs.map((g) => <option key={g.id} value={g.id}>{icm().util.label(g)}</option>)}</select>
            </Field>
            <Field label={t("console.eta.city")}><input className={inputClass} value={v.address.regionCity} onChange={(x) => setAd("regionCity", x.target.value)} /></Field>
            <Field label={t("console.eta.street")}><input className={inputClass} value={v.address.street} onChange={(x) => setAd("street", x.target.value)} /></Field>
            <Field label={t("console.eta.building")}><input className={`${inputClass} ltr`} value={v.address.buildingNumber} onChange={(x) => setAd("buildingNumber", x.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button><Button type="submit" kind="primary">{t("common.save")}</Button></div>
        </form>
      ) : e.tax ? (
        <p className="text-sm"><span className="font-mono"><bdi dir="ltr">{e.tax.taxId}</bdi></span> · {[a.buildingNumber, a.street, a.regionCity, gov(a.governorate)].filter(Boolean).join(", ")}</p>
      ) : <p className="text-sm text-ink3">{t("console.eta.noTaxDetails")}</p>}
    </Card>
  );
}
