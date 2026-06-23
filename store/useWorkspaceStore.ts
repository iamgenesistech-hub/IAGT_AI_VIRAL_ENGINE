"use client";

import { useSyncExternalStore } from "react";
import { publishAsset, requestRender } from "../lib/actions";
import type { CreativeAsset, DraftInput, RenderCompleteInput, ScannerState, WorkspaceLog, WorkspaceStage } from "../lib/types";
import { assertTransition } from "../lib/validation";
import { runWorkspaceScanner } from "../lib/scanner-engine";

interface WorkspaceState {
  assets: CreativeAsset[];
  selectedAssetId?: string;
  activeStage: WorkspaceStage;
  logs: WorkspaceLog[];
  logsOpen: boolean;
  renderJobs: Record<string, string>;
  scanner: ScannerState;
  missionHandoffs: HandoffRecord[];
  productIntelSnapshot?: ProductIntelSnapshot;
  controlPlane?: RemoteControlPlane;
}

export interface HandoffRecord {
  contractId: string;
  taskId: string;
  sourceAgent: string;
  targetAgent: string;
  domain: string;
  objective: string;
  status: "approved" | "blocked";
  confidence: number;
  evidence: Array<string | Record<string, unknown>>;
  evaluation?: {
    decision: "approved" | "blocked";
    score: number;
    reasons: string[];
    evidenceScore?: number;
    confidence?: number;
    minimumConfidence?: number;
    evaluatedAt: string;
    evaluator: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductIntelSnapshot {
  scanMode: string;
  scanningActive: boolean;
  topProducts: Array<{ productId: string; title: string; totalRevenue: number; totalPublished: number; topScore: number }>;
  platformLeaderboard: Array<{ platform: string; published: number; revenue: number }>;
  videoTypeBreakdown: Array<{ videoType: string; published: number; revenue: number }>;
  recentScanSessions: Array<Record<string, unknown>>;
  revenueTotal: number;
  profitTotal: number;
  updatedAt: string;
}

export interface RemoteControlPlane {
  productIntelStatus?: Record<string, unknown>;
  vpMission?: Record<string, unknown> | null;
  handoffSummary?: Record<string, unknown>;
  policyProfiles?: Record<string, unknown>;
  refreshedAt?: string;
}

interface WorkspaceSnapshot extends WorkspaceState {
  selectedAsset?: CreativeAsset;
}

export interface WorkspaceSummary {
  drafts: number;
  activeMedia: number;
  renderQueue: number;
  rendering: number;
  reviewReady: number;
  approved: number;
  published: number;
  blocked: number;
}

let state: WorkspaceState = {
  assets: [],
  selectedAssetId: undefined,
  activeStage: "command",
  logs: [],
  logsOpen: false,
  renderJobs: {},
  scanner: {
    enabled: true,
    status: "ready",
    findings: [],
    summary: {
      healthScore: 100,
      riskLevel: "low",
      weightedRisk: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      recommendations: []
    }
  },
  missionHandoffs: [],
  productIntelSnapshot: undefined,
  controlPlane: undefined
};

const listeners = new Set<() => void>();

function selectedAsset() {
  return state.assets.find((asset) => asset.id === state.selectedAssetId);
}

let snapshotCache: WorkspaceSnapshot = { ...state, selectedAsset: selectedAsset() };

function emit() {
  snapshotCache = { ...state, selectedAsset: selectedAsset() };
  listeners.forEach((listener) => listener());
}

function getSnapshot(): WorkspaceSnapshot {
  return snapshotCache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function log(message: string, level: WorkspaceLog["level"] = "info") {
  state = {
    ...state,
    logs: [{ id: `log-${Date.now()}`, message, level, createdAt: new Date().toISOString() }, ...state.logs].slice(0, 50)
  };
}

function workspaceSummary(): WorkspaceSummary {
  return {
    drafts: state.assets.filter((asset) => asset.stage === "draft").length,
    activeMedia: state.assets.filter((asset) => !["discarded", "published"].includes(asset.stage)).length,
    renderQueue: state.assets.filter((asset) => ["queued", "render_failed"].includes(asset.stage)).length,
    rendering: state.assets.filter((asset) => asset.stage === "rendering").length,
    reviewReady: state.assets.filter((asset) => asset.stage === "review_pending" && asset.previewUrl).length,
    approved: state.assets.filter((asset) => asset.stage === "approved").length,
    published: state.assets.filter((asset) => asset.stage === "published").length,
    blocked: state.assets.filter((asset) => asset.stage === "render_failed" || (asset.stage === "review_pending" && !asset.previewUrl)).length
  };
}

function createAsset(input: DraftInput): CreativeAsset {
  const asset: CreativeAsset = {
    id: `asset-${Date.now()}`,
    title: input.title?.trim() || "Untitled Video",
    script: input.script.trim(),
    stage: "draft"
  };
  state = { ...state, assets: [asset, ...state.assets], selectedAssetId: asset.id };
  return asset;
}

function replaceAsset(assetId: string, patch: Partial<CreativeAsset>) {
  state = {
    ...state,
    assets: state.assets.map((asset) => (asset.id === assetId ? { ...asset, ...patch } : asset))
  };
}

function moveAsset(asset: CreativeAsset, nextStage: CreativeAsset["stage"]) {
  assertTransition(asset, nextStage);
  replaceAsset(asset.id, { stage: nextStage });
}

export function useWorkspaceStore() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...current,
    summary: workspaceSummary(),

    setActiveStage(activeStage: WorkspaceStage) {
      state = { ...state, activeStage };
      emit();
    },

    selectAsset(assetId: string) {
      if (!state.assets.some((asset) => asset.id === assetId)) return;
      state = { ...state, selectedAssetId: assetId };
      emit();
    },

    toggleLogs() {
      state = { ...state, logsOpen: !state.logsOpen };
      emit();
    },

    toggleScanner() {
      state = {
        ...state,
        scanner: {
          ...state.scanner,
          enabled: !state.scanner.enabled,
          status: !state.scanner.enabled ? "ready" : "blocked"
        }
      };
      log(state.scanner.enabled ? "Workspace scanner enabled." : "Workspace scanner paused.");
      emit();
    },

    runScanners() {
      if (!state.scanner.enabled) {
        state = { ...state, scanner: { ...state.scanner, status: "blocked" } };
        log("Scanner is paused.", "error");
        emit();
        return;
      }

      const report = runWorkspaceScanner(state.assets);
      state = {
        ...state,
        scanner: {
          ...state.scanner,
          status: "complete",
          lastRunAt: new Date().toISOString(),
          findings: report.findings,
          summary: report.summary
        }
      };
      log(
        `Scanner pass completed: ${report.summary.healthScore} health, ${report.summary.criticalCount} critical, ${report.summary.warningCount} warning.`
      );
      emit();
    },

    async refreshMissionHandoffs() {
      try {
        const [handoffResponse, productIntelResponse, productIntelStatusResponse, policiesResponse] = await Promise.all([
          fetch("/api/agents/contracts/handoffs", { headers: { Accept: "application/json" } }).then((response) => response.json()),
          fetch("/api/product-intelligence/board-summary", { headers: { Accept: "application/json" } }).then((response) => response.json()),
          fetch("/api/product-intel/status", { headers: { Accept: "application/json" } }).then((response) => response.json()),
          fetch("/api/agents/contracts/policies", { headers: { Accept: "application/json" } }).then((response) => response.json())
        ]);

        const latestMission = Array.isArray(handoffResponse?.handoffs)
          ? handoffResponse.handoffs.find((item: Record<string, unknown>) => String(item.targetAgent || "").toLowerCase().includes("vp")) || null
          : null;

        state = {
          ...state,
          missionHandoffs: Array.isArray(handoffResponse?.handoffs) ? handoffResponse.handoffs : [],
          productIntelSnapshot: productIntelResponse?.success ? productIntelResponse.summary : undefined,
          controlPlane: {
            productIntelStatus: productIntelStatusResponse?.success ? (productIntelStatusResponse.status || {}) : {},
            vpMission: latestMission,
            handoffSummary: handoffResponse?.summary || {},
            policyProfiles: policiesResponse?.success ? (policiesResponse.profiles || {}) : {},
            refreshedAt: new Date().toISOString()
          }
        };
        emit();
      } catch (error) {
        log(`Mission handoff refresh failed: ${error instanceof Error ? error.message : String(error)}`, "error");
        emit();
      }
    },

    saveDraft(input: DraftInput) {
      const existing = selectedAsset();
      if (!existing || existing.stage !== "draft") {
        createAsset(input);
      } else {
        replaceAsset(existing.id, {
          title: input.title?.trim() || existing.title,
          script: input.script.trim()
        });
      }
      log("Draft saved.");
      emit();
    },

    sendToRender(input?: DraftInput | string) {
      let asset = typeof input === "string"
        ? state.assets.find((item) => item.id === input)
        : selectedAsset();

      if (!asset && typeof input === "object") {
        asset = createAsset(input);
      }

      if (!asset) {
        log("Script is required before sending to render.", "error");
        emit();
        return;
      }

      if (typeof input === "object") {
        replaceAsset(asset.id, {
          title: input.title?.trim() || asset.title,
          script: input.script.trim()
        });
        asset = state.assets.find((item) => item.id === asset?.id);
      }

      if (!asset?.script.trim()) {
        log("Script is required before sending to render.", "error");
        emit();
        return;
      }

      moveAsset(asset, "queued");
      state = { ...state, activeStage: "media", selectedAssetId: asset.id };
      log("Asset sent to render.");
      emit();
    },

    async startRender(assetId: string) {
      const asset = state.assets.find((item) => item.id === assetId);
      if (!asset || asset.stage !== "queued") return;

      const result = await requestRender(asset);
      if (!result.ok) {
        log(result.message, "error");
        emit();
        return;
      }

      moveAsset(asset, "rendering");
      state = { ...state, renderJobs: { ...state.renderJobs, [asset.id]: result.renderJobId || "" } };
      log("Render job started. Completion requires a provider preview URL.");
      emit();
    },

    completeRender(input: RenderCompleteInput) {
      const asset = state.assets.find((item) => item.id === input.assetId);
      if (!asset || asset.stage !== "rendering" || !input.previewUrl.trim()) return;

      assertTransition(asset, "render_complete");
      assertTransition({ ...asset, stage: "render_complete" }, "review_pending");
      replaceAsset(asset.id, {
        stage: "review_pending",
        previewUrl: input.previewUrl.trim(),
        downloadUrl: input.downloadUrl?.trim() || undefined,
        quality: input.quality
      });
      state = { ...state, activeStage: "decisions", selectedAssetId: asset.id };
      log("Render completed with provider preview URL.");
      emit();
    },

    failRender(assetId: string) {
      const asset = state.assets.find((item) => item.id === assetId);
      if (!asset || asset.stage !== "rendering") return;
      moveAsset(asset, "render_failed");
      log("Render failed.", "error");
      emit();
    },

    approveAsset(assetId: string) {
      const asset = state.assets.find((item) => item.id === assetId);
      if (!asset || asset.stage !== "review_pending" || !asset.previewUrl) return;
      moveAsset(asset, "approved");
      state = { ...state, activeStage: "decisions", selectedAssetId: asset.id };
      log("Asset approved.");
      emit();
    },

    requestRerender(assetId: string) {
      const asset = state.assets.find((item) => item.id === assetId);
      if (!asset || asset.stage !== "review_pending") return;
      moveAsset(asset, "rework_requested");
      state = { ...state, activeStage: "command", selectedAssetId: asset.id };
      log("Re-render requested.");
      emit();
    },

    discardAsset(assetId: string) {
      const asset = state.assets.find((item) => item.id === assetId);
      if (!asset || asset.stage !== "review_pending") return;
      moveAsset(asset, "discarded");
      log("Asset discarded.", "error");
      emit();
    },

    async publishNow(assetId: string) {
      const asset = state.assets.find((item) => item.id === assetId);
      if (!asset || asset.stage !== "approved") return;

      const result = await publishAsset(asset);
      if (!result.ok) {
        log(result.message, "error");
        emit();
        return;
      }

      moveAsset(asset, "published");
      state = { ...state, activeStage: "insights", selectedAssetId: asset.id };
      log("Asset published.");
      emit();
    },

    getMissionHandoffs() {
      return state.missionHandoffs;
    },

    getProductIntelSnapshot() {
      return state.productIntelSnapshot;
    },

    getControlPlane() {
      return state.controlPlane;
    }
  };
}
