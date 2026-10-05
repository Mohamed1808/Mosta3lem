/**
 * One provider. For an application: the review track (Operations approval, then
 * Management sign-off by another person), individual checks, notes, request info or
 * reject. For a live provider: price change and document renewal decisions, scores,
 * standing (warn, reduce, suspend, reactivate) and the team. Every action shows only for
 * the team that may take it; the engine checks again.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ReactNode } from "react";

import { icm, services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { Badge, Button, Card, Loading, Notice, PageHead, Tone } from "@/components/ui";
import { addressLine, coverageText, date, dateTime, num, pct, priceChanges } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const LEVEL_TONE: Record<string, Tone> = { none: "success", warned: "warning", reduced: "warning", suspended: "danger" };
const STATUS_TONE: Record<string, Tone> = { pending: "warning", awaiting_signoff: "info", info_requested: "neutral", rejected: "danger", verified: "success" };

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(8rem,auto)_1fr]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink2">{k}</dt>
          <dd className="font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
const Ltr = ({ v }: { v: string | null | undefined }) => (v ? <bdi dir="ltr">{v}</bdi> : <>-</>);

export default function ProviderPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const q = useQuery<Any>(async () => {
    const p = await services().providers.get(id);
    p.team = p.kind === "company" ? await services().team.ofProvider(id) : null;
    return p;
  }, [id]);
  if (q.error && !q.data) return <Notice tone="danger">{t(q.error.key || "errors.generic")}</Notice>;
  if (!q.data) return <Loading label={t("console.loading")} />;
  return <Body p={q.data} />;
}

function Body({ p }: { p: Any }) {
  const t = useT();
  const { can, session } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const wf = icm().wf;
  const st = p.verification.status;
  const live = st === "verified";
  const company = p.kind === "company";
  const now = icm().clock.now();

  const reason = async (title: string, opts: { danger?: boolean; label?: string; confirm?: string; message?: string } = {}) => {
    const v = await ask({ title, message: opts.message, note: "required", noteLabel: opts.label, danger: opts.danger, confirmLabel: opts.confirm || title });
    return v ? v.note : null;
  };

  // ---- application review
  const sameApprover = p.verification.opsApproval && p.verification.opsApproval.userId === session?.user?.id;
  const review: ReactNode[] = [];
  if (wf.applicationOpen(st) && (can("providers.approve") || can("providers.signoff"))) {
    if (st === "pending" && can("providers.approve")) {
      review.push(<Button key="approve" kind="primary" onClick={async () => {
        if (await ask({ title: t("onboarding.approve"), message: t("onboarding.approveBody"), confirmLabel: t("onboarding.approve") })) await run(() => services().providers.approve(p.id), t("onboarding.approved"));
      }}>{t("onboarding.approve")}</Button>);
    }
    if (st === "awaiting_signoff" && can("providers.signoff")) {
      review.push(<Button key="signoff" kind="primary" disabled={sameApprover} onClick={async () => {
        if (await ask({ title: t("onboarding.signoff"), message: t("onboarding.signoffBody"), confirmLabel: t("onboarding.signoff") })) await run(() => services().providers.verify(p.id), t("onboarding.signedOff"));
      }}>{t("onboarding.signoff")}</Button>);
    }
    if (st === "pending" || st === "awaiting_signoff") {
      review.push(<Button key="info" onClick={async () => {
        const n = await reason(t("onboarding.requestInfo"), { label: t("onboarding.whatIsMissing"), confirm: t("onboarding.send") });
        if (n) await run(() => services().providers.requestInfo(p.id, n), t("console.providers.infoRequested"));
      }}>{t("onboarding.requestInfo")}</Button>);
      review.push(<Button key="reject" kind="danger" onClick={async () => {
        const n = await reason(t("onboarding.reject"), { danger: true });
        if (n) await run(() => services().providers.reject(p.id, n), t("console.providers.rejected"));
      }}>{t("onboarding.reject")}</Button>);
    }
  }

  const enforce = async (level: string) => {
    const n = await reason(t("admin.enforceTitle", { level: t("enforcement." + level) }), { message: t("admin.enforceBody." + level), danger: level === "suspended", confirm: t("common.confirm") });
    if (n) await run(() => services().providers.enforce(p.id, level, n), t("admin.enforced"));
  };
  const lvl = p.enforcement.level;

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/providers" className="text-accent hover:underline">{t("console.nav.providers")}</Link></div>
      <PageHead title={p.name} sub={t("kind." + p.kind) + " · " + p.services.map((s: string) => t("service." + s)).join(t("common.listSep"))}
        right={<div className="flex flex-wrap gap-2">
          {live ? <Badge tone={LEVEL_TONE[lvl]}>{t("enforcement." + lvl)}</Badge> : <Badge tone={STATUS_TONE[st] || "neutral"}>{t("status." + st)}</Badge>}
          {wf.expiredDocs(p, now).length ? <Badge tone="danger">{t("settings.state.expired")}</Badge> : null}
        </div>} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {!live ? (
          <Card title={t("console.providers.review")} className="lg:col-span-2">
            <div className="space-y-4">
              <ol className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <Step done label={t("console.providers.stepApplied")} by={date(p.verification.submittedAt)} />
                <Step done={!!p.verification.opsApproval} label={t("console.providers.stepOps")} by={p.verification.opsApproval ? p.verification.opsApproval.by + " · " + date(p.verification.opsApproval.at) : t("console.providers.notYet")} />
                <Step done={!!p.verification.signoff} label={t("console.providers.stepMgmt")} by={p.verification.signoff ? p.verification.signoff.by + " · " + date(p.verification.signoff.at) : t("console.providers.notYet")} />
              </ol>
              {p.kind === "freelancer" ? (
                <div className="flex flex-wrap gap-6 text-sm">
                  <span className="text-ink2">{t("onboarding.freelancerChecks")}</span>
                  {["idVerified", "certified"].map((f) => (
                    <label key={f} className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={!!p.verification[f]} disabled={!can("providers.approve") || st !== "pending"}
                        onChange={(e) => run(() => services().providers.setCheck(p.id, f, e.target.checked))} />
                      {t("onboarding." + f)}
                    </label>
                  ))}
                </div>
              ) : null}
              {sameApprover && st === "awaiting_signoff" && can("providers.signoff") ? <Notice tone="warning">{t("console.providers.sameApprover")}</Notice> : null}
              {review.length ? <div className="flex flex-wrap gap-2">{review}</div> : <p className="text-sm text-ink3">{t("console.providers.noReviewAction")}</p>}
              {p.verification.notes.filter((n: Any) => n.text).length ? (
                <ul className="space-y-1 border-t border-line pt-3 text-xs text-ink2">
                  {p.verification.notes.filter((n: Any) => n.text).map((n: Any, i: number) => <li key={i}>{dateTime(n.at)} · {n.by}: {n.text}</li>)}
                </ul>
              ) : null}
            </div>
          </Card>
        ) : null}

        <Card title={t("admin.registration")}>
          <Rows rows={[
            [t("profile.services"), p.services.map((s: string) => t("service." + s)).join(t("common.listSep"))],
            ...(company && p.legal ? [[t("reg.f.taxId"), <Ltr key="tax" v={p.legal.taxId} />], [t("reg.f.commercialRegNo"), <Ltr key="cr" v={p.legal.commercialRegNo} />]] as [string, ReactNode][] : []),
            ...(company && p.owner ? [[t("reg.sec.owner"), <span key="o">{p.owner.name} · <Ltr v={p.owner.phone} /></span>]] as [string, ReactNode][] : []),
            ...(company && p.focalPoint ? [[t("reg.sec.focal"), <span key="f">{p.focalPoint.name} · <Ltr v={p.focalPoint.phone} /></span>]] as [string, ReactNode][] : []),
            ...(!company ? [[t("reg.f.nationalId"), p.nationalId ? <Ltr key="nid" v={p.nationalId} /> : t("console.providers.hidden")]] as [string, ReactNode][] : []),
            [company ? t("reg.f.mainPhone") : t("reg.f.phone"), <Ltr key="ph" v={p.phone} />],
            [company ? t("reg.sec.hq") : t("reg.detail.address"), p.address ? addressLine(p.address) : p.city],
            [t("reg.detail.coverage"), p.coverageCities ? coverageText(p.coverageCities) : p.governorates.join(", ")],
            ...(p.registration ? [[t("console.providers.source"), t("onboarding.source." + p.registration.source) + " · " + date(p.registration.at)]] as [string, ReactNode][] : []),
          ]} />
        </Card>

        <Card title={t("profile.documents")}>
          <ul className="divide-y divide-line">
            {p.verification.documents.map((d: Any) => {
              const ex = wf.docExpiry(d, now);
              const pending = d.renewal || (live && d.status === "uploaded");
              const img = d.renewal ? d.renewal.url : d.url;
              return (
                <li key={d.type} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{t("doc." + d.type)}</div>
                    {d.expiresAt ? <div className={`text-xs ${ex.state === "expired" ? "text-bad" : ex.state === "expiring" ? "text-warn" : "text-ink3"}`}>{t("settings.expires", { date: date(d.expiresAt) })}</div> : null}
                    {d.renewal ? <div className="text-xs text-accent">{t("settings.renewalSent", { date: d.renewal.expiresAt ? date(d.renewal.expiresAt) : "-" })}</div> : null}
                    {/* eslint-disable-next-line @next/next/no-img-element -- document scans are data URLs from the app, not files next/image can optimise */}
                    {img && img.indexOf("data:") === 0 ? <a href={img} target="_blank" rel="noopener noreferrer"><img src={img} alt={t("doc." + d.type)} className="mt-1 max-h-20 max-w-32 rounded border border-line" /></a> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {ex.state === "expired" ? <Badge tone="danger">{t("settings.state.expired")}</Badge> : ex.state === "expiring" ? <Badge tone="warning">{t("settings.state.expiring")}</Badge>
                      : <Badge tone={d.status === "missing" ? "danger" : d.status === "uploaded" ? "warning" : "success"}>{t("console.providers.doc." + d.status)}</Badge>}
                    {pending && can("providers.documents") ? (
                      <>
                        {d.renewal ? <Button kind="danger" onClick={async () => { const n = await reason(t("onboarding.reject"), { danger: true }); if (n) await run(() => services().providers.rejectDocument(p.id, d.type, n), t("console.providers.docRejected")); }}>{t("onboarding.reject")}</Button> : null}
                        <Button kind="primary" onClick={() => run(() => services().providers.verifyDocument(p.id, d.type), t("settings.docVerified"))}>{t("settings.verifyDoc")}</Button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {live ? (
          <Card title={t("settings.priceRequest")}>
            {p.priceRequest ? (
              <div className="space-y-3 text-sm">
                <div className="text-ink2">{t("settings.requestedBy", { name: p.priceRequest.by, date: dateTime(p.priceRequest.at) })}</div>
                {p.priceRequest.note ? <p>{p.priceRequest.note}</p> : null}
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {priceChanges(p.pricing, p.priceRequest.pricing).map((c) => (
                    <li key={c.label} className="flex items-center justify-between gap-3 px-3 py-2"><span>{c.label}</span><bdi dir="ltr" className="font-mono text-xs">{c.from} → <strong>{c.to}</strong></bdi></li>
                  ))}
                </ul>
                {can("providers.prices") ? (
                  <div className="flex justify-end gap-2">
                    <Button kind="danger" onClick={async () => { const n = await reason(t("onboarding.reject"), { danger: true }); if (n) await run(() => services().providers.decidePriceChange(p.id, false, n), t("console.providers.pricesRejected")); }}>{t("onboarding.reject")}</Button>
                    <Button kind="primary" onClick={() => run(() => services().providers.decidePriceChange(p.id, true), t("settings.pricesApproved"))}>{t("settings.approvePrices")}</Button>
                  </div>
                ) : null}
              </div>
            ) : <p className="text-sm text-ink3">{t("settings.noPriceRequest")}</p>}
          </Card>
        ) : null}

        {live ? (
          <Card title={t("admin.enforcement")}>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={LEVEL_TONE[lvl]}>{t("enforcement." + lvl)}</Badge>
                <span className="text-ink2">{t("enforcementSource." + p.enforcement.source)}{p.enforcement.reason ? ": " + p.enforcement.reason : ""}</span>
              </div>
              {can("providers.enforce") ? (
                <div className="flex flex-wrap gap-2">
                  {lvl !== "warned" ? <Button onClick={() => enforce("warned")}>{t("admin.warn")}</Button> : null}
                  {lvl !== "reduced" ? <Button onClick={() => enforce("reduced")}>{t("admin.reduce")}</Button> : null}
                  {lvl !== "suspended" ? <Button kind="danger" onClick={() => enforce("suspended")}>{t("admin.suspend")}</Button> : null}
                  {lvl !== "none" ? <Button kind="primary" onClick={() => enforce("none")}>{t("admin.reactivate")}</Button> : null}
                  {p.enforcement.source === "manual" ? <Button kind="ghost" onClick={() => run(() => services().providers.setAutomatic(p.id), t("console.providers.backToAuto"))}>{t("admin.backToAuto")}</Button> : null}
                </div>
              ) : <p className="text-ink3">{t("console.providers.enforceTeam")}</p>}
            </div>
          </Card>
        ) : null}

        {live && p.score ? p.services.map((s: string) => {
          const sc = p.score.byService[s];
          if (!sc) return null;
          const m = sc.metrics || {};
          return (
            <Card key={s} title={t("admin.scoreFor", { service: t("service." + s) })}>
              <Rows rows={[
                [t("score.label"), num(sc.score, 1)],
                [t("score.operational"), num(sc.operational, 1)],
                [t("score.ratingPart"), num(sc.ratingPart, 1)],
                [t("console.providers.rating"), sc.isNew ? t("console.providers.newProvider") : num(sc.avgRating, 1) + " (" + num(sc.ratingCount) + ")"],
                ...(s === "investigation"
                  ? [[t("metric.onTime"), pct(m.onTime)], [t("metric.firstTime"), pct(m.firstTime)], [t("metric.evidence"), pct(m.evidence)]]
                  : [[t("metric.recoveryNorm"), pct(m.recovery)], [t("metric.ptpKept"), pct(m.ptpKept)], [t("metric.complaints"), pct(m.complaintRate)]]) as [string, ReactNode][],
                [t("admin.volume"), num(m.volume)],
              ]} />
            </Card>
          );
        }) : null}

        {live && p.team ? (
          <Card title={t("admin.team")}>
            <div className="space-y-3 text-sm">
              <div><span className="text-ink2">{t("team.owner")}: </span>{p.team.owners.map((o: Any) => o.name).join(t("common.listSep")) || "-"}</div>
              {p.team.supervisors.map((s: Any) => (
                <div key={s.id} className="rounded-lg border border-line p-3">
                  <div className="font-medium">{s.name} <span className="text-xs text-ink3">· {t("role.provider_supervisor")} · {t("team.agentsN", { n: num(s.agents.length) })}</span></div>
                  <div className="mt-1 text-xs text-ink2">{s.agents.map((a: Any) => a.name).join(t("common.listSep")) || "-"}</div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {(can("audit.view") || can("providers.approve")) && p.audit && p.audit.length ? (
          <Card title={t("admin.history")} className="lg:col-span-2">
            <ul className="space-y-1.5 text-sm">
              {p.audit.map((a: Any) => (
                <li key={a.id}><span className="font-mono text-xs text-ink3"><bdi dir="ltr">{dateTime(a.at)}</bdi></span> · {a.actorName}: {auditLabel(a.action)}{a.reason ? <span className="text-ink2"> · {a.reason}</span> : null}</li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}

/** "provider.ops_approved" as its readable label, or the raw action when there is none. */
function auditLabel(action: string) {
  const key = "audit.action." + action.replace(/\./g, "_");
  return icm().i18n.has(key) ? icm().t(key) : action;
}

function Step({ done, label, by }: { done?: boolean; label: string; by: string }) {
  return (
    <li className={`rounded-lg border p-3 ${done ? "border-ok bg-ok-bg" : "border-line"}`}>
      <div className={`text-sm font-medium ${done ? "text-ok" : "text-ink2"}`}>{label}</div>
      <div className="mt-0.5 text-xs text-ink2">{by}</div>
    </li>
  );
}
