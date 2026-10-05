/**
 * Bulk upload: many cases from one Excel or CSV file. Get the template, pick the file (or
 * try the 30-row demo file), fix or leave out rows with errors, then create a batch of
 * drafts; providers are chosen on the batch screen.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { icm, services } from '@/backend/engine';
import { CheckRow } from '@/components/form';
import { pickSpreadsheet, shareWorkbook } from '@/lib/excel';
import { errorText, num } from '@/lib/format';
import { useApp, useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Badge, Button, Card, Divider, Notice, Row, Segmented, Stack, Txt, useDir } from '@/ui/core';
import { inputStyle, Sheet, useDialog } from '@/ui/dialogs';
import { Screen } from '@/ui/screen';

// The columns a client can correct on the phone, as on the web.
const EDIT_COLS: Record<string, string[]> = {
  investigation: ['full_name', 'national_id', 'mobile', 'inquiry_types', 'governorate', 'city', 'street'],
  collection: ['full_name', 'national_id', 'mobile', 'governorate', 'city', 'street', 'contract_number', 'product_type', 'overdue_amount', 'days_past_due'],
};

type Row_ = { rowNo: number; raw: Record<string, string>; excluded: boolean; valid: boolean; errors: Record<string, string> };

export default function Bulk() {
  const t = useT();
  const d = useDir();
  const { session } = useApp();
  const { ask, toast } = useDialog();
  const role = session?.user?.role || '';
  const covered = ['investigation', 'collection'].filter((s) => icm().wf.entityServes(role, s));
  const [service, setService] = useState<string>(covered[0]);
  const [rows, setRows] = useState<Row_[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [name, setName] = useState('');
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [defaults, setDefaults] = useState<any>({ periodDays: String(icm().store.db.config.pricing.defaultCollectionDays || 30), settlementMode: 'none', maxDiscountPct: '' });
  const [busy, setBusy] = useState<string | null>(null);

  const colLabel = (c: string) => { const k = 'bulk.col.' + c; const v = t(k); return v === k ? c : v; };
  const load = async (what: 'file' | 'demo') => {
    setBusy(what);
    try {
      const picked = what === 'file' ? await pickSpreadsheet() : { name: t('client.demoFileName'), rows: await services().batches.demoRows(service) };
      if (!picked) return;
      const parsed = await services().batches.parseRows(picked.rows, service);
      setRows(parsed);
      setFileName(picked.name);
      if (!name) setName(picked.name.replace(/\.[^.]+$/, ''));
    } catch (e) {
      toast(errorText(e), 'danger');
    } finally { setBusy(null); }
  };
  const revalidate = async (next: Row_[]) => setRows(await services().batches.validateRows(service, next, defaults));
  const switchService = (s: string) => { setService(s); setRows(null); setFileName(''); };

  const active = (rows || []).filter((r) => !r.excluded);
  const bad = active.filter((r) => !r.valid);
  const excluded = (rows || []).length - active.length;
  const shown = (rows || []).filter((r) => !onlyErrors || !r.valid);

  const create = async () => {
    const n = active.length;
    if (!(await ask({ title: t('bulk.confirmTitle'), message: t('bulk.confirmBody', { n }), confirmLabel: t('bulk.create', { n }) }))) return;
    setBusy('create');
    try {
      const b: any = await services().batches.create(service, name, rows, defaults);
      toast(t('bulk.created', { ref: b.ref }));
      router.replace({ pathname: '/batch/[id]', params: { id: b.id } });
    } catch (e) { toast(errorText(e), 'danger'); } finally { setBusy(null); }
  };

  const editRow = editing != null && rows ? rows[editing] : null;
  return (
    <Screen title={t('nav.bulkUpload')} sub={t('bulk.subtitle')} back>
      {covered.length > 1 ? <Segmented items={covered.map((s) => ({ id: s, label: t('service.' + s) }))} value={service} onChange={switchService} /> : null}

      <Card title={t('client.bulkGetFile')}>
        <Stack gap={10}>
          <Txt v="sm" c="muted">{t('bulk.templateHint')}</Txt>
          <Button icon="download" label={t('bulk.downloadTemplate')} busy={busy === 'template'} onPress={async () => {
            setBusy('template');
            try { await shareWorkbook(service + '-bulk-template.xlsx', await services().batches.templateSheets(service), t('bulk.downloadTemplate')); }
            catch (e) { toast(errorText(e), 'danger'); } finally { setBusy(null); }
          }} />
        </Stack>
      </Card>

      <Card title={t('bulk.step2')}>
        <Stack gap={10}>
          <Button kind="primary" icon="upload" label={t('client.pickFile')} busy={busy === 'file'} onPress={() => load('file')} />
          <Button kind="ghost" label={t('client.tryDemo')} busy={busy === 'demo'} onPress={() => load('demo')} />
          {fileName && rows ? <Txt v="sm" c="muted">{t('bulk.loaded', { name: fileName, n: rows.length })}</Txt> : null}
        </Stack>
      </Card>

      {rows ? (
        <Card title={t('bulk.step3')} pad={false}>
          <Stack style={{ padding: space.lg }} gap={10}>
            <Row wrap gap={6}>
              <Badge label={t('bulk.validRows', { n: active.length - bad.length })} tone="success" />
              {bad.length ? <Badge label={t('bulk.errorRows', { n: bad.length })} tone="danger" /> : null}
              {excluded ? <Badge label={t('bulk.excludedRows', { n: excluded })} tone="muted" /> : null}
            </Row>
            <Segmented items={[{ id: 'all', label: t('common.all') }, { id: 'errors', label: t('bulk.onlyErrors') }]} value={onlyErrors ? 'errors' : 'all'} onChange={(v) => setOnlyErrors(v === 'errors')} />
            <Txt v="xs" c="faint">{t('client.fixHint')}</Txt>
          </Stack>
          {shown.map((r) => {
            const idx = rows.indexOf(r);
            return (
              <View key={r.rowNo}>
                <Divider />
                <Pressable onPress={() => setEditing(idx)} accessibilityRole="button" accessibilityLabel={t('bulk.row') + ' ' + r.rowNo}
                  style={({ pressed }) => ({ padding: space.md, paddingHorizontal: space.lg, backgroundColor: pressed ? colors.surface2 : 'transparent', opacity: r.excluded ? 0.5 : 1 })}>
                  <Row between>
                    <Txt v="sm" b numberOfLines={1} style={{ flex: 1 }}>{t('bulk.row')} {r.rowNo} · {r.raw.full_name || '-'}</Txt>
                    {r.excluded ? <Badge label={t('client.leftOut')} tone="muted" /> : r.valid ? <Badge label={t('bulk.ok')} tone="success" /> : <Badge label={t('client.fix')} tone="danger" />}
                  </Row>
                  {!r.valid && !r.excluded ? Object.keys(r.errors).map((k) => <Txt key={k} v="xs" c="bad">{colLabel(k)}: {t(r.errors[k])}</Txt>) : null}
                </Pressable>
              </View>
            );
          })}
        </Card>
      ) : null}

      {rows ? (
        <Card title={t('bulk.step4')}>
          <Stack gap={10}>
            <Txt v="sm" b c="muted">{t('bulk.batchName')}</Txt>
            <TextInput value={name} onChangeText={setName} placeholder={t('bulk.batchNameHint')} style={[inputStyle, { textAlign: d.align }]} accessibilityLabel={t('bulk.batchName')} />
            {service === 'collection' ? (
              <>
                <Txt v="sm" b c="muted">{t('bulk.periodDays')}</Txt>
                <TextInput value={defaults.periodDays} onChangeText={(v) => setDefaults({ ...defaults, periodDays: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" style={[inputStyle, { textAlign: d.align }]} accessibilityLabel={t('bulk.periodDays')} />
                <Txt v="sm" b c="muted">{t('forms.collectionRequest.settlementMode')}</Txt>
                <Segmented items={['none', 'discount', 'instalments'].map((m) => ({ id: m, label: t('forms.collectionRequest.settlement.' + m) }))} value={defaults.settlementMode} onChange={(m) => setDefaults({ ...defaults, settlementMode: m })} />
                {defaults.settlementMode === 'discount' ? (
                  <>
                    <Txt v="sm" b c="muted">{t('forms.collectionRequest.maxDiscountPct')}</Txt>
                    <TextInput value={defaults.maxDiscountPct} onChangeText={(v) => setDefaults({ ...defaults, maxDiscountPct: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" style={[inputStyle, { textAlign: d.align }]} accessibilityLabel={t('forms.collectionRequest.maxDiscountPct')} />
                  </>
                ) : null}
              </>
            ) : null}
            {bad.length ? <Notice tone="danger" text={t('bulk.fixBeforeCreate', { n: bad.length })} /> : null}
            <Button kind="primary" icon="layers" block label={t('bulk.create', { n: num(active.length) })} disabled={!!bad.length || !active.length} busy={busy === 'create'} onPress={create} />
          </Stack>
        </Card>
      ) : null}

      {editRow ? (
        <Sheet visible title={t('bulk.row') + ' ' + editRow.rowNo} onClose={() => setEditing(null)}
          footer={<Button kind="primary" block label={t('client.recheck')} onPress={async () => { await revalidate(rows!); setEditing(null); }} />}>
          <Stack gap={12}>
            <CheckRow on={!editRow.excluded} label={t('bulk.include')} onPress={() => revalidate(rows!.map((r, i) => (i === editing ? { ...r, excluded: !r.excluded } : r)))} />
            {EDIT_COLS[service].map((c) => (
              <Stack key={c} gap={4}>
                <Txt v="xs" b c={editRow.errors[c] ? 'bad' : 'muted'}>{colLabel(c)}</Txt>
                <TextInput value={editRow.raw[c] || ''} accessibilityLabel={colLabel(c)}
                  onChangeText={(v) => setRows(rows!.map((r, i) => (i === editing ? { ...r, raw: { ...r.raw, [c]: v } } : r)))}
                  style={[inputStyle, { borderColor: editRow.errors[c] ? colors.bad : colors.borderStrong, borderRadius: radius.md, textAlign: d.align }]} />
                {editRow.errors[c] ? <Txt v="xs" c="bad">{t(editRow.errors[c])}</Txt> : null}
              </Stack>
            ))}
          </Stack>
        </Sheet>
      ) : null}
    </Screen>
  );
}
