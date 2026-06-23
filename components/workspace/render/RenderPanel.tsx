"use client";

import { useState } from "react";
import RenderQueue from "./RenderQueue";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";

const renderStages = ["queued", "rendering", "render_complete", "render_failed"];

export function RenderPanel() {
  const { assets, selectedAsset, selectedAssetId, selectAsset, startRender, sendToRender, completeRender } = useWorkspaceStore();
  const [previewUrl, setPreviewUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const renderAssets = assets.filter((asset) => renderStages.includes(asset.stage));
  const canGenerate = selectedAsset?.stage === "queued";
  const canRetry = selectedAsset?.stage === "render_failed";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Render</h2>
        <p className="text-sm text-slate-400">Only queued, rendering, complete, failed, and rework assets appear here.</p>
      </div>

      {renderAssets.length ? (
        <RenderQueue assets={renderAssets} selectedAssetId={selectedAssetId} onSelect={selectAsset} />
      ) : (
        <p className="rounded border border-slate-800 p-3 text-sm text-slate-400">No assets are in render.</p>
      )}

      {selectedAsset && renderStages.includes(selectedAsset.stage) ? (
        <div className="rounded border border-slate-800 p-3">
          <p className="text-sm text-white">{selectedAsset.title}</p>
          <p className="text-xs text-slate-400">Stage: {selectedAsset.stage}</p>
          <div className="mt-3 flex gap-2">
            {canGenerate ? (
              <button type="button" className="rounded bg-sky-600 px-4 py-2 text-sm text-white" onClick={() => startRender(selectedAsset.id)}>
                Generate Video
              </button>
            ) : null}
            {canRetry ? (
              <button type="button" className="rounded bg-sky-600 px-4 py-2 text-sm text-white" onClick={() => sendToRender(selectedAsset.id)}>
                Retry
              </button>
            ) : null}
          </div>
          {selectedAsset.stage === "rendering" ? (
            <div className="mt-4 space-y-2">
              <label className="block">
                <span className="mb-1 block text-sm text-slate-300">Provider preview URL</span>
                <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white" value={previewUrl} onChange={(event) => setPreviewUrl(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-300">Download URL</span>
                <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white" value={downloadUrl} onChange={(event) => setDownloadUrl(event.target.value)} />
              </label>
              <button
                type="button"
                className="rounded bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-40"
                disabled={!previewUrl.trim()}
                onClick={() => completeRender({ assetId: selectedAsset.id, previewUrl, downloadUrl: downloadUrl || undefined })}
              >
                Attach Provider Result
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default RenderPanel;
