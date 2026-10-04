/**
 * Providers rate the banks and finance companies they work for, on data quality and payment
 * timeliness, after a case (or a batch) closes. Other providers see the averages.
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { services } from '@/backend/engine';
import { StarInput, Stars } from '@/components/ratings';
import { date, errorText } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Card, Divider, Empty, Grow, ListItem, Loading, Row, Stack, Txt } from '@/ui/core';
import { inputStyle, Sheet, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function RateClients() {
  const t = useT();
  const q = useQuery<any>(async () => ({ pending: await services().ratings.clientPending(), given: await services().ratings.clientRatings() }));
  const [item, setItem] = useState<any>(null);
  const d = q.data;
  return (
    <Screen title={t('nav.rateClients')} sub={t('clientRating.subtitle')} back>
      {!d ? <Loading /> : (
        <>
          <Card title={t('clientRating.pending', { n: d.pending.length })} pad={false}>
            {d.pending.length ? d.pending.map((x: any, i: number) => (
              <View key={x.kind + x.id}>
                {i ? <Divider /> : null}
                <ListItem chevron={false} title={x.entityName}
                  sub={x.ref + (x.kind === 'batch' ? ' · ' + t('clientRating.batchOf', { n: x.cases }) : '') + ' · ' + t('ratings.closedOn') + ' ' + date(x.closedAt)}
                  right={<Button small kind="primary" label={t('clientRating.rateBtn')} onPress={() => setItem(x)} />} />
              </View>
            )) : <View style={{ padding: space.lg }}><Txt v="sm" c="faint">{t('clientRating.nonePending')}</Txt></View>}
          </Card>
          <Card title={t('clientRating.given')}>
            {d.given.length ? (
              <Stack gap={space.md}>
                {d.given.map((r: any, i: number) => (
                  <View key={r.id} style={{ gap: 4 }}>
                    {i ? <Divider /> : null}
                    <Row between><Txt v="sm" b>{r.entityName}</Txt><Txt v="xs" c="faint">{date(r.createdAt)}</Txt></Row>
                    <Row gap={8}><Txt v="xs" c="muted" style={{ flex: 1 }}>{t('clientRating.dataQuality')}</Txt><Stars value={r.dataQuality} size={13} /></Row>
                    <Row gap={8}><Txt v="xs" c="muted" style={{ flex: 1 }}>{t('clientRating.paymentTimeliness')}</Txt><Stars value={r.paymentTimeliness} size={13} /></Row>
                    {r.comment ? <Txt v="sm">{r.comment}</Txt> : null}
                  </View>
                ))}
              </Stack>
            ) : <Empty text={t('clientRating.none')} icon="star" />}
          </Card>
        </>
      )}
      {item ? <RateSheet item={item} onClose={() => setItem(null)} /> : null}
    </Screen>
  );
}

function RateSheet({ item, onClose }: { item: any; onClose: () => void }) {
  const t = useT();
  const { lang } = useApp();
  const { toast } = useDialog();
  const [dq, setDq] = useState(0);
  const [pt, setPt] = useState(0);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!dq || !pt) { setErr(t('errors.ratingIncomplete')); return; }
    setBusy(true);
    try {
      await services().ratings.rateClient({ caseId: item.kind === 'case' ? item.id : null, batchId: item.kind === 'batch' ? item.id : null, dataQuality: dq, paymentTimeliness: pt, comment });
      toast(t('rating.saved'));
      onClose();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return (
    <Sheet visible title={t('clientRating.rateTitle', { name: item.entityName })} onClose={onClose}
      footer={<Row gap={10}><Grow><Button label={t('common.cancel')} onPress={onClose} block /></Grow><Grow><Button label={t('rating.submit')} kind="primary" onPress={save} busy={busy} block /></Grow></Row>}>
      <Stack gap={space.lg}>
        <Txt v="sm" c="muted">{t('clientRating.intro', { ref: item.ref })}</Txt>
        <Stack gap={6}>
          <Txt v="sm" b>{t('clientRating.dataQuality')} *</Txt>
          <StarInput value={dq} onChange={(n) => { setDq(n); setErr(''); }} label={t('clientRating.dataQuality')} bad={!!err && !dq} />
          <Txt v="xs" c="faint">{t('clientRating.dataQualityHint')}</Txt>
        </Stack>
        <Stack gap={6}>
          <Txt v="sm" b>{t('clientRating.paymentTimeliness')} *</Txt>
          <StarInput value={pt} onChange={(n) => { setPt(n); setErr(''); }} label={t('clientRating.paymentTimeliness')} bad={!!err && !pt} />
        </Stack>
        <Stack gap={6}>
          <Txt v="sm" b c="muted">{t('common.comment')}</Txt>
          <TextInput value={comment} onChangeText={setComment} multiline accessibilityLabel={t('common.comment')}
            style={[inputStyle, { minHeight: 70, textAlignVertical: 'top', textAlign: lang === 'ar' ? 'right' : 'left', borderRadius: radius.md, borderColor: colors.borderStrong }]} />
        </Stack>
        {err ? <Txt v="sm" c="bad">{err}</Txt> : null}
      </Stack>
    </Sheet>
  );
}
