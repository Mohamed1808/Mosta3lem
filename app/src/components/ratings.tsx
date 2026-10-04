/**
 * Rating pieces shared by the ratings, disputes and client rating screens: star display,
 * star input, criteria averages and one rating card.
 */
import { Pressable, View } from 'react-native';

import { date, listLabel, num } from '@/lib/format';
import { useT } from '@/state/app';
import { colors, radius } from '@/theme';
import { Badge, Row, Stack, Txt, useDir } from '@/ui/core';

const GOLD = '#C98A0B';

/** Five stars, filled up to the (rounded) value. */
export function Stars({ value, size = 16 }: { value: number | null | undefined; size?: number }) {
  const t = useT();
  const d = useDir();
  const v = Math.round(value || 0);
  return (
    <View accessible accessibilityLabel={t('rating.outOf', { n: v })} style={{ flexDirection: d.row }}>
      <Txt ltr style={{ fontSize: size, lineHeight: size + 4, color: GOLD }}>{'★'.repeat(v)}</Txt>
      <Txt ltr style={{ fontSize: size, lineHeight: size + 4, color: colors.border }}>{'★'.repeat(5 - v)}</Txt>
    </View>
  );
}

/** Tap a star to choose 1 to 5. */
export function StarInput({ value, onChange, label, bad }: { value: number; onChange: (n: number) => void; label: string; bad?: boolean }) {
  const t = useT();
  const d = useDir();
  return (
    <View style={{ flexDirection: d.row, gap: 6 }} accessibilityLabel={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} accessibilityRole="radio" accessibilityState={{ checked: value === n }} accessibilityLabel={label + ': ' + t('rating.outOf', { n })} hitSlop={4}
          style={{ width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: bad ? colors.bad : n <= value ? GOLD : colors.border, backgroundColor: n <= value ? '#FFF7E6' : colors.surface }}>
          <Txt style={{ fontSize: 22, lineHeight: 26, color: n <= value ? GOLD : colors.borderStrong }}>★</Txt>
        </Pressable>
      ))}
    </View>
  );
}

/** Criteria averages (or one rating's criteria) as label, stars and number. */
export function CriteriaView({ criteria }: { criteria: Record<string, number> | null | undefined }) {
  const t = useT();
  const keys = Object.keys(criteria || {});
  if (!keys.length) return null;
  return (
    <Stack gap={6}>
      {keys.map((k) => (
        <Row key={k} gap={10}>
          <Txt v="sm" c="muted" style={{ flex: 1 }}>{t('criteria.' + k)}</Txt>
          <Stars value={(criteria as any)[k]} size={13} />
          <Txt v="xs" c="faint" style={{ width: 28 }} ltr>{num((criteria as any)[k], 1)}</Txt>
        </Row>
      ))}
    </Stack>
  );
}

/** Status badges for a rating: removed, hidden, reported, dispute. */
export function RatingBadges({ r }: { r: any }) {
  const t = useT();
  return (
    <Row wrap gap={6}>
      {r.status === 'removed' ? <Badge label={t('rating.removed')} tone="muted" /> : null}
      {r.hidden ? <Badge label={t('rating.hiddenByAdmin')} tone="muted" /> : null}
      {r.flagged ? <Badge label={t('rating.reported')} tone="warning" /> : null}
      {r.dispute ? <Badge label={r.dispute.status === 'open' ? t('dispute.openBadge') : t('dispute.resolvedBadge', { outcome: t('dispute.outcome.' + r.dispute.outcome) })} tone={r.dispute.status === 'open' ? 'warning' : 'info'} /> : null}
    </Row>
  );
}

/** One rating from a client: stars, who, when, criteria, tags, feedback and the provider reply. */
export function RatingBody({ r, compact }: { r: any; compact?: boolean }) {
  const t = useT();
  const d = useDir();
  return (
    <Stack gap={8}>
      <Row between>
        <Row gap={8}><Stars value={r.overall} /><Txt v="sm" b>{r.entityName}</Txt></Row>
        <Txt v="xs" c="faint">{date(r.createdAt)}</Txt>
      </Row>
      <Row wrap gap={6}>
        {r.caseRef ? <Txt v="xs" c="faint" mono>{r.caseRef}</Txt> : null}
        <RatingBadges r={r} />
      </Row>
      {!compact ? <CriteriaView criteria={r.criteria} /> : null}
      {(r.tags || []).length ? (
        <Row wrap gap={6}>{r.tags.map((tag: string) => <Badge key={tag} label={listLabel('ratingTags', tag)} tone="neutral" />)}</Row>
      ) : null}
      {r.feedback ? <Txt v="sm">{r.feedback}</Txt> : null}
      {r.reply ? (
        <View style={{ [d.rtl ? 'borderRightWidth' : 'borderLeftWidth']: 3, borderColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.surface2, borderRadius: 4 }}>
          <Txt v="xs" b c="muted">{t('rating.yourReply')}</Txt>
          <Txt v="sm">{r.reply.text}</Txt>
        </View>
      ) : null}
    </Stack>
  );
}
