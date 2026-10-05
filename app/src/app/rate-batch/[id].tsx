/**
 * Close a finished batch: one rating per provider that worked on it, plus an optional
 * note flagging individual cases.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { services } from '@/backend/engine';
import { emptyRating, RatingFields, RatingValue, ratingComplete } from '@/components/rateForm';
import { errorText, num } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { colors, space } from '@/theme';
import { Button, Card, Divider, Loading, Notice, Stack, Txt, useDir } from '@/ui/core';
import { inputStyle, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function RateBatch() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const q = useQuery<any>(() => services().batches.get(id), [id]);
  if (!q.data) return <Screen title={t('batch.closeAndRate')} back>{q.error ? <Notice tone="danger" text={t(q.error.key || 'errors.generic')} /> : <Loading />}</Screen>;
  if (!q.data.needsRating) return <Screen title={t('batch.closeAndRate')} back><Notice tone="info" text={t('batch.closed')} /></Screen>;
  return <Body b={q.data} />;
}

function Body({ b }: { b: any }) {
  const t = useT();
  const d = useDir();
  const { toast } = useDialog();
  const [ratings, setRatings] = useState<Record<string, RatingValue>>(() => {
    const init: Record<string, RatingValue> = {};
    b.rateProviders.forEach((p: any) => { init[p.id] = emptyRating(b.service); });
    return init;
  });
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setTried(true);
    if (!b.rateProviders.every((p: any) => ratingComplete(ratings[p.id]))) { toast(t('errors.ratingIncomplete'), 'danger'); return; }
    setBusy(true);
    try {
      const list = b.rateProviders.map((p: any) => ({ providerId: p.id, ...ratings[p.id] }));
      const caseFlags = Object.keys(flags).filter((k) => flags[k].trim()).map((k) => ({ caseId: k, note: flags[k].trim() }));
      await services().batches.close(b.id, list, caseFlags);
      toast(t('batch.closed'));
      router.back();
    } catch (e) { toast(errorText(e), 'danger'); } finally { setBusy(false); }
  };

  return (
    <Screen title={t('batch.closeTitle', { ref: b.ref })} back
      footer={<Button kind="primary" icon="star" block label={t('batch.closeAndRate')} onPress={submit} busy={busy} />}>
      <Notice tone="info" text={t('batch.closeIntro')} />
      {b.rateProviders.map((p: any) => (
        <Card key={p.id} title={p.name}>
          <Stack gap={10}>
            <Txt v="xs" c="faint">{t('batch.casesClosed', { n: num(p.cases) })}</Txt>
            <RatingFields value={ratings[p.id]} onChange={(fn) => setRatings((all) => ({ ...all, [p.id]: fn(all[p.id]) }))} showErrors={tried} />
          </Stack>
        </Card>
      ))}
      <Card title={t('batch.caseFlags')} pad={false}>
        <Txt v="xs" c="faint" style={{ padding: space.lg, paddingBottom: space.sm }}>{t('client.flagsHint')}</Txt>
        {b.cases.map((c: any) => (
          <View key={c.id}>
            <Divider />
            <Stack gap={6} style={{ padding: space.md, paddingHorizontal: space.lg }}>
              <Txt v="sm"><Txt v="sm" mono b>{c.ref}</Txt> · {c.customer?.name || ''}</Txt>
              <TextInput value={flags[c.id] || ''} onChangeText={(v) => setFlags({ ...flags, [c.id]: v })} placeholder={t('batch.flagHint')} placeholderTextColor={colors.text3}
                style={[inputStyle, { textAlign: d.align }]} accessibilityLabel={t('batch.flagNote') + ' ' + c.ref} />
            </Stack>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
