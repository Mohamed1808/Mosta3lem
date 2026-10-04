/**
 * Provider app tabs. What a person sees depends on their role:
 *   owner and supervisor: Home, Offers, Cases, Team, More
 *   individual provider:  Home, Offers, Cases, More
 *   field agent:          Home, My tasks, More
 */
import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { services } from '@/backend/engine';
import { num } from '@/lib/format';
import { useApp, useQuery, useT } from '@/state/app';
import { colors } from '@/theme';
import { Icon, useDir } from '@/ui/core';

type TabDef = { name: string; label: string; icon: string; count?: number };

function tabsFor(role: string): string[] {
  if (role === 'agent') return ['home', 'cases', 'more'];
  if (role === 'freelancer') return ['home', 'offers', 'cases', 'more'];
  if (role === 'provider_supervisor' || role === 'provider_admin') return ['home', 'offers', 'cases', 'team', 'more'];
  return ['home', 'more'];
}

export default function ProviderTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="offers" />
      <Tabs.Screen name="cases" />
      <Tabs.Screen name="team" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

function TabBar({ state, navigation }: any) {
  const t = useT();
  const d = useDir();
  const insets = useSafeAreaInsets();
  const { session, service } = useApp();
  const role = session?.user?.role || '';
  const counts = useQuery<any>(() => services().analytics.navCounts(service), [service]).data || {};
  const defs: Record<string, TabDef> = {
    home: { name: 'home', label: t('tabs.home'), icon: 'home' },
    offers: { name: 'offers', label: t('tabs.offers'), icon: 'inbox', count: counts.offers },
    cases: { name: 'cases', label: role === 'agent' ? t('tabs.tasks') : t('tabs.cases'), icon: role === 'agent' ? 'list' : 'columns', count: role === 'agent' ? counts.returned : counts.unassigned },
    team: { name: 'team', label: t('tabs.team'), icon: 'users' },
    more: { name: 'more', label: t('tabs.more'), icon: 'moreH' },
  };
  const visible = tabsFor(role).map((n) => defs[n]);
  const current = state.routes[state.index]?.name;
  return (
    <View style={{ flexDirection: d.row, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: insets.bottom }}>
      {visible.map((tab) => {
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
