/**
 * Mosta3lem UI kit. Every component mirrors itself for Arabic (right to left) from the
 * current language, so layout flips instantly on phones and on the web alike.
 */
import { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import { icm } from '@/backend/engine';
import { useApp, useT } from '@/state/app';
import { colors, font, radius, space, Tone, toneColors } from '@/theme';
import { statusTone } from '@/lib/format';


export function useDir() {
  const { rtl } = useApp();
  return {
    rtl,
    row: (rtl ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    align: (rtl ? 'right' : 'left') as 'left' | 'right',
    start: (rtl ? 'flex-end' : 'flex-start') as 'flex-start' | 'flex-end',
    end: (rtl ? 'flex-start' : 'flex-end') as 'flex-start' | 'flex-end',
  };
}

// ---------------------------------------------------------------- icons
const FLIP: Record<string, true> = { chevronRight: true, chevronLeft: true, arrowRight: true, send: true, logout: true, forward: true, undo: true };

export function Icon({ name, size = 18, color = colors.text2 }: { name: string; size?: number; color?: string }) {
  const { rtl } = useApp();
  const paths = (icm() && icm().icons && (icm().icons[name] || icm().icons.info)) || '';
  const xml = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return (
    <View style={rtl && FLIP[name] ? { transform: [{ scaleX: -1 }] } : undefined}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}

// ---------------------------------------------------------------- text
type TxtProps = {
  children?: ReactNode; v?: 'title' | 'h2' | 'h3' | 'body' | 'sm' | 'xs';
  c?: 'text' | 'muted' | 'faint' | 'accent' | 'bad' | 'ok' | 'warn' | 'white';
  b?: boolean; mono?: boolean; center?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number; ltr?: boolean;
};
const SIZE = { title: font.xxl, h2: font.xl, h3: font.lg, body: font.md, sm: font.sm, xs: font.xs };
const COLOR = { text: colors.text, muted: colors.text2, faint: colors.text3, accent: colors.accentText, bad: colors.bad, ok: colors.ok, warn: colors.warn, white: '#fff' };

export function Txt({ children, v = 'body', c = 'text', b, mono, center, style, numberOfLines, ltr }: TxtProps) {
  const d = useDir();
  const heading = v === 'title' || v === 'h2' || v === 'h3';
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{
        fontSize: SIZE[v], color: COLOR[c], lineHeight: Math.round(SIZE[v] * 1.4),
        fontWeight: b || heading ? '600' : '400', textAlign: center ? 'center' : ltr ? 'left' : d.align,
        writingDirection: ltr ? 'ltr' : d.rtl ? 'rtl' : 'ltr', fontFamily: mono ? 'monospace' : undefined,
      }, style]}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------- layout
export function Row({ children, gap = space.sm, wrap, between, center = true, style }: { children?: ReactNode; gap?: number; wrap?: boolean; between?: boolean; center?: boolean; style?: StyleProp<ViewStyle> }) {
  const d = useDir();
  return <View style={[{ flexDirection: d.row, gap, flexWrap: wrap ? 'wrap' : 'nowrap', justifyContent: between ? 'space-between' : 'flex-start', alignItems: center ? 'center' : 'flex-start' }, style]}>{children}</View>;
}
export function Stack({ children, gap = space.md, style }: { children?: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}
export function Grow({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flex: 1, minWidth: 0 }, style]}>{children}</View>;
}

export function Card({ title, right, children, pad = true, style, onPress }: { title?: string; right?: ReactNode; children?: ReactNode; pad?: boolean; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const body = (
    <View style={[s.card, style]}>
      {title ? <Row between style={s.cardHead}><Txt v="h3" style={{ flex: 1 }}>{title}</Txt>{right}</Row> : null}
      <View style={pad ? { padding: space.lg } : undefined}>{children}</View>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>{body}</Pressable> : body;
}

export function Divider() { return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />; }

// ---------------------------------------------------------------- buttons
type BtnProps = {
  label: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'ghost'; icon?: string;
  disabled?: boolean; busy?: boolean; block?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
};
export function Button({ label, onPress, kind = 'secondary', icon, disabled, busy, block, small, style }: BtnProps) {
  const d = useDir();
  const bg = kind === 'primary' ? colors.accent : kind === 'danger' ? colors.badBg : kind === 'ghost' ? 'transparent' : colors.surface;
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? colors.bad : colors.text;
  const border = kind === 'secondary' ? colors.borderStrong : kind === 'danger' ? '#EFC2BD' : 'transparent';
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} disabled={disabled || busy} onPress={onPress}
      style={({ pressed }) => [{
        flexDirection: d.row, alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: radius.md,
        paddingHorizontal: small ? 12 : 16, minHeight: small ? 34 : 46, opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        alignSelf: block ? 'stretch' : 'auto',
      }, style]}>
      {busy ? <ActivityIndicator color={fg} size="small" /> : icon ? <Icon name={icon} color={fg} size={small ? 15 : 18} /> : null}
      <Text style={{ color: fg, fontWeight: '600', fontSize: small ? font.sm : font.md }}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- badges and notices
export function Badge({ label, tone = 'neutral', dot }: { label: string; tone?: Tone; dot?: boolean }) {
  const c = toneColors[tone];
  const d = useDir();
  return (
    <View style={{ flexDirection: d.row, alignItems: 'center', gap: 5, backgroundColor: c.bg, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.fg }} /> : null}
      <Text style={{ color: c.fg, fontSize: font.xs, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
export function StatusBadge({ status, prefix = 'status' }: { status: string; prefix?: string }) {
  const t = useT();
  return <Badge label={t(prefix + '.' + status)} tone={statusTone(status)} />;
}

export function Notice({ text, tone = 'info', icon, children }: { text?: string; tone?: Tone; icon?: string; children?: ReactNode }) {
  const c = toneColors[tone];
  return (
    <Row center={false} gap={10} style={{ backgroundColor: c.bg, borderRadius: radius.md, padding: space.md }}>
      <Icon name={icon || (tone === 'success' ? 'check' : tone === 'info' || tone === 'pending' ? 'info' : 'alert')} color={c.fg} size={18} />
      <Grow>{text ? <Txt v="sm" style={{ color: c.fg }}>{text}</Txt> : null}{children}</Grow>
    </Row>
  );
}

export function Empty({ text, icon = 'inbox' }: { text: string; icon?: string }) {
  return (
    <View style={{ alignItems: 'center', padding: space.xl, gap: space.sm }}>
      <Icon name={icon} size={28} color={colors.text3} />
      <Txt v="sm" c="faint" center>{text}</Txt>
    </View>
  );
}

export function Loading() {
  return <View style={{ padding: space.xxl, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /></View>;
}

// ---------------------------------------------------------------- data display
export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <Stack gap={10}>
      {rows.map(([k, v], i) => (
        <Row key={i} center={false} gap={space.md}>
          <Txt v="sm" c="muted" style={{ width: '38%' }}>{k}</Txt>
          <Grow>{typeof v === 'string' || typeof v === 'number' ? <Txt v="sm">{v}</Txt> : v}</Grow>
        </Row>
      ))}
    </Stack>
  );
}

export function Kpi({ label, value, tone, onPress, sub }: { label: string; value: string; tone?: 'warn' | 'bad' | 'ok'; onPress?: () => void; sub?: string }) {
  const color = tone === 'bad' ? colors.bad : tone === 'warn' ? colors.warn : tone === 'ok' ? colors.ok : colors.text;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.kpi, { opacity: pressed ? 0.8 : 1 }]}>
      <Txt v="xs" c="muted" numberOfLines={2}>{label}</Txt>
      <Txt v="h2" style={{ color }}>{value}</Txt>
      {sub ? <Txt v="xs" c="faint" numberOfLines={1}>{sub}</Txt> : null}
    </Pressable>
  );
}

export function ListItem({ title, sub, right, left, onPress, chevron = true }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; left?: ReactNode; onPress?: () => void; chevron?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ backgroundColor: pressed ? colors.surface2 : colors.surface })}>
      <Row gap={space.md} style={{ paddingHorizontal: space.lg, paddingVertical: 12 }}>
        {left}
        <Grow>
          {typeof title === 'string' ? <Txt b numberOfLines={2}>{title}</Txt> : title}
          {sub ? (typeof sub === 'string' ? <Txt v="sm" c="muted" numberOfLines={2}>{sub}</Txt> : sub) : null}
        </Grow>
        {right}
        {onPress && chevron ? <Icon name="chevronRight" size={16} color={colors.text3} /> : null}
      </Row>
    </Pressable>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const ini = icm() ? icm().util.initials(name || '') : '';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.accentText, fontWeight: '700', fontSize: size * 0.36 }}>{ini}</Text>
    </View>
  );
}

