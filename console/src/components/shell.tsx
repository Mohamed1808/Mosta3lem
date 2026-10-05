/**
 * The console frame: a side menu showing only what the person's team may use, the
 * signed-in person and their team, language and sign out. Sends anyone not signed in to
 * the sign-in page.
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

import { DialogProvider } from "@/components/dialog";
import { Loading } from "@/components/ui";
import { services } from "@/backend/engine";
import { useApp, useQuery, useT } from "@/lib/app";

/** Menu entries, each shown only to teams with its permission (null: everyone). */
export const NAV: { href: string; key: string; perm: string | null; count?: string }[] = [
  { href: "/", key: "console.nav.overview", perm: "overview" },
  { href: "/providers", key: "console.nav.providers", perm: "providers.view", count: "onboarding" },
  { href: "/cases", key: "console.nav.cases", perm: "cases.view", count: "late" },
  { href: "/quality", key: "console.nav.quality", perm: "qa.review", count: "qa" },
  { href: "/disputes", key: "console.nav.disputes", perm: "disputes.view", count: "disputes" },
  { href: "/finance", key: "console.nav.finance", perm: "billing.view", count: "toIssue" },
  { href: "/organisations", key: "console.nav.organisations", perm: "orgs.view" },
  { href: "/reports", key: "console.nav.reports", perm: "reports.view" },
  { href: "/activity", key: "console.nav.activity", perm: "audit.view" },
  { href: "/staff", key: "console.nav.staff", perm: "staff.manage" },
  { href: "/settings", key: "console.nav.settings", perm: "settings.manage" },
  { href: "/access", key: "console.nav.access", perm: null },
];

export function Shell({ children }: { children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const { ready, error, session, signOut, can, lang, setLang } = useApp();
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const counts = useQuery<any>(() => services().analytics.navCounts(null)).data || {};

  useEffect(() => { if (ready && !session) router.replace("/login"); }, [ready, session, router]);
  if (error) return <div className="p-8 text-bad">{error}</div>;
  if (!ready || !session) return <Loading label="Loading" />;

  const u = session.user;
  const items = NAV.filter((n) => !n.perm || can(n.perm));
  const menu = (
    <nav className="space-y-1" aria-label={t("console.menu")}>
      {items.map((n) => {
        const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${on ? "bg-accent-soft text-accent" : "text-ink2 hover:bg-surface2"}`}>
            <span className="flex items-center justify-between gap-2">
              {t(n.key)}
              {n.count && counts[n.count] ? <span className="rounded-full bg-warn-bg px-2 text-xs font-semibold text-warn">{counts[n.count]}</span> : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className={`${open ? "block" : "hidden"} border-line bg-surface p-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0 lg:border-e`}>
        <div className="mb-6 hidden items-center gap-3 lg:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-semibold text-white">{lang === "ar" ? "م" : "M"}</div>
          <div className="text-sm font-semibold">{t("console.name")}</div>
        </div>
        {menu}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:px-8">
          <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-sm lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>{t("console.menu")}</button>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{u.name}</div>
            <div className="truncate text-xs text-ink2">{t("role." + u.role)}</div>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="text-sm font-medium text-accent">{t("console.language")}</button>
            <button type="button" onClick={async () => { await signOut(); router.replace("/login"); }} className="text-sm font-medium text-bad">{t("console.signOut")}</button>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8"><DialogProvider>{children}</DialogProvider></main>
      </div>
    </div>
  );
}
