import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useWallet } from '../wallet/context';
import { useLivePass } from './context';
import { DEPLOYMENT } from './contract';
import { ethInput, showInput, type ChainShow } from './model';
import { POLICY_COPY } from '../data/livepass';
import { formatEther } from 'ethers';

export function Action({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [p.action, secondary && p.secondary, (disabled || pressed) && { opacity: 0.45 }]}><Text style={[p.actionText, secondary && { color: '#e6e3f5' }]}>{label}</Text></Pressable>;
}
export function TxStatus() {
  const shop = useLivePass(); const tx = shop.tx;
  if (tx.stage === 'idle') return null;
  const labels = { preparing: '准备交易', awaiting_signature: '等待钱包确认', pending: '链上确认中', confirmed: '已确认', rejected: '已取消', reverted: '已回滚', failed: '未完成' };
  return <View style={p.notice} accessibilityLiveRegion="polite"><Text style={p.label}>{tx.action} · {labels[tx.stage]}</Text><Text style={p.copy}>{tx.message}</Text>{!!tx.sender && <Text style={p.small}>提交钱包：{tx.sender}</Text>}{tx.hash && <><Action secondary label={`查看交易 ${tx.hash.slice(0, 10)}… ↗`} onPress={() => { void Linking.openURL(`https://sepolia.etherscan.io/tx/${tx.hash}`); }} />{tx.stage === 'pending' && <Action secondary label="核对原交易状态" onPress={() => { void shop.checkPending(); }} />}</>}</View>;
}
export function WalletGate() {
  const wallet = useWallet();
  return <View style={p.stack}><Text style={p.copy}>{!wallet.address ? '连接 MetaMask 后读取购票资格与票夹。' : '请切换到 Sepolia 后继续。'}</Text><Action label={!wallet.address ? '连接 MetaMask' : '切换到 Sepolia'} disabled={wallet.busy} onPress={() => { void (!wallet.address ? wallet.connect() : wallet.switchToSepolia()); }} />{wallet.error && <Text accessibilityRole="alert" style={p.notice}>{wallet.error}</Text>}{wallet.notice && <Text style={p.copy}>{wallet.notice}</Text>}</View>;
}
function PersonalError() {
  const shop = useLivePass();
  return <View style={p.stack}><Text accessibilityRole="alert" style={p.copy}>{shop.personalError ?? '正在读取当前钱包的链上状态…'}</Text><Action label="重新读取" disabled={shop.personalPhase === 'loading'} onPress={() => { void shop.reload(); }} /></View>;
}
export function ShowDetails({ id, onStake }: { id: string; onStake: () => void }) {
  const shop = useLivePass(); const wallet = useWallet(); const show = shop.shows.find(show => show.id === id);
  const [ack, setAck] = useState(false);
  useEffect(() => setAck(false), [wallet.address, wallet.chainId, id, show?.price]);
  if (!show) return <Text style={p.copy}>演出已失效或链上读取未完成，请关闭后重试。</Text>;
  const ready = shop.personalPhase === 'ready' && shop.identity === wallet.address && wallet.isSepolia;
  const remaining = show.minStake > 0n ? shop.stakeSince + shop.cooldown - shop.timestamp : 0n;
  const reason = shop.phase !== 'ready' ? '正在核对最新演出数据' : !wallet.address ? '请先连接钱包' : !wallet.isSepolia ? '请切换到 Sepolia' : !ready ? '购票资格尚未读取完成' : !show.saleOpen ? '本场尚未开售或已停售' : shop.bought[id] ? '该钱包已首次购买本场，转出也不能再次购买' : shop.stake < show.minStake ? '预存未达到本场门槛' : remaining > 0n ? `预存仍在冷却，链上剩余约 ${remaining} 秒` : null;
  return <View style={p.stack}>
    <Text style={p.title}>{show.price} ETH</Text><Text style={p.copy}>{show.saleOpen ? '● ON SALE' : '○ SALE CLOSED'} · Show #{show.id}</Text>
    <Text style={p.copy}>Resale: {show.policy}{'\n'}{POLICY_COPY[show.policy]}</Text>
    <Text style={p.copy}>{show.minStake === 0n ? '本场无需预存。' : `预存门槛 ${show.stake} ETH；冷却 ${shop.cooldown} 秒。保证金可取回，票款需另付。`}</Text>
    <Text style={p.small}>规则{show.rulesFrozen ? '已永久冻结' : '尚未冻结，首次开售后永久冻结'} · 已售 {show.sold} 张</Text>
    {!wallet.address || !wallet.isSepolia ? <WalletGate /> : !ready ? <PersonalError /> : <Text style={p.copy}>当前预存 {formatEther(shop.stake)} ETH · {shop.bought[id] ? '已首次购买' : '尚未首次购买'}</Text>}
    {show.minStake > 0n && <Action secondary label="管理预存 / 取回" onPress={onStake} />}
    {reason && <Text style={p.notice}>{reason}</Text>}
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ack, disabled: !!reason || shop.locked }} disabled={!!reason || shop.locked} onPress={() => setAck(!ack)} style={p.check}><Text style={p.copy}>{ack ? '☑' : '☐'} 确认支付 {show.price} Sepolia ETH（另付 gas），并接受 {show.policy} 转售规则。</Text></Pressable>
    <Action label={shop.locked ? '请完成当前交易' : `支付 ${show.price} ETH 并出票`} disabled={!!reason || !ack || shop.locked} onPress={() => { setAck(false); void shop.send(`购买 ${show.name}`, 'buy', [BigInt(id)], show.priceWei); }} />
    <Text style={p.small}>付款和 NFT 铸造在同一笔交易中完成。每钱包每场仅能首次购买一张，不等于实名一人一票。交易前合约会重新校验资格。</Text><TxStatus />
  </View>;
}
export function StakePanel() {
  const shop = useLivePass(); const wallet = useWallet();
  const [amount, setAmount] = useState('0.001'); const [refund, setRefund] = useState(''); const [error, setError] = useState('');
  const [ack, setAck] = useState(false);
  useEffect(() => { setAck(false); setError(''); setRefund(''); }, [wallet.address, wallet.chainId]);
  if (!wallet.address || !wallet.isSepolia) return <WalletGate />;
  if (shop.personalPhase !== 'ready' || shop.identity !== wallet.address) return <PersonalError />;
  const send = (method: 'stake' | 'unstake') => {
    try { const n = ethInput(method === 'stake' ? amount : refund); if (method === 'unstake' && n > shop.stake) throw new Error('取回金额超过你的预存余额。'); setError(''); setAck(false); void shop.send(method === 'stake' ? '存入保证金' : '取回保证金', method, method === 'stake' ? [] : [n], method === 'stake' ? n : 0n); }
    catch (e) { setError((e as Error).message); }
  };
  const remaining = shop.stakeSince + shop.cooldown - shop.timestamp;
  return <View style={p.stack}><Text style={p.title}>{formatEther(shop.stake)} ETH</Text><Text style={p.copy}>你的可取回保证金。取回不受冷却限制，也不受已购票状态限制。</Text>
    <Text style={p.copy}>预存冷却 {shop.cooldown} 秒。{shop.stake > 0n ? remaining > 0n ? `链上剩余约 ${remaining} 秒。` : '冷却已完成。' : '当前没有预存。'}</Text>
    {shop.shows.filter(show => show.minStake > 0n).map(show => <Text key={show.id} style={p.small}>#{show.id} {show.name}：要求 {show.stake} ETH</Text>)}
    <Text style={p.label}>存入金额 / ETH</Text><TextInput accessibilityLabel="存入金额 ETH" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={p.input} />
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ack }} onPress={() => setAck(!ack)} style={p.check}><Text style={p.copy}>{ack ? '☑' : '☐'} 我了解新增预存会重置全部预存的冷却时间，保证金不抵扣票款。</Text></Pressable>
    <Action label="存入保证金" disabled={!ack || shop.locked} onPress={() => send('stake')} />
    <Text style={p.label}>取回金额 / ETH</Text><TextInput accessibilityLabel="取回金额 ETH" value={refund} onChangeText={setRefund} keyboardType="decimal-pad" style={p.input} />
    <Action secondary label="填入全部可取回金额" onPress={() => setRefund(formatEther(shop.stake))} disabled={shop.locked || shop.stake === 0n} />
    <Action label="取回保证金" disabled={shop.locked || shop.stake === 0n} onPress={() => send('unstake')} />
    {!!error && <Text accessibilityRole="alert" style={p.notice}>{error}</Text>}<TxStatus />
  </View>;
}
export function TicketsPanel() {
  const shop = useLivePass(); const wallet = useWallet();
  if (!wallet.address || !wallet.isSepolia) return <WalletGate />;
  if (shop.personalPhase !== 'ready' || shop.identity !== wallet.address) return <PersonalError />;
  return <View style={p.stack}><Text style={p.copy}>按当前所有权读取，含受让票。每 30 秒在页面可见时刷新；截图不能作为入场凭证。</Text><Action secondary label="刷新票夹" onPress={() => { void shop.reload(); }} />
    {!shop.tickets.length && <Text style={p.notice}>当前钱包还没有 LivePass 门票。购票确认后会显示在这里。</Text>}
    {shop.tickets.map(ticket => <View key={ticket.id} style={p.card}>
      <Text style={p.title}>{ticket.name}</Text><Image source={{ uri: ticket.image }} style={{ width: '100%', aspectRatio: 900 / 440 }} contentFit="contain" accessibilityLabel={`${ticket.name} NFT ticket`} />
      <Text style={p.label}>{ticket.status}</Text><Text style={p.copy}>Token #{ticket.id} · Show #{ticket.showId} · Ticket #{ticket.ticketNo ?? '—（受让票）'}</Text>
      <Text selectable style={p.small}>发行方：{ticket.issuer}{'\n'}首次买家：{ticket.firstBuyer}{'\n'}当前持有人：{ticket.holder}{'\n'}铸造时间：{new Date(Number(ticket.mintedAt) * 1000).toLocaleString()}</Text>
      <Text style={p.small}>{ticket.used ? '此票已核销，不能再次入场。' : '入场以主办方链上预检和核销为准。'}</Text>
      <Action secondary label="在 Etherscan 查看 NFT ↗" onPress={() => { void Linking.openURL(`https://sepolia.etherscan.io/token/${DEPLOYMENT.address}?a=${ticket.id}`); }} />
    </View>)}<TxStatus /></View>;
}
const posters = [
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=85',
];
export function AdminPanel({ mode = 'new' }: { mode?: 'new' | 'shows' }) {
  const shop = useLivePass(); const wallet = useWallet();
  const [name, setName] = useState('LivePass Test Night'); const [poster, setPoster] = useState(posters[0]);
  const [price, setPrice] = useState('0.0001'); const [stake, setStake] = useState('0'); const [policy, setPolicy] = useState(0);
  const [ack, setAck] = useState(false); const [error, setError] = useState(''); const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { setAck(false); setOpenId(null); setError(''); }, [wallet.address, wallet.chainId]);
  if (!wallet.address || !wallet.isSepolia) return <WalletGate />;
  if (shop.phase !== 'ready' || !shop.owner) return <View style={p.stack}><Text style={p.copy}>{shop.error ?? '正在读取合约主办方，请稍后。'}</Text><Action label="重试" onPress={() => { void shop.reload(); }} /></View>;
  if (wallet.address !== shop.owner) return <Text accessibilityRole="alert" style={p.notice}>当前钱包不是主办方。仅合约 owner 可发布和管理演出。</Text>;
  const create = async () => {
    try {
      const args = showInput(name, poster, price, policy, stake, shop.floor); setError(''); setAck(false);
      if (await shop.send(`发布 ${args[0]}`, 'createShow', args)) router.push('/admin/shows');
    } catch (e) { setError((e as Error).message); }
  };
  return <View style={p.stack}>
    <AdminNav />
    {mode === 'new' ? <>
      <Text style={p.copy}>填写真实上链字段。发布后尚未开售，规则将在首次开售时永久冻结。票价为 Sepolia 测试 ETH。</Text>
      <Text style={p.label}>快速填入测试配置（不会自动发送交易）</Text>
      <View style={p.row}>{['Closed', 'Open', 'Detect'].map((label, i) => <Action key={label} secondary label={label} onPress={() => { setPolicy(i); setName(['Neon Nights', 'Midnight Symphony', 'Starlight Sessions'][i]); setPoster(posters[i]); setPrice('0.0001'); setStake(i === 2 ? '0.001' : '0'); setAck(false); }} />)}</View>
      <Field label="演出名称" value={name} onChange={v => { setName(v); setAck(false); }} />
      <Field label="海报 HTTPS 地址" value={poster} onChange={v => { setPoster(v); setAck(false); }} />
      <Field label="票价 ETH" value={price} onChange={v => { setPrice(v); setAck(false); }} />
      <Text style={p.label}>转售策略</Text><View style={p.row}>{['Closed', 'Open', 'Detect'].map((label, i) => <Action key={label} secondary={policy !== i} label={`${policy === i ? '● ' : ''}${label}`} onPress={() => { setPolicy(i); setAck(false); }} />)}</View>
      <Text style={p.copy}>{POLICY_COPY[(['Closed', 'Open', 'Detect'] as const)[policy]]}</Text>
      <Field label="预存门槛 ETH（0 为关闭）" value={stake} onChange={v => { setStake(v); setAck(false); }} />
      <Text style={p.small}>非零门槛至少 {formatEther(shop.floor)} ETH；预存冷却 {shop.cooldown} 秒。测试配置票价为 0.0001 ETH，降低测试余额需求。</Text>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ack }} onPress={() => setAck(!ack)} style={p.check}><Text style={p.copy}>{ack ? '☑' : '☐'} 确认以上内容发布到 Sepolia；首次开售后票价、策略和门槛永久冻结。</Text></Pressable>
      <Action label="发布演出到 Sepolia" disabled={!ack || shop.locked} onPress={() => { void create(); }} />
      {!!error && <Text accessibilityRole="alert" style={p.notice}>{error}</Text>}
    </> : <>
      {!shop.shows.length && <Text style={p.notice}>合约中还没有演出，请先发布。</Text>}
      {shop.shows.map(show => <View key={show.id} style={p.card}><Text style={p.title}>#{show.id} {show.name}</Text><Text style={p.copy}>{show.price} ETH · {show.policy} · 预存 {show.stake} ETH{'\n'}{show.saleOpen ? '在售' : '未开售 / 已停售'} · 已售 {show.sold} · {show.rulesFrozen ? '规则永久冻结' : '首次开售后规则永久冻结'}</Text>
        {openId === show.id && !show.saleOpen ? <><Text style={p.notice}>确认开售 #{show.id}：票价 {show.price} ETH，{show.policy}，预存 {show.stake} ETH。此操作永久冻结规则，停售也不会解冻。</Text><Action label="确认开售并冻结规则" disabled={shop.locked} onPress={() => { setOpenId(null); void shop.send(`开售 ${show.name}`, 'openSale', [BigInt(show.id)]); }} /><Action secondary label="取消" onPress={() => setOpenId(null)} /></> : <Action label={show.saleOpen ? '停售' : '开售'} disabled={shop.locked} onPress={() => { if (show.saleOpen) void shop.send(`停售 ${show.name}`, 'closeSale', [BigInt(show.id)]); else setOpenId(show.id); }} />}
      </View>)}
    </>}
    <TxStatus /><Text style={p.small}>已提供发布、开售、停售、验票及票房提现；规则编辑界面将另行接入。</Text>
  </View>;
}
export function AdminNav() {
  return <View style={p.row}><Action secondary label="发布演出" onPress={() => router.push('/admin/new')} /><Action secondary label="管理演出" onPress={() => router.push('/admin/shows')} /><Action secondary label="验票与核销" onPress={() => router.push('/admin/verify')} /><Action secondary label="票房与提现" onPress={() => router.push('/admin/revenue')} /></View>;
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View style={{ gap: 8 }}><Text style={p.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} style={p.input} autoCapitalize="none" /></View>;
}
export const p = StyleSheet.create({
  stack: { gap: 17 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { color: '#eee4ff', fontSize: 23, lineHeight: 30, fontWeight: '700' }, copy: { color: '#cfc4df', fontSize: 14, lineHeight: 24 },
  small: { color: '#b3a5c7', fontSize: 12, lineHeight: 22 }, label: { color: '#d3bcf8', fontSize: 13, lineHeight: 23, fontWeight: '700' },
  action: { backgroundColor: '#c4a7ff', paddingVertical: 13, paddingHorizontal: 18, borderRadius: 9, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#170e2b', fontWeight: '700', fontSize: 14 }, secondary: { backgroundColor: '#251935', borderWidth: 1, borderColor: '#5a4274' },
  input: { backgroundColor: '#100c1c', borderWidth: 1, borderColor: '#685180', color: '#f2ebff', minHeight: 48, padding: 13, borderRadius: 8, fontSize: 14 },
  check: { padding: 13, borderWidth: 1, borderColor: '#5c436e', borderRadius: 8 },
  notice: { backgroundColor: '#2b1c3a', padding: 16, borderRadius: 9, color: '#e3c5fd', lineHeight: 24, gap: 10 },
  card: { borderWidth: 1, borderColor: '#503b66', borderRadius: 12, padding: 19, gap: 14, backgroundColor: '#191222' },
});
