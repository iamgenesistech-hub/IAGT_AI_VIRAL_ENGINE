"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LEARNING_FILE = path.join(__dirname, "render-learning-loop.local.json");

function loadLearningState() {
  if (!fs.existsSync(LEARNING_FILE)) {
    return { createdAt: new Date().toISOString(), reports: [], counters: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(LEARNING_FILE, "utf8"));
  } catch {
    return { createdAt: new Date().toISOString(), reports: [], counters: {} };
  }
}

function saveLearningState(state) {
  fs.writeFileSync(LEARNING_FILE, JSON.stringify(state, null, 2));
}

function classifyFailure(errorCode = "", errorMessage = "", media = {}) {
  const code = String(errorCode || "").toUpperCase();
  const msg = String(errorMessage || "").toLowerCase();

  if (/AUTH|TOKEN|401|403/.test(code) || /unauthor|auth|token|credential/.test(msg)) return "auth_failure";
  if (/MISSING_MEDIA_URL|MISSING_PREVIEW|NOT_CONFIGURED/.test(code) || /missing media|missing preview|missing playback|payload/.test(msg)) return "configuration_failure";
  if (/QUALITY|COMPLIANCE|POLICY|REWORK/.test(code) || /quality|compliance|policy|rework|direction/.test(msg)) return "quality_failure";
  if (/TIMEOUT|POLL|RATE|NETWORK|SERVER|RENDER_SUBMIT/.test(code) || /timeout|network|rate limit|server/.test(msg)) return "provider_transient";

  const maybeDirectionLeak = String(media.metadata_json?.spokenScript || media.description || "").match(/on-screen line|scene instruction|camera instruction|\[[0-9]+-[0-9]+s\]/i);
  if (maybeDirectionLeak) return "script_direction_leak";

  return "unknown_failure";
}

function buildFixPlan(category, media = {}, errorCode = "", errorMessage = "") {
  const productName = String(media.metadata_json?.productName || media.title || "product");
  const sourceUrl = String(media.metadata_json?.sourceViralUrl || "");
  const productImageUrl = String(media.metadata_json?.productImageUrl || "");

  const common = [
    "Re-run H.A.V.E gate before submit (Hook, Alignment, Verified compliance, Evidence).",
    "Sanitize spokenScript to remove direction/stage notes before provider submit.",
    "Force duration target to 30 seconds for elite platform fit.",
    "Attach explicit CTA in final 8-10 seconds.",
  ];

  let provider = "heygen";
  let priority = "high";
  let actions = [...common];

  if (category === "auth_failure") {
    priority = "critical";
    actions = [
      "Stop retries immediately.",
      "Refresh provider credentials and validate with readiness check endpoint.",
      "Requeue after credentials are verified.",
      ...common,
    ];
  } else if (category === "configuration_failure") {
    actions = [
      "Ensure provider payload includes avatar/voice or a valid payload template.",
      "Ensure product image mockup URL is injected into background fields.",
      "Ensure sourceViralUrl and productImageUrl evidence fields are present.",
      ...common,
    ];
  } else if (category === "quality_failure" || category === "script_direction_leak") {
    actions = [
      "Rewrite script into spoken-only narration and move scene directions to directorNotes.",
      "Inject FDA/compliance disclaimer where required.",
      "Run quality checker and require score >= 92 before approve/publish.",
      ...common,
    ];
  } else if (category === "provider_transient") {
    actions = [
      "Retry with cooldown and jitter to avoid provider throttling.",
      "If second provider poll fails, switch to fallback provider profile.",
      ...common,
    ];
  }

  const normalizedSpokenScript = [
    `${productName} supports a stronger daily routine with consistent use.`,
    sourceUrl ? `Inspired by viral proof reference: ${sourceUrl}.` : "Use proven hook + proof + CTA format.",
    "Shop now to learn more and start your routine today.",
  ].join(" ");

  return {
    category,
    priority,
    suggestedProvider: provider,
    mustHaveEvidence: {
      sourceViralUrl: Boolean(sourceUrl),
      productImageUrl: Boolean(productImageUrl),
      productName: Boolean(productName),
    },
    secondPassPatch: {
      metadata_json: {
        aiFailureCategory: category,
        aiFailureCode: String(errorCode || ""),
        aiFailureMessage: String(errorMessage || ""),
        aiSuggestedProvider: provider,
        aiNormalizedSpokenScript: normalizedSpokenScript,
        aiDirectorNotes: [
          `Keep ${productName} visible in hook, proof, CTA sections.`,
          "Narration must contain spoken-only text. No production directions.",
          "Use 30-second pacing. CTA in final 8-10 seconds.",
        ],
        aiSecondPassRequired: true,
        aiRetryReason: "second_pass_targeted_fix",
      },
      description: normalizedSpokenScript,
    },
    actions,
  };
}

function analyzeFailure(media = {}, renderJob = {}, context = {}) {
  const errorCode = String(renderJob.error_code || media.error_code || media.render_metadata_json?.errorCode || "");
  const errorMessage = String(renderJob.error || media.last_render_error || media.render_metadata_json?.error || "");
  const category = classifyFailure(errorCode, errorMessage, media);
  const fixPlan = buildFixPlan(category, media, errorCode, errorMessage);

  const report = {
    id: `RFI-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    mediaId: String(media.id || ""),
    renderJobId: String(renderJob.jobId || renderJob.id || media.render_job_id || ""),
    category,
    status: "analyzed",
    priority: fixPlan.priority,
    errorCode,
    errorMessage,
    createdAt: new Date().toISOString(),
    actor: context.actor || "ai-render-failure-brain",
    missionId: context.missionId || null,
    fixPlan,
  };

  const state = loadLearningState();
  state.reports.unshift(report);
  state.reports = state.reports.slice(0, 2000);
  state.counters[category] = Number(state.counters[category] || 0) + 1;
  saveLearningState(state);

  return report;
}

function getLearningReports(options = {}) {
  const state = loadLearningState();
  let reports = [...state.reports];

  if (options.mediaId) reports = reports.filter((r) => r.mediaId === options.mediaId);
  if (options.category) reports = reports.filter((r) => r.category === options.category);
  if (options.missionId) reports = reports.filter((r) => r.missionId === options.missionId);

  reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));

  return {
    counters: state.counters || {},
    total: reports.length,
    reports: reports.slice(0, limit),
  };
}

module.exports = {
  analyzeFailure,
  getLearningReports,
};
