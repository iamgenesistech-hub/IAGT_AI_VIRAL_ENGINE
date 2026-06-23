"use client";

import type { WorkspaceStage } from "../../lib/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

const stages: { key: WorkspaceStage; label: string }[] = [
  { key: "command", label: "Command" },
  { key: "scanners", label: "Scanners" },
  { key: "media", label: "Media" },
  { key: "decisions", label: "Decisions" },
  { key: "evidence", label: "Evidence" },
  { key: "insights", label: "Insights" }
];

export function StageTabs() {
  const { activeStage, setActiveStage } = useWorkspaceStore();

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-slate-800/70 px-3 py-2" aria-label="Elite Executive Workspace">
      {stages.map((stage) => (
        <button
          key={stage.key}
          type="button"
          className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${activeStage === stage.key ? "bg-emerald-500/20 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.5)]" : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-200"}`}
          onClick={() => setActiveStage(stage.key)}
        >
          {stage.label}
        </button>
      ))}
    </nav>
  );
}

export default StageTabs;