/** Horizontal filter chips. */
export function Chips<T extends string>({ items, value, onChange }: { items: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  const d = useDir();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: d.row, gap: 8, paddingHorizontal: space.lg }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable key={it.id} onPress={() => onChange(it.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? colors.accent : colors.borderStrong, backgroundColor: on ? colors.accentSoft : colors.surface }}>
            <Text style={{ color: on ? colors.accentText : colors.text2, fontWeight: on ? '600' : '500', fontSize: font.sm }}>{it.label}{it.count != null ? '  ' + it.count : ''}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Two or three way switch. */
export function Segmented<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T | ''; onChange: (v: T) => void }) {
  const d = useDir();
  return (
    <View style={{ flexDirection: d.row, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, overflow: 'hidden', alignSelf: 'flex-start' }}>
      {items.map((it, i) => {
        const on = it.id === value;
        return (
          <Pressable key={it.id} onPress={() => onChange(it.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ paddingHorizontal: 18, paddingVertical: 10, backgroundColor: on ? colors.accentSoft : colors.surface, [d.rtl ? 'borderRightWidth' : 'borderLeftWidth']: i ? 1 : 0, borderColor: colors.borderStrong }}>
            <Text style={{ color: on ? colors.accentText : colors.text2, fontWeight: on ? '700' : '500', fontSize: font.sm }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardHead: { paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  kpi: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: 2 },
});
