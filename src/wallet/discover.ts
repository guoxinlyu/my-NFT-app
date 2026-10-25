import type { WalletProvider } from './controller';

// Native targets are outside the supported Web-only product scope.
export async function discoverMetaMask(): Promise<WalletProvider> {
  throw new Error('LivePass 仅支持网页版。请使用安装了 MetaMask 的浏览器访问。');
}
