"use client";

import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export function StatusBar() {
  const { selectedAsset, activeStage, scanner, summary } = useWorkspaceStore();
  const health = scanner.summary?.healthScore ?? 100;

  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 bg-slate-950/70 px-4 py-3 text-xs text-slate-300 backdrop-blur-sm">
      <span>Stage: {activeStage}</span>
      <span>Active media: {summary.activeMedia}</span>
      <span>Scanner: {scanner.status}</span>
      <span>Health: {health}</span>
      <span>Selected: {selectedAsset ? selectedAsset.stage : "none"}</span>
    </footer>
  );
}

export default StatusBar;
