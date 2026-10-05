/**
 * Teams and access: what each team can see and do, straight from the engine's permission
 * table, with the person's own team highlighted and the decisions that need two teams.
 */
"use client";

import { icm } from "@/backend/engine";
import { Badge, Card, PageHead } from "@/components/ui";
import { permKey } from "@/i18n/strings";
import { useApp, useT } from "@/lib/app";

export default function Access() {
  const t = useT();
  const { session } = useApp();
  const wf = icm().wf;
  const mine = session?.user?.role;
  const roles: string[] = wf.PLATFORM_ROLES;
  const dual: Record<string, string[]> = wf.DUAL_APPROVAL;
  const teams = (list: string[]) => list.map((r) => t("role." + r)).join(t("console.access.and"));
  return (
    <>
      <PageHead title={t("console.nav.access")} sub={t("console.access.sub")} />
      <div className="mb-4 space-y-2">
        {Object.keys(dual).map((p) => (
          <div key={p} className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">
            <span className="font-semibold">{t("console.access.twoTeams")}: </span>
            {t("console.access.twoTeamsBody", { action: t(permKey(p)), teams: teams(dual[p]) })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => {
          const list: string[] = wf.PERMISSIONS[r].indexOf("*") >= 0 ? [] : wf.PERMISSIONS[r];
          return (
            <Card key={r} title={t("role." + r)} right={r === mine ? <Badge tone="info">{t("console.access.yours")}</Badge> : null}
              className={r === mine ? "ring-2 ring-accent" : ""}>
              <p className="mb-3 text-xs text-ink2">{t("roleHint." + r)}</p>
              <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-surface2 px-3 py-2 text-xs">
                <span className="text-ink2">{t("console.access.personal")}</span>
                <Badge tone={wf.seesPersonalData(r) ? "success" : "neutral"}>{wf.seesPersonalData(r) ? t("console.access.personalYes") : t("console.access.personalNo")}</Badge>
              </div>
              {list.length ? (
                <ul className="space-y-1.5 text-sm">
                  {list.filter((p) => p !== "personalData").map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      <span>{t(permKey(p))}{dual[p] ? <span className="ms-1 text-xs text-warn">({t("console.access.twoTeams")})</span> : null}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm">{t("console.access.all")}</p>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
