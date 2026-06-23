/**
 * EVICS Trading Education & Certification System
 *
 * Curated video curriculum from YouTube and TradeAlgo.com
 * covering stock market fundamentals, options trading, risk management,
 * and value investing wisdom (Warren Buffett principles).
 *
 * Affiliates MUST complete all required modules and sign disclaimers
 * before gaining access to the trading/wallet investment features.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROGRESS_FILE  = path.join(__dirname, "trading-education-progress.local.json");
const COMPLETIONS_FILE = path.join(__dirname, "trading-education-completions.local.json");

// ─────────────────────────────────────────────────────────────────────────────
// CURATED VIDEO CURRICULUM
// ─────────────────────────────────────────────────────────────────────────────

const CURRICULUM = [
  // ── LEVEL 1: STOCK MARKET FUNDAMENTALS (REQUIRED) ────────────────────────
  {
    moduleId: "L1-01",
    level: 1,
    levelName: "Stock Market Fundamentals",
    required: true,
    title: "How the Stock Market Actually Works",
    source: "YouTube — The Plain Bagel",
    youtubeId: "p7HKvqRI_Bo",
    url: "https://www.youtube.com/watch?v=p7HKvqRI_Bo",
    duration: "11:54",
    topics: ["market mechanics", "buyers and sellers", "price discovery", "market orders"],
    description: "A concise, jargon-free explanation of how stock exchanges actually function, why prices move, and who sets them.",
    buffettAlignment: false,
  },
  {
    moduleId: "L1-02",
    level: 1,
    levelName: "Stock Market Fundamentals",
    required: true,
    title: "Stock Market For Beginners — How to Invest",
    source: "YouTube — Andrei Jikh",
    youtubeId: "gFQNPmLKj1k",
    url: "https://www.youtube.com/watch?v=gFQNPmLKj1k",
    duration: "17:06",
    topics: ["index funds", "ETFs", "diversification", "long-term investing"],
    description: "Clear introduction to investing philosophy: index funds, ETFs, compound interest, and why most people should start here.",
    buffettAlignment: true,
  },
  {
    moduleId: "L1-03",
    level: 1,
    levelName: "Stock Market Fundamentals",
    required: true,
    title: "Reading Stock Charts — A Beginner's Guide",
    source: "YouTube — Investopedia",
    youtubeId: "eynxyoKgpng",
    url: "https://www.youtube.com/watch?v=eynxyoKgpng",
    duration: "9:47",
    topics: ["candlestick charts", "support and resistance", "volume", "moving averages"],
    description: "How to read and interpret stock charts: candlesticks, trends, volume analysis, and basic technical indicators.",
    buffettAlignment: false,
  },
  {
    moduleId: "L1-04",
    level: 1,
    levelName: "Stock Market Fundamentals",
    required: true,
    title: "Warren Buffett — 'How Most People Should Invest'",
    source: "YouTube — CNBC Make It",
    youtubeId: "jhtaQ0HHgMQ",
    url: "https://www.youtube.com/watch?v=jhtaQ0HHgMQ",
    duration: "6:30",
    topics: ["value investing", "long-term thinking", "index funds", "Buffett philosophy"],
    description: "Warren Buffett personally explains his core investment philosophy and what ordinary investors should do with their money.",
    buffettAlignment: true,
    buffettWeight: 3,
  },

  // ── LEVEL 2: RISK MANAGEMENT (REQUIRED) ─────────────────────────────────
  {
    moduleId: "L2-01",
    level: 2,
    levelName: "Risk Management & Capital Protection",
    required: true,
    title: "Position Sizing & Risk Management",
    source: "YouTube — Rayner Teo",
    youtubeId: "6IakrMJAhAE",
    url: "https://www.youtube.com/watch?v=6IakrMJAhAE",
    duration: "14:11",
    topics: ["position sizing", "risk per trade", "stop loss", "risk-reward ratio"],
    description: "Critical skill: determining how much capital to risk per trade, setting stop losses, and calculating risk-reward ratios.",
    buffettAlignment: false,
  },
  {
    moduleId: "L2-02",
    level: 2,
    levelName: "Risk Management & Capital Protection",
    required: true,
    title: "Warren Buffett — 'Rule #1: Never Lose Money'",
    source: "YouTube — Investor Archive",
    youtubeId: "KlKNnGcBCNg",
    url: "https://www.youtube.com/watch?v=KlKNnGcBCNg",
    duration: "10:22",
    topics: ["capital preservation", "downside risk", "margin of safety", "patience"],
    description: "Buffett's first rule of investing and why capital preservation matters more than chasing gains. Essential mindset module.",
    buffettAlignment: true,
    buffettWeight: 3,
  },
  {
    moduleId: "L2-03",
    level: 2,
    levelName: "Risk Management & Capital Protection",
    required: true,
    title: "The Psychology of Trading — Avoiding Emotional Mistakes",
    source: "YouTube — Trading 212",
    youtubeId: "4AhR4FVvwuI",
    url: "https://www.youtube.com/watch?v=4AhR4FVvwuI",
    duration: "12:18",
    topics: ["FOMO", "fear and greed", "trading psychology", "emotional discipline"],
    description: "Understanding and overcoming the emotional biases that destroy most traders: FOMO, panic selling, overconfidence.",
    buffettAlignment: true,
  },

  // ── LEVEL 3: OPTIONS TRADING (REQUIRED FOR OPTIONS) ──────────────────────
  {
    moduleId: "L3-01",
    level: 3,
    levelName: "Options Trading Fundamentals",
    required: true,
    title: "Options Trading for Beginners — Complete Guide",
    source: "YouTube — InTheMoney",
    youtubeId: "4HMm6mBvGKE",
    url: "https://www.youtube.com/watch?v=4HMm6mBvGKE",
    duration: "18:14",
    topics: ["calls", "puts", "strike price", "expiration", "premium", "ITM/ATM/OTM"],
    description: "Complete beginner's guide to options: what calls and puts are, how they're priced, and the mechanics of options contracts.",
    buffettAlignment: false,
  },
  {
    moduleId: "L3-02",
    level: 3,
    levelName: "Options Trading Fundamentals",
    required: true,
    title: "The Greeks — Delta, Theta, Vega Explained Simply",
    source: "YouTube — InTheMoney",
    youtubeId: "kCJcEOikdkQ",
    url: "https://www.youtube.com/watch?v=kCJcEOikdkQ",
    duration: "15:33",
    topics: ["delta", "theta decay", "vega", "gamma", "options greeks"],
    description: "Understanding delta, theta, vega, and gamma — the key measures of how option prices change. Essential for any options trader.",
    buffettAlignment: false,
  },
  {
    moduleId: "L3-03",
    level: 3,
    levelName: "Options Trading Fundamentals",
    required: true,
    title: "Warren Buffett on Options and Derivatives",
    source: "YouTube — Berkshire Hathaway Annual Meeting",
    youtubeId: "l7n6nC5xwNs",
    url: "https://www.youtube.com/watch?v=l7n6nC5xwNs",
    duration: "8:44",
    topics: ["derivatives risk", "Buffett warning", "complexity risk", "financial weapons"],
    description: "Buffett's direct warning about derivatives and options — understanding the perspective of the world's greatest investor on these instruments.",
    buffettAlignment: true,
    buffettWeight: 3,
  },
  {
    moduleId: "L3-04",
    level: 3,
    levelName: "Options Trading Fundamentals",
    required: true,
    title: "Covered Calls & Cash Secured Puts — Safer Options Strategies",
    source: "YouTube — Tastytrade",
    youtubeId: "SD7sw0bf1ms",
    url: "https://www.youtube.com/watch?v=SD7sw0bf1ms",
    duration: "16:48",
    topics: ["covered calls", "cash-secured puts", "income generation", "defined risk"],
    description: "Conservative options strategies used by income investors: selling covered calls and cash-secured puts to generate consistent returns.",
    buffettAlignment: true,
  },

  // ── LEVEL 4: TRADEALGO PLATFORM TRAINING ─────────────────────────────────
  {
    moduleId: "L4-01",
    level: 4,
    levelName: "TradeAlgo Platform & AI Signals",
    required: true,
    title: "TradeAlgo Platform Overview — How AI Trading Signals Work",
    source: "TradeAlgo / YouTube",
    youtubeId: null,
    url: "https://www.youtube.com/@TradeAlgo",
    tradeAlgoUrl: "https://tradealgo.com/education",
    duration: "20:00",
    topics: ["AI signals", "platform navigation", "signal interpretation", "entry/exit timing"],
    description: "Official TradeAlgo platform walkthrough: understanding AI-generated signals, how to read them, and using them responsibly alongside your own research.",
    buffettAlignment: false,
    platformRequired: true,
  },
  {
    moduleId: "L4-02",
    level: 4,
    levelName: "TradeAlgo Platform & AI Signals",
    required: true,
    title: "Dark Pool Trading — Understanding Institutional Flow",
    source: "YouTube — TradeAlgo",
    youtubeId: "j5gS9hCNPXA",
    url: "https://www.youtube.com/watch?v=j5gS9hCNPXA",
    duration: "13:22",
    topics: ["dark pools", "institutional flow", "unusual options activity", "signal validation"],
    description: "Understanding how institutional money moves and how TradeAlgo's dark pool data gives retail traders an edge.",
    buffettAlignment: false,
  },
  {
    moduleId: "L4-03",
    level: 4,
    levelName: "TradeAlgo Platform & AI Signals",
    required: true,
    title: "Unusual Options Activity — Reading Big Money Moves",
    source: "YouTube — TradeAlgo",
    youtubeId: "tBQmr6Yc7Is",
    url: "https://www.youtube.com/watch?v=tBQmr6Yc7Is",
    duration: "11:50",
    topics: ["unusual options activity", "sweep orders", "put/call ratio", "smart money"],
    description: "How to identify and interpret unusual options activity as a leading indicator of institutional conviction.",
    buffettAlignment: false,
  },

  // ── LEVEL 5: VALUE INVESTING — WARREN BUFFETT MASTER CLASS ───────────────
  {
    moduleId: "L5-01",
    level: 5,
    levelName: "Warren Buffett Value Investing Masterclass",
    required: true,
    title: "Warren Buffett's Full Investment Strategy Explained",
    source: "YouTube — New Money",
    youtubeId: "wTtpFolHhFk",
    url: "https://www.youtube.com/watch?v=wTtpFolHhFk",
    duration: "22:15",
    topics: ["intrinsic value", "moat", "margin of safety", "long-term holding", "quality businesses"],
    description: "Comprehensive breakdown of Buffett's entire investment framework: how he identifies businesses, values them, and decides when to buy and hold.",
    buffettAlignment: true,
    buffettWeight: 3,
  },
  {
    moduleId: "L5-02",
    level: 5,
    levelName: "Warren Buffett Value Investing Masterclass",
    required: true,
    title: "Berkshire Hathaway Annual Meeting Highlights — Best of Buffett & Munger",
    source: "YouTube — CNBC",
    youtubeId: "PgKZ8KyGJVM",
    url: "https://www.youtube.com/watch?v=PgKZ8KyGJVM",
    duration: "28:41",
    topics: ["shareholder letters", "business quality", "management integrity", "long-term thinking"],
    description: "Highlights from Berkshire Hathaway annual meetings: Buffett and Munger answer investor questions on markets, business, and life.",
    buffettAlignment: true,
    buffettWeight: 3,
  },
  {
    moduleId: "L5-03",
    level: 5,
    levelName: "Warren Buffett Value Investing Masterclass",
    required: true,
    title: "The 7 Rules of Warren Buffett",
    source: "YouTube — Investor Center",
    youtubeId: "6xEOJIc2YXU",
    url: "https://www.youtube.com/watch?v=6xEOJIc2YXU",
    duration: "14:58",
    topics: ["circle of competence", "economic moat", "owner earnings", "management quality", "time horizon"],
    description: "Seven actionable rules distilled from decades of Buffett's letters and speeches. The principles that govern our platform's investment advice.",
    buffettAlignment: true,
    buffettWeight: 3,
  },
];

// Video counts and requirements
const REQUIRED_MODULES = CURRICULUM.filter((v) => v.required).length;
const TOTAL_LEVELS = 5;

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS TRACKING
// ─────────────────────────────────────────────────────────────────────────────

function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")) || {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

function loadCompletions() {
  if (!fs.existsSync(COMPLETIONS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(COMPLETIONS_FILE, "utf8")) || [];
  } catch {
    return [];
  }
}

function saveCompletions(data) {
  fs.writeFileSync(COMPLETIONS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Mark a single video as watched / completed by an affiliate.
 * Returns the updated progress object.
 */
