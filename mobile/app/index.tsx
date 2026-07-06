// app/index.tsx — Login / Affiliate ID entry screen.
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveSession } from '@/lib/storage';
import { fetchHealth, fetchAffiliateProfile } from '@/lib/api';
import { COLORS } from '@/constants/config';

export default function LoginScreen() {
  const router = useRouter();
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateName, setAffiliateName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const code = affiliateCode.trim().toUpperCase();
    const name = affiliateName.trim();
    if (!code) { Alert.alert('Enter your Affiliate ID', 'Your affiliate ID is required to continue.'); return; }
    if (!name) { Alert.alert('Enter your name', 'Your name helps personalize your AI avatar.'); return; }

    setLoading(true);
    try {
      // Verify backend is reachable
      await fetchHealth();
      const profile = await fetchAffiliateProfile(code);
      await saveSession({
        affiliateCode: code,
        affiliateName: name,
        profileId: profile.profileId || code,
        profilePhotoUrl: profile.profilePhotoUrl || profile.pictureUrl || undefined,
        voiceFileUrl: profile.voiceFileUrl || undefined,
        voiceId: profile.voiceId || profile.voiceCloneId || undefined,
        voiceCloneId: profile.voiceCloneId || undefined,
      });
      router.replace('/(tabs)');
    } catch (e: unknown) {
      Alert.alert('Connection Error', 'Could not reach the EVICS platform. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoRing}>
            <Text style={styles.logoText}>E</Text>
          </View>
          <Text style={styles.brand}>EVICS</Text>
          <Text style={styles.tagline}>ELITE VIRAL INTELLIGENCE CONTROL SYSTEM</Text>
          <Text style={styles.byline}>by I AM GENESIS TECH</Text>
        </View>

        {/* Oath */}
        <View style={styles.oathCard}>
          <Text style={styles.oathTitle}>EVICS Affiliate Oath</Text>
          <Text style={styles.oathText}>
            "I enter this platform with purpose, humility, and responsibility. I will use these tools to grow with integrity, serve with wisdom, and create value that blesses more than myself."
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.label}>AFFILIATE ID</Text>
          <TextInput
            style={styles.input}
            value={affiliateCode}
            onChangeText={setAffiliateCode}
            placeholder="e.g. ROLAND787"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            value={affiliateName}
            onChangeText={setAffiliateName}
            placeholder="e.g. Roland Simons"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginBtnText}>{loading ? 'Connecting…' : 'Enter Platform'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Governed by truth, integrity, dignity, and love.{'\n'}
          Sacred Intelligence Governance Engine active.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.bg },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 28 },
  logoRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 2, borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  logoText: { fontSize: 36, fontWeight: '900', color: COLORS.primary },
  brand: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: 6 },
  tagline: { fontSize: 10, color: COLORS.primary, letterSpacing: 2, marginTop: 4, textAlign: 'center' },
  byline: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  oathCard: {
    backgroundColor: COLORS.accentDim,
    borderWidth: 1, borderColor: COLORS.accent,
    borderRadius: 12, padding: 16, marginBottom: 28,
  },
  oathTitle: { color: COLORS.accent, fontWeight: '700', fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  oathText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  form: { gap: 8, marginBottom: 24 },
  label: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 2 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14,
    color: COLORS.text, fontSize: 16, marginBottom: 12,
  },
  loginBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  footer: { textAlign: 'center', color: COLORS.textDim, fontSize: 11, lineHeight: 18 },
});
