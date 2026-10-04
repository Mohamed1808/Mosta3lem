/** Cases waiting for a field agent. Select several (a route) and give them to one agent. */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { services } from '@/backend/engine';
import { CaseRow } from '@/components/case';
import { AgentPicker } from '@/components/sheets';
import { gov } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Button, Chips, Divider, Empty, Grow, Icon, Loading, Row, Txt, useDir } from '@/ui/core';
import { Screen } from '@/ui/screen';

export default function Assign() {
  const t = useT();
  const d = useDir();
  const { service } = useApp();
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [area, setArea] = useState('');
  const [picking, setPicking] = useState(false);
  const q = useQuery<any[]>(() => services().cases.list({ service, status: ['accepted', 'rework_requested'] }), [service]);
  const rows = q.data || [];
  const areas = Array.from(new Set(rows.map((c) => c.governorate)));
  const shown = rows.filter((c) => !area || c.governorate === area);
  const ids = shown.filter((c) => sel[c.id]).map((c) => c.id);
  return (
    <Screen title={t('assignScreen.title')} sub={t('assign.subtitle')} back pad={false}
      footer={<Button label={ids.length ? t('assign.assignSelected', { n: ids.length }) : t('assignScreen.pick')} kind="primary" icon="route" disabled={!ids.length} onPress={() => setPicking(true)} block />}>
      <View style={{ height: space.sm }} />
      {areas.length > 1 ? <Chips items={[{ id: '', label: t('common.all') }].concat(areas.map((g) => ({ id: g, label: gov(g) })))} value={area} onChange={setArea} /> : null}
      <View style={{ paddingHorizontal: space.lg }}>
        {q.loading && !q.data ? <Loading /> : shown.length ? (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            {shown.map((c, i) => (
              <View key={c.id}>
                {i ? <Divider /> : null}
                <Row gap={0}>
                  <Pressable onPress={() => setSel({ ...sel, [c.id]: !sel[c.id] })} accessibilityRole="checkbox" accessibilityState={{ checked: !!sel[c.id] }} accessibilityLabel={c.ref}
                    style={{ paddingVertical: 18, [d.rtl ? 'paddingRight' : 'paddingLeft']: space.lg }}>
                    <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: sel[c.id] ? colors.accent : colors.borderStrong, backgroundColor: sel[c.id] ? colors.accent : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                      {sel[c.id] ? <Icon name="check" size={14} color="#fff" /> : null}
                    </View>
                  </Pressable>
                  <Grow><CaseRow c={c} onPress={() => router.push({ pathname: '/case/[id]', params: { id: c.id } })} /></Grow>
                </Row>
              </View>
            ))}
          </View>
        ) : <Empty text={t('assign.allAssigned')} icon="check" />}
        {shown.length ? <Txt v="xs" c="faint" style={{ marginTop: space.sm }}>{t('assign.routeHint')}</Txt> : null}
      </View>
      {picking ? <AgentPicker visible caseIds={ids} service={service || 'investigation'} places={shown.filter((c) => sel[c.id] && c.place).map((c) => c.place)}
        onClose={(saved) => { setPicking(false); if (saved) setSel({}); }} /> : null}
    </Screen>
  );
}
