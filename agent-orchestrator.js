const fs = require("fs");
const path = require("path");
const mediaOps = require("./media-ops");
const renderRouter = require("./render-provider-router");
const { runQualityCheck } = require("./quality-checker");
const eventBus = require("./agent-event-bus");
const agentContracts = require("./agent-contract-registry");
const agentEvaluator = require("./agent-evaluator");

const taskPath = path.join(__dirname, "agent-tasks.local.json");

function readTasks() {
  if (!fs.existsSync(taskPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(taskPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(taskPath, JSON.stringify(tasks, null, 2));
  return tasks;
}

function classify(command = "") {
  const lower = command.toLowerCase();
  if (/(status|report|evidence|connected|functional|working)/.test(lower)) return "System Status";
  if (/(video|render|heygen|runway|kling|canva|media)/.test(lower)) return "Rendering";
  if (/(scan|quality|review|approve|reject)/.test(lower)) return "Media Review";
  if (/(shopify|product|store|ads|campaign)/.test(lower)) return "EVICS";
  if (/(scrape|trend|viral|commercial)/.test(lower)) return "Commercial Scraper";
  return "EVIE";
}

function taskLog(task, status, detail) {
  task.stepLogs.push({ status, detail, at: new Date().toISOString() });
}

function inferNextAgent(task) {
  if (task.assignedModule === "Rendering") return task.outputMediaUrls.length ? "Quality Validator" : "Render Provider";
  if (task.assignedModule === "Media Review") return task.approvalStatus === "approved" ? "Publisher" : "Content Rewriter";
  if (task.assignedModule === "System Status") return "Board Ops";
  if (task.assignedModule === "Commercial Scraper") return "Product Intelligence";
  if (task.assignedModule === "EVICS") return "Campaign Forge";
  return "EVIE";
}

function buildTaskPacket(command, source, assignedModule) {
  const lower = String(command || "").toLowerCase();
  const requestedCount = Number((lower.match(/\b(\d+)\b/) || [])[1] || 1);
  return {
    objective: command,
    inputs: [
      `source:${source}`,
      `module:${assignedModule}`
    ],
    outputs: [],
    acceptanceCriteria: [
      "Provide an evidence-backed status update.",
      "Emit a next-agent handoff if work is incomplete.",
      "Capture errors, retries, and outputs in the task log."
    ],
    confidence: 0.8,
    requestedCount: Number.isFinite(requestedCount) ? requestedCount : 1
  };
}

function attachTaskEvent(task, lifecycle, status, detail, extra = {}) {
  const envelope = eventBus.createEnvelope({
    actor: task.source || "vp",
    source: "agent-orchestrator",
    channel: "task-lifecycle",
    type: "agent.task",
    lifecycle,
    status,
    message: detail,
    correlationId: task.taskId,
    payload: {
      taskId: task.taskId,
      sourceCommand: task.sourceCommand,
      assignedModule: task.assignedModule,
      step: detail,
      ...extra
    }
  });
  task.events = Array.isArray(task.events) ? task.events : [];
  task.events.push(envelope);
  task.events = task.events.slice(-50);
}

function createTask(command, source = "vp") {
  const assignedModule = classify(command);
  const taskId = `task-${Date.now()}`;
  const packet = buildTaskPacket(command, source, assignedModule);
  const baseHandoff = agentContracts.buildContract({
    contractId: taskId,
    taskId,
    sourceAgent: source,
    targetAgent: inferNextAgent({ assignedModule, outputMediaUrls: [], approvalStatus: "pending" }),
    domain: assignedModule,
    objective: command,
    confidence: packet.confidence,
    minimumConfidence: 0.72,
    inputs: packet.inputs,
    outputs: packet.outputs,
    acceptanceCriteria: packet.acceptanceCriteria,
    evidence: []
  });
  const task = {
    taskId,
    sourceCommand: command,
    source,
    assignedModule,
    handoff: baseHandoff,
    currentStatus: "created",
    stepLogs: [],
    errors: [],
    events: [],
    providerJobIds: [],
    outputMediaUrls: [],
    qualityScore: 0,
    approvalStatus: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  taskLog(task, "created", `Task assigned to ${task.assignedModule}.`);
  attachTaskEvent(task, "created", "info", `Task assigned to ${task.assignedModule}.`, { handoff: task.handoff });
  return task;
}

async function executeTask(task) {
  try {
    task.currentStatus = "running";
    taskLog(task, "running", "Backend orchestrator accepted command.");
    attachTaskEvent(task, "running", "info", "Backend orchestrator accepted command.");

    if (task.assignedModule === "Rendering") {
      const state = mediaOps.readState();
      let media = state.media[0];
      if (!media) {
        media = mediaOps.createMedia({
          title: "Agent Generated Video Output",
          mediaType: "video",
          createdSource: "agent",
          campaignId: "agent-generated",
          targetPlatforms: ["TikTok", "Instagram"]
        }, "agent-orchestrator");
        taskLog(task, "media.created", `Created media ${media.id}.`);
      }

      const provider = /runway/i.test(task.sourceCommand) ? "runway" : /kling/i.test(task.sourceCommand) ? "kling" : /canva/i.test(task.sourceCommand) ? "canva" : "heygen";
      const render = await renderRouter.submitRender(provider, { mediaId: media.id }, "agent-orchestrator");
      if (render.success) {
        task.providerJobIds.push(render.job.jobId);
        taskLog(task, render.job.status, `${render.job.provider} render job ${render.job.jobId} ${render.job.status}.`);
        attachTaskEvent(task, render.job.status, render.job.status === "completed" ? "success" : "info", `${render.job.provider} render job ${render.job.jobId} ${render.job.status}.`, {
          renderJobId: render.job.jobId,
          nextAgent: render.job.outputMediaUrl ? "Quality Validator" : "Render Provider"
        });
        if (render.job.outputMediaUrl) task.outputMediaUrls.push(render.job.outputMediaUrl);
      } else {
        task.errors.push(render.error);
        taskLog(task, "render.failed", render.error);
        attachTaskEvent(task, "failed", "error", render.error, { nextAgent: "Render Provider" });
      }
      if (!task.outputMediaUrls.length && !task.errors.length) {
        task.currentStatus = render.success && render.job.configured ? "awaiting_provider" : "needs_configuration";
        taskLog(task, task.currentStatus, "Render job is not complete until a real provider media URL is returned.");
        attachTaskEvent(task, task.currentStatus, "warning", "Render job is pending provider completion.", { nextAgent: "Render Provider" });
      }
    } else if (task.assignedModule === "Media Review") {
      const state = mediaOps.runScanner("agent-orchestrator");
      const media = state.media[0];
      if (media) {
        const quality = runQualityCheck(media);
        task.qualityScore = quality.qualityScore;
        task.approvalStatus = quality.status;
        taskLog(task, "quality.checked", `${quality.status} with score ${quality.qualityScore}.`);
        attachTaskEvent(task, "quality.checked", quality.status === "approved" ? "success" : "warning", `${quality.status} with score ${quality.qualityScore}.`, {
          nextAgent: quality.status === "approved" ? "Publisher" : "Content Rewriter"
        });
      }
    } else if (task.assignedModule === "System Status") {
      const state = mediaOps.readState();
      taskLog(task, "status.reported", `${state.media.length} media outputs, ${state.scanRuns.length} scanner runs, ${state.providerJobs.length} provider jobs.`);
      attachTaskEvent(task, "status.reported", "success", `${state.media.length} media outputs, ${state.scanRuns.length} scanner runs, ${state.providerJobs.length} provider jobs.`, { nextAgent: "Board Ops" });
    } else {
      mediaOps.seedDemoMedia("agent-orchestrator");
      taskLog(task, "workflow.updated", "Seeded or refreshed EVICS media workflow evidence.");
      attachTaskEvent(task, "workflow.updated", "info", "Seeded or refreshed EVICS media workflow evidence.", { nextAgent: "Campaign Forge" });
    }

    if (!["awaiting_provider", "needs_configuration"].includes(task.currentStatus)) {
      task.currentStatus = task.errors.length ? "needs_review" : "completed";
      task.completedAt = new Date().toISOString();
      taskLog(task, task.currentStatus, "Task execution finished.");
      task.handoff = agentContracts.buildContract({
        ...task.handoff,
        taskId: task.taskId,
        contractId: task.taskId,
        sourceAgent: task.source,
        targetAgent: task.errors.length ? inferNextAgent(task) : "Done",
        domain: task.assignedModule,
        objective: task.sourceCommand,
        confidence: task.errors.length ? 0.55 : 0.85,
        outputs: task.outputMediaUrls,
        blockers: task.errors,
        evidence: task.stepLogs.slice(-5),
        status: task.currentStatus,
        updatedAt: task.completedAt
      });
      const gated = agentEvaluator.gateHandoff(task.handoff, "agent-orchestrator");
      task.handoff = gated.handoff;
      task.handoffEvaluation = gated.evaluation;
      attachTaskEvent(task, task.currentStatus, task.errors.length ? "warning" : "success", "Task execution finished.", { handoff: task.handoff, evaluation: task.handoffEvaluation });
    }
  } catch (error) {
    task.currentStatus = "failed";
    task.errors.push(error.message || "Unknown orchestrator failure.");
    task.completedAt = new Date().toISOString();
    taskLog(task, "failed", task.errors[task.errors.length - 1]);
    task.handoff = agentContracts.buildContract({
      ...(task.handoff || {}),
      taskId: task.taskId,
      contractId: task.taskId,
      command: task.sourceCommand,
      sourceAgent: task.source,
      targetAgent: inferNextAgent(task),
      domain: task.assignedModule,
      nextAgent: inferNextAgent(task),
      blockers: task.errors,
      evidence: task.stepLogs.slice(-5),
      status: task.currentStatus,
      updatedAt: task.completedAt
    });
    const gated = agentEvaluator.gateHandoff(task.handoff, "agent-orchestrator");
    task.handoff = gated.handoff;
    task.handoffEvaluation = gated.evaluation;
    attachTaskEvent(task, "failed", "error", task.errors[task.errors.length - 1], { handoff: task.handoff, evaluation: task.handoffEvaluation });
  }
  return task;
}

async function command(command, source = "vp") {
  const tasks = readTasks();
  const task = await executeTask(createTask(command, source));
  tasks.unshift(task);
  writeTasks(tasks.slice(0, 200));
  return task;
}

async function retryTask(taskId) {
  const tasks = readTasks();
  const task = tasks.find((item) => item.taskId === taskId);
  if (!task) return null;
  const retried = await executeTask({ ...task, currentStatus: "retrying", errors: [], stepLogs: [...task.stepLogs] });
  const next = tasks.map((item) => item.taskId === taskId ? retried : item);
  writeTasks(next);
  return retried;
}

function cancelTask(taskId) {
  const tasks = readTasks();
  const task = tasks.find((item) => item.taskId === taskId);
  if (!task) return null;
  task.currentStatus = "cancelled";
  task.completedAt = new Date().toISOString();
  taskLog(task, "cancelled", "Task cancelled by owner/admin.");
  writeTasks(tasks);
  return task;
}

module.exports = {
  command,
  readTasks,
  retryTask,
  cancelTask
};
