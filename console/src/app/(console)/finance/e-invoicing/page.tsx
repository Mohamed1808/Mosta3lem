/**
 * Mosta3lem's tax profile for e-invoices to the Egyptian Tax Authority (ETA): legal name,
 * tax registration number, activity code, registered address, VAT and the item codes
 * registered on the ETA portal. Finance edits it; everyone with billing access reads it.
 */
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { icm, services } from "@/backend/engine";
import { useAction } from "@/components/dialog";
import { EtaProblems } from "@/components/eta";
import { Button, Card, Field, inputClass, Loading, Notice, PageHead } from "@/components/ui";
import { errorText } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function EInvoicing() {
  const t = useT();
  const { can } = useApp();
  const q = useQuery<Any>(() => services().billing.etaSettings());
  if (!can("billing.view")) return <Notice tone="warning">{t("errors.forbidden")}</Notice>;
  if (!q.data) return q.error ? <Notice tone="danger">{errorText(q.error)}</Notice> : <Loading label={t("console.loading")} />;
  return <Form key={JSON.stringify(q.data.settings)} data={q.data} edit={can("billing.issue")} />;
}

function Form({ data, edit }: { data: Any; edit: boolean }) {
  const t = useT();
  const run = useAction();
  const [v, setV] = useState<Any>(data.settings);
  const govs: Any[] = icm().store.db.config.lists.governorates;
  const set = (k: string, val: Any) => setV({ ...v, [k]: val });
  const setIn = (group: string, k: string, val: string) => setV({ ...v, [group]: { ...v[group], [k]: val } });
  const save = async (e: FormEvent) => { e.preventDefault(); await run(() => services().billing.updateEtaSettings(v), t("console.eta.saved")); };
  const input = (value: string, onChange: (s: string) => void, ltr?: boolean) => (
    <input className={`${inputClass} ${ltr ? "ltr" : ""}`} value={value || ""} disabled={!edit} onChange={(e) => onChange(e.target.value)} />
  );

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/finance" className="text-accent hover:underline">{t("console.nav.finance")}</Link></div>
      <PageHead title={t("console.eta.title")} sub={t("console.eta.sub")} />
      <div className="mb-4">
        {data.problems.length ? <EtaProblems problems={data.problems} /> : <Notice tone="success">{t("console.eta.profileReady")}</Notice>}
      </div>
      <form onSubmit={save} className="space-y-4">
        <Card title={t("console.eta.company")}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label={t("console.eta.legalName")}>{input(v.legalName, (s) => set("legalName", s))}</Field>
            <Field label={t("console.eta.taxId")} hint={t("console.eta.taxIdHint")}>{input(v.taxId, (s) => set("taxId", s), true)}</Field>
            <Field label={t("console.eta.activityCode")} hint={t("console.eta.activityHint")}>{input(v.activityCode, (s) => set("activityCode", s), true)}</Field>
          </div>
        </Card>
        <Card title={t("console.eta.address")}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label={t("address.governorate")}>
              <select className={inputClass} value={v.branch.governorate} disabled={!edit} onChange={(e) => setIn("branch", "governorate", e.target.value)}>
                {govs.map((g) => <option key={g.id} value={g.id}>{icm().util.label(g)}</option>)}
              </select>
            </Field>
            <Field label={t("console.eta.city")}>{input(v.branch.regionCity, (s) => setIn("branch", "regionCity", s))}</Field>
            <Field label={t("console.eta.street")}>{input(v.branch.street, (s) => setIn("branch", "street", s))}</Field>
            <Field label={t("console.eta.building")}>{input(v.branch.buildingNumber, (s) => setIn("branch", "buildingNumber", s), true)}</Field>
          </div>
        </Card>
        <Card title={t("console.eta.vat")}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label={t("console.eta.vatRate")}>{input(String(v.vatRate), (s) => set("vatRate", s), true)}</Field>
            <Field label={t("console.eta.pricesVat")}>
              <select className={inputClass} value={v.pricesIncludeVat ? "yes" : "no"} disabled={!edit} onChange={(e) => set("pricesIncludeVat", e.target.value === "yes")}>
                <option value="no">{t("console.eta.vatOnTop")}</option>
                <option value="yes">{t("console.eta.vatIncluded")}</option>
              </select>
            </Field>
          </div>
          <p className="mt-3 text-xs text-ink3">{t("console.eta.vatNote")}</p>
        </Card>
        <Card title={t("console.eta.itemCodes")}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {["investigation", "collection"].map((s) => (
              <Field key={s} label={t("service." + s)} hint={"EG-" + (v.taxId || "123456789") + "-" + (s === "investigation" ? "INV" : "COL")}>{input(v.itemCodes[s], (x) => setIn("itemCodes", s, x), true)}</Field>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink3">{t("console.eta.itemCodesNote")}</p>
        </Card>
        {edit ? <div className="flex justify-end"><Button type="submit" kind="primary">{t("common.saveChanges")}</Button></div> : null}
      </form>
    </>
  );
}
