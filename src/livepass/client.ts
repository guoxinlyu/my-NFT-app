import { BrowserProvider, Contract, formatEther, getAddress, keccak256, type AbstractProvider, type Log, type TransactionReceipt, type TransactionResponse } from 'ethers';
import type { WalletController } from '../wallet/controller.ts';
import { DEPLOYMENT, LIVEPASS_ABI } from './contract.ts';
import { chainError, entryDecision, ticketIds, POLICIES, ticketImage, ticketStatus, type ChainShow, type ProvenanceEvent, type Ticket, type TicketProvenance } from './model.ts';
import { readDeploymentFees } from '../../contracts/scripts/deployment-fees.mjs';

export type TxState = {
  stage: 'idle' | 'preparing' | 'awaiting_signature' | 'pending' | 'confirmed' | 'rejected' | 'reverted' | 'failed';
  action: string; sender: string; hash: string | null; message: string;
};
export type WriteMethod = 'createShow' | 'setPrice' | 'setResalePolicy' | 'setStakeRequirement'
  | 'openSale' | 'closeSale' | 'buy' | 'stake' | 'unstake' | 'verify' | 'withdraw';
export type ShopState = {
  phase: 'idle' | 'loading' | 'ready' | 'error'; error: string | null;
  shows: ChainShow[]; owner: string | null; cooldown: bigint; floor: bigint; timestamp: bigint;
  identity: string | null; personalPhase: 'idle' | 'loading' | 'ready' | 'error'; personalError: string | null;
  bought: Record<string, boolean>; stake: bigint; stakeSince: bigint; tickets: Ticket[]; tx: TxState;
  check: { phase: 'idle' | 'loading' | 'ready' | 'error'; error: string | null; result: TicketCheck | null };
  revenue: { phase: 'idle' | 'loading' | 'ready' | 'error'; error: string | null; data: RevenueSummary | null };
};
export type RevenueSummary = { owner: string; walletRevision: number; blockNumber: number; showCount: bigint; ticketsSold: bigint; totalSales: bigint; withdrawable: bigint; totalStaked: bigint; contractBalance: bigint; shows: { id: string; name: string; sold: bigint; price: bigint; policy: string; rulesFrozen: boolean }[] };
const emptyRevenue = { phase: 'idle' as const, error: null, data: null };
export type TicketCheck = Ticket & { inputShow: string; policy: string; allowed: boolean; reason: string; blockNumber: number; verifiedCount: bigint; checkedBy: string; walletRevision: number };
const emptyCheck = { phase: 'idle' as const, error: null, result: null };
const emptyPersonal = { identity: null, personalPhase: 'idle' as const, personalError: null, bought: {}, stake: 0n, stakeSince: 0n, tickets: [] };
const idleTx: TxState = { stage: 'idle', action: '', sender: '', hash: null, message: '' };
type Config = { chainId: number; address: string; blockNumber: number; runtimeBytecodeHash: string };
type PendingEvidence = { hash: string; sender: string; action: string; dataHash: string; value: string; nonce?: number };
const storageKey = 'livepass-pending-transaction';
const locked = (tx: TxState) => ['preparing', 'awaiting_signature', 'pending'].includes(tx.stage);

