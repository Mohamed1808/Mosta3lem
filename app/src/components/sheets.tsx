/** Bottom sheets used from case screens: a form sheet and the field agent picker. */
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { coverageText, errorText, num, pct } from '@/lib/format';
import { useQuery, useT } from '@/state/app';
import { colors, radius } from '@/theme';
import { Badge, Button, Empty, Grow, Icon, Loading, Row, Stack, Txt, useDir } from '@/ui/core';
import { Sheet, useDialog } from '@/ui/dialogs';
import { FormView, Values } from './form';


/** A config form in a sheet. submit() gets the values once they validate. */
export function FormSheet({ visible, title, def, initial, intro, submitLabel, danger, validate, submit, success, onClose }: {
  visible: boolean; title: string; def: any; initial?: Values; intro?: React.ReactNode; submitLabel?: string; danger?: boolean;
  validate?: (v: Values) => Record<string, string | undefined>; submit: (v: Values) => Promise<unknown>; success?: string | ((v: Values) => string); onClose: (saved: boolean) => void;
}) {
  const t = useT();
  const { toast } = useDialog();
  const [values, setValues] = useState<Values>(initial || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const extra = validate ? validate(values) : {};
    const e: Record<string, string> = Object.assign({}, icm().wf.validateForm(def, values, { now: icm().clock.now() }));
    Object.keys(extra).forEach((k) => { if (extra[k]) e[k] = extra[k] as string; });
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true); setErr('');
    try { await submit(values); if (success) toast(typeof success === 'function' ? success(values) : success); setValues(initial || {}); onClose(true); }
    catch (x) { setErr(errorText(x)); }
    finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} title={title} onClose={() => onClose(false)}
      footer={<Row gap={10}><Grow><Button label={t('common.cancel')} onPress={() => onClose(false)} block /></Grow><Grow><Button label={submitLabel || t('common.save')} kind={danger ? 'danger' : 'primary'} onPress={save} busy={busy} block /></Grow></Row>}>
      <Stack>
        {intro}
        <FormView def={def} values={values} errors={errors} onChange={setValues} />
        {err ? <Txt v="sm" c="bad">{err}</Txt> : null}
      </Stack>
    </Sheet>
  );
}

/** Pick a field agent for one or more cases. Agents who cover the cases' governorates and cities come first. */
export function AgentPicker({ visible, caseIds, service, governorate, places, currentAgentId, onClose }: {
  visible: boolean; caseIds: string[]; service: string; governorate?: string; places?: { gov: string; city: string | null }[];
  currentAgentId?: string | null; onClose: (saved: boolean) => void;
}) {
  const t = useT();
  const d = useDir();
  const { toast } = useDialog();
  const [pick, setPick] = useState<string | null>(currentAgentId || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const q = useQuery<any[]>(() => (visible ? services().providers.team(service) : Promise.resolve([])), [visible, service]);
  // An agent covers the cases when their coverage includes each case's governorate and city.
  const where: { gov: string; city: string | null }[] = places && places.length ? places : governorate ? [{ gov: governorate, city: null }] : [];
  const coversAll = (a: any) => where.length > 0 && where.every((pl) => icm().wf.coversPlace(icm().wf.coverageOf(a), pl.gov, pl.city));
  const agents = (q.data || []).filter((a) => a.active).sort((a, b) => {
    const la = coversAll(a) ? 0 : 1, lb = coversAll(b) ? 0 : 1;
    return la - lb || a.stats.open - b.stats.open;
  });
  const save = async () => {
    if (!pick) { setErr(t('assign.pickAgent')); return; }
    setBusy(true); setErr('');
    try { await services().cases.assign(caseIds, pick); toast(t('assign.done', { n: caseIds.length })); onClose(true); }
    catch (x) { setErr(errorText(x)); }
    finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} title={caseIds.length > 1 ? t('assign.routeTitle', { n: caseIds.length }) : t('assign.title')} onClose={() => onClose(false)}
      footer={<Button label={t('assign.confirm')} kind="primary" onPress={save} busy={busy} block />}>
      <Stack gap={8}>
        <Txt v="sm" c="muted">{t('assign.intro')}</Txt>
        {q.loading && !q.data ? <Loading /> : agents.length ? agents.map((a) => {
          const on = pick === a.id;
          const covers = coversAll(a);
          return (
            <Pressable key={a.id} onPress={() => setPick(a.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ flexDirection: d.row, gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : colors.surface }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: on ? colors.accent : colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} /> : null}
              </View>
              <Grow>
                <Row wrap gap={6}><Txt b>{a.name}</Txt>{covers ? <Badge label={t('assign.coversArea')} tone="success" /> : null}</Row>
                <Txt v="xs" c="muted" numberOfLines={2}>{coverageText(a.coverageCities || Object.fromEntries(a.governorates.map((g: string) => [g, []])), 3)}</Txt>
              </Grow>
              <View style={{ alignItems: 'center' }}>
                <Txt b>{num(a.stats.open)}</Txt>
                <Txt v="xs" c="faint">{t('assign.open')}</Txt>
                {a.stats.onTimeRate != null ? <Txt v="xs" c="faint">{pct(a.stats.onTimeRate)}</Txt> : null}
              </View>
            </Pressable>
          );
        }) : <Empty text={t('assign.noAgents')} icon="users" />}
        {err ? <Row gap={6}><Icon name="alert" color={colors.bad} /><Txt v="sm" c="bad">{err}</Txt></Row> : null}
      </Stack>
    </Sheet>
  );
}
