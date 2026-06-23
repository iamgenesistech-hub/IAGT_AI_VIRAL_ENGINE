"use client";

import VideoPlayer from "./VideoPlayer";
import type { CreativeAsset } from "../../../lib/types";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";
import { hasPreview } from "../../../lib/validation";

export function ReviewPanel() {
  const { assets, selectedAssetId, selectAsset, approveAsset, requestRerender, discardAsset } = useWorkspaceStore();
  // Review is intentionally gated by previewUrl, so no fake player can appear.
  const reviewAssets = assets.filter(
    (asset): asset is CreativeAsset & { previewUrl: string } => asset.stage === "review_pending" && hasPreview(asset)
  );
  const activeAsset = reviewAssets.find((asset) => asset.id === selectedAssetId) || reviewAssets[0];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Review</h2>
        <p className="text-sm text-slate-400">Only assets with a preview URL are reviewable.</p>
      </div>

      {reviewAssets.length ? (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-2">
            {reviewAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className={`w-full rounded border p-3 text-left ${activeAsset?.id === asset.id ? "border-sky-500" : "border-slate-800"}`}
                onClick={() => selectAsset(asset.id)}
              >
                {asset.title}
              </button>
            ))}
          </div>

          {activeAsset ? (
            <div className="space-y-3">
              <VideoPlayer previewUrl={activeAsset.previewUrl} />
              <div className="flex gap-2">
                <button type="button" className="rounded bg-emerald-600 px-4 py-2 text-sm text-white" onClick={() => approveAsset(activeAsset.id)}>
                  Approve
                </button>
                <button type="button" className="rounded bg-slate-800 px-4 py-2 text-sm text-white" onClick={() => requestRerender(activeAsset.id)}>
                  Request Re-render
                </button>
                <button type="button" className="rounded bg-red-700 px-4 py-2 text-sm text-white" onClick={() => discardAsset(activeAsset.id)}>
                  Discard
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="rounded border border-slate-800 p-3 text-sm text-slate-400">No reviewable assets.</p>
      )}
    </section>
  );
}

export default ReviewPanel;
