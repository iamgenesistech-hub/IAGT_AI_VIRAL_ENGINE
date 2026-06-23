"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

export function AgentRail() {
  const { assets, selectedAsset, logs, scanner, summary, toggleLogs, setActiveStage } = useWorkspaceStore();
  const [handoffRegistry, setHandoffRegistry] = useState<{ handoffs: Array<Record<string, any>>; summary?: Record<string, any> }>({ handoffs: [] });
  const [productIntel, setProductIntel] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    let active = true;

    async function refreshRemoteState() {
      try {
        const [handoffResponse, productResponse] = await Promise.all([
          fetch("/api/agents/contracts/handoffs", { headers: { Accept: "application/json" } }).then((response) => response.json()),
          fetch("/api/product-intelligence/board-summary", { headers: { Accept: "application/json" } }).then((response) => response.json())
        ]);

        if (!active) return;
        setHandoffRegistry({
          handoffs: Array.isArray(handoffResponse?.handoffs) ? handoffResponse.handoffs : [],
          summary: handoffResponse?.summary
        });
        setProductIntel(productResponse?.success ? productResponse.summary : null);
      } catch {
        if (!active) return;
        setHandoffRegistry({ handoffs: [] });
        setProductIntel(null);
      }
    }

    refreshRemoteState();
    const timer = window.setInterval(refreshRemoteState, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const renderCount = assets.filter((asset) => ["queued", "rendering", "render_failed"].includes(asset.stage)).length;
  const reviewCount = assets.filter((asset) => asset.stage === "review_pending" && asset.previewUrl).length;
  const publishCount = assets.filter((asset) => asset.stage === "approved").length;
  const healthScore = scanner.summary?.healthScore ?? 100;
  const topProduct = productIntel?.topProducts?.[0];
  const recentHandoffs = (handoffRegistry.handoffs || []).slice(0, 4);

  return (
    <aside className="border-l border-slate-800/80 bg-[radial-gradient(circle_at_top,#11362d,transparent_50%),linear-gradient(180deg,#020617_0%,#0b1220_40%,#030712_100%)] p-4">
      <div className="mb-4 rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200">Executive Rail</h2>
        <p className="mt-2 text-xs text-slate-300">Realtime scanner pressure, media throughput, and agent communication health.</p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="rounded-xl border border-emerald-600/35 bg-emerald-500/10 p-3">
          <span className="text-xs uppercase tracking-wide text-emerald-300">Scanner health</span>
          <p className="mt-2 text-2xl font-semibold text-emerald-200">{healthScore}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <span className="text-slate-400">Scanner status</span>
          <p className="mt-1 text-white">{scanner.status}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <span className="text-slate-400">Selected</span>
          <p className="mt-1 text-white">{selectedAsset?.title || "No asset selected"}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <span className="text-slate-400">Blocked</span>
          <p className="mt-1 text-white">{summary.blocked}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <span className="text-slate-400">Render queue</span>
          <p className="mt-1 text-white">{renderCount}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <span className="text-slate-400">Ready for review</span>
          <p className="mt-1 text-white">{reviewCount}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <span className="text-slate-400">Approved</span>
          <p className="mt-1 text-white">{publishCount}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
          <span className="text-xs uppercase tracking-wide text-cyan-200">Product Intel</span>
          <p className="mt-2 text-lg font-semibold text-cyan-100">{productIntel?.scanMode || "off"}</p>
          <p className="mt-1 text-xs text-cyan-50/80">{productIntel?.scanningActive ? "Scanner active" : "Scanner paused"}</p>
          {topProduct ? <p className="mt-2 text-xs text-cyan-50/80">Top product: {String(topProduct.title || topProduct.productId || "n/a")} ({Number(topProduct.totalRevenue || 0).toFixed(2)} revenue)</p> : <p className="mt-2 text-xs text-cyan-50/80">No product intelligence loaded.</p>}
        </div>

        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
          <span className="text-xs uppercase tracking-wide text-violet-200">Handoff Registry</span>
          <p className="mt-2 text-lg font-semibold text-violet-100">{Number(handoffRegistry.summary?.approved || 0)} approved / {Number(handoffRegistry.summary?.blocked || 0)} blocked</p>
          <div className="mt-3 space-y-2">
            {recentHandoffs.length ? recentHandoffs.map((handoff) => (
              <div key={String(handoff.contractId || handoff.taskId || `${handoff.sourceAgent}-${handoff.targetAgent}`)} className="rounded-lg border border-violet-400/20 bg-slate-950/40 p-2 text-xs text-violet-50/90">
                <p className="font-medium text-violet-100">{String(handoff.sourceAgent || "Agent")} → {String(handoff.targetAgent || "Next")}</p>
                <p className="mt-1 text-violet-50/70">{String(handoff.objective || "No objective provided").slice(0, 120)}</p>
                <p className="mt-1 text-violet-50/60">{String(handoff.status || "blocked")} • confidence {Number(handoff.confidence || 0).toFixed(2)}</p>
              </div>
            )) : <p className="text-xs text-violet-50/70">No evaluated handoffs yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <button type="button" className="w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white transition hover:border-slate-300" onClick={() => setActiveStage("decisions")}>
          Open Decisions
        </button>
      </div>

      {logs.length ? (
        <button type="button" className="mt-4 w-full rounded-lg border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm text-white transition hover:border-slate-300" onClick={toggleLogs}>
          Logs ({logs.length})
        </button>
      ) : null}
    </aside>
  );
}

export default AgentRail;
