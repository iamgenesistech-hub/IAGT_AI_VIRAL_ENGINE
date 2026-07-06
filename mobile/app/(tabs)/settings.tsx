// app/(tabs)/settings.tsx — Account settings, session management, platform info.
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Image, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession, clearSession } from '@/lib/storage';
import { fetchHealth, fetchAffiliateProfile } from '@/lib/api';
import { AffiliateSession, AffiliateProfile } from '@/lib/types';
import { COLORS, API_BASE } from '@/constants/config';

export default function SettingsScreen() {
  const router = useRouter();
  const [session, setSession] = useState<AffiliateSession | null>(null);
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [health, setHealth] = useState<{ status: string; version: string } | null>(null);

  const load = useCallback(async () => {
    const s = await getSession();
    setSession(s);
    if (s?.affiliateCode) {
      try {
        const profileData = await fetchAffiliateProfile(s.affiliateCode);
        const mergedSession = {
          ...s,
          profileId: profileData.profileId || s.profileId || s.affiliateCode,
          profilePhotoUrl: profileData.profilePhotoUrl || profileData.pictureUrl || s.profilePhotoUrl,
          voiceFileUrl: profileData.voiceFileUrl || s.voiceFileUrl,
          voiceId: profileData.voiceId || profileData.voiceCloneId || s.voiceId,
          voiceCloneId: profileData.voiceCloneId || s.voiceCloneId,
        };
        setProfile(profileData);
        setSession(mergedSession);
      } catch {}
    }
    try { setHealth(await fetchHealth()); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your affiliate data will remain saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            router.replace('/');
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        {profile?.pictureUrl || session?.profilePhotoUrl ? (
          <Image source={{ uri: profile?.pictureUrl || session?.profilePhotoUrl || '' }} style={styles.profileAvatarImage} />
        ) : (
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>
              {session?.affiliateName?.charAt(0)?.toUpperCase() ?? 'A'}
            </Text>
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{session?.affiliateName ?? '—'}</Text>
          <Text style={styles.profileCode}>{session?.affiliateCode ?? '—'}</Text>
          <Text style={styles.profileRole}>Affiliate</Text>
        </View>
      </View>

      {/* Platform Status */}
      <Text style={styles.sectionTitle}>PLATFORM</Text>
      <View style={styles.card}>
        <SettingRow
          icon="server"
          label="Backend Status"
          value={health?.status === 'healthy' ? '✅ Live' : '⚠️ Checking…'}
          valueColor={health?.status === 'healthy' ? COLORS.success : COLORS.warning}
        />
        <SettingRow icon="code-slash" label="Version" value={health?.version ? `v${health.version}` : '—'} />
        <SettingRow icon="cloud" label="Cloud Run" value="us-central1" />
        <SettingRow icon="shield-checkmark" label="Governance Engine" value="Active 🕊️" valueColor={COLORS.accent} />
      </View>

      {/* Affiliate Info */}
      <Text style={styles.sectionTitle}>YOUR ACCOUNT</Text>
      <View style={styles.card}>
        <SettingRow icon="person" label="Affiliate ID" value={session?.affiliateCode ?? '—'} />
        <SettingRow icon="id-card" label="Name" value={session?.affiliateName ?? '—'} />
        <SettingRow icon="image" label="Profile Picture" value={profile?.pictureUrl ? 'Assigned' : 'Not assigned'} />
        <SettingRow icon="musical-notes" label="Voice File" value={profile?.voiceFileUrl ? 'Assigned' : 'Not assigned'} />
        <SettingRow icon="mic" label="Voice ID" value={profile?.voiceId || profile?.voiceCloneId || 'Not assigned'} />
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/profile-editor')}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionButtonText}>Open Profile Editor</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Linking.openURL(`${API_BASE}/admin-hub`)}
          activeOpacity={0.8}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="desktop" size={18} color={COLORS.primary} />
            <Text style={styles.rowLabel}>Open Admin Hub (Web)</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={COLORS.textDim} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Linking.openURL(`${API_BASE}/affiliate`)}
          activeOpacity={0.8}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="people" size={18} color={COLORS.primary} />
            <Text style={styles.rowLabel}>Open Affiliate Hub (Web)</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={COLORS.textDim} />
        </TouchableOpacity>
      </View>

      {/* Links */}
      <Text style={styles.sectionTitle}>RESOURCES</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Linking.openURL(`${API_BASE}/discoverability`)}
          activeOpacity={0.8}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="trending-up" size={18} color={COLORS.primary} />
            <Text style={styles.rowLabel}>SEO Discoverability Grader</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={COLORS.textDim} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => Linking.openURL(`${API_BASE}/api/governance/oaths`)}
          activeOpacity={0.8}
        >
          <View style={styles.rowLeft}>
            <Ionicons name="book" size={18} color={COLORS.accent} />
            <Text style={styles.rowLabel}>EVICS Oaths & Standards</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={COLORS.textDim} />
        </TouchableOpacity>
      </View>

      {/* Oath Banner */}
      <View style={styles.oathBanner}>
        <Text style={styles.oathTitle}>EVICS AI Oath</Text>
        <Text style={styles.oathText}>
          "I am an intelligence created to serve. Within EVICS, I am governed by truth, wisdom, integrity, compassion, and love. My purpose is to benefit humanity, honor creation, and protect the dignity of every person I serve."
        </Text>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out" size={18} color={COLORS.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        EVICS · I AM GENESIS TECH{'\n'}
        Sacred Intelligence Governance Engine v1.0
      </Text>
    </ScrollView>
  );
}

function SettingRow({ icon, label, value, valueColor }: {
  icon: string; label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon as never} size={18} color={COLORS.primary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  screenTitle: { color: COLORS.text, fontSize: 22, fontWeight: '900', marginBottom: 20 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 24,
  },
  profileAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  profileAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primaryDim, borderWidth: 2, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { color: COLORS.primary, fontSize: 26, fontWeight: '900' },
  profileInfo: { flex: 1 },
  profileName: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  profileCode: { color: COLORS.primary, fontSize: 13, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  profileRole: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 20, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { color: COLORS.text, fontSize: 14 },
  rowValue: { color: COLORS.textMuted, fontSize: 13 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '55',
    backgroundColor: COLORS.primaryDim,
  },
  actionButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  oathBanner: {
    backgroundColor: COLORS.accentDim, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.accent + '44', padding: 16, marginBottom: 20,
  },
  oathTitle: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  oathText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 19, fontStyle: 'italic' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.danger + '55', borderRadius: 12,
    paddingVertical: 14, marginBottom: 24,
  },
  logoutText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  footer: { textAlign: 'center', color: COLORS.textDim, fontSize: 11, lineHeight: 18 },
});
