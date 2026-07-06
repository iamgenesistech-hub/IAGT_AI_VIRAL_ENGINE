// app/(tabs)/avatar.tsx — Avatar creation + gallery screen.
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { getSession, saveSession } from '@/lib/storage';
import { uploadPhoto, uploadVoice, createAvatar, fetchAvatarGallery, fetchAvatarRequest, updateAffiliateProfile } from '@/lib/api';
import { AffiliateSession, AvatarGalleryItem, AvatarRequest, AttireSelection } from '@/lib/types';
import { COLORS } from '@/constants/config';

type Step = 'photo' | 'voice' | 'attire' | 'review' | 'creating' | 'done';

const TOP_OPTIONS = ['dress-shirt', 'polo', 't-shirt', 'blouse', 'suit-jacket', 'hoodie'];
const BOTTOM_OPTIONS = ['dress-pants', 'slacks', 'jeans', 'skirt', 'shorts'];
const STYLE_OPTIONS = ['professional', 'casual', 'business-casual', 'athletic', 'elegant'];
const COLOR_OPTIONS = ['black', 'white', 'navy', 'grey', 'brown', 'blue', 'red'];

export default function AvatarScreen() {
  const [session, setSession] = useState<AffiliateSession | null>(null);
  const [step, setStep] = useState<Step>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [attire, setAttire] = useState<AttireSelection>({ usePhotoClothing: true });
  const [gallery, setGallery] = useState<AvatarGalleryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlayingId, setPreviewPlayingId] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getSession();
      setSession(s);
      if (s) loadGallery(s.affiliateCode);
    })();
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (previewSoundRef.current) {
        previewSoundRef.current.unloadAsync().catch(() => {});
        previewSoundRef.current = null;
      }
    };
  }, []);

  async function loadGallery(code: string) {
    try { setGallery(await fetchAvatarGallery(code)); } catch {}
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (session) await loadGallery(session.affiliateCode);
    setRefreshing(false);
  }, [session]);

  // ── Photo ────────────────────────────────────────────────────────────────────

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function uploadPhotoAndNext() {
    if (!photoUri) { Alert.alert('No photo', 'Please select or take a photo first.'); return; }
    setUploading(true);
    try {
      const url = await uploadPhoto(photoUri);
      setPhotoUrl(url);
      setStep('voice');
    } catch (e: unknown) {
      Alert.alert('Upload failed', (e as Error).message ?? 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  }

  // ── Voice ────────────────────────────────────────────────────────────────────

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
    } catch (e: unknown) {
      Alert.alert('Recording failed', (e as Error).message);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) setVoiceUri(uri);
  }

  async function uploadVoiceAndNext() {
    if (!voiceUri) { setStep('attire'); return; } // voice is optional
    setUploading(true);
    try {
      const url = await uploadVoice(voiceUri);
      setVoiceUrl(url);
      if (session) {
        const updatedProfile = await updateAffiliateProfile({
          affiliateCode: session.affiliateCode,
          profileId: session.profileId || session.affiliateCode,
          name: session.affiliateName,
          voiceFileUrl: url,
          pictureUrl: photoUrl || undefined,
          voiceId: session.voiceId || session.voiceCloneId || undefined,
          voiceCloneId: session.voiceCloneId || undefined,
        });
        const nextSession = {
          ...session,
          voiceFileUrl: url,
          profilePhotoUrl: session.profilePhotoUrl || photoUrl || undefined,
          voiceId: updatedProfile.voiceId || updatedProfile.voiceCloneId || session.voiceId,
          voiceCloneId: updatedProfile.voiceCloneId || session.voiceCloneId,
        };
        setSession(nextSession);
        await saveSession(nextSession);
      }
      setStep('attire');
    } catch (e: unknown) {
      Alert.alert('Upload failed', (e as Error).message ?? 'Voice upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function stopVoicePreview() {
    if (previewSoundRef.current) {
      await previewSoundRef.current.stopAsync().catch(() => {});
      await previewSoundRef.current.unloadAsync().catch(() => {});
      previewSoundRef.current = null;
    }
    setPreviewPlayingId(null);
    setPreviewLoading(false);
  }

  async function playVoicePreview(item: AvatarGalleryItem) {
    const previewUrl = item.voiceFileUrl || session?.voiceFileUrl || null;
    if (!previewUrl) {
      Alert.alert('No voice file', 'This avatar does not have a voice file to preview.');
      return;
    }
    if (previewLoading) return;
    if (previewPlayingId === item.requestId) {
      await stopVoicePreview();
      return;
    }

    setPreviewLoading(true);
    try {
      if (previewSoundRef.current) {
        await previewSoundRef.current.unloadAsync().catch(() => {});
        previewSoundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: previewUrl }, { shouldPlay: true });
      previewSoundRef.current = sound;
      setPreviewPlayingId(item.requestId);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPreviewPlayingId(null);
          setPreviewLoading(false);
          sound.unloadAsync().catch(() => {});
          previewSoundRef.current = null;
        }
      });
    } catch (error: unknown) {
      Alert.alert('Playback failed', (error as Error).message || 'Could not play the voice preview.');
    } finally {
      setPreviewLoading(false);
    }
  }

  // ── Attire ───────────────────────────────────────────────────────────────────

  function toggleUsePhoto() {
    setAttire(prev => ({ ...prev, usePhotoClothing: !prev.usePhotoClothing }));
  }

  // ── Create Avatar ─────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!session || !photoUrl) return;
    setCreating(true);
    setStep('creating');
    try {
      const req = await createAvatar({
        affiliateCode: session.affiliateCode,
        profileId: session.affiliateCode,
        name: session.affiliateName,
        photoUrl,
        voiceFileUrl: voiceUrl ?? undefined,
        attire: attire.usePhotoClothing ? { usePhotoClothing: true } : attire,
      });
      setPendingRequestId(req.requestId);
      // Poll until completed
      pollTimer.current = setInterval(async () => {
        try {
          const updated = await fetchAvatarRequest(req.requestId, session.affiliateCode);
          if (updated.status === 'completed') {
            clearInterval(pollTimer.current!);
            setStep('done');
            setCreating(false);
            await loadGallery(session.affiliateCode);
          } else if (updated.status === 'failed') {
            clearInterval(pollTimer.current!);
            setCreating(false);
            Alert.alert('Avatar creation failed', updated.error ?? 'Unknown error.');
            setStep('review');
          }

        } catch {}
      }, 8000);
    } catch (e: unknown) {
      setCreating(false);
      setStep('review');
      Alert.alert('Creation failed', (e as Error).message);
    }
  }

  async function assignAvatarPicture(item: AvatarGalleryItem) {
    if (!session) return;
    if (!item.photoUrl) {
      Alert.alert('No photo', 'This avatar does not have a photo URL to assign.');
      return;
    }
    try {
      const updatedProfile = await updateAffiliateProfile({
        affiliateCode: session.affiliateCode,
        profileId: session.profileId || session.affiliateCode,
        name: session.affiliateName,
        pictureUrl: item.photoUrl,
        voiceFileUrl: item.voiceFileUrl || voiceUrl || undefined,
      });
      const nextSession = {
        ...session,
        profilePhotoUrl: item.photoUrl,
        voiceFileUrl: item.voiceFileUrl || voiceUrl || session.voiceFileUrl,
        voiceId: updatedProfile.voiceId || updatedProfile.voiceCloneId || session.voiceId,
        voiceCloneId: updatedProfile.voiceCloneId || session.voiceCloneId,
      };
      setSession(nextSession);
      await saveSession(nextSession);
      Alert.alert('Profile picture updated', 'Your selected avatar photo is now assigned to the profile.');
    } catch (e: unknown) {
      Alert.alert('Update failed', (e as Error).message);
    }
  }

  async function assignAvatarVoice(item: AvatarGalleryItem) {
    if (!session) return;
    const voiceCloneId = item.avatar?.voiceCloneId || null;
    if (!voiceCloneId) {
      Alert.alert('No voice ID', 'This avatar does not have a usable voice clone ID.');
      return;
    }
    try {
      const updatedProfile = await updateAffiliateProfile({
        affiliateCode: session.affiliateCode,
        profileId: session.profileId || session.affiliateCode,
        name: session.affiliateName,
        voiceCloneId,
        voiceId: voiceCloneId,
        voiceFileUrl: voiceUrl || undefined,
      });
      const nextSession = {
        ...session,
        voiceId: updatedProfile.voiceId || updatedProfile.voiceCloneId || voiceCloneId,
        voiceCloneId: updatedProfile.voiceCloneId || voiceCloneId,
        voiceFileUrl: voiceUrl || session.voiceFileUrl,
      };
      setSession(nextSession);
      await saveSession(nextSession);
      Alert.alert('Voice ID updated', 'Your selected avatar voice is now assigned to the profile.');
    } catch (e: unknown) {
      Alert.alert('Update failed', (e as Error).message);
    }
  }

  function startOver() {
    setStep('photo');
    setPhotoUri(null);
    setPhotoUrl(null);
    setVoiceUri(null);
    setVoiceUrl(null);
    setAttire({ usePhotoClothing: true });
    setPendingRequestId(null);
    setCreating(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <Text style={styles.screenTitle}>AI Avatar</Text>

      {/* Step Indicators */}
      <View style={styles.steps}>
        {(['photo', 'voice', 'attire', 'review'] as Step[]).map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepDot, (step === s || (step === 'creating' && i <= 2) || step === 'done') && styles.stepDotActive]}>
              <Text style={styles.stepNum}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
          </View>
        ))}
      </View>

      {/* STEP: Photo */}
      {step === 'photo' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📸 Profile Photo</Text>
          <Text style={styles.cardSub}>This photo becomes your AI avatar. Use a clear, front-facing photo.</Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="person" size={60} color={COLORS.textDim} />
            </View>
          )}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={takePhoto} activeOpacity={0.8}>
              <Ionicons name="camera" size={18} color={COLORS.primary} />
              <Text style={styles.btnSecondaryText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={pickPhoto} activeOpacity={0.8}>
              <Ionicons name="images" size={18} color={COLORS.primary} />
              <Text style={styles.btnSecondaryText}>Library</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.btnPrimary, (!photoUri || uploading) && styles.btnDisabled]}
            onPress={uploadPhotoAndNext}
            disabled={!photoUri || uploading}
            activeOpacity={0.8}
          >
            {uploading ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.btnPrimaryText}>Next → Voice</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* STEP: Voice */}
      {step === 'voice' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎤 Voice Sample</Text>
          <Text style={styles.cardSub}>Record 30–60 seconds of natural speech. Your voice will be cloned for your AI avatar videos. (Optional — skip to use stock voice)</Text>
          <View style={styles.voiceScript}>
            <Text style={styles.voiceScriptLabel}>SUGGESTED SCRIPT</Text>
            <Text style={styles.voiceScriptText}>
              "Hi, I'm {session?.affiliateName}. I'm excited to be part of I AM GENESIS TECH. I believe in creating real value for people and building something that truly makes a difference. I'm here to serve with purpose, share great products honestly, and grow with integrity. Let's make an impact together."
            </Text>
          </View>
          {isRecording ? (
            <TouchableOpacity style={styles.recordingBtn} onPress={stopRecording} activeOpacity={0.8}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording… Tap to Stop</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btnPrimary} onPress={startRecording} activeOpacity={0.8}>
              <Ionicons name="mic" size={18} color="#000" />
              <Text style={styles.btnPrimaryText}>{voiceUri ? 'Re-Record' : 'Start Recording'}</Text>
            </TouchableOpacity>
          )}
          {voiceUri && !isRecording && (
            <View style={styles.voiceReady}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.voiceReadyText}>Voice sample ready</Text>
            </View>
          )}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep('photo')} activeOpacity={0.8}>
              <Text style={styles.btnSecondaryText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, { flex: 1 }, uploading && styles.btnDisabled]}
              onPress={uploadVoiceAndNext}
              disabled={uploading}
              activeOpacity={0.8}
            >
              {uploading ? <ActivityIndicator color="#000" size="small" /> : (
                <Text style={styles.btnPrimaryText}>{voiceUri ? 'Upload & Next →' : 'Skip → Attire'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP: Attire */}
      {step === 'attire' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👔 Attire</Text>
          <Text style={styles.cardSub}>Choose what your avatar wears, or use the clothing in your photo.</Text>
          <TouchableOpacity style={styles.checkRow} onPress={toggleUsePhoto} activeOpacity={0.8}>
            <View style={[styles.checkbox, attire.usePhotoClothing && styles.checkboxChecked]}>
              {attire.usePhotoClothing && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
            <Text style={styles.checkLabel}>Use clothing from my photo</Text>
          </TouchableOpacity>
          {!attire.usePhotoClothing && (
            <>
              <Text style={styles.fieldLabel}>OVERALL STYLE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {STYLE_OPTIONS.map(s => (
                  <TouchableOpacity key={s} style={[styles.chip, attire.overallStyle === s && styles.chipActive]} onPress={() => setAttire(prev => ({ ...prev, overallStyle: s }))} activeOpacity={0.8}>
                    <Text style={[styles.chipText, attire.overallStyle === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.fieldLabel}>TOP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {TOP_OPTIONS.map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, attire.top === t && styles.chipActive]} onPress={() => setAttire(prev => ({ ...prev, top: t }))} activeOpacity={0.8}>
                    <Text style={[styles.chipText, attire.top === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.fieldLabel}>TOP COLOR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {COLOR_OPTIONS.map(c => (
                  <TouchableOpacity key={c} style={[styles.chip, attire.topColor === c && styles.chipActive]} onPress={() => setAttire(prev => ({ ...prev, topColor: c }))} activeOpacity={0.8}>
                    <Text style={[styles.chipText, attire.topColor === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.fieldLabel}>BOTTOM</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {BOTTOM_OPTIONS.map(b => (
                  <TouchableOpacity key={b} style={[styles.chip, attire.bottom === b && styles.chipActive]} onPress={() => setAttire(prev => ({ ...prev, bottom: b }))} activeOpacity={0.8}>
                    <Text style={[styles.chipText, attire.bottom === b && styles.chipTextActive]}>{b}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setStep('voice')} activeOpacity={0.8}>
              <Text style={styles.btnSecondaryText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={() => setStep('review')} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Review →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP: Review */}
      {step === 'review' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✅ Review & Create</Text>
          <View style={styles.reviewRow}>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.reviewPhoto} />}
            <View style={styles.reviewInfo}>
              <Text style={styles.reviewName}>{session?.affiliateName}</Text>
              <Text style={styles.reviewDetail}>{voiceUrl ? '🎤 Voice clone queued' : '🔊 Stock voice'}</Text>
              <Text style={styles.reviewDetail}>👔 {attire.usePhotoClothing ? 'Photo clothing' : (attire.overallStyle ?? 'Custom')}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate} activeOpacity={0.8}>
            <Ionicons name="sparkles" size={18} color="#000" />
            <Text style={styles.btnPrimaryText}>Create My Avatar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => setStep('photo')} activeOpacity={0.8}>
            <Text style={styles.btnGhostText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP: Creating */}
      {step === 'creating' && (
        <View style={styles.card}>
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginBottom: 16 }} />
          <Text style={styles.cardTitle}>Creating Your Avatar…</Text>
          <Text style={styles.cardSub}>This takes 1–3 minutes. Your avatar is being generated by AI. We'll show it in your gallery when it's ready.</Text>
        </View>
      )}

      {/* STEP: Done */}
      {step === 'done' && (
        <View style={styles.card}>
          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>🎉</Text>
          <Text style={styles.cardTitle}>Avatar Created!</Text>
          <Text style={styles.cardSub}>Your AI avatar is ready. You can now generate product videos using your avatar below.</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={startOver} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>Create Another</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>MY AVATARS</Text>
          {gallery.map(item => (
            <View key={item.requestId} style={styles.galleryCard}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.galleryPhoto} />
              ) : (
                <View style={[styles.galleryPhoto, styles.galleryPhotoPlaceholder]}>
                  <Ionicons name="person" size={24} color={COLORS.textDim} />
                </View>
              )}
              <View style={styles.galleryInfo}>
                <Text style={styles.galleryName}>{item.name}</Text>
                <View style={[styles.statusBadge, item.status === 'completed' ? styles.badgeGreen : item.status === 'failed' ? styles.badgeRed : styles.badgeYellow]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
                {item.voiceCloneStatus && item.voiceCloneStatus !== 'none' && (
                  <Text style={styles.galleryMeta}>🎤 Voice: {item.voiceCloneStatus}</Text>
                )}
                {item.productTitle && <Text style={styles.galleryMeta}>{item.productTitle}</Text>}
                <View style={styles.galleryActions}>
                  <TouchableOpacity
                    style={[styles.galleryActionBtn, !item.photoUrl && styles.galleryActionBtnDisabled]}
                    onPress={() => assignAvatarPicture(item)}
                    disabled={!item.photoUrl}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.galleryActionText}>Assign Picture</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.galleryActionBtn,
                      (!item.voiceFileUrl && !session?.voiceFileUrl) && styles.galleryActionBtnDisabled,
                    ]}
                    onPress={() => playVoicePreview(item)}
                    disabled={!item.voiceFileUrl && !session?.voiceFileUrl}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.galleryActionText}>
                      {previewPlayingId === item.requestId ? 'Stop Voice' : 'Play Voice'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.galleryActionBtn, !(item.avatar?.voiceCloneId) && styles.galleryActionBtnDisabled]}
                    onPress={() => assignAvatarVoice(item)}
                    disabled={!item.avatar?.voiceCloneId}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.galleryActionText}>Assign Voice ID</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
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
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepNum: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  stepLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '600' },
  stepLabelActive: { color: COLORS.primary },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 20, marginBottom: 20,
  },
  cardTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  cardSub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  photoPreview: {
    width: '100%', height: 220, borderRadius: 12,
    marginBottom: 16, resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: '100%', height: 220, borderRadius: 12,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnPrimary: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  btnPrimaryText: { color: '#000', fontWeight: '900', fontSize: 15 },
  btnSecondary: {
    flex: 1, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  btnSecondaryText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  btnGhost: { paddingVertical: 12, alignItems: 'center' },
  btnGhostText: { color: COLORS.textMuted, fontSize: 13 },
  btnDisabled: { opacity: 0.4 },
  voiceScript: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  voiceScriptLabel: { color: COLORS.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6 },
  voiceScriptText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  recordingBtn: {
    backgroundColor: '#ef444422', borderWidth: 1, borderColor: COLORS.danger,
    borderRadius: 12, paddingVertical: 14, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.danger },
  recordingText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  voiceReady: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  voiceReadyText: { color: COLORS.success, fontSize: 13, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6, marginTop: 12 },
  chipScroll: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#000' },
  reviewRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 16 },
  reviewPhoto: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: COLORS.primary },
  reviewInfo: { flex: 1, gap: 4 },
  reviewName: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  reviewDetail: { color: COLORS.textMuted, fontSize: 13 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10, marginTop: 4 },
  galleryCard: {
    backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, flexDirection: 'row', padding: 12, gap: 12, marginBottom: 10,
  },
  galleryPhoto: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: COLORS.border },
  galleryPhotoPlaceholder: { backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  galleryInfo: { flex: 1, gap: 4 },
  galleryName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  galleryMeta: { color: COLORS.textMuted, fontSize: 12 },
  galleryActions: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  galleryActionBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryDim,
  },
  galleryActionBtnDisabled: { opacity: 0.4 },
  galleryActionText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeGreen: { backgroundColor: '#16a34a33' },
  badgeYellow: { backgroundColor: '#f59e0b33' },
  badgeRed: { backgroundColor: '#ef444433' },
  statusText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
});
