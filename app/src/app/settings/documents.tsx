/**
 * Documents with expiry dates. The owner sends a renewed commercial register or tax card
 * with its new expiry date; the current one stays in force until Operations checks it.
 * Expired documents pause new offers. A demo panel plays Operations and the calendar.
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { DataImage } from '@/components/case';
import { DocStateBadge, expiryText, useSettings } from '@/components/settings';
import { takePhoto } from '@/lib/camera';
import { date, errorText } from '@/lib/format';
import { useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Card, Grow, Icon, Loading, Notice, Row, Stack, Txt } from '@/ui/core';
import { inputStyle, useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function DocumentSettings() {
  const t = useT();
  const q = useSettings();
  if (!q.data) return <Screen title={t('profile.documents')} back><Loading /></Screen>;
  const s = q.data;
  return (
    <Screen title={t('profile.documents')} back>
      {s.expired.length ? <Notice tone="danger" text={t('settingsApp.pausedBody')} /> : null}
      <Txt v="sm" c="muted">{t('settingsApp.docsIntro')}</Txt>
      {s.documents.map((d) => <DocCard key={d.type} d={d} canEdit={s.canEdit} />)}
    </Screen>
  );
}

function DocCard({ d, canEdit }: { d: any; canEdit: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Card title={t('doc.' + d.type)} right={<DocStateBadge doc={d} />}>
      <Stack>
        <Row gap={12}>
          {d.url ? <DataImage uri={d.url} width={72} height={50} /> : null}
          <Grow>
            {expiryText(d, t) ? <Txt v="sm" c={d.expiry?.state === 'expired' ? 'bad' : d.expiry?.state === 'expiring' ? 'warn' : 'muted'}>{expiryText(d, t)}</Txt> : null}
            {d.verifiedAt ? <Txt v="xs" c="faint">{t('settingsApp.verifiedOn', { date: date(d.verifiedAt) })}</Txt> : null}
          </Grow>
        </Row>
        {d.renewal ? (
          <Notice tone="info">
            <Txt v="sm">{t('settings.renewalSent', { date: d.renewal.expiresAt ? date(d.renewal.expiresAt) : '-' })}</Txt>
            <Txt v="xs" c="muted">{t(d.expiry?.state === 'expired' ? 'settingsApp.renewalBodyExpired' : 'settingsApp.renewalBody')}</Txt>
          </Notice>
        ) : null}
        {canEdit && d.expiring && !open ? (
          <Button label={d.renewal ? t('settingsApp.replaceRenewal') : t('settingsApp.sendRenewal')} icon="upload" onPress={() => setOpen(true)} block />
        ) : null}
        {open ? <RenewForm type={d.type} onDone={() => setOpen(false)} /> : null}
        <DemoDoc d={d} />
      </Stack>
    </Card>
  );
}

/** Photo of the renewed document and its new expiry date (YYYY-MM-DD). */
function RenewForm({ type, onDone }: { type: string; onDone: () => void }) {
  const t = useT();
  const { toast } = useDialog();
  const [url, setUrl] = useState<string | null>(null);
  const [day, setDay] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const grab = async (src: 'camera' | 'library') => {
    setBusy(src);
    try { const u = await takePhoto(src, 1000); if (u) { setUrl(u); setErrs({ ...errs, file: '' }); } } finally { setBusy(null); }
  };
  const send = async () => {
    const expiresAt = icm().wf.parseDay(day);
    const e: Record<string, string> = {};
    if (!url) e.file = 'errors.documentPhotoRequired';
    if (!day) e.expiresAt = 'errors.required';
    else if (!expiresAt) e.expiresAt = 'errors.dateFormat';
    if (Object.keys(e).length) { setErrs(e); return; }
    setBusy('send');
    try {
      await services().providers.submitDocument(type, { fileName: type + '.jpg', url, expiresAt });
      toast(t('settingsApp.renewalSentToast'));
      onDone();
    } catch (x: any) {
      if (x?.params?.field) setErrs({ [x.params.field]: x.key });
      else toast(errorText(x), 'danger');
    } finally { setBusy(null); }
  };

  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, gap: space.md, backgroundColor: colors.surface2 }}>
      <Txt v="sm" b>{t('settingsApp.renewTitle')}</Txt>
      <Row gap={10} wrap>
        {url ? <DataImage uri={url} width={72} height={50} /> : null}
        <Button small icon="camera" kind={url ? 'secondary' : 'primary'} label={url ? t('reg.replaceFile') : t('field.takePhoto')} busy={busy === 'camera'} onPress={() => grab('camera')} />
        <Button small kind="ghost" label={t('field.choosePhoto')} busy={busy === 'library'} onPress={() => grab('library')} />
      </Row>
      {errs.file ? <Txt v="xs" c="bad">{t(errs.file)}</Txt> : null}
      <Stack gap={6}>
        <Txt v="sm" b c="muted">{t('settingsApp.newExpiry')} *</Txt>
        <TextInput value={day} onChangeText={(v) => { setDay(v); setErrs({ ...errs, expiresAt: '' }); }} placeholder={t('form.datePlaceholder')} keyboardType="numbers-and-punctuation" maxLength={10}
          style={[inputStyle, { textAlign: 'left', writingDirection: 'ltr', borderColor: errs.expiresAt ? colors.bad : colors.borderStrong }]} accessibilityLabel={t('settingsApp.newExpiry')} />
        <Txt v="xs" c="faint">{t('settingsApp.expiryHint')}</Txt>
        {errs.expiresAt ? <Txt v="xs" c="bad">{t(errs.expiresAt)}</Txt> : null}
      </Stack>
      <Row gap={10}>
        <Grow><Button label={t('common.cancel')} onPress={onDone} block /></Grow>
        <Grow><Button label={t('settingsApp.send')} kind="primary" icon="send" onPress={send} busy={busy === 'send'} block /></Grow>
      </Row>
    </View>
  );
}

/** Demo only: Operations checks a renewal, or the calendar moves past the expiry date. */
function DemoDoc({ d }: { d: any }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const canExpire = d.expiry?.state === 'expiring';
  if (!d.renewal && !canExpire) return null;
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
      <Row gap={8}><Icon name="info" size={16} /><Txt v="xs" b>{t('settingsApp.demoOps')}</Txt></Row>
      <Row gap={8} wrap>
        {d.renewal ? (
          <>
            <Button small kind="primary" icon="check" label={t('settings.verifyDoc')} onPress={() => run(() => services().demo.reviewMyProvider('verifyDocument', d.type), t('settings.docVerified'))} />
            <Button small kind="danger" label={t('onboarding.reject')} onPress={async () => {
              const r = await ask({ title: t('onboarding.reject'), note: 'required', noteLabel: t('signup.demo.noteLabel'), danger: true, confirmLabel: t('onboarding.reject') });
              if (r) await run(() => services().demo.reviewMyProvider('rejectDocument', d.type, r.note));
            }} />
          </>
        ) : null}
        {canExpire ? <Button small label={t('settingsApp.demoExpire')} onPress={() => run(() => services().demo.reviewMyProvider('expireDocument', d.type))} /> : null}
      </Row>
    </View>
  );
}
