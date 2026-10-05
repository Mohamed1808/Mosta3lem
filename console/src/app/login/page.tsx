/**
 * Staff sign-in: work email and password, then a one-time code. No email provider is
 * chosen yet, so the code is generated in the browser and shown in a demo notice.
 * Organisations and service providers are turned away: they use the mobile app.
 */
"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { icm, services } from "@/backend/engine";
import { Button, Field, inputClass, Loading, Notice } from "@/components/ui";
import { useApp, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const newCode = () => String(Math.floor(100000 + Math.random() * 900000));

export default function Login() {
  const t = useT();
  const router = useRouter();
  const { ready, session, signIn, lang, setLang } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState<"start" | "code">("start");
  const [pending, setPending] = useState<{ userId: string; masked: string; code: string } | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [staff, setStaff] = useState<Any[]>([]);

  useEffect(() => { if (ready && session) router.replace("/"); }, [ready, session, router]);
  useEffect(() => {
    if (!ready) return;
    services().auth.listDemoUsers().then((users: Any[]) => setStaff(users.filter((u) => u.portal === "admin")));
  }, [ready]);

  const errorText = (e: Any) => (e && e.key ? t(e.key, e.params || {}) : t("errors.generic"));

  const submitPassword = async (ev: FormEvent) => {
    ev.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r: Any = await services().auth.checkPassword(email, password);
      const u = staff.find((x) => x.id === r.userId);
      if (!u) { setErr(t("console.staffOnly")); return; }
      setPassword("");
      setPending({ userId: r.userId, masked: r.maskedEmail, code: newCode() });
      setCode(""); setStep("code");
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  const submitCode = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!pending || code.replace(/\D/g, "") !== pending.code) { setErr(t("console.wrongCode")); return; }
    setBusy(true);
    try { await signIn(pending.userId); router.replace("/"); } finally { setBusy(false); }
  };

  if (!ready) return <Loading label="Loading" />;
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12 sm:items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-semibold text-white">{lang === "ar" ? "م" : "M"}</div>
            <div>
              <div className="text-lg font-semibold">{t("console.name")}</div>
              <div className="text-xs text-ink2">{t("console.tagline")}</div>
            </div>
          </div>
          <button type="button" onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="text-sm font-medium text-accent">{t("console.language")}</button>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6">
          {step === "start" ? (
            <form onSubmit={submitPassword} className="space-y-4">
              <h1 className="text-xl font-semibold">{t("console.signIn")}</h1>
              <Field label={t("console.email")}>
                <input className={`${inputClass} ltr`} type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="name@platform.example" required />
              </Field>
              <Field label={t("console.password")}>
                <div className="flex gap-2">
                  <input className={`${inputClass} ltr`} type={showPw ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} required />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="px-2 text-sm font-medium text-accent">{showPw ? t("console.hide") : t("console.show")}</button>
                </div>
              </Field>
              {err ? <Notice tone="danger">{err}</Notice> : null}
              <Notice>{t("console.demoPassword", { pw: icm().config.DEMO_PASSWORD })}</Notice>
              <Button type="submit" kind="primary" busy={busy} disabled={!email || !password} full>{t("console.continue")}</Button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="space-y-4">
              <h1 className="text-xl font-semibold">{t("console.codeTitle")}</h1>
              <p className="text-sm text-ink2">{t("console.codeSent", { email: pending?.masked })}</p>
              <Notice>{t("console.demoCode", { code: pending?.code })}</Notice>
              <input className={`${inputClass} ltr text-center text-2xl tracking-[0.5em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setErr(""); }} aria-label={t("console.codeTitle")} autoFocus />
              {err ? <Notice tone="danger">{err}</Notice> : null}
              <Button type="submit" kind="primary" busy={busy} disabled={code.length !== 6} full>{t("console.verify")}</Button>
              <Button kind="ghost" onClick={() => { setStep("start"); setErr(""); }} full>{t("console.back")}</Button>
            </form>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface">
          <div className="border-b border-line px-5 py-3">
            <div className="text-sm font-semibold">{t("console.demoAccounts")}</div>
            <div className="text-xs text-ink2">{t("console.demoHint")}</div>
          </div>
          <ul className="divide-y divide-line">
            {staff.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={async () => { await signIn(u.id); router.replace("/"); }}
                  className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-start hover:bg-surface2">
                  <span className="text-sm font-medium">{u.name}</span>
                  <span className="text-xs text-ink2">{t("role." + u.role)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
