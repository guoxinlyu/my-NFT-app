import { Image } from 'expo-image';
import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset } from '@/constants/theme';
import { DEMO_SHOWS, POLICY_COPY, type Show } from '@/data/livepass';

const C = { bg: '#050510', panel: '#141122', border: '#30263f', text: '#e6e3f5', dim: '#a49cb9', purple: '#a78bfa', green: '#77e0b5' };
type Panel = 'wallet' | 'tickets' | 'stake' | 'rules' | null;

function Button({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed, hovered }) => [s.button, secondary && s.secondary, hovered && s.hover, pressed && { opacity: 0.75 }]}><Text style={[s.buttonText, secondary && { color: C.text }]}>{label}</Text></Pressable>;
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const narrow = width <= 640;
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [showsY, setShowsY] = useState(0);
  const [selected, setSelected] = useState<Show | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [filter, setFilter] = useState('All shows');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const featured = DEMO_SHOWS[0];
  const close = () => { setPanel(null); setSelected(null); };
  const browse = () => scroll.current?.scrollTo({ y: showsY, animated: false });
  const visible = DEMO_SHOWS.filter(show => filter === 'All shows' || show.saleOpen);
  const image = (show: Show, hero = false) => <View style={[StyleSheet.absoluteFill, { backgroundColor: hero ? '#31204f' : '#28203b' }]}>{!failedImages[show.id] && <Image source={{ uri: show.image }} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFailedImages(old => ({ ...old, [show.id]: true }))} accessibilityLabel={`${show.name} concert atmosphere`} />}</View>;

  return (
    <View style={s.root}>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + BottomTabInset + 24 }}>
        <View style={[s.shell, { paddingHorizontal: narrow ? 20 : 32 }]}>
          <View style={[s.header, narrow && { gap: 18 }]}>
            <View style={s.brand}><View style={s.logo}><Text style={s.logoText}>L</Text></View><Text style={s.brandText}>LivePass<Text style={{ color: C.purple }}>.</Text></Text></View>
            {!narrow && <View style={s.nav}><Pressable accessibilityRole="button" onPress={browse}><Text style={s.navActive}>Discover</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPanel('tickets')}><Text style={s.navText}>My tickets</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPanel('stake')}><Text style={s.navText}>Stake & eligibility</Text></Pressable></View>}
            <Button label={narrow ? 'Connect wallet ↗' : '◈  Connect wallet'} onPress={() => setPanel('wallet')} secondary />
          </View>
          {narrow && <View style={s.mobileNav}><Pressable accessibilityRole="button" onPress={browse}><Text style={s.navActive}>Discover</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPanel('tickets')}><Text style={s.navText}>My tickets</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setPanel('stake')}><Text style={s.navText}>Stake</Text></Pressable></View>}
          <View style={s.demo}><View style={s.dot} /><Text style={s.demoText}>SEPOLIA TESTNET</Text><Text style={s.demoDivider}>/</Text><Text style={s.demoNote}>Demo preview · 示例演出，无真实交易</Text></View>

          <View style={[s.intro, narrow && { marginTop: 30 }]}>
            <Text style={s.eyebrow}>LESS FRICTION. MORE FEELING.</Text>
            <ThemedText accessibilityRole="header" style={[s.title, narrow && { fontSize: 39, lineHeight: 46 }]}>Be there.<Text style={{ color: C.purple }}> Own the moment.</Text></ThemedText>
            <Text style={s.description}>Your next unforgettable night starts here. Discover live shows,{narrow ? ' ' : '\n'}with ticket rules you can see and ownership you can verify.</Text>
          </View>

          <View style={[s.hero, { minHeight: narrow ? 460 : 410 }]}>
            {image(featured, true)}
            <View style={s.heroShade} />
            <View style={[s.heroTop, { padding: narrow ? 22 : 32 }]}><View style={s.featureTag}><Text style={s.tagText}>✦  THE SPOTLIGHT</Text></View><Text style={s.heroEdition}>LIVEPASS SELECT / 001</Text></View>
            <View style={[s.heroBottom, { padding: narrow ? 22 : 32 }, narrow && { alignItems: 'flex-start', flexDirection: 'column', gap: 24 }]}>
              <View style={{ gap: 10 }}><Text style={s.heroGenre}>{featured.genre}</Text><Text accessibilityRole="header" style={[s.heroTitle, narrow && { fontSize: 48, lineHeight: 54 }]}>{featured.name}<Text style={{ color: '#cfb5ff' }}>.</Text></Text><Text style={s.heroSubtitle}>{featured.subtitle}</Text><View style={s.row}><Text style={s.heroRule}>Resale: Closed</Text><Text style={s.heroRule}>Stake: {featured.stake} ETH</Text></View></View>
              <View style={[s.heroPurchase, narrow && { alignItems: 'flex-start' }]}><Text style={s.priceLabel}>TICKET PRICE</Text><Text style={s.heroPrice}>{featured.price} <Text style={s.eth}>ETH</Text></Text><Button label="Explore show  ↗" onPress={() => setSelected(featured)} /></View>
            </View>
          </View>

          <View style={[s.assurances, narrow && { flexDirection: 'column' }]}>{[
            ['◈', 'Yours. Verifiably.', 'Ownership and ticket history, on-chain.'],
            ['↗', 'Clear rules. Up front.', 'Know resale and stake rules before you buy.'],
            ['✓', 'One ticket. One entry.', 'On-chain verification prevents reuse.'],
          ].map(([icon, title, copy]) => <View key={title} style={s.assurance}><Text style={s.assuranceIcon}>{icon}</Text><View style={{ flex: 1, gap: 5 }}><Text style={s.assuranceTitle}>{title}</Text><Text style={s.small}>{copy}</Text></View></View>)}</View>

          <View onLayout={event => setShowsY(event.nativeEvent.layout.y)} style={s.showsSection}>
            <View style={s.sectionTop}><View><Text style={s.eyebrow}>FIND YOUR NEXT NIGHT</Text><Text accessibilityRole="header" style={s.sectionTitle}>Now showing<Text style={{ color: C.purple }}> ↗</Text></Text></View><Text style={s.count}>{visible.length.toString().padStart(2, '0')} SHOWS</Text></View>
            <View style={s.filters}>{['All shows', 'On sale'].map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)} style={[s.filter, filter === item && s.filterSelected]}><Text style={[s.filterText, filter === item && { color: '#fff' }]}>{item === 'On sale' ? '●  On sale' : item}</Text></Pressable>)}<Text style={s.curated}>A little louder. A little closer.</Text></View>
            <View style={[s.grid, narrow && { flexDirection: 'column' }]}>{visible.map(show => <Pressable key={show.id} accessibilityRole="button" accessibilityLabel={`View ${show.name}, ${show.price} ETH, ${show.saleOpen ? 'on sale' : 'sale closed'}`} onPress={() => setSelected(show)} style={({ hovered, pressed }) => [s.card, !narrow && { flexBasis: '30%' }, hovered && { borderColor: '#8b69bd' }, pressed && { opacity: 0.8 }]}>
              <View style={s.cardImage}>{image(show)}<View style={s.cardTint} /><View style={[s.sale, !show.saleOpen && { backgroundColor: '#302332' }]}><Text style={[s.saleText, !show.saleOpen && { color: '#f6bac5' }]}>{show.saleOpen ? '● ON SALE' : '○ SALE CLOSED'}</Text></View><View style={s.posterTitle}><Text style={[s.posterGenre, { color: show.color }]}>{show.genre}</Text><Text style={s.posterName}>{show.name.toUpperCase()}</Text></View></View>
              <View style={s.cardBody}><Text style={s.showName}>{show.name}</Text><Text style={s.small}>{show.subtitle}</Text><View style={s.tags}><Text style={s.policy}>↔  Resale: {show.policy}</Text><Text style={[s.policy, { color: show.stake === '0' ? C.dim : '#e0bcff' }]}>{show.stake === '0' ? 'No stake required' : `◈ ${show.stake} ETH stake`}</Text></View><View style={s.cardFooter}><View><Text style={s.priceLabel}>TICKET PRICE</Text><Text style={s.cardPrice}>{show.price} <Text style={s.eth}>ETH</Text></Text></View><View style={s.roundArrow}><Text style={{ color: C.text, fontSize: 22 }}>↗</Text></View></View></View>
            </Pressable>)}</View>
          </View>

          <View style={[s.bottomCallout, narrow && { flexDirection: 'column', alignItems: 'flex-start' }]}><View style={{ flex: 1, gap: 10 }}><Text style={s.eyebrow}>THE EXPERIENCE COMES FIRST</Text><Text style={s.calloutTitle}>Great nights. Clearer rules.</Text><Text style={s.small}>Check each show’s resale policy and stake requirement before you buy.</Text></View><Button label="How LivePass works  ↗" secondary onPress={() => setPanel('rules')} /></View>
          <View style={s.footer}><Text style={s.footerBrand}>LivePass.</Text><Text style={[s.small, { flex: 1 }]}>Built for the moments that matter.</Text><Text style={s.footerNetwork}>◈ SEPOLIA TESTNET</Text></View>
          <Text style={s.disclaimer}>课程演示 · 仅使用测试网 ETH，无真实资金。每钱包每演出限购一张，不等于实名限购。截图不作为入场凭证。</Text>
        </View>
      </ScrollView>

      <Modal visible={!!selected || !!panel} transparent animationType="none" onRequestClose={close}>
        <View style={s.modalBackdrop}><View accessibilityViewIsModal style={s.modal}>
          <ScrollView contentContainerStyle={{ padding: 26, gap: 18 }}><View style={s.sectionTop}><Text style={s.eyebrow}>{selected ? 'SHOW DETAILS / DEMO' : 'LIVEPASS / DEMO PREVIEW'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close dialog" onPress={close} style={s.close}><Text style={{ color: C.text, fontSize: 24 }}>×</Text></Pressable></View>
            <Text accessibilityRole="header" style={s.modalTitle}>{selected?.name ?? ({ wallet: 'Your wallet. Your ticket.', tickets: 'My tickets', stake: 'Stake & eligibility', rules: 'A better way to be there.' }[panel ?? 'rules'])}</Text>
            {selected ? <><Text style={s.description}>{selected.subtitle}</Text><Text style={s.cardPrice}>{selected.price} ETH</Text><Text style={{ color: selected.saleOpen ? C.green : '#f6bac5' }}>{selected.saleOpen ? '● ON SALE · 示例状态' : '○ SALE CLOSED · 示例状态'}</Text><Text style={s.modalCopy}>Resale: {selected.policy}{'\n'}{POLICY_COPY[selected.policy]}</Text><Text style={s.modalCopy}>{selected.stake === '0' ? '本场无需预存。' : `预存要求：${selected.stake} ETH。需达到部署合约设定的冷却时间，才能用于购票资格校验。保证金可取回，购票需另付票价。`}</Text><Text style={s.notice}>演示模式：尚未配置合约地址与 ABI，当前无法查询购票资格或提交交易。</Text><Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }} style={[s.button, { opacity: 0.45 }]}><Text style={s.buttonText}>{selected.saleOpen ? '购票暂不可用 · 待接入合约' : 'Sale closed'}</Text></Pressable></> : <>
              <Text style={s.modalCopy}>{panel === 'wallet' ? 'LivePass 将通过 MetaMask 在 Sepolia 测试网连接钱包。当前为首页设计预览，尚未接入钱包与合约。接入后将根据链上 owner 自动识别主办方和观众。' : panel === 'tickets' ? '接入钱包和合约后，这里将按当前所有权显示你的演出票，包含链上票面、使用状态和溯源记录。当前未读取链上票据，不展示虚构资产。' : panel === 'stake' ? '商家可按演出设置预存门槛；0 表示无需预存。保证金与票款分开，不能抵扣购票款，可随时取回。新增预存会重置冷却时间，具体门槛和冷却以部署合约为准。当前未接入存入或取回交易。' : '01  浏览演出，先了解票价、转售策略与预存要求。\n\n02  连接 MetaMask 并使用 Sepolia；需要预存时，达标且冷却结束后购票。\n\n03  支付与出票在同一笔交易中完成。每钱包每场限购一张。\n\n04  出示链上票面，主办方预检后永久核销；已验票不可再次入场。'}</Text>
              {panel === 'rules' && <Text style={s.notice}>Closed 禁止转移；Open 转移后仍可入场；Detect 允许转移但拒绝非首次买家入场。规则首次开售后冻结。链上限购无法阻止一人使用多个钱包，亦无法阻止私下转交钱包密钥。</Text>}<Button label="Got it" onPress={close} />
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
