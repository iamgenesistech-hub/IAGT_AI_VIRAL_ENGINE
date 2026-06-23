"use client";

import type { AssetStage } from "../../../lib/types";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";

const trackedStages: AssetStage[] = [
  "draft",
  "queued",
  "rendering",
  "render_complete",
  "render_failed",
  "review_pending",
  "approved",
  "rework_requested",
  "discarded",
  "scheduled",
  "published"
];

export function InsightsPanel() {
  const { assets } = useWorkspaceStore();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Insights</h2>
        <p className="text-sm text-slate-400">Counts by pipeline state.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {trackedStages.map((stage) => (
          <div key={stage} className="rounded border border-slate-800 p-3">
            <span className="text-xs text-slate-400">{stage}</span>
            <p className="mt-1 text-xl font-semibold text-white">{assets.filter((asset) => asset.stage === stage).length}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default InsightsPanel;
