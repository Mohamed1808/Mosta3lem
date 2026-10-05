/**
 * One organisation: its details, its users (with sign-in help from Customer support),
 * work volume, how providers rate it as a client, spending for billing teams and recent
 * history for teams with the audit log.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { icm, services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { Badge, Button, Card, Kpi, Loading, Notice, PageHead } from "@/components/ui";
import { date, dateTime, money, num, orgPlace } from "@/lib/format";
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
      {created ? <div className="mb-4"><Notice tone="success">{t("console.orgs.createdNote", { pw: icm().config.DEMO_PASSWORD })}</Notice></div> : null}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("console.orgs.col.open")} value={num(e.open)} />
        <Kpi label={t("console.orgs.col.volume")} value={num(e.volume)} />
        {e.spend !== null ? <Kpi label={t("console.orgs.col.spend")} value={money(e.spend)} /> : null}
        <Kpi label={t("console.orgs.col.rating")} value={e.clientRating.count ? num(e.clientRating.dataQuality, 1) + " / " + num(e.clientRating.paymentTimeliness, 1) : "-"}
          sub={e.clientRating.count ? t("console.orgs.ratingSub", { n: num(e.clientRating.count) }) : t("console.orgs.noRatings")} />
      </div>
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
