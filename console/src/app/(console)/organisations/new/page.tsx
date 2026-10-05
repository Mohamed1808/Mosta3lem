/**
 * Sales opens an organisation account: the organisation and its first Admin, who signs
 * in with their work email and adds the rest of the team from the app.
 */
"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { icm, services } from "@/backend/engine";
import { useDialog } from "@/components/dialog";
import { Button, Card, Field, inputClass, Notice, PageHead } from "@/components/ui";
import { errorText } from "@/lib/format";
import { useApp, useT } from "@/lib/app";

const TYPES = ["bank", "auto_finance", "consumer_finance", "corporate", "insurance", "real_estate", "employer", "other"];

export default function NewOrganisation() {
  const t = useT();
  const router = useRouter();
  const { can } = useApp();
  const { toast } = useDialog();
  const [v, setV] = useState({ name: "", type: "corporate", governorate: "cairo", adminName: "", adminEmail: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!can("orgs.create")) return <Notice tone="warning">{t("errors.forbidden")}</Notice>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const govs: any[] = icm().store.db.config.lists.governorates;
  const set = (k: string, val: string) => { setV({ ...v, [k]: val }); if (errors[k]) setErrors({ ...errors, [k]: "" }); };
  const err = (k: string) => (errors[k] ? <span className="block text-xs text-bad">{t(errors[k])}</span> : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await services().entities.create(v);
      toast(t("console.orgs.created", { name: r.entity.name }));
      router.replace("/organisations/" + r.entity.id + "?created=1");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex: any) {
      if (ex && ex.params && ex.params.errors) setErrors(ex.params.errors);
      toast(errorText(ex), "danger");
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title={t("console.orgs.new")} sub={t("console.orgs.newSub")} />
      <form onSubmit={submit} className="space-y-4">
        <Card title={t("console.orgs.organisation")}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label={t("console.orgs.name")}><input className={inputClass} value={v.name} onChange={(e) => set("name", e.target.value)} />{err("name")}</Field>
            <Field label={t("console.orgs.type")}>
              <select className={inputClass} value={v.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map((x) => <option key={x} value={x}>{t("entityType." + x)}</option>)}</select>{err("type")}
            </Field>
            <Field label={t("address.governorate")}>
              <select className={inputClass} value={v.governorate} onChange={(e) => set("governorate", e.target.value)}>{govs.map((g) => <option key={g.id} value={g.id}>{icm().util.label(g)}</option>)}</select>{err("governorate")}
            </Field>
          </div>
        </Card>
        <Card title={t("console.orgs.firstAdmin")}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("common.name")}><input className={inputClass} value={v.adminName} onChange={(e) => set("adminName", e.target.value)} />{err("adminName")}</Field>
            <Field label={t("common.email")}><input className={`${inputClass} ltr`} type="email" value={v.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} placeholder="name@company.com" />{err("adminEmail")}</Field>
          </div>
          <p className="mt-3 text-xs text-ink2">{t("console.orgs.adminNote", { pw: icm().config.DEMO_PASSWORD })}</p>
        </Card>
        <div className="flex justify-end gap-2">
          <Button onClick={() => router.back()}>{t("common.cancel")}</Button>
          <Button type="submit" kind="primary" busy={busy}>{t("console.orgs.create")}</Button>
        </div>
      </form>
    </>
  );
}
