/**
 * One batch: progress, choosing providers for its open cases, the offers sent, accepting
 * all delivered reports at once, and its cases. Closing a batch with ratings comes with
 * the ratings step.
 */
import { router, useLocalSearchParams } from 'expo-router';

import { services } from '@/backend/engine';
import { AssignPanel, ProgressBar } from '@/components/batch';
import { CaseList } from '@/components/case';
import { dateTime, duration, gov, num } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { Badge, Button, Card, Divider, ListItem, Loading, Notice, Row, Stack, StatusBadge, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function BatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const q = useQuery<any>(async () => {
    const b: any = await services().batches.get(id);
    const plan = b.assignable && !b.closedAt ? await services().batches.plan(b.id) : null;
    const window = (await services().config.get()).pricing.offerWindowHours;
    return { b, plan, window };
  }, [id]);
  if (!q.data) return <Screen title={t('nav.batches')} back>{q.error ? <Notice tone="danger" text={t(q.error.key || 'errors.generic')} /> : <Loading />}</Screen>;
  const { b, plan } = q.data;
  return (
    <Screen title={b.ref} sub={b.name || undefined} back>
      <Row wrap gap={6}>
        <Badge label={t('service.' + b.service)} tone={b.service === 'investigation' ? 'accent' : 'pending'} />
        <StatusBadge status={b.status} />
        {b.needsRating ? <Badge label={t('batch.ratingPending')} tone="warning" /> : null}
      </Row>
      <Card>
        <Stack gap={8}>
          <Row between><Txt v="sm" c="muted">{t('batch.createdOn', { date: dateTime(b.createdAt) })}</Txt><Txt v="sm" b>{t('batch.closedOf', { closed: num(b.progress.closed), total: num(b.progress.total) })}</Txt></Row>
          <ProgressBar pct={b.progress.pct} />
          <Row wrap gap={6}>{Object.keys(b.counts).map((s) => <Badge key={s} label={t('status.' + s) + ' · ' + num(b.counts[s].length)} tone="muted" />)}</Row>
        </Stack>
      </Card>
      {b.needsRating ? <Notice tone="warning" icon="star" text={t('batch.needsRatingNotice') + ' ' + t('client.rateBatchNext')} /> : null}
      {b.delivered ? (
        <Button kind="primary" icon="check" block label={t('batch.acceptAll', { n: num(b.delivered) })} onPress={async () => {
          if (await ask({ title: t('batch.acceptAllTitle'), message: t('batch.acceptAllBody'), confirmLabel: t('action.accept_report') })) {
            await run(async () => { const r: any = await services().batches.acceptAllDelivered(b.id); return r; }, t('client.reportsAccepted'));
          }
        }} />
      ) : null}
      {plan ? <AssignPanel key={b.assignable} plan={plan} windowHours={q.data.window} /> : null}
      {b.offers.length ? (
        <Card title={t('batch.offers')} pad={false}>
          {b.offers.map((o: any, i: number) => (
            <Stack key={o.id} gap={0}>
              {i ? <Divider /> : null}
              <ListItem chevron={false} title={o.providerName}
                sub={(o.groupKey && o.groupKey !== 'all' ? gov(o.groupKey) : t('batch.wholeBatch')) + ' · ' + t('client.casesN', { n: num(o.caseIds.length) }) + ' · ' +
                  (o.status === 'pending' ? t('offers.expiresIn', { time: duration(Math.max(0, o.remaining)) }) : dateTime(o.respondedAt))}
                right={<StatusBadge status={o.status === 'accepted' ? 'accepted_offer' : o.status} />} />
            </Stack>
          ))}
        </Card>
      ) : null}
      <Stack gap={8}>
        <Txt v="h3">{t('batch.casesTitle', { n: num(b.cases.length) })}</Txt>
        <CaseList rows={b.cases} showAgent={false} empty={t('cases.none')} onOpen={(c) => router.push({ pathname: '/case/[id]', params: { id: c.id } })} />
      </Stack>
    </Screen>
  );
}