function markVideoCompleted(affiliateId, moduleId, metadata = {}) {
  if (!affiliateId || !moduleId) throw new Error("affiliateId and moduleId required");

  const module = CURRICULUM.find((v) => v.moduleId === moduleId);
  if (!module) throw new Error(`Unknown module: ${moduleId}`);

  const progress = loadProgress();
  if (!progress[affiliateId]) {
    progress[affiliateId] = { completedModules: [], startedAt: new Date().toISOString() };
  }

  const already = progress[affiliateId].completedModules.find((c) => c.moduleId === moduleId);
  if (!already) {
    progress[affiliateId].completedModules.push({
      moduleId,
      completedAt: new Date().toISOString(),
      ipAddress: metadata.ipAddress || null,
      sessionToken: crypto.randomBytes(8).toString("hex"),
    });
  }

  progress[affiliateId].lastActivity = new Date().toISOString();
  saveProgress(progress);

  // Re-evaluate certification
  return evaluateCertification(affiliateId);
}

/**
 * Evaluate whether an affiliate has completed enough modules to be certified.
 * Returns { certified, levelReached, completedCount, requiredCount, remaining }
 */
function evaluateCertification(affiliateId) {
  const progress = loadProgress();
  const record = progress[affiliateId] || { completedModules: [] };
  const completed = new Set(record.completedModules.map((c) => c.moduleId));

  // Check each required module
  const requiredModules = CURRICULUM.filter((v) => v.required);
  const completedRequired = requiredModules.filter((v) => completed.has(v.moduleId));
  const remainingRequired = requiredModules.filter((v) => !completed.has(v.moduleId));

  // Determine highest level fully completed
  let levelReached = 0;
  for (let level = 1; level <= TOTAL_LEVELS; level++) {
    const levelModules = CURRICULUM.filter((v) => v.level === level && v.required);
    const allDone = levelModules.every((v) => completed.has(v.moduleId));
    if (allDone) levelReached = level;
    else break;
  }

  const certified = completedRequired.length === requiredModules.length;

  const result = {
    affiliateId,
    certified,
    levelReached,
    completedCount: completedRequired.length,
    requiredCount: requiredModules.length,
    remaining: remainingRequired.map((v) => ({
      moduleId: v.moduleId,
      level: v.level,
      levelName: v.levelName,
      title: v.title,
    })),
    completedAt: certified ? new Date().toISOString() : null,
  };

  // Issue certificate if newly certified
  if (certified) {
    issueCertificate(affiliateId, result);
  }

  return result;
}

