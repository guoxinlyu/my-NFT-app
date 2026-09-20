import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#7C5CFF';
const POSITIVE = '#16C784';
const NEGATIVE = '#EA3943';
const BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

const artwork = (seed: string, size = 600) => `https://picsum.photos/seed/${seed}/${size}/${size}`;
const avatar = (seed: string) => `https://picsum.photos/seed/${seed}/80/80`;

const CATEGORIES = ['All', 'Art', 'Gaming', 'Music', 'Photography', '3D', 'Sports'];

type Nft = {
  id: string;
  name: string;
  collection: string;
  price: string;
  usd: string;
  image: string;
};

const TRENDING: Nft[] = [
  {
    id: 'n1',
    name: 'Chromatic Drift #042',
    collection: 'Lunar Studio',
    price: '4.20',
    usd: '$12.4K',
    image: artwork('nft-chromatic'),
  },
  {
    id: 'n2',
    name: 'Neon Wasteland',
    collection: 'Cyber Atlas',
    price: '2.85',
    usd: '$8.4K',
    image: artwork('nft-neon'),
  },
  {
    id: 'n3',
    name: 'Liquid Marble 07',
    collection: 'Fluid Forms',
    price: '1.94',
    usd: '$5.7K',
    image: artwork('nft-marble'),
  },
  {
    id: 'n4',
    name: 'Orbital Bloom',
    collection: 'Botanic Void',
    price: '3.60',
    usd: '$10.6K',
    image: artwork('nft-orbital'),
  },
  {
    id: 'n5',
    name: 'Static Ritual',
    collection: 'Analog Ghosts',
    price: '0.88',
    usd: '$2.6K',
    image: artwork('nft-static'),
  },
  {
    id: 'n6',
    name: 'Prism Runner',
    collection: 'Vector Kids',
    price: '1.25',
    usd: '$3.7K',
    image: artwork('nft-prism'),
  },
];

type Collection = {
  id: string;
  rank: string;
  name: string;
  floor: string;
  change: string;
  up: boolean;
  cover: string;
};

const COLLECTIONS: Collection[] = [
  { id: 'c1', rank: '1', name: 'Lunar Studio', floor: '4.2', change: '+18.4%', up: true, cover: artwork('col-lunar', 400) },
  { id: 'c2', rank: '2', name: 'Cyber Atlas', floor: '2.9', change: '+7.1%', up: true, cover: artwork('col-atlas', 400) },
  { id: 'c3', rank: '3', name: 'Fluid Forms', floor: '2.1', change: '-3.2%', up: false, cover: artwork('col-fluid', 400) },
  { id: 'c4', rank: '4', name: 'Botanic Void', floor: '1.8', change: '+12.9%', up: true, cover: artwork('col-botanic', 400) },
  { id: 'c5', rank: '5', name: 'Analog Ghosts', floor: '0.9', change: '-1.5%', up: false, cover: artwork('col-ghosts', 400) },
];

