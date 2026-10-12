/** Pieces shared by the data protection pages. */
"use client";

import Link from "next/link";

import { Badge, Card, Tone } from "@/components/ui";
import { dateTime, num } from "@/lib/format";
import { useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export const STATUS_TONE: Record<string, Tone> = { open: "warning", in_review: "info", done: "success", refused: "neutral" };

/** "Late" / "Due soon" next to a deadline. */
export function DueBadge({ late, soon }: { late?: boolean; soon?: boolean }) {
  const t = useT();
  if (late) return <Badge tone="danger">{t("console.privacy.late")}</Badge>;
  if (soon) return <Badge tone="warning">{t("console.privacy.dueSoon")}</Badge>;
  return null;
}

export const SEVERITY_TONE: Record<string, Tone> = { low: "neutral", medium: "warning", high: "danger" };

export function BreachList({ rows }: { rows: Any[] }) {
  const t = useT();
  return (
    <Card>
      {!rows.length ? <p className="text-sm text-ink3">{t("console.privacy.noBreaches")}</p> : (
        <ul className="-m-5 divide-y divide-line">
          {rows.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link href={`/privacy/breaches/${b.id}`} className="font-mono font-medium text-accent hover:underline">{b.ref}</Link>
                <span className="ms-2 text-sm">{b.title}</span>
                <div className="text-xs text-ink2">{t("console.privacy.col.found")}: {dateTime(b.discoveredAt)} · {t("console.privacy.breach.reportedBy", { name: b.reportedByName })}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SEVERITY_TONE[b.severity]}>{t("privacy.severity." + b.severity)}</Badge>
                <Badge tone={b.status === "open" ? (b.late ? "danger" : "warning") : b.status === "reported" ? "info" : "neutral"}>{t("privacy.breachStatus." + b.status)}</Badge>
                {b.status === "open" ? <span className={`text-xs ${b.late ? "text-bad" : "text-ink2"}`}>{b.late ? t("console.privacy.late") : t("console.privacy.hoursLeft", { h: num(b.hoursLeft) })}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

