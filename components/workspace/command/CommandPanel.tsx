"use client";

import { useWorkspaceStore } from "../../../store/useWorkspaceStore";

export function CommandPanel() {
  const { summary, scanner, setActiveStage } = useWorkspaceStore();
  const scannerBlocked = scanner.findings.filter((finding) => finding.severity === "critical").length;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Executive Command</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button type="button" className="rounded border border-slate-800 p-4 text-left hover:border-sky-500" onClick={() => setActiveStage("media")}>
          <span className="text-xs text-slate-400">Active media</span>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.activeMedia}</p>
        </button>
        <button type="button" className="rounded border border-slate-800 p-4 text-left hover:border-sky-500" onClick={() => setActiveStage("scanners")}>
          <span className="text-xs text-slate-400">Scanner findings</span>
          <p className="mt-2 text-2xl font-semibold text-white">{scanner.findings.length}</p>
        </button>
        <button type="button" className="rounded border border-slate-800 p-4 text-left hover:border-sky-500" onClick={() => setActiveStage("decisions")}>
          <span className="text-xs text-slate-400">Ready decisions</span>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.reviewReady + summary.approved}</p>
        </button>
        <button type="button" className="rounded border border-slate-800 p-4 text-left hover:border-sky-500" onClick={() => setActiveStage("evidence")}>
          <span className="text-xs text-slate-400">Blocked items</span>
          <p className="mt-2 text-2xl font-semibold text-white">{summary.blocked + scannerBlocked}</p>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-white">Today&apos;s Workspace Priorities</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <p>Drafts waiting for production: {summary.drafts}</p>
            <p>Queued or failed renders: {summary.renderQueue}</p>
            <p>Review-ready media: {summary.reviewReady}</p>
            <p>Approved media waiting on publish: {summary.approved}</p>
          </div>
        </div>

        <div className="rounded border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-white">Scanner Control</h3>
          <p className="mt-2 text-sm text-slate-400">Status: {scanner.status}</p>
          <p className="mt-1 text-xs text-slate-500">Last run: {scanner.lastRunAt ? new Date(scanner.lastRunAt).toLocaleString() : "not yet"}</p>
          <button type="button" className="mt-4 rounded bg-sky-600 px-4 py-2 text-sm text-white" onClick={() => setActiveStage("scanners")}>
            Open Scanner Workspace
          </button>
        </div>
      </div>

    </section>
  );
}

export default CommandPanel;
