/** Demo accounts: sign in as any provider or organisation user without a code (testing only). */
import { router } from 'expo-router';
import { Fragment } from 'react';

import { services } from '@/backend/engine';
import { useApp, useQuery, useT } from '@/state/app';
import { Avatar, Card, Divider, ListItem, Loading, Txt } from '@/ui/core';
import { Screen } from '@/ui/screen';

const ORDER = ['provider_admin', 'provider_supervisor', 'freelancer', 'agent', 'entity_admin', 'entity_operations', 'entity_credit', 'entity_collections'];

export default function Demo() {
  const t = useT();
  const { signIn } = useApp();
  const q = useQuery<any[]>(() => services().auth.listDemoUsers());
  const users = (q.data || []).filter((u) => u.portal !== 'admin');
  const groups: Record<string, any[]> = {};
  users.forEach((u) => { (groups[u.orgName] = groups[u.orgName] || []).push(u); });
  const orgsOf = (client: boolean) => Object.keys(groups).filter((o) => (groups[o][0].portal === 'entity') === client).sort((a, b) => a.localeCompare(b));
  const go = async (id: string) => { await signIn(id); router.replace('/'); };
  const section = (title: string, orgs: string[]) => (
    <>
      <Txt v="h3">{title}</Txt>
      {orgs.map((org) => (
        <Card key={org} title={org} pad={false}>
          {groups[org].sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role)).map((u, i) => (
            <Fragment key={u.id}>
              {i ? <Divider /> : null}
              <ListItem left={<Avatar name={u.name} />} title={u.name} sub={t('role.' + u.role)} onPress={() => go(u.id)} />
            </Fragment>
          ))}
        </Card>
      ))}
    </>
  );
  return (
    <Screen title={t('login.demoAccounts')} back>
      {q.loading && !q.data ? <Loading /> : (
        <>
          {section(t('login.demoProviders'), orgsOf(false))}
          {section(t('login.demoClients'), orgsOf(true))}
        </>
      )}
      <Txt v="xs" c="faint" center>{t('more.simulated')}</Txt>
    </Screen>
  );
}
