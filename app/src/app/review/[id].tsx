/** Supervisor review of a submitted report: evidence and answers, then approve or return. */
import { router, useLocalSearchParams } from 'expo-router';

import { icm, services } from '@/backend/engine';
import { CheckInLine, PhotoGrid, ReportView } from '@/components/case';
import { useQuery, useT } from '@/state/app';
import { Badge, Button, Card, Grow, Loading, Notice, Row, Stack, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const q = useQuery<any>(() => services().cases.get(id), [id]);
  if (!q.data) return <Screen title={t('reviewScreen.title')} back><Loading /></Screen>;
  const c = q.data.case, a: string[] = q.data.actions || [];
  const photos = c.photos || [];
  const photosOk = photos.length >= (c.minPhotos || 0);
  const far = c.checkIn && c.checkIn.distanceM > icm().config.CHECKIN_MAX_DISTANCE_M;
  const approve = async () => {
    if (await ask({ title: t('reviewScreen.approve'), message: t('review.approveBody'), confirmLabel: t('reviewScreen.approve') })
      && await run(() => services().cases.transition(c.id, 'approve'), t('reviewScreen.approved'))) router.back();
  };
  const sendBack = async () => {
    const v = await ask({ title: t('reviewScreen.returnTo'), message: t('reviewScreen.returnBody'), note: 'required', noteLabel: t('common.comment'), confirmLabel: t('reviewScreen.returnTo') });
    if (v && await run(() => services().cases.transition(c.id, 'return_to_agent', { comment: v.note }), t('reviewScreen.returned'))) router.back();
  };
  return (
    <Screen title={t('reviewScreen.title')} sub={c.ref + ' · ' + (c.agentName || '')} back
      footer={a.indexOf('approve') >= 0 || a.indexOf('return_to_agent') >= 0 ? (
        <Row gap={10}>
          {a.indexOf('return_to_agent') >= 0 ? <Grow><Button label={t('reviewScreen.returnTo')} icon="undo" onPress={sendBack} block /></Grow> : null}
          {a.indexOf('approve') >= 0 ? <Grow><Button label={t('reviewScreen.approve')} kind="primary" icon="check" onPress={approve} block /></Grow> : null}
        </Row>
      ) : undefined}>
      {c.reportFinishedOfflineAt ? <Notice tone="info" text={t('gps.finishedOffline', { finished: icm().util.fmtDateTime(c.reportFinishedOfflineAt), sent: icm().util.fmtDateTime(c.reportSubmittedAt) })} /> : null}
      <Card title={t('evidence.title')}>
        <Stack>
          <CheckInLine ci={c.checkIn} />
          <Row wrap gap={6}>
            <Badge label={t('evidence.photos', { n: photos.length, min: c.minPhotos || 0 })} tone={photosOk ? 'success' : 'danger'} />
            {far ? <Badge label={t('evidence.farFromAddress', { max: icm().config.CHECKIN_MAX_DISTANCE_M })} tone="warning" /> : null}
          </Row>
          {photos.length ? <PhotoGrid photos={photos} /> : null}
        </Stack>
      </Card>
      <Card title={t('field.reports')}><ReportView c={c} /></Card>
      {c.returnCount ? <Txt v="xs" c="faint">{t('review.previouslyReturned', { n: c.returnCount })}</Txt> : null}
    </Screen>
  );
}