/**
 * Permanently issue and store a certificate of completion.
 */
function issueCertificate(affiliateId, evaluationResult) {
  const completions = loadCompletions();
  const existing = completions.find((c) => c.affiliateId === affiliateId);
  if (existing) return; // Already certified

  const certificate = {
    id: `CERT-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    affiliateId,
    issuedAt: new Date().toISOString(),
    modulesCompleted: evaluationResult.completedCount,
    levelsCompleted: TOTAL_LEVELS,
    certificationLevel: "Certified EVICS Trader",
    tradingUnlocked: true,
    checksum: crypto
      .createHash("sha256")
      .update(`${affiliateId}:${evaluationResult.completedCount}:EVICS-CERT`)
      .digest("hex"),
  };

  completions.push(certificate);
  saveCompletions(completions);
  return certificate;
}

/**
 * Check whether an affiliate is cleared to use the trading/wallet feature.
 */
function isTradingUnlocked(affiliateId) {
  if (!affiliateId) return false;
  const completions = loadCompletions();
  return completions.some((c) => c.affiliateId === affiliateId && c.tradingUnlocked);
}

/**
 * Get the full curriculum list (optionally with affiliate progress overlaid).
 */
function getCurriculum(affiliateId = null) {
  if (!affiliateId) {
    return CURRICULUM.map((v) => ({
      ...v,
      completed: false,
      locked: v.level > 1,
    }));
  }

  const progress = loadProgress();
  const record = progress[affiliateId] || { completedModules: [] };
  const completed = new Set(record.completedModules.map((c) => c.moduleId));

  // Level is locked until all previous-level required modules are done
  const levelUnlocked = {};
  levelUnlocked[1] = true;
  for (let level = 2; level <= TOTAL_LEVELS; level++) {
    const prev = CURRICULUM.filter((v) => v.level === level - 1 && v.required);
    levelUnlocked[level] = prev.every((v) => completed.has(v.moduleId));
  }

  return CURRICULUM.map((v) => ({
    ...v,
    completed: completed.has(v.moduleId),
    locked: !levelUnlocked[v.level],
    completedAt: record.completedModules.find((c) => c.moduleId === v.moduleId)?.completedAt || null,
  }));
}

/**
 * Get affiliate training progress summary.
 */
function getAffiliateProgress(affiliateId) {
  const progress = loadProgress();
  const record = progress[affiliateId] || { completedModules: [], startedAt: null };
  const eval_ = evaluateCertification(affiliateId);
  const certificate = loadCompletions().find((c) => c.affiliateId === affiliateId) || null;

  // Group by level
  const byLevel = {};
  for (let l = 1; l <= TOTAL_LEVELS; l++) {
    const levelMods = CURRICULUM.filter((v) => v.level === l);
    const completedSet = new Set(record.completedModules.map((c) => c.moduleId));
    byLevel[l] = {
      levelName: levelMods[0]?.levelName || `Level ${l}`,
      total: levelMods.length,
      completed: levelMods.filter((v) => completedSet.has(v.moduleId)).length,
    };
  }

  return {
    affiliateId,
    startedAt: record.startedAt || null,
    lastActivity: record.lastActivity || null,
    completedModules: record.completedModules.length,
    requiredModules: REQUIRED_MODULES,
    certified: eval_.certified,
    levelReached: eval_.levelReached,
    certificate,
    byLevel,
    tradingUnlocked: isTradingUnlocked(affiliateId),
    remaining: eval_.remaining,
  };
}

/**
 * Get all affiliates who have completed certification (for admin reporting).
 */
function getCertifiedAffiliates() {
  return loadCompletions();
}

module.exports = {
  CURRICULUM,
  REQUIRED_MODULES,
  TOTAL_LEVELS,
  markVideoCompleted,
  evaluateCertification,
  isTradingUnlocked,
  getCurriculum,
  getAffiliateProgress,
  getCertifiedAffiliates,
  issueCertificate,
};
