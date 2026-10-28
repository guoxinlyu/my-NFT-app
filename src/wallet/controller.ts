import { BrowserProvider, formatEther, getAddress, type Eip1193Provider } from 'ethers';

export const SEPOLIA_ID = '0xaa36a7';
export interface WalletProvider extends Eip1193Provider {
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
}
export type WalletState = {
  address: string | null;
  chainId: string | null;
  balance: string | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
};
const initial: WalletState = { address: null, chainId: null, balance: null, busy: false, error: null, notice: null };
function codeOf(error: unknown): number | undefined {
  const e = error as { code?: number; data?: { originalError?: { code?: number } }; error?: { code?: number } };
  return e?.data?.originalError?.code ?? e?.error?.code ?? e?.code;
}
export function walletMessage(error: unknown): { error: string | null; notice: string | null } {
  if (codeOf(error) === 4001) return { error: null, notice: '已取消钱包请求。你可以随时重试。' };
  if (codeOf(error) === -32002) return { error: 'MetaMask 中已有待处理请求，请打开钱包完成或取消后重试。', notice: null };
  return { error: error instanceof Error ? error.message.slice(0, 200) : '钱包读取失败，请检查网络后重试。', notice: null };
}

// Owns wallet lifecycle. The ticketing client obtains an explicit current session to sign.
export class WalletController {
  private state: WalletState = initial;
  private listeners = new Set<() => void>();
  private provider: WalletProvider | null = null;
  private revision = 0;
  private syncRevision = 0;
  private operation = 0;
  private active = false;
  private locked = false;
  private discover: () => Promise<WalletProvider>;
  constructor(discover: () => Promise<WalletProvider>) { this.discover = discover; }
  getSnapshot = () => this.state;
  getServerSnapshot = () => initial;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSession = () => {
    if (!this.active || !this.provider || !this.state.address || this.state.chainId !== SEPOLIA_ID) throw new Error('请连接 MetaMask 并切换到 Sepolia。');
    return { provider: this.provider, address: this.state.address, revision: this.revision };
  };
  isCurrentSession = (session: { provider: WalletProvider; address: string; revision: number }) =>
    this.active && this.provider === session.provider && this.state.address === session.address && this.state.chainId === SEPOLIA_ID && this.revision === session.revision;
  private update(patch: Partial<WalletState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  private changed = () => { if (this.active) void this.sync(true); };
  private disconnected = () => { this.disconnect(); this.update({ notice: '钱包连接已中断，请重新连接。' }); };
  private attach(provider: WalletProvider) {
    this.detach(); this.provider = provider;
    provider.on('accountsChanged', this.changed);
    provider.on('chainChanged', this.changed);
    provider.on('disconnect', this.disconnected);
  }
  private detach() {
    if (!this.provider) return;
    this.provider.removeListener('accountsChanged', this.changed);
    this.provider.removeListener('chainChanged', this.changed);
    this.provider.removeListener('disconnect', this.disconnected);
    this.provider = null;
  }
  private async sync(invalidateIdentity = false) {
    const provider = this.provider;
    if (!provider || !this.active) return;
    const read = ++this.syncRevision;
    // Wallet events clear identity immediately; ordinary balance refreshes keep forms mounted.
    if (invalidateIdentity) {
      ++this.revision;
      this.update({ address: null, chainId: null, balance: null, error: null });
    }
    try {
      const [accounts, chain] = await Promise.all([
        provider.request({ method: 'eth_accounts' }), provider.request({ method: 'eth_chainId' }),
      ]);
      if (read !== this.syncRevision || !this.active) return;
      const address = Array.isArray(accounts) && typeof accounts[0] === 'string' ? getAddress(accounts[0]) : null;
      if (!address) { this.disconnect(); return; }
      if (typeof chain !== 'string' || !/^0x[0-9a-f]+$/i.test(chain)) throw new Error('钱包返回了无效的网络编号。');
      const chainId = `0x${BigInt(chain).toString(16)}`;
      const changed = address !== this.state.address || chainId !== this.state.chainId;
      if (changed) ++this.revision;
      this.update({ address, chainId, error: null, ...(changed ? { balance: null } : {}) });
      // Only expose Sepolia balances; never label mainnet funds as test ETH.
      if (chainId !== SEPOLIA_ID) return;
      const browser = new BrowserProvider(provider);
      try {
        const balance = await browser.getBalance(address);
        if (read === this.syncRevision && this.active) this.update({ balance: formatEther(balance) });
      } finally { browser.destroy(); }
    } catch (error) {
      if (read === this.syncRevision && this.active) this.update({ balance: null, ...walletMessage(error) });
    }
  }
  private async run(action: (id: number) => Promise<void>) {
    if (this.locked) return;
    this.locked = true;
    const id = ++this.operation;
    this.update({ busy: true, error: null, notice: null });
    try { await action(id); }
    catch (error) { if (id === this.operation) this.update(walletMessage(error)); }
    finally { if (id === this.operation) { this.locked = false; this.update({ busy: false }); } }
  }
  connect = () => this.run(async id => {
    const provider = await this.discover();
    if (id !== this.operation) return;
    await provider.request({ method: 'eth_requestAccounts' });
    if (id !== this.operation) return;
    this.active = true; this.attach(provider); await this.sync();
  });
  refresh = () => this.run(async () => { await this.sync(); });
  switchToSepolia = () => this.run(async id => {
    const provider = this.provider;
    if (!provider || !this.active) throw new Error('请先连接 MetaMask。');
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_ID }] });
    } catch (error) {
      if (codeOf(error) !== 4902) throw error;
      if (id !== this.operation) return;
      await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: SEPOLIA_ID, chainName: 'Sepolia', nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'], blockExplorerUrls: ['https://sepolia.etherscan.io'] }] });
      if (id !== this.operation) return;
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_ID }] });
    }
    if (id === this.operation) await this.sync();
  });
  disconnect = () => {
    this.active = false; ++this.revision; ++this.syncRevision; ++this.operation; this.locked = false;
    this.detach(); this.state = { ...initial, notice: '已断开本页面连接。若需撤销网站授权，请在 MetaMask 的连接管理中操作。' };
    this.listeners.forEach(fn => fn());
  };
  dispose = () => { this.disconnect(); };
}
