"use client";

import { useEffect, useState } from "react";
import AgentRail from "../system/AgentRail";
import LogsDrawer from "../system/LogsDrawer";
import VpPanel from "../system/VpPanel";
import CommandPanel from "./command/CommandPanel";
import DecisionPanel from "./decisions/DecisionPanel";
import EvidencePanel from "./evidence/EvidencePanel";
import InsightsPanel from "./insights/InsightsPanel";
import MediaPanel from "./media/MediaPanel";
import ScannerPanel from "./scanners/ScannerPanel";
import StageTabs from "./StageTabs";
import StatusBar from "./StatusBar";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import type { WorkspaceStage } from "../../lib/types";

export function WorkspaceShell() {
  const { activeStage, setActiveStage } = useWorkspaceStore();
  const [showVpPanel, setShowVpPanel] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("evics.showVpPanel");
    if (stored === null) return;
    setShowVpPanel(stored === "true");
  }, []);

  useEffect(() => {
    const stage = new URLSearchParams(window.location.search).get("stage");
    if (!stage) return;

    const allowed = new Set<WorkspaceStage>(["command", "scanners", "media", "decisions", "evidence", "insights"]);
    if (allowed.has(stage as WorkspaceStage)) {
      setActiveStage(stage as WorkspaceStage);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("evics.showVpPanel", String(showVpPanel));
  }, [showVpPanel]);

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[radial-gradient(circle_at_20%_0%,rgba(18,56,49,0.7),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(20,35,66,0.6),transparent_40%),linear-gradient(180deg,#020617_0%,#050a18_50%,#020617_100%)] text-slate-100 lg:grid-cols-[1fr_340px]">
      <section className="flex min-h-screen flex-col">
        <header className="border-b border-slate-800/70 px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">EVICS Command Grid</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Elite Executive Workspace</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/25"
                onClick={() => setShowVpPanel((value) => !value)}
              >
                VP
              </button>
            </div>
          </div>
        </header>

        <StageTabs />

        <section className="flex-1 p-4 md:p-5 lg:p-6">
          {activeStage === "command" ? <CommandPanel /> : null}
          {activeStage === "scanners" ? <ScannerPanel /> : null}
          {activeStage === "media" ? <MediaPanel /> : null}
          {activeStage === "decisions" ? <DecisionPanel /> : null}
          {activeStage === "evidence" ? <EvidencePanel /> : null}
          {activeStage === "insights" ? <InsightsPanel /> : null}
        </section>

        <StatusBar />
      </section>

      <AgentRail />
      <LogsDrawer />
      {showVpPanel ? <VpPanel onClose={() => setShowVpPanel(false)} /> : null}
    </main>
  );
}

export default WorkspaceShell;
