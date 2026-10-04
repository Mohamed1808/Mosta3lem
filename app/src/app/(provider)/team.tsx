/**
 * Company team: owner, supervisors and the field agents under each supervisor. The owner
 * manages everyone; a supervisor sees and manages only their own agents.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { FormSheet } from '@/components/sheets';
import { coverageText, num } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Avatar, Badge, Button, Card, Divider, Empty, Grow, Icon, ListItem, Loading, Notice, Row, Stack, Txt } from '@/ui/core';
import { useAction, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

export default function Team() {
  const t = useT();
  const { session } = useApp();
  const q = useQuery<any>(() => (session?.provider?.kind === 'company' ? services().team.structure() : Promise.resolve(null)), [session?.user?.id]);
  const [sheet, setSheet] = useState<{ kind: 'supervisor' | 'agent' | 'move' | 'ownerField'; sup?: string; agent?: any } | null>(null);
  const d = q.data;
  if (!d) return <Screen title={t('nav.team')}>{q.error ? <Notice tone="danger" text={t(q.error.key || 'errors.generic')} /> : <Loading />}</Screen>;
  const owner = d.canManage;
  const activeSups = d.supervisors.filter((s: any) => s.active !== false);
  const agentCount = d.unassigned.length + d.supervisors.reduce((n: number, s: any) => n + s.agents.length, 0);
  return (
    <Screen title={t('nav.team')} sub={owner ? t('team.subtitleOwner', { s: d.supervisors.length, n: agentCount }) : t('team.subtitleSupervisor', { n: agentCount })}>
      <Row wrap gap={8}>
        {owner ? <Button small icon="plus" label={t('team.addSupervisor')} onPress={() => setSheet({ kind: 'supervisor' })} /> : null}
        {activeSups.length ? <Button small kind="primary" icon="plus" label={t('team.addAgent')} onPress={() => setSheet({ kind: 'agent' })} /> : null}
      </Row>
      <Row gap={8} wrap>
        <OrgNode icon="briefcase" label={t('team.owner')} value={d.owners.map((o: any) => o.name).join(t('common.listSep')) || '-'} />
        <OrgNode icon="users" label={t('team.supervisors')} value={num(activeSups.length)} />
        <OrgNode icon="smartphone" label={t('team.fieldAgents')} value={num(agentCount)} />
      </Row>
      {owner ? <OwnerFieldCard d={d} onStart={() => setSheet({ kind: 'ownerField' })} /> : null}
      {owner && !d.supervisors.length ? <Notice tone="info" text={t('team.startHint')} /> : null}
      {d.supervisors.map((s: any) => <SupervisorCard key={s.id} s={s} d={d} onAdd={() => setSheet({ kind: 'agent', sup: s.id })} onMove={(a) => setSheet({ kind: 'move', agent: a })} />)}
      {d.unassigned.length ? (
        <Card title={t('team.unassigned')} pad={false}>
          <View style={{ padding: space.md }}><Txt v="xs" c="faint">{t('team.unassignedHint')}</Txt></View>
          {d.unassigned.map((a: any) => <AgentRow key={a.id} a={a} owner={owner} onMove={() => setSheet({ kind: 'move', agent: a })} />)}
        </Card>
      ) : null}
      {sheet && sheet.kind === 'supervisor' ? <MemberSheet role="provider_supervisor" d={d} onClose={() => setSheet(null)} /> : null}
      {sheet && sheet.kind === 'agent' ? <MemberSheet role="agent" d={d} presetSup={sheet.sup} onClose={() => setSheet(null)} /> : null}
      {sheet && sheet.kind === 'move' ? <MoveSheet agent={sheet.agent} sups={activeSups} onClose={() => setSheet(null)} /> : null}
      {sheet && sheet.kind === 'ownerField' ? <OwnerFieldSheet d={d} onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}

function OrgNode({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Row gap={8} style={{ flexGrow: 1, flexBasis: '30%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10 }}>
      <Icon name={icon} color={colors.accent} />
      <Grow><Txt v="xs" c="faint">{label}</Txt><Txt v="sm" b numberOfLines={1}>{value}</Txt></Grow>
    </Row>
  );
}

function SupervisorCard({ s, d, onAdd, onMove }: { s: any; d: any; onAdd: () => void; onMove: (a: any) => void }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const off = s.active === false;
  const owner = d.canManage;
  return (
    <Card pad={false} style={off ? { opacity: 0.7 } : undefined}>
      <Row gap={10} style={{ padding: space.md }}>
        <Avatar name={s.name} />
        <Grow>
          <Txt b>{s.name}{s.id === d.me.userId ? ' ' + t('team.you') : ''}</Txt>
          <Txt v="xs" c="muted" ltr>{s.phone}</Txt>
          <Txt v="xs" c="faint">{t('team.agentsN', { n: s.agents.length })}</Txt>
        </Grow>
        {off ? <Badge label={t('common.inactive')} tone="muted" /> : (s.services || []).map((x: string) => <Badge key={x} label={t('service.' + x)} tone={x === 'investigation' ? 'accent' : 'pending'} />)}
      </Row>
      <Row wrap gap={8} style={{ paddingHorizontal: space.md, paddingBottom: space.md }}>
        {!off ? <Button small icon="plus" label={t('team.addAgent')} onPress={onAdd} /> : null}
        {owner ? (off
          ? <Button small label={t('team.activate')} onPress={() => run(() => services().team.setActive(s.id, true))} />
          : <Button small kind="ghost" label={t('team.deactivate')} onPress={async () => {
            if (await ask({ title: t('team.deactivate'), message: t('team.deactivateSupervisorBody'), danger: true, confirmLabel: t('team.deactivate') })) await run(() => services().team.setActive(s.id, false));
          }} />) : null}
      </Row>
      <Divider />
      {s.agents.length ? s.agents.map((a: any, i: number) => <View key={a.id}>{i ? <Divider /> : null}<AgentRow a={a} owner={owner} onMove={() => onMove(a)} /></View>) : <Empty text={t('team.noAgents')} icon="users" />}
    </Card>
  );
}

function AgentRow({ a, owner, onMove }: { a: any; owner: boolean; onMove: () => void }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const cov = a.coverageCities || Object.fromEntries(a.governorates.map((g: string) => [g, []]));
  const toggle = async () => {
    if (a.active) {
      if (await ask({ title: t('team.deactivate'), message: t('team.deactivateBody'), danger: true, confirmLabel: t('team.deactivate') })) await run(() => services().team.setActive(a.id, false));
    } else await run(() => services().team.setActive(a.id, true));
  };
  return (
    <View>
      <ListItem chevron={false} left={<Avatar name={a.name} size={32} />}
        title={<Row wrap gap={6}><Txt b>{a.name}</Txt>{a.active ? null : <Badge label={t('common.inactive')} tone="muted" />}</Row>}
        sub={<Stack gap={2}>
          <Txt v="xs" c="muted" numberOfLines={2}>{coverageText(cov, 3)}</Txt>
          <Txt v="xs" c="faint">{t('assign.load')}: {num(a.stats.open)}{a.stats.onTimeRate != null ? ' · ' + t('metric.onTime') + ': ' + icm().util.pct(a.stats.onTimeRate) : ''}</Txt>
        </Stack>} />
      <Row wrap gap={8} style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
        {owner ? <Button small kind="ghost" icon="users" label={t('teamScreen.moveTo')} onPress={onMove} /> : null}
        <Button small kind={a.active ? 'ghost' : 'secondary'} label={a.active ? t('team.deactivate') : t('team.activate')} onPress={toggle} />
      </Row>
    </View>
  );
}

function MemberSheet({ role, d, presetSup, onClose }: { role: 'agent' | 'provider_supervisor'; d: any; presetSup?: string; onClose: () => void }) {
  const t = useT();
  const isAgent = role === 'agent';
  const prov = d.provider;
  const sups = d.supervisors.filter((s: any) => s.active !== false);
  const svcChoices = prov.services.map((s: string) => ({ value: s, label: t('service.' + s) }));
  const fields: any[] = [
    { name: 'name', type: 'text', required: true, label: 'common.name' },
    { name: 'phone', type: 'phone', required: true, label: 'team.mobile' },
    { name: 'nationalId', type: 'nationalId', required: isAgent, label: 'reg.f.nationalId' },
    { name: 'email', type: 'text', label: 'common.email' },
    { name: 'services', type: 'checkboxes', required: true, choices: svcChoices, label: isAgent ? 'team.agentServices' : 'team.supervisorServices' },
  ];
  if (isAgent && d.canManage) fields.push({ name: 'supervisorId', type: 'select', required: true, choices: sups.map((s: any) => ({ value: s.id, label: s.name })), label: 'team.reportsTo' });
  if (isAgent) fields.push({ name: 'coverage', type: 'coverage', required: true, label: 'team.agentCoverage', hint: 'team.agentCoverageHint', govs: prov.governorates, cityLimit: prov.coverageCities });
  const def = { id: 'teamMember', fields };
  const initial: any = { services: prov.services.length === 1 ? prov.services.slice() : [], coverage: {} };
  if (isAgent) initial.supervisorId = presetSup || (sups.length === 1 ? sups[0].id : '');
  return (
    <FormSheet visible title={isAgent ? t('team.addAgent') : t('team.addSupervisor')} def={def} initial={initial}
      submitLabel={isAgent ? t('team.addAgent') : t('team.addSupervisor')}
      validate={(v) => {
        const vals = { ...v, supervisorId: v.supervisorId || (d.canManage ? '' : d.me.userId) };
        return icm().wf.validateTeamMember(role, vals, { services: prov.services, now: icm().clock.now() });
      }}
      submit={(v) => (isAgent ? services().team.addAgent(v) : services().team.addSupervisor(v))}
      success={(v) => (isAgent ? t('team.agentAdded', { name: v.name }) : t('team.supervisorAdded', { name: v.name }))}
      onClose={() => onClose()} />
  );
}

/** The signed-in owner's own field work: on with their areas and load, or a way to start. */
function OwnerFieldCard({ d, onStart }: { d: any; onStart: () => void }) {
  const t = useT();
  const { ask } = useDialog();
  const run = useAction();
  const me = d.owners.find((o: any) => o.id === d.me.userId);
  if (!me) return null;
  const fw = me.fieldWork;
  return (
    <Card>
      <Stack gap={10}>
        <Row gap={10}>
          <Icon name="smartphone" color={fw ? colors.ok : colors.text3} />
          <Grow><Txt b>{t('team.ownerFieldWork')}</Txt></Grow>
          {fw ? <Badge label={t('team.ownerFieldWorkOn')} tone="success" /> : null}
        </Row>
        <Txt v="sm" c="muted">{t('team.ownerFieldWorkBody')}</Txt>
        {fw ? (
          <>
            <Txt v="xs" c="muted">{coverageText(fw.coverageCities, 3)} · {(fw.services || []).map((s: string) => t('service.' + s)).join(t('common.listSep'))}</Txt>
            <Row wrap gap={8}>
              <Button small icon="edit" label={t('common.edit')} onPress={onStart} />
              <Button small kind="ghost" label={t('team.ownerFieldWorkStop')} onPress={async () => {
                if (await ask({ title: t('team.ownerFieldWorkStop'), confirmLabel: t('team.ownerFieldWorkStop') })) await run(() => services().team.setOwnerFieldWork(false), t('team.ownerFieldWorkStopped'));
              }} />
            </Row>
          </>
        ) : <Button small kind="primary" icon="play" label={t('team.ownerFieldWorkStart')} onPress={onStart} style={{ alignSelf: 'flex-start' }} />}
      </Stack>
    </Card>
  );
}

