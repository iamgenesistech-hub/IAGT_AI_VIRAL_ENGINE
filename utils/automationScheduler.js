/**
 * EVICS Automation Scheduler
 * Runs periodic intelligence tasks: viral scan, profit audit, library cleanup, executive report.
 * Imported and started by backend/server.js on startup.
 */

const TASKS = [
  { name: "viral-scan",              intervalMs: 4  * 60 * 60 * 1000,      label: "Viral Trend Scan (4h)"           },
  { name: "profit-audit",            intervalMs: 24 * 60 * 60 * 1000,      label: "Profit Audit (daily)"            },
  { name: "library-cleanup",         intervalMs: 24 * 60 * 60 * 1000,      label: "Library Cleanup (daily)"         },
  { name: "auto-promote-experiments",intervalMs: 24 * 60 * 60 * 1000,      label: "Auto-Promote Experiments (daily)"},
  { name: "executive-report",        intervalMs: 7  * 24 * 60 * 60 * 1000, label: "Executive Report (weekly)"       },
];

const taskLog = [];

function logTask(name, status, detail = "") {
  const entry = { name, status, detail, ts: new Date().toISOString() };
  taskLog.push(entry);
  if (taskLog.length > 200) taskLog.shift();
  console.log(`[EVICS Scheduler] ${entry.ts} | ${name} | ${status}${detail ? " | " + detail : ""}`);
  return entry;
}

async function runTask(name, serverBaseUrl) {
  logTask(name, "started");
  try {
    const endpointMap = {
      "viral-scan":               "/api/agents/trend-scout/scan",
      "profit-audit":             "/api/agent/profit-audit",
      "library-cleanup":          "/api/agent/library-cleanup",
      "auto-promote-experiments": "/api/agent/auto-promote-experiments",
      "executive-report":         "/api/agent/executive-report",
    };
    const endpoint = endpointMap[name];
    if (!endpoint) { logTask(name, "skipped", "no endpoint mapped"); return; }

    const isGet = name === "executive-report";
    const url = `${serverBaseUrl}${endpoint}`;
    const res = await fetch(url, { method: isGet ? "GET" : "POST",
      headers: { "Content-Type": "application/json" } });
    const text = await res.text();
    logTask(name, res.ok ? "success" : "http-error", res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}: ${text.slice(0, 120)}`);
  } catch (err) {
    logTask(name, "error", err.message);
  }
}

function startScheduler(serverBaseUrl = "http://localhost:3000") {
  console.log("[EVICS Scheduler] Starting automation scheduler…");
  for (const task of TASKS) {
    // Run once shortly after startup (staggered), then on interval
    const startDelay = 30000 + TASKS.indexOf(task) * 10000;
    setTimeout(() => {
      runTask(task.name, serverBaseUrl);
      setInterval(() => runTask(task.name, serverBaseUrl), task.intervalMs);
    }, startDelay);
    console.log(`[EVICS Scheduler] Registered: ${task.label}`);
  }
}

function getSchedulerLog() {
  return taskLog;
}

// Legacy compat
function runScheduledTask(taskName, cadence) {
  return { taskName, cadence, status: "Scheduled", timestamp: new Date().toISOString() };
}

module.exports = { startScheduler, getSchedulerLog, runScheduledTask };
