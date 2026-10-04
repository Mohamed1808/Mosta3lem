/** Screen frame: safe areas, a header with an optional back button, and scrolling content. */
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp, useT } from '@/state/app';
import { colors, space } from '@/theme';
import { Grow, Icon, Row, Txt } from './core';

export function Screen({ title, sub, back, right, children, scroll = true, footer, pad = true }: {
  title?: string; sub?: string; back?: boolean; right?: ReactNode; children?: ReactNode; scroll?: boolean; footer?: ReactNode; pad?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { refresh } = useApp();
  const t = useT();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const head = title ? (
    <View style={{ paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: space.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Row gap={10}>
        {back ? (
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={t('common.back')} hitSlop={12} style={{ padding: 4 }}>
            <Icon name="chevronLeft" size={22} color={colors.text} />
          </Pressable>
        ) : null}
        <Grow>
          <Txt v="h3" numberOfLines={1}>{title}</Txt>
          {sub ? <Txt v="xs" c="muted" numberOfLines={1}>{sub}</Txt> : null}
        </Grow>
        {right}
      </Row>
    </View>
  ) : <View style={{ height: insets.top, backgroundColor: colors.surface }} />;
  const contentStyle = { padding: pad ? space.lg : 0, gap: space.lg, paddingBottom: space.xxl + (footer ? 0 : insets.bottom) };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {head}
      {scroll ? (
        <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}>
          {children}
        </ScrollView>
      ) : <View style={[{ flex: 1 }, contentStyle]}>{children}</View>}
      {footer ? <View style={{ padding: space.lg, paddingBottom: space.lg + insets.bottom, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>{footer}</View> : null}
    </View>
  );
}
