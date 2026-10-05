/** The bottom tab bar shared by the provider and client parts of the app. */
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { num } from '@/lib/format';
import { colors } from '@/theme';
import { Icon, useDir } from '@/ui/core';

export type TabDef = { name: string; label: string; icon: string; count?: number };

export function TabBar({ state, navigation, tabs }: { state: any; navigation: any; tabs: TabDef[] }) {
  const d = useDir();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  return (
    <View style={{ flexDirection: d.row, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom }}>
      {tabs.map((tab) => {
        const on = current === tab.name;
        const route = state.routes.find((r: any) => r.name === tab.name);
        return (
          <Pressable key={tab.name} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab.label}
            onPress={() => { if (!on && route) navigation.navigate(route.name); }}
            style={{ flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 6, gap: 2 }}>
            <View>
              <Icon name={tab.icon} size={22} color={on ? colors.accent : colors.text3} />
              {tab.count ? (
                <View style={{ position: 'absolute', top: -4, [d.rtl ? 'left' : 'right']: -10, backgroundColor: colors.bad, borderRadius: 8, minWidth: 16, paddingHorizontal: 4, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 15 }}>{tab.count > 99 ? '99+' : num(tab.count)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 11.5, color: on ? colors.accent : colors.text2, fontWeight: on ? '700' : '500' }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
