// app/(tabs)/upgrade.tsx — Subscription plan selection and Stripe checkout.
import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getSession } from '@/lib/storage';
import { fetchPlan, fetchAllPlans, openCheckout, openBillingPortal, PlanInfo, PlanDef } from '@/lib/billing';
import { COLORS } from '@/constants/config';

export default function UpgradeScreen() {
  const [affiliateCode, setAffiliateCode] = useState('');
  const [currentPlan, setCurrentPlan] = useState<PlanInfo | null>(null);
  const [plans, setPlans] = useState<PlanDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  async function load(code?: string) {
    setLoading(true);
    try {
      const c = code || affiliateCode;
      const [planDefs, planInfo] = await Promise.all([
        fetchAllPlans(),
        c ? fetchPlan(c) : Promise.resolve(null),
      ]);
      setPlans(planDefs);
      if (planInfo) setCurrentPlan(planInfo);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const s = await getSession();
      if (s?.affiliateCode) {
        setAffiliateCode(s.affiliateCode);
        await load(s.affiliateCode);
      } else {
        await load();
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (affiliateCode) load(affiliateCode);
    }, [affiliateCode])
  );

  async function handleUpgrade(planId: string) {
    if (planId === 'free') return;
    if (!affiliateCode) {
      Alert.alert('Sign In Required', 'Please sign in to upgrade your plan.');
      return;
    }
    setCheckingOut(planId);
    try {
      await openCheckout(affiliateCode, planId as 'creator' | 'elite');
    } catch (err: any) {
      Alert.alert(
        'Checkout',
        err.message || 'Stripe checkout is not yet configured. Your interest has been noted.',
        [{ text: 'OK' }]
      );
    }
    setCheckingOut(null);
  }

  async function handleManageSubscription() {
    if (!affiliateCode) return;
    try {
      await openBillingPortal(affiliateCode);
    } catch (err: any) {
      Alert.alert('Portal', err.message || 'Billing portal not available yet.');
    }
  }

  const PLAN_COLORS: Record<string, string> = {
    free: COLORS.textDim,
    creator: '#7C3AED',
    elite: '#D97706',
  };

  const currentPlanId = currentPlan?.planId || 'free';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Choose Your Plan</Text>
      <Text style={styles.subTitle}>
        Scale your affiliate reach. Every plan earns 100% of your commissions.
      </Text>

      {/* Current Plan Banner */}
      {currentPlan && (
        <View style={[styles.currentBanner, { borderColor: PLAN_COLORS[currentPlanId] }]}>
          <Ionicons name="checkmark-circle" size={18} color={PLAN_COLORS[currentPlanId]} />
          <Text style={[styles.currentBannerText, { color: PLAN_COLORS[currentPlanId] }]}>
            Current Plan: {currentPlan.plan.name}
          </Text>
          {currentPlanId !== 'free' && (
            <TouchableOpacity onPress={handleManageSubscription} style={styles.manageBtn}>
              <Text style={styles.manageBtnText}>Manage</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Usage Meter (free users) */}
      {currentPlan && currentPlanId === 'free' && (
        <View style={styles.usageMeter}>
          <Text style={styles.usageLabel}>
            Videos this month: {currentPlan.videosUsed} / {currentPlan.plan.videosPerMonth}
          </Text>
          <View style={styles.usageBar}>
            <View
              style={[
                styles.usageFill,
                {
                  width: `${Math.min(100, (currentPlan.videosUsed / (typeof currentPlan.plan.videosPerMonth === 'number' ? currentPlan.plan.videosPerMonth : 2)) * 100)}%`,
                  backgroundColor: currentPlan.videosUsed >= (typeof currentPlan.plan.videosPerMonth === 'number' ? currentPlan.plan.videosPerMonth : 2) ? '#EF4444' : COLORS.primary,
                },
              ]}
            />
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlanId;
          const accentColor = PLAN_COLORS[plan.id] || COLORS.primary;
          const isPopular = plan.id === 'creator';

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                isCurrentPlan && { borderColor: accentColor, borderWidth: 2 },
                isPopular && styles.popularCard,
              ]}
            >
              {isPopular && (
                <View style={[styles.popularBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: accentColor }]}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.priceLabel}</Text>
              </View>

              <View style={styles.planMeta}>
                <MetaItem icon="videocam" label={`${plan.videosPerMonth} videos/month`} />
                <MetaItem icon="person" label={`${plan.avatarsMax} avatar${plan.avatarsMax > 1 ? 's' : ''}`} />
                <MetaItem icon="mic" label={plan.voiceClone ? 'Your cloned voice' : 'Stock voice'} dim={!plan.voiceClone} />
                <MetaItem icon="logo-youtube" label={plan.watermark ? 'EVICS watermark on videos' : 'No watermark'} dim={plan.watermark} />
              </View>

              <View style={styles.featureList}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={14} color={accentColor} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              {isCurrentPlan ? (
                <View style={[styles.ctaBtn, { backgroundColor: accentColor + '22' }]}>
                  <Ionicons name="checkmark-circle" size={16} color={accentColor} />
                  <Text style={[styles.ctaBtnText, { color: accentColor }]}>Current Plan</Text>
                </View>
              ) : plan.id !== 'free' ? (
                <TouchableOpacity
                  style={[styles.ctaBtn, { backgroundColor: accentColor }]}
                  onPress={() => handleUpgrade(plan.id)}
                  disabled={checkingOut === plan.id}
                >
                  {checkingOut === plan.id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={16} color="#fff" />
                      <Text style={[styles.ctaBtnText, { color: '#fff' }]}>
                        Upgrade to {plan.name}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      )}

      {/* Commission Guarantee */}
      <View style={styles.guarantee}>
        <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
        <Text style={styles.guaranteeText}>
          You earn 100% of your affiliate commissions on every plan. Your subscription covers platform costs only.
        </Text>
      </View>

      {/* Referral Banner */}
      <View style={styles.referralBanner}>
        <Ionicons name="gift" size={18} color={COLORS.primary} />
        <Text style={styles.referralText}>
          Refer a friend and get 1 month free when they subscribe. Coming soon.
        </Text>
      </View>
    </ScrollView>
  );
}

function MetaItem({ icon, label, dim = false }: { icon: any; label: string; dim?: boolean }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={14} color={dim ? COLORS.textDim : COLORS.text} />
      <Text style={[styles.metaText, dim && { color: COLORS.textDim }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  screenTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  subTitle: { fontSize: 13, color: COLORS.textDim, marginBottom: 20, lineHeight: 18 },
  currentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    marginBottom: 14, borderWidth: 1,
  },
  currentBannerText: { flex: 1, fontWeight: '700', fontSize: 13 },
  manageBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.border, borderRadius: 6 },
  manageBtnText: { fontSize: 11, color: COLORS.text, fontWeight: '700' },
  usageMeter: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 16 },
  usageLabel: { fontSize: 12, color: COLORS.textDim, marginBottom: 8 },
  usageBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 3 },
  planCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
    position: 'relative', overflow: 'hidden',
  },
  popularCard: { borderWidth: 1, borderColor: '#7C3AED' },
  popularBadge: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 10, paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  popularBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planName: { fontSize: 18, fontWeight: '800' },
  planPrice: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  planMeta: { gap: 5, marginBottom: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: COLORS.text },
  featureList: { gap: 6, marginBottom: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 12, color: COLORS.textDim },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 12,
  },
  ctaBtnText: { fontWeight: '700', fontSize: 14 },
  guarantee: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 12,
  },
  guaranteeText: { flex: 1, fontSize: 12, color: COLORS.textDim, lineHeight: 17 },
  referralBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  referralText: { flex: 1, fontSize: 12, color: COLORS.textDim, lineHeight: 17 },
});
