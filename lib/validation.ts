import type { AssetStage, CreativeAsset } from "./types";

const transitions: Record<AssetStage, AssetStage[]> = {
  draft: ["queued"],
  queued: ["rendering"],
  rendering: ["render_complete", "render_failed"],
  render_complete: ["review_pending"],
  render_failed: ["queued"],
  review_pending: ["approved", "rework_requested", "discarded"],
  approved: ["scheduled", "published"],
  rework_requested: ["queued"],
  discarded: [],
  scheduled: ["published"],
  published: []
};

export function canTransition(from: AssetStage, to: AssetStage): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(asset: CreativeAsset, nextStage: AssetStage) {
  if (!canTransition(asset.stage, nextStage)) {
    throw new Error(`Cannot move asset from ${asset.stage} to ${nextStage}.`);
  }
}

export function canSendToRender(asset?: CreativeAsset): boolean {
  return Boolean(asset && (asset.stage === "draft" || asset.stage === "rework_requested") && asset.script.trim());
}

export function canStartRender(asset?: CreativeAsset): boolean {
  return Boolean(asset && asset.stage === "queued");
}

export function canRetryRender(asset?: CreativeAsset): boolean {
  return Boolean(asset && asset.stage === "render_failed");
}

export function canReview(asset?: CreativeAsset): boolean {
  return Boolean(asset && asset.stage === "review_pending" && asset.previewUrl);
}

export function canPublish(asset?: CreativeAsset): boolean {
  return Boolean(asset && asset.stage === "approved");
}

export function hasPreview(asset?: CreativeAsset): asset is CreativeAsset & { previewUrl: string } {
  return Boolean(asset?.previewUrl);
}

export function hasDownload(asset?: CreativeAsset): asset is CreativeAsset & { downloadUrl: string } {
  return Boolean(asset?.downloadUrl);
}

export function stageLabel(stage: AssetStage): string {
  return stage.replace("_", " ");
}
