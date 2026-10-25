import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { WalletController, SEPOLIA_ID } from './controller';
import { discoverMetaMask } from './discover';

const WalletContext = createContext<WalletController | null>(null);
export function useWalletController() {
  const controller = useContext(WalletContext);
  if (!controller) throw new Error('WalletProvider is required');
  return controller;
}
export function WalletProvider({ children }: PropsWithChildren) {
  const [controller] = useState(() => new WalletController(discoverMetaMask));
  useEffect(() => () => controller.dispose(), [controller]);
  return <WalletContext.Provider value={controller}>{children}</WalletContext.Provider>;
}
export function useWallet() {
  const controller = useWalletController();
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  return { ...state, isSepolia: state.chainId === SEPOLIA_ID, connect: controller.connect, disconnect: controller.disconnect, refresh: controller.refresh, switchToSepolia: controller.switchToSepolia };
}
