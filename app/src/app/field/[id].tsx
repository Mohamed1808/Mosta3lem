/**
 * Field work for an investigation: check in at the address, take the labelled photos,
 * scan documents (OCR fills the report), fill each report and submit for review.
 *
 * Works without signal: the case is read from the copy saved on the phone and every action
 * is queued (see sync/offline) with the time it happened, then sent when back online.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { CheckInLine, PhotoGrid, ReportView } from '@/components/case';
import { FormView, Values } from '@/components/form';
import { useLocate } from '@/components/locate';
import { takePhoto } from '@/lib/camera';
import { addressLine, dateTime, errorText } from '@/lib/format';
import { getQuickFix } from '@/lib/location';
import { useQuery, useT } from '@/state/app';
import { applyOps, OpKind, useOffline } from '@/sync/offline';
import { colors, radius, space } from '@/theme';
import { Badge, Button, Card, Grow, Icon, KeyValue, Loading, Notice, Row, Stack, Txt, useDir } from '@/ui/core';
import { useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function FieldWork() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const off = useOffline();
  const q = useQuery<any>(() => (off.online ? services().cases.get(id) : Promise.resolve(null)), [id, off.online]);
  const { cacheCase } = off;
  // Keep the latest copy on the phone so the case still opens without signal.
  useEffect(() => { if (q.data) cacheCase(q.data); }, [q.data, cacheCase]);
  const d = off.online ? (q.data ? applyOps(q.data, off.outbox) : null) : off.cachedCase(id);
  if (!d) {
    return (
      <Screen title={t('field.title')} back>
        {off.online ? <Loading /> : <Notice tone="warning" text={t('offline.notSaved')} />}
      </Screen>
    );
  }
  return <FieldBody d={d} />;
}

function FieldBody({ d }: { d: any }) {
  const t = useT();
  const { ask, toast } = useDialog();
  const off = useOffline();
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
  const failed = off.outbox.filter((o) => o.caseId === c.id && o.status === 'failed');

  /** Run or queue an action; tell the person which one happened. */
  const act = async (kind: OpKind, args: any, done?: string): Promise<boolean> => {
    try {
      await off.act(kind, c, args);
      if (!off.online) toast(t('offline.savedOnPhone'));
      else if (done) toast(done);
      return true;
    } catch (e: any) {
      toast(errorText(e), 'danger');
      return false;
    }
  };

  const addPhoto = async (label: string | null, src: 'camera' | 'library' = 'camera') => {
    setBusyPhoto(label || 'extra');
    try {
      const url = await takePhoto(src);
      // Camera photos carry where they were taken; photos picked from the library do not.
      const fix = url && src === 'camera' ? await getQuickFix() : null;
      if (url) await act('addPhoto', { url, label, fix }, t('agent.photoAdded'));
    } finally { setBusyPhoto(null); }
  };
  const removePhoto = async (pid: string) => {
    if (!(await ask({ title: t('agent.removePhoto'), message: t('agent.removePhotoBody'), danger: true, confirmLabel: t('common.delete') }))) return;
    // A photo not sent yet is simply dropped from the queue.
    const queued = off.outbox.find((o) => o.id === pid && o.kind === 'addPhoto');
    if (queued) await off.discard(pid);
    else await act('removePhoto', { photoId: pid });
  };
  const submit = async () => {
    if (!(await ask({ title: t('action.submit_report'), message: off.online ? t('agent.submitBody') : t('offline.submitBody'), confirmLabel: t('action.submit_report') }))) return;
    if (await act('submit', {}, t('agent.submitted'))) router.replace('/home');
  };
  const checkIn = async () => {
    setLocating(true);
    try {
      const fix = await locate();
      if (!fix) return;
      await act('checkIn', { fix: fix === 'demo' ? null : fix, at: fix === 'demo' ? undefined : fix.at }, t('gps.checkedIn', { time: icm().util.fmtTime(now) }));
    } finally { setLocating(false); }
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
      {!off.online ? <Notice tone="warning" icon="alert" text={t('offline.fieldBanner')} /> : null}
      {c.pendingSync ? <Notice tone="info" text={t('offline.waitingN', { n: c.pendingSync })} /> : null}
      {failed.length ? (
        <Notice tone="danger">
          <Txt v="sm" style={{ color: colors.bad }}>{t('offline.failedN', { n: failed.length })}</Txt>
          <Button small kind="danger" label={t('offline.review')} onPress={() => router.push('/sync')} />
        </Notice>
      ) : null}
      {c.status === 'submitted_for_review' && c.pendingSync ? <Notice tone="success" text={t('offline.submittedQueued')} /> : null}
      {c.status === 'returned_to_agent' ? (
        <Stack gap={8}>
          <Notice tone="warning" text={t('review.returnedWith') + ' ' + (c.reviewComment || '')} />
          <Button label={t('action.resume')} kind="primary" icon="play" block onPress={() => act('resume', {})} />
        </Stack>
      ) : null}
      {c.reworkReason && ['assigned', 'in_field'].indexOf(c.status) >= 0 ? <Notice tone="warning" text={t('review.reworkReason') + ' ' + c.reworkReason} /> : null}

      <VisitDetails c={c} />

      <Card title={t('evidence.checkIn')}>
        {c.status === 'assigned' ? (
          <Stack style={{ alignItems: 'center' }}>
            <Icon name="pin" size={28} color={colors.accent} />
            <Txt v="sm" c="muted" center>{t('agent.checkInHint')}</Txt>
            <Button label={locating ? t('gps.locating') : t('action.check_in')} kind="primary" icon="pin" block busy={locating} onPress={checkIn} />
          </Stack>
        ) : (
          <Stack gap={6}>
            <CheckInLine ci={c.checkIn} />
            {c.checkIn && c.checkIn.pending ? <Badge label={t('offline.notSentYet')} tone="pending" /> : null}
          </Stack>
        )}
      </Card>

      {c.status === 'in_field' || photos.length ? (
        <Card title={t('evidence.photos', { n: photos.length, min: minP })}>
          <Stack>
            {c.status === 'in_field' ? slots.map((sl) => {
              const done = photos.some((p) => p.label === sl);
              return <Slot key={sl} label={t('evidence.label.' + sl)} done={done} busy={busyPhoto === sl} onPress={() => addPhoto(sl)} />;
            }) : null}
            {photos.length ? <PhotoGrid photos={photos} onRemove={c.status === 'in_field' ? removePhoto : undefined} /> : null}
            {photos.some((p) => p.pending) ? <Txt v="xs" c="accent">{t('offline.photosWaiting', { n: photos.filter((p) => p.pending).length })}</Txt> : null}
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

      {c.status === 'in_field' ? (c.inquiryTypes || []).map((tp: string) => <ReportSection key={tp} c={c} type={tp} act={act} />)
        : c.status === 'assigned' ? <Notice tone="info" text={t('field.notInField')} />
          : Object.keys(c.report || {}).length ? <Card title={t('agent.yourReport')}><ReportView c={c} /></Card> : null}
    </Screen>
  );
}

/** What the agent needs at the door, also without signal: who, where, contact and instructions. */
function VisitDetails({ c }: { c: any }) {
  const t = useT();
  const cu = c.customer || {};
  const addrs = Object.keys(c.addresses || {}).filter((k) => c.addresses[k]);
  const rows: [string, any][] = [[t('caseScreen.client'), cu.name || '-']];
  const phones = [cu.mobile].concat(cu.mobiles || []).filter(Boolean);
  if (phones.length) {
    rows.push([t('offline.phone'), (
      <Stack key="p" gap={2}>{phones.map((p: string) => (
        <Pressable key={p} onPress={() => Linking.openURL('tel:' + p)} accessibilityRole="link"><Txt v="sm" c="accent" ltr>{p}</Txt></Pressable>
      ))}</Stack>
    )]);
  }
  addrs.forEach((k) => {
    const line = addressLine(c.addresses[k]);
    rows.push([t('address.' + k), (
      <Pressable key={k} onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(line))} accessibilityRole="link">
        <Txt v="sm" c="accent">{line}</Txt>
      </Pressable>
    )]);
  });
  if (c.instructions) rows.push([t('offline.instructions'), c.instructions]);
  if (c.dueAt) rows.push([t('caseScreen.due'), dateTime(c.dueAt)]);
  return <Card title={t('offline.visitDetails')}><KeyValue rows={rows} /></Card>;
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
function ReportSection({ c, type, act }: { c: any; type: string; act: (kind: OpKind, args: any, done?: string) => Promise<boolean> }) {
  const t = useT();
  const { toast } = useDialog();
  const off = useOffline();
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
      const ok = await act('saveReport', { type, values: v });
      const errs = icm().wf.reports.validate(def, v, { now: icm().clock.now() });
      if (ok && !quiet && off.online) { setErrors(errs); toast(Object.keys(errs).length ? t('agent.savedIncomplete') : t('agent.answersSaved'), Object.keys(errs).length ? 'danger' : 'success'); }
      else if (ok && !quiet) setErrors(errs);
    } finally { setBusy(false); }
  };

  const scan = async (f: any) => {
    setScanning(f.name);
    try {
      const url = await takePhoto('camera', 1200);
      if (!url) return;
      if (!off.online) {
        // Reading a document needs the server; keep the photo and let the agent type or rescan later.
        const next = { ...values, [f.name]: url };
        setValues(next);
        await save(next, true);
        toast(t('offline.scanLater'));
        return;
      }
      const res = await services().cases.scanDocument(c.id, f.doc);
      const next = { ...values, ...res.fields, [f.name]: url };
      setValues(next);
      setFlash(Object.keys(res.fields));
      await save(next, true);
      toast(t('ocr.done', { n: Object.keys(res.fields).length }));
    } catch (e: any) { toast(errorText(e), 'danger'); }
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
