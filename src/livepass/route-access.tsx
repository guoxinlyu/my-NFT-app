import type { PropsWithChildren } from 'react';
import { Redirect, useLocalSearchParams, usePathname } from 'expo-router';
import { Text, View } from 'react-native';
import { useWallet } from '../wallet/context';
import { useLivePass } from './context';
import { Action, p } from './ui';

// Keep return destinations inside the application's known routes.
export function connectionDestination(returnTo: string | string[] | undefined, owner: boolean) {
  if (typeof returnTo === 'string' && /^\/(shows(?:\/[^/?#]+)?|tickets(?:\/[^/?#]+)?|stake(?:\?showId=(0|[1-9]\d*))?|admin\/(new|shows|verify|revenue))$/.test(returnTo)) {
    if (!returnTo.startsWith('/admin/') || owner) return returnTo;
    return '/shows?notice=owner';
  }
  return owner ? '/admin/shows' : '/shows';
}

export function RouteAccess({ children, admin = false }: PropsWithChildren<{ admin?: boolean }>) {
  const wallet = useWallet(); const shop = useLivePass(); const pathname = usePathname();
  const { showId } = useLocalSearchParams<{ showId?: string }>();
  const returnTo = pathname === '/stake' && typeof showId === 'string' && /^(0|[1-9]\d*)$/.test(showId) ? `${pathname}?showId=${showId}` : pathname;
  if (!wallet.address && wallet.busy) return <Text style={p.copy}>正在读取钱包状态…</Text>;
  if (!wallet.address || !wallet.isSepolia) return <Redirect href={{ pathname: '/', params: { returnTo } }} />;
  if (admin) {
    if (shop.phase === 'error' || !shop.owner) return <View style={p.stack}>
      <Text style={p.copy}>{shop.error ?? '正在读取合约主办方…'}</Text>
      <Action label="重新读取" disabled={shop.phase === 'loading'} onPress={() => { void shop.reload(); }} />
    </View>;
    if (shop.owner !== wallet.address) return <Redirect href={{ pathname: '/shows', params: { notice: 'owner' } }} />;
  }
  return children;
}
