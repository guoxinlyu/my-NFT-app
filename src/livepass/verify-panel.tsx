import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { useWallet } from '../wallet/context';
import { useLivePass } from './context';
import { Action, AdminNav, p, TxStatus, WalletGate } from './panels';

export function VerifyPanel() {
  const shop = useLivePass(); const wallet = useWallet();
  const [showId, setShowId] = useState('0'); const [tokenId, setTokenId] = useState('');
  const [confirm, setConfirm] = useState(false);
  const result = shop.check.result;
  useEffect(() => { shop.invalidateCheck(); return shop.invalidateCheck; }, [shop.invalidateCheck]);
  useEffect(() => setConfirm(false), [result, wallet.address, wallet.chainId]);
  const change = (field: 'show' | 'token', value: string) => {
    shop.invalidateCheck(); setConfirm(false); (field === 'show' ? setShowId : setTokenId)(value);
  };
  const matches = result?.inputShow === showId && result?.id === tokenId && result?.checkedBy === wallet.address;
  const eligible = !!matches && !!result?.allowed && shop.check.phase === 'ready';
  const verify = async () => {
    setConfirm(false);
    if (!eligible || shop.locked) return;
    if (await shop.send(`核销 Token #${tokenId} · Show #${showId}`, 'verify', [BigInt(showId), BigInt(tokenId)])) await shop.checkTicket(showId, tokenId);
  };
  if (!wallet.address || !wallet.isSepolia) return <WalletGate />;
  if (!shop.owner || shop.phase === 'error') return <View style={p.stack}><Text style={p.copy}>{shop.error ?? '正在读取合约主办方…'}</Text><Action label="重新读取" onPress={() => { void shop.reload(); }} /></View>;
  if (wallet.address !== shop.owner) return <Text accessibilityRole="alert" style={p.notice}>当前钱包不是主办方。验票由合约 owner 执行，请在 MetaMask 切换账户。</Text>;
  return <View style={p.stack}>
    <AdminNav />
    <Text style={p.copy}>本期由主办方 owner 钱包模拟场馆闸机。Check 免费只读；Verify 永久写入已使用状态，仅消耗 Sepolia 测试 gas。</Text>
    {!shop.shows.length && shop.phase === 'ready' && <Text style={p.notice}>尚无演出，请先发布演出并售出票据。</Text>}
    <Text style={p.label}>Show #（演出编号，≥0）</Text>
    <TextInput accessibilityLabel="验票 Show 编号" value={showId} onChangeText={v => change('show', v)} editable={!shop.locked} keyboardType="number-pad" style={p.input} />
    <Text style={p.label}>Ticket token #（NFT tokenId，≥1）</Text>
    <TextInput accessibilityLabel="验票 Token 编号" value={tokenId} onChangeText={v => change('token', v)} editable={!shop.locked} keyboardType="number-pad" style={p.input} />
    <Text style={p.small}>使用票夹中的 Token #，不是场内 Ticket #。截图不能证明持有人身份，现场仍须核对钱包控制权。</Text>
    <Action secondary label={shop.check.phase === 'loading' ? 'Checking…' : 'Check · 免费预检'} disabled={shop.locked || shop.check.phase === 'loading' || !showId || !tokenId} onPress={() => { setConfirm(false); void shop.checkTicket(showId, tokenId); }} />
    {shop.check.error && <Text accessibilityRole="alert" style={p.notice}>{shop.check.error}{'\n'}预检失败，请核对编号或重试。ERC721NonexistentToken 表示 Token 不存在。</Text>}
    {matches && result ? <View style={p.card}>
      <Text style={p.title}>Token #{result.id} · {result.name}</Text>
      <Text style={p.copy}>实际 Show #{result.showId} · Ticket #{result.ticketNo ?? '—（受让票）'} · {result.policy}</Text>
      <Image source={{ uri: result.image }} style={{ width: '100%', aspectRatio: 900 / 440 }} contentFit="contain" accessibilityLabel="验票 NFT 票面" />
      <Text style={p.label}>{result.status}</Text>
      <Text accessibilityLiveRegion="polite" style={[p.notice, { color: result.allowed ? '#89efbd' : '#ffb5c3' }]}>{result.reason}</Text>
      <Text selectable style={p.small}>持有人：{result.holder}{'\n'}首次买家：{result.firstBuyer}{'\n'}发行方：{result.issuer}{'\n'}状态：{result.used ? 'USED，已核销' : 'UNUSED，未核销'}</Text>
      <Text style={p.label}>VERIFIED THIS SHOW · {result.verifiedCount.toString()}</Text>
      <Text style={p.small}>计数来自所选 Show #{showId} 的 TicketVerified 事件。预检区块 #{result.blockNumber}；链上状态可能变化，签名前会重新校验。</Text>
    </View> : shop.check.phase === 'idle' && <Text style={p.notice}>请先 Check。修改输入、账户或网络后需要重新预检。</Text>}
    <Action label="Verify · 永久核销" disabled={!eligible || shop.locked} onPress={() => setConfirm(true)} />
    <TxStatus />
    <Modal visible={confirm && eligible} transparent animationType="none" onRequestClose={() => setConfirm(false)}>
      <View style={{ flex: 1, backgroundColor: '#000b', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <ScrollView style={{ width: '100%', maxWidth: 620, maxHeight: '85%', backgroundColor: '#191222', borderRadius: 16 }} contentContainerStyle={{ padding: 26, gap: 20 }} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={p.title}>确认永久核销</Text>
          <Text style={p.copy}>Show #{showId} · Token #{tokenId}{'\n'}{result?.name}{'\n'}持有人：{result?.holder}</Text>
          <Text style={p.notice}>此操作不可撤销。交易确认后，门票将永久标记为已使用，不能再次入场。仅在现场已核对持有人并准备放行时执行。</Text>
          <Action label="确认永久核销并打开 MetaMask" disabled={shop.locked} onPress={() => { void verify(); }} />
          <Action secondary label="取消，保留未使用状态" onPress={() => setConfirm(false)} />
        </ScrollView>
      </View>
    </Modal>
  </View>;
}
