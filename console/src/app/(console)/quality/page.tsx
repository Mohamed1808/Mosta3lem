/**
 * Quality: reports waiting for the platform's review, oldest first. These are reports
 * from individual providers and from company owners doing their own field work (a
 * company's supervisors review the rest). Open one to approve it or return it.
 */
"use client";

import Link from "next/link";

import { services } from "@/backend/engine";
import { slaBadge, whatOf } from "@/components/caseParts";
import { Card, Loading, PageHead } from "@/components/ui";
import { dateTime } from "@/lib/format";
import { useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function Quality() {
  const t = useT();
  const q = useQuery<Any[]>(() => services().cases.reviewQueue());
  if (!q.data) return <Loading label={t("console.loading")} />;
  return (
    <>
      <PageHead title={t("console.nav.quality")} sub={t("console.quality.sub")} />
      <Card>
        {!q.data.length ? <p className="text-sm text-ink3">{t("review.empty")}</p> : (
          <ul className="-m-5 divide-y divide-line">
            {q.data.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/cases/${c.id}`} className="font-mono font-medium text-accent hover:underline">{c.ref}</Link>
                  <div className="text-sm">{c.providerName} · {whatOf(c)}</div>
                  <div className="text-xs text-ink3">{t("review.submitted")} <bdi dir="ltr">{dateTime(c.reportSubmittedAt)}</bdi>{c.returnCount ? " · " + t("review.previouslyReturned", { n: c.returnCount }) : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  {slaBadge(c, t)}
                  <Link href={`/cases/${c.id}`} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[#174b8a]">{t("review.open")}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
