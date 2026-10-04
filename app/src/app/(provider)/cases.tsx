/** Cases: the company's cases by status (owners, supervisors, individuals) or an agent's own tasks. */
import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { CaseList } from '@/components/case';
import { useApp, useQuery, useT } from '@/state/app';
import { space } from '@/theme';
import { Chips, Loading, useDir } from '@/ui/core';
import { inputStyle } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

const BOARD: Record<string, string[]> = {
  investigation: ['accepted', 'rework_requested', 'assigned', 'in_field', 'returned_to_agent', 'submitted_for_review', 'delivered'],
  collection: ['accepted', 'assigned', 'active', 'awaiting_entity_approval'],
};
const WORKING = ['assigned', 'in_field', 'returned_to_agent', 'active', 'accepted', 'rework_requested'];
const WAITING = ['submitted_for_review', 'awaiting_entity_approval', 'delivered'];

export default function Cases() {
  const t = useT();
  const d = useDir();
  const { session, service } = useApp();
  const agent = session?.user?.role === 'agent';
  const [filter, setFilter] = useState<string>(agent ? 'todo' : 'open');
  const [q, setQ] = useState('');
  const data = useQuery<any[]>(() => (agent ? services().cases.agentTasks() : services().cases.list({ service, q })), [service, q, agent]);
  const rows = (data.data || []).filter((c) => c.status !== 'awaiting_acceptance');
  const terminal = (c: any) => icm().wf.isTerminal(c.status);
  const open = (c: any) => router.push({ pathname: '/case/[id]', params: { id: c.id } });

  let chips: { id: string; label: string; count?: number }[];
  let shown: any[];
  if (agent) {
    const groups: Record<string, any[]> = {
      todo: rows.filter((c) => WORKING.indexOf(c.status) >= 0),
      waiting: rows.filter((c) => WAITING.indexOf(c.status) >= 0),
      done: rows.filter((c) => terminal(c) || c.status === 'accepted_by_entity'),
    };
    chips = [
      { id: 'todo', label: t('cases.todo'), count: groups.todo.length },
      { id: 'waiting', label: t('home.waiting'), count: groups.waiting.length },
      { id: 'done', label: t('cases.closed'), count: groups.done.length },
    ];
    shown = groups[filter] || [];
  } else {
    const statuses = BOARD[service || 'investigation'];
    const openRows = rows.filter((c) => !terminal(c));
    chips = [{ id: 'open', label: t('cases.all'), count: openRows.length }]
      .concat(statuses.map((s) => ({ id: s, label: t('status.' + s), count: rows.filter((c) => c.status === s).length })))
      .concat([{ id: 'closed', label: t('cases.closed'), count: rows.filter(terminal).length }]);
    shown = filter === 'open' ? openRows : filter === 'closed' ? rows.filter(terminal).slice(0, 40) : rows.filter((c) => c.status === filter);
  }

  return (
    <Screen title={agent ? t('tabs.tasks') : t('tabs.cases')} pad={false}>
      {!agent ? (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
          <TextInput value={q} onChangeText={setQ} placeholder={t('cases.search')} style={[inputStyle, { textAlign: d.align }]} accessibilityLabel={t('cases.search')} />
        </View>
      ) : <View style={{ height: space.sm }} />}
      <Chips items={chips} value={filter} onChange={setFilter} />
      <View style={{ paddingHorizontal: space.lg }}>
        {data.loading && !data.data ? <Loading /> : <CaseList rows={shown} onOpen={open} empty={t('cases.none')} showAgent={!agent} />}
      </View>
    </Screen>
  );
}
