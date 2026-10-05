/** The client's batches (cases created together from one file), newest first. */
import { router } from 'expo-router';
import { View } from 'react-native';

import { services } from '@/backend/engine';
import { ProgressBar } from '@/components/batch';
import { date, num } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { Badge, Button, Card, Divider, Empty, ListItem, Loading, Row, Stack, StatusBadge, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function Batches() {
  const t = useT();
  const q = useQuery<any[]>(() => services().batches.list());
  const rows = q.data || [];
  return (
    <Screen title={t('nav.batches')} sub={t('batch.subtitle')} back
      right={<Button small kind="primary" icon="upload" label={t('client.upload')} onPress={() => router.push('/bulk')} />}>
      {q.loading && !q.data ? <Loading /> : !rows.length ? <Empty text={t('batch.none')} icon="layers" /> : (
        <Card pad={false}>
          {rows.map((b, i) => (
            <View key={b.id}>
              {i ? <Divider /> : null}
              <ListItem onPress={() => router.push({ pathname: '/batch/[id]', params: { id: b.id } })}
                title={<Row between><Txt mono b v="sm">{b.ref}</Txt><StatusBadge status={b.status} /></Row>}
                sub={<Stack gap={6} style={{ marginTop: 4 }}>
                  <Txt numberOfLines={1}>{b.name || '-'}</Txt>
                  <Txt v="xs" c="muted">{t('service.' + b.service)} · {date(b.createdAt)} · {t('batch.closedOf', { closed: num(b.progress.closed), total: num(b.progress.total) })}</Txt>
                  <ProgressBar pct={b.progress.pct} />
                  {b.needsRating ? <Row><Badge label={t('batch.ratingPending')} tone="warning" /></Row> : null}
                </Stack>} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
