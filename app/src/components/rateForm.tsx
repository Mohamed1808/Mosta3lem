/**
 * The client's rating of a provider: overall stars, one score per criterion of the
 * service, optional tags and written feedback. Used for one case (RateCaseSheet) and for
 * each provider when a batch is closed.
 */
import { useState } from 'react';
import { Pressable, TextInput } from 'react-native';

import { icm, services } from '@/backend/engine';
import { errorText } from '@/lib/format';
import { useT } from '@/state/app';
import { colors, radius } from '@/theme';
import { Button, Row, Stack, Txt, useDir } from '@/ui/core';
import { inputStyle, Sheet, useDialog } from '@/ui/dialogs';
import { StarInput } from './ratings';

export type RatingValue = { overall: number; criteria: Record<string, number>; tags: string[]; feedback: string };

export function emptyRating(service: string): RatingValue {
  const criteria: Record<string, number> = {};
  (icm().config.RATING_CRITERIA[service] || []).forEach((k: string) => { criteria[k] = 0; });
  return { overall: 0, criteria, tags: [], feedback: '' };
}
export function ratingComplete(r: RatingValue) {
  return r.overall >= 1 && Object.keys(r.criteria).every((k) => r.criteria[k] >= 1);
}

/** onChange receives an update function, so quick taps in a row are all kept. */
export function RatingFields({ value, onChange, showErrors }: { value: RatingValue; onChange: (fn: (r: RatingValue) => RatingValue) => void; showErrors?: boolean }) {
  const t = useT();
  const d = useDir();
  const tags: any[] = icm().store.db.config.lists.ratingTags || [];
  return (
    <Stack gap={12}>
      <Stack gap={6}>
        <Txt v="sm" b c="muted">{t('rating.overall')} *</Txt>
        <StarInput value={value.overall} onChange={(n) => onChange((r) => ({ ...r, overall: n }))} label={t('rating.overall')} bad={showErrors && !value.overall} />
      </Stack>
      {Object.keys(value.criteria).map((k) => (
        <Stack key={k} gap={6}>
          <Txt v="sm" b c="muted">{t('criteria.' + k)} *</Txt>
          <StarInput value={value.criteria[k]} onChange={(n) => onChange((r) => ({ ...r, criteria: { ...r.criteria, [k]: n } }))} label={t('criteria.' + k)} bad={showErrors && !value.criteria[k]} />
        </Stack>
      ))}
      <Stack gap={6}>
        <Txt v="sm" b c="muted">{t('rating.tags')}</Txt>
        <Row wrap gap={8}>
          {tags.map((tg) => {
            const on = value.tags.indexOf(tg.id) >= 0;
            const tone = tg.sentiment === 'negative' ? colors.bad : colors.ok;
            return (
              <Pressable key={tg.id} onPress={() => onChange((r) => ({ ...r, tags: on ? r.tags.filter((x) => x !== tg.id) : r.tags.concat([tg.id]) }))}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={icm().util.label(tg)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? tone : colors.borderStrong, backgroundColor: on ? colors.surface2 : colors.surface }}>
                <Txt v="sm" b={on} style={{ color: on ? tone : colors.text2 }}>{icm().util.label(tg)}</Txt>
              </Pressable>
            );
          })}
        </Row>
      </Stack>
      <Stack gap={6}>
        <Txt v="sm" b c="muted">{t('rating.feedback')}</Txt>
        <TextInput value={value.feedback} onChangeText={(v) => onChange((r) => ({ ...r, feedback: v }))} multiline placeholder={t('rating.feedbackHint')} placeholderTextColor={colors.text3}
          style={[inputStyle, { minHeight: 80, textAlignVertical: 'top', textAlign: d.align }]} accessibilityLabel={t('rating.feedback')} />
      </Stack>
    </Stack>
  );
}

/** Rate the provider of one closed case. */
export function RateCaseSheet({ c, providerName, onClose }: { c: any; providerName: string; onClose: () => void }) {
  const t = useT();
  const { toast } = useDialog();
  const [value, setValue] = useState<RatingValue>(emptyRating(c.service));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setTried(true);
    if (!ratingComplete(value)) { toast(t('errors.ratingIncomplete'), 'danger'); return; }
    setBusy(true);
    try { await services().ratings.rateCase(c.id, value); toast(t('rating.saved')); onClose(); }
    catch (e) { toast(errorText(e), 'danger'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible title={t('rating.rateProvider', { name: providerName })} onClose={onClose}
      footer={<Row gap={10}><Button label={t('rating.later')} onPress={onClose} style={{ flex: 1 }} /><Button label={t('rating.submit')} kind="primary" onPress={submit} busy={busy} style={{ flex: 1 }} /></Row>}>
      <Stack gap={12}>
        <Txt v="sm" c="muted">{t('rating.caseIntro', { ref: c.ref })}</Txt>
        <RatingFields value={value} onChange={setValue} showErrors={tried} />
      </Stack>
    </Sheet>
  );
}
