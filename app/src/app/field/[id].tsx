/**
 * Field work for an investigation: check in at the address, take the labelled photos,
 * scan documents (OCR fills the report), fill each report and submit for review.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { CheckInLine, PhotoGrid, ReportView } from '@/components/case';
import { FormView, Values } from '@/components/form';
import { useLocate } from '@/components/locate';
import { takePhoto } from '@/lib/camera';
import { getQuickFix } from '@/lib/location';
import { useQuery, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Badge, Button, Card, Grow, Icon, Loading, Notice, Row, Stack, Txt, useDir } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function FieldWork() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const q = useQuery<any>(() => services().cases.get(id), [id]);
  if (!q.data) return <Screen title={t('field.title')} back><Loading /></Screen>;
  return <FieldBody d={q.data} />;
}

function FieldBody({ d }: { d: any }) {
  const t = useT();
  const { ask, toast } = useDialog();
  const run = useAction();
  const c = d.case;
  const wf = icm().wf, C = icm().config;
  const now = icm().clock.now();
  const photos: any[] = c.photos || [];
  const minP = c.minPhotos || 0;
  const slots: string[] = wf.reports.photoSlots(c.inquiryTypes);
  const formsOk = (c.inquiryTypes || []).every((tp: string) => Object.keys(wf.reports.validate(C.REPORT_FORMS[tp], (c.report || {})[tp] || {}, { now })).length === 0);
  const ready = !!c.checkIn && photos.length >= minP && formsOk;
  const [busyPhoto, setBusyPhoto] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const locate = useLocate();

  const addPhoto = async (label: string | null, src: 'camera' | 'library' = 'camera') => {
    setBusyPhoto(label || 'extra');
    try {
      const url = await takePhoto(src);
      // Camera photos carry where they were taken; photos picked from the library do not.
      const fix = url && src === 'camera' ? await getQuickFix() : null;
      if (url) await run(() => services().cases.addPhoto(c.id, url, label, fix || undefined), t('agent.photoAdded'));
    } finally { setBusyPhoto(null); }
  };
  const removePhoto = async (pid: string) => {
    if (await ask({ title: t('agent.removePhoto'), message: t('agent.removePhotoBody'), danger: true, confirmLabel: t('common.delete') })) await run(() => services().cases.removePhoto(c.id, pid));
  };
  const submit = async () => {
    if (!(await ask({ title: t('action.submit_report'), message: t('agent.submitBody'), confirmLabel: t('action.submit_report') }))) return;
    if (await run(() => services().cases.transition(c.id, 'submit_report'), t('agent.submitted'))) router.replace('/home');
  };

  return (
    <Screen title={t('field.title')} sub={c.ref + ' · ' + (c.customer.name || '')} back
      footer={c.status === 'in_field' ? (
        <Stack gap={8}>
          <Row wrap gap={12}>
            <Check ok={!!c.checkIn} label={t('agent.chkCheckIn')} />
            <Check ok={photos.length >= minP} label={t('agent.chkPhotos', { n: photos.length, min: minP })} />
            <Check ok={formsOk} label={t('agent.chkForms')} />
          </Row>
          <Button label={t('action.submit_report')} kind="primary" icon="send" onPress={submit} disabled={!ready} block />
        </Stack>
      ) : undefined}>
      {c.status === 'returned_to_agent' ? (
        <Stack gap={8}>
          <Notice tone="warning" text={t('review.returnedWith') + ' ' + (c.reviewComment || '')} />
          <Button label={t('action.resume')} kind="primary" icon="play" block onPress={() => run(() => services().cases.transition(c.id, 'resume'))} />
        </Stack>
      ) : null}
      {c.reworkReason && ['assigned', 'in_field'].indexOf(c.status) >= 0 ? <Notice tone="warning" text={t('review.reworkReason') + ' ' + c.reworkReason} /> : null}

      <Card title={t('evidence.checkIn')}>
        {c.status === 'assigned' ? (
          <Stack style={{ alignItems: 'center' }}>
            <Icon name="pin" size={28} color={colors.accent} />
            <Txt v="sm" c="muted" center>{t('agent.checkInHint')}</Txt>
            <Button label={locating ? t('gps.locating') : t('action.check_in')} kind="primary" icon="pin" block busy={locating} onPress={async () => {
              setLocating(true);
              try {
                const fix = await locate();
                if (!fix) return;
                const n = await services().cases.checkIn(c.id, fix === 'demo' ? undefined : fix);
                const ci = n.checkIn;
                toast(ci.distanceM != null ? t('evidence.checkedInAt', { time: icm().util.fmtTime(ci.at), distance: icm().util.num(ci.distanceM) }) : t('gps.checkedIn', { time: icm().util.fmtTime(ci.at) }));
              } catch (e: any) { toast(t(e.key || 'errors.generic'), 'danger'); }
              finally { setLocating(false); }
            }} />
          </Stack>
        ) : <CheckInLine ci={c.checkIn} />}
      </Card>

      {c.status === 'in_field' || photos.length ? (
        <Card title={t('evidence.photos', { n: photos.length, min: minP })}>
          <Stack>
            {c.status === 'in_field' ? slots.map((sl) => {
              const done = photos.some((p) => p.label === sl);
              return <Slot key={sl} label={t('evidence.label.' + sl)} done={done} busy={busyPhoto === sl} onPress={() => addPhoto(sl)} />;
            }) : null}
            {photos.length ? <PhotoGrid photos={photos} onRemove={c.status === 'in_field' ? removePhoto : undefined} /> : null}
            {c.status === 'in_field' ? (
              <Row gap={8} wrap>
                <Button small icon="camera" label={t('field.extraPhoto')} busy={busyPhoto === 'extra'} onPress={() => addPhoto(null)} />
                <Button small kind="ghost" label={t('field.choosePhoto')} onPress={() => addPhoto(null, 'library')} />
              </Row>
            ) : null}
            <Txt v="xs" c="faint">{t('agent.photoStamp')}</Txt>
          </Stack>
        </Card>
      ) : null}

      {c.status === 'in_field' ? (c.inquiryTypes || []).map((tp: string) => <ReportSection key={tp} c={c} type={tp} />)
        : c.status === 'assigned' ? <Notice tone="info" text={t('field.notInField')} />
          : Object.keys(c.report || {}).length ? <Card title={t('agent.yourReport')}><ReportView c={c} /></Card> : null}
    </Screen>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return <Row gap={4}><Icon name={ok ? 'check' : 'x'} size={14} color={ok ? colors.ok : colors.text3} /><Txt v="xs" c={ok ? 'text' : 'faint'}>{label}</Txt></Row>;
}

function Slot({ label, done, busy, onPress }: { label: string; done: boolean; busy: boolean; onPress: () => void }) {
  const t = useT();
  const d = useDir();
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label}
      style={{ flexDirection: d.row, alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: done ? '#B6DCC5' : colors.borderStrong, backgroundColor: done ? colors.okBg : colors.surface }}>
      <Icon name={done ? 'check' : 'camera'} color={done ? colors.ok : colors.accent} />
      <Grow><Txt>{label}</Txt></Grow>
      <Txt v="sm" c={done ? 'ok' : 'accent'} b>{busy ? '...' : done ? t('field.done') : t('field.takePhoto')}</Txt>
    </Pressable>
  );
}

/** One report form (Residence, Business, Employment or Guarantor) with save and document scans. */
function ReportSection({ c, type }: { c: any; type: string }) {
  const t = useT();
  const { toast } = useDialog();
  const def = icm().config.REPORT_FORMS[type];
  const [values, setValues] = useState<Values>(() => ({ ...((c.report || {})[type] || {}) }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<string[]>([]);
  const [scanning, setScanning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saved = (c.report || {})[type];
  const complete = saved && Object.keys(icm().wf.reports.validate(def, saved, { now: icm().clock.now() })).length === 0;
  useEffect(() => { if (flash.length) { const tm = setTimeout(() => setFlash([]), 6000); return () => clearTimeout(tm); } }, [flash]);

  const save = async (v: Values, quiet?: boolean) => {
    setBusy(!quiet);
    try {
      await services().cases.saveReport(c.id, type, v);
      const errs = icm().wf.reports.validate(def, v, { now: icm().clock.now() });
      if (!quiet) { setErrors(errs); toast(Object.keys(errs).length ? t('agent.savedIncomplete') : t('agent.answersSaved'), Object.keys(errs).length ? 'danger' : 'success'); }
    } catch (e: any) { toast(t(e.key || 'errors.generic'), 'danger'); }
    finally { setBusy(false); }
  };

  const scan = async (f: any) => {
    setScanning(f.name);
    try {
      const url = await takePhoto('camera', 1200);
      if (!url) return;
      const res = await services().cases.scanDocument(c.id, f.doc);
      const next = { ...values, ...res.fields, [f.name]: url };
      setValues(next);
      setFlash(Object.keys(res.fields));
      await save(next, true);
      toast(t('ocr.done', { n: Object.keys(res.fields).length }));
    } catch (e: any) { toast(t(e.key || 'errors.generic'), 'danger'); }
    finally { setScanning(null); }
  };

  return (
    <Card title={t('agent.reportFor', { type: icm().util.label(icm().store.db.config.lists.inquiryTypes.find((x: any) => x.id === type)) })}
      right={complete ? <Badge label={t('agent.saved')} tone="success" /> : undefined}>
      <Stack gap={space.lg}>
        <FormView def={def} values={values} errors={errors} onChange={setValues} flash={flash} onScan={scan} scanning={scanning} />
        <View><Button label={t('agent.saveAnswers')} kind="primary" onPress={() => save(values)} busy={busy} block /></View>
      </Stack>
    </Card>
  );
}
