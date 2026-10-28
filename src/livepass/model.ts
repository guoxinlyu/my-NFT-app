import { formatEther, Interface, parseEther } from 'ethers';
import { LIVEPASS_ABI } from './contract.ts';

export const POLICIES = ['Closed', 'Open', 'Detect'] as const;
export type ChainShow = {
  id: string; name: string; subtitle: string; genre: string; price: string; stake: string;
  priceWei: bigint; minStake: bigint; policy: typeof POLICIES[number]; saleOpen: boolean;
  rulesFrozen: boolean; sold: string; image: string; color: string;
};
export type Ticket = {
  id: string; showId: string; name: string; image: string; status: string; ticketNo: string | null;
  issuer: string; firstBuyer: string; holder: string; mintedAt: string; used: boolean;
};
type ProvenanceEventLocation = {
  transactionHash: string; blockNumber: number; logIndex: number; timestamp: number;
};
export type ProvenanceEvent = ProvenanceEventLocation & (
  | { event: 'TicketIssued'; issuer: string; buyer: string }
  | { event: 'Transfer'; from: string; to: string }
);
export type TicketProvenance = {
  tokenId: string; showId: string; issuer: string; firstBuyer: string; currentHolder: string;
  mintedAt: string; used: boolean; policy: typeof POLICIES[number]; status: string;
  blockNumber: number; history: ProvenanceEvent[]; ticket: Ticket;
};
export function ticketIds(show: string, token: string) {
  const integer = (value: string, minimum: bigint) => {
    if (!/^(0|[1-9]\d*)$/.test(value) || value.length > 78) throw new Error('Show # 须为整数 ≥0，Token # 须为整数 ≥1；请输入实际 tokenId。');
    const id = BigInt(value);
    if (id < minimum || id >= 2n ** 256n) throw new Error('票据编号超出 uint256 范围。');
    return id;
  };
  return [integer(show, 0n), integer(token, 1n)] as const;
}
export function entryDecision(inputShow: string, actualShow: string, used: boolean, holder: string, firstBuyer: string, policy: string) {
  if (inputShow !== actualShow) return { allowed: false, reason: `Ticket does not belong to this show — 该票属于演出 #${actualShow}。` };
  if (used) return { allowed: false, reason: 'Ticket already used — USED · deny entry，已核销，不能重复入场。' };
  if (policy === 'Detect' && holder.toLowerCase() !== firstBuyer.toLowerCase()) return { allowed: false, reason: 'Resale not permitted — RESOLD · deny entry，当前持有人不是首次买家。' };
  return { allowed: true, reason: policy === 'Open' ? 'Admissible (resold allowed) — Open 允许当前持有人入场。' : policy === 'Closed' ? 'Resale restricted — Closed 禁止转移，未使用票可入场。' : 'Admissible — Detect 首次买家可入场。' };
}
const contractInterface = new Interface(LIVEPASS_ABI);
export function chainError(error: unknown): { rejected: boolean; message: string } {
  const e = error as { code?: string | number; reason?: string; shortMessage?: string; message?: string;
    data?: string; info?: { error?: { code?: number; data?: string; message?: string } }; error?: { code?: number; data?: string } };
  if (e?.code === 4001 || e?.code === 'ACTION_REJECTED' || e?.info?.error?.code === 4001 || e?.error?.code === 4001) return { rejected: true, message: '已取消交易。' };
  let reason = e?.reason;
  const data = e?.data ?? e?.info?.error?.data ?? e?.error?.data;
  if (!reason && typeof data === 'string') {
    try { const decoded = contractInterface.parseError(data); reason = decoded?.name === 'Error' ? String(decoded.args[0]) : decoded ? `${decoded.name}(${decoded.args.map(String).join(', ')})` : undefined; } catch { /* preserve RPC message below */ }
  }
  return { rejected: false, message: (reason ?? e?.shortMessage ?? e?.message ?? '链上读取失败，请重试。').slice(0, 300) };
}
export function ethInput(value: string, allowZero = false): bigint {
  if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value.trim())) throw new Error('ETH 金额须为十进制，最多 18 位小数。');
  const amount = parseEther(value.trim());
  if (amount < 0n || (!allowZero && amount === 0n)) throw new Error('金额必须大于 0。');
  return amount;
}
export function validPoster(value: string): string {
  const poster = value.trim();
  if (new TextEncoder().encode(poster).length > 2048) throw new Error('海报地址过长。');
  try { const url = new URL(poster); if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) return url.href; } catch { /* invalid */ }
  throw new Error('海报请填写有效的 HTTPS 图片地址。');
}
export function showInput(name: string, poster: string, price: string, policy: number, stake: string, floor: bigint) {
  const cleaned = name.trim();
  if (!cleaned || Array.from(cleaned).length > 64 || /["\\<>&\u0000-\u001f\u007f]/.test(cleaned) || Array.from(cleaned).some(c => c.charCodeAt(0) >= 0xd800 && c.charCodeAt(0) <= 0xdfff && c.length === 1)) throw new Error('演出名须为 1–64 个字符，不能包含引号、反斜杠、< > & 或控制字符。');
  const amount = ethInput(price); if (amount > parseEther('100')) throw new Error('课程测试演出票价请勿超过 100 ETH。');
  const minimum = ethInput(stake, true);
  if (minimum !== 0n && minimum < floor) throw new Error(`非零预存门槛至少为 ${formatEther(floor)} ETH。`);
  if (!Number.isInteger(policy) || policy < 0 || policy > 2) throw new Error('请选择有效的转售策略。');
  return [cleaned, validPoster(poster), amount, policy, minimum] as const;
}
export function ticketStatus(used: boolean, holder: string, firstBuyer: string, policy: string) {
  if (used) return 'VERIFIED · ADMIT';
  if (holder.toLowerCase() === firstBuyer.toLowerCase()) return 'UNUSED · VALID';
  return policy === 'Open' ? 'TRANSFERRED · ADMISSIBLE' : 'RESOLD · NOT ADMISSIBLE';
}
export function ticketImage(uri: string): string {
  const prefix = 'data:application/json;base64,';
  if (!uri.startsWith(prefix) || uri.length > 1000000) throw new Error('Invalid tokenURI JSON encoding');
  const json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(uri.slice(prefix.length)), c => c.charCodeAt(0))));
  if (typeof json.image !== 'string' || !/^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+={0,2}$/.test(json.image)) throw new Error('Invalid ticket image encoding');
  return json.image;
}
