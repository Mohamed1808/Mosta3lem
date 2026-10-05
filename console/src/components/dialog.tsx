/**
 * Confirmation dialogs (with an optional reason or a choice) and short status messages,
 * shared by every console screen: const { ask, toast } = useDialog().
 */
"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { Button, Field, inputClass } from "@/components/ui";
import { useT } from "@/lib/app";

export type AskOptions = {
  title: string; message?: string; confirmLabel?: string; danger?: boolean;
  note?: "required" | "optional"; noteLabel?: string;
  options?: { value: string; label: string }[]; optionLabel?: string;
};
export type AskResult = { note: string; option: string | null } | null;
type Toast = { id: number; text: string; tone: "success" | "danger" };

const Ctx = createContext<{ ask: (o: AskOptions) => Promise<AskResult>; toast: (text: string, tone?: "success" | "danger") => void } | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState<AskOptions | null>(null);
  const [note, setNote] = useState("");
  const [option, setOption] = useState<string>("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const resolver = useRef<((r: AskResult) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const ask = useCallback((o: AskOptions) => new Promise<AskResult>((resolve) => {
    resolver.current = resolve;
    setNote(""); setOption(o.options && o.options[0] ? o.options[0].value : "");
    setOpen(o);
  }), []);
  const toast = useCallback((text: string, tone: "success" | "danger" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((l) => l.concat([{ id, text, tone }]));
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const finish = (ok: boolean) => {
    const r = resolver.current;
    resolver.current = null;
    setOpen(null);
    if (r) r(ok ? { note: note.trim(), option: option || null } : null);
  };
  const blocked = !!open && open.note === "required" && !note.trim();

  return (
    <Ctx.Provider value={{ ask, toast }}>
      {children}
      <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); finish(false); }}
        className="m-auto w-[min(92vw,30rem)] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40">
        {open ? (
          <form method="dialog" onSubmit={(e) => { e.preventDefault(); if (!blocked) finish(true); }} className="space-y-4 p-6">
            <h2 className="text-lg font-semibold">{open.title}</h2>
            {open.message ? <p className="text-sm text-ink2">{open.message}</p> : null}
            {open.options ? (
              <Field label={open.optionLabel || ""}>
                <select className={inputClass} value={option} onChange={(e) => setOption(e.target.value)}>
                  {open.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            ) : null}
            {open.note ? (
              <Field label={(open.noteLabel || t("common.note")) + (open.note === "required" ? " *" : "")}>
                <textarea className={`${inputClass} min-h-24`} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
              </Field>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button onClick={() => finish(false)}>{t("common.cancel")}</Button>
              <Button type="submit" kind={open.danger ? "danger" : "primary"} disabled={blocked}>{open.confirmLabel || t("common.confirm")}</Button>
            </div>
          </form>
        ) : null}
      </dialog>
      <div className="pointer-events-none fixed bottom-4 start-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 rtl:translate-x-1/2" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${x.tone === "danger" ? "bg-bad" : "bg-ink"}`}>{x.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useDialog() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDialog outside DialogProvider");
  return v;
}

/** Run a service call: a success message, or the error as a readable sentence. */
export function useAction() {
  const { toast } = useDialog();
  const t = useT();
  return useCallback(async (fn: () => Promise<unknown>, success?: string): Promise<boolean> => {
    try { await fn(); if (success) toast(success); return true; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (e: any) { toast(e && e.key ? t(e.key, e.params || {}) : t("errors.generic"), "danger"); return false; }
  }, [toast, t]);
}
