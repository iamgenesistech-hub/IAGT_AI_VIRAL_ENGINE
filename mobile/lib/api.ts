// lib/api.ts — All calls to the live EVICS Cloud Run backend.
import { API_BASE } from '@/constants/config';
import {
  AvatarGalleryItem,
  AffiliateProfile,
  AvatarRequest,
  AttireSelection,
  Product,
  VideoJob,
  DiscoverabilityResult,
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || `GET ${path} failed (${res.status})`);
  return data as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || `POST ${path} failed (${res.status})`);
  return data as T;
}

function normalizeVideoStatus(rawStatus: unknown): VideoJob['status'] {
  const status = String(rawStatus || '').toLowerCase();
  if (status === 'completed' || status === 'complete' || status === 'done') return 'completed';
  if (status === 'failed' || status === 'error' || status === 'enqueue_failed') return 'failed';
  return 'rendering';
}

function normalizeVideoJob(raw: any): VideoJob {
  const resolvedStatus = normalizeVideoStatus(raw?.status);
  const resolvedVideoJobId = String(raw?.videoJobId || raw?.jobId || '');
  const resolvedCreatedAt = raw?.createdAt || raw?.queuedAt || new Date().toISOString();
  return {
    ...raw,
    videoJobId: resolvedVideoJobId,
    status: resolvedStatus,
    createdAt: resolvedCreatedAt,
  } as VideoJob;
}

