/**
 * The organisation's users (Admin only): who can use the platform, their role and what it
 * gives access to. The Admin invites people, changes roles and deactivates or reactivates
 * them. The last active Admin cannot be demoted, and nobody can deactivate themselves.
 */
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { errorText } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Avatar, Badge, Button, Card, Divider, Grow, Icon, ListItem, Loading, Notice, Row, Stack, Txt, useDir } from '@/ui/core';
import { inputStyle, Sheet, useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

const ROLES = ['entity_admin', 'entity_operations', 'entity_credit', 'entity_collections'];

export default function OrgUsers() {
  const t = useT();
  const { session } = useApp();
  const admin = session?.user?.role === 'entity_admin';
  const q = useQuery<any[]>(() => (admin ? services().entities.users() : Promise.resolve([])), [admin]);
  const [open, setOpen] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  if (!admin) return <Screen title={t('nav.users')} back><Notice tone="info" icon="lock" text={t('client.usersAdminOnly')} /></Screen>;
  const users = (q.data || []).slice().sort((a, b) => (a.active === false ? 1 : 0) - (b.active === false ? 1 : 0) || ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
  const sel = open ? users.find((u) => u.id === open) : null;
  return (
    <Screen title={t('nav.users')} sub={t('users.subtitle')} back
      right={<Button small kind="primary" icon="plus" label={t('users.invite')} onPress={() => setInviting(true)} />}>
      {q.loading && !q.data ? <Loading /> : (
        <Card pad={false}>
          {users.map((u, i) => (
            <View key={u.id}>
              {i ? <Divider /> : null}
              <ListItem left={<Avatar name={u.name} />} onPress={u.id === session?.user?.id ? undefined : () => setOpen(u.id)} chevron={u.id !== session?.user?.id}
                title={<Row wrap gap={6}><Txt b>{u.name}</Txt>{u.id === session?.user?.id ? <Badge label={t('client.you')} /> : null}{u.invited ? <Badge label={t('users.invited')} tone="info" /> : null}{u.active === false ? <Badge label={t('common.inactive')} tone="muted" /> : null}</Row>}
                sub={<Stack gap={2} style={{ marginTop: 2 }}><Txt v="xs" c="muted" ltr>{u.email || '-'}</Txt><Txt v="xs" c="faint">{t('role.' + u.role)} · {t('roleHint.' + u.role)}</Txt></Stack>} />
            </View>
          ))}
        </Card>
      )}
      {sel ? <UserSheet u={sel} onClose={() => setOpen(null)} /> : null}
      {inviting ? <InviteSheet onClose={() => setInviting(false)} /> : null}
    </Screen>
  );
}

function RolePicker({ value, onChange }: { value: string; onChange: (r: string) => void }) {
  const t = useT();
  return (
    <Stack gap={8}>
      {ROLES.map((r) => {
        const on = value === r;
        return (
          <Pressable key={r} onPress={() => onChange(r)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={t('role.' + r)}
            style={{ padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : colors.surface }}>
            <Row gap={10}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? colors.accent : colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} /> : null}
              </View>
              <Grow>
                <Txt b={on}>{t('role.' + r)}</Txt>
                <Txt v="xs" c="muted">{t('client.roleAccess.' + r)}</Txt>
              </Grow>
            </Row>
          </Pressable>
        );
      })}
    </Stack>
  );
}

function UserSheet({ u, onClose }: { u: any; onClose: () => void }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const [role, setRole] = useState(u.role);
  const save = async () => {
    if (role !== u.role && await run(() => services().entities.setRole(u.id, role), t('users.roleChanged'))) onClose();
  };
  const toggle = async () => {
    if (u.active === false) { if (await run(() => services().entities.setActive(u.id, true), t('client.reactivated'))) onClose(); return; }
    if (await ask({ title: t('users.deactivate'), message: t('users.deactivateBody'), danger: true, confirmLabel: t('users.deactivate') })) {
      if (await run(() => services().entities.setActive(u.id, false), t('client.deactivated'))) onClose();
    }
  };
  return (
    <Sheet visible title={u.name} onClose={onClose}
      footer={<Button kind="primary" block label={t('client.saveRole')} onPress={save} disabled={role === u.role} />}>
      <Stack gap={12}>
        <Row gap={8}><Icon name="message" size={16} /><Txt v="sm" ltr>{u.email || '-'}</Txt></Row>
        <Txt v="sm" b c="muted">{t('common.role')}</Txt>
        <RolePicker value={role} onChange={setRole} />
        <Button kind={u.active === false ? 'secondary' : 'danger'} icon={u.active === false ? 'refresh' : 'x'} label={u.active === false ? t('users.reactivate') : t('users.deactivate')} onPress={toggle} />
      </Stack>
    </Sheet>
  );
}

function InviteSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const d = useDir();
  const { toast } = useDialog();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('entity_credit');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await services().entities.invite({ name: name.trim(), email: email.trim().toLowerCase(), role });
      toast(t('users.invitedToast', { email: email.trim() }));
      onClose();
    } catch (e) { toast(errorText(e), 'danger'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible title={t('users.invite')} onClose={onClose}
      footer={<Button kind="primary" icon="send" block label={t('users.sendInvite')} onPress={send} busy={busy} disabled={!name.trim() || !email.trim()} />}>
      <Stack gap={10}>
        <Txt v="sm" b c="muted">{t('common.name')} *</Txt>
        <TextInput value={name} onChangeText={setName} style={[inputStyle, { textAlign: d.align }]} accessibilityLabel={t('common.name')} />
        <Txt v="sm" b c="muted">{t('common.email')} *</Txt>
        <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="name@company.com"
          style={[inputStyle, { textAlign: 'left', writingDirection: 'ltr' }]} accessibilityLabel={t('common.email')} />
        <Txt v="sm" b c="muted">{t('common.role')}</Txt>
        <RolePicker value={role} onChange={setRole} />
        <Txt v="xs" c="faint">{t('client.inviteNote', { pw: icm().config.DEMO_PASSWORD })}</Txt>
      </Stack>
    </Sheet>
  );
}
