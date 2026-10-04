/** Case building blocks shared by the provider screens. */
import { Image, Linking, Pressable, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { icm } from '@/backend/engine';
import { bucket, dateTime, money, placeText, slaInfo, types } from '@/lib/format';
import { useT } from '@/state/app';
import { colors, radius, space } from '@/theme';
import { Badge, Divider, Grow, Icon, ListItem, Row, Stack, StatusBadge, Txt } from '@/ui/core';


export function SlaBadge({ c }: { c: any }) {
  const s = slaInfo(c);
  return s ? <Badge label={s.text} tone={s.tone} dot /> : null;
}

/** One case in a list. */
export function CaseRow({ c, onPress, showAgent = true }: { c: any; onPress?: () => void; showAgent?: boolean }) {
  const t = useT();
  const name = c.customer && c.customer.name;
  const what = c.service === 'investigation' ? types(c.inquiryTypes) : bucket(c.bucket);
  return (
    <ListItem onPress={onPress}
      title={<Row between><Txt mono b v="sm">{c.ref}</Txt><SlaBadge c={c} /></Row>}
      sub={<Stack gap={4} style={{ marginTop: 4 }}>
        <Txt numberOfLines={1}>{name || t('mask.hidden')}</Txt>
        <Txt v="xs" c="muted" numberOfLines={1}>{placeText(c.place, c.governorate)} · {what}{c.entityName ? ' · ' + c.entityName : ''}</Txt>
        <Row wrap gap={6}><StatusBadge status={c.status} />{showAgent && c.agentName ? <Txt v="xs" c="faint">{c.agentName}</Txt> : null}{c.disputed ? <Badge label={t('dispute.flag')} tone="danger" /> : null}</Row>
      </Stack>} />
  );
}

export function CaseList({ rows, onOpen, empty, showAgent }: { rows: any[]; onOpen: (c: any) => void; empty: string; showAgent?: boolean }) {
  if (!rows.length) return <View style={{ padding: space.xl }}><Txt c="faint" center>{empty}</Txt></View>;
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      {rows.map((c, i) => <View key={c.id}>{i ? <Divider /> : null}<CaseRow c={c} onPress={() => onOpen(c)} showAgent={showAgent} /></View>)}
    </View>
  );
}

/** Price or fee terms of a case, as the provider sees it. */
export function priceText(c: any, t: (k: string, p?: any) => string) {
  if (typeof c.price === 'number') return money(c.price);
  if (c.price) return t('case.feeTerms', { pct: c.price.feePct, fixed: money(c.price.fixedFee) });
  return '-';
}

/** An image stored as a data URL: photos and scans are JPEG, signatures and demo images SVG. */
export function DataImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  if (!uri) return null;
  if (uri.indexOf('data:image/svg+xml') === 0) {
    const raw = uri.slice(uri.indexOf(',') + 1);
    const xml = uri.indexOf(';base64,') > 0 ? atob(raw) : decodeURIComponent(raw);
    return <View style={{ width, height, borderRadius: 6, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }}><SvgXml xml={xml} width={width} height={height} /></View>;
  }
  return <Image source={{ uri }} style={{ width, height, borderRadius: 6, borderWidth: 1, borderColor: colors.border }} resizeMode="cover" />;
}

// ---------------------------------------------------------------- report view
function optLabel(t: any, form: any, f: any, v: string) { return t((f.labelBase || ('forms.' + form.id + '.' + f.name + 'Opt')) + '.' + v); }

function Answer({ form, f, v }: { form: any; f: any; v: any }) {
  const t = useT();
  if (v == null || v === '') return <Txt v="sm">-</Txt>;
  switch (f.type) {
    case 'yesno': return <Txt v="sm">{t('common.' + v)}</Txt>;
    case 'select': return <Txt v="sm">{optLabel(t, form, f, v)}</Txt>;
    case 'number': case 'computed': return <Txt v="sm">{icm().util.num(+v)}</Txt>;
    case 'date': return <Txt v="sm">{icm().util.fmtDate(new Date(v).getTime())}</Txt>;
    case 'signature': case 'photo': return <DataImage uri={v} width={f.type === 'signature' ? 180 : 96} height={f.type === 'signature' ? 60 : 72} />;
    case 'license': return <Txt v="sm">{v.has === 'yes' ? v.number || '-' : t('common.no')}</Txt>;
    case 'repeat': return (
      <Stack gap={4}>{(v as any[]).map((row, i) => (
        <Txt key={i} v="sm">{f.fields.map((sf: any) => (row[sf.name] ? (sf.type === 'select' ? optLabel(t, form, sf, row[sf.name]) : row[sf.name]) : null)).filter(Boolean).join(' · ')}</Txt>
      ))}</Stack>
    );
    default: return <Txt v="sm">{String(v)}</Txt>;
  }
}