/** Areas and services the owner covers personally, inside the company's coverage. */
function OwnerFieldSheet({ d, onClose }: { d: any; onClose: () => void }) {
  const t = useT();
  const prov = d.provider;
  const me = d.owners.find((o: any) => o.id === d.me.userId) || {};
  const fields: any[] = [
    { name: 'coverage', type: 'coverage', required: true, label: 'team.ownerCoverage', hint: 'team.agentCoverageHint', govs: prov.governorates, cityLimit: prov.coverageCities },
  ];
  if (prov.services.length > 1) fields.unshift({ name: 'services', type: 'checkboxes', required: true, label: 'team.ownerServices', choices: prov.services.map((s: string) => ({ value: s, label: t('service.' + s) })) });
  const initial = me.fieldWork ? { coverage: me.fieldWork.coverageCities, services: me.fieldWork.services } : { coverage: {}, services: prov.services.slice() };
  return (
    <FormSheet visible title={t('team.ownerFieldWork')} def={{ id: 'ownerField', fields }} initial={initial} submitLabel={me.fieldWork ? t('signup.saveChanges') : t('team.ownerFieldWorkStart')}
      validate={(v) => {
        const e: Record<string, string | undefined> = {};
        const c = icm().wf.validateCoverage(v.coverage || {});
        if (c) e.coverage = c;
        if (!(v.services || []).length) e.services = 'errors.serviceRequired';
        return e;
      }}
      submit={(v) => services().team.setOwnerFieldWork(true, { coverage: v.coverage, services: v.services })}
      success={t('team.ownerFieldWorkStarted')} onClose={() => onClose()} />
  );
}

function MoveSheet({ agent, sups, onClose }: { agent: any; sups: any[]; onClose: () => void }) {
  const t = useT();
  const def = { id: 'teamMove', fields: [{ name: 'supervisorId', type: 'select', required: true, label: 'team.reportsTo', choices: sups.map((s: any) => ({ value: s.id, label: s.name })) }] };
  return (
    <FormSheet visible title={t('teamScreen.moveTo') + ': ' + agent.name} def={def} initial={{ supervisorId: agent.supervisorId || '' }}
      submit={(v) => services().team.moveAgent(agent.id, v.supervisorId)} success={t('teamScreen.moved')} onClose={() => onClose()} />
  );
}
