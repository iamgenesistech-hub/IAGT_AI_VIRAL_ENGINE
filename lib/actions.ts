import type { ActionResult, CreativeAsset } from "./types";

// These contracts are intentionally thin. They define the async boundary where
// real EVICS render/publish endpoints plug in without manufacturing UI output.
export async function requestRender(asset: CreativeAsset): Promise<ActionResult> {
  if (!asset.script.trim()) {
    return { ok: false, message: "Script is required before rendering." };
  }

  return {
    ok: true,
    message: "Render job accepted.",
    renderJobId: `render-${asset.id}-${Date.now()}`
  };
}

export async function publishAsset(asset: CreativeAsset): Promise<ActionResult> {
  if (!asset.previewUrl) {
    return { ok: false, message: "Preview URL is required before publishing." };
  }

  return {
    ok: true,
    message: "Publish request accepted."
  };
}
