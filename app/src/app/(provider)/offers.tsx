/** Offers inbox: accept or decline work. Customer details stay hidden until acceptance. */
import { useState } from 'react';
import { View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { priceText } from '@/components/case';
import { bucket, dateTime, duration, gov, money, types } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { space } from '@/theme';
import { Badge, Button, Card, Chips, Divider, Empty, Grow, Loading, Notice, Row, Stack, StatusBadge, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function Offers() {
  const t = useT();
  const { service } = useApp();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const q = useQuery<any[]>(() => services().offers.inbox(service), [service]);
  const list = q.data || [];
  const pending = list.filter((o) => o.status === 'pending');
  const history = list.filter((o) => o.status !== 'pending');
  const shown = tab === 'pending' ? pending : history;
  return (
    <Screen title={t('nav.offers')} sub={t('offers.subtitle', { hours: icm().store.db.config.pricing.offerWindowHours })} pad={false}>
      <View style={{ paddingTop: space.lg }}>
        <Chips items={[{ id: 'pending', label: t('offers.pending'), count: pending.length }, { id: 'history', label: t('offers.history'), count: history.length }]} value={tab} onChange={setTab} />
      </View>
      <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
        {q.loading && !q.data ? <Loading /> : shown.length ? shown.map((o) => <OfferCard key={o.id} o={o} />) : <Card><Empty text={tab === 'pending' ? t('offers.nonePending') : t('offers.noneHistory')} /></Card>}
      </View>
    </Screen>
  );
}

function OfferCard({ o }: { o: any }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const inv = o.service === 'investigation';
  const pending = o.status === 'pending';
  const n = o.cases.length;
  const accept = async () => {
    const ok = await ask({ title: t('offers.acceptTitle'), message: t('offers.acceptBody', { n }), confirmLabel: t('action.accept') });
    if (ok) await run(() => services().offers.accept(o.id), t('offers.accepted'));
  };
  const decline = async () => {
    const reasons = (icm().store.db.config.lists.declineReasons || []).map((r: any) => ({ value: r.id, label: icm().util.label(r) }));
    const v = await ask({ title: t('offers.declineTitle'), message: t('offers.declineBody'), danger: true, confirmLabel: t('action.decline'), options: reasons, optionLabel: t('common.reason'), note: 'optional' });
    if (v) await run(() => services().offers.decline(o.id, v.option, v.note), t('offers.declined'));
  };
  const remaining = o.remaining;
  return (
    <Card title={o.batch ? t('offers.batchOffer', { ref: o.batch.ref, n }) : t('offers.caseOffer', { ref: o.ref })}
      right={pending ? <Badge label={remaining > 0 ? t('offers.expiresIn', { time: duration(remaining) }) : t('offers.expired')} tone={remaining < 3600e3 ? 'danger' : remaining < 7200e3 ? 'warning' : 'info'} /> : <StatusBadge status={o.status === 'accepted' ? 'accepted_offer' : o.status} />}>
      <Stack>
        <Row wrap gap={6}><Txt v="sm" c="muted">{t('offers.from')}</Txt><Txt v="sm" b>{o.entity.name}</Txt><Badge label={t('service.' + o.service)} tone={inv ? 'accent' : 'pending'} /></Row>
        {o.entity.clientRating && o.entity.clientRating.count ? (
          <Txt v="xs" c="muted">{t('clientRating.dataQuality')}: {o.entity.clientRating.dataQuality} · {t('clientRating.paymentTimeliness')}: {o.entity.clientRating.paymentTimeliness}</Txt>
        ) : null}
        {pending ? <Notice tone="info" icon="lock" text={t('offers.maskedNotice')} /> : null}
        <Stack gap={0}>
          {o.cases.map((c: any, i: number) => (
            <View key={c.id}>
              {i ? <Divider /> : null}
              <Row between center={false} style={{ paddingVertical: 10 }} gap={10}>
                <Grow>
                  <Txt v="sm" mono b>{c.ref}</Txt>
                  <Txt v="xs" c="muted">{gov(c.governorate)} · {inv ? types(c.inquiryTypes) : bucket(c.bucket)}{!inv && c.amountRange ? ' · ' + t('amountRange.' + c.amountRange) : ''}</Txt>
                  <Txt v="xs" c="faint">{t('case.deadline')}: {dateTime(c.deadline || c.periodEnd || c.dueAt)}</Txt>
                </Grow>
                <Txt v="sm" b>{priceText(c, t)}</Txt>
              </Row>
            </View>
          ))}
        </Stack>
        {inv && n > 1 ? <Row between><Txt v="sm" c="muted">{t('offers.total')}</Txt><Txt b>{money(o.total)}</Txt></Row> : null}
        {o.status === 'declined' && o.declineReason ? <Txt v="xs" c="muted">{t('offers.declinedWith', { reason: icm().util.label((icm().store.db.config.lists.declineReasons || []).find((r: any) => r.id === o.declineReason) || { en: o.declineReason, ar: o.declineReason }) })}</Txt> : null}
        {pending ? (
          <Row gap={10}>
            <Grow><Button label={t('action.decline')} kind="danger" onPress={decline} block /></Grow>
            <Grow><Button label={t('action.accept') + (n > 1 ? ' ' + t('offers.all', { n }) : '')} kind="primary" icon="check" onPress={accept} block /></Grow>
          </Row>
        ) : null}
      </Stack>
    </Card>
  );
}
