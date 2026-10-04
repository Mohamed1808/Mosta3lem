/**
 * Work saved on the phone: what is waiting to be sent, what the server refused (with the
 * reason, to retry or drop), and the cases kept on the phone for working without signal.
 */
import { View } from 'react-native';

import { dateTime } from '@/lib/format';
import { useT } from '@/state/app';
import { useOffline } from '@/sync/offline';
import { colors, radius, space } from '@/theme';
import { Badge, Button, Card, Divider, Empty, ListItem, Notice, Row, Stack, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function Sync() {
  const t = useT();
  const off = useOffline();
  const { ask } = useDialog();
  const run = useAction();
  const pending = off.outbox.filter((o) => o.status === 'pending');
  const failed = off.outbox.filter((o) => o.status === 'failed');
  const saved = Object.values(off.cases);
  return (
    <Screen title={t('offline.syncTitle')} back>
      <Notice tone={off.online ? 'success' : 'warning'} icon={off.online ? 'check' : 'alert'}
        text={off.online ? t('offline.onlineNow') : off.demoOffline ? t('offline.demoOfflineNow') : t('offline.offlineNow')} />
      <Row wrap gap={8}>
        <Button small kind="primary" icon="refresh" label={t('offline.syncNow')} disabled={!off.online || !pending.length} busy={off.syncing} onPress={() => run(() => off.sync())} />
        <Button small icon="download" label={t('offline.saveCases')} disabled={!off.online} onPress={() => run(async () => { await off.saveForOffline(); }, t('offline.casesSaved'))} />
      </Row>
      {off.lastSync ? <Txt v="xs" c="faint">{t('offline.lastSync', { time: dateTime(off.lastSync) })}</Txt> : null}

      <Card title={t('offline.waitingTitle', { n: pending.length })} pad={false}>
        {pending.length ? pending.map((o, i) => (
          <View key={o.id}>
            {i ? <Divider /> : null}
            <ListItem chevron={false} title={t('offline.op.' + o.kind)} sub={o.caseRef + ' · ' + dateTime(o.at)} right={<Badge label={t('offline.notSentYet')} tone="pending" />} />
          </View>
        )) : <View style={{ padding: space.lg }}><Txt v="sm" c="faint">{t('offline.nothingWaiting')}</Txt></View>}
      </Card>

      {failed.length ? (
        <Card title={t('offline.failedTitle', { n: failed.length })} pad={false}>
          {failed.map((o, i) => (
            <View key={o.id}>
              {i ? <Divider /> : null}
              <Stack gap={8} style={{ padding: space.md }}>
                <Txt b>{t('offline.op.' + o.kind)} · <Txt v="sm" c="muted">{o.caseRef}</Txt></Txt>
                <View style={{ backgroundColor: '#FDF0EE', borderRadius: radius.sm, padding: 8 }}><Txt v="sm" style={{ color: colors.bad }}>{o.error}</Txt></View>
                <Row gap={8} wrap>
                  <Button small label={t('offline.retry')} icon="refresh" onPress={async () => { await off.retry(o.id); if (off.online) await off.sync(); }} />
                  <Button small kind="danger" label={t('offline.discard')} onPress={async () => {
                    if (await ask({ title: t('offline.discard'), message: t('offline.discardBody'), danger: true, confirmLabel: t('offline.discard') })) await off.discard(o.id);
                  }} />
                </Row>
              </Stack>
            </View>
          ))}
        </Card>
      ) : null}

      <Card title={t('offline.savedTitle', { n: saved.length })} pad={false}>
        {saved.length ? saved.map((d: any, i: number) => (
          <View key={d.case.id}>
            {i ? <Divider /> : null}
            <ListItem chevron={false} title={d.case.ref} sub={(d.case.customer && d.case.customer.name) || ''} right={<Badge label={t('status.' + d.case.status)} tone="neutral" />} />
          </View>
        )) : <Empty text={t('offline.noneSaved')} icon="download" />}
      </Card>
      <Txt v="xs" c="faint">{t('offline.explain')}</Txt>
    </Screen>
  );
}