async function postJson(path: string, body: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ── File upload (multipart FormData) ─────────────────────────────────────────

export async function uploadPhoto(localUri: string): Promise<string> {
  const formData = new FormData();
  const filename = localUri.split('/').pop() ?? 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  formData.append('photo', {
    uri: localUri,
    name: filename,
    type: mimeMap[ext] ?? 'image/jpeg',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}/api/affiliate/avatar/upload-photo`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error ?? 'Photo upload failed');
  return data.photoUrl as string;
}

export async function uploadVoice(localUri: string): Promise<string> {
  const formData = new FormData();
  const filename = localUri.split('/').pop() ?? 'voice.m4a';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'm4a';
  const mimeMap: Record<string, string> = { m4a: 'audio/m4a', mp4: 'audio/mp4', webm: 'audio/webm', wav: 'audio/wav', aac: 'audio/aac', mp3: 'audio/mpeg' };
  formData.append('voice', {
    uri: localUri,
    name: filename,
    type: mimeMap[ext] ?? 'audio/m4a',
  } as unknown as Blob);

  const res = await fetch(`${API_BASE}/api/affiliate/avatar/upload-voice`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error ?? 'Voice upload failed');
  return data.voiceFileUrl as string;
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const data = await apiGet<{ products: Product[] }>('/api/products');
  return data.products ?? [];
}

// ── Avatar ────────────────────────────────────────────────────────────────────

export async function queueAvatarRequest(params: {
  affiliateCode: string;
  profileId?: string;
  name: string;
  photoUrl: string;
  voiceFileUrl?: string;
  attire?: AttireSelection;
  productId?: string;
  productTitle?: string;
  productPageUrl?: string;
  productImageUrl?: string;
  platform?: string;
}): Promise<{ requestId: string; request: AvatarRequest }> {
  return apiPost('/api/affiliate/avatar/request', { ...params, source: 'expo-app' });
}

export async function createAvatar(params: {
  affiliateCode: string;
  profileId?: string;
  affiliateId?: string;
  name: string;
  photoUrl: string;
  voiceFileUrl?: string;
  attire?: AttireSelection;
  productId?: string;
  productTitle?: string;
  productPageUrl?: string;
  productImageUrl?: string;
  platform?: string;
}): Promise<AvatarRequest> {
  const data = await apiPost<{ request: AvatarRequest }>('/api/affiliate/avatar/create', {
    ...params,
    source: 'expo-app',
  });
  return data.request;
}

export async function fetchAvatarRequest(requestId: string, affiliateCode: string): Promise<AvatarRequest> {
  const data = await apiGet<{ request: AvatarRequest }>(
    `/api/affiliate/avatar/request/${requestId}?affiliateCode=${encodeURIComponent(affiliateCode)}`
  );
  return data.request;
}

export async function fetchAvatarGallery(affiliateCode: string): Promise<AvatarGalleryItem[]> {
  const data = await apiGet<{ avatars?: AvatarGalleryItem[]; gallery?: AvatarGalleryItem[] }>(
    `/api/affiliate/avatar/gallery?affiliateCode=${encodeURIComponent(affiliateCode)}`
  );
  return data.avatars ?? data.gallery ?? [];
}

export async function fetchLatestAvatarRequest(affiliateCode: string): Promise<AvatarRequest | null> {
  try {
    const data = await apiGet<{ request: AvatarRequest }>(
      `/api/affiliate/avatar/request/latest?affiliateCode=${encodeURIComponent(affiliateCode)}`
    );
    return data.request ?? null;
  } catch {
    return null;
  }
}

// ── Product Videos ────────────────────────────────────────────────────────────

export async function generateProductVideo(params: {
  affiliateCode: string;
  avatarRequestId?: string;
  productId?: string | number;
  productHandle?: string;
  productTitle?: string;
  productImageUrl?: string;
  productPageUrl?: string;
  productPrice?: string;
  platform?: string;
  customScript?: string;
}): Promise<{ videoJobId: string; status: string; script: string; qualityScore: number }> {
  const asyncAttempt = await postJson('/api/affiliate/product-video/generate-async', params);
  if (asyncAttempt.status >= 200 && asyncAttempt.status < 300 && asyncAttempt.data?.success) {
    const asyncJob = normalizeVideoJob({
      ...asyncAttempt.data,
      videoJobId: asyncAttempt.data.videoJobId || asyncAttempt.data.jobId,
      status: asyncAttempt.data.status || 'queued',
      script: asyncAttempt.data.script || params.customScript || '',
      qualityScore: asyncAttempt.data.qualityScore ?? 0,
    });
    return {
      videoJobId: asyncJob.videoJobId,
      status: asyncJob.status,
      script: asyncJob.script || '',
      qualityScore: typeof asyncJob.qualityScore === 'number' ? asyncJob.qualityScore : 0,
    };
  }

  // Backward-compatible fallback while queue endpoint rolls out across environments.
  if (asyncAttempt.status !== 404) {
    const err = asyncAttempt.data?.error || `POST /api/affiliate/product-video/generate-async failed (${asyncAttempt.status})`;
    const asyncError = new Error(err);
    const shouldFallback = asyncAttempt.status === 400 || asyncAttempt.status === 405;
    if (!shouldFallback) throw asyncError;
  }

  const legacy = await apiPost<{ videoJobId: string; status: string; script: string; qualityScore: number }>(
    '/api/affiliate/product-video/generate',
    params
  );
  return {
    videoJobId: legacy.videoJobId,
    status: normalizeVideoStatus(legacy.status),
    script: legacy.script,
    qualityScore: legacy.qualityScore,
  };
}

export async function fetchVideoStatus(videoJobId: string, affiliateCode: string): Promise<VideoJob> {
  const data = await apiGet<(VideoJob & { success?: boolean }) | { jobId: string; status: string }>(
    `/api/affiliate/product-video/status/${videoJobId}?affiliateCode=${encodeURIComponent(affiliateCode)}`
  );
  return normalizeVideoJob({
    ...data,
    videoJobId: (data as any).videoJobId || (data as any).jobId || videoJobId,
  });
}

export async function fetchVideoLibrary(affiliateCode: string): Promise<VideoJob[]> {
  const modernData = await apiGet<{ videos?: any[]; jobs?: any[] }>(
    `/api/affiliate/product-videos?affiliateCode=${encodeURIComponent(affiliateCode)}`
  ).catch(() => null);
  if (modernData && Array.isArray(modernData.videos)) {
    return modernData.videos.map((video) => normalizeVideoJob(video));
  }
  if (modernData && Array.isArray(modernData.jobs)) {
    return modernData.jobs.map((job) => normalizeVideoJob(job));
  }

  const queueData = await apiGet<{ jobs?: any[] }>(
    `/api/affiliate/product-video/list?affiliateCode=${encodeURIComponent(affiliateCode)}`
  );
  return (queueData.jobs ?? []).map((job) => normalizeVideoJob(job));
}

// ── SEO / Algorithm ──────────────────────────────────────────────────────────

export async function scoreDiscoverability(params: {
  platform: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  hasCaptions?: boolean;
  formatOk?: boolean;
  usedTrendingTag?: boolean;
}): Promise<DiscoverabilityResult> {
  const data = await apiPost<{ success: boolean } & DiscoverabilityResult>(
    '/api/algorithm/discoverability',
    { ...params, hasCaptions: true, formatOk: true }
  );
  return { score: data.score, grade: data.grade, suggestions: data.suggestions };
}

export async function fetchTrendingTags(platform: string, limit = 5): Promise<string[]> {
  try {
    const data = await apiGet<{ tags: string[] }>(
      `/api/algorithm/trending-tags?platform=${platform}&limit=${limit}`
    );
    return data.tags ?? [];
  } catch {
    return [];
  }
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<{ status: string; version: string }> {
  const res = await fetch(`${API_BASE}/status`);
  return res.json();
}

// ── Affiliate profile ─────────────────────────────────────────────────────────

export async function fetchAffiliateProfile(affiliateCode: string): Promise<AffiliateProfile> {
  const data = await apiGet<{ profile: AffiliateProfile }>(
    `/api/affiliate/profile/${encodeURIComponent(affiliateCode)}`
  );
  return data.profile;
}

export async function updateAffiliateProfile(params: {
  affiliateCode: string;
  name?: string;
  pictureUrl?: string | null;
  profileId?: string;
  voiceCloneId?: string | null;
  voiceId?: string | null;
  voiceFileUrl?: string | null;
}): Promise<AffiliateProfile> {
  const data = await apiPost<{ profile: AffiliateProfile }>('/api/affiliate/profile', params);
  return data.profile;
}

// ── Billing & Payouts ─────────────────────────────────────────────────────────

export interface AffiliateBillingInfo {
  affiliateCode: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionRenewalDate?: string;
  purchases?: Array<{
    productTitle: string;
    amount: number;
    currency: string;
    purchasedAt: string;
    status: string;
  }>;
  commissionBalance?: number;
  commissionCurrency?: string;
  totalEarned?: number;
  totalPaid?: number;
  payoutMethods?: Array<{
    type: 'btc' | 'eth' | 'usd';
    address?: string;
    bankInfo?: string;
    isDefault?: boolean;
  }>;
}

export async function fetchAffiliateBillingInfo(affiliateCode: string): Promise<AffiliateBillingInfo> {
  const data = await apiGet<{ billing: AffiliateBillingInfo }>(
    `/api/affiliate/billing/info?code=${encodeURIComponent(affiliateCode)}`
  );
  return data.billing;
}

export async function requestAffiliatePayout(params: {
  affiliateCode: string;
  method: 'btc' | 'eth' | 'usd';
  walletAddress?: string;
  bankInfo?: string;
  amount?: number;
}): Promise<{ payoutRequestId: string; status: string; estimatedArrival?: string }> {
  const data = await apiPost<{ success: boolean; payoutRequestId: string; status: string; estimatedArrival?: string }>(
    '/api/affiliate/billing/payout',
    params
  );
  return {
    payoutRequestId: data.payoutRequestId,
    status: data.status,
    estimatedArrival: data.estimatedArrival,
  };
}

// ── Support / Comms ───────────────────────────────────────────────────────────

export interface AffiliateCommsMessage {
  messageId: string;
  sessionId: string;
  role: 'affiliate' | 'support' | 'system';
  content: string;
  sentAt: string;
  readAt?: string;
}

export async function startAffiliateSupportSession(params: {
  affiliateCode: string;
  subject?: string;
  initialMessage?: string;
}): Promise<{ sessionId: string; status: string }> {
  const data = await apiPost<{ success: boolean; sessionId: string; status: string }>(
    '/api/affiliate/comms/session/start',
    params
  );
  return { sessionId: data.sessionId, status: data.status };
}

export async function fetchAffiliateSupportConversation(
  affiliateCode: string,
  sessionId: string
): Promise<AffiliateCommsMessage[]> {
  const data = await apiGet<{ messages: AffiliateCommsMessage[] }>(
    `/api/affiliate/comms/conversation?affiliateCode=${encodeURIComponent(affiliateCode)}&sessionId=${encodeURIComponent(sessionId)}`
  );
  return data.messages ?? [];
}

export async function sendAffiliateSupportMessage(params: {
  affiliateCode: string;
  sessionId: string;
  content: string;
}): Promise<AffiliateCommsMessage> {
  const data = await apiPost<{ success: boolean; message: AffiliateCommsMessage }>(
    '/api/affiliate/comms/message/send',
    params
  );
  return data.message;
}
