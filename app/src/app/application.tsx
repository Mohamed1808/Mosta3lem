/**
 * The applicant's application: where it is on the review track (Operations, then
 * Management sign-off), what the platform asked for, the documents, and what they sent.
 * After a request for information or a rejection the applicant can change the details,
 * replace documents and send it again. A demo panel plays the platform's side.
 */
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { TextInput, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { DocSlot, RegSummary } from '@/components/registration';
import { dateTime } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors, space } from '@/theme';
import { Badge, Button, Card, Grow, Icon, Loading, Notice, Row, Stack, StatusBadge, Txt } from '@/ui/core';
import { inputStyle, useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function Application() {
  const t = useT();
  const { signOut } = useApp();
  const { ask } = useDialog();
  const q = useQuery<any>(() => services().registration.mine());
  const out = async () => {
    if (await ask({ title: t('more.signOut'), confirmLabel: t('more.signOut') })) { await signOut(); router.replace('/login'); }
  };
  const right = <Button small kind="ghost" icon="logout" label={t('more.signOut')} onPress={out} />;
  if (!q.data) return <Screen title={t('application.title')} right={right}><Loading /></Screen>;
  return <Body p={q.data} right={right} />;
}

function Body({ p, right }: { p: any; right: ReactNode }) {
  const t = useT();
  const run = useAction();
  const { lang, syncSession } = useApp();
  const ver = p.verification;
  const st: string = ver.status;
  const lastNote = (ver.notes || []).filter((n: any) => n.kind === 'info_requested' || n.kind === 'rejected').slice(-1)[0];
  const missing = (ver.documents || []).filter((d: any) => d.status === 'missing').length;
  const [reply, setReply] = useState('');
  const [replyErr, setReplyErr] = useState('');
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    if (!reply.trim()) { setReplyErr(t('application.replyRequired')); return; }
    setBusy(true);
    const ok = await run(() => services().registration.resubmit(reply), t('application.resent'));
    setBusy(false);
    if (ok) setReply('');
  };

  return (
    <Screen title={t('application.title')} sub={p.name + (p.registration ? ' · ' + p.registration.ref : '')} right={right}>
      <Row gap={8} wrap>
        <StatusBadge status={st} />
        <Badge label={t('reg.kind.' + (p.kind === 'company' ? 'company' : 'individual'))} tone="neutral" />
      </Row>

      <Card><Track status={st} stage={p.stage} /></Card>

      {st === 'pending' ? <Notice tone="info" text={missing ? t('application.pendingMissing', { n: icm().util.num(missing) }) : t('application.pending')} /> : null}
      {st === 'awaiting_signoff' ? <Notice tone="info" text={t('application.signoff')} /> : null}
      {st === 'verified' ? (
        <Card>
          <Stack style={{ alignItems: 'center' }}>
            <Icon name="shieldCheck" size={36} color={colors.ok} />
            <Txt center b>{t('application.approved')}</Txt>
            <Button label={t('application.open')} kind="primary" icon="arrowRight" block onPress={async () => { await syncSession(); router.replace('/'); }} />
          </Stack>
        </Card>
      ) : null}
      {st === 'info_requested' || st === 'rejected' ? (
        <Card title={st === 'rejected' ? t('application.rejected') : t('application.infoRequested')}>
          <Stack>
            {lastNote ? (
              <Notice tone={st === 'rejected' ? 'danger' : 'warning'}>
                <Txt v="xs" c="muted">{dateTime(lastNote.at) + ' · ' + lastNote.by}</Txt>
                <Txt v="sm">{lastNote.text}</Txt>
              </Notice>
            ) : null}
            {p.canEdit ? (
              <>
                <Txt v="sm" c="muted">{t('application.rejectedFix')}</Txt>
                <Button label={t('signup.editDetails')} icon="edit" onPress={() => router.push('/application-edit')} block />
                <Stack gap={6}>
                  <Txt v="sm" b c="muted">{t('application.yourReply')} *</Txt>
                  <TextInput value={reply} onChangeText={(v) => { setReply(v); setReplyErr(''); }} multiline placeholder={st === 'rejected' ? t('application.resendBody') : t('application.replyPlaceholder')}
                    placeholderTextColor={colors.text3} style={[inputStyle, { minHeight: 90, textAlignVertical: 'top', textAlign: lang === 'ar' ? 'right' : 'left' }]} accessibilityLabel={t('application.yourReply')} />
                  {replyErr ? <Txt v="xs" c="bad">{replyErr}</Txt> : null}
                </Stack>
                <Button label={st === 'rejected' ? t('application.resend') : t('application.resubmit')} kind="primary" icon="send" onPress={resend} busy={busy} block />
              </>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      <Card title={t('reg.sec.documents')}>
        <Stack gap={10}>
          {(ver.documents || []).map((d: any) => (
            <DocSlot key={d.type} type={d.type} file={{ name: d.fileName, url: d.url, status: d.status }} locked={!p.canUpload}
              onFile={(file) => run(() => services().registration.uploadDocument(d.type, file.name, file.url), t('profile.uploaded')).then(() => undefined)} />
          ))}
          <Txt v="xs" c="faint">{t('signup.docsNote')}</Txt>
        </Stack>
      </Card>

      <Card title={t('application.submitted')} right={p.canEdit ? <Button small kind="ghost" icon="edit" label={t('common.edit')} onPress={() => router.push('/application-edit')} /> : undefined}>
        <Stack>
          <RegSummary values={p.values} />
          <Txt v="xs" c="faint">{t('application.submittedAt') + ': ' + dateTime(p.registration ? p.registration.at : ver.submittedAt)}</Txt>
        </Stack>
      </Card>

      {st !== 'verified' ? (
        <Card title={t('application.next')}>
          <Stack gap={8}>
            {(p.kind === 'company' ? ['c1', 'c2', 'c3'] : ['i1', 'i2', 'i3']).map((k, n) => (
              <Row key={k} gap={10} center={false}>
                <Txt v="sm" c="accent" b>{icm().util.num(n + 1)}</Txt>
                <Grow><Txt v="sm">{t('application.after.' + k)}</Txt></Grow>
              </Row>
            ))}
          </Stack>
        </Card>
      ) : null}

      {st === 'pending' || st === 'awaiting_signoff' ? <DemoReview status={st} /> : null}
    </Screen>
  );
}

/** The review track, top to bottom: submitted, Operations review, Management sign-off, decision. */
function Track({ status, stage }: { status: string; stage: number }) {
  const t = useT();
  const stages: string[] = icm().wf.APPLICATION_STAGES;
  return (
    <Stack gap={0}>
      {stages.map((k, i) => {
        const done = i < stage;
        const current = i === stage;
        const bad = current && status === 'rejected';
        const warn = current && status === 'info_requested';
        const label = k === 'review' && status === 'info_requested' ? 'info' : k === 'decision' && status === 'rejected' ? 'rejected' : k;
        const dot = bad ? colors.bad : warn ? colors.warn : done ? colors.ok : current ? colors.accent : colors.border;
        return (
          <Row key={k} gap={12} center={false}>
            <View style={{ alignItems: 'center', width: 26 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: done || current ? dot : colors.surface, borderWidth: 2, borderColor: dot, alignItems: 'center', justifyContent: 'center' }}>
                {done ? <Icon name="check" size={14} color="#fff" /> : bad ? <Icon name="x" size={14} color="#fff" /> : <Txt v="xs" b c={current ? 'white' : 'faint'}>{icm().util.num(i + 1)}</Txt>}
              </View>
              {i < stages.length - 1 ? <View style={{ width: 2, height: 22, backgroundColor: done ? colors.ok : colors.border }} /> : null}
            </View>
            <Grow style={{ paddingTop: 3 }}>
              <Txt v="sm" b={current} c={done || current ? 'text' : 'faint'}>{t('application.track.' + label)}</Txt>
            </Grow>
          </Row>
        );
      })}
    </Stack>
  );
}

/** Demo only: the platform's review, so every outcome can be tried on the phone. */
function DemoReview({ status }: { status: string }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const act = async (action: string) => {
    if (action === 'requestInfo' || action === 'reject') {
      const r = await ask({ title: t('signup.demo.' + action), note: 'required', noteLabel: t('signup.demo.noteLabel'), danger: action === 'reject', confirmLabel: t('onboarding.send') });
      if (r) await run(() => services().demo.reviewMyApplication(action, r.note));
      return;
    }
    await run(() => services().demo.reviewMyApplication(action));
  };
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: 12, padding: space.lg, gap: space.md }}>
      <Row gap={8}><Icon name="info" size={16} /><Txt v="sm" b>{t('signup.demo.title')}</Txt></Row>
      <Txt v="xs" c="muted">{t('signup.demo.body')}</Txt>
      {status === 'pending'
        ? <Button small kind="primary" icon="check" label={t('signup.demo.approve')} onPress={() => act('approve')} />
        : <Button small kind="primary" icon="shieldCheck" label={t('signup.demo.verify')} onPress={() => act('verify')} />}
      <Row gap={8} wrap>
        <Button small label={t('signup.demo.requestInfo')} onPress={() => act('requestInfo')} />
        <Button small kind="danger" label={t('signup.demo.reject')} onPress={() => act('reject')} />
      </Row>
    </View>
  );
}
