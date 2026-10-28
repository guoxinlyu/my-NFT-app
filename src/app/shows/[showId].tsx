import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useLivePass } from '../../livepass/context';
import { ticketIds } from '../../livepass/model';
import { LivePassPage } from '../../livepass/page';
import { ShowDetails } from '../../livepass/panels';
import { Action, p } from '../../livepass/ui';

export default function ShowPage() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const shop = useLivePass();
  let id: string | null = null;
  try { id = ticketIds(showId, '1')[0].toString(); } catch { /* invalid route ID */ }
  const show = shop.shows.find(show => show.id === id);
  return <LivePassPage title={show?.name ?? 'Show details'}>
    {id === null ? <Text style={p.notice}>演出编号无效，请输入整数 Show # ≥ 0。</Text>
      : shop.phase === 'error' ? <View style={p.stack}><Text accessibilityRole="alert" style={p.notice}>{shop.error}</Text><Action label="重新读取演出" onPress={() => { void shop.reload(); }} /></View>
      : !show ? <Text style={p.copy}>{shop.phase === 'ready' ? '演出不存在。请返回列表选择实际演出。' : '正在读取演出…'}</Text>
      : <View style={p.card}>
        <Image source={{ uri: show.image }} contentFit="cover" style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14 }} accessibilityLabel={`${show.name} concert poster`} />
        <ShowDetails key={show.id} id={show.id} onStake={() => router.push({ pathname: '/stake', params: { showId: show.id } })} />
      </View>}
  </LivePassPage>;
}
