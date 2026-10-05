/** Client account, language, notifications, demo controls and sign out. */
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { services } from '@/backend/engine';
import { useApp, useQuery, useT } from '@/state/app';
import { Avatar, Badge, Button, Card, Divider, Grow, Icon, KeyValue, ListItem, Row, Segmented, Stack, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function ClientMore() {
  const t = useT();
  const { session, lang, setLang, signOut } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const unread = useQuery<number>(() => services().notifications.unreadCount()).data || 0;
  const u = session?.user || {};
  const ent = session?.entity || {};
  return (
    <Screen title={t('tabs.more')}>
      <Card>
        <Row gap={12}>
          <Avatar name={u.name || ''} size={48} />
          <Grow>
            <Txt v="h3">{u.name}</Txt>
            <Txt v="sm" c="muted">{t('role.' + u.role)} · {t('roleHint.' + u.role)}</Txt>
          </Grow>
        </Row>
        <Divider />
        <Stack style={{ marginTop: 12 }}>
          <KeyValue rows={[
            [t('client.organisation'), ent.name || '-'],
            [t('client.type'), ent.type ? t('entityType.' + ent.type) : '-'],
            [t('more.email'), <Txt key="e" v="sm" ltr>{u.email || '-'}</Txt>],
          ]} />
        </Stack>
      </Card>
      <Card pad={false}>
        <ListItem left={<Icon name="bell" />} title={t('more.notifications')} right={unread ? <Badge label={String(unread)} tone="danger" /> : undefined} onPress={() => router.push('/notifications')} />
      </Card>
      <Card title={t('more.language')}>
        <Segmented items={[{ id: 'en', label: 'English' }, { id: 'ar', label: 'العربية' }]} value={lang} onChange={(l) => setLang(l as 'en' | 'ar')} />
      </Card>
      <Card title={t('more.demo')}>
        <Stack>
          <Txt v="sm" c="muted">{t('more.simulated')}</Txt>
          <Button label={t('more.resetDemo')} icon="refresh" onPress={async () => {
            if (await ask({ title: t('more.resetDemo'), message: t('more.resetBody'), danger: true, confirmLabel: t('more.resetDemo') })) {
              if (await run(() => services().demo.reset(), t('more.resetDone'))) { await signOut(); router.replace('/login'); }
            }
          }} />
        </Stack>
      </Card>
      <Button label={t('more.signOut')} kind="danger" icon="logout" onPress={async () => { await signOut(); router.replace('/login'); }} block />
      <Txt v="xs" c="faint" center>{t('app.name')} · {t('more.version', { v: Constants.expoConfig?.version || '0.1.0' })}</Txt>
    </Screen>
  );
}
