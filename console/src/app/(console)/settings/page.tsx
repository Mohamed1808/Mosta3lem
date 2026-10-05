/**
 * Platform settings (Super admin): provider scoring and automatic enforcement, and the
 * marketplace rules (offer window, collection period, price and fee bands). The platform
 * fee is not here: Finance and Management change it together from the Finance page.
 */
"use client";

import { ReactNode, useState } from "react";

import { icm, services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { Button, Card, Field, inputClass, Loading, Notice, PageHead } from "@/components/ui";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function Settings() {
  const t = useT();
  const { can } = useApp();
  const q = useQuery<Any>(() => services().config.get());
  if (!can("settings.manage")) return <Notice tone="warning">{t("errors.forbidden")}</Notice>;
  if (!q.data) return <Loading label={t("console.loading")} />;
  return (
    <>
      <PageHead title={t("console.nav.settings")} sub={t("console.settings.sub")} />
      <div className="space-y-4">
        <Scoring key={JSON.stringify(q.data.scoring)} cfg={q.data} />
        <Pricing key={JSON.stringify(q.data.pricing)} cfg={q.data} />
      </div>
    </>
  );
}

function Num({ label, hint, value, onChange, step }: { label: string; hint?: string; value: Any; onChange: (v: string) => void; step?: string }) {
  return (
    <Field label={label} hint={hint}>
      <input className={`${inputClass} ltr`} type="number" step={step || "1"} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Scoring({ cfg }: { cfg: Any }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const [s, setS] = useState<Record<string, Any>>({ ...cfg.scoring });
  const set = (k: string) => (v: string) => setS({ ...s, [k]: v });
  const save = async () => {
    if (await ask({ title: t("scoring.saveRecalc"), message: t("scoring.confirmBody"), confirmLabel: t("scoring.saveRecalc") })) await run(() => services().config.updateScoring(s), t("scoring.saved"));
  };
  return (
    <Card title={t("console.settings.scoring")} right={<Button kind="primary" onClick={save}>{t("scoring.saveRecalc")}</Button>}>
      <p className="mb-4 text-sm text-ink2">{t("scoring.formulaText")}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Num label={t("scoring.operationalWeight")} hint={t("scoring.sumHint")} value={s.operationalWeight} onChange={set("operationalWeight")} />
        <Num label={t("scoring.ratingWeight")} value={s.ratingWeight} onChange={set("ratingWeight")} />
        <Num label={t("scoring.recencyDays")} hint={t("scoring.recencyHint", { x: cfg.scoring.recentMultiplier })} value={s.recencyDays} onChange={set("recencyDays")} />
        <Num label={t("scoring.minRatings")} hint={t("scoring.minRatingsHint")} value={s.minRatings} onChange={set("minRatings")} />
        <Num label={t("scoring.entityCap")} hint={t("scoring.entityCapHint")} value={s.entityCapPct} onChange={set("entityCapPct")} />
      </div>
      <h3 className="mb-1 mt-6 text-sm font-semibold">{t("scoring.thresholds")}</h3>
      <p className="mb-3 text-xs text-ink2">{t("scoring.thresholdsHint")}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Num label={t("scoring.warnBelow")} value={s.warnBelow} onChange={set("warnBelow")} />
        <Num label={t("scoring.reduceBelow")} value={s.reduceBelow} onChange={set("reduceBelow")} />
        <Num label={t("scoring.suspendBelow")} value={s.suspendBelow} onChange={set("suspendBelow")} />
      </div>
    </Card>
  );
}

function Pricing({ cfg }: { cfg: Any }) {
  const t = useT();
  const run = useAction();
  const C = icm().config, U = icm().util;
  const [p, setP] = useState<Any>(JSON.parse(JSON.stringify(cfg.pricing)));
  const setTop = (k: string) => (v: string) => setP({ ...p, [k]: +v });
  const setBand = (group: string, id: string, side: "min" | "max") => (v: string) => setP({ ...p, [group]: { ...p[group], [id]: { ...p[group][id], [side]: +v } } });
  const row = (label: ReactNode, group: string, id: string, unit: string) => (
    <div key={id} className="grid grid-cols-[1fr_6rem_6rem] items-center gap-2 text-sm">
      <span>{label}</span>
      <input className={`${inputClass} ltr`} type="number" step="0.5" value={p[group][id].min} onChange={(e) => setBand(group, id, "min")(e.target.value)} aria-label={t("pricing.min") + " " + unit} />
      <input className={`${inputClass} ltr`} type="number" step="0.5" value={p[group][id].max} onChange={(e) => setBand(group, id, "max")(e.target.value)} aria-label={t("pricing.max") + " " + unit} />
    </div>
  );
  const save = () => run(() => services().config.updatePricing({ pricing: p }), t("pricing.saved"));
  return (
    <Card title={t("console.settings.marketplace")} right={<Button kind="primary" onClick={save}>{t("common.saveChanges")}</Button>}>
      <Notice>{t("console.settings.feeElsewhere", { pct: U.num(cfg.pricing.platformFeePct, 1) })}</Notice>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Num label={t("pricing.window")} hint={t("pricing.windowHint")} value={p.offerWindowHours} onChange={setTop("offerWindowHours")} />
        <Num label={t("pricing.warn")} value={p.offerWarnMinutes} onChange={setTop("offerWarnMinutes")} />
        <Num label={t("pricing.collectionDays")} value={p.defaultCollectionDays} onChange={setTop("defaultCollectionDays")} />
        <Num label={t("pricing.fixedFeeMax")} value={p.collectionFixedFeeMax} onChange={setTop("collectionFixedFeeMax")} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("pricing.invBands")}</h3>
          <div className="grid grid-cols-[1fr_6rem_6rem] gap-2 text-xs text-ink2"><span /><span>{t("pricing.min")}</span><span>{t("pricing.max")}</span></div>
          {cfg.lists.inquiryTypes.map((tp: Any) => row(U.label(tp), "investigationBands", tp.id, U.label(tp)))}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("pricing.colBands")}</h3>
          <div className="grid grid-cols-[1fr_6rem_6rem] gap-2 text-xs text-ink2"><span /><span>{t("pricing.min")}</span><span>{t("pricing.max")}</span></div>
          {C.DPD_BUCKETS.map((b: Any) => row(U.label(b), "collectionFeeBands", b.id, U.label(b)))}
        </div>
      </div>
    </Card>
  );
}
