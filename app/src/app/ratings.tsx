/**
 * Ratings and feedback from clients: the score summary for the service, then each rating.
 * Managers (owner, supervisor, individual) can reply publicly, report abusive feedback to
 * the moderators, or dispute a rating through the platform.
 */
import { router } from 'expo-router';

import { icm, services } from '@/backend/engine';
import { CriteriaView, RatingBody, Stars } from '@/components/ratings';
import { num } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { space } from '@/theme';
import { Button, Card, Empty, Grow, Loading, Notice, Row, Segmented, Stack, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

const RATING_REASONS = ['rating_unfair', 'wrong_case', 'abusive', 'other'];

export default function Ratings() {
  const t = useT();
  const { session, service, setService } = useApp();
  const svc = service || session?.provider?.services?.[0] || 'investigation';
  const q = useQuery<any>(async () => ({ ratings: await services().ratings.received(svc), provider: await services().providers.mine() }), [svc]);
  const role = session?.user?.role;
  const canAct = ['provider_admin', 'provider_supervisor', 'freelancer'].indexOf(role) >= 0;
  const svcs: string[] = session?.provider?.services || [];
  const d = q.data;
  const sc = d?.provider?.score?.byService?.[svc];
  const cfg = icm().store.db.config.scoring;
  return (
    <Screen title={t('nav.feedback')} sub={t('providerRatings.subtitle')} back>
      {svcs.length > 1 ? <Segmented items={svcs.map((s) => ({ id: s, label: t('service.' + s) }))} value={svc} onChange={setService} /> : null}
      {!d ? <Loading /> : (
        <>
          <Card title={t('providerRatings.summary')}>
            {sc ? (
              <Stack>
                <Row gap={12}>
                  <Grow>
                    <Row gap={8}><Stars value={sc.avgRating} size={20} /><Txt b ltr>{sc.avgRating != null ? num(sc.avgRating, 1) : '-'}</Txt></Row>
                    <Txt v="sm" c="muted">{sc.isNew ? t('rating.newShort', { n: sc.ratingCount }) : t('rating.count', { n: num(sc.ratingCount) })}</Txt>
                  </Grow>
                  <Stack gap={0} style={{ alignItems: 'center' }}>
                    <Txt v="xs" c="faint">{t('score.label')}</Txt>
                    <Txt v="h2">{sc.score != null ? num(sc.score, 1) : '-'}</Txt>
                  </Stack>
                </Row>
                {sc.isNew ? <Notice tone="info" text={t('providerRatings.newExplain', { n: cfg.minRatings })} /> : null}
                <CriteriaView criteria={sc.criteria} />
                <Txt v="xs" c="faint">{t('providerRatings.weighting', { days: cfg.recencyDays, cap: cfg.entityCapPct })}</Txt>
              </Stack>
            ) : <Txt c="faint">{t('score.none')}</Txt>}
          </Card>
          {d.ratings.length ? d.ratings.map((r: any) => <RatingCard key={r.id} r={r} canAct={canAct} />) : <Empty text={t('providerRatings.none')} icon="star" />}
        </>
      )}
    </Screen>
  );
}

function RatingCard({ r, canAct }: { r: any; canAct: boolean }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const reply = async () => {
    const v = await ask({ title: r.reply ? t('rating.editReply') : t('rating.reply'), message: t('rating.replyHint'), note: 'required', noteLabel: t('rating.replyLabel'), confirmLabel: t('rating.publishReply') });
    if (v) await run(() => services().ratings.reply(r.id, v.note), t('rating.replySaved'));
  };
  const dispute = async () => {
    const v = await ask({
      title: t('dispute.raiseRating'), message: t('dispute.ratingIntro'), optionLabel: t('dispute.reasonLabel'),
      options: RATING_REASONS.map((x) => ({ value: x, label: t('dispute.reason.' + x) })), note: 'required', noteLabel: t('dispute.details'), confirmLabel: t('dispute.submit'),
    });
    if (v) await run(() => services().disputes.open({ kind: 'rating', ratingId: r.id, reason: v.option, details: v.note }), t('dispute.opened'));
  };
  const report = async () => {
    const v = await ask({ title: t('rating.report'), message: t('rating.reportBody'), note: 'required', danger: true, confirmLabel: t('rating.report') });
    if (v) await run(() => services().ratings.flag(r.id, v.note), t('rating.reportedToast'));
  };
  const active = r.status === 'active';
  return (
    <Card style={r.overall <= 2 && active ? { borderColor: '#EFC2BD' } : undefined}>
      <Stack gap={space.md}>
        <RatingBody r={r} />
        {canAct && active ? (
          <Row wrap gap={8}>
            <Button small icon="message" label={r.reply ? t('rating.editReply') : t('rating.reply')} onPress={reply} />
            {!r.dispute || r.dispute.status !== 'open'
              ? <Button small icon="scale" label={t('rating.dispute')} onPress={dispute} />
              : <Button small kind="ghost" icon="scale" label={t('dispute.openBadge')} onPress={() => router.push({ pathname: '/dispute/[id]', params: { id: r.dispute.id } })} />}
            {r.feedback && !r.flagged && !r.hidden ? <Button small kind="ghost" icon="flag" label={t('rating.report')} onPress={report} /> : null}
          </Row>
        ) : null}
      </Stack>
    </Card>
  );
}
