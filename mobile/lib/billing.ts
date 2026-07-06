// mobile/lib/billing.ts — Stripe billing API helpers for Expo app
import { Linking } from 'react-native';
import { API_BASE } from '@/constants/config';
import { getSession } from '@/lib/storage';

export interface PlanInfo {
  planId: 'free' | 'creator' | 'elite';
  plan: {
    id: string;
    name: string;
    price: number;
    videosPerMonth: number | 'Unlimited';
    avatarsMax: number;
    voiceClone: boolean;
    watermark: boolean;
    features: string[];
  };
  videosUsed: number;
  videosRemaining: number | typeof Infinity;
  canGenerateVideo: boolean;
  subscriptionStatus: string;
}

export interface PlanDef {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  videosPerMonth: number | string;
  avatarsMax: number;
  voiceClone: boolean;
  watermark: boolean;
  features: string[];
  stripeConfigured: boolean;
}

export async function fetchPlan(affiliateCode: string): Promise<PlanInfo> {
  const res = await fetch(`${API_BASE}/api/billing/plan?affiliateCode=${encodeURIComponent(affiliateCode)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch plan');
  return data as PlanInfo;
}

export async function fetchAllPlans(): Promise<PlanDef[]> {
  const res = await fetch(`${API_BASE}/api/billing/plans`);
  const data = await res.json();
  return data.plans || [];
}

export async function openCheckout(affiliateCode: string, planId: 'creator' | 'elite'): Promise<void> {
  const res = await fetch(`${API_BASE}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ affiliateCode, planId }),
  });
  const data = await res.json();
  if (data.url) {
    await Linking.openURL(data.url);
  } else if (data.message) {
    throw new Error(data.message);
  } else {
    throw new Error('Checkout not available. Contact support.');
  }
}

export async function openBillingPortal(affiliateCode: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/billing/portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ affiliateCode }),
  });
  const data = await res.json();
  if (data.url) {
    await Linking.openURL(data.url);
  } else {
    throw new Error(data.message || 'Portal not available');
  }
}
