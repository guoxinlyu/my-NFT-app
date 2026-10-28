import type { PropsWithChildren } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, Text, View } from 'react-native';
import { DEPLOYMENT } from './contract';
import type { Ticket } from './model';
import { ProvenancePanel } from './provenance-panel';
import { Action, p } from './ui';

export function TicketCard({ ticket, children, linkToDetails = true }: PropsWithChildren<{ ticket: Ticket; linkToDetails?: boolean }>) {
  return <View style={p.card}>
    <Text style={p.title}>{ticket.name}</Text><Image source={{ uri: ticket.image }} style={{ width: '100%', aspectRatio: 900 / 440 }} contentFit="contain" accessibilityLabel={`${ticket.name} NFT ticket`} />
    <Text style={p.label}>{ticket.status}</Text><Text style={p.copy}>Token #{ticket.id} · Show #{ticket.showId} · Ticket #{ticket.ticketNo ?? '—（受让票）'}</Text>
    <Text selectable style={p.small}>发行方：{ticket.issuer}{'\n'}首次买家：{ticket.firstBuyer}{'\n'}当前持有人：{ticket.holder}{'\n'}铸造时间：{new Date(Number(ticket.mintedAt) * 1000).toLocaleString()}</Text>
    <Text style={p.small}>{ticket.used ? '此票已核销，不能再次入场。' : '入场以主办方链上预检和核销为准。'}</Text>
    {linkToDetails && <Action secondary label="查看票据详情 →" onPress={() => router.push({ pathname: '/tickets/[tokenId]', params: { tokenId: ticket.id } })} />}
    <Action secondary label="在 Etherscan 查看 NFT ↗" onPress={() => { void Linking.openURL(`https://sepolia.etherscan.io/token/${DEPLOYMENT.address}?a=${ticket.id}`); }} />
    {children ?? <ProvenancePanel ticket={ticket} />}
  </View>;
}
