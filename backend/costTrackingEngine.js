// backend/costTrackingEngine.js
// EVICS HeyGen Cost Tracking Engine
// ─────────────────────────────────
// Tracks every dollar spent on HeyGen API calls so revenue vs COGS
// is always visible, and profit is never overstated.
//
// HeyGen billable operations (prices are configurable via env vars):
//   TALKING_PHOTO   — register affiliate photo as a HeyGen talking photo
//   PROOF_VIDEO     — short proof/preview video created during avatar setup
//   VOICE_CLONE     — clone the affiliate's voice from audio sample
//   VIDEO_GENERATE  — product video render (billed per minute of output)
//
// All costs are in USD cents to avoid floating-point issues.
// Actual HeyGen API plan pricing can vary — set env vars to match your invoice.

'use strict';

const path = require('path');
const fs = require('fs');

// ── Cost Rates (cents) — override via environment variables ──────────────────
// HeyGen Enterprise API approximate 2025 rates. Update to match your plan.

function cents(dollars) { return Math.round(dollars * 100); }

const HEYGEN_RATES = {
  // One-time cost per avatar photo registration (talking_photo API call)
  TALKING_PHOTO:      cents(parseFloat(process.env.HEYGEN_COST_TALKING_PHOTO      || '0.10')),
  // Short proof video generated during avatar creation (~5–10 seconds)
  PROOF_VIDEO:        cents(parseFloat(process.env.HEYGEN_COST_PROOF_VIDEO        || '0.05')),
  // Voice clone creation (one-time per avatar, Creator+ plan only)
  VOICE_CLONE:        cents(parseFloat(process.env.HEYGEN_COST_VOICE_CLONE        || '0.25')),
  // Per-minute of generated video (most product videos are 30–60 seconds)
  VIDEO_PER_MINUTE:   cents(parseFloat(process.env.HEYGEN_COST_VIDEO_PER_MINUTE  || '0.10')),
  // Assumed default video duration in seconds if actual duration is unknown
  DEFAULT_VIDEO_SECS: parseInt(process.env.HEYGEN_DEFAULT_VIDEO_SECONDS          || '45', 10),
};

// Convenience: compute video cost from duration
function videoGenerateCost(durationSeconds) {
  const mins = (durationSeconds || HEYGEN_RATES.DEFAULT_VIDEO_SECS) / 60;
  return Math.round(HEYGEN_RATES.VIDEO_PER_MINUTE * mins);
}

// ── Plan Revenue (cents/month) — mirrors stripeEngine.js PLANS ───────────────
const PLAN_REVENUE = {
  free:    0,
  creator: 2900,
  elite:   7900,
};

// ── Log storage ───────────────────────────────────────────────────────────────
// Primary store: GCS evics-data/cost_log.json (via persistenceEngine)
// Local fallback: generated/cost_log.json

const LOG_PATH = path.join(__dirname, '..', 'generated', 'cost_log.json');
let _costLog = null; // { entries: [], totalCentsSpent: 0, byAffiliate: {} }

