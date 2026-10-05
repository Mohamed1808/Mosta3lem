/**
 * Activity log (Legal, Management, Super admin): who did what and when on the platform,
 * newest first, with search and filters by team and by kind of record.
 */
"use client";

import { useState } from "react";

import { icm, services } from "@/backend/engine";
import { Card, inputClass, Loading, PageHead } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const TYPES = ["case", "provider", "dispute", "invoice", "entity", "user", "config", "rating", "batch"];

function label(action: string) {
  const key = "audit.action." + action.replace(/\./g, "_");
  return icm().i18n.has(key) ? icm().t(key) : action;
}

export default function Activity() {
  const t = useT();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [role, setRole] = useState("");
  const data = useQuery<Any[]>(() => services().audit.list({ q, targetType: type || undefined, actorRole: role || undefined, limit: 300 }), [q, type, role]);
  const roles: string[] = icm().wf.ALL_ROLES;
  return (
    <>
      <PageHead title={t("console.nav.activity")} sub={t("console.activity.sub")} />
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("console.activity.search")} aria-label={t("console.activity.search")} />
        <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)} aria-label={t("console.activity.kind")}>
          <option value="">{t("console.activity.allKinds")}</option>
          {TYPES.map((x) => <option key={x} value={x}>{t("console.activity.type." + x)}</option>)}
        </select>
        <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} aria-label={t("console.activity.who")}>
          <option value="">{t("console.activity.everyone")}</option>
          {roles.map((r) => <option key={r} value={r}>{t("role." + r)}</option>)}
        </select>
      </div>
      <Card>
        {!data.data ? <Loading label={t("console.loading")} /> : !data.data.length ? <p className="text-sm text-ink3">{t("console.activity.none")}</p> : (
          <ul className="-m-5 divide-y divide-line text-sm">
            {data.data.map((a) => (
              <li key={a.id} className="px-5 py-2.5">
                <div><span className="font-medium">{label(a.action)}</span>{a.targetRef ? <span className="text-ink2"> · {a.targetRef}</span> : null}</div>
                <div className="text-xs text-ink3"><bdi dir="ltr">{dateTime(a.at)}</bdi> · {a.actorName} ({t("role." + a.actorRole)}){a.reason ? " · " + a.reason : ""}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
