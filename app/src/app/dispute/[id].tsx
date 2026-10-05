/**
 * One dispute: what it is about, what each side said, and the platform's decision. While it
 * is open either side adds statements. A demo panel plays the platform's decision.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { services } from '@/backend/engine';
import { RatingBody } from '@/components/ratings';
import { dateTime } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Badge, Button, Card, Icon, KeyValue, Loading, Notice, Row, Stack, StatusBadge, Txt } from '@/ui/core';
import { inputStyle, useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function DisputeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const q = useQuery<any>(() => services().disputes.get(id), [id]);
  if (!q.data) return <Screen title={t('dispute.ref')} back>{q.error ? <Notice tone="danger" text={t(q.error.key || 'errors.generic')} /> : <Loading />}</Screen>;
  return <Body d={q.data} />;
}

function Body({ d }: { d: any }) {
  const t = useT();
  const { lang, session } = useApp();
  const run = useAction();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const open = d.status === 'open';
  const client = session?.portal === 'entity';
  const me = client ? 'entity' : 'provider';
  const canSpeak = client || ['provider_admin', 'provider_supervisor', 'freelancer'].indexOf(session?.user?.role) >= 0;
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    if (await run(() => services().disputes.respond(d.id, text), t('disputeApp.statementSent'))) setText('');
    setBusy(false);
  };
  return (
    <Screen title={d.ref} sub={t('dispute.kindLabel.' + d.kind) + ' · ' + (client ? d.providerName : d.entityName)} back>
      <Row gap={8} wrap>
        <StatusBadge status={d.status} />
        {d.outcome ? <Badge label={t('dispute.outcome.' + d.outcome)} tone={d.outcome === 'rejected' ? 'muted' : 'info'} /> : null}
      </Row>
      {d.status === 'resolved' ? (
        <Notice tone={d.outcome === 'rejected' ? 'warning' : 'success'}>
          <Txt v="sm" b>{t('dispute.resolution')}: {t('dispute.outcome.' + d.outcome)}</Txt>
          {d.resolutionNote ? <Txt v="sm">{d.resolutionNote}</Txt> : null}
          <Txt v="xs" c="muted">{t(d.kind === 'rating' ? 'dispute.ratingEffects' : 'dispute.caseEffects')}</Txt>
        </Notice>
      ) : null}
      <Card>
        <KeyValue rows={[
          [t('dispute.reasonLabel'), t('dispute.reason.' + d.reason)],
          [t('dispute.raisedBy'), d.raisedByName + ' · ' + t('dispute.party.' + d.raisedByParty)],
          [t('disputeApp.opened'), dateTime(d.createdAt)],
          [t('dispute.details'), d.details],
        ]} />
        {d.caseId && d.kind === 'case' ? <View style={{ marginTop: space.md }}><Button small icon="external" label={t('dispute.openCase')} onPress={() => router.push({ pathname: '/case/[id]', params: { id: d.caseId } })} /></View> : null}
      </Card>
      {d.rating ? <Card title={t('dispute.disputedRating')}><RatingBody r={d.rating} /></Card> : null}
      <Card title={t('disputeApp.statements')}>
        <Stack gap={space.md}>
          {(d.responses || []).length ? d.responses.map((r: any, i: number) => (
            <View key={i} style={{ borderRadius: radius.md, padding: space.md, backgroundColor: r.party === me ? colors.accentSoft : colors.surface2 }}>
              <Txt v="xs" b c="muted">{r.byName} · {t('dispute.party.' + r.party)} · {dateTime(r.at)}</Txt>
              <Txt v="sm">{r.text}</Txt>
            </View>
          )) : <Txt v="sm" c="faint">{t('dispute.noStatement')}</Txt>}
          {open && canSpeak ? (
            <Stack gap={6}>
              <TextInput value={text} onChangeText={setText} multiline placeholder={t('disputeApp.statementPlaceholder')} placeholderTextColor={colors.text3}
                style={[inputStyle, { minHeight: 80, textAlignVertical: 'top', textAlign: lang === 'ar' ? 'right' : 'left' }]} accessibilityLabel={t('disputeApp.yourStatement')} />
              <Button label={t('disputeApp.sendStatement')} kind="primary" icon="send" onPress={send} busy={busy} disabled={!text.trim()} block />
            </Stack>
          ) : null}
        </Stack>
      </Card>
      {open ? <DemoResolve id={d.id} /> : null}
    </Screen>
  );
}

/** Demo only: the platform decides the dispute. */
function DemoResolve({ id }: { id: string }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const decide = async () => {
    const v = await ask({
      title: t('dispute.resolve'), optionLabel: t('dispute.outcomeLabel'),
      options: ['upheld', 'partial', 'rejected'].map((o) => ({ value: o, label: t('dispute.outcome.' + o) })),
      note: 'required', noteLabel: t('dispute.resolutionNote'), confirmLabel: t('dispute.resolve'),
    });
    if (v) await run(() => services().demo.resolveMyDispute(id, v.option, v.note), t('dispute.resolved'));
  };
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
      <Row gap={8}><Icon name="info" size={16} /><Txt v="sm" b>{t('disputeApp.demoTitle')}</Txt></Row>
      <Txt v="xs" c="muted">{t('disputeApp.demoBody')}</Txt>
      <Button small kind="primary" icon="scale" label={t('dispute.resolve')} onPress={decide} />
    </View>
  );
}
