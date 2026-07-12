// app/(tabs)/studio.tsx — Video Production Studio.
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/storage';
import { fetchAvatarGallery, fetchProducts, generateProductVideo, fetchVideoLibrary } from '@/lib/api';
import { AffiliateSession, AvatarGalleryItem, Product, VideoJob } from '@/lib/types';
import { COLORS } from '@/constants/config';

export default function StudioScreen() {
  const router = useRouter();
  const [session, setSession] = useState<AffiliateSession | null>(null);
  const [avatars, setAvatars] = useState<AvatarGalleryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoJob[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarGalleryItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const s = await getSession();
    setSession(s);
    if (!s) return;
    try {
      const avs = await fetchAvatarGallery(s.affiliateCode);
      const completed = avs.filter(a => a.status === 'completed');
      setAvatars(completed);
      if (completed.length > 0) setSelectedAvatar(prev => prev ?? completed[0]);
    } catch {}
    try { setProducts(await fetchProducts()); } catch {}
    try {
      const vids = await fetchVideoLibrary(s.affiliateCode);
      setRecentVideos(vids.slice(0, 4));
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  async function handleGenerate() {
    if (!session) { Alert.alert('Not logged in', 'Please log in first.'); return; }
    if (!selectedProduct) { Alert.alert('No product selected', 'Select a product to generate a video.'); return; }
    setGenerating(true);
    try {
      const job = await generateProductVideo({
        affiliateCode: session.affiliateCode,
        avatarRequestId: selectedAvatar?.requestId,
        productId: String(selectedProduct.id),
        productTitle: selectedProduct.title,
        productImageUrl: selectedProduct.imageUrl || selectedProduct.image,
        productPageUrl: selectedProduct.url,
        platform: 'tiktok',
      });
      Alert.alert(
        '🎬 Video Queued!',
        `Your cinematic video is being generated.\nJob: ${job.videoJobId}\n\nCheck the Videos tab for progress.`,
        [
          { text: 'View Videos', onPress: () => router.push('/(tabs)/videos') },
          { text: 'OK' },
        ]
      );
    } catch (e: unknown) {
      Alert.alert('Generation failed', (e as Error).message);
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
      <Text style={styles.screenTitle}>Studio</Text>
      <Text style={styles.screenSub}>Create cinematic AI product videos</Text>

      {/* Avatar Selector */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>YOUR AVATAR</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/avatar')} activeOpacity={0.8}>
            <Text style={styles.sectionAction}>+ New Avatar</Text>
          </TouchableOpacity>
        </View>
        {avatars.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={() => router.push('/(tabs)/avatar')} activeOpacity={0.8}>
            <Ionicons name="person-add" size={32} color={COLORS.primary} />
            <Text style={styles.emptyCardText}>Create your first avatar to start generating videos</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {avatars.map(av => (
              <TouchableOpacity
                key={av.requestId}
                style={[styles.avatarChip, selectedAvatar?.requestId === av.requestId && styles.avatarChipActive]}
                onPress={() => setSelectedAvatar(av)}
                activeOpacity={0.8}
              >
                {av.photoUrl ? (
                  <Image source={{ uri: av.photoUrl }} style={styles.avatarThumb} />
                ) : (
                  <View style={[styles.avatarThumb, styles.thumbPlaceholder]}>
                    <Ionicons name="person" size={22} color={COLORS.primary} />
                  </View>
                )}
                <Text style={[styles.avatarName, selectedAvatar?.requestId === av.requestId && styles.avatarNameActive]} numberOfLines={1}>
                  {av.name || 'Avatar'}
                </Text>
                {selectedAvatar?.requestId === av.requestId && (
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Product Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SELECT PRODUCT</Text>
        {products.length === 0 ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.emptyCardText}>Loading products…</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {products.map(prod => (
              <TouchableOpacity
                key={prod.id}
                style={[styles.productCard, selectedProduct?.id === prod.id && styles.productCardActive]}
                onPress={() => setSelectedProduct(prod)}
                activeOpacity={0.8}
              >
                {(prod.imageUrl || prod.image) ? (
                  <Image source={{ uri: (prod.imageUrl || prod.image) as string }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, styles.thumbPlaceholder]}>
                    <Ionicons name="cube" size={24} color={COLORS.textDim} />
                  </View>
                )}
                <Text style={[styles.productName, selectedProduct?.id === prod.id && styles.productNameActive]} numberOfLines={2}>
                  {prod.title}
                </Text>
                {prod.price ? <Text style={styles.productPrice}>{prod.price}</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Cinematic info banner */}
      <View style={styles.cinematicBanner}>
        <Ionicons name="film" size={16} color={COLORS.accent} />
        <Text style={styles.cinematicText}>Cinematic mode on — Seedance post-render + camera motion applied automatically</Text>
      </View>

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateBtn, (generating || !selectedProduct) && styles.btnDisabled]}
        onPress={handleGenerate}
        disabled={generating || !selectedProduct}
        activeOpacity={0.8}
      >
        {generating ? (
          <ActivityIndicator color="#000" size="small" />
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color="#000" />
            <Text style={styles.generateBtnText}>Generate Cinematic Video</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Recent Renders */}
      {recentVideos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>RECENT RENDERS</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/videos')} activeOpacity={0.8}>
              <Text style={styles.sectionAction}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentVideos.map(v => (
            <View key={v.videoJobId} style={styles.recentRow}>
              <View style={[styles.statusDot, {
                backgroundColor: v.status === 'completed' ? COLORS.success : v.status === 'failed' ? COLORS.danger : COLORS.warning
              }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTitle} numberOfLines={1}>{v.productTitle || 'Product Video'}</Text>
                <Text style={styles.recentMeta}>{v.status?.toUpperCase()} · {(v.platform || 'TIKTOK').toUpperCase()}</Text>
              </View>
              {v.qualityScore != null && <Text style={styles.qualityScore}>{v.qualityScore}</Text>}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  screenTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', marginBottom: 4 },
  screenSub: { color: COLORS.textMuted, fontSize: 13, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  sectionAction: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  emptyCard: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 24, alignItems: 'center', gap: 10 },
  emptyCardText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  avatarChip: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginRight: 10, padding: 10, alignItems: 'center', width: 90 },
  avatarChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryDim },
  avatarThumb: { width: 56, height: 56, borderRadius: 28, marginBottom: 6 },
  thumbPlaceholder: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  avatarName: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  avatarNameActive: { color: COLORS.primary },
  checkIcon: { position: 'absolute', top: 6, right: 6 },
  productCard: { backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginRight: 10, padding: 10, width: 130 },
  productCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryDim },
  productImage: { width: 110, height: 80, borderRadius: 8, marginBottom: 8 },
  productName: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  productNameActive: { color: COLORS.primary },
  productPrice: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  cinematicBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accentDim, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.accent + '44', marginBottom: 16 },
  cinematicText: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, borderRadius: 14, padding: 18, marginBottom: 28 },
  generateBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  btnDisabled: { opacity: 0.4 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border + '44' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  recentTitle: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  recentMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  qualityScore: { color: COLORS.primary, fontWeight: '900', fontSize: 16 },
});
