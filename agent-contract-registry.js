"use strict";

const fs = require("fs");
const path = require("path");

const eventBus = require("./agent-event-bus");
const persistence = require("./evics-persistence");

const REGISTRY_PATH = path.join(__dirname, "agent-contract-registry.local.json");
const SCHEMA_VERSION = 1;

function nowIso() {
  return new Date().toISOString();
}

function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    contracts: {},
    handoffs: [],
    evaluations: [],
    updatedAt: nowIso()
  };
}

function readState() {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) return defaultState();
    return {
      ...defaultState(),
      ...JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"))
    };
  } catch {
    return defaultState();
  }
}

function writeState(state) {
  const next = {
    ...defaultState(),
    ...state,
    updatedAt: nowIso()
  };
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function buildContract(input = {}) {
  const now = nowIso();
  const contractId = String(input.contractId || input.handoffId || `contract-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`);
  return {
    contractId,
    taskId: String(input.taskId || input.missionId || input.renderJobId || ""),
    sourceAgent: String(input.sourceAgent || input.fromAgent || input.actor || "system"),
    targetAgent: String(input.targetAgent || input.nextAgent || input.toAgent || ""),
    domain: String(input.domain || input.assignedModule || input.topic || "general"),
    objective: String(input.objective || input.command || "").trim(),
    status: String(input.status || "created"),
    confidence: Number.isFinite(Number(input.confidence)) ? Number(input.confidence) : 0,
    minimumConfidence: Number.isFinite(Number(input.minimumConfidence)) ? Number(input.minimumConfidence) : 0.72,
    inputs: normalizeList(input.inputs),
    outputs: normalizeList(input.outputs),
    evidence: Array.isArray(input.evidence) ? input.evidence : [],
    blockers: normalizeList(input.blockers),
    acceptanceCriteria: normalizeList(input.acceptanceCriteria),
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
    evaluatedBy: String(input.evaluatedBy || ""),
    evaluatedAt: String(input.evaluatedAt || ""),
    createdAt: String(input.createdAt || now),
    updatedAt: String(input.updatedAt || now)
  };
}

function validateContract(contract = {}) {
  const errors = [];
  const required = [
    ["contractId", contract.contractId],
    ["taskId", contract.taskId],
    ["sourceAgent", contract.sourceAgent],
    ["targetAgent", contract.targetAgent],
    ["objective", contract.objective],
    ["status", contract.status],
    ["confidence", contract.confidence],
    ["evidence", contract.evidence],
    ["acceptanceCriteria", contract.acceptanceCriteria],
    ["createdAt", contract.createdAt],
    ["updatedAt", contract.updatedAt]
  ];

  for (const [key, value] of required) {
    if (value === undefined || value === null || (typeof value === "string" && !String(value).trim())) {
      errors.push(`missing_${key}`);
    }
  }

  if (!["created", "approved", "blocked", "completed"].includes(String(contract.status || ""))) {
    errors.push("invalid_status");
  }

  const confidence = Number(contract.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    errors.push("invalid_confidence_range");
  }

  if (!Array.isArray(contract.evidence)) {
    errors.push("invalid_evidence_type");
  }

  if (!Array.isArray(contract.acceptanceCriteria) || !contract.acceptanceCriteria.length) {
    errors.push("invalid_acceptance_criteria");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function recordEvaluation(contract, evaluation) {
  const state = readState();
  const normalizedContract = buildContract(contract);
  const saved = {
    contractId: normalizedContract.contractId,
    taskId: normalizedContract.taskId,
    sourceAgent: normalizedContract.sourceAgent,
    targetAgent: normalizedContract.targetAgent,
    domain: normalizedContract.domain,
    objective: normalizedContract.objective,
    confidence: normalizedContract.confidence,
    minimumConfidence: normalizedContract.minimumConfidence,
    evidenceCount: Array.isArray(normalizedContract.evidence) ? normalizedContract.evidence.length : 0,
    evaluation: evaluation || null,
    status: evaluation?.decision === "approved" ? "approved" : "blocked",
    createdAt: normalizedContract.createdAt,
    updatedAt: nowIso()
  };

  state.evaluations.unshift(saved);
  state.evaluations = state.evaluations.slice(0, 250);
  state.contracts[saved.contractId] = { ...normalizedContract, evaluation, status: saved.status, updatedAt: saved.updatedAt };
  writeState(state);
  return saved;
}

function recordHandoff(contract, evaluation) {
  const state = readState();
  const normalizedContract = buildContract(contract);
  const saved = {
    contractId: normalizedContract.contractId,
    taskId: normalizedContract.taskId,
    sourceAgent: normalizedContract.sourceAgent,
    targetAgent: normalizedContract.targetAgent,
    domain: normalizedContract.domain,
    objective: normalizedContract.objective,
    status: evaluation?.decision === "approved" ? "approved" : "blocked",
    confidence: normalizedContract.confidence,
    minimumConfidence: normalizedContract.minimumConfidence,
    evidence: Array.isArray(normalizedContract.evidence) ? normalizedContract.evidence : [],
    blockers: Array.isArray(normalizedContract.blockers) ? normalizedContract.blockers : [],
    acceptanceCriteria: Array.isArray(normalizedContract.acceptanceCriteria) ? normalizedContract.acceptanceCriteria : [],
    evaluation: evaluation || null,
    metadata: normalizedContract.metadata || {},
    createdAt: normalizedContract.createdAt,
    updatedAt: nowIso()
  };

  state.handoffs.unshift(saved);
  state.handoffs = state.handoffs.slice(0, 500);
  state.contracts[saved.contractId] = { ...normalizedContract, evaluation, status: saved.status, updatedAt: saved.updatedAt };
  writeState(state);
  persistence.logAgentEvent({
    actor: normalizedContract.sourceAgent,
    source: "agent-contract-registry",
    channel: "handoff-registry",
    type: "agent.handoff",
    lifecycle: saved.status,
    status: saved.status === "approved" ? "success" : "warning",
    correlationId: normalizedContract.taskId || normalizedContract.contractId,
    message: `${normalizedContract.sourceAgent} -> ${normalizedContract.targetAgent} ${saved.status}.`,
    payload: {
      contractId: normalizedContract.contractId,
      taskId: normalizedContract.taskId,
      sourceAgent: normalizedContract.sourceAgent,
      targetAgent: normalizedContract.targetAgent,
      objective: normalizedContract.objective,
      evaluation: evaluation || null
    }
  });
  return saved;
}

function listHandoffs(limit = 25) {
  const state = readState();
  return state.handoffs.slice(0, Math.max(1, Math.min(Number(limit) || 25, 250)));
}

function listEvaluations(limit = 25) {
  const state = readState();
  return state.evaluations.slice(0, Math.max(1, Math.min(Number(limit) || 25, 250)));
}

function summarizeRegistry() {
  const state = readState();
  const approved = state.handoffs.filter((item) => item.status === "approved").length;
  const blocked = state.handoffs.filter((item) => item.status === "blocked").length;
  return {
    totalContracts: Object.keys(state.contracts).length,
    approved,
    blocked,
    recentHandoffs: state.handoffs.slice(0, 10),
    recentEvaluations: state.evaluations.slice(0, 10),
    updatedAt: state.updatedAt
  };
}

module.exports = {
  REGISTRY_PATH,
  SCHEMA_VERSION,
  readState,
  writeState,
  buildContract,
  validateContract,
  recordEvaluation,
  recordHandoff,
  listHandoffs,
  listEvaluations,
  summarizeRegistry
};
