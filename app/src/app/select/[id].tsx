/**
 * Choose the provider for a case: the providers that cover the case's governorate and
 * city, have spare capacity and valid documents, ranked by the platform (score,
 * availability, standing). The client can sort the list or send to the best match.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { services } from '@/backend/engine';
import { bucket, money, num, pct, placeText, types } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { colors, space } from '@/theme';
import { Badge, Button, Card, Chips, Grow, Loading, Notice, Row, Stack, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

const SELECTABLE = ['draft', 'submitted', 'declined', 'expired'];
const AVAIL: Record<string, number> = { high: 0, medium: 1, low: 2 };
const AVAIL_TONE: Record<string, any> = { high: 'success', medium: 'warning', low: 'danger' };

function sorted(list: any[], sort: string) {
  const l = list.slice();
  if (sort === 'price') return l.sort((a, b) => a.price - b.price);
  if (sort === 'score') return l.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  if (sort === 'availability') return l.sort((a, b) => AVAIL[a.availability] - AVAIL[b.availability] || b.rank - a.rank);
  if (sort === 'sla') return l.sort((a, b) => a.slaHours - b.slaHours);
  return l;
}

export default function SelectProvider() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const [sort, setSort] = useState('rank');
  const q = useQuery<any>(async () => {
    const d: any = await services().cases.get(id);
    const c = d.case;
    d.market = await services().marketplace.eligible({ service: c.service, demand: { [c.governorate]: 1 }, inquiryTypes: c.inquiryTypes, bucket: c.bucket, caseId: c.id });
    d.window = (await services().config.get()).pricing.offerWindowHours;
    return d;
  }, [id]);
  if (!q.data) return <Screen title={t('select.title')} back>{q.error ? <Notice tone="danger" text={t(q.error.key || 'errors.generic')} /> : <Loading />}</Screen>;
  const c = q.data.case, market = q.data.market;
  const priceOf = (p: any) => (c.service === 'investigation' ? money(p.price) : t('select.feeText', { pct: p.feePct, fixed: money(p.fixedFee) }));
  const send = async (p: any) => {
    const ok = await ask({ title: t('select.confirmTitle'), message: t('select.confirmBody', { name: p.name, price: priceOf(p), hours: q.data.window }), confirmLabel: t('select.sendOffer') });
    if (ok && await run(() => services().cases.sendOffer(c.id, p.id), t('select.offerSent', { name: p.name }))) {
      // Back to the case it was opened from, or on to the case after a new request.
      if (from === 'case') router.back(); else router.replace({ pathname: '/case/[id]', params: { id: c.id } });
    }
  };
  const what = c.service === 'investigation' ? types(c.inquiryTypes) : bucket(c.bucket);
  const sub = c.ref + ' · ' + what + ' · ' + placeText(c.place, c.governorate);
  if (SELECTABLE.indexOf(c.status) < 0) {
    return (
      <Screen title={t('select.title')} sub={sub} back>
        <Notice tone="warning" text={t('select.notSelectable', { status: t('status.' + c.status) })} />
      </Screen>
    );
  }
  const list = sorted(market.providers, sort);
  const best = market.providers[0];
  const ex = market.excluded || {};
  const hidden = [ex.full ? t('select.hiddenFull', { n: ex.full }) : '', ex.suspended ? t('select.hiddenSuspended', { n: ex.suspended }) : '', ex.documents ? t('select.hiddenDocuments', { n: ex.documents }) : ''].filter(Boolean);
  return (
    <Screen title={t('select.title')} sub={sub} back pad={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md }}>
        {c.status === 'declined' ? <Notice tone="warning" text={t('select.afterDecline')} /> : c.status === 'expired' ? <Notice tone="warning" text={t('select.afterExpiry')} /> : null}
        {best ? <Button kind="primary" icon="zap" block label={t('client.sendBest', { name: best.name })} onPress={() => send(best)} /> : null}
        <Txt v="sm" c="muted">{[t('select.eligibleCount', { n: market.providers.length })].concat(hidden).join(' · ')}</Txt>
      </View>
      <Chips items={['rank', 'price', 'score', 'availability', 'sla'].map((s) => ({ id: s, label: t('select.sort.' + s) }))} value={sort} onChange={setSort} />
      <Stack style={{ paddingHorizontal: space.lg }}>
        {!list.length ? <Notice tone="warning" text={t('select.noneEligible')} /> : list.map((p) => (
          <Card key={p.id}>
            <Stack gap={10}>
              <Row gap={8} center={false}>
                <Grow>
                  <Txt b>{p.name}</Txt>
                  <Row wrap gap={6} style={{ marginTop: 4 }}>
                    <Badge label={t('kind.' + p.kind)} />
                    {p.id === best?.id ? <Badge label={t('select.bestMatch')} tone="success" /> : null}
                    {p.enforcement === 'warned' || p.enforcement === 'reduced' ? <Badge label={t('enforcement.' + p.enforcement)} tone="warning" /> : null}
                    <Badge label={t('avail.' + p.availability)} tone={AVAIL_TONE[p.availability]} />
                  </Row>
                </Grow>
                <Stack gap={0} style={{ alignItems: 'flex-end' }}>
                  <Txt v="h3">{priceOf(p)}</Txt>
                  <Txt v="xs" c="faint">{c.service === 'investigation' ? t('select.perCase') : t('select.feeTerms')}</Txt>
                </Stack>
              </Row>
              <Row wrap gap={14}>
                <Metric label={t('score.label')} value={p.score != null ? num(p.score, 1) : '-'} />
                <Metric label={t('client.rating')} value={p.isNew ? t('client.newProvider') : num(p.avgRating, 1) + ' (' + num(p.ratingCount) + ')'} />
                {c.service === 'investigation' ? <Metric label={t('metric.onTime')} value={pct(p.metrics?.onTime)} /> : <Metric label={t('metric.recovery')} value={pct(p.metrics?.rawRecovery)} />}
                {c.service === 'investigation' ? <Metric label={t('metric.firstTime')} value={pct(p.metrics?.firstTime)} /> : <Metric label={t('metric.ptpKept')} value={pct(p.metrics?.ptpKept)} />}
                <Metric label={t('select.sla')} value={t('time.hoursShort', { h: num(p.slaHours) })} />
              </Row>
              <Button kind={p.id === best?.id ? 'primary' : 'secondary'} block label={t('select.sendOffer')} onPress={() => send(p)} />
            </Stack>
          </Card>
        ))}
      </Stack>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Txt v="xs" c="faint">{label}</Txt>
      <Txt v="sm" b style={{ color: colors.text }}>{value}</Txt>
    </View>
  );
}
