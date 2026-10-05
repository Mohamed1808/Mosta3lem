/**
 * The client's cases, grouped by what they need: the client's decision, a provider to
 * accept, work in progress, drafts, done and stopped. Roles that cover both services can
 * narrow the list to one.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { CaseList } from '@/components/case';
import { useApp, useQuery, useT } from '@/state/app';
import { space } from '@/theme';
import { Chips, Loading, Segmented, useDir } from '@/ui/core';
import { inputStyle } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

const GROUPS: Record<string, string[]> = {
  needs: ['delivered', 'awaiting_entity_approval', 'declined', 'expired'],
  waiting: ['submitted', 'awaiting_acceptance'],
  drafts: ['draft'],
  done: ['accepted_by_entity', 'closed'],
  stopped: ['cancelled', 'recalled'],
};
const ORDER = ['needs', 'waiting', 'progress', 'drafts', 'done', 'stopped'];

/** Which group a case belongs to; everything not named is work in progress. */
function clientGroup(status: string) {
  for (const k of Object.keys(GROUPS)) if (GROUPS[k].indexOf(status) >= 0) return k;
  return 'progress';
}

export default function ClientCases() {
  const t = useT();
  const d = useDir();
  const { session } = useApp();
  const role = session?.user?.role || '';
  const covered = ['investigation', 'collection'].filter((s) => icm().wf.entityServes(role, s));
  const [service, setService] = useState<string>('all');
  const [group, setGroup] = useState<string>('needs');
  const [q, setQ] = useState('');
  const data = useQuery<any[]>(() => services().cases.list({ service: service === 'all' ? undefined : service, q }), [service, q]);
  const rows = data.data || [];
  const counts: Record<string, number> = {};
  rows.forEach((c) => { const g = clientGroup(c.status); counts[g] = (counts[g] || 0) + 1; });
  const shown = rows.filter((c) => clientGroup(c.status) === group).slice(0, group === 'done' || group === 'stopped' ? 60 : 200);
  return (
    <Screen title={t('tabs.cases')} pad={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm }}>
        {covered.length > 1 ? (
          <Segmented items={[{ id: 'all', label: t('client.allServices') }].concat(covered.map((s) => ({ id: s, label: t('service.' + s) })))} value={service} onChange={setService} />
        ) : null}
        <TextInput value={q} onChangeText={setQ} placeholder={t('cases.search')} style={[inputStyle, { textAlign: d.align }]} accessibilityLabel={t('cases.search')} />
      </View>
      <Chips items={ORDER.map((g) => ({ id: g, label: t('client.group.' + g), count: counts[g] || 0 }))} value={group} onChange={setGroup} />
      <View style={{ paddingHorizontal: space.lg }}>
        {data.loading && !data.data ? <Loading /> : (
          <CaseList rows={shown} showAgent={false} empty={t('client.groupEmpty.' + group)}
            onOpen={(c) => router.push({ pathname: '/case/[id]', params: { id: c.id } })} />
        )}
      </View>
    </Screen>
  );
}