export class LivePassClient {
  private state: ShopState = { phase: 'idle', error: null, shows: [], owner: null, cooldown: 0n, floor: 0n, timestamp: 0n, ...emptyPersonal, tx: idleTx, check: emptyCheck, revenue: emptyRevenue };
  private readonly serverSnapshot = this.state;
  private revenueEpoch = 0;
  private checkEpoch = 0;
  private listeners = new Set<() => void>();
  private reader: AbstractProvider;
  private wallet: WalletController;
  private config: Config;
  private epoch = 0;
  private walletKey = '';
  private unsubscribe: (() => void) | null = null;
  private pending: PendingEvidence | null = null;
  private checking = false;
  constructor(reader: AbstractProvider, wallet: WalletController, config: Config = DEPLOYMENT) { this.reader = reader; this.wallet = wallet; this.config = config; }
  getSnapshot = () => this.state;
  getServerSnapshot = () => this.serverSnapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<ShopState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener()); }
  private tx(patch: Partial<TxState>) { this.update({ tx: { ...this.state.tx, ...patch } }); }
  isLocked = () => locked(this.state.tx);
  private currentIdentity() { const s = this.wallet.getSnapshot(); return s.chainId === '0xaa36a7' ? s.address : null; }
  start = () => {
    if (this.unsubscribe) return;
    this.walletKey = this.currentIdentity() ?? '';
    this.unsubscribe = this.wallet.subscribe(() => {
      const key = this.currentIdentity() ?? '';
      if (key !== this.walletKey) { this.walletKey = key; ++this.epoch; this.invalidateCheck(); this.clearRevenue(); this.update({ ...emptyPersonal }); void this.load(); }
    });
    if (typeof window !== 'undefined') {
      try {
        const candidate = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
        if (candidate && /^0x[\da-f]{64}$/i.test(candidate.hash) && /^0x[\da-f]{40}$/i.test(candidate.sender)
          && /^0x[\da-f]{64}$/i.test(candidate.dataHash) && /^\d+$/.test(candidate.value) && typeof candidate.action === 'string'
          && (candidate.nonce === undefined || (Number.isSafeInteger(candidate.nonce) && candidate.nonce >= 0))) {
          this.pending = candidate; this.tx({ stage: 'pending', action: candidate.action.slice(0, 100), sender: candidate.sender, hash: candidate.hash, message: '恢复待确认交易，请核对原交易；不会自动重发。' });
        }
      } catch { /* session hints are non-authoritative */ }
    }
    void this.load();
  };
  stop = () => { ++this.epoch; this.invalidateCheck(); this.clearRevenue(); this.unsubscribe?.(); this.unsubscribe = null; };
  clearRevenue = () => { ++this.revenueEpoch; this.update({ revenue: emptyRevenue }); };
  loadRevenue = async () => {
    if (this.isLocked()) return;
    const revision = ++this.revenueEpoch;
    this.update({ revenue: { phase: 'loading', error: null, data: null } });
    try {
      const session = this.wallet.getSession();
      const contract = await this.checkedContract();
      const block = await this.reader.getBlock('latest'); if (!block) throw new Error('无法读取最新区块。');
      const at = { blockTag: block.number };
      const [owner, count, withdrawable, totalStaked, contractBalance] = await Promise.all([
        contract.owner(at), contract.showCount(at), contract.ticketRevenue(at), contract.totalStaked(at), this.reader.getBalance(this.config.address, block.number),
      ]);
      if (getAddress(owner) !== session.address) throw new Error('当前钱包不是主办方，不能管理票房与提现。');
      if (count > 10000n) throw new Error('演出数量较多，需要分页读取。');
      if (contractBalance < withdrawable + totalStaked) throw new Error('合约资金读数不一致，请重新读取。');
      let ticketsSold = 0n, totalSales = 0n;
      for (let from = this.config.blockNumber; from <= block.number; from += 1000) {
        const logs = await contract.queryFilter(contract.filters.TicketBought(), from, Math.min(from + 999, block.number));
        for (const log of logs) {
          if (!('args' in log)) throw new Error('无法解码售票事件，已停止统计。');
          ++ticketsSold; totalSales += log.args.price as bigint;
        }
      }
      const shows: RevenueSummary['shows'] = [];
      for (let start = 0; start < Number(count); start += 10) {
        shows.push(...await Promise.all(Array.from({ length: Math.min(10, Number(count) - start) }, async (_, offset) => {
          const id = start + offset, show = await contract.shows(id, at);
          const policy = POLICIES[Number(show.resalePolicy)]; if (!policy) throw new Error('Unknown resale policy');
          return { id: String(id), name: String(show.name), sold: show.nextTicketNo - 1n, price: show.price as bigint, policy, rulesFrozen: Boolean(show.rulesFrozen) };
        })));
      }
      if (revision === this.revenueEpoch && this.wallet.isCurrentSession(session)) this.update({ revenue: { phase: 'ready', error: null,
        data: { owner: getAddress(owner), walletRevision: session.revision, blockNumber: block.number, showCount: count, ticketsSold, totalSales, withdrawable, totalStaked, contractBalance, shows } } });
    } catch (error) { if (revision === this.revenueEpoch) this.update({ revenue: { phase: 'error', error: chainError(error).message, data: null } }); }
  };
  withdrawRevenue = async (summary: RevenueSummary) => {
    const success = await this.send('提取票房收入', 'withdraw', [], 0n, summary);
    if (success) await this.loadRevenue();
    return success;
  };
  private async assertWithdrawal(contract: Contract, summary: RevenueSummary | undefined, session: { address: string; revision: number }) {
    if (!summary || this.state.revenue.phase !== 'ready' || summary !== this.state.revenue.data || summary.owner !== session.address || summary.walletRevision !== session.revision) throw new Error('票房数据或钱包已变化，请刷新后重新确认提现。');
    if (summary.withdrawable === 0n) throw new Error('No ticket revenue — 当前没有可提现票款。');
    if (await contract.ticketRevenue() !== summary.withdrawable) { this.clearRevenue(); throw new Error('可提现票款已变化，请刷新后重新确认金额。'); }
  }
  invalidateCheck = () => { ++this.checkEpoch; this.update({ check: emptyCheck }); };
  checkTicket = async (showInput: string, tokenInput: string) => {
    const revision = ++this.checkEpoch;
    this.update({ check: { phase: 'loading', error: null, result: null } });
    try {
      const [showId, tokenId] = ticketIds(showInput, tokenInput);
      const session = this.wallet.getSession();
      const contract = await this.checkedContract();
      const block = await this.reader.getBlock('latest'); if (!block) throw new Error('无法读取最新区块。');
      const at = { blockTag: block.number };
      const owner = getAddress(await contract.owner(at));
      if (owner !== session.address) throw new Error('当前钱包不是主办方；本期由 owner 钱包模拟场馆验票。');
      // ownerOf must succeed: absent tokens otherwise look like unused Show #0 tickets.
      const holder = await contract.ownerOf(tokenId, at);
      const [actualShow, provenance, number, uri] = await Promise.all([contract.tokenShow(tokenId, at), contract.provenance(tokenId, at), contract.ticketNumber(tokenId, at), contract.tokenURI(tokenId, at)]);
      const show = await contract.shows(actualShow, at);
      const policy = POLICIES[Number(show.resalePolicy)]; if (!policy) throw new Error('Unknown resale policy');
      let verifiedCount = 0n;
      for (let from = this.config.blockNumber; from <= block.number; from += 1000) {
        verifiedCount += BigInt((await contract.queryFilter(contract.filters.TicketVerified(showId), from, Math.min(from + 999, block.number))).length);
      }
      const result: TicketCheck = { id: tokenId.toString(), showId: actualShow.toString(), inputShow: showId.toString(), name: show.name,
        holder, issuer: provenance.issuerAddress, firstBuyer: provenance.firstBuyer, mintedAt: provenance.mintTime.toString(), used: provenance.isUsed,
        ticketNo: holder.toLowerCase() === provenance.firstBuyer.toLowerCase() ? number.toString() : null,
        image: ticketImage(uri), status: ticketStatus(provenance.isUsed, holder, provenance.firstBuyer, policy), policy,
        ...entryDecision(showId.toString(), actualShow.toString(), provenance.isUsed, holder, provenance.firstBuyer, policy),
        blockNumber: block.number, verifiedCount, checkedBy: session.address, walletRevision: session.revision };
      if (revision === this.checkEpoch && this.wallet.isCurrentSession(session)) this.update({ check: { phase: 'ready', error: null, result } });
    } catch (error) {
      if (revision === this.checkEpoch) this.update({ check: { phase: 'error', error: chainError(error).message, result: null } });
    }
  };
  private async assertTicketCheck(contract: Contract, args: readonly unknown[], session: { address: string; revision: number }) {
    const result = this.state.check.result;
    if (this.state.check.phase !== 'ready' || !result?.allowed || result.checkedBy !== session.address || result.walletRevision !== session.revision
      || args.length !== 2 || String(args[0]) !== result.inputShow || String(args[1]) !== result.id) throw new Error('请先对当前演出和 Token 完成有效 Check。');
    const [holder, used] = await Promise.all([contract.ownerOf(args[1]), contract.used(args[1])]);
    if (holder.toLowerCase() !== result.holder.toLowerCase() || used !== result.used) { this.invalidateCheck(); throw new Error('票据持有人或使用状态已改变，请重新 Check。'); }
  }
  private async checkedContract() {
    const network = await this.reader.getNetwork();
    if (network.chainId !== BigInt(this.config.chainId)) throw new Error('RPC 网络不符，已停止读取。');
    const code = await this.reader.getCode(this.config.address);
    if (keccak256(code) !== this.config.runtimeBytecodeHash) throw new Error('合约运行字节码不匹配，请核对部署配置。');
    return new Contract(this.config.address, LIVEPASS_ABI, this.reader);
  }
  load = async () => {
    const revision = ++this.epoch;
    const identity = this.currentIdentity();
    if (!identity) {
      this.update({ phase: 'idle', error: null, shows: [], owner: null, cooldown: 0n, floor: 0n, timestamp: 0n, ...emptyPersonal });
      return;
    }
    this.update({ phase: 'loading', error: null, personalPhase: 'loading', personalError: null });
    try {
      const contract = await this.checkedContract();
      const block = await this.reader.getBlock('latest'); if (!block) throw new Error('无法读取最新区块。');
      const at = { blockTag: block.number };
      const [owner, count, cooldown, floor] = await Promise.all([contract.owner(at), contract.showCount(at), contract.STAKE_COOLDOWN(at), contract.MIN_STAKE_FLOOR(at)]);
      if (count > 10000n) throw new Error('演出数量较多，需要分页读取。');
      const shows: ChainShow[] = [];
      for (let start = 0; start < Number(count); start += 10) {
        const batch = await Promise.all(Array.from({ length: Math.min(10, Number(count) - start) }, async (_, offset) => {
          const id = start + offset; const show = await contract.shows(id, at);
          let image = ''; try { const url = new URL(show.poster); if (url.protocol === 'https:') image = url.href; } catch { /* use poster placeholder */ }
          if (!POLICIES[Number(show.resalePolicy)]) throw new Error('Unknown resale policy');
          return { id: String(id), name: String(show.name), subtitle: `Show #${id} · ${show.nextTicketNo - 1n} sold`, genre: 'LIVE ON SEPOLIA',
            price: formatEther(show.price), stake: formatEther(show.minStake), priceWei: show.price as bigint, minStake: show.minStake as bigint,
            policy: POLICIES[Number(show.resalePolicy)], saleOpen: Boolean(show.saleOpen), rulesFrozen: Boolean(show.rulesFrozen), sold: (show.nextTicketNo - 1n).toString(), image, color: '#c4a0ff' };
        }));
        shows.push(...batch);
      }
      if (revision !== this.epoch) return;
      if (this.state.check.result && this.state.check.result.checkedBy !== getAddress(owner)) this.invalidateCheck();
      this.update({ phase: 'ready', shows, owner: getAddress(owner), cooldown, floor, timestamp: BigInt(block.timestamp) });
      try {
        const [stake, stakeSince, bought, tickets] = await Promise.all([
          contract.stakeOf(identity, at), contract.stakeSince(identity, at),
          Promise.all(shows.map(async show => [show.id, await contract.hasBought(identity, show.id, at)] as const)),
          this.readTickets(contract, identity, shows, block.number),
        ]);
        if (revision === this.epoch && identity === this.currentIdentity()) this.update({ identity, personalPhase: 'ready', personalError: null, stake, stakeSince, bought: Object.fromEntries(bought), tickets });
      } catch (error) {
        if (revision === this.epoch) this.update({ ...emptyPersonal, identity, personalPhase: 'error', personalError: chainError(error).message });
      }
    } catch (error) { if (revision === this.epoch) this.update({ phase: 'error', error: chainError(error).message, owner: null, ...emptyPersonal }); }
  };
  private async readTickets(contract: Contract, address: string, shows: ChainShow[], toBlock: number): Promise<Ticket[]> {
    const ids = new Set<string>();
    // Search from the actual deployment block, never a recent-block shortcut.
    for (let from = this.config.blockNumber; from <= toBlock; from += 1000) {
      const logs = await contract.queryFilter(contract.filters.Transfer(null, address), from, Math.min(from + 999, toBlock));
      for (const log of logs) if ('args' in log) ids.add(log.args.tokenId.toString());
    }
    const result: Ticket[] = [];
    for (const id of ids) {
      const at = { blockTag: toBlock }; const holder = await contract.ownerOf(id, at);
      if (holder.toLowerCase() !== address.toLowerCase()) continue;
      const [p, showId, number, uri] = await Promise.all([contract.provenance(id, at), contract.tokenShow(id, at), contract.ticketNumber(id, at), contract.tokenURI(id, at)]);
      const show = shows.find(show => show.id === showId.toString()); if (!show) throw new Error('Ticket refers to unknown show');
      result.push({ id, showId: show.id, name: show.name, image: ticketImage(uri), status: ticketStatus(p.isUsed, holder, p.firstBuyer, show.policy),
        ticketNo: holder.toLowerCase() === p.firstBuyer.toLowerCase() ? number.toString() : null,
        issuer: p.issuerAddress, firstBuyer: p.firstBuyer, holder, mintedAt: p.mintTime.toString(), used: p.isUsed });
    }
    return result;
  }
  getProvenance = async (tokenId: bigint): Promise<TicketProvenance> => {
    const contract = await this.checkedContract();
    const block = await this.reader.getBlock('latest'); if (!block) throw new Error('无法读取最新区块。');
    const at = { blockTag: block.number };
    const [provenance, showId, number, uri] = await Promise.all([
      contract.provenance(tokenId, at), contract.tokenShow(tokenId, at), contract.ticketNumber(tokenId, at), contract.tokenURI(tokenId, at),
    ]);
    const show = await contract.shows(showId, at);
    const policy = POLICIES[Number(show.resalePolicy)]; if (!policy) throw new Error('Unknown resale policy');
    const logs: Log[] = [];
    for (let from = this.config.blockNumber; from <= block.number; from += 1000) {
      const to = Math.min(from + 999, block.number);
      const [issued, transfers] = await Promise.all([
        contract.queryFilter(contract.filters.TicketIssued(null, tokenId), from, to),
        contract.queryFilter(contract.filters.Transfer(null, null, tokenId), from, to),
      ]);
      logs.push(...issued, ...transfers);
    }
    logs.sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
    const timestamps = new Map<number, number>([[block.number, block.timestamp]]);
    const history: ProvenanceEvent[] = [];
    for (const log of logs) {
      const event = contract.interface.parseLog(log);
      if (!event) throw new Error('无法解码溯源事件，已停止查询。');
      let timestamp = timestamps.get(log.blockNumber);
      if (timestamp === undefined) {
        const eventBlock = await this.reader.getBlock(log.blockNumber);
        if (!eventBlock) throw new Error(`无法读取溯源区块 #${log.blockNumber}。`);
        timestamp = eventBlock.timestamp; timestamps.set(log.blockNumber, timestamp);
      }
      const location = { transactionHash: log.transactionHash, blockNumber: log.blockNumber, logIndex: log.index, timestamp };
      history.push(event.name === 'TicketIssued'
        ? { ...location, event: 'TicketIssued', issuer: event.args.issuer, buyer: event.args.buyer }
        : { ...location, event: 'Transfer', from: event.args.from, to: event.args.to });
    }
    const ticket: Ticket = { id: tokenId.toString(), showId: showId.toString(), name: String(show.name), image: ticketImage(uri),
      status: ticketStatus(provenance.isUsed, provenance.currentHolder, provenance.firstBuyer, policy),
      ticketNo: provenance.currentHolder.toLowerCase() === provenance.firstBuyer.toLowerCase() ? number.toString() : null,
      issuer: provenance.issuerAddress, firstBuyer: provenance.firstBuyer, holder: provenance.currentHolder,
      mintedAt: provenance.mintTime.toString(), used: provenance.isUsed };
    return { tokenId: tokenId.toString(), showId: showId.toString(), issuer: provenance.issuerAddress,
      firstBuyer: provenance.firstBuyer, currentHolder: provenance.currentHolder, mintedAt: provenance.mintTime.toString(),
      used: provenance.isUsed, policy, status: ticketStatus(provenance.isUsed, provenance.currentHolder, provenance.firstBuyer, policy),
      blockNumber: block.number, history, ticket };
  };
  private remember(value: PendingEvidence | null) {
    this.pending = value;
    if (typeof window !== 'undefined') { try { if (value) sessionStorage.setItem(storageKey, JSON.stringify(value)); else sessionStorage.removeItem(storageKey); } catch { /* still retain in memory */ } }
  }
  private async finish(receipt: TransactionReceipt, outcome?: { stage: 'rejected' | 'reverted' | 'failed'; message: string }) {
    this.remember(null);
    this.tx({ stage: 'pending', hash: receipt.hash, message: '链上结果已确认，正在刷新数据。' });
    await this.wallet.refresh(); await this.load();
    this.tx(outcome ?? { stage: receipt.status === 1 ? 'confirmed' : 'reverted', message: receipt.status !== 1 ? '交易已回滚，状态未变。'
      : this.state.phase === 'error' || this.state.personalPhase === 'error' ? '交易已确认；数据刷新失败，请重新读取，不要重复提交。' : '交易已确认，链上数据已刷新。' });
    return receipt.status === 1 && !outcome;
  }
  private matchesPending(tx: TransactionResponse, pending: PendingEvidence) {
    return tx.chainId === BigInt(this.config.chainId) && tx.from.toLowerCase() === pending.sender.toLowerCase()
      && tx.to?.toLowerCase() === this.config.address.toLowerCase() && keccak256(tx.data) === pending.dataHash && tx.value.toString() === pending.value;
  }
  private async finishReplacement(pending: PendingEvidence, replacement: TransactionResponse, receipt: TransactionReceipt) {
    if (pending.nonce === undefined || replacement.chainId !== BigInt(this.config.chainId)
      || replacement.from.toLowerCase() !== pending.sender.toLowerCase() || replacement.nonce !== pending.nonce) {
      throw new Error('该交易不是原钱包同一交易序号的替换交易，保留原记录。');
    }
    if (this.matchesPending(replacement, pending)) return this.finish(receipt);
    const cancelled = replacement.to?.toLowerCase() === pending.sender.toLowerCase() && replacement.value === 0n && replacement.data === '0x';
    return this.finish(receipt, { stage: receipt.status === 0 ? 'reverted' : cancelled ? 'rejected' : 'failed',
      message: receipt.status === 0 ? '替换交易已确认但回滚，原操作未完成。'
        : cancelled ? '已核对钱包取消交易，原操作已取消，可以重新操作。' : '原交易已被另一项操作替换并确认，原操作未完成。请核对钱包记录。' });
  }
  checkPending = async (replacementHash?: string) => {
    const pending = this.pending; if (!pending || this.checking) return;
    this.checking = true;
    try {
      const hash = replacementHash === undefined ? pending.hash : replacementHash.trim();
      if (!/^0x[\da-f]{64}$/i.test(hash)) throw new Error('请输入完整的 0x 交易哈希。');
      const isOriginal = hash.toLowerCase() === pending.hash.toLowerCase();
      await this.checkedContract();
      const [original, tx, receipt] = await Promise.all([this.reader.getTransaction(pending.hash),
        isOriginal ? null : this.reader.getTransaction(hash), this.reader.getTransactionReceipt(hash)]);
      if (this.pending?.hash !== pending.hash) return; // A live wait may already have settled this transaction.
      if (original) {
        if (!this.matchesPending(original, pending) || (pending.nonce !== undefined && pending.nonce !== original.nonce)) throw new Error('待确认记录与链上交易不匹配。');
        if (pending.nonce === undefined) { pending.nonce = original.nonce; this.remember(pending); }
      }
      const candidate = tx ?? (isOriginal ? original : null);
      if (!candidate || !receipt) { this.tx({ message: '交易尚未确认或 RPC 尚未索引。若已在钱包加速或取消，请填入该笔交易哈希核对；保留原记录，不自动重发。' }); return; }
      if (isOriginal) await this.finish(receipt);
      else {
        if (pending.nonce === undefined) throw new Error('旧记录缺少原交易序号，且 RPC 未返回原交易。请先在钱包核对原交易，暂不解除锁定。');
        await this.finishReplacement(pending, candidate, receipt);
      }
    } catch (error) { this.tx({ message: `核对失败，仍保留原交易：${chainError(error).message}` }); }
    finally { this.checking = false; }
  };
  send = async (action: string, method: WriteMethod, args: readonly unknown[], value = 0n, revenue?: RevenueSummary): Promise<boolean> => {
    if (this.isLocked()) return false;
    this.tx({ ...idleTx, stage: 'preparing', action, message: '正在核对网络、权限与 Gas…' });
    let browser: BrowserProvider | null = null;
    try {
      const session = this.wallet.getSession(); this.tx({ sender: session.address });
      const assertSession = async () => {
        if (!this.wallet.isCurrentSession(session)) throw new Error('钱包账户或网络已变化，请重新检查。');
        const [chain, accounts] = await Promise.all([session.provider.request({ method: 'eth_chainId' }), session.provider.request({ method: 'eth_accounts' })]);
        if (BigInt(chain as string) !== BigInt(this.config.chainId) || !Array.isArray(accounts) || getAddress(accounts[0]) !== session.address) throw new Error('钱包账户或网络已变化，请重新检查。');
      };
      await assertSession(); await this.checkedContract();
      browser = new BrowserProvider(session.provider, undefined, { cacheTimeout: -1 });
      const signer = await browser.getSigner(session.address);
      const contract = new Contract(this.config.address, LIVEPASS_ABI, signer);
      if (['createShow', 'setPrice', 'setResalePolicy', 'setStakeRequirement', 'openSale', 'closeSale', 'verify', 'withdraw'].includes(method) && getAddress(await contract.owner()) !== session.address) throw new Error('当前钱包不是合约主办方。');
      if (method === 'withdraw') await this.assertWithdrawal(contract, revenue, session);
      if (method === 'verify') await this.assertTicketCheck(contract, args, session);
      const fn = contract.getFunction(method);
      await fn.staticCall(...args, { value }); // fresh eligibility and exact revert evidence
      const request = await fn.populateTransaction(...args, { value });
      const [estimate, fees, balance] = await Promise.all([signer.estimateGas(request), readDeploymentFees(browser), browser.getBalance(session.address)]);
      const gasLimit = (estimate * 120n + 99n) / 100n;
      if (balance < value + gasLimit * fees.maxFeePerGas) throw new Error(`Sepolia 测试 ETH 不足：需覆盖 ${formatEther(value)} ETH 加最高 ${formatEther(gasLimit * fees.maxFeePerGas)} ETH gas。`);
      await assertSession();
      if (method === 'withdraw') await this.assertWithdrawal(contract, revenue, session);
      if (method === 'verify') await this.assertTicketCheck(contract, args, session);
      this.tx({ stage: 'awaiting_signature', message: `请在 MetaMask 确认。金额 ${formatEther(value)} ETH；Gas 费用上限 ${formatEther(gasLimit * fees.maxFeePerGas)} ETH。` });
      const transaction = await signer.sendTransaction({ ...request, chainId: this.config.chainId, gasLimit, type: 2, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas });
      const evidence = { hash: transaction.hash, sender: session.address, action, dataHash: keccak256(request.data!), value: value.toString(), nonce: transaction.nonce };
      this.remember(evidence); this.tx({ stage: 'pending', hash: transaction.hash, message: '交易已广播，等待 1 个确认。请勿重复提交。' });
      try {
        const receipt = await transaction.wait(1, 120000); if (!receipt) throw new Error('未读取到交易回执。');
        if (this.pending?.hash !== evidence.hash) return false;
        return await this.finish(receipt);
      } catch (error) {
        if (this.pending?.hash !== evidence.hash) return false;
        const replacement = error as { code?: string; replacement?: typeof transaction; receipt?: TransactionReceipt };
        if (replacement.code === 'TRANSACTION_REPLACED' && replacement.receipt && replacement.replacement) {
          return await this.finishReplacement(evidence, replacement.replacement, replacement.receipt);
        }
        if ((error as { receipt?: TransactionReceipt }).receipt?.status === 0) return await this.finish((error as { receipt: TransactionReceipt }).receipt);
        this.tx({ stage: 'pending', message: `暂未确认，保留原哈希且不重发：${chainError(error).message}` }); return false;
      }
    } catch (error) {
      const result = chainError(error);
      this.tx({ stage: this.pending ? 'pending' : result.rejected ? 'rejected' : 'failed', message: this.pending ? `核对未完成，保留原交易：${result.message}` : result.message });
      return false;
    } finally { browser?.destroy(); }
  };
}
