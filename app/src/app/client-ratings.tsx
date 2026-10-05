/**
 * The client's ratings: closed cases and batches waiting for a rating, and the ratings
 * already given (with the provider's reply and any dispute about them).
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { services } from '@/backend/engine';
import { RateCaseSheet } from '@/components/rateForm';
import { RatingBody } from '@/components/ratings';
import { date, num } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { Badge, Button, Card, Divider, Empty, ListItem, Loading, Segmented, Stack, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function ClientRatings() {
  const t = useT();
  const [tab, setTab] = useState('pending');
  const [rating, setRating] = useState<any>(null);
  const q = useQuery<any>(async () => ({ pending: await services().ratings.pending(), given: await services().ratings.given() }));
  const d = q.data;
  return (
    <Screen title={t('nav.ratings')} sub={t('ratings.entitySubtitle')} back>
      <Segmented items={[{ id: 'pending', label: t('ratings.pending') + (d ? ' (' + num(d.pending.count) + ')' : '') }, { id: 'given', label: t('ratings.given') + (d ? ' (' + num(d.given.length) + ')' : '') }]} value={tab} onChange={setTab} />
      {!d ? <Loading /> : tab === 'pending' ? (
        !d.pending.count ? <Empty text={t('ratings.nonePending')} icon="star" /> : (
          <Stack>
            {d.pending.cases.length ? (
              <Card title={t('ratings.pendingCases')} pad={false}>
                {d.pending.cases.map((c: any, i: number) => (
                  <View key={c.id}>
                    {i ? <Divider /> : null}
                    <ListItem chevron={false} title={c.providerName} sub={c.ref + ' · ' + t('service.' + c.service) + ' · ' + t('ratings.closedOn') + ' ' + date(c.closedAt)}
                      right={<Button small kind="primary" icon="star" label={t('ratings.rateNow')} onPress={() => setRating(c)} />} />
                  </View>
                ))}
              </Card>
            ) : null}
            {d.pending.batches.length ? (
              <Card title={t('ratings.pendingBatches')} pad={false}>
                {d.pending.batches.map((b: any, i: number) => (
                  <View key={b.id}>
                    {i ? <Divider /> : null}
                    <ListItem title={b.ref + (b.name ? ' · ' + b.name : '')} sub={t('service.' + b.service) + ' · ' + t('client.casesN', { n: num(b.caseIds.length) })}
                      onPress={() => router.push({ pathname: '/rate-batch/[id]', params: { id: b.id } })} />
                  </View>
                ))}
              </Card>
            ) : null}
          </Stack>
        )
      ) : !d.given.length ? <Empty text={t('ratings.noneGiven')} icon="star" /> : (
        <Stack>
          {d.given.map((r: any) => (
            <Card key={r.id}>
              <Stack gap={8}>
                <Txt b>{r.providerName}</Txt>
                <Txt v="xs" c="muted">{t('service.' + r.service)}{r.caseRef ? ' · ' + r.caseRef : ''}</Txt>
                {r.batchId ? <Badge label={t('ratings.batchRating')} /> : null}
                <RatingBody r={r} />
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
      {rating ? <RateCaseSheet c={rating} providerName={rating.providerName} onClose={() => setRating(null)} /> : null}
    </Screen>
  );
}
