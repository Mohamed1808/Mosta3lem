/**
 * Choose a password, from the link in an invitation or reset email
 * (/set-password?token=...). The server checks the link and the password rules; a link
 * works once. The same page serves organisation users, whose emails point here too.
 */
"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { icm, remoteMode } from "@/backend/engine";
import { Button, Field, inputClass, Loading, Notice } from "@/components/ui";
import { useApp, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function SetPassword() {
  const t = useT();
  const { ready, error, lang, setLang } = useApp();
  // Read on the client (this page renders there); the first render shows "Loading" either way.
  const [token] = useState<string | null>(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("token") || ""));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (password !== confirm) { setErr(t("console.setPw.mismatch")); return; }
    setErr(""); setBusy(true);
    try {
      await icm().remote.session.setPassword(token, password);
      setDone(true);
      setPassword(""); setConfirm("");
      // Drop the used token from the address bar and history.
      window.history.replaceState(null, "", "/set-password");
    } catch (e) {
      const x = e as Any;
      setErr(x && x.key ? t(x.key, x.params || {}) : t("errors.generic"));
    } finally { setBusy(false); }
  };

  if (error) return <main className="p-8"><Notice tone="danger">{error}</Notice></main>;
  if (!ready || token === null) return <Loading label="Loading" />;
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12 sm:items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{t("console.name")}</div>
          <button type="button" onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="text-sm font-medium text-accent">{t("console.language")}</button>
        </div>
        <div className="space-y-4 rounded-xl border border-line bg-surface p-6">
          <h1 className="text-xl font-semibold">{t("console.setPw.title")}</h1>
          {!remoteMode() ? <Notice>{t("console.setPw.needsServer")}</Notice>
            : done ? (
              <>
                <Notice tone="success">{t("console.setPw.done")}</Notice>
                <Link href="/login" className="block text-center text-sm font-medium text-accent hover:underline">{t("console.setPw.toLogin")}</Link>
              </>
            ) : !token ? <Notice tone="danger">{t("console.setPw.noToken")}</Notice> : (
              <form onSubmit={submit} className="space-y-4">
                <p className="text-sm text-ink2">{t("console.setPw.body")}</p>
                <Field label={t("console.setPw.password")}>
                  <div className="flex gap-2">
                    <input className={`${inputClass} ltr`} type={show ? "text" : "password"} autoComplete="new-password" value={password}
                      onChange={(e) => { setPassword(e.target.value); setErr(""); }} minLength={10} required />
                    <button type="button" onClick={() => setShow(!show)} className="px-2 text-sm font-medium text-accent">{show ? t("console.hide") : t("console.show")}</button>
                  </div>
                </Field>
                <Field label={t("console.setPw.confirm")}>
                  <input className={`${inputClass} ltr`} type={show ? "text" : "password"} autoComplete="new-password" value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setErr(""); }} required />
                </Field>
                {err ? <Notice tone="danger">{err}</Notice> : null}
                <Button type="submit" kind="primary" busy={busy} disabled={!password || !confirm} full>{t("console.setPw.save")}</Button>
              </form>
            )}
        </div>
      </div>
    </main>
  );
}
