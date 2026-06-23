"use client";

import { useWorkspaceStore } from "../../../store/useWorkspaceStore";

export function EvidencePanel() {
  const { assets, scanner, renderJobs, summary } = useWorkspaceStore();
  const activeJobs = Object.values(renderJobs).filter(Boolean).length;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Evidence</h2>
        <p className="text-sm text-slate-400">Workspace health without the removed build-objective test surface.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded border border-slate-800 p-4">
          <span className="text-xs text-slate-400">Scanner</span>
          <p className="mt-1 text-white">{scanner.enabled ? "enabled" : "paused"} / {scanner.status}</p>
        </div>
        <div className="rounded border border-slate-800 p-4">
          <span className="text-xs text-slate-400">Render jobs</span>
          <p className="mt-1 text-white">{activeJobs}</p>
        </div>
        <div className="rounded border border-slate-800 p-4">
          <span className="text-xs text-slate-400">Active media</span>
          <p className="mt-1 text-white">{summary.activeMedia}</p>
        </div>
      </div>

      <div className="rounded border border-slate-800 p-4">
        <h3 className="text-sm font-semibold text-white">Media Registry</h3>
        <div className="mt-3 space-y-2">
          {assets.map((asset) => (
            <div key={asset.id} className="flex flex-col gap-1 border-t border-slate-900 pt-2 text-sm md:flex-row md:items-center md:justify-between">
              <span className="text-slate-200">{asset.title}</span>
              <span className="text-slate-500">{asset.stage}</span>
            </div>
          ))}
          {!assets.length ? <p className="text-sm text-slate-400">No workspace media has been created yet.</p> : null}
        </div>
      </div>
    </section>
  );
}

export default EvidencePanel;
