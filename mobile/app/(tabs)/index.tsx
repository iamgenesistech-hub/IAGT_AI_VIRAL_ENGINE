// app/(tabs)/index.tsx — Home dashboard screen.
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Image, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession, clearSession } from '@/lib/storage';
import { fetchHealth, fetchAffiliateProfile, fetchAvatarGallery, fetchVideoLibrary } from '@/lib/api';
import { AffiliateSession, AvatarGalleryItem, VideoJob } from '@/lib/types';
import { COLORS } from '@/constants/config';

export default function HomeScreen() {
  const router = useRouter();
  const [session, setSession] = useState<AffiliateSession | null>(null);
  const [health, setHealth] = useState<{ status: string; version: string } | null>(null);
  const [avatars, setAvatars] = useState<AvatarGalleryItem[]>([]);
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const s = await getSession();
    setSession(s);
    if (!s) return;
    try {
      const profile = await fetchAffiliateProfile(s.affiliateCode);
      const mergedSession = {
        ...s,
        profileId: profile.profileId || s.profileId || s.affiliateCode,
        profilePhotoUrl: profile.profilePhotoUrl || profile.pictureUrl || s.profilePhotoUrl,
        voiceFileUrl: profile.voiceFileUrl || s.voiceFileUrl,
        voiceId: profile.voiceId || profile.voiceCloneId || s.voiceId,
        voiceCloneId: profile.voiceCloneId || s.voiceCloneId,
      };
      setSession(mergedSession);
    } catch {}
    try { setHealth(await fetchHealth()); } catch {}
    try { setAvatars(await fetchAvatarGallery(s.affiliateCode)); } catch {}
    try { setVideos(await fetchVideoLibrary(s.affiliateCode)); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const completedAvatars = avatars.filter(a => a.status === 'completed').length;
  const completedVideos = videos.filter(v => v.status === 'completed').length;
  const renderingVideos = videos.filter(v => v.status === 'rendering').length;
  const latestVideo = videos.find(v => v.status === 'completed');
  const latestAvatar = avatars[0];
  const profilePhotoUrl = session?.profilePhotoUrl || latestAvatar?.photoUrl;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{session?.affiliateName ?? '—'}</Text>
          <Text style={styles.code}>{session?.affiliateCode ?? ''}</Text>
        </View>
        {profilePhotoUrl ? (
          <Image source={{ uri: profilePhotoUrl }} style={styles.profilePic} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Ionicons name="person" size={28} color={COLORS.primary} />
          </View>
        )}
      </View>

      {/* Status pill */}
      <View style={styles.statusRow}>
        <View style={[styles.pill, health?.status === 'healthy' ? styles.pillGreen : styles.pillRed]}>
          <View style={[styles.dot, health?.status === 'healthy' ? styles.dotGreen : styles.dotRed]} />
          <Text style={styles.pillText}>{health?.status === 'healthy' ? 'Platform Live' : 'Connecting…'}</Text>
        </View>
        {health?.version && <Text style={styles.version}>v{health.version}</Text>}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label="Avatars" value={completedAvatars} icon="person-circle" color={COLORS.accent} />
        <StatCard label="Videos" value={completedVideos} icon="play-circle" color={COLORS.primary} />
        <StatCard label="Rendering" value={renderingVideos} icon="hourglass" color={COLORS.warning} />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
      <View style={styles.actionsGrid}>
        <QuickAction icon="create" label="Edit Profile Assignment" color={COLORS.primary} onPress={() => router.push('/profile-editor')} />
        <QuickAction icon="person-add" label="Create Avatar" color={COLORS.accent} onPress={() => router.push('/(tabs)/avatar')} />
        <QuickAction icon="videocam" label="Generate Video" color={COLORS.primary} onPress={() => router.push('/(tabs)/products')} />
        <QuickAction icon="grid" label="Browse Products" color={COLORS.success} onPress={() => router.push('/(tabs)/products')} />
        <QuickAction icon="library" label="Video Library" color={COLORS.warning} onPress={() => router.push('/(tabs)/videos')} />
      </View>

      {/* Latest video preview */}
      {latestVideo && (
        <>
          <Text style={styles.sectionTitle}>LATEST VIDEO</Text>
          <TouchableOpacity style={styles.videoPreviewCard} onPress={() => router.push('/(tabs)/videos')} activeOpacity={0.8}>
            {latestVideo.thumbnailUrl ? (
              <Image source={{ uri: latestVideo.thumbnailUrl }} style={styles.videoThumb} />
            ) : (
              <View style={[styles.videoThumb, styles.videoThumbPlaceholder]}>
                <Ionicons name="play-circle" size={40} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.videoPreviewInfo}>
              <Text style={styles.videoPreviewTitle} numberOfLines={1}>{latestVideo.productTitle ?? 'Product Video'}</Text>
              <Text style={styles.videoPreviewMeta}>
                {latestVideo.platform?.toUpperCase()} · {latestVideo.voiceType === 'clone' ? '🎤 Your Voice' : '🔊 Stock Voice'}
              </Text>
              {latestVideo.qualityScore != null && (
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>AI Score {latestVideo.qualityScore}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </>
      )}

      {/* Governance Banner */}
      <View style={styles.govBanner}>
        <Text style={styles.govText}>🕊️  All AI outputs governed by truth, integrity, and dignity.</Text>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '44' }]}>
      <Ionicons name={icon as never} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.quickAction, { borderColor: color + '44' }]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon as never} size={28} color={color} />
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { color: COLORS.textMuted, fontSize: 13 },
  name: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  code: { color: COLORS.primary, fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  profilePic: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: COLORS.primary },
  profilePlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  pillGreen: { backgroundColor: '#16a34a22', borderColor: '#22c55e44' },
  pillRed: { backgroundColor: '#dc262622', borderColor: '#ef444444' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotGreen: { backgroundColor: COLORS.success },
  dotRed: { backgroundColor: COLORS.danger },
  pillText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  version: { color: COLORS.textDim, fontSize: 11 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1,
    padding: 14, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  sectionTitle: {
    color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 2, marginBottom: 10,
  },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  quickAction: {
    width: '47%', backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1,
    padding: 16, alignItems: 'center', gap: 8,
  },
  quickLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  videoPreviewCard: {
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, flexDirection: 'row', overflow: 'hidden', marginBottom: 24,
  },
  videoThumb: { width: 100, height: 80 },
  videoThumbPlaceholder: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  videoPreviewInfo: { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
  videoPreviewTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  videoPreviewMeta: { color: COLORS.textMuted, fontSize: 11 },
  scoreBadge: {
    backgroundColor: COLORS.primaryDim, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  scoreText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  govBanner: {
    backgroundColor: COLORS.accentDim, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: COLORS.accent + '44',
  },
  govText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});
