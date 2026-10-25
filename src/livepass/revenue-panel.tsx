import { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { formatEther } from 'ethers';
import { useWallet } from '../wallet/context';
import { useLivePass } from './context';
import type { RevenueSummary } from './client';
import { Action, AdminNav, p, TxStatus, WalletGate } from './panels';

export function RevenuePanel() {
  const wallet = useWallet(); const shop = useLivePass(); const { width } = useWindowDimensions();
  const { data, phase, error } = shop.revenue;
  const [confirmation, setConfirmation] = useState<RevenueSummary | null>(null);
  useEffect(() => {
    const refresh = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') void shop.loadRevenue(); };
    if (wallet.address && wallet.isSepolia) refresh();
    const timer = setInterval(refresh, 30000);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', refresh); shop.clearRevenue(); };
  }, [wallet.address, wallet.isSepolia, shop.loadRevenue, shop.clearRevenue]);
  useEffect(() => setConfirmation(null), [data, wallet.address, wallet.chainId]);
  const withdraw = async () => {
    const reviewed = confirmation; setConfirmation(null);
    if (reviewed && reviewed === data && !shop.locked) await shop.withdrawRevenue(reviewed);
  };
  if (!wallet.address || !wallet.isSepolia) return <WalletGate />;
  if (shop.owner && wallet.address !== shop.owner) return <Text accessibilityRole="alert" style={p.notice}>当前钱包不是主办方。仅合约 owner 可查看票房管理并提现。</Text>;
  const ready = phase === 'ready' && data?.owner === wallet.address;
  return <View style={p.stack}>
    <AdminNav />
    <Text style={p.copy}>累计售票和成交额按部署以来的 TicketBought 事件统计。提现只转出票款，观众保证金单独保管。</Text>
    <Action secondary label={phase === 'loading' ? '正在读取票房…' : '刷新链上票房'} disabled={shop.locked || phase === 'loading'} onPress={() => { void shop.loadRevenue(); }} />
    {error && <Text accessibilityRole="alert" style={p.notice}>{error}{'\n'}统计读取失败，提现已禁用。请重试。</Text>}
    {!ready && !error && <Text style={p.notice}>{shop.locked ? '请先完成当前交易，再刷新票房。' : '正在读取主办方和真实链上统计…'}</Text>}
    {ready && data && <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {[
          ['SHOWS PUBLISHED', data.showCount.toString(), '已发布演出'],
          ['TICKETS SOLD', data.ticketsSold.toString(), '累计售票 · 事件计数'],
          ['TOTAL SALES', `${formatEther(data.totalSales)} ETH`, '累计成交额 · 提现后保持不变'],
          ['WITHDRAWABLE', `${formatEther(data.withdrawable)} ETH`, '当前可提现票款 · 不含保证金'],
        ].map(([label, value, detail]) => <View key={label} style={[p.card, { flexGrow: 1, flexBasis: width <= 640 ? '100%' : '45%', minWidth: 0 }]}><Text style={p.label}>{label}</Text><Text style={[p.title, { fontSize: 25 }]}>{value}</Text><Text style={p.small}>{detail}</Text></View>)}
      </View>
      <View style={p.notice}><Text style={p.copy}>保证金池：{formatEther(data.totalStaked)} ETH（主办方不可提现）</Text><Text style={p.small}>合约总余额：{formatEther(data.contractBalance)} ETH。总余额可能还包含保证金或其他转入，不作为提现依据。{'\n'}收款主办方：{data.owner}{'\n'}统计区块：#{data.blockNumber} · 页面可见时每 30 秒刷新。</Text></View>
      {data.withdrawable === 0n && <Text style={p.notice}>当前没有可提现票款。提现不会减少历史售票数或累计成交额，也不会删除门票。</Text>}
      <Action label={`Withdraw Revenue · 提取 ${formatEther(data.withdrawable)} ETH 票款`} disabled={shop.locked || data.withdrawable === 0n} onPress={() => setConfirmation(data)} />
      <Text style={p.label}>每场概览</Text>
      {!data.shows.length && <Text style={p.notice}>尚无演出，请先发布演出。</Text>}
      {data.shows.map(show => <View key={show.id} style={p.card}><Text style={p.title}>#{show.id} {show.name}</Text><Text style={p.copy}>已售 {show.sold.toString()} 张 · 当前票价 {formatEther(show.price)} ETH{'\n'}{show.policy} · {show.rulesFrozen ? '规则永久冻结' : '首次开售前可编辑规则'}</Text></View>)}
      <Text style={p.small}>每场已售张数来自合约计数，用于展示；总售票数和成交额始终以售票事件为准。全部金额均为 Sepolia 测试 ETH。</Text>
    </>}
    <TxStatus />
    <Modal visible={!!confirmation && ready && confirmation === data} transparent animationType="none" onRequestClose={() => setConfirmation(null)}>
      <View style={{ flex: 1, backgroundColor: '#000b', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <ScrollView accessibilityViewIsModal style={{ width: '100%', maxWidth: 620, maxHeight: '85%', backgroundColor: '#191222', borderRadius: 16 }} contentContainerStyle={{ padding: 26, gap: 20 }}>
          <Text accessibilityRole="header" style={p.title}>确认提取票房收入</Text>
          <Text style={p.copy}>当前可提现：{formatEther(confirmation?.withdrawable ?? 0n)} Sepolia ETH{'\n'}收款地址：{confirmation?.owner}</Text>
          <Text style={p.notice}>提现会将合约执行时的全部票款转给主办方，另付测试 gas。保证金池不会被提走；若交易确认前新增购票到账，实际到账票款可能增加，以 Withdrawn 事件为准。</Text>
          <Action label="确认提现并打开 MetaMask" disabled={shop.locked} onPress={() => { void withdraw(); }} />
          <Action secondary label="取消" onPress={() => setConfirmation(null)} />
        </ScrollView>
      </View>
    </Modal>
  </View>;
}
