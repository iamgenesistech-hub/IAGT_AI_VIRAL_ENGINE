/**
 * BillingDashboard.tsx
 * 
 * Mobile Billing & Subscription Management Screen
 * ──────────────────────────────────────────────────────
 * Features:
 * - Current subscription tier display
 * - Usage metrics (renders used, avatars created)
 * - Upgrade/downgrade options
 * - Billing history
 * - Payout status (for affiliates)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../lib/authStore';
import { api } from '../lib/api';
import { useRealtimeUpdates } from '../lib/realtimeStore';

interface BillingData {
  tier: 'FREE' | 'CREATOR' | 'ELITE';
  renewalDate: string;
  usageMetrics: {
    rendersUsed: number;
    rendersLimit: number;
    avatarsCreated: number;
  };
  payoutInfo?: {
    balance: number;
    lastPayout: string;
    nextPayoutDate: string;
  };
}

export const BillingDashboard: React.FC = () => {
  const { user, role } = useAuth();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const { subscribe } = useRealtimeUpdates();

  useEffect(() => {
    fetchBillingData();

    // Subscribe to billing updates
    const unsubscribe = subscribe('billing', (event: any) => {
      if (event.type === 'subscription:activated' || event.type === 'payout:processed') {
        fetchBillingData();
      }
    });

    return unsubscribe;
  }, [user]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/billing/subscription');
      setBillingData(response.data);
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
      Alert.alert('Error', 'Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'CREATOR' | 'ELITE') => {
    try {
      setUpgrading(true);

      // Create checkout session
      const response = await api.post('/api/billing/checkout', { tier });
      const { checkoutUrl } = response.data;

      // In production: Open Stripe checkout URL in WebView
      Alert.alert('Upgrade Plan', `Redirecting to checkout for ${tier} plan...`);

      // navigate({ name: 'CheckoutWebView', params: { url: checkoutUrl } });
    } catch (err) {
      Alert.alert('Error', 'Failed to start upgrade process');
    } finally {
      setUpgrading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ELITE': return '#FFD700';
      case 'CREATOR': return '#4CAF50';
      case 'FREE': return '#999';
      default: return '#666';
    }
  };

  const getTierFeatures = (tier: string) => {
    const features: Record<string, string[]> = {
      FREE: [
        '2 renders/month',
        '1 custom avatar',
        'Standard quality',
        'Community support',
      ],
      CREATOR: [
        '20 renders/month',
        '5 custom avatars',
        'HD quality',
        'Email support',
        'Priority queue',
      ],
      ELITE: [
        'Unlimited renders',
        'Unlimited avatars',
        '4K quality',
        'Priority support',
        'API access',
        'White-label option',
      ],
    };
    return features[tier] || [];
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading billing information...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Current Tier */}
      <View style={[styles.tierCard, { borderTopColor: getTierColor(billingData?.tier || 'FREE') }]}>
        <Text style={styles.sectionTitle}>Current Plan</Text>
        <Text style={[styles.tierName, { color: getTierColor(billingData?.tier || 'FREE') }]}>
          {billingData?.tier} Plan
        </Text>

        {billingData?.renewalDate && (
          <Text style={styles.renewalDate}>
            Renews: {new Date(billingData.renewalDate).toLocaleDateString()}
          </Text>
        )}

        {/* Usage Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Renders Used</Text>
            <Text style={styles.metricValue}>
              {billingData?.usageMetrics.rendersUsed}/{billingData?.usageMetrics.rendersLimit || '∞'}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      (billingData?.usageMetrics.rendersUsed || 0) / (billingData?.usageMetrics.rendersLimit || 1) * 100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Custom Avatars</Text>
            <Text style={styles.metricValue}>
              {billingData?.usageMetrics.avatarsCreated || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Available Plans */}
      <Text style={styles.sectionTitle}>Upgrade Your Plan</Text>

      {['CREATOR', 'ELITE'].map(tier => {
        if (billingData?.tier === tier) return null; // Don't show current tier

        return (
          <View key={tier} style={styles.planCard}>
            <Text style={styles.planName}>{tier}</Text>
            <Text style={styles.planPrice}>
              ${tier === 'CREATOR' ? '9.99' : '49.99'}/month
            </Text>

            {/* Features */}
            {getTierFeatures(tier).map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.upgradeButton, upgrading && styles.upgradeButtonDisabled]}
              onPress={() => handleUpgrade(tier as 'CREATOR' | 'ELITE')}
              disabled={upgrading}
            >
              <Text style={styles.upgradeButtonText}>
                {upgrading ? 'Processing...' : 'Upgrade Now'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Affiliate Payout Info */}
      {role === 'AFFILIATE' && billingData?.payoutInfo && (
        <View style={styles.payoutCard}>
          <Text style={styles.sectionTitle}>Affiliate Earnings</Text>

          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Balance</Text>
            <Text style={styles.payoutValue}>
              ${(billingData.payoutInfo.balance / 100).toFixed(2)}
            </Text>
          </View>

          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Last Payout</Text>
            <Text style={styles.payoutValue}>
              {billingData.payoutInfo.lastPayout
                ? new Date(billingData.payoutInfo.lastPayout).toLocaleDateString()
                : 'Pending'}
            </Text>
          </View>

          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Next Payout</Text>
            <Text style={styles.payoutValue}>
              {billingData.payoutInfo.nextPayoutDate}
            </Text>
          </View>

          <Text style={styles.payoutNote}>
            Payouts are processed every Friday for balances over $100.
          </Text>
        </View>
      )}

      {/* FAQ Section */}
      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>FAQ</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I change my plan anytime?</Text>
          <Text style={styles.faqAnswer}>
            Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Do you offer refunds?</Text>
          <Text style={styles.faqAnswer}>
            We offer refunds within 14 days of purchase. Contact support for assistance.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>What payment methods are accepted?</Text>
          <Text style={styles.faqAnswer}>
            We accept all major credit cards (Visa, MasterCard, American Express) and digital wallets.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 16,
  },
  tierCard: {
    backgroundColor: '#fff',
    borderTopWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tierName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  renewalDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  metricsContainer: {
    gap: 12,
  },
  metricItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  planPrice: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: '700',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
  upgradeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  upgradeButtonDisabled: {
    opacity: 0.5,
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
  payoutCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
  },
  payoutLabel: {
    fontSize: 14,
    color: '#555',
  },
  payoutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  payoutNote: {
    fontSize: 12,
    color: '#555',
    marginTop: 12,
    fontStyle: 'italic',
  },
  faqSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  faqAnswer: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

export default BillingDashboard;