function _ensureDir() {
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function _loadLog() {
  if (_costLog) return _costLog;
  try {
    _ensureDir();
    if (fs.existsSync(LOG_PATH)) {
      _costLog = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    }
  } catch {}
  if (!_costLog) _costLog = { entries: [], totalCentsSpent: 0, byAffiliate: {}, byOperation: {} };
  return _costLog;
}

function _saveLog() {
  try {
    _ensureDir();
    fs.writeFileSync(LOG_PATH, JSON.stringify(_costLog, null, 2));
  } catch {}
  // Async GCS write-through (non-blocking)
  try {
    const pe = require('./persistenceEngine');
    pe.gcsWrite('evics-data/cost_log.json', _costLog).catch(() => {});
  } catch {}
}

// ── Core logging function ─────────────────────────────────────────────────────

/**
 * Record a HeyGen API cost event.
 * @param {object} params
 * @param {string} params.operation   - TALKING_PHOTO | PROOF_VIDEO | VOICE_CLONE | VIDEO_GENERATE
 * @param {string} params.affiliateCode
 * @param {string} [params.jobId]     - videoJobId or avatarRequestId
 * @param {number} [params.durationSeconds] - for VIDEO_GENERATE
 * @param {string} [params.notes]
 */
function logCost({ operation, affiliateCode, jobId, durationSeconds, notes }) {
  const log = _loadLog();
  const code = String(affiliateCode || 'UNKNOWN').toUpperCase();

  let costCents;
  if (operation === 'VIDEO_GENERATE') {
    costCents = videoGenerateCost(durationSeconds);
  } else {
    costCents = HEYGEN_RATES[operation] || 0;
  }

  const entry = {
    id:        `cost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp:  new Date().toISOString(),
    operation,
    affiliateCode: code,
    jobId:     jobId || null,
    costCents,
    costDollars: (costCents / 100).toFixed(4),
    durationSeconds: durationSeconds || null,
    notes:     notes || null,
    rateSnapshot: {
      TALKING_PHOTO:    HEYGEN_RATES.TALKING_PHOTO,
      PROOF_VIDEO:      HEYGEN_RATES.PROOF_VIDEO,
      VOICE_CLONE:      HEYGEN_RATES.VOICE_CLONE,
      VIDEO_PER_MINUTE: HEYGEN_RATES.VIDEO_PER_MINUTE,
    },
  };

  log.entries.push(entry);
  log.totalCentsSpent = (log.totalCentsSpent || 0) + costCents;

  // Per-affiliate aggregation
  if (!log.byAffiliate[code]) log.byAffiliate[code] = { totalCents: 0, videoCount: 0, avatarCount: 0, voiceCloneCount: 0 };
  log.byAffiliate[code].totalCents += costCents;
  if (operation === 'VIDEO_GENERATE') log.byAffiliate[code].videoCount++;
  if (operation === 'TALKING_PHOTO' || operation === 'PROOF_VIDEO') log.byAffiliate[code].avatarCount++;
  if (operation === 'VOICE_CLONE') log.byAffiliate[code].voiceCloneCount++;

  // Per-operation aggregation
  if (!log.byOperation[operation]) log.byOperation[operation] = { totalCents: 0, count: 0 };
  log.byOperation[operation].totalCents += costCents;
  log.byOperation[operation].count++;

  _saveLog();

  console.log(`[CostTracker] ${operation} for ${code}${jobId ? ` (${jobId})` : ''}: $${(costCents / 100).toFixed(4)}`);
  return entry;
}

// ── Restore from GCS on startup ───────────────────────────────────────────────

async function restoreCostLogFromGcs() {
  try {
    const pe = require('./persistenceEngine');
    const remote = await pe.gcsRead('evics-data/cost_log.json');
    if (remote && remote.entries) {
      _costLog = remote;
      _saveLog(); // sync to local disk
      console.log(`[CostTracker] Restored ${remote.entries.length} cost entries from GCS`);
    }
  } catch {}
}

// ── Analytics ─────────────────────────────────────────────────────────────────

/**
 * Get full cost summary for admin dashboard.
 */
function getCostSummary() {
  const log = _loadLog();
  const totalSpentCents = log.totalCentsSpent || 0;

  // Compute current-month spend
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7); // "2025-07"
  const monthEntries = log.entries.filter(e => e.timestamp.startsWith(thisMonth));
  const monthCents = monthEntries.reduce((s, e) => s + e.costCents, 0);

  return {
    allTime: {
      totalSpentDollars: (totalSpentCents / 100).toFixed(2),
      totalSpentCents,
      entryCount: log.entries.length,
    },
    thisMonth: {
      month: thisMonth,
      totalSpentDollars: (monthCents / 100).toFixed(2),
      totalSpentCents: monthCents,
      entryCount: monthEntries.length,
    },
    byOperation: Object.entries(log.byOperation || {}).map(([op, data]) => ({
      operation: op,
      count: data.count,
      totalDollars: (data.totalCents / 100).toFixed(2),
      avgDollars: data.count ? ((data.totalCents / data.count) / 100).toFixed(4) : '0.0000',
    })),
    topAffiliates: Object.entries(log.byAffiliate || {})
      .sort(([, a], [, b]) => b.totalCents - a.totalCents)
      .slice(0, 20)
      .map(([code, data]) => ({
        affiliateCode: code,
        totalDollars: (data.totalCents / 100).toFixed(2),
        videoCount: data.videoCount,
        avatarCount: data.avatarCount,
        voiceCloneCount: data.voiceCloneCount,
      })),
    currentRates: {
      talkingPhoto:   `$${(HEYGEN_RATES.TALKING_PHOTO / 100).toFixed(2)}`,
      proofVideo:     `$${(HEYGEN_RATES.PROOF_VIDEO / 100).toFixed(2)}`,
      voiceClone:     `$${(HEYGEN_RATES.VOICE_CLONE / 100).toFixed(2)}`,
      videoPerMinute: `$${(HEYGEN_RATES.VIDEO_PER_MINUTE / 100).toFixed(2)}`,
      assumedVideoDuration: `${HEYGEN_RATES.DEFAULT_VIDEO_SECS}s`,
      estimatedCostPerVideo: `$${(videoGenerateCost(HEYGEN_RATES.DEFAULT_VIDEO_SECS) / 100).toFixed(4)}`,
    },
  };
}

/**
 * Get unit economics per plan tier.
 * Shows: revenue/subscriber, estimated HeyGen COGS, gross margin, break-even video count.
 */
function getUnitEconomics() {
  const log = _loadLog();

  // Average actual cost per video from log
  const videoOps = log.byOperation?.VIDEO_GENERATE;
  const avgVideoCents = videoOps?.count
    ? Math.round(videoOps.totalCents / videoOps.count)
    : videoGenerateCost(HEYGEN_RATES.DEFAULT_VIDEO_SECS);

  // Average avatar cost (talking photo + proof video per avatar creation)
  const tpCents = HEYGEN_RATES.TALKING_PHOTO + HEYGEN_RATES.PROOF_VIDEO;
  const vcCents = HEYGEN_RATES.VOICE_CLONE;

  const plans = {
    free: {
      planName: 'Free',
      monthlyRevenueCents: 0,
      videosIncluded: 2,
      avatarsIncluded: 1,
      voiceCloneIncluded: false,
    },
    creator: {
      planName: 'Creator',
      monthlyRevenueCents: PLAN_REVENUE.creator,
      videosIncluded: 20,
      avatarsIncluded: 3,
      voiceCloneIncluded: true,
    },
    elite: {
      planName: 'Elite',
      monthlyRevenueCents: PLAN_REVENUE.elite,
      videosIncluded: 100, // practical max for elite (unlimited but estimate for economics)
      avatarsIncluded: 5,
      voiceCloneIncluded: true,
    },
  };

  return Object.entries(plans).map(([planId, p]) => {
    const videosCogs = p.videosIncluded * avgVideoCents;
    const avatarCogs = p.avatarsIncluded * tpCents;
    const voiceCogs  = p.voiceCloneIncluded ? p.avatarsIncluded * vcCents : 0;
    const totalCogsCents = videosCogs + avatarCogs + voiceCogs;
    const grossProfitCents = p.monthlyRevenueCents - totalCogsCents;
    const marginPct = p.monthlyRevenueCents > 0
      ? ((grossProfitCents / p.monthlyRevenueCents) * 100).toFixed(1)
      : 'N/A';

    // Break-even: how many videos until costs consume all revenue
    const breakEvenVideos = avgVideoCents > 0 && p.monthlyRevenueCents > 0
      ? Math.floor((p.monthlyRevenueCents - avatarCogs - voiceCogs) / avgVideoCents)
      : 0;

    return {
      planId,
      planName: p.planName,
      monthlyRevenue: `$${(p.monthlyRevenueCents / 100).toFixed(2)}`,
      heygenCogs: `$${(totalCogsCents / 100).toFixed(2)}`,
      heygenCogsBreakdown: {
        videos: `$${(videosCogs / 100).toFixed(2)} (${p.videosIncluded} × $${(avgVideoCents / 100).toFixed(4)})`,
        avatars: `$${(avatarCogs / 100).toFixed(2)} (${p.avatarsIncluded} × $${(tpCents / 100).toFixed(2)})`,
        voiceClones: `$${(voiceCogs / 100).toFixed(2)}`,
      },
      grossProfit: `$${(grossProfitCents / 100).toFixed(2)}`,
      grossMarginPct: marginPct === 'N/A' ? 'N/A' : `${marginPct}%`,
      breakEvenVideos,
      note: planId === 'free'
        ? `Free tier costs you $${(totalCogsCents / 100).toFixed(2)}/subscriber/month — covered by paid-tier margin and virality value.`
        : grossProfitCents < 0
          ? `⚠️ UNDERWATER at current usage assumptions. Consider raising price or reducing video limit.`
          : `Profitable at ${p.videosIncluded} videos/month. Break-even at ${breakEvenVideos} videos.`,
    };
  });
}

/**
 * Get cost breakdown for a specific affiliate.
 */
function getAffiliateCosts(affiliateCode) {
  const code = String(affiliateCode || '').toUpperCase();
  const log = _loadLog();
  const entries = log.entries.filter(e => e.affiliateCode === code);
  const totalCents = entries.reduce((s, e) => s + e.costCents, 0);
  return {
    affiliateCode: code,
    totalDollars: (totalCents / 100).toFixed(2),
    entryCount: entries.length,
    entries: entries.slice(-50), // last 50 entries
    byOperation: entries.reduce((acc, e) => {
      if (!acc[e.operation]) acc[e.operation] = { count: 0, totalCents: 0 };
      acc[e.operation].count++;
      acc[e.operation].totalCents += e.costCents;
      return acc;
    }, {}),
  };
}

module.exports = {
  HEYGEN_RATES,
  logCost,
  getCostSummary,
  getUnitEconomics,
  getAffiliateCosts,
  restoreCostLogFromGcs,
  videoGenerateCost,
};
