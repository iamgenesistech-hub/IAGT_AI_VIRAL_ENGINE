// app/(tabs)/videos.tsx — Video library with playback, metadata, share, delete, and auto-poll.
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Alert, Share, Clipboard,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/storage';
import { fetchVideoLibrary, fetchVideoStatus } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { AffiliateSession, VideoJob, MetadataPackage } from '@/lib/types';
import { COLORS, PLATFORMS, API_BASE } from '@/constants/config';

const POLL_INTERVAL_MS = 15_000;

export default function VideosScreen() {
  const [session, setSession] = useState<AffiliateSession | null>(null);
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(prev => prev);
    const s = await getSession();
    setSession(s);
    if (!s) { setLoading(false); return; }
    try {
      const vids = await fetchVideoLibrary(s.affiliateCode);
      setVideos(vids);
    } catch {
      if (!silent) setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSingleJob = useCallback(async (jobId: string, affiliateCode: string) => {
    try {
      const updated = await fetchVideoStatus(jobId, affiliateCode);
      setVideos(prev => prev.map(v => v.videoJobId === jobId ? updated : v));
      return updated.status;
    } catch {
      return null;
    }
  }, []);

  // Auto-poll while any video is still rendering
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const hasRendering = videos.some(v => v.status === 'rendering');
    if (!hasRendering || !session) return;
    pollRef.current = setInterval(async () => {
      const renderingJobs = videos.filter(v => v.status === 'rendering');
      if (renderingJobs.length === 0) {
        clearInterval(pollRef.current!);
        return;
      }
      for (const job of renderingJobs) {
        await refreshSingleJob(job.videoJobId, session.affiliateCode);
      }
    }, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [videos, session, refreshSingleJob]);

  useEffect(() => {
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  function getVideoUrl(video: VideoJob): string | null {
    return resolveMediaUrl(video.gcsVideoUrl || video.videoUrl || null);
  }

  function getPlatformMeta(video: VideoJob): MetadataPackage | null {
    if (!video.metadata) return null;
    return video.metadata[video.platform ?? 'tiktok'] ?? Object.values(video.metadata)[0] ?? null;
  }

  const scoreGrade = (score: number) => {
    if (score >= 85) return { label: 'Excellent', color: COLORS.success };
    if (score >= 70) return { label: 'Strong', color: COLORS.primary };
    if (score >= 50) return { label: 'Fair', color: COLORS.warning };
    return { label: 'Needs Work', color: COLORS.danger };
  };

  async function handleShare(video: VideoJob) {
    const url = getVideoUrl(video);
    if (!url) { Alert.alert('No video URL', 'This video is not yet available.'); return; }
    const meta = getPlatformMeta(video);
    try {
      await Share.share({
        title: meta?.title ?? video.productTitle ?? 'My AI Video',
        message: `${meta?.title ?? video.productTitle ?? 'Check out this AI product video!'}\n\n${url}${meta?.hashtags?.length ? '\n\n' + meta.hashtags.map(t => `#${t}`).join(' ') : ''}`,
        url,
      });
    } catch {}
  }

  async function handleDelete(video: VideoJob) {
    if (!session) return;
    Alert.alert(
      'Delete Video',
      `Delete "${video.productTitle ?? 'this video'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeletingId(video.videoJobId);
            try {
              const res = await fetch(
                `${API_BASE}/api/affiliate/product-video/${video.videoJobId}`,
                {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ affiliateCode: session.affiliateCode }),
                }
              );
              const data = await res.json();
              if (res.ok && data.success) {
                setVideos(prev => prev.filter(v => v.videoJobId !== video.videoJobId));
                if (expandedId === video.videoJobId) setExpandedId(null);
              } else {
                Alert.alert('Delete failed', data.error ?? 'Could not delete video.');
              }
            } catch (e: unknown) {
              Alert.alert('Error', (e as Error).message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  function copyToClipboard(text: string, label: string) {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard.`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const renderingCount = videos.filter(v => v.status === 'rendering').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <Text style={styles.screenTitle}>Video Library</Text>
      <Text style={styles.screenSub}>{videos.length} video{videos.length !== 1 ? 's' : ''}</Text>

      {/* Live rendering badge */}
      {renderingCount > 0 && (
        <View style={styles.pollingBanner}>
          <ActivityIndicator color={COLORS.warning} size="small" />
          <Text style={styles.pollingText}>
            {renderingCount} video{renderingCount > 1 ? 's' : ''} rendering · auto-refreshing every 15s
          </Text>
        </View>
      )}

      {videos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="videocam-outline" size={60} color={COLORS.textDim} />
          <Text style={styles.emptyTitle}>No videos yet</Text>
          <Text style={styles.emptyText}>Select a product in Studio and generate your first AI video.</Text>
        </View>
      ) : (
        videos.map(video => {
          const isExpanded = expandedId === video.videoJobId;
          const meta = getPlatformMeta(video);
          const url = getVideoUrl(video);
          const grade = video.qualityScore != null ? scoreGrade(video.qualityScore) : null;
          const platformInfo = PLATFORMS.find(p => p.value === video.platform);
          const isDeleting = deletingId === video.videoJobId;

          return (
            <View key={video.videoJobId} style={styles.videoCard}>
              {/* Card Header */}
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedId(isExpanded ? null : video.videoJobId)}
                activeOpacity={0.8}
              >
                {video.thumbnailUrl ? (
                  <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Ionicons name="play-circle" size={28} color={COLORS.primary} />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardProductTitle} numberOfLines={1}>
                    {video.productTitle ?? 'Product Video'}
                  </Text>
                  <View style={styles.metaRow}>
                    {platformInfo && <Text style={styles.metaChip}>{platformInfo.icon} {platformInfo.label}</Text>}
                    <View style={[styles.statusDot,
                      video.status === 'completed' ? styles.dotGreen :
                      video.status === 'failed' ? styles.dotRed : styles.dotYellow
                    ]} />
                    <Text style={styles.statusLabel}>{video.status}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    {video.voiceType === 'clone' && <Text style={styles.voiceBadge}>🎤 Your Voice</Text>}
                    {grade && (
                      <View style={[styles.scoreBadge, { backgroundColor: grade.color + '22' }]}>
                        <Text style={[styles.scoreText, { color: grade.color }]}>
                          {video.qualityScore} · {grade.label}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  {/* Share */}
                  {video.status === 'completed' && url && (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleShare(video)} activeOpacity={0.7}>
                      <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                  {/* Delete */}
                  <TouchableOpacity
                    style={[styles.iconBtn, isDeleting && { opacity: 0.4 }]}
                    onPress={() => handleDelete(video)}
                    disabled={isDeleting}
                    activeOpacity={0.7}
                  >
                    {isDeleting
                      ? <ActivityIndicator size="small" color={COLORS.danger} />
                      : <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    }
                  </TouchableOpacity>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textDim} />
                </View>
              </TouchableOpacity>

              {/* Expanded Details */}
              {isExpanded && (
                <View style={styles.expanded}>
                  {/* Video player */}
                  {video.status === 'completed' && url ? (
                    <>
                      <VideoPlayer url={url} />
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => copyToClipboard(url, 'Video URL')}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="copy" size={15} color={COLORS.primary} />
                          <Text style={styles.actionBtnText}>Copy URL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleShare(video)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="share-social" size={15} color={COLORS.primary} />
                          <Text style={styles.actionBtnText}>Share</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : video.status === 'rendering' ? (
                    <View style={styles.renderingBox}>
                      <ActivityIndicator color={COLORS.primary} size="small" />
                      <Text style={styles.renderingText}>Rendering… auto-refreshing every 15 seconds.</Text>
                    </View>
                  ) : video.status === 'failed' ? (
                    <View style={styles.failedBox}>
                      <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                      <Text style={styles.failedText}>{video.error ?? 'Render failed'}</Text>
                    </View>
                  ) : null}

                  {/* Platform metadata */}
                  {meta && (
                    <View style={styles.metaSection}>
                      <Text style={styles.metaSectionTitle}>PLATFORM METADATA</Text>
                      <Text style={styles.metaLabel}>TITLE</Text>
                      <View style={styles.copyRow}>
                        <Text style={styles.metaValue} numberOfLines={2}>{meta.title}</Text>
                        <TouchableOpacity onPress={() => copyToClipboard(meta.title, 'Title')} style={styles.copyIcon}>
                          <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.metaLabel}>DESCRIPTION</Text>
                      <View style={styles.copyRow}>
                        <Text style={styles.metaValue} numberOfLines={3}>{meta.description}</Text>
                        <TouchableOpacity onPress={() => copyToClipboard(meta.description, 'Description')} style={styles.copyIcon}>
                          <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                      {meta.hashtags?.length > 0 && (
                        <>
                          <Text style={styles.metaLabel}>HASHTAGS</Text>
                          <View style={styles.hashtagRow}>
                            {meta.hashtags.slice(0, 8).map((tag, i) => (
                              <Text key={i} style={styles.hashtag}>#{tag}</Text>
                            ))}
                            <TouchableOpacity onPress={() => copyToClipboard(meta.hashtags.map(t => `#${t}`).join(' '), 'Hashtags')} style={styles.copyIcon}>
                              <Ionicons name="copy-outline" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                      {meta.postingTime && (
                        <>
                          <Text style={styles.metaLabel}>BEST POSTING TIME</Text>
                          <Text style={styles.metaValue}>⏰ {meta.postingTime}</Text>
                        </>
                      )}
                      {meta.discoverability && (
                        <View style={styles.discScore}>
                          <Text style={styles.discLabel}>SEO SCORE</Text>
                          <Text style={[styles.discValue, {
                            color: meta.discoverability.score >= 80 ? COLORS.success :
                              meta.discoverability.score >= 60 ? COLORS.primary : COLORS.warning
                          }]}>
                            {meta.discoverability.score} · {meta.discoverability.grade}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Script preview */}
                  {video.script && (
                    <View style={styles.scriptSection}>
                      <Text style={styles.metaSectionTitle}>SCRIPT</Text>
                      <Text style={styles.scriptText}>{video.script}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ── Inline Video Player ──────────────────────────────────────────────────────

function VideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, p => { p.loop = false; });
  return (
    <VideoView
      player={player}
      style={styles.videoPlayer}
      allowsFullscreen
      allowsPictureInPicture
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 32 },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  screenSub: { color: COLORS.textMuted, fontSize: 12, marginBottom: 14 },
  pollingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.warning + '18', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: COLORS.warning + '40', marginBottom: 14,
  },
  pollingText: { color: COLORS.warning, fontSize: 12, fontWeight: '600', flex: 1 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  videoCard: {
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 12, overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  thumb: { width: 72, height: 56, borderRadius: 8 },
  thumbPlaceholder: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardProductTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  metaChip: { color: COLORS.textMuted, fontSize: 11 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  dotGreen: { backgroundColor: COLORS.success },
  dotYellow: { backgroundColor: COLORS.warning },
  dotRed: { backgroundColor: COLORS.danger },
  statusLabel: { color: COLORS.textMuted, fontSize: 12 },
  voiceBadge: { color: COLORS.textMuted, fontSize: 11 },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  scoreText: { fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 6 },
  expanded: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: 14, gap: 12 },
  videoPlayer: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#000', marginBottom: 8 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  actionBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  renderingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 8, padding: 12,
  },
  renderingText: { color: COLORS.textMuted, fontSize: 13, flex: 1 },
  failedBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ef444411', borderRadius: 8, padding: 10,
  },
  failedText: { color: COLORS.danger, fontSize: 13, flex: 1 },
  metaSection: { gap: 6 },
  metaSectionTitle: { color: COLORS.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  metaLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 8 },
  metaValue: { color: COLORS.text, fontSize: 13, lineHeight: 19, flex: 1 },
  copyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  copyIcon: { padding: 2 },
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  hashtag: {
    backgroundColor: COLORS.primaryDim, color: COLORS.primary,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 12, fontWeight: '600',
  },
  discScore: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  discLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  discValue: { fontSize: 13, fontWeight: '700' },
  scriptSection: { gap: 6 },
  scriptText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
});
