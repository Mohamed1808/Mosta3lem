/**
 * Home. Owners, supervisors and individual providers see their workspace KPIs and what
 * needs attention; field agents see their tasks by due date.
 */
import { router } from 'expo-router';
import { View } from 'react-native';

import { services } from '@/backend/engine';
import { CaseList } from '@/components/case';
import { DocsAlert } from '@/components/settings';
import { money, num, pct } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { space } from '@/theme';
import { Card, Kpi, ListItem, Loading, Notice, Row, Segmented, Stack, Txt, Icon, Divider } from '@/ui/core';
import { Screen } from '@/ui/screen';

const WORKING = ['assigned', 'in_field', 'returned_to_agent', 'active'];

export default function Home() {
  const t = useT();
  const { session } = useApp();
  const role = session?.user?.role;
  return (
    <Screen title={t('home.hello', { name: (session?.user?.name || '').split(' ')[0] })} sub={session?.provider?.name}>
      {role === 'agent' ? <AgentHome /> : <ManagerHome />}
    </Screen>
  );
}

function ManagerHome() {
  const t = useT();
  const { session, service, setService } = useApp();
  const role = session?.user?.role;
  const q = useQuery<any>(() => services().analytics.providerDashboard(service), [service]);
  const mine = useQuery<any[]>(() => (role === 'freelancer' ? services().cases.agentTasks() : Promise.resolve([])), [role]);
  const d = q.data;
  const services_: string[] = session?.provider?.services || [];
  const company = session?.provider?.kind === 'company';
  const inv = service === 'investigation';
  const enf = session?.provider?.enforcement?.level;
  const myTasks = (mine.data || []).filter((c) => WORKING.indexOf(c.status) >= 0);
  return (
    <>
      {services_.length > 1 ? (
        <Stack gap={6}>
          <Txt v="sm" c="muted">{t('home.workspace')}</Txt>
          <Segmented items={services_.map((s) => ({ id: s, label: t('service.' + s) }))} value={service || ''} onChange={setService} />
        </Stack>
      ) : null}
      {enf && enf !== 'none' ? <Notice tone={enf === 'warned' ? 'warning' : 'danger'} icon="shield" text={t('enforcement.notice.' + enf)} /> : null}
      <DocsAlert />
      {!d ? <Loading /> : (
        <>
          <Row wrap gap={10}>
            <Kpi label={t('kpi.newOffers')} value={num(d.newOffers)} tone={d.newOffers ? 'warn' : undefined} onPress={() => router.navigate('/offers')} />
            <Kpi label={t('kpi.openCases')} value={num(d.open)} onPress={() => router.navigate('/cases')} />
            <Kpi label={t('kpi.dueToday')} value={num(d.dueToday)} tone={d.dueToday ? 'warn' : undefined} />
            <Kpi label={t('kpi.slaAtRisk')} value={num(d.atRisk)} tone={d.atRisk ? 'warn' : undefined} />
            <Kpi label={t('kpi.slaBreached')} value={num(d.breached)} tone={d.breached ? 'bad' : undefined} />
            <Kpi label={t('metric.onTime')} value={pct(d.onTimeRate)} />
            {inv ? <Kpi label={t('kpi.rejectionRate')} value={pct(d.rejectionRate)} /> : <Kpi label={t('kpi.recoveredMonth')} value={money(d.recoveredThisMonth)} tone="ok" />}
            <Kpi label={t('score.label')} value={d.score && d.score.score != null ? num(d.score.score, 1) : '-'}
              sub={d.score ? (d.score.isNew ? t('rating.newShort', { n: d.score.ratingCount }) : t('rating.avgShort', { avg: num(d.score.avgRating, 1), n: d.score.ratingCount })) : undefined} />
            <Kpi label={t('kpi.earningsMonth')} value={money(d.earningsThisMonth)} />
          </Row>
          <Card title={t('home.shortcuts')} pad={false}>
            {(() => {
              const items = [
                d.newOffers ? { key: 'offers', icon: 'inbox', title: t('kpi.newOffers'), n: d.newOffers, go: () => router.navigate('/offers') } : null,
                company && d.unassigned ? { key: 'assign', icon: 'route', title: t('home.toAssign'), n: d.unassigned, go: () => router.push('/assign') } : null,
                company && d.reviewQueue ? { key: 'review', icon: 'checkSquare', title: t('home.toReview'), n: d.reviewQueue, go: () => router.push('/review-queue') } : null,
              ].filter(Boolean) as { key: string; icon: string; title: string; n: number; go: () => void }[];
              if (!items.length) return <View style={{ padding: space.lg }}><Txt v="sm" c="faint">{t('home.allClear')}</Txt></View>;
              return items.map((it, i) => (
                <View key={it.key}>{i ? <Divider /> : null}<ListItem left={<Icon name={it.icon} />} title={it.title} right={<Txt b c="warn">{num(it.n)}</Txt>} onPress={it.go} /></View>
              ));
            })()}
          </Card>
          {role === 'freelancer' ? (
            <Stack gap={8}>
              <Txt v="h3">{t('tabs.tasks')}</Txt>
              <CaseList rows={myTasks} empty={t('home.noTasks')} showAgent={false} onOpen={(c) => router.push({ pathname: '/case/[id]', params: { id: c.id } })} />
            </Stack>
          ) : null}
        </>
      )}
    </>
  );
}

function AgentHome() {
  const t = useT();
  const q = useQuery<any>(async () => ({ tasks: await services().cases.agentTasks(), clock: await services().demo.clock() }));
  if (!q.data) return <Loading />;
  const now = q.data.clock.now, end = icmEndOfDay(now);
  const working = q.data.tasks.filter((c: any) => WORKING.indexOf(c.status) >= 0);
  const waiting = q.data.tasks.filter((c: any) => ['submitted_for_review', 'awaiting_entity_approval'].indexOf(c.status) >= 0);
  const overdue = working.filter((c: any) => c.dueAt && c.dueAt < now);
  const today = working.filter((c: any) => c.dueAt && c.dueAt >= now && c.dueAt <= end);
  const upcoming = working.filter((c: any) => !c.dueAt || c.dueAt > end);
  const open = (c: any) => router.push({ pathname: '/case/[id]', params: { id: c.id } });
  const section = (title: string, rows: any[]) => (
    <Stack gap={8}>
      <Txt v="sm" b c="muted">{title} · {rows.length}</Txt>
      <CaseList rows={rows} empty={t('home.noTasks')} onOpen={open} showAgent={false} />
    </Stack>
  );
  return (
    <>
      <Row wrap gap={10}>
        <Kpi label={t('home.overdue')} value={num(overdue.length)} tone={overdue.length ? 'bad' : undefined} />
        <Kpi label={t('home.today')} value={num(today.length)} tone={today.length ? 'warn' : undefined} />
      </Row>
      {section(t('home.overdue'), overdue)}
      {section(t('home.today'), today)}
      {section(t('home.upcoming'), upcoming)}
      {waiting.length ? section(t('home.waiting'), waiting) : null}
    </>
  );
}

function icmEndOfDay(ms: number) { const d = new Date(ms); d.setHours(23, 59, 59, 999); return d.getTime(); }