/** The submitted report answers, section by section, with scanned documents first. */
export function ReportView({ c }: { c: any }) {
  const t = useT();
  const wf = icm().wf, C = icm().config;
  const typesList: string[] = c.inquiryTypes || [];
  if (!typesList.some((tp) => c.report && c.report[tp])) return <Txt v="sm" c="faint">{t('evidence.noReport')}</Txt>;
  return (
    <Stack gap={space.lg}>
      {typesList.map((tp) => {
        const form = C.REPORT_FORMS[tp], vals = (c.report || {})[tp] || {};
        const sections = form.sections || [{ id: '', fields: form.fields }];
        const docs = wf.formFields(form).filter((f: any) => f.type === 'ocrDoc' && vals[f.name]);
        return (
          <Stack key={tp} gap={space.md}>
            <Txt v="h3">{types([tp])}</Txt>
            {docs.length ? <Row wrap gap={10}>{docs.map((f: any) => <Stack key={f.name} gap={4}><DataImage uri={vals[f.name]} width={120} height={76} /><Txt v="xs" c="faint">{t('ocr.doc.' + f.doc)}</Txt></Stack>)}</Row> : null}
            {sections.map((sec: any) => {
              const fields = sec.fields.filter((f: any) => wf.isVisible(f, vals) && f.type !== 'ocrDoc');
              if (!fields.length) return null;
              return (
                <Stack key={sec.id || 'all'} gap={8}>
                  {sec.id ? <Txt v="sm" b c="muted">{t('forms.' + form.id + '.sections.' + sec.id)}</Txt> : null}
                  {fields.map((f: any) => (f.type === 'repeat' ? (
                    <Answer key={f.name} form={form} f={f} v={vals[f.name]} />
                  ) : (
                    <Row key={f.name} center={false} gap={space.md}>
                      <Txt v="sm" c="muted" style={{ width: '42%' }}>{t('forms.' + form.id + '.' + f.name)}</Txt>
                      <Grow><Answer form={form} f={f} v={vals[f.name]} /></Grow>
                    </Row>
                  )))}
                </Stack>
              );
            })}
          </Stack>
        );
      })}
    </Stack>
  );
}

/**
 * Check-in summary: time, distance to the address when the address location is confirmed,
 * GPS accuracy, where the location came from, warnings, and a link to see it on a map.
 */
export function CheckInLine({ ci }: { ci: any }) {
  const t = useT();
  if (!ci) return <Txt v="sm" c="faint">{t('evidence.notCheckedIn')}</Txt>;
  const U = icm().util, max = icm().config.CHECKIN_MAX_DISTANCE_M;
  const measured = ci.distanceM != null;
  const far = measured && ci.distanceM > max;
  const warn = far || ci.outsideArea;
  const label = measured ? t('evidence.checkedInAt', { time: U.fmtTime(ci.at), distance: U.num(ci.distanceM) }) : t('gps.checkedIn', { time: U.fmtTime(ci.at) });
  return (
    <Stack gap={4}>
      <Badge label={label} tone={warn ? 'warning' : 'success'} dot />
      <Txt v="xs" c="muted">
        {(ci.source === 'device' ? t('gps.fromPhone') : t('gps.simulated')) + (ci.accuracyM != null ? ' · ' + t('gps.accuracy', { n: U.num(ci.accuracyM) }) : '')}
      </Txt>
      {ci.lat != null ? (
        <Pressable onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + ci.lat + ',' + ci.lng)} accessibilityRole="link" hitSlop={6}>
          <Txt v="xs" c="accent" mono ltr>{ci.lat.toFixed(5) + ', ' + ci.lng.toFixed(5)} · {t('gps.openMap')}</Txt>
        </Pressable>
      ) : null}
      {ci.sentAt ? <Txt v="xs" c="muted">{t('gps.sentLater', { time: U.fmtDateTime(ci.sentAt) })}</Txt> : null}
      {far ? <Txt v="xs" c="warn">{t('evidence.farFromAddress', { max })}</Txt> : null}
      {ci.outsideArea ? <Txt v="xs" c="warn">{t('gps.outsideArea')}</Txt> : null}
      {!measured && ci.addressApprox && !ci.outsideArea ? <Txt v="xs" c="faint">{t('gps.addressApprox')}</Txt> : null}
    </Stack>
  );
}

/** Timeline entries, newest first. */
export function Timeline({ c }: { c: any }) {
  const t = useT();
  const items = (c.timeline || []).slice().reverse();
  if (!items.length) return <Txt v="sm" c="faint">{t('timeline.empty')}</Txt>;
  return (
    <Stack gap={12}>
      {items.map((e: any) => (
        <Row key={e.id} center={false} gap={10}>
          <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: e.to ? colors.accent : colors.borderStrong }} />
          <Grow>
            <Txt v="sm" b>{t('timeline.' + e.action)}</Txt>
            <Txt v="xs" c="faint">{dateTime(e.at)} · {e.actorName}</Txt>
            {e.note ? <Txt v="xs" c="muted">{e.note}</Txt> : null}
          </Grow>
        </Row>
      ))}
    </Stack>
  );
}

export function PhotoGrid({ photos, onRemove }: { photos: any[]; onRemove?: (id: string) => void }) {
  const t = useT();
  return (
    <Row wrap gap={8}>
      {photos.map((p) => (
        <View key={p.id} style={{ width: 104, gap: 2 }}>
          {p.dataUrl ? <DataImage uri={p.dataUrl} width={104} height={78} /> : (
            <View style={{ width: 104, height: 78, borderRadius: 6, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}><Icon name={p.hidden ? 'lock' : 'camera'} color={colors.text3} /></View>
          )}
          <Txt v="xs" c="faint" numberOfLines={1}>{p.label ? t('evidence.label.' + p.label) : dateTime(p.at)}</Txt>
          {onRemove ? <Pressable onPress={() => onRemove(p.id)} accessibilityRole="button" hitSlop={6}><Txt v="xs" c="bad">{t('common.delete')}</Txt></Pressable> : null}
        </View>
      ))}
    </Row>
  );
}
