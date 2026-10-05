/**
 * Client app tabs, for organisations that request investigations and collections.
 * The Cases badge counts what needs the client's decision. New request comes next.
 */
import { Tabs } from 'expo-router';

import { services } from '@/backend/engine';
import { TabBar } from '@/components/tabBar';
import { useQuery, useT } from '@/state/app';

export default function ClientTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <ClientTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="cases" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

function ClientTabBar({ state, navigation }: any) {
  const t = useT();
  const counts = useQuery<any>(() => services().analytics.navCounts(null)).data || {};
  return (
    <TabBar state={state} navigation={navigation} tabs={[
      { name: 'index', label: t('tabs.home'), icon: 'home' },
      { name: 'cases', label: t('tabs.cases'), icon: 'columns', count: counts.entityAttention },
      { name: 'more', label: t('tabs.more'), icon: 'moreH' },
    ]} />
  );
}
