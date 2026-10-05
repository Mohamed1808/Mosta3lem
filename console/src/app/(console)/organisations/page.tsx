/**
 * Client organisations: who they are, how much work they send, how providers rate them
 * as clients, and (for teams that handle billing) what they have spent. Sales opens new
 * organisation accounts from here.
 */
"use client";

import Link from "next/link";

import { services } from "@/backend/engine";
import { Card, Loading, PageHead } from "@/components/ui";
import { money, num } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function Organisations() {
  const t = useT();
  const { can } = useApp();
  const q = useQuery<Any[]>(() => services().entities.list());
  if (!q.data) return <Loading label={t("console.loading")} />;
  const showSpend = q.data.some((e) => e.spend !== null);
  return (
    <>
      <PageHead title={t("console.nav.organisations")} sub={t("console.orgs.sub")}
        right={can("orgs.create") ? <Link href="/organisations/new" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[#174b8a]">{t("console.orgs.new")}</Link> : null} />
      <Card>
        {!q.data.length ? <p className="text-sm text-ink3">{t("console.orgs.none")}</p> : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-surface2 text-xs text-ink2">
                <tr>
                  {["name", "users", "open", "volume", ...(showSpend ? ["spend"] : []), "rating"].map((h) => <th key={h} className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("console.orgs.col." + h)}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {q.data.map((e) => (
                  <tr key={e.id} className="hover:bg-surface2">
                    <td className="px-4 py-3 ps-5">
                      <Link href={`/organisations/${e.id}`} className="font-medium text-accent hover:underline">{e.name}</Link>
                      <div className="text-xs text-ink3">{t("entityType." + e.type)} · {e.city}{e.active === false ? " · " + t("common.inactive") : ""}</div>
                    </td>
                    <td className="px-4 py-3">{num(e.users.length)}</td>
                    <td className="px-4 py-3">{num(e.open)}</td>
                    <td className="px-4 py-3">{num(e.volume)}</td>
                    {showSpend ? <td className="px-4 py-3">{money(e.spend)}</td> : null}
                    <td className="px-4 py-3 pe-5">
                      {e.clientRating.count ? t("console.orgs.ratingLine", { data: num(e.clientRating.dataQuality, 1), pay: num(e.clientRating.paymentTimeliness, 1), n: num(e.clientRating.count) }) : <span className="text-ink3">{t("console.orgs.noRatings")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
