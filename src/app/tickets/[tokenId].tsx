import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { useWallet } from '../../wallet/context';
import { useLivePass } from '../../livepass/context';
import { chainError, ticketIds, type TicketProvenance } from '../../livepass/model';
import { LivePassPage } from '../../livepass/page';
import { TxStatus } from '../../livepass/panels';
import { ProvenanceHistory } from '../../livepass/provenance-panel';
import { TicketCard } from '../../livepass/ticket-card';
import { Action, p } from '../../livepass/ui';

function TicketDetails({ id }: { id: string }) {
  const wallet = useWallet(); const { getProvenance, timestamp, phase, error, reload } = useLivePass();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ data: TicketProvenance | null; loading: boolean; error: string }>({ data: null, loading: true, error: '' });
  useEffect(() => {
    if (!timestamp) return;
    let active = true;
    setResult({ data: null, loading: true, error: '' });
    void getProvenance(BigInt(id)).then(
      data => { if (active) setResult({ data, loading: false, error: '' }); },
      error => { if (active) setResult({ data: null, loading: false, error: chainError(error).message }); },
    );
    return () => { active = false; };
  }, [id, revision, getProvenance, timestamp, wallet.address, wallet.chainId]);
  if (!timestamp && phase === 'error') return <>
    <Text accessibilityRole="alert" style={p.notice}>读取失败：{error}</Text>
    <Action label="重新读取" onPress={() => { void reload(); }} />
  </>;
  return <>
    {result.loading && <Text accessibilityLiveRegion="polite" style={p.copy}>正在读取票面与完整溯源…</Text>}
    {!!result.error && <Text accessibilityRole="alert" style={p.notice}>{result.error.includes('ERC721NonexistentToken') ? '票不存在，请使用实际 Token #。' : `读取失败：${result.error}`}</Text>}
    {result.data && <TicketCard ticket={result.data.ticket} linkToDetails={false}><ProvenanceHistory data={result.data} /></TicketCard>}
    <Action secondary label={result.error ? '重试票据查询' : '刷新票面与溯源'} disabled={result.loading} onPress={() => setRevision(value => value + 1)} />
  </>;
}

export default function TicketPage() {
  const { tokenId } = useLocalSearchParams<{ tokenId: string }>();
  let id: string | null = null;
  try { id = ticketIds('0', tokenId)[1].toString(); } catch { /* invalid route ID */ }
  return <LivePassPage title={id ? `Token #${id} · 票面与溯源` : 'Ticket details'}>
    {id ? <TicketDetails key={id} id={id} /> : <Text style={p.notice}>门票编号无效，请输入整数 Token # ≥ 1。</Text>}
    <TxStatus />
  </LivePassPage>;
}
