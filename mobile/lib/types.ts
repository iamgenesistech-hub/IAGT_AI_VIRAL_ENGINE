// lib/types.ts
export interface AffiliateSession {
  affiliateCode: string;
  affiliateName: string;
  profilePhotoUrl?: string;
}

export interface AvatarRequest {
  requestId: string;
  affiliateCode: string;
  name: string;
  photoUrl: string;
  voiceFileUrl?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt?: string;
  avatar?: AvatarRecord;
  voiceCloneId?: string;
  voiceCloneStatus?: 'queued' | 'uploaded' | 'failed' | 'none';
  attire?: AttireSelection;
  productTitle?: string;
  platform?: string;
  returnTo?: string;
  error?: string;
}

export interface AvatarRecord {
  id: string;
  avatarId: string;
  name: string;
  photoUrl: string;
  voiceCloneId?: string;
  voiceCloneStatus?: string;
  talkingPhotoId?: string;
  proofVideoId?: string;
  proofStatus?: string;
  affiliateCode: string;
}

export interface AvatarGalleryItem {
  requestId: string;
  name: string;
  photoUrl: string;
  status: string;
  createdAt: string;
  avatar?: AvatarRecord;
  proofVideoUrl?: string;
  proofStatus?: string;
  voiceCloneStatus?: string;
  productTitle?: string;
  platform?: string;
}

export interface AttireSelection {
  top?: string;
  topColor?: string;
  bottom?: string;
  bottomColor?: string;
  overallStyle?: string;
  usePhotoClothing?: boolean;
}

export interface Product {
  id: string | number;
  handle?: string;
  title: string;
  image?: string;
  imageUrl?: string;
  price?: string;
  description?: string;
  url?: string;
}

export interface VideoJob {
  videoJobId: string;
  heygenVideoId?: string;
  affiliateCode: string;
  avatarName?: string;
  status: 'rendering' | 'completed' | 'failed';
  videoUrl?: string;
  gcsVideoUrl?: string;
  thumbnailUrl?: string;
  productTitle?: string;
  productPrice?: string;
  platform?: string;
  qualityScore?: number;
  voiceType?: 'stock' | 'clone';
  script?: string;
  createdAt: string;
  completedAt?: string;
  metadata?: PlatformMetadata;
  error?: string;
}

export interface PlatformMetadata {
  tiktok?: MetadataPackage;
  instagram?: MetadataPackage;
  youtube?: MetadataPackage;
  facebook?: MetadataPackage;
  [key: string]: MetadataPackage | undefined;
}

export interface MetadataPackage {
  title: string;
  description: string;
  hashtags: string[];
  keywords?: string[];
  coverText?: string;
  postingTime?: string;
  discoverability?: { score: number; grade: string; suggestions: string[] };
}

export interface DiscoverabilityResult {
  score: number;
  grade: 'excellent' | 'strong' | 'fair' | 'weak';
  suggestions: string[];
}
