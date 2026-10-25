import { Image } from 'expo-image';
import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset } from '@/constants/theme';
import { useWallet } from '@/wallet/context';
import { WalletPanel } from '@/wallet/wallet-panel';
import { useLivePass } from '@/livepass/context';
import { ShowDetails, StakePanel, TicketsPanel, TxStatus, Action } from '@/livepass/panels';
import type { ChainShow as Show } from '@/livepass/model';

const C = { bg: '#050510', panel: '#141122', border: '#30263f', text: '#e6e3f5', dim: '#a49cb9', purple: '#a78bfa', green: '#77e0b5' };
type Panel = 'wallet' | 'tickets' | 'stake' | 'rules' | null;

function Button({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed, hovered }) => [s.button, secondary && s.secondary, hovered && s.hover, pressed && { opacity: 0.75 }]}><Text style={[s.buttonText, secondary && { color: C.text }]}>{label}</Text></Pressable>;
}

export default function HomeScreen() {
  const wallet = useWallet();
  const shop = useLivePass();
  const { width } = useWindowDimensions();
  const narrow = width <= 640;
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [showsY, setShowsY] = useState(0);
  const [selected, setSelected] = useState<Show | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [filter, setFilter] = useState('All shows');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const featured = shop.shows[0];
  const close = () => { setPanel(null); setSelected(null); };
  const browse = () => scroll.current?.scrollTo({ y: showsY, animated: false });
  const visible = shop.shows.filter(show => filter === 'All shows' || show.saleOpen);
  const image = (show: Show, hero = false) => <View style={[StyleSheet.absoluteFill, { backgroundColor: hero ? '#31204f' : '#28203b' }]}>{!failedImages[show.id] && <Image source={{ uri: show.image }} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFailedImages(old => ({ ...old, [show.id]: true }))} accessibilityLabel={`${show.name} concert atmosphere`} />}</View>;

  return (
    <View style={s.root}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + BottomTabInset + 24 }}>
        <View style={[s.shell, { paddingHorizontal: narrow ? 20 : 32 }]}>
          <View style={[s.header, narrow && { gap: 18 }]}>
            <View style={s.brand}><View style={s.logo}><Text style={s.logoText}>L</Text></View><Text style={s.brandText}>LivePass<Text style={{ color: C.purple }}>.</Text></Text></View>
            {!narrow && <View style={s.nav}><Pressable accessibilityRole="button" onPress={browse}><Text style={s.navActive}>Discover</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPanel('tickets')}><Text style={s.navText}>My tickets</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPanel('stake')}><Text style={s.navText}>Stake & eligibility</Text></Pressable></View>}
            <Button label={wallet.address ? wallet.address.slice(0, 6) + '…' + wallet.address.slice(-4) : wallet.busy ? 'Connecting…' : '◈ Connect wallet'} onPress={() => setPanel('wallet')} secondary />
          </View>
          {narrow && <View style={s.mobileNav}><Pressable accessibilityRole="button" onPress={browse}><Text style={s.navActive}>Discover</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPanel('tickets')}><Text style={s.navText}>My tickets</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPanel('stake')}><Text style={s.navText}>Stake</Text></Pressable></View>}
          <View style={s.demo}><View style={s.dot} /><Text style={s.demoText}>SEPOLIA TESTNET</Text><Text style={s.demoDivider}>/</Text><Text style={s.demoNote}>链上演出 · MetaMask 支付与 NFT 出票</Text></View>
          {wallet.isSepolia && wallet.address && shop.owner === wallet.address && <View style={[s.row, { marginTop: 18, flexWrap: 'wrap' }]}><Button label="发布演出" onPress={() => router.push('/admin/new')} /><Button label="管理演出" secondary onPress={() => router.push('/admin/shows')} /><Button label="验票与核销" secondary onPress={() => router.push('/admin/verify')} /><Button label="票房与提现" secondary onPress={() => router.push('/admin/revenue')} /></View>}
          <View style={{ marginTop: 16 }}><TxStatus /></View>

          <>{wallet.address && !wallet.isSepolia && <Pressable accessibilityRole="button" onPress={() => setPanel('wallet')} style={s.notice}><Text style={s.modalCopy}>当前不在 Sepolia · 点此切换网络</Text></Pressable>}</><View style={[s.intro, narrow && { marginTop: 30 }]}>
            <Text style={s.eyebrow}>LESS FRICTION. MORE FEELING.</Text>
            <ThemedText accessibilityRole="header" style={[s.title, narrow && { fontSize: 39, lineHeight: 46 }]}>Be there.<Text style={{ color: C.purple }}> Own the moment.</Text></ThemedText>
            <Text style={s.description}>Your next unforgettable night starts here. Discover live shows,{narrow ? ' ' : '\n'}with ticket rules you can see and ownership you can verify.</Text>
          </View>

          {featured ? <View style={[s.hero, { minHeight: narrow ? 460 : 410 }]}>
            {image(featured, true)}
            <View style={s.heroShade} />
            <View style={[s.heroTop, { padding: narrow ? 22 : 32 }]}><View style={s.featureTag}><Text style={s.tagText}>✦  THE SPOTLIGHT</Text></View><Text style={s.heroEdition}>LIVEPASS SELECT / 001</Text></View>
            <View style={[s.heroBottom, { padding: narrow ? 22 : 32 }, narrow && { alignItems: 'flex-start', flexDirection: 'column', gap: 24 }]}>
              <View style={{ gap: 10 }}><Text style={s.heroGenre}>{featured.genre}</Text><Text accessibilityRole="header" style={[s.heroTitle, narrow && { fontSize: 48, lineHeight: 54 }]}>{featured.name}<Text style={{ color: '#cfb5ff' }}>.</Text></Text><Text style={s.heroSubtitle}>{featured.subtitle}</Text><View style={s.row}><Text style={s.heroRule}>Resale: {featured.policy}</Text><Text style={s.heroRule}>Stake: {featured.stake} ETH</Text></View></View>
              <View style={[s.heroPurchase, narrow && { alignItems: 'flex-start' }]}><Text style={s.priceLabel}>TICKET PRICE</Text><Text style={s.heroPrice}>{featured.price} <Text style={s.eth}>ETH</Text></Text><Button label="Explore show  ↗" onPress={() => setSelected(featured)} /></View>
            </View>
          </View> : <View style={[s.hero, { minHeight: 250, padding: 32, gap: 22, justifyContent: 'center' }]}><Text style={s.heroGenre}>LIVEPASS ON SEPOLIA</Text><Text style={[s.heroTitle, { fontSize: 36, lineHeight: 44 }]}>{shop.phase === 'error' ? 'Connection interrupted.' : shop.phase === 'ready' ? 'The stage is ready.' : 'Finding the next night…'}</Text><Text style={s.description}>{shop.error ?? (shop.phase === 'ready' ? '合约中还没有演出。主办方连接钱包后可发布第一场。' : '正在读取 Sepolia 上的真实演出…')}</Text><Action label={shop.phase === 'loading' ? '读取中…' : '刷新链上数据'} disabled={shop.phase === 'loading'} onPress={() => { void shop.reload(); }} /></View>}

          <View style={[s.assurances, narrow && { flexDirection: 'column' }]}>{[
            ['◈', 'Yours. Verifiably.', 'Ownership and ticket history, on-chain.'],
            ['↗', 'Clear rules. Up front.', 'Know resale and stake rules before you buy.'],
            ['✓', 'One ticket. One entry.', 'On-chain verification prevents reuse.'],
          ].map(([icon, title, copy]) => <View key={title} style={s.assurance}><Text style={s.assuranceIcon}>{icon}</Text><View style={{ flex: 1, gap: 5 }}><Text style={s.assuranceTitle}>{title}</Text><Text style={s.small}>{copy}</Text></View></View>)}</View>

          <View onLayout={event => setShowsY(event.nativeEvent.layout.y)} style={s.showsSection}>
            <View style={s.sectionTop}><View><Text style={s.eyebrow}>FIND YOUR NEXT NIGHT</Text><Text accessibilityRole="header" style={s.sectionTitle}>Now showing<Text style={{ color: C.purple }}> ↗</Text></Text></View><Text style={s.count}>{visible.length.toString().padStart(2, '0')} SHOWS</Text></View>
            <View style={s.filters}>{['All shows', 'On sale'].map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)} style={[s.filter, filter === item && s.filterSelected]}><Text style={[s.filterText, filter === item && { color: '#fff' }]}>{item === 'On sale' ? '●  On sale' : item}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={() => { void shop.reload(); }}><Text style={s.curated}>↻ 刷新链上演出</Text></Pressable></View>
            {shop.phase === 'error' && <Text accessibilityRole="alert" style={s.notice}>读取失败：{shop.error}。当前不提供交易，请重试。</Text>}
            {shop.phase === 'ready' && visible.length === 0 && <Text style={s.notice}>{shop.shows.length ? '当前没有在售演出，可切换 All shows 查看。' : '还没有发布的演出。连接主办方钱包后创建测试演出。'}</Text>}
            <View style={[s.grid, narrow && { flexDirection: 'column' }]}>{visible.map(show => <Pressable key={show.id} accessibilityRole="button" accessibilityLabel={`View ${show.name}, ${show.price} ETH, ${show.saleOpen ? 'on sale' : 'sale closed'}`} onPress={() => setSelected(show)} style={({ hovered, pressed }) => [s.card, !narrow && { flexBasis: '30%' }, hovered && { borderColor: '#8b69bd' }, pressed && { opacity: 0.8 }]}>
              <View style={s.cardImage}>{image(show)}<View style={s.cardTint} /><View style={[s.sale, !show.saleOpen && { backgroundColor: '#302332' }]}><Text style={[s.saleText, !show.saleOpen && { color: '#f6bac5' }]}>{show.saleOpen ? '● ON SALE' : '○ SALE CLOSED'}</Text></View><View style={s.posterTitle}><Text style={[s.posterGenre, { color: show.color }]}>{show.genre}</Text><Text style={s.posterName}>{show.name.toUpperCase()}</Text></View></View>
              <View style={s.cardBody}><Text style={s.showName}>{show.name}</Text><Text style={s.small}>{show.subtitle}</Text><View style={s.tags}><Text style={s.policy}>↔  Resale: {show.policy}</Text><Text style={[s.policy, { color: show.minStake === 0n ? C.dim : '#e0bcff' }]}>{show.minStake === 0n ? 'No stake required' : `◈ ${show.stake} ETH stake`}</Text></View><View style={s.cardFooter}><View><Text style={s.priceLabel}>TICKET PRICE</Text><Text style={s.cardPrice}>{show.price} <Text style={s.eth}>ETH</Text></Text></View><View style={s.roundArrow}><Text style={{ color: C.text, fontSize: 22 }}>↗</Text></View></View></View>
            </Pressable>)}</View>
          </View>

          <View style={[s.bottomCallout, narrow && { flexDirection: 'column', alignItems: 'flex-start' }]}><View style={{ flex: 1, gap: 10 }}><Text style={s.eyebrow}>THE EXPERIENCE COMES FIRST</Text><Text style={s.calloutTitle}>Great nights. Clearer rules.</Text><Text style={s.small}>Check each show’s resale policy and stake requirement before you buy.</Text></View><Button label="How LivePass works  ↗" secondary onPress={() => setPanel('rules')} /></View>
          <View style={s.footer}><Text style={s.footerBrand}>LivePass.</Text><Text style={[s.small, { flex: 1 }]}>Built for the moments that matter.</Text><Text style={s.footerNetwork}>◈ SEPOLIA TESTNET</Text></View>
          <Text style={s.disclaimer}>课程演示 · 仅使用测试网 ETH，无真实资金。每钱包每演出限购一张，不等于实名限购。截图不作为入场凭证。</Text>
        </View>
      </ScrollView>

      <Modal visible={!!selected || !!panel} transparent animationType="none" onRequestClose={close}>
        <View style={s.modalBackdrop}><View accessibilityViewIsModal style={s.modal}>
          <ScrollView contentContainerStyle={{ padding: 26, gap: 18 }}><View style={s.sectionTop}><Text style={s.eyebrow}>{selected ? 'SHOW DETAILS / SEPOLIA' : 'LIVEPASS / SEPOLIA'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close dialog" onPress={close} style={s.close}><Text style={{ color: C.text, fontSize: 24 }}>×</Text></Pressable></View>
            <Text accessibilityRole="header" style={s.modalTitle}>{selected?.name ?? ({ wallet: 'Your wallet. Your ticket.', tickets: 'My tickets', stake: 'Stake & eligibility', rules: 'A better way to be there.' }[panel ?? 'rules'])}</Text>
            {panel === 'wallet' ? <WalletPanel /> : selected ? <ShowDetails id={selected.id} onStake={() => { setSelected(null); setPanel('stake'); }} /> : panel === 'tickets' ? <TicketsPanel /> : panel === 'stake' ? <StakePanel /> : <>
              <Text style={s.modalCopy}>01 浏览链上演出，了解票价、转售策略与预存要求。{'\n\n'}02 连接 MetaMask 并使用 Sepolia；需要预存时，达标且冷却结束后购票。{'\n\n'}03 支付与出票在同一笔交易中完成，每钱包每场仅能首次购买一张。{'\n\n'}04 票夹按当前所有权读取。已核销票不能再次入场。</Text>
              <Text style={s.notice}>Closed 禁止转移；Open 受让人可入场；Detect 拒绝非首次买家入场。首次开售永久冻结规则。链上限购不能阻止多钱包或私钥转交。</Text><Button label="Got it" onPress={close} />
            </>}
          </ScrollView>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, shell: { width: '100%', maxWidth: 1144, alignSelf: 'center' },
  header: { minHeight: 94, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#211a30', gap: 24, flexWrap: 'wrap', paddingVertical: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, logo: { width: 31, height: 33, borderRadius: 8, backgroundColor: '#b9a1fc', transform: [{ rotate: '-9deg' }], alignItems: 'center', justifyContent: 'center' }, logoText: { color: '#171025', fontSize: 26, fontWeight: '900', fontStyle: 'italic' }, brandText: { color: '#fff', fontSize: 25, fontWeight: '800', letterSpacing: -1 },
  nav: { flexDirection: 'row', gap: 25, alignItems: 'center' }, navActive: { color: '#d0bbff', fontSize: 13, fontWeight: '700' }, navText: { color: C.dim, fontSize: 13 }, mobileNav: { flexDirection: 'row', gap: 30, paddingVertical: 16 },
  button: { minHeight: 46, backgroundColor: '#c4a7ff', borderRadius: 9, paddingHorizontal: 21, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' }, secondary: { backgroundColor: '#171125', borderWidth: 1, borderColor: '#443158' }, buttonText: { color: '#170e2b', fontSize: 13, fontWeight: '800' }, hover: { borderColor: '#d4bfff', opacity: 0.9 },
  demo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9, marginTop: 22 }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.green }, demoText: { color: '#b3a5cc', fontSize: 10, letterSpacing: 1.7 }, demoDivider: { color: '#564863', fontSize: 12 }, demoNote: { color: C.dim, fontSize: 11 },
  intro: { marginTop: 42, marginBottom: 30, gap: 13 }, eyebrow: { color: C.purple, fontSize: 10, letterSpacing: 2, fontWeight: '700' }, title: { color: '#f3edff', fontSize: 49, lineHeight: 58, fontWeight: '700', letterSpacing: -2 }, description: { color: '#b7afc8', fontSize: 14, lineHeight: 24 },
  hero: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#241539', justifyContent: 'space-between', borderWidth: 1, borderColor: '#5e4376' }, heroShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#14082588' }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, featureTag: { backgroundColor: '#e5d4ff', borderRadius: 5, padding: 9 }, tagText: { color: '#35204c', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 }, heroEdition: { color: '#eee2ff', fontSize: 8, letterSpacing: 1.5 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, backgroundColor: '#0c061666' }, heroGenre: { color: '#dcc2ff', fontSize: 10, fontWeight: '700', letterSpacing: 3 }, heroTitle: { color: '#fff', fontSize: 61, lineHeight: 69, letterSpacing: -2, fontWeight: '800' }, heroSubtitle: { color: '#e3d7ed', fontSize: 14 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, heroRule: { color: '#f1e4ff', fontSize: 10, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: '#a185b766', borderRadius: 5, marginTop: 6 }, heroPurchase: { alignItems: 'flex-end', gap: 8 }, priceLabel: { fontSize: 9, letterSpacing: 1.5, color: '#b4a5c5', fontWeight: '600' }, heroPrice: { color: '#fff', fontSize: 29, fontWeight: '700', marginBottom: 4 }, eth: { fontSize: 12, color: '#c2b3d6', fontWeight: '500' },
  assurances: { flexDirection: 'row', paddingVertical: 25, borderBottomWidth: 1, borderColor: '#292035', gap: 22 }, assurance: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center' }, assuranceIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1d152e', color: '#b9a0f3', fontSize: 22, textAlign: 'center', lineHeight: 36 }, assuranceTitle: { color: '#e2daef', fontSize: 12, fontWeight: '700' }, small: { color: C.dim, fontSize: 11, lineHeight: 18 },
  showsSection: { marginTop: 42, gap: 23 }, sectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }, sectionTitle: { color: C.text, fontSize: 29, fontWeight: '600', letterSpacing: -0.8, marginTop: 8 }, count: { color: '#a596ba', fontSize: 10, letterSpacing: 1.5 }, filters: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, filter: { paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: '#30253e', borderRadius: 8 }, filterSelected: { backgroundColor: '#302044', borderColor: '#745091' }, filterText: { fontSize: 11, color: C.dim }, curated: { color: '#b0a1c3', fontSize: 11, marginLeft: 'auto' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, card: { flexGrow: 1, flexShrink: 1, backgroundColor: '#13101e', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#30263f' }, cardImage: { height: 230, backgroundColor: '#28203b', justifyContent: 'space-between', padding: 18, overflow: 'hidden' }, cardTint: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#10091e66' }, sale: { alignSelf: 'flex-start', backgroundColor: '#142b27', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 6 }, saleText: { color: '#a1f3cc', fontSize: 8, fontWeight: '700', letterSpacing: 0.8 }, posterTitle: { gap: 8 }, posterGenre: { fontSize: 8, letterSpacing: 2, fontWeight: '800' }, posterName: { color: '#fff', fontSize: 29, lineHeight: 31, fontWeight: '900', letterSpacing: -1 }, cardBody: { padding: 18, gap: 9 }, showName: { color: C.text, fontSize: 17, fontWeight: '700' }, tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }, policy: { color: '#ccbddf', fontSize: 9, paddingVertical: 6, paddingHorizontal: 7, backgroundColor: '#21182e', borderRadius: 4 }, cardFooter: { borderTopWidth: 1, borderColor: '#2b2238', marginTop: 7, paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardPrice: { color: '#f2e9ff', fontSize: 23, fontWeight: '600', marginTop: 5 }, roundArrow: { width: 35, height: 35, backgroundColor: '#2c203e', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bottomCallout: { padding: 27, marginTop: 42, borderRadius: 14, backgroundColor: '#171020', borderWidth: 1, borderColor: '#392947', flexDirection: 'row', alignItems: 'center', gap: 24 }, calloutTitle: { fontSize: 24, color: C.text, fontWeight: '600', letterSpacing: -0.5 }, footer: { marginTop: 38, paddingVertical: 22, borderTopWidth: 1, borderColor: '#292035', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 15 }, footerBrand: { color: '#d6cae6', fontWeight: '800', fontSize: 17 }, footerNetwork: { color: '#a69ab7', fontSize: 9, letterSpacing: 1 }, disclaimer: { color: '#9c90ac', fontSize: 10, lineHeight: 18, marginBottom: 20 },
  modalBackdrop: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'center', alignItems: 'center', padding: 20 }, modal: { width: '100%', maxWidth: 540, maxHeight: '85%', backgroundColor: '#161021', borderRadius: 20, borderWidth: 1, borderColor: '#654580' }, modalTitle: { color: C.text, fontSize: 30, fontWeight: '700' }, modalCopy: { color: '#d1c5df', lineHeight: 25, fontSize: 14 }, notice: { color: '#d5b6ef', backgroundColor: '#2b1c3a', padding: 15, borderRadius: 8, fontSize: 12, lineHeight: 22 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