const STATS = [
  { label: '24h volume', value: '12.4K ETH' },
  { label: 'Floor price', value: '3.20 ETH' },
  { label: 'Owners', value: '8.9K' },
];

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.five,
      paddingBottom: Spacing.four,
    },
  });

  const toggleLike = (id: string) => setLiked((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
      showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.brandMark} />
            <ThemedText type="smallBold" style={styles.brandName}>
              LUNAR
            </ThemedText>
          </View>

          <Pressable style={({ pressed }) => [styles.walletButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.onAccent}>
              Connect Wallet
            </ThemedText>
          </Pressable>
        </View>

        <ThemedView type="backgroundElement" style={styles.searchBar}>
          <ThemedText type="small">🔍</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Search items, collections, creators
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.heroCard}>
          <Image
            source={{ uri: artwork('lunar-hero', 1200) }}
            style={styles.heroImage}
            contentFit="cover"
            transition={400}
            placeholder={{ blurhash: BLURHASH }}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <ThemedView type="backgroundSelected" style={styles.heroTag}>
              <ThemedText type="small" style={styles.onAccent}>
                Featured drop
              </ThemedText>
            </ThemedView>

            <ThemedText type="subtitle" style={styles.onAccent}>
              Chromatic Drift #042
            </ThemedText>
            <ThemedText type="small" style={styles.heroMeta}>
              @lunarstudio · 12 editions left
            </ThemedText>

            <View style={styles.heroFooter}>
              <View>
                <ThemedText type="small" style={styles.heroMeta}>
                  Current bid
                </ThemedText>
                <ThemedText type="smallBold" style={styles.onAccent}>
                  4.20 ETH
                </ThemedText>
              </View>

              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <View style={styles.bidButton}>
                  <ThemedText type="smallBold" style={styles.onAccent}>
                    Place bid
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          </View>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.statsRow}>
          {STATS.map((stat, index) => (
            <View key={stat.label} style={styles.statItem}>
              {index > 0 && <View style={styles.statDivider} />}
              <ThemedText type="small" themeColor="textSecondary">
                {stat.label}
              </ThemedText>
              <ThemedText type="smallBold">{stat.value}</ThemedText>
            </View>
          ))}
        </ThemedView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map((item) => {
            const active = item === category;
            return (
              <Pressable key={item} onPress={() => setCategory(item)}>
                <ThemedView
                  type={active ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.chip, active && styles.chipActive]}>
                  <ThemedText
                    type={active ? 'smallBold' : 'small'}
                    themeColor={active ? 'text' : 'textSecondary'}>
                    {item}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Trending now
          </ThemedText>
          <Pressable
            onPress={() => router.push('/explore')}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="small" themeColor="textSecondary">
              See all →
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.nftGrid}>
          {TRENDING.map((item) => (
            <ThemedView key={item.id} type="backgroundElement" style={styles.nftCard}>
              <View style={styles.nftImageWrapper}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.nftImage}
                  contentFit="cover"
                  transition={250}
                  placeholder={{ blurhash: BLURHASH }}
                />
                <Pressable
                  onPress={() => toggleLike(item.id)}
                  style={({ pressed }) => [styles.likeButton, pressed && styles.pressed]}>
                  <ThemedText
                    type="small"
                    style={liked[item.id] ? styles.likeActive : styles.onAccent}>
                    {liked[item.id] ? '♥' : '♡'}
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.nftBody}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {item.collection}
                </ThemedText>

                <View style={styles.nftPriceRow}>
                  <View>
                    <ThemedText type="small" themeColor="textSecondary">
                      Price
                    </ThemedText>
                    <ThemedText type="smallBold">{item.price} ETH</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.usd}
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            Top collections
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            24h
          </ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.collectionScroller}
          contentContainerStyle={styles.collectionRow}>
          {COLLECTIONS.map((item) => (
            <ThemedView key={item.id} type="backgroundElement" style={styles.collectionCard}>
              <View style={styles.collectionCoverWrapper}>
                <Image
                  source={{ uri: item.cover }}
                  style={styles.collectionCover}
                  contentFit="cover"
                  transition={250}
                  placeholder={{ blurhash: BLURHASH }}
                />
                <ThemedView type="backgroundSelected" style={styles.rankBadge}>
                  <ThemedText type="small" style={styles.onAccent}>
                    #{item.rank}
                  </ThemedText>
                </ThemedView>
              </View>

              <View style={styles.collectionBody}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <View style={styles.collectionFooter}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Floor {item.floor}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={item.up ? styles.positive : styles.negative}>
                    {item.change}
                  </ThemedText>
                </View>
              </View>
            </ThemedView>
          ))}
        </ScrollView>

        <View style={styles.creatorRow}>
          <Image
            source={{ uri: avatar('creator-lunar') }}
            style={styles.creatorAvatar}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.creatorText}>
            <ThemedText type="smallBold">Become a creator</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Mint your first collection in minutes
            </ThemedText>
          </View>
          <Pressable style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.onAccent}>
              Create
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  pressed: {
    opacity: 0.75,
  },
  onAccent: {
    color: '#ffffff',
  },
  positive: {
    color: POSITIVE,
  },
  negative: {
    color: NEGATIVE,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
  },
  brandName: {
    letterSpacing: 2,
  },
  walletButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },

  heroCard: {
    borderRadius: Spacing.four,
    overflow: 'hidden',
    height: 320,
    justifyContent: 'flex-end',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroContent: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  heroTag: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.75)',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  bidButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },

  statsRow: {
    flexDirection: 'row',
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  statDivider: {
    position: 'absolute',
    left: 0,
    top: Spacing.one,
    bottom: Spacing.one,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.4)',
  },

  chipScroller: {
    marginHorizontal: -Spacing.four,
  },
  chipRow: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  chipActive: {
    borderWidth: 1,
    borderColor: ACCENT,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
  },

  nftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  nftCard: {
    flexBasis: 130,
    flexGrow: 1,
    maxWidth: 240,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  nftImageWrapper: {
    position: 'relative',
  },
  nftImage: {
    width: '100%',
    aspectRatio: 1,
  },
  likeButton: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  likeActive: {
    color: '#FF4D6D',
  },
  nftBody: {
    padding: Spacing.three,
    gap: Spacing.half,
  },
  nftPriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },

  collectionScroller: {
    marginHorizontal: -Spacing.four,
  },
  collectionRow: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  collectionCard: {
    width: 170,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  collectionCoverWrapper: {
    position: 'relative',
  },
  collectionCover: {
    width: '100%',
    height: 110,
  },
  rankBadge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  collectionBody: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  collectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    backgroundColor: 'rgba(124,92,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.35)',
    marginBottom: Spacing.two,
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  creatorText: {
    flex: 1,
    gap: Spacing.half,
  },
  createButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
