const crypto = require("crypto");

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix = "evt") {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(5).toString("hex")}`;
}

function getSecret() {
  return (
    process.env.EVICS_AGENT_EVENT_SECRET ||
    process.env.EVICS_AGENT_TOKEN ||
    process.env.TWIN_AGENT_API_KEY ||
    ""
  );
}

function hashPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload || {})).digest("hex");
}

function signEnvelope(envelope) {
  const secret = getSecret();
  if (!secret) return "unsigned";
  const signInput = [
    envelope.eventId,
    envelope.correlationId,
    envelope.timestamp,
    envelope.actor,
    envelope.type,
    envelope.lifecycle,
    envelope.status,
    envelope.payloadHash
  ].join("|");
  return crypto.createHmac("sha256", secret).update(signInput).digest("hex");
}

function createEnvelope(event = {}) {
  const payload = event.payload || event.metadata || {};
  const envelope = {
    version: "1.0",
    eventId: event.eventId || randomId("event"),
    correlationId: event.correlationId || randomId("corr"),
    timestamp: event.timestamp || nowIso(),
    actor: event.actor || "system",
    source: event.source || "evics",
    channel: event.channel || "agent-bus",
    type: event.type || "event",
    lifecycle: event.lifecycle || "unknown",
    status: event.status || "info",
    mediaId: event.mediaId || "",
    renderJobId: event.renderJobId || "",
    message: event.message || "",
    payload,
    payloadHash: hashPayload(payload)
  };
  envelope.signature = signEnvelope(envelope);
  return envelope;
}

function verifyEnvelope(envelope = {}) {
  if (!envelope.signature || envelope.signature === "unsigned") {
    return { ok: false, reason: "unsigned" };
  }
  const expected = signEnvelope(envelope);
  return {
    ok: expected === envelope.signature,
    reason: expected === envelope.signature ? "ok" : "signature_mismatch"
  };
}

function normalizeIncomingEvent(input = {}) {
  return {
    actor: input.actor,
    source: input.source,
    channel: input.channel,
    type: input.type,
    lifecycle: input.lifecycle,
    status: input.status,
    mediaId: input.mediaId,
    renderJobId: input.renderJobId,
    correlationId: input.correlationId,
    message: input.message,
    payload: input.payload || input.metadata || {}
  };
}

function buildHandoffPacket(input = {}) {
  return {
    taskId: input.taskId || "",
    command: input.command || "",
    source: input.source || "vp",
    assignedModule: input.assignedModule || "EVIE",
    nextAgent: input.nextAgent || "",
    objective: input.objective || input.command || "",
    inputs: Array.isArray(input.inputs) ? input.inputs : [],
    outputs: Array.isArray(input.outputs) ? input.outputs : [],
    acceptanceCriteria: Array.isArray(input.acceptanceCriteria) ? input.acceptanceCriteria : [],
    blockers: Array.isArray(input.blockers) ? input.blockers : [],
    evidence: Array.isArray(input.evidence) ? input.evidence : [],
    confidence: Number.isFinite(Number(input.confidence)) ? Number(input.confidence) : 0,
    status: input.status || "created",
    createdAt: input.createdAt || nowIso(),
    updatedAt: input.updatedAt || nowIso()
  };
}

module.exports = {
  createEnvelope,
  verifyEnvelope,
  normalizeIncomingEvent,
  randomId,
  buildHandoffPacket
};
