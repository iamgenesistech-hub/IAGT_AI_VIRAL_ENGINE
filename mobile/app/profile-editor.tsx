import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession, saveSession } from '@/lib/storage';
import { fetchAffiliateProfile, fetchAvatarGallery, updateAffiliateProfile } from '@/lib/api';
import { AffiliateProfile, AffiliateSession, AvatarGalleryItem } from '@/lib/types';
import { COLORS } from '@/constants/config';

export default function ProfileEditorScreen() {
  const router = useRouter();
  const [session, setSession] = useState<AffiliateSession | null>(null);
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [gallery, setGallery] = useState<AvatarGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningPictureId, setAssigningPictureId] = useState<string | null>(null);
  const [assigningVoiceId, setAssigningVoiceId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const syncSessionProfile = useCallback(async (baseSession: AffiliateSession, nextProfile: AffiliateProfile) => {
    const mergedSession = {
      ...baseSession,
      profileId: nextProfile.profileId || baseSession.profileId || baseSession.affiliateCode,
      profilePhotoUrl: nextProfile.profilePhotoUrl || nextProfile.pictureUrl || baseSession.profilePhotoUrl,
      voiceFileUrl: nextProfile.voiceFileUrl || baseSession.voiceFileUrl,
      voiceId: nextProfile.voiceId || nextProfile.voiceCloneId || baseSession.voiceId,
      voiceCloneId: nextProfile.voiceCloneId || baseSession.voiceCloneId,
    };
    setSession(mergedSession);
    await saveSession(mergedSession);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const currentSession = await getSession();
      if (!currentSession) {
        router.replace('/');
        return;
      }
      setSession(currentSession);

      const [profileData, galleryData] = await Promise.all([
        fetchAffiliateProfile(currentSession.affiliateCode),
        fetchAvatarGallery(currentSession.affiliateCode),
      ]);
      setProfile(profileData);
      setGallery(galleryData);
      await syncSessionProfile(currentSession, profileData);
    } catch (e: unknown) {
      Alert.alert('Load failed', (e as Error).message || 'Could not load profile editor data.');
    } finally {
      setLoading(false);
    }
  }, [router, syncSessionProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const currentVoiceUrl = profile?.voiceFileUrl || session?.voiceFileUrl || null;

  async function stopVoicePreview() {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setPreviewPlaying(false);
    setPreviewLoading(false);
  }

  async function playVoicePreview() {
    if (!currentVoiceUrl) {
      Alert.alert('No voice file', 'There is no voice file available to preview.');
      return;
    }
    if (previewLoading) return;
    if (previewPlaying) {
      await stopVoicePreview();
      return;
    }

    setPreviewLoading(true);
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync({ uri: currentVoiceUrl }, { shouldPlay: true });
      soundRef.current = sound;
      setPreviewPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPreviewPlaying(false);
          setPreviewLoading(false);
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
    } catch (error: unknown) {
      Alert.alert('Playback failed', (error as Error).message || 'Could not play the voice preview.');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function assignAvatarPicture(item: AvatarGalleryItem) {
    if (!session) return;
    if (!item.photoUrl) {
      Alert.alert('No photo', 'This avatar does not include a photo URL.');
      return;
    }
    setAssigningPictureId(item.requestId);
    try {
      const updatedProfile = await updateAffiliateProfile({
        affiliateCode: session.affiliateCode,
        profileId: session.profileId || session.affiliateCode,
        name: session.affiliateName,
        pictureUrl: item.photoUrl,
        voiceFileUrl: item.voiceFileUrl || profile?.voiceFileUrl || undefined,
        voiceCloneId: profile?.voiceCloneId || profile?.voiceId || undefined,
        voiceId: profile?.voiceId || profile?.voiceCloneId || undefined,
      });
      setProfile(updatedProfile);
      await syncSessionProfile(session, updatedProfile);
      Alert.alert('Profile updated', 'This avatar photo is now your profile picture.');
    } catch (e: unknown) {
      Alert.alert('Update failed', (e as Error).message || 'Could not assign profile picture.');
    } finally {
      setAssigningPictureId(null);
    }
  }

  async function assignAvatarVoice(item: AvatarGalleryItem) {
    if (!session) return;
    const selectedVoiceCloneId = item.avatar?.voiceCloneId || null;
    if (!selectedVoiceCloneId) {
      Alert.alert('No voice ID', 'This avatar does not include a voice clone ID.');
      return;
    }
    setAssigningVoiceId(item.requestId);
    try {
      const updatedProfile = await updateAffiliateProfile({
        affiliateCode: session.affiliateCode,
        profileId: session.profileId || session.affiliateCode,
        name: session.affiliateName,
        pictureUrl: profile?.pictureUrl || profile?.profilePhotoUrl || undefined,
        voiceCloneId: selectedVoiceCloneId,
        voiceId: selectedVoiceCloneId,
        voiceFileUrl: item.voiceFileUrl || profile?.voiceFileUrl || undefined,
      });
      setProfile(updatedProfile);
      await syncSessionProfile(session, updatedProfile);
      Alert.alert('Profile updated', 'This avatar voice ID is now assigned to your profile.');
    } catch (e: unknown) {
      Alert.alert('Update failed', (e as Error).message || 'Could not assign voice ID.');
    } finally {
      setAssigningVoiceId(null);
    }
  }

  const selectedPictureUrl = profile?.pictureUrl || profile?.profilePhotoUrl || null;
  const selectedVoiceId = profile?.voiceId || profile?.voiceCloneId || null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Profile Editor</Text>
      <Text style={styles.subtitle}>
        Choose the exact avatar record for your profile picture and voice ID.
      </Text>

      <View style={styles.currentCard}>
        <Text style={styles.currentTitle}>Current Profile Assignment</Text>
        <View style={styles.currentRow}>
          {selectedPictureUrl ? (
            <Image source={{ uri: selectedPictureUrl }} style={styles.currentPhoto} />
          ) : (
            <View style={styles.currentPhotoPlaceholder}>
              <Ionicons name="person" size={22} color={COLORS.textDim} />
            </View>
          )}
          <View style={styles.currentInfo}>
            <Text style={styles.currentLabel}>Picture: {selectedPictureUrl ? 'Assigned' : 'Not assigned'}</Text>
            <Text style={styles.currentLabel}>Voice ID: {selectedVoiceId || 'Not assigned'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.previewButton, (!currentVoiceUrl || previewLoading) && styles.disabledButton]}
          onPress={playVoicePreview}
          disabled={!currentVoiceUrl || previewLoading}
          activeOpacity={0.8}
        >
          <Ionicons name={previewPlaying ? 'stop-circle' : 'play-circle'} size={18} color={COLORS.text} />
          <Text style={styles.previewButtonText}>
            {previewLoading ? 'Loading Preview…' : previewPlaying ? 'Stop Voice Preview' : 'Play Voice Preview'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading avatar records…</Text>
        </View>
      ) : null}

      {!loading && gallery.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="images-outline" size={28} color={COLORS.textDim} />
          <Text style={styles.emptyTitle}>No avatar records yet</Text>
          <Text style={styles.emptyText}>Create an avatar first, then return here to assign it to your profile.</Text>
        </View>
      ) : null}

      {!loading && gallery.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>AVATAR RECORDS</Text>
          {gallery.map((item) => {
            const recordVoiceCloneId = item.avatar?.voiceCloneId || null;
            const pictureAssigned = Boolean(selectedPictureUrl && selectedPictureUrl === item.photoUrl);
            const voiceAssigned = Boolean(selectedVoiceId && recordVoiceCloneId && selectedVoiceId === recordVoiceCloneId);
            return (
              <View key={item.requestId} style={styles.recordCard}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.recordPhoto} />
                ) : (
                  <View style={[styles.recordPhoto, styles.recordPhotoPlaceholder]}>
                    <Ionicons name="person" size={24} color={COLORS.textDim} />
                  </View>
                )}
                <View style={styles.recordInfo}>
                  <Text style={styles.recordName}>{item.name}</Text>
                  <Text style={styles.recordMeta}>Request: {item.requestId}</Text>
                  <Text style={styles.recordMeta}>Status: {item.status}</Text>
                  <Text style={styles.recordMeta}>Voice ID: {recordVoiceCloneId || 'Not available'}</Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, pictureAssigned && styles.assignedButton, assigningPictureId === item.requestId && styles.disabledButton]}
                      onPress={() => assignAvatarPicture(item)}
                      disabled={assigningPictureId === item.requestId}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>
                        {assigningPictureId === item.requestId ? 'Assigning…' : pictureAssigned ? 'Picture Assigned' : 'Assign Picture'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        (!recordVoiceCloneId || assigningVoiceId === item.requestId) && styles.disabledButton,
                        voiceAssigned && styles.assignedButton,
                      ]}
                      onPress={() => assignAvatarVoice(item)}
                      disabled={!recordVoiceCloneId || assigningVoiceId === item.requestId}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonText}>
                        {assigningVoiceId === item.requestId ? 'Assigning…' : voiceAssigned ? 'Voice Assigned' : 'Assign Voice ID'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  headerRow: { marginBottom: 8 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  backText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '900', marginBottom: 6 },
  subtitle: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  currentCard: {
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 18,
  },
  currentTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800', marginBottom: 10 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentPhoto: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: COLORS.primary },
  currentPhotoPlaceholder: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
  },
  currentInfo: { flex: 1, gap: 4 },
  currentLabel: { color: COLORS.textMuted, fontSize: 12 },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  previewButtonText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  loadingCard: {
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', gap: 10, paddingVertical: 26, marginBottom: 16,
  },
  loadingText: { color: COLORS.textMuted, fontSize: 13 },
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', gap: 8, padding: 24,
  },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  emptyText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginTop: 8 },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  recordPhoto: { width: 74, height: 74, borderRadius: 10 },
  recordPhotoPlaceholder: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  recordInfo: { flex: 1 },
  recordName: { color: COLORS.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  recordMeta: { color: COLORS.textMuted, fontSize: 11, marginBottom: 2 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + '66',
    backgroundColor: COLORS.primaryDim,
    paddingVertical: 10,
    alignItems: 'center',
  },
  assignedButton: {
    borderColor: COLORS.success + '66',
    backgroundColor: COLORS.success + '22',
  },
  disabledButton: { opacity: 0.45 },
  actionButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
});
