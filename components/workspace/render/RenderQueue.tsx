"use client";

import type { CreativeAsset } from "../../../lib/types";
import { stageLabel } from "../../../lib/validation";

interface RenderQueueProps {
  assets: CreativeAsset[];
  selectedAssetId?: string;
  onSelect: (assetId: string) => void;
}

export function RenderQueue({ assets, selectedAssetId, onSelect }: RenderQueueProps) {
  return (
    <div className="space-y-2">
      {assets.map((asset) => (
        <button
          key={asset.id}
          type="button"
          className={`w-full rounded border p-3 text-left ${selectedAssetId === asset.id ? "border-sky-500 bg-slate-900" : "border-slate-800 bg-slate-950"}`}
          onClick={() => onSelect(asset.id)}
        >
          <span className="block text-sm text-white">{asset.title}</span>
          <span className="text-xs text-slate-400">{stageLabel(asset.stage)}</span>
        </button>
      ))}
    </div>
  );
}

export default RenderQueue;
