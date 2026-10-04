/** Signal and sync status for field workers: shown when offline or when work waits to be sent. */
import { router } from 'expo-router';

import { useT } from '@/state/app';
import { useOffline } from '@/sync/offline';
import { colors } from '@/theme';
import { Button, Notice, Row, Stack, Txt } from '@/ui/core';

export function SyncCard() {
  const t = useT();
  const off = useOffline();
  const pending = off.outbox.filter((o) => o.status === 'pending').length;
  const failed = off.outbox.filter((o) => o.status === 'failed').length;
  if (off.online && !pending && !failed) return null;
  const tone = failed ? 'danger' : !off.online ? 'warning' : 'info';
  return (
    <Notice tone={tone} icon={off.online ? 'refresh' : 'alert'}>
      <Stack gap={8}>
        <Txt v="sm" b style={{ color: failed ? colors.bad : undefined }}>
          {!off.online ? t('offline.homeOffline') : failed ? t('offline.failedN', { n: failed }) : t('offline.waitingN', { n: pending })}
        </Txt>
        {!off.online ? <Txt v="xs">{t('offline.homeOfflineBody', { n: pending })}</Txt> : null}
        <Row gap={8} wrap>
          <Button small label={t('offline.open')} onPress={() => router.push('/sync')} />
          {off.online && pending ? <Button small kind="primary" label={t('offline.syncNow')} busy={off.syncing} onPress={() => off.sync()} /> : null}
        </Row>
      </Stack>
    </Notice>
  );
}
