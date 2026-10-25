import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useWallet } from './context';
import { useLivePass } from '../livepass/context';
import { DEPLOYMENT } from '../livepass/contract';

function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, (disabled || pressed) && { opacity: 0.5 }]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}
export function WalletPanel() {
  const wallet = useWallet();
  const shop = useLivePass();
  return <View style={styles.stack}>
    <Text style={styles.copy}>{Platform.OS === 'web' ? '连接 MetaMask 读取真实钱包地址与 Sepolia 余额，无需签名或支付 gas。' : 'LivePass 仅支持网页版，请使用安装了 MetaMask 的浏览器访问。'}</Text>
    {wallet.address && <>
      <Text style={styles.label}>WALLET ADDRESS</Text><Text selectable style={styles.address}>{wallet.address}</Text>
      <Text style={styles.copy}>{wallet.chainId ? `当前网络：${wallet.isSepolia ? 'Sepolia' : `非 Sepolia (${wallet.chainId})`}` : '正在确认当前网络…'}</Text>
      {wallet.isSepolia && <><Text style={styles.label}>SEPOLIA TEST ETH</Text><Text selectable style={styles.balance}>{wallet.balance === null ? '余额尚未读取' : `${wallet.balance} ETH`}</Text><Text style={styles.copy}>测试网资产，不代表真实资金。</Text></>}
      {!wallet.isSepolia && <Text style={styles.warning}>请切换至 Sepolia。非目标网络下不能执行票务写操作。</Text>}
      <Action label="在 Sepolia Etherscan 查看地址 ↗" disabled={!wallet.isSepolia} onPress={() => { void Linking.openURL(`https://sepolia.etherscan.io/address/${wallet.address}`); }} />
    </>}
    {wallet.error && <Text accessibilityRole="alert" style={styles.warning}>{wallet.error}</Text>}
    {wallet.notice && <Text accessibilityLiveRegion="polite" style={styles.copy}>{wallet.notice}</Text>}
    {wallet.busy && <Text accessibilityLiveRegion="polite" style={styles.copy}>正在处理…如钱包弹窗待确认，请打开 MetaMask。</Text>}
    {!wallet.address && <Action label={wallet.busy ? '等待 MetaMask…' : '连接 MetaMask'} disabled={wallet.busy || Platform.OS !== 'web'} onPress={() => { void wallet.connect(); }} />}
    {wallet.address && <>
      {!wallet.isSepolia && <Action label="切换到 Sepolia" disabled={wallet.busy} onPress={() => { void wallet.switchToSepolia(); }} />}
      <Action label="刷新地址与余额" disabled={wallet.busy} onPress={() => { void wallet.refresh(); }} />
    </>}
    {(wallet.address || wallet.busy) && <Action label="断开本页面连接" onPress={wallet.disconnect} />}
    {!wallet.address && <Action label="MetaMask 官方下载与安装 ↗" onPress={() => { void Linking.openURL('https://metamask.io/download/'); }} />}
    <Text style={styles.note}>合约：{DEPLOYMENT.address}{'\n'}角色：{shop.phase !== 'ready' || !shop.owner ? '尚未判定，请等待链上读取或重试' : !wallet.address || !wallet.isSepolia ? '连接 Sepolia 钱包后判定' : wallet.address === shop.owner ? '主办方（owner）' : '观众'}。连接本身不会发交易。断开本页面连接不会撤销 MetaMask 的网站授权。</Text>
  </View>;
}
const styles = StyleSheet.create({
  stack: { gap: 16 }, copy: { color: '#c8bad9', fontSize: 13, lineHeight: 23 }, label: { color: '#bda2e4', fontSize: 10, letterSpacing: 1.6 }, address: { color: '#f2eaff', fontSize: 13, lineHeight: 23 }, balance: { color: '#e8daff', fontSize: 24 }, warning: { color: '#f8cf90', backgroundColor: '#352b28', borderRadius: 8, padding: 14, lineHeight: 23 }, action: { minHeight: 46, padding: 14, backgroundColor: '#b99af3', borderRadius: 9, alignItems: 'center' }, actionText: { color: '#1d102d', fontWeight: '700', fontSize: 13 }, note: { color: '#b4a2c5', fontSize: 11, lineHeight: 20 },
});
