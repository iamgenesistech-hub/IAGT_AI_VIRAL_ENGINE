// lib/api.ts — All calls to the live EVICS Cloud Run backend.
import { API_BASE } from '@/constants/config';
import {
  AvatarGalleryItem,
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

export async function fetchAvatarRequest(requestId: string): Promise<AvatarRequest> {
  const data = await apiGet<{ request: AvatarRequest }>(`/api/affiliate/avatar/request/${requestId}`);
  return data.request;
}

export async function fetchAvatarGallery(affiliateCode: string): Promise<AvatarGalleryItem[]> {
  const data = await apiGet<{ gallery: AvatarGalleryItem[] }>(
    `/api/affiliate/avatar/gallery?affiliateCode=${encodeURIComponent(affiliateCode)}`
  );
  return data.gallery ?? [];
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
  return apiPost('/api/affiliate/product-video/generate', params);
}

export async function fetchVideoStatus(videoJobId: string): Promise<VideoJob> {
  const data = await apiGet<VideoJob & { success: boolean }>(
    `/api/affiliate/product-video/status/${videoJobId}`
  );
  return data;
}

export async function fetchVideoLibrary(affiliateCode: string): Promise<VideoJob[]> {
  const data = await apiGet<{ videos: VideoJob[] }>(
    `/api/affiliate/product-videos?affiliateCode=${encodeURIComponent(affiliateCode)}`
  );
  return data.videos ?? [];
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
