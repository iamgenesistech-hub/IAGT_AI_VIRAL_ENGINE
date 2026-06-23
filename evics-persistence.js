const fs = require("fs");
const path = require("path");
const eventBus = require("./agent-event-bus");

const pipelineStatePath = process.env.EVICS_PIPELINE_STATE_PATH || path.join(__dirname, "evics-pipeline-state.local.json");

const collectionNames = [
  "media_assets",
  "render_jobs",
  "prompt_compiler_outputs",
  "delivery_records",
  "agent_events"
];

function defaultPipelineState() {
  return {
    media_assets: [],
    render_jobs: [],
    prompt_compiler_outputs: [],
    delivery_records: [],
    agent_events: [],
    updatedAt: new Date().toISOString()
  };
}

function readPipelineState() {
  if (!fs.existsSync(pipelineStatePath)) return defaultPipelineState();
  try {
    return {
      ...defaultPipelineState(),
      ...JSON.parse(fs.readFileSync(pipelineStatePath, "utf8"))
    };
  } catch (error) {
    return defaultPipelineState();
  }
}

function writePipelineState(state) {
  const next = { ...defaultPipelineState(), ...state, updatedAt: new Date().toISOString() };
  fs.writeFileSync(pipelineStatePath, JSON.stringify(next, null, 2));
  return next;
}

function upsertRecord(collection, record, idKey = "id") {
  assertCollection(collection);
  if (!record || !record[idKey]) throw new Error(`Cannot upsert ${collection} without ${idKey}.`);
  const state = readPipelineState();
  const now = new Date().toISOString();
  const current = Array.isArray(state[collection]) ? state[collection] : [];
  const index = current.findIndex((item) => item[idKey] === record[idKey]);
  const saved = {
    ...(index >= 0 ? current[index] : {}),
    ...record,
    updatedAt: now,
    createdAt: record.createdAt || (index >= 0 ? current[index].createdAt : now)
  };
  state[collection] = index >= 0
    ? current.map((item, itemIndex) => (itemIndex === index ? saved : item))
    : [saved, ...current];
  writePipelineState(state);
  return saved;
}

function appendRecord(collection, record) {
  assertCollection(collection);
  const state = readPipelineState();
  const now = new Date().toISOString();
  const saved = {
    id: record.id || `${collection}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...record,
    createdAt: record.createdAt || now,
    updatedAt: now
  };
  state[collection] = [saved, ...(Array.isArray(state[collection]) ? state[collection] : [])].slice(0, maxRecords(collection));
  writePipelineState(state);
  return saved;
}

function listRecords(collection, predicate = null) {
  assertCollection(collection);
  const records = readPipelineState()[collection] || [];
  return typeof predicate === "function" ? records.filter(predicate) : records;
}

function logAgentEvent(event = {}) {
  const envelope = eventBus.createEnvelope({
    actor: event.actor,
    source: event.source || "evics-runtime",
    channel: event.channel || "agent-bus",
    type: event.type,
    lifecycle: event.lifecycle,
    status: event.status,
    mediaId: event.mediaId,
    renderJobId: event.renderJobId || event.render_job_id,
    correlationId: event.correlationId,
    message: event.message,
    payload: event.payload || event.metadata || {}
  });

  return appendRecord("agent_events", {
    eventId: envelope.eventId,
    correlationId: envelope.correlationId,
    signature: envelope.signature,
    type: envelope.type,
    actor: envelope.actor,
    source: envelope.source,
    channel: envelope.channel,
    mediaId: envelope.mediaId,
    renderJobId: envelope.renderJobId,
    lifecycle: envelope.lifecycle,
    status: envelope.status,
    error_code: event.error_code || event.errorCode || "",
    message: envelope.message,
    metadata: envelope.payload,
    envelope
  });
}

function maxRecords(collection) {
  return collection === "agent_events" ? 1000 : 500;
}

function assertCollection(collection) {
  if (!collectionNames.includes(collection)) throw new Error(`Unknown EVICS collection: ${collection}`);
}

module.exports = {
  pipelineStatePath,
  readPipelineState,
  writePipelineState,
  upsertRecord,
  appendRecord,
  listRecords,
  logAgentEvent
};
