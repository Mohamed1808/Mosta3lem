/**
 * Client app tabs, for organisations that request investigations and collections.
 * Cases and New request are added in the next steps.
 */
import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tabBar';
import { useT } from '@/state/app';

export default function ClientTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <ClientTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

function ClientTabBar({ state, navigation }: any) {
  const t = useT();
  return (
    <TabBar state={state} navigation={navigation} tabs={[
      { name: 'index', label: t('tabs.home'), icon: 'home' },
      { name: 'more', label: t('tabs.more'), icon: 'moreH' },
    ]} />
  );
}
