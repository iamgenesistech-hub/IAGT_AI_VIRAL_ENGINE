"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "../../../store/useWorkspaceStore";

export function ScannerPanel() {
  const { scanner, summary, toggleScanner, runScanners, setActiveStage, refreshMissionHandoffs, controlPlane } = useWorkspaceStore();
  const scanSummary = scanner.summary;

  useEffect(() => {
    refreshMissionHandoffs();
  }, [refreshMissionHandoffs]);

  const severityClass = (severity: string) => {
    if (severity === "critical") return "border-red-400/40 bg-red-500/10 text-red-200";
    if (severity === "warning") return "border-amber-400/40 bg-amber-500/10 text-amber-200";
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 p-5 shadow-[0_20px_65px_rgba(6,14,30,0.5)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Scanner Command Center</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Executive Scanners</h2>
            <p className="mt-1 text-sm text-slate-300">Rules + model checks for content, compliance, pipeline readiness, and delivery evidence.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-slate-500/50 bg-slate-900/70 px-4 py-2 text-sm text-white transition hover:border-slate-300" onClick={toggleScanner}>
              {scanner.enabled ? "Pause Scanner" : "Enable Scanner"}
            </button>
            <button type="button" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40" disabled={!scanner.enabled} onClick={runScanners}>
              Run Elite Scan
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <span className="text-xs uppercase tracking-wide text-slate-400">Health Score</span>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{scanSummary?.healthScore ?? 100}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <span className="text-xs uppercase tracking-wide text-slate-400">Risk</span>
          <p className="mt-2 text-xl font-semibold text-white">{scanSummary?.riskLevel ?? "low"}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <span className="text-xs uppercase tracking-wide text-slate-400">Critical</span>
          <p className="mt-2 text-xl font-semibold text-red-300">{scanSummary?.criticalCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <span className="text-xs uppercase tracking-wide text-slate-400">Warnings</span>
          <p className="mt-2 text-xl font-semibold text-amber-300">{scanSummary?.warningCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <span className="text-xs uppercase tracking-wide text-slate-400">Active Media</span>
          <p className="mt-2 text-xl font-semibold text-white">{summary.activeMedia}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <span className="text-xs uppercase tracking-wide text-cyan-100">Product Intel Mode</span>
          <p className="mt-2 text-xl font-semibold text-cyan-50">{String((controlPlane?.productIntelStatus as Record<string, unknown> | undefined)?.mode || "off")}</p>
        </div>
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
          <span className="text-xs uppercase tracking-wide text-violet-100">Handoff Approved</span>
          <p className="mt-2 text-xl font-semibold text-violet-50">{Number((controlPlane?.handoffSummary as Record<string, unknown> | undefined)?.approved || 0)}</p>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <span className="text-xs uppercase tracking-wide text-rose-100">Handoff Blocked</span>
          <p className="mt-2 text-xl font-semibold text-rose-50">{Number((controlPlane?.handoffSummary as Record<string, unknown> | undefined)?.blocked || 0)}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <span className="text-xs uppercase tracking-wide text-emerald-100">Policy Profiles</span>
          <p className="mt-2 text-xl font-semibold text-emerald-50">{Object.keys((controlPlane?.policyProfiles as Record<string, unknown> | undefined) || {}).length}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-2">
          {scanner.findings.map((finding) => (
            <article key={finding.id} className={`rounded-xl border p-4 ${severityClass(finding.severity)}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em]">
                    <span>{finding.severity}</span>
                    {finding.code ? <span className="text-slate-300">{finding.code}</span> : null}
                    {finding.confidence ? <span className="text-slate-300">{Math.round(finding.confidence * 100)}% conf.</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-white">{finding.message}</p>
                  {finding.recommendation ? <p className="mt-2 text-xs text-slate-200">Action: {finding.recommendation}</p> : null}
                </div>
                {finding.assetId ? (
                  <button type="button" className="rounded-lg border border-white/25 bg-black/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/35" onClick={() => setActiveStage("media")}>
                    Open Media
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {!scanner.findings.length ? <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">No scanner findings yet. Run a scan to inspect active media.</p> : null}
        </div>

        <aside className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">Recommended Next Actions</h3>
          <div className="mt-3 space-y-2">
            {(scanSummary?.recommendations || ["Run a scan to generate prioritized actions."]).map((item, index) => (
              <p key={`${item}-${index}`} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">{item}</p>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-400">
            Status: {scanner.status}{scanner.lastRunAt ? ` • Last run ${new Date(scanner.lastRunAt).toLocaleString()}` : " • Not run yet"}
            {controlPlane?.refreshedAt ? ` • Control plane ${new Date(controlPlane.refreshedAt).toLocaleString()}` : ""}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default ScannerPanel;
