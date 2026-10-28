import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { ZeroAddress } from 'ethers';
import { useWallet } from '../wallet/context';
import { useLivePass } from './context';
import { chainError, type Ticket, type TicketProvenance } from './model';
import { Action, p } from './ui';

export function ProvenancePanel({ ticket }: { ticket: Ticket }) {
  const { getProvenance } = useLivePass(); const wallet = useWallet();
  const [expanded, setExpanded] = useState(false);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ loading: boolean; data: TicketProvenance | null; error: string }>({ loading: false, data: null, error: '' });
  useEffect(() => {
    if (!expanded) return;
    let active = true;
    setResult({ loading: true, data: null, error: '' });
    void getProvenance(BigInt(ticket.id)).then(
      data => { if (active) setResult({ loading: false, data, error: '' }); },
      error => { if (active) setResult({ loading: false, data: null, error: chainError(error).message }); },
    );
    return () => { active = false; };
  }, [expanded, revision, getProvenance, ticket.id, ticket.holder, ticket.used, wallet.address, wallet.chainId]);
  return <View style={p.stack}>
    <Action secondary label={expanded ? '收起完整溯源' : '查看完整溯源'} onPress={() => setExpanded(value => !value)} />
    {expanded && <>
      <Text style={p.label}>发行与所有权历史 · Token #{ticket.id}</Text>
      {result.loading && <Text accessibilityLiveRegion="polite" style={p.copy}>正在读取完整链上历史…</Text>}
      {!!result.error && <Text accessibilityRole="alert" style={p.notice}>溯源读取失败：{result.error}</Text>}
      {result.data && <ProvenanceHistory data={result.data} />}
      <Action secondary label={result.error ? '重试溯源查询' : '刷新溯源记录'} disabled={result.loading} onPress={() => setRevision(value => value + 1)} />
    </>}
  </View>;
}

export function ProvenanceHistory({ data }: { data: TicketProvenance }) {
  const wallet = useWallet();
  return <View style={p.stack}>
        <Text style={p.small}>快照区块 #{data.blockNumber} · Resale: {data.policy}{'\n'}{data.status}{'\n'}当前持有人：{data.currentHolder}</Text>
        {data.currentHolder.toLowerCase() !== wallet.address?.toLowerCase() && <Text style={p.notice}>该票当前不属于此钱包。入场资格以实际持有人和链上预检为准。</Text>}
        {data.history.length === 0 && <Text style={p.notice}>本次未返回发行或转移记录，请刷新重试。</Text>}
        {data.history.map(event => <View key={`${event.transactionHash}:${event.logIndex}`} style={p.notice}>
          <Text style={p.label}>{event.event === 'TicketIssued' ? '发行记录' : event.from === ZeroAddress ? 'NFT 铸造' : '所有权转移'}</Text>
          <Text selectable style={p.small}>{event.event === 'TicketIssued'
            ? `发行方：${event.issuer}\n首次买家：${event.buyer}`
            : `从：${event.from}\n至：${event.to}`}</Text>
          <Text style={p.small}>{new Date(event.timestamp * 1000).toLocaleString()} · 区块 #{event.blockNumber}</Text>
          <Text selectable style={p.small}>交易：{event.transactionHash}</Text>
          <Action secondary label="查看该笔交易 ↗" onPress={() => { void Linking.openURL(`https://sepolia.etherscan.io/tx/${event.transactionHash}`); }} />
        </View>)}
        <Text style={p.small}>发行记录与 NFT 铸造分别保留。所有权转移不代表发生过付费交易；截图不能作为入场凭证。</Text>
  </View>;
}
