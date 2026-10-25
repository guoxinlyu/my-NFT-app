import type { WalletProvider } from './controller';
type Injected = WalletProvider & { isMetaMask?: boolean; providers?: Injected[] };
type Announcement = CustomEvent<{ info: { rdns: string }; provider: Injected }>;

export async function discoverMetaMask(): Promise<WalletProvider> {
  if (typeof window === 'undefined') throw new Error('请在浏览器中连接 MetaMask。');
  let announced: Injected | undefined;
  const listener = (event: Event) => {
    const detail = (event as Announcement).detail;
    if (detail?.info?.rdns === 'io.metamask') announced = detail.provider;
  };
  window.addEventListener('eip6963:announceProvider', listener);
  try {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    await new Promise(resolve => setTimeout(resolve, 250));
    const injected = (window as Window & { ethereum?: Injected }).ethereum;
    const provider = announced ?? injected?.providers?.find(item => item.isMetaMask) ?? (injected?.isMetaMask ? injected : undefined);
    if (!provider || typeof provider.request !== 'function' || typeof provider.on !== 'function' || typeof provider.removeListener !== 'function') {
      throw new Error('未检测到 MetaMask。请安装并解锁浏览器扩展后重试；手机请使用 MetaMask 内置浏览器打开本页面。');
    }
    return provider;
  } finally { window.removeEventListener('eip6963:announceProvider', listener); }
}
