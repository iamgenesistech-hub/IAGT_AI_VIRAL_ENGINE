import type { CreativeAsset, ScannerFinding, ScannerReport } from "./types";

const FDA_DISCLAIMER = "These statements have not been evaluated by the Food and Drug Administration.";

interface RuleResult {
  finding: ScannerFinding;
  weight: number;
}

function createFinding(
  assetId: string | undefined,
  severity: ScannerFinding["severity"],
  code: string,
  message: string,
  recommendation: string,
  confidence: number,
  source: ScannerFinding["source"]
): ScannerFinding {
  return {
    id: `finding-${code}-${assetId || "workspace"}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    assetId,
    severity,
    code,
    category: code.split("_")[0] || "general",
    message,
    recommendation,
    confidence,
    source,
    createdAt: new Date().toISOString()
  };
}

function evaluateRules(asset: CreativeAsset): RuleResult[] {
  const out: RuleResult[] = [];
  const script = String(asset.script || "").trim();
  const scriptLower = script.toLowerCase();

  if (!script) {
    out.push({
      weight: 40,
      finding: createFinding(
        asset.id,
        "critical",
        "content_missing_script",
        `${asset.title} is missing script content and cannot advance safely.`,
        "Add core script copy, then re-run scanner.",
        0.99,
        "rule"
      )
    });
  }

  if (asset.stage === "render_failed") {
    out.push({
      weight: 22,
      finding: createFinding(
        asset.id,
        "warning",
        "pipeline_render_failed",
        `${asset.title} failed rendering and is waiting for retry triage.`,
        "Inspect provider error and resubmit render with fallback provider if needed.",
        0.95,
        "rule"
      )
    });
  }

  if (asset.stage === "review_pending" && !asset.previewUrl) {
    out.push({
      weight: 35,
      finding: createFinding(
        asset.id,
        "critical",
        "pipeline_missing_preview",
        `${asset.title} is blocked: review pending without preview URL.`,
        "Attach provider preview URL before review.",
        0.98,
        "rule"
      )
    });
  }

  if (asset.stage === "approved" && !asset.downloadUrl) {
    out.push({
      weight: 8,
      finding: createFinding(
        asset.id,
        "info",
        "delivery_missing_download",
        `${asset.title} is approved but has no download URL captured yet.`,
        "Persist a provider download URL for archival delivery evidence.",
        0.82,
        "rule"
      )
    });
  }

  if (script && !/(buy now|shop now|learn more|order now|explore)/i.test(script)) {
    out.push({
      weight: 10,
      finding: createFinding(
        asset.id,
        "warning",
        "content_missing_cta",
        `${asset.title} script lacks a clear call-to-action.`,
        "Add one explicit CTA in the final lines.",
        0.9,
        "rule"
      )
    });
  }

  if (/(supplement|wellness|health|recovery)/i.test(scriptLower) && !script.includes(FDA_DISCLAIMER)) {
    out.push({
      weight: 12,
      finding: createFinding(
        asset.id,
        "warning",
        "compliance_missing_disclaimer",
        `${asset.title} may require an FDA disclaimer for wellness claims.`,
        `Include required disclaimer: \"${FDA_DISCLAIMER}\"`,
        0.88,
        "rule"
      )
    });
  }

  return out;
}

function qualitativeAssessment(asset: CreativeAsset): RuleResult[] {
  const script = String(asset.script || "").trim();
  if (!script) return [];

  const findings: RuleResult[] = [];
  const firstLine = script.split(/\n|\./)[0] || "";

  if (firstLine.length < 28) {
    findings.push({
      weight: 6,
      finding: createFinding(
        asset.id,
        "info",
        "quality_hook_short",
        `${asset.title} opener may be too short to establish a strong hook.`,
        "Expand opening line with pain point + transformation cue.",
        0.7,
        "model"
      )
    });
  }

  if (script.length > 750) {
    findings.push({
      weight: 7,
      finding: createFinding(
        asset.id,
        "warning",
        "quality_script_long",
        `${asset.title} script may be too long for short-form retention.`,
        "Trim script to a tighter 120-250 word narrative.",
        0.76,
        "model"
      )
    });
  }

  return findings;
}

function severityRank(severity: ScannerFinding["severity"]): number {
  if (severity === "critical") return 3;
  if (severity === "warning") return 2;
  return 1;
}

function weightedRiskPoints(result: RuleResult): number {
  const confidence = Math.min(1, Math.max(0, Number(result.finding.confidence || 0)));
  return Math.round(result.weight * (0.6 + confidence * 0.4));
}

function reduceFindingsNoise(results: RuleResult[]): RuleResult[] {
  const bestByKey = new Map<string, RuleResult>();

  for (const result of results) {
    const key = `${result.finding.assetId || "workspace"}:${result.finding.code}`;
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, result);
      continue;
    }
    const existingRank = severityRank(existing.finding.severity);
    const nextRank = severityRank(result.finding.severity);
    if (nextRank > existingRank) {
      bestByKey.set(key, result);
      continue;
    }
    if (nextRank === existingRank && Number(result.finding.confidence || 0) > Number(existing.finding.confidence || 0)) {
      bestByKey.set(key, result);
    }
  }

  const deduped = Array.from(bestByKey.values());
  return deduped.filter((result) => {
    if (result.finding.severity !== "info") return true;
    if (Number(result.finding.confidence || 0) < 0.74) return false;
    const sameAsset = deduped.filter((candidate) => candidate.finding.assetId === result.finding.assetId);
    const hasHigherSeverity = sameAsset.some((candidate) => severityRank(candidate.finding.severity) >= 2);
    return !hasHigherSeverity;
  });
}

export function runWorkspaceScanner(assets: CreativeAsset[]): ScannerReport {
  const findings: ScannerFinding[] = [];
  let riskPoints = 0;

  for (const asset of assets) {
    const ruleResults = evaluateRules(asset);
    const modelResults = qualitativeAssessment(asset);
    const mergedResults = reduceFindingsNoise([...ruleResults, ...modelResults]);
    mergedResults.forEach((result) => {
      findings.push(result.finding);
      riskPoints += weightedRiskPoints(result);
    });
  }

  if (!findings.length) {
    findings.push(
      createFinding(
        undefined,
        "info",
        "workspace_clear",
        assets.length
          ? "Scanner pass complete. No critical or warning issues detected."
          : "Scanner ready. Create or import media to begin monitoring.",
        assets.length ? "Keep scanner cadence active." : "Generate your first media asset.",
        0.95,
        "rule"
      )
    );
  }

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;
  const boundedRisk = Math.min(95, riskPoints);
  const healthScore = Math.max(5, 100 - boundedRisk);
  const riskLevel = criticalCount > 0 ? "high" : warningCount > 1 ? "medium" : "low";

  return {
    findings,
    summary: {
      healthScore,
      riskLevel,
      weightedRisk: boundedRisk,
      criticalCount,
      warningCount,
      infoCount,
      recommendations: findings
        .filter((finding) => finding.recommendation)
        .slice(0, 6)
        .map((finding) => finding.recommendation as string)
    }
  };
}
