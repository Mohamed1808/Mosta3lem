/**
 * Provider app tabs. What a person sees depends on their role:
 *   owner and supervisor: Home, Offers, Cases, Team, More
 *   individual provider:  Home, Offers, Cases, More
 *   field agent:          Home, My tasks, More
 */
import { Tabs } from 'expo-router';

import { services } from '@/backend/engine';
import { TabBar, TabDef } from '@/components/tabBar';
import { useApp, useQuery, useT } from '@/state/app';

function tabsFor(role: string): string[] {
  if (role === 'agent') return ['home', 'cases', 'more'];
  if (role === 'freelancer') return ['home', 'offers', 'cases', 'more'];
  if (role === 'provider_supervisor' || role === 'provider_admin') return ['home', 'offers', 'cases', 'team', 'more'];
  return ['home', 'more'];
}

export default function ProviderTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <ProviderTabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="offers" />
      <Tabs.Screen name="cases" />
      <Tabs.Screen name="team" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

function ProviderTabBar({ state, navigation }: any) {
  const t = useT();
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
  return <TabBar state={state} navigation={navigation} tabs={tabsFor(role).map((n) => defs[n])} />;
}
