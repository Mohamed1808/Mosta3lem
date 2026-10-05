/**
 * Pieces of a case shared by the console's case and Quality screens: request details,
 * the report answers, photos, GPS check-in, collection balance and the timeline. Customer
 * details arrive already hidden for teams without access to personal data.
 */
"use client";

import { ReactNode } from "react";

import { icm } from "@/backend/engine";
import { Badge } from "@/components/ui";
import { addressLine, date, dateTime, listLabel, money, num } from "@/lib/format";
import { useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(9rem,auto)_1fr]">
      {rows.map(([k, v], i) => (
        <div key={k + i} className="contents">
          <dt className="text-ink2">{k}</dt>
          <dd className="font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
export const Ltr = ({ v }: { v: string | null | undefined }) => (v ? <bdi dir="ltr">{v}</bdi> : <>-</>);

/** Inquiry types or the days-past-due bucket of a case. */
export function whatOf(c: Any) {
  if (c.service === "investigation") return (c.inquiryTypes || []).map((x: string) => listLabel("inquiryTypes", x)).join(icm().t("common.listSep"));
  const b = icm().config.DPD_BUCKETS.find((x: Any) => x.id === c.bucket);
  return b ? icm().util.label(b) : "-";
}

export function slaBadge(c: Any, t: (k: string, p?: Any) => string) {
  if (!c.sla || c.sla === "none") return null;
  const tone = c.sla === "breached" ? "danger" : c.sla === "at_risk" ? "warning" : c.sla === "met" ? "success" : "info";
  let text = t("sla." + c.sla);
  if ((c.sla === "on_track" || c.sla === "at_risk") && c.slaRemaining != null) text = t("sla.left", { time: icm().util.fmtDuration(c.slaRemaining) });
  if (c.sla === "breached" && c.slaRemaining != null) text = t("sla.overdue", { time: icm().util.fmtDuration(c.slaRemaining) });
  return <Badge tone={tone}>{text}</Badge>;
}

export function RequestDetails({ c }: { c: Any }) {
  const t = useT();
  const cu = c.customer || {};
  const hidden = t("console.cases.hidden");
  const rows: [string, ReactNode][] = [
    [t("case.customerName"), cu.name || hidden],
    [t("case.nationalId"), cu.nationalId ? <Ltr v={cu.nationalId} /> : hidden],
    [t("case.mobiles"), cu.mobiles && cu.mobiles.length ? <Ltr v={cu.mobiles.join(", ")} /> : hidden],
  ];
  if (c.service === "investigation") {
    rows.push([t("case.inquiryTypes"), whatOf(c)]);
    rows.push([t("case.deadline"), dateTime(c.deadline || c.dueAt)]);
  } else {
    rows.push([t("case.product"), listLabel("productTypes", c.productType)]);
    rows.push([t("case.dpd"), (c.dpd != null ? c.dpd + " · " : "") + whatOf(c)]);
    if (c.masked) rows.push([t("case.amountRange"), c.amountRange ? t("amountRange." + c.amountRange) : "-"]);
    else rows.push([t("case.overdueAmount"), money(c.overdueAmount)]);
    rows.push([t("case.periodEnd"), dateTime(c.periodEnd || c.dueAt)]);
  }
  if (c.price != null) rows.push([t("console.cases.price"), typeof c.price === "number" ? money(c.price) : t("case.feeTerms", { pct: c.price.feePct, fixed: money(c.price.fixedFee) })]);
  if (c.agentName) rows.push([t("console.cases.agent"), c.agentName]);
  rows.push([t("case.instructions"), c.instructions === null && c.masked ? hidden : c.instructions || "-"]);
  Object.keys(c.addresses || {}).forEach((k) => rows.push([t("address." + k), c.addresses[k].street ? addressLine(c.addresses[k]) : hidden]));
  return <Rows rows={rows} />;
}

function optLabel(t: (k: string) => string, form: Any, f: Any, v: string) {
  return t((f.labelBase || ("forms." + form.id + "." + f.name + "Opt")) + "." + v);
}
function Answer({ form, f, v }: { form: Any; f: Any; v: Any }) {
  const t = useT();
  if (v == null || v === "") return <>-</>;
  switch (f.type) {
    case "yesno": return <>{t("common." + v)}</>;
    case "select": return <>{optLabel(t, form, f, v)}</>;
    case "number": case "computed": return <>{num(+v)}</>;
    case "date": return <>{date(new Date(v).getTime())}</>;
    // eslint-disable-next-line @next/next/no-img-element -- photos and signatures are data URLs from the app
    case "signature": case "photo": return <img src={v} alt="" className="max-h-20 rounded border border-line bg-white" />;
    case "license": return <>{v.has === "yes" ? v.number || "-" : t("common.no")}</>;
    case "repeat": return (
      <div className="space-y-1">{(v as Any[]).map((row, i) => (
        <div key={i}>{f.fields.map((sf: Any) => (row[sf.name] ? (sf.type === "select" ? optLabel(t, form, sf, row[sf.name]) : row[sf.name]) : null)).filter(Boolean).join(" · ")}</div>
      ))}</div>
    );
    default: return <>{String(v)}</>;
  }
}

/** The report answers, section by section, with scanned documents first. */
export function ReportView({ c }: { c: Any }) {
  const t = useT();
  const wf = icm().wf, C = icm().config;
  const types: string[] = c.inquiryTypes || [];
  if (c.masked) return <p className="text-sm text-ink3">{t("console.cases.reportHidden")}</p>;
  if (!types.some((tp) => c.report && c.report[tp])) return <p className="text-sm text-ink3">{t("evidence.noReport")}</p>;
  return (
    <div className="space-y-6">
      {types.map((tp) => {
        const form = C.REPORT_FORMS[tp], vals = (c.report || {})[tp] || {};
        if (!form) return null;
        const sections = form.sections || [{ id: "", fields: form.fields }];
        const docs = wf.formFields(form).filter((f: Any) => f.type === "ocrDoc" && vals[f.name]);
        return (
          <section key={tp} className="space-y-3">
            <h3 className="font-semibold">{listLabel("inquiryTypes", tp)}</h3>
            {docs.length ? (
              <div className="flex flex-wrap gap-3">
                {docs.map((f: Any) => (
                  <figure key={f.name} className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- document scans are data URLs from the app */}
                    <img src={vals[f.name]} alt={t("ocr.doc." + f.doc)} className="h-20 rounded border border-line" />
                    <figcaption className="text-xs text-ink3">{t("ocr.doc." + f.doc)}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            {sections.map((sec: Any) => {
              const fields = sec.fields.filter((f: Any) => wf.isVisible(f, vals) && f.type !== "ocrDoc");
              if (!fields.length) return null;
              return (
                <div key={sec.id || "all"} className="space-y-2">
                  {sec.id ? <div className="text-xs font-semibold uppercase tracking-wide text-ink3">{t("forms." + form.id + ".sections." + sec.id)}</div> : null}
                  <Rows rows={fields.map((f: Any) => [t("forms." + form.id + "." + f.name), <Answer key={f.name} form={form} f={f} v={vals[f.name]} />] as [string, ReactNode])} />
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

export function Photos({ photos }: { photos: Any[] }) {
  const t = useT();
  if (!photos || !photos.length) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {photos.map((p) => (
        <figure key={p.id} className="w-28 space-y-1">
          {/* eslint-disable-next-line @next/next/no-img-element -- photos are data URLs from the app */}
          {p.dataUrl ? <img src={p.dataUrl} alt="" className="h-20 w-28 rounded border border-line object-cover" /> : <div className="flex h-20 w-28 items-center justify-center rounded bg-surface2 text-xs text-ink3">{p.hidden ? t("console.cases.hidden") : "-"}</div>}
          <figcaption className="truncate text-xs text-ink3">{p.label ? t("evidence.label." + p.label) : dateTime(p.at)}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function CheckIn({ ci, masked }: { ci: Any; masked?: boolean }) {
  const t = useT();
  if (masked) return <p className="text-sm text-ink3">{t("console.cases.checkInHidden")}</p>;
  if (!ci) return <p className="text-sm text-ink3">{t("evidence.notCheckedIn")}</p>;
  const U = icm().util, max = icm().config.CHECKIN_MAX_DISTANCE_M;
  const measured = ci.distanceM != null;
  const warn = (measured && ci.distanceM > max) || ci.outsideArea;
  return (
    <div className="space-y-1 text-sm">
      <Badge tone={warn ? "warning" : "success"}>{measured ? t("evidence.checkedInAt", { time: U.fmtTime(ci.at), distance: U.num(ci.distanceM) }) : t("gps.checkedIn", { time: U.fmtTime(ci.at) })}</Badge>
      <div className="text-xs text-ink2">{(ci.source === "device" ? t("gps.fromPhone") : t("gps.simulated")) + (ci.accuracyM != null ? " · " + t("gps.accuracy", { n: U.num(ci.accuracyM) }) : "")}</div>
      {ci.lat != null ? <a className="text-xs text-accent hover:underline" href={"https://www.google.com/maps/search/?api=1&query=" + ci.lat + "," + ci.lng} target="_blank" rel="noopener noreferrer"><bdi dir="ltr">{ci.lat.toFixed(5) + ", " + ci.lng.toFixed(5)}</bdi> · {t("gps.openMap")}</a> : null}
    </div>
  );
}

export function Balance({ c }: { c: Any }) {
  const t = useT();
  const wf = icm().wf;
  if (c.masked) return null;
  return (
    <Rows rows={[
      [t("case.overdueAmount"), money(c.settledTarget || c.overdueAmount)],
      [t("collection.recovered"), money(wf.collection.recovered(c))],
      [t("collection.outstanding"), money(wf.collection.outstanding(c))],
      [t("collection.promises"), num((c.promises || []).length)],
    ]} />
  );
}

export function Timeline({ c }: { c: Any }) {
  const t = useT();
  const items = (c.timeline || []).slice().reverse();
  if (!items.length) return <p className="text-sm text-ink3">{t("timeline.empty")}</p>;
  return (
    <ol className="space-y-3">
      {items.map((e: Any) => (
        <li key={e.id} className="flex gap-3">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.to ? "bg-accent" : "bg-line-strong"}`} aria-hidden />
          <div className="min-w-0 text-sm">
            <div className="font-medium">{t("timeline." + e.action)}</div>
            <div className="text-xs text-ink3"><bdi dir="ltr">{dateTime(e.at)}</bdi> · {e.actorName}</div>
            {e.note ? <div className="text-xs text-ink2">{e.note}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
