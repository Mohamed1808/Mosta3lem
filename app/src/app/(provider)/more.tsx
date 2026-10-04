/** Account, language, notifications, demo controls and sign out. */
import Constants from 'expo-constants';
import { router } from 'expo-router';

import { services } from '@/backend/engine';
import { num } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { Avatar, Badge, Button, Card, Divider, Icon, KeyValue, ListItem, Row, Segmented, Stack, Txt, Grow } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function More() {
  const t = useT();
  const { session, lang, setLang, signOut } = useApp();
  const { ask } = useDialog();
  const run = useAction();
  const unread = useQuery<number>(() => services().notifications.unreadCount()).data || 0;
  const u = session?.user || {};
  const manager = ['provider_admin', 'provider_supervisor', 'freelancer'].indexOf(u.role) >= 0;
  const counts = useQuery<any>(async () => (manager ? { clients: (await services().ratings.clientPending()).length, nav: await services().analytics.navCounts(null) } : null), [manager]).data;
  return (
    <Screen title={t('tabs.more')}>
      <Card>
        <Row gap={12}>
          <Avatar name={u.name || ''} size={48} />
          <Grow>
            <Txt v="h3">{u.name}</Txt>
            <Txt v="sm" c="muted">{t('role.' + u.role)}</Txt>
          </Grow>
        </Row>
        <Divider />
        <Stack style={{ marginTop: 12 }}>
          <KeyValue rows={[
            [t('more.company'), session?.provider?.name || '-'],
            [t('more.phone'), <Txt key="p" v="sm" ltr>{u.phone || '-'}</Txt>],
          ]} />
        </Stack>
      </Card>
      <Card pad={false}>
        <ListItem left={<Icon name="bell" />} title={t('more.notifications')} right={unread ? <Badge label={String(unread)} tone="danger" /> : undefined} onPress={() => router.push('/notifications')} />
        {manager ? (
          <>
            <Divider />
            <ListItem left={<Icon name="star" />} title={t('nav.feedback')} onPress={() => router.push('/ratings')} />
            <Divider />
            <ListItem left={<Icon name="scale" />} title={t('dispute.title')} right={counts?.nav?.openDisputes ? <Badge label={num(counts.nav.openDisputes)} tone="warning" /> : undefined} onPress={() => router.push('/disputes')} />
            <Divider />
            <ListItem left={<Icon name="award" />} title={t('nav.rateClients')} right={counts?.clients ? <Badge label={num(counts.clients)} tone="pending" /> : undefined} onPress={() => router.push('/rate-clients')} />
          </>
        ) : null}
        {u.role === 'provider_admin' || u.role === 'freelancer' ? <><Divider /><ListItem left={<Icon name="settings" />} title={t('settingsApp.title')} sub={t('settingsApp.moreSub')} onPress={() => router.push('/settings')} /></> : null}
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
