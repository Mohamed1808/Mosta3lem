/**
 * Mobile form renderer for the shared form definitions (prototype/js/config/forms.js and
 * reportForms.js): text, numbers, dates, dropdowns, yes/no, calculated fields, document
 * scans, photos, licences, repeatable rows (references) and on-screen signatures.
 */
import { ReactNode, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { icm } from '@/backend/engine';
import { takePhoto } from '@/lib/camera';
import { useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Badge, Button, Grow, Icon, Row, Segmented, Stack, Txt, useDir } from '@/ui/core';
import { inputStyle, Sheet } from '@/ui/dialogs';
import { DataImage } from './case';

export type Values = Record<string, any>;
export type FormProps = {
  def: any; values: Values; errors?: Record<string, string>; onChange: (v: Values) => void;
  flash?: string[]; onScan?: (field: any) => void; scanning?: string | null;
};

const wf = () => icm().wf;

export function FormView({ def, values, errors = {}, onChange, flash = [], onScan, scanning }: FormProps) {
  const t = useT();
  const set = (name: string, v: any) => onChange({ ...values, [name]: v });
  const sections = def.sections || [{ id: '', fields: def.fields }];
  return (
    <Stack gap={space.xl}>
      {sections.map((sec: any) => {
        const visible = sec.fields.filter((f: any) => wf().isVisible(f, values));
        if (!visible.length) return null;
        return (
          <Stack key={sec.id || 'all'} gap={space.lg}>
            {sec.title ? <Txt v="h3">{t(sec.title)}</Txt> : sec.id ? <Txt v="h3">{t('forms.' + def.id + '.sections.' + sec.id)}</Txt> : null}
            {sec.intro ? <Txt v="sm" c="muted">{t(sec.intro)}</Txt> : null}
            {visible.map((f: any) => (
              <Field key={f.name} f={f} formId={def.id} values={values} value={values[f.name]} error={errors[f.name]} errors={errors}
                onValue={(v) => set(f.name, v)} flashed={flash.indexOf(f.name) >= 0} onScan={onScan} scanning={scanning === f.name} />
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}

function labelOf(f: any, formId: string, t: any) { return f.label ? t(f.label) : t('forms.' + formId + '.' + f.name); }
function optionsOf(f: any, formId: string, t: any): { value: string; label: string }[] {
  if (f.choices) return f.choices;
  if (f.list) return ((icm().store.db.config.lists[f.list] || []) as any[]).map((x) => ({ value: x.id, label: icm().util.label(x) }));
  const base = f.labelBase || ('forms.' + formId + '.' + f.name + 'Opt');
  return (f.options || []).map((o: string) => ({ value: o, label: t(base + '.' + o) }));
}

type FieldProps = {
  f: any; formId: string; values: Values; value: any; error?: string; errors: Record<string, string>;
  onValue: (v: any) => void; flashed?: boolean; onScan?: (f: any) => void; scanning?: boolean;
};

function Field(p: FieldProps) {
  const { f, formId, values, error } = p;
  const t = useT();
  const req = wf().isRequired(f, values);
  const label = labelOf(f, formId, t);
  const head = f.type === 'checkbox' ? null : (
    <Row wrap gap={6}>
      <Txt v="sm" b c="muted">{label}{req ? ' *' : ''}</Txt>
      {f.ocr ? <Badge label={t('ocr.short.' + f.ocr)} tone="pending" /> : null}
      {f.type === 'computed' ? <Badge label={t('forms.calculated')} tone="muted" /> : null}
    </Row>
  );
  return (
    <Stack gap={6}>
      {head}
      <Control {...p} label={label} />
      {f.hint ? <Txt v="xs" c="faint">{t(f.hint, values)}</Txt> : null}
      {error ? <Txt v="xs" c="bad">{t(error)}</Txt> : null}
    </Stack>
  );
}

function Control({ f, formId, values, value, error, errors, onValue, flashed, onScan, scanning, label }: FieldProps & { label: string }) {
  const t = useT();
  const d = useDir();
  const bad = !!error;
  const box = [inputStyle, { borderColor: bad ? colors.bad : flashed ? colors.pend : colors.borderStrong, backgroundColor: flashed ? '#F1F9FB' : colors.surface }];
  switch (f.type) {
    case 'textarea':
      return <TextInput value={value || ''} onChangeText={onValue} multiline style={[...box, { minHeight: 90, textAlignVertical: 'top', textAlign: d.align }]} accessibilityLabel={label} />;
    case 'number':
      return <TextInput value={value == null ? '' : String(value)} onChangeText={(v) => onValue(v.replace(/[^0-9.]/g, ''))} keyboardType="numeric" style={[...box, { textAlign: d.align }]} accessibilityLabel={label} />;
    case 'phone': case 'anyPhone': case 'nationalId': case 'digits':
      return <TextInput value={value || ''} onChangeText={(v) => onValue(v.replace(/[^0-9]/g, ''))} keyboardType={f.type === 'digits' ? 'number-pad' : 'phone-pad'}
        maxLength={f.max || (f.type === 'nationalId' ? 14 : 15)}
        placeholder={f.placeholder || (f.type === 'phone' ? '01XXXXXXXXX' : f.type === 'nationalId' ? t('forms.nidPlaceholder') : '')} style={[...box, { textAlign: 'left', writingDirection: 'ltr' }]} accessibilityLabel={label} />;
    case 'email':
      return <TextInput value={value || ''} onChangeText={(v) => onValue(v.trim())} keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoCorrect={false}
        style={[...box, { textAlign: 'left', writingDirection: 'ltr' }]} accessibilityLabel={label} />;
    case 'checkbox':
      return <CheckRow on={!!value} label={label} onPress={() => onValue(!value)} bad={bad} />;
    case 'date':
      return <TextInput value={value || ''} onChangeText={onValue} placeholder={t('form.datePlaceholder')} keyboardType="numbers-and-punctuation" maxLength={10} style={[...box, { textAlign: 'left', writingDirection: 'ltr' }]} accessibilityLabel={label} />;
    case 'select': case 'governorate':
      return <SelectControl options={f.type === 'governorate' ? optionsOf({ list: 'governorates' }, formId, t) : optionsOf(f, formId, t)} value={value} onValue={onValue} label={label} bad={bad} flashed={flashed} />;
    case 'yesno':
      return <Segmented items={[{ id: 'yes', label: t('common.yes') }, { id: 'no', label: t('common.no') }]} value={value || ''} onChange={onValue} />;
    case 'checkboxes': {
      const arr: string[] = Array.isArray(value) ? value : [];
      return <Row wrap gap={8}>{optionsOf(f, formId, t).map((o) => {
        const on = arr.indexOf(o.value) >= 0;
        return <Pressable key={o.value} onPress={() => onValue(on ? arr.filter((x) => x !== o.value) : arr.concat([o.value]))} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? colors.accent : colors.borderStrong, backgroundColor: on ? colors.accentSoft : colors.surface }}><Txt v="sm" c={on ? 'accent' : 'muted'}>{o.label}</Txt></Pressable>;
      })}</Row>;
    }
    case 'computed': {
      const cv = f.compute(values, { now: icm().clock.now() });
      return <View style={[inputStyle, { backgroundColor: colors.surface2, justifyContent: 'center' }]}><Txt c="muted">{cv == null ? '-' : String(cv)}</Txt></View>;
    }
    case 'ocrDoc': {
      const n = ((icm().config.OCR_DOCS[f.doc] || { fills: [] }).fills || []).length;
      return (
        <Row gap={12} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: bad ? colors.bad : colors.borderStrong, borderRadius: radius.md, padding: space.md, backgroundColor: colors.surface2 }}>
          {value ? <DataImage uri={value} width={72} height={48} /> : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" color={colors.accent} /></View>}
          <Grow>
            <Txt v="sm" b>{t('ocr.doc.' + f.doc)}</Txt>
            <Txt v="xs" c={value ? 'muted' : 'faint'}>{value ? t('ocr.scanned') : t('ocr.hint', { n })}</Txt>
          </Grow>
          <Button small kind={value ? 'secondary' : 'primary'} icon="camera" label={value ? t('ocr.rescan') : t('ocr.scan')} busy={scanning} onPress={() => onScan && onScan(f)} />
        </Row>
      );
    }
    case 'photo':
      return <PhotoControl value={value} onValue={onValue} />;
    case 'license': {
      const lic = value || {};
      return (
        <Stack gap={8}>
          <Segmented items={[{ id: 'yes', label: t('common.yes') }, { id: 'no', label: t('common.no') }]} value={lic.has || ''} onChange={(h) => onValue({ ...lic, has: h })} />
          {lic.has === 'yes' ? (
            <Stack gap={8}>
              <Txt v="xs" b c="muted">{t('forms.licenseNumber')} *</Txt>
              <TextInput value={lic.number || ''} onChangeText={(v) => onValue({ ...lic, number: v })} style={[...box, { textAlign: 'left', writingDirection: 'ltr' }]} accessibilityLabel={t('forms.licenseNumber')} />
              <Txt v="xs" b c="muted">{t('forms.licensePhoto')}</Txt>
              <PhotoControl value={lic.photo} onValue={(ph) => onValue({ ...lic, photo: ph })} />
            </Stack>
          ) : null}
        </Stack>
      );
    }
    case 'repeat': {
      const rows: Values[] = Array.isArray(value) ? value : [];
      const setRow = (i: number, row: Values) => onValue(rows.map((r, j) => (j === i ? row : r)));
      return (
        <Stack gap={10}>
          {rows.map((row, i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, backgroundColor: colors.surface2, gap: 10 }}>
              <Row between>
                <Txt v="sm" b>{t('forms.' + formId + '.' + f.name + 'Row', { n: i + 1 })}</Txt>
                <Pressable onPress={() => onValue(rows.filter((_, j) => j !== i))} hitSlop={8} accessibilityRole="button"><Txt v="sm" c="bad">{t('common.delete')}</Txt></Pressable>
              </Row>
              {f.fields.map((sf: any) => {
                const sub = { ...sf, label: sf.label || 'forms.' + formId + '.' + f.name + 'Fields.' + sf.name, showIf: null, requiredIf: null };
                return <Field key={sf.name} f={sub} formId={formId} values={row} value={row[sf.name]} errors={errors}
                  error={errors[f.name + '.' + i + '.' + sf.name]} onValue={(v) => setRow(i, { ...row, [sf.name]: v })} />;
              })}
            </View>
          ))}
          {!f.max || rows.length < f.max ? <Button small icon="plus" label={t('forms.' + formId + '.' + f.name + 'Add')} onPress={() => onValue(rows.concat([{}]))} style={{ alignSelf: d.start }} /> : null}
        </Stack>
      );
    }
    case 'signature':
      return <SignaturePad value={value} onValue={onValue} bad={bad} />;
    case 'coverage':
      return <CoveragePicker value={value || {}} onValue={onValue} only={f.govs} cityLimit={f.cityLimit} bad={bad} />;
    default:
      return <TextInput value={value || ''} onChangeText={onValue} style={[...box, { textAlign: d.align }]} accessibilityLabel={label} />;
  }
}

/** A tick box with its label, for yes/no agreements and options. */
export function CheckRow({ on, label, onPress, bad, children }: { on: boolean; label?: string; onPress: () => void; bad?: boolean; children?: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={6}>
      <Row gap={10} center={false}>
        <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: on ? colors.accent : bad ? colors.bad : colors.borderStrong, backgroundColor: on ? colors.accent : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          {on ? <Icon name="check" size={14} color="#fff" /> : null}
        </View>
        <Grow>{children || <Txt>{label}</Txt>}</Grow>
      </Row>
    </Pressable>
  );
}

function SelectControl({ options, value, onValue, label, bad, flashed }: { options: { value: string; label: string }[]; value: any; onValue: (v: any) => void; label: string; bad?: boolean; flashed?: boolean }) {
  const t = useT();
  const d = useDir();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => String(o.value) === String(value));
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label}
        style={[inputStyle, { flexDirection: d.row, alignItems: 'center', justifyContent: 'space-between', borderColor: bad ? colors.bad : flashed ? colors.pend : colors.borderStrong, backgroundColor: flashed ? '#F1F9FB' : colors.surface }]}>
        <Txt c={current ? 'text' : 'faint'} style={{ flex: 1 }}>{current ? current.label : t('form.pick')}</Txt>
        <Icon name="chevronDown" size={16} />
      </Pressable>
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        <Stack gap={6}>
          {options.map((o) => {
            const on = String(o.value) === String(value);
            return (
              <Pressable key={o.value} onPress={() => { onValue(o.value); setOpen(false); }}
                style={{ flexDirection: d.row, alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: radius.md, backgroundColor: on ? colors.accentSoft : colors.surface2 }}>
                <Txt b={on} c={on ? 'accent' : 'text'}>{o.label}</Txt>
                {on ? <Icon name="check" color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </Stack>
      </Sheet>
    </>
  );
}

function PhotoControl({ value, onValue }: { value: any; onValue: (v: any) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const grab = async (src: 'camera' | 'library') => {
    setBusy(true);
    try { const url = await takePhoto(src); if (url) onValue(url); } finally { setBusy(false); }
  };
  return (
    <Row gap={10} wrap>
      {value ? <DataImage uri={value} width={72} height={54} /> : null}
      <Button small icon="camera" label={t('field.takePhoto')} onPress={() => grab('camera')} busy={busy} />
      <Button small kind="ghost" label={t('field.choosePhoto')} onPress={() => grab('library')} />
    </Row>
  );
}

/** Finger signature, stored as an SVG data URL. Uses the touch responder props, so no refs. */
function SignaturePad({ value, onValue, bad }: { value: any; onValue: (v: any) => void; bad?: boolean }) {
  const t = useT();
  const [paths, setPaths] = useState<string[]>([]);
  const [live, setLive] = useState('');
  const [width, setWidth] = useState(300);
  const H = 150;
  const point = (e: any) => e.nativeEvent.locationX.toFixed(1) + ' ' + e.nativeEvent.locationY.toFixed(1);
  const finish = () => {
    if (!live) return;
    const all = paths.concat([live]);
    setPaths(all);
    setLive('');
    const w = Math.round(width);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}">${all.map((d) => `<path d="${d}" stroke="#18202b" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
    onValue('data:image/svg+xml;utf8,' + encodeURIComponent(svg));
  };
  const showSaved = value && !paths.length && !live;
  return (
    <Stack gap={6}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => setLive('M' + point(e))} onResponderMove={(e) => setLive((s) => s + ' L' + point(e))}
        onResponderRelease={finish} onResponderTerminate={finish}
        style={{ height: H, borderWidth: 1, borderColor: bad ? colors.bad : colors.borderStrong, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' }}>
        {showSaved ? <DataImage uri={value} width={width - 2} height={H - 2} /> : (
          <Svg width="100%" height={H} pointerEvents="none">
            {paths.map((dd, i) => <Path key={i} d={dd} stroke={colors.text} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
            {live ? <Path d={live} stroke={colors.text} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
          </Svg>
        )}
        {!value && !paths.length && !live ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: H / 2 - 10, alignItems: 'center' }}><Txt v="sm" c="faint">{t('form.signHere')}</Txt></View> : null}
      </View>
      <Row between>
        <Txt v="xs" c="faint">{t('forms.signHint')}</Txt>
        <Pressable onPress={() => { setPaths([]); setLive(''); onValue(''); }} accessibilityRole="button" hitSlop={8}><Txt v="sm" c="accent" b>{t('form.clear')}</Txt></Pressable>
      </Row>
    </Stack>
  );
}

/** Governorates, each optionally narrowed to cities. No city ticked means the whole governorate. */
function CoveragePicker({ value, onValue, only, cityLimit, bad }: { value: Record<string, string[]>; onValue: (v: any) => void; only?: string[]; cityLimit?: Record<string, string[]>; bad?: boolean }) {
  const t = useT();
  const govs = ((icm().store.db.config.lists.governorates || []) as any[]).filter((g) => !only || only.indexOf(g.id) >= 0);
  const toggleGov = (g: string) => {
    const next = { ...value };
    if (next[g]) delete next[g]; else next[g] = [];
    onValue(next);
  };
  const toggleCity = (g: string, c: string) => {
    const list = value[g] || [];
    onValue({ ...value, [g]: list.indexOf(c) >= 0 ? list.filter((x) => x !== c) : list.concat([c]) });
  };
  return (
    <Stack gap={8}>
      {govs.map((g) => {
        const on = !!value[g.id];
        const limit = cityLimit && cityLimit[g.id] && cityLimit[g.id].length ? cityLimit[g.id] : null;
        const cities = (icm().config.citiesOf(g.id) as any[]).filter((c) => !limit || limit.indexOf(c.id) >= 0);
        return (
          <View key={g.id} style={{ borderWidth: 1, borderColor: on ? colors.accent : bad ? colors.bad : colors.border, borderRadius: radius.md, padding: 10, backgroundColor: on ? '#FAFCFF' : colors.surface, gap: 8 }}>
            <Pressable onPress={() => toggleGov(g.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={icm().util.label(g)}>
              <Row gap={10}>
                <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: on ? colors.accent : colors.borderStrong, backgroundColor: on ? colors.accent : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Icon name="check" size={13} color="#fff" /> : null}
                </View>
                <Txt b={on}>{icm().util.label(g)}</Txt>
              </Row>
            </Pressable>
            {on && cities.length ? (
              <Stack gap={6}>
                <Txt v="xs" c="faint">{limit ? t('coverage.limitedHint') : t('coverage.wholeHint')}</Txt>
                <Row wrap gap={6}>
                  {cities.map((c) => {
                    const picked = (value[g.id] || []).indexOf(c.id) >= 0;
                    return (
                      <Pressable key={c.id} onPress={() => toggleCity(g.id, c.id)} accessibilityRole="checkbox" accessibilityState={{ checked: picked }} accessibilityLabel={icm().util.label(c)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: picked ? colors.accent : colors.borderStrong, backgroundColor: picked ? colors.accentSoft : colors.surface }}>
                        <Txt v="xs" c={picked ? 'accent' : 'muted'}>{icm().util.label(c)}</Txt>
                      </Pressable>
                    );
                  })}
                </Row>
              </Stack>
            ) : null}
          </View>
        );
      })}
    </Stack>
  );
}
