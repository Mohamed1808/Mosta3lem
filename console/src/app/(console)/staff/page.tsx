/**
 * Staff accounts (Super admin): add people, move them between teams, deactivate or
 * reactivate them and reset their sign-in. The platform always keeps an active Super
 * admin, and nobody changes their own team or deactivates themselves.
 */
"use client";

import { FormEvent, useState } from "react";

import { icm, services } from "@/backend/engine";
import { useAction, useDialog } from "@/components/dialog";
import { Badge, Button, Card, Field, inputClass, Loading, Notice, PageHead } from "@/components/ui";
import { errorText } from "@/lib/format";
import { useApp, useQuery, useT } from "@/lib/app";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export default function Staff() {
  const t = useT();
  const { can, session } = useApp();
  const { ask, toast } = useDialog();
  const run = useAction();
  const q = useQuery<Any[]>(() => (can("staff.manage") ? services().staff.list() : Promise.resolve([])));
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState({ name: "", email: "", role: "platform_ops" });
  const [busy, setBusy] = useState(false);
  if (!can("staff.manage")) return <Notice tone="warning">{t("errors.forbidden")}</Notice>;
  if (!q.data) return <Loading label={t("console.loading")} />;
  const roles: string[] = icm().wf.PLATFORM_ROLES;
  const now = icm().clock.now();
  const me = session?.user?.id;

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await services().staff.invite(v);
      toast(t("console.staff.added", { name: v.name }));
      setV({ name: "", email: "", role: "platform_ops" });
      setAdding(false);
    } catch (ex) { toast(errorText(ex), "danger"); } finally { setBusy(false); }
  };
  const changeRole = async (u: Any, role: string) => {
    if (role === u.role) return;
    if (await ask({ title: t("console.staff.changeTeam"), message: t("console.staff.changeTeamBody", { name: u.name, team: t("role." + role) }), confirmLabel: t("common.confirm") })) {
      await run(() => services().staff.setRole(u.id, role), t("console.staff.teamChanged"));
    }
  };
  const toggle = async (u: Any) => {
    if (u.active) {
      if (await ask({ title: t("users.deactivate"), message: t("console.staff.deactivateBody", { name: u.name }), danger: true, confirmLabel: t("users.deactivate") })) await run(() => services().staff.setActive(u.id, false), t("console.staff.deactivated"));
    } else await run(() => services().staff.setActive(u.id, true), t("console.staff.reactivated"));
  };
  const reset = async (u: Any) => {
    if (await ask({ title: t("console.accounts.reset"), message: t("console.accounts.resetBody", { name: u.name }), confirmLabel: t("console.accounts.reset") })) {
      await run(() => services().accounts.resetLogin(u.id), t("console.accounts.resetDone", { name: u.name }));
    }
  };

  return (
    <>
      <PageHead title={t("console.nav.staff")} sub={t("console.staff.sub")}
        right={!adding ? <Button kind="primary" onClick={() => setAdding(true)}>{t("console.staff.add")}</Button> : null} />
      {adding ? (
        <Card title={t("console.staff.add")} className="mb-4">
          <form onSubmit={invite} className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-end">
            <Field label={t("common.name")}><input className={inputClass} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
            <Field label={t("common.email")}><input className={`${inputClass} ltr`} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} placeholder="name@platform.example" required /></Field>
            <Field label={t("console.access.team")}>
              <select className={inputClass} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>{roles.map((r) => <option key={r} value={r}>{t("role." + r)}</option>)}</select>
            </Field>
            <div className="flex gap-2">
              <Button type="submit" kind="primary" busy={busy}>{t("console.staff.addShort")}</Button>
              <Button onClick={() => setAdding(false)}>{t("common.cancel")}</Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-ink2">{t("console.staff.inviteNote", { pw: icm().config.DEMO_PASSWORD })}</p>
        </Card>
      ) : null}
      <Card>
        <ul className="-m-5 divide-y divide-line">
          {q.data.map((u) => {
            const self = u.id === me;
            const locked = u.lockedUntil && u.lockedUntil > now;
            return (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{u.name}</span>
                    {self ? <Badge tone="info">{t("console.staff.you")}</Badge> : null}
                    {!u.active ? <Badge>{t("common.inactive")}</Badge> : null}
                    {u.invited ? <Badge tone="info">{t("users.invited")}</Badge> : null}
                    {locked ? <Badge tone="danger">{t("console.accounts.locked")}</Badge> : null}
                  </div>
                  <div className="text-xs text-ink2"><bdi dir="ltr">{u.email}</bdi></div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select className={`${inputClass} w-auto`} value={u.role} disabled={self || !u.active} onChange={(e) => changeRole(u, e.target.value)} aria-label={t("console.access.team")}>
                    {roles.map((r) => <option key={r} value={r}>{t("role." + r)}</option>)}
                  </select>
                  {!self && u.active ? <Button kind="ghost" onClick={() => reset(u)}>{t("console.accounts.reset")}</Button> : null}
                  {!self ? <Button kind={u.active ? "danger" : "secondary"} onClick={() => toggle(u)}>{u.active ? t("users.deactivate") : t("users.reactivate")}</Button> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
