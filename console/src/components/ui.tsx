/** Small building blocks shared by the console screens. */
"use client";

import { ReactNode } from "react";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface2 text-ink2",
  info: "bg-accent-soft text-accent",
  success: "bg-ok-bg text-ok",
  warning: "bg-warn-bg text-warn",
  danger: "bg-bad-bg text-bad",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function Card({ title, right, children, className = "" }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>
      {title || right ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {right}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "warn" | "bad" | "ok" }) {
  const color = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-ink2">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-ink3">{sub}</div> : null}
    </div>
  );
}

export function Button({ children, onClick, kind = "secondary", type = "button", disabled, busy, full }: {
  children: ReactNode; onClick?: () => void; kind?: "primary" | "secondary" | "ghost" | "danger"; type?: "button" | "submit"; disabled?: boolean; busy?: boolean; full?: boolean;
}) {
  const k = kind === "primary" ? "bg-accent text-white hover:bg-[#174b8a]" : kind === "danger" ? "bg-bad-bg text-bad hover:bg-[#f8dcd8]"
    : kind === "ghost" ? "text-accent hover:bg-accent-soft" : "border border-line-strong bg-surface text-ink hover:bg-surface2";
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${k} ${full ? "w-full" : ""}`}>
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: Tone }) {
  return <div className={`rounded-lg px-4 py-3 text-sm ${TONES[tone]}`}>{children}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink2">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-ink3">{hint}</span> : null}
    </label>
  );
}

export const inputClass = "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft";

export function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 p-8 text-sm text-ink2" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
      {label}
    </div>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {sub ? <p className="mt-1 text-sm text-ink2">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}
