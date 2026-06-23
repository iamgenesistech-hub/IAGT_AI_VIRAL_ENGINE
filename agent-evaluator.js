"use strict";

const registry = require("./agent-contract-registry");
const persistence = require("./evics-persistence");

const POLICY_PROFILES = {
  strict: {
    minimumConfidence: 0.9,
    minimumEvidenceScore: 3,
    requireAcceptanceCriteria: true,
    allowBlockers: false
  },
  balanced: {
    minimumConfidence: 0.72,
    minimumEvidenceScore: 2,
    requireAcceptanceCriteria: true,
    allowBlockers: false
  },
  aggressive: {
    minimumConfidence: 0.55,
    minimumEvidenceScore: 1,
    requireAcceptanceCriteria: false,
    allowBlockers: true
  }
};

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function scoreEvidence(evidence = []) {
  return evidence.reduce((score, item) => {
    if (typeof item === "string" && item.trim()) return score + 1;
    if (item && typeof item === "object") return score + 1.5;
    return score;
  }, 0);
}

function resolvePolicy(profileName = "balanced", override = {}) {
  const selected = String(profileName || "balanced").toLowerCase();
  const base = POLICY_PROFILES[selected] || POLICY_PROFILES.balanced;
  return {
    profile: selected in POLICY_PROFILES ? selected : "balanced",
    ...base,
    ...(override && typeof override === "object" ? override : {})
  };
}

function evaluateHandoff(contract = {}, options = {}) {
  const reasons = [];
  const evidence = Array.isArray(contract.evidence) ? contract.evidence : [];
  const confidence = Math.max(0, Math.min(1, toNumber(contract.confidence, 0)));
  const policy = resolvePolicy(options.profile || contract.policyProfile || process.env.EVICS_EVALUATOR_PROFILE || "balanced", options.policy || contract.policy || {});
  const minimumConfidence = Math.max(0, Math.min(1, toNumber(contract.minimumConfidence, policy.minimumConfidence)));
  const evidenceScore = scoreEvidence(evidence);
  const acceptanceCriteria = Array.isArray(contract.acceptanceCriteria) ? contract.acceptanceCriteria.filter(Boolean) : [];
  const blockers = Array.isArray(contract.blockers) ? contract.blockers.filter(Boolean) : [];

  if (!String(contract.taskId || "").trim()) reasons.push("missing_task_id");
  if (!String(contract.sourceAgent || "").trim()) reasons.push("missing_source_agent");
  if (!String(contract.targetAgent || "").trim()) reasons.push("missing_target_agent");
  if (!String(contract.objective || "").trim()) reasons.push("missing_objective");
  if (confidence < minimumConfidence) reasons.push("confidence_below_threshold");
  if (evidenceScore < Number(policy.minimumEvidenceScore || 2)) reasons.push("insufficient_evidence");
  if (policy.requireAcceptanceCriteria && !acceptanceCriteria.length) reasons.push("missing_acceptance_criteria");
  if (!policy.allowBlockers && blockers.length) reasons.push("blockers_present");

  const readinessScore = Math.round(Math.min(100, Math.max(0, confidence * 70 + Math.min(evidenceScore, 6) * 6 + acceptanceCriteria.length * 3 - blockers.length * 10)));
  const approved = reasons.length === 0;
  const evaluation = {
    decision: approved ? "approved" : "blocked",
    score: readinessScore,
    reasons,
    evidenceScore,
    confidence,
    minimumConfidence,
    policyProfile: policy.profile,
    evaluatedAt: new Date().toISOString(),
    evaluator: "agent-evaluator"
  };

  return evaluation;
}

function gateHandoff(contract = {}, actor = "agent-evaluator", options = {}) {
  const normalizedContract = registry.buildContract(contract);
  const evaluation = evaluateHandoff(normalizedContract, options);
  const saved = registry.recordEvaluation(normalizedContract, evaluation);
  const handoff = registry.recordHandoff(normalizedContract, evaluation);

  persistence.logAgentEvent({
    actor,
    source: "agent-evaluator",
    channel: "handoff-gate",
    type: "agent.handoff",
    lifecycle: evaluation.decision === "approved" ? "approved" : "blocked",
    status: evaluation.decision === "approved" ? "success" : "warning",
    correlationId: normalizedContract.taskId || normalizedContract.contractId,
    message: evaluation.decision === "approved" ? "Handoff approved." : "Handoff blocked.",
    payload: {
      contractId: normalizedContract.contractId,
      evaluation,
      handoff
    }
  });

  return {
    approved: evaluation.decision === "approved",
    evaluation,
    handoff,
    saved
  };
}

module.exports = {
  POLICY_PROFILES,
  resolvePolicy,
  evaluateHandoff,
  gateHandoff
};
