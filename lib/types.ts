export type WorkspaceStage = "command" | "scanners" | "media" | "decisions" | "evidence" | "insights";

export type AssetStage =
  | "draft"
  | "queued"
  | "rendering"
  | "render_complete"
  | "render_failed"
  | "review_pending"
  | "approved"
  | "rework_requested"
  | "discarded"
  | "scheduled"
  | "published";

export interface CreativeQuality {
  hookStrength: number;
  pacing: number;
  ctaClarity: number;
  visualStyle: number;
  overall: number;
}

export interface CreativeAsset {
  id: string;
  title: string;
  script: string;
  stage: AssetStage;
  previewUrl?: string;
  downloadUrl?: string;
  quality?: CreativeQuality;
}

export interface ScannerFinding {
  id: string;
  assetId?: string;
  severity: "info" | "warning" | "critical";
  code?: string;
  category?: string;
  message: string;
  recommendation?: string;
  confidence?: number;
  source?: "rule" | "model";
  createdAt: string;
}

export interface ScannerSummary {
  healthScore: number;
  riskLevel: "low" | "medium" | "high";
  weightedRisk: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  recommendations: string[];
}

export interface ScannerReport {
  findings: ScannerFinding[];
  summary: ScannerSummary;
}

export interface ScannerState {
  enabled: boolean;
  status: "ready" | "running" | "complete" | "blocked";
  lastRunAt?: string;
  findings: ScannerFinding[];
  summary?: ScannerSummary;
}

export type WorkspaceAction =
  | "saveDraft"
  | "sendToRender"
  | "startRender"
  | "completeRender"
  | "failRender"
  | "approveAsset"
  | "requestRerender"
  | "discardAsset"
  | "publishNow";

export interface WorkspaceLog {
  id: string;
  message: string;
  level: "info" | "error";
  createdAt: string;
}

export interface DraftInput {
  title?: string;
  script: string;
}

export interface RenderCompleteInput {
  assetId: string;
  previewUrl: string;
  downloadUrl?: string;
  quality?: CreativeQuality;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  renderJobId?: string;
}
