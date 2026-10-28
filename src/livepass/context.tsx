import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { FallbackProvider, FetchRequest, JsonRpcProvider } from 'ethers';
import { useWalletController } from '../wallet/context';
import { LivePassClient } from './client';

const ShopContext = createContext<LivePassClient | null>(null);
export function LivePassProvider({ children }: PropsWithChildren) {
  const wallet = useWalletController();
  const [resources] = useState(() => {
    const rpc = ['https://ethereum-sepolia-rpc.publicnode.com', 'https://sepolia.drpc.org'].map(url => {
      const request = new FetchRequest(url); request.timeout = 12000;
      return new JsonRpcProvider(request, 11155111, { batchMaxCount: 1, cacheTimeout: -1 });
    });
    const reader = new FallbackProvider(rpc.map((provider, priority) => ({ provider, priority: priority + 1, stallTimeout: 1200, weight: 1 })), 11155111, { quorum: 1, cacheTimeout: -1 });
    return { client: new LivePassClient(reader, wallet), rpc, reader };
  });
  useEffect(() => {
    resources.client.start();
    const refresh = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') void resources.client.load(); };
    const interval = setInterval(refresh, 30000);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', refresh); resources.client.stop(); };
  }, [resources]);
  return <ShopContext.Provider value={resources.client}>{children}</ShopContext.Provider>;
}
export function useLivePass() {
  const client = useContext(ShopContext); if (!client) throw new Error('LivePassProvider required');
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getServerSnapshot);
  return { ...state, locked: client.isLocked(), reload: client.load, send: client.send, getProvenance: client.getProvenance, checkPending: client.checkPending, checkTicket: client.checkTicket, invalidateCheck: client.invalidateCheck, loadRevenue: client.loadRevenue, clearRevenue: client.clearRevenue, withdrawRevenue: client.withdrawRevenue };
}
