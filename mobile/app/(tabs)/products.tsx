// app/(tabs)/products.tsx — Product catalog + video generation trigger.
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/storage';
import { fetchProducts, fetchLatestAvatarRequest, generateProductVideo } from '@/lib/api';
import { AffiliateSession, Product } from '@/lib/types';
import { COLORS, PLATFORMS } from '@/constants/config';

export default function ProductsScreen() {
  const router = useRouter();
  const [session, setSession] = useState<AffiliateSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [platform, setPlatform] = useState('tiktok');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const s = await getSession();
    setSession(s);
    try {
      const prods = await fetchProducts();
      setProducts(prods);
      setFiltered(prods);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  function handleSearch(q: string) {
    setSearch(q);
    const lq = q.toLowerCase();
    setFiltered(q ? products.filter(p => p.title.toLowerCase().includes(lq)) : products);
  }

  async function handleGenerateVideo() {
    if (!session) return;
    if (!selected) { Alert.alert('Select a product', 'Choose a product from the list first.'); return; }

    // Check they have an avatar
    const latestAvatar = await fetchLatestAvatarRequest(session.affiliateCode);
    if (!latestAvatar || latestAvatar.status !== 'completed') {
      Alert.alert(
        'No Avatar Yet',
        'You need a completed avatar to generate product videos. Create your avatar first.',
        [
          { text: 'Create Avatar', onPress: () => router.push('/(tabs)/avatar') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setGenerating(true);
    try {
      const job = await generateProductVideo({
        affiliateCode: session.affiliateCode,
        avatarRequestId: latestAvatar.requestId,
        productId: String(selected.id),
        productTitle: selected.title,
        productImageUrl: selected.imageUrl ?? selected.image,
        productPageUrl: selected.url,
        platform,
      });
      Alert.alert(
        '🎬 Video Rendering!',
        `Your product video is being created. Job ID: ${job.videoJobId}. Check the Videos tab for status.`,
        [{ text: 'View Videos', onPress: () => router.push('/(tabs)/videos') }]
      );
    } catch (e: unknown) {
      const msg = (e as Error).message || '';
      // Handle plan limit 402 response surfaced as error
      if (msg.includes('plan this month') || msg.includes('limitReached') || msg.includes('Upgrade')) {
        Alert.alert(
          '🚀 Upgrade Required',
          msg,
          [
            { text: 'View Plans', onPress: () => router.push('/(tabs)/upgrade') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Generation failed', msg);
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <Text style={styles.screenTitle}>Products</Text>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={COLORS.textDim} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Search products…"
          placeholderTextColor={COLORS.textDim}
        />
      </View>

      {/* Selected Product + Platform + Generate */}
      {selected && (
        <View style={styles.generateCard}>
          <Text style={styles.generateTitle}>GENERATE VIDEO</Text>
          <View style={styles.selectedProduct}>
            {(selected.imageUrl ?? selected.image) ? (
              <Image source={{ uri: selected.imageUrl ?? selected.image }} style={styles.selectedImage} />
            ) : (
              <View style={[styles.selectedImage, styles.imgPlaceholder]}>
                <Ionicons name="cube" size={22} color={COLORS.textDim} />
              </View>
            )}
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedTitle} numberOfLines={2}>{selected.title}</Text>
              {selected.price && <Text style={styles.selectedPrice}>${selected.price}</Text>}
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.clearBtn}>
              <Ionicons name="close" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>PLATFORM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.platformScroll}>
            {PLATFORMS.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.platformChip, platform === p.value && styles.platformChipActive]}
                onPress={() => setPlatform(p.value)}
                activeOpacity={0.8}
              >
                <Text style={styles.platformEmoji}>{p.icon}</Text>
                <Text style={[styles.platformLabel, platform === p.value && styles.platformLabelActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.generateBtn, generating && styles.btnDisabled]}
            onPress={handleGenerateVideo}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="videocam" size={18} color="#000" />
                <Text style={styles.generateBtnText}>Generate AI Video</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Product List */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={48} color={COLORS.textDim} />
          <Text style={styles.emptyText}>{search ? 'No products match your search.' : 'No products found.'}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.countLabel}>{filtered.length} product{filtered.length !== 1 ? 's' : ''}</Text>
          {filtered.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.productCard, selected?.id === p.id && styles.productCardSelected]}
              onPress={() => setSelected(selected?.id === p.id ? null : p)}
              activeOpacity={0.8}
            >
              {(p.imageUrl ?? p.image) ? (
                <Image source={{ uri: p.imageUrl ?? p.image }} style={styles.productImg} />
              ) : (
                <View style={[styles.productImg, styles.imgPlaceholder]}>
                  <Ionicons name="cube" size={22} color={COLORS.textDim} />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={2}>{p.title}</Text>
                {p.price && <Text style={styles.productPrice}>${p.price}</Text>}
              </View>
              <Ionicons
                name={selected?.id === p.id ? 'checkmark-circle' : 'chevron-forward'}
                size={20}
                color={selected?.id === p.id ? COLORS.primary : COLORS.textDim}
              />
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 32 },
  screenTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginBottom: 16 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, paddingHorizontal: 12, marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 },
  generateCard: {
    backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.primary + '55', padding: 16, marginBottom: 20,
  },
  generateTitle: { color: COLORS.primary, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 12 },
  selectedProduct: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  selectedImage: { width: 48, height: 48, borderRadius: 8 },
  imgPlaceholder: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  selectedInfo: { flex: 1 },
  selectedTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  selectedPrice: { color: COLORS.success, fontSize: 13, fontWeight: '600', marginTop: 2 },
  clearBtn: { padding: 4 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  platformScroll: { marginBottom: 14 },
  platformChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginRight: 8,
  },
  platformChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  platformEmoji: { fontSize: 14 },
  platformLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  platformLabelActive: { color: '#000' },
  generateBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  generateBtnText: { color: '#000', fontWeight: '900', fontSize: 15 },
  btnDisabled: { opacity: 0.4 },
  countLabel: { color: COLORS.textDim, fontSize: 12, marginBottom: 10 },
  productCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: 12, marginBottom: 10,
  },
  productCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryDim },
  productImg: { width: 56, height: 56, borderRadius: 8 },
  productInfo: { flex: 1 },
  productTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  productPrice: { color: COLORS.success, fontSize: 13, fontWeight: '600', marginTop: 3 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
