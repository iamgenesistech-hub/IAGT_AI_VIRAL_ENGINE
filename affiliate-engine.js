/**
 * EVICS Affiliate Engine
 * Full affiliate and influencer management system.
 *
 * Features:
 * - Affiliate registration, profiles, tiers
 * - Product assignment & content matching
 * - Commission tracking & earnings ledger
 * - Crypto (Bitcoin) + USD payout support
 * - Performance-based tier progression
 * - Referral links with EVICS-managed routing
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const AFFILIATES_FILE = path.join(__dirname, "affiliates.local.json");
const COMMISSIONS_FILE = path.join(__dirname, "commissions.local.json");
const PAYOUTS_FILE = path.join(__dirname, "payouts.local.json");

// ---- Tier Definitions (VIRAL TRACK) ----
const TIERS = {
  starter: {
    name: "Starter",
    minSales: 0,
    maxSales: 999,
    commissionRate: 0.07,
    bonusRate: 0,
    badge: "🌱",
    perks: ["Basic product access", "Standard content library"],
  },
  growth: {
    name: "Growth",
    minSales: 1000,
    maxSales: 4999,
    commissionRate: 0.10,
    bonusRate: 0.01,
    badge: "🚀",
    perks: ["Priority content access", "Early product drops", "Weekly performance reports"],
  },
  elite: {
    name: "Elite",
    minSales: 5000,
    maxSales: 24999,
    commissionRate: 0.12,
    bonusRate: 0.02,
    badge: "⭐",
    perks: ["All Growth perks", "Custom avatar creation", "1-on-1 strategy session"],
  },
  diamond: {
    name: "Diamond",
    minSales: 25000,
    maxSales: Infinity,
    commissionRate: 0.15,
    bonusRate: 0.03,
    badge: "💎",
    perks: ["All Elite perks", "Revenue share", "Bitcoin investment options", "Dedicated account manager"],
  },
};

// ---- Tier Definitions (HIGH-COMMISSION TRACK) ----
const HIGH_COMMISSION_TIERS = {
  starter: {
    name: "Starter",
    minSales: 0,
    maxSales: 4999,
    commissionRate: 0.40,
    bonusRate: 0.05,
    badge: "💰",
    perks: ["Access to 100+ premium products", "SaaS focus content", "Daily product updates"],
  },
  premium: {
    name: "Premium",
    minSales: 5000,
    maxSales: 24999,
    commissionRate: 0.50,
    bonusRate: 0.08,
    badge: "🏆",
    perks: ["Exclusive high-commission products", "Direct account manager", "Monthly strategy calls"],
  },
  platinum: {
    name: "Platinum",
    minSales: 25000,
    maxSales: 99999,
    commissionRate: 0.60,
    bonusRate: 0.12,
    badge: "👑",
    perks: ["All Premium perks", "Co-marketing opportunities", "Custom landing pages"],
  },
  partner: {
    name: "Partner",
    minSales: 100000,
    maxSales: Infinity,
    commissionRate: 0.70,
    bonusRate: 0.15,
    badge: "🌟",
    perks: ["All Platinum perks", "Revenue share", "Equity options", "C-level access"],
  },
};

// ---- I/O Helpers ----

function readFile(filePath, defaultVal = {}) {
  if (!fs.existsSync(filePath)) return defaultVal;
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { return defaultVal; }
}

function writeFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readAffiliates() {
  const data = readFile(AFFILIATES_FILE, { affiliates: [] });
  return data.affiliates || [];
}

function saveAffiliates(affiliates) {
  writeFile(AFFILIATES_FILE, { affiliates, updatedAt: new Date().toISOString() });
}

function readCommissions() {
  return readFile(COMMISSIONS_FILE, { commissions: [] }).commissions || [];
}

function saveCommissions(commissions) {
  writeFile(COMMISSIONS_FILE, { commissions, updatedAt: new Date().toISOString() });
}

function readPayouts() {
  return readFile(PAYOUTS_FILE, { payouts: [] }).payouts || [];
}

function savePayouts(payouts) {
  writeFile(PAYOUTS_FILE, { payouts, updatedAt: new Date().toISOString() });
}

// ---- Affiliate CRUD ----

/**
 * Register a new affiliate.
 * @param {string} track - "viral" or "high-commission"
 */
function registerAffiliate({
  name, email, phone, socialHandles = {}, paymentMethod = "btc", btcAddress = "", paypalEmail = "",
  niche = [], bio = "", referredBy = null, track = "viral",
}) {
  if (!name || !email) return { success: false, error: "Name and email are required." };

  const affiliates = readAffiliates();
  const exists = affiliates.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (exists) return { success: false, error: "Email already registered." };

  const id = "aff_" + crypto.randomBytes(6).toString("hex");
  const code = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() + Math.floor(Math.random() * 9000 + 1000);
  const now = new Date().toISOString();

  const affiliate = {
    id,
    name,
    email: email.toLowerCase(),
    phone: phone || "",
    code,
    track: track === "high-commission" ? "high-commission" : "viral",
    referralLink: `https://evics.store/join?ref=${code}`,
    socialHandles: {
      tiktok: socialHandles.tiktok || "",
      instagram: socialHandles.instagram || "",
      youtube: socialHandles.youtube || "",
      facebook: socialHandles.facebook || "",
      pinterest: socialHandles.pinterest || "",
    },
    niche,
    bio: bio || "",
    avatarUrl: "",
    avatarVideoUrl: "",
    tier: "starter",
    status: "active",
    paymentMethod,
    btcAddress,
    paypalEmail,
    usdBankDetails: {},
    totalSales: 0,
    totalEarnings: 0,
    paidOut: 0,
    pendingBalance: 0,
    assignedProducts: [],
    publishedPosts: [],
    preferredCategories: niche,
    referredBy,
    joinedAt: now,
    lastActiveAt: now,
    notes: "",
  };

  affiliates.push(affiliate);
  saveAffiliates(affiliates);

  return { success: true, affiliate };
}

/**
 * Get affiliate by ID or code.
 */
function getAffiliate(idOrCode) {
  const affiliates = readAffiliates();
  return affiliates.find((a) => a.id === idOrCode || a.code === idOrCode || a.email === idOrCode) || null;
}

/**
 * Update affiliate profile.
 */
function updateAffiliate(id, updates = {}) {
  const affiliates = readAffiliates();
  const idx = affiliates.findIndex((a) => a.id === id);
  if (idx === -1) return { success: false, error: "Affiliate not found." };

  const originalTrack = affiliates[idx].track || "viral";

  // Whitelist updatable fields
  const allowed = ["name", "phone", "socialHandles", "niche", "bio", "avatarUrl", "avatarVideoUrl",
    "paymentMethod", "btcAddress", "paypalEmail", "usdBankDetails", "notes", "status", "track", "preferredCategories"];
  allowed.forEach((key) => {
    if (updates[key] !== undefined) affiliates[idx][key] = updates[key];
  });

  // Normalize track updates and ensure tier belongs to the selected track.
  affiliates[idx].track = affiliates[idx].track === "high-commission" ? "high-commission" : "viral";
  if (affiliates[idx].track !== originalTrack) {
    const tierDefs = getTiersForTrack(affiliates[idx].track);
    if (!tierDefs[affiliates[idx].tier]) {
      affiliates[idx].tier = "starter";
    }
  }

  if (!Array.isArray(affiliates[idx].preferredCategories)) {
    affiliates[idx].preferredCategories = [];
  }

  affiliates[idx].lastActiveAt = new Date().toISOString();

  saveAffiliates(affiliates);
  return { success: true, affiliate: affiliates[idx] };
}

/**
 * Assign products to an affiliate for promotion.
 */
function assignProducts(affiliateId, productIds = []) {
  const affiliates = readAffiliates();
  const idx = affiliates.findIndex((a) => a.id === affiliateId);
  if (idx === -1) return { success: false, error: "Affiliate not found." };

  const existing = new Set(affiliates[idx].assignedProducts);
  productIds.forEach((id) => existing.add(id));
  affiliates[idx].assignedProducts = [...existing];
  affiliates[idx].lastActiveAt = new Date().toISOString();

  saveAffiliates(affiliates);
  return { success: true, assignedProducts: affiliates[idx].assignedProducts };
}

// ---- Commission Tracking ----

/**
 * Record a sale conversion for an affiliate.
 * Called when a referral link click results in a purchase.
 */
function recordSale({
  affiliateId, productId, productTitle, saleAmount, orderId = null, currency = "USD",
}) {
  const affiliates = readAffiliates();
  const idx = affiliates.findIndex((a) => a.id === affiliateId);
  if (idx === -1) return { success: false, error: "Affiliate not found." };

  const aff = affiliates[idx];
  const tier = TIERS[aff.tier] || TIERS.starter;
  const commissionEarned = parseFloat((saleAmount * tier.commissionRate).toFixed(2));
  const evicsShare = parseFloat((saleAmount * tier.evicsPayout || saleAmount * 0.07).toFixed(2));

  const commissionId = "com_" + crypto.randomBytes(6).toString("hex");
  const now = new Date().toISOString();

  const commission = {
    id: commissionId,
    affiliateId,
    affiliateName: aff.name,
    affiliateCode: aff.code,
    productId,
    productTitle,
    saleAmount,
    currency,
    commissionRate: tier.commissionRate,
    commissionEarned,
    evicsShare,
    orderId,
    status: "pending",     // pending → approved → paid
    createdAt: now,
    approvedAt: null,
    paidAt: null,
  };

  const commissions = readCommissions();
  commissions.push(commission);
  saveCommissions(commissions);

  // Update affiliate totals
  affiliates[idx].totalSales += saleAmount;
  affiliates[idx].pendingBalance += commissionEarned;

  // Check tier upgrade
  const newTier = getTierForSales(affiliates[idx].totalSales);
  if (newTier !== affiliates[idx].tier) {
    affiliates[idx].tier = newTier;
    console.log(`[AffEngine] ${aff.name} upgraded to tier: ${newTier}`);
  }

  affiliates[idx].lastActiveAt = now;
  saveAffiliates(affiliates);

  return { success: true, commission };
}

/**
 * Approve pending commissions for payout.
 */
function approveCommissions(affiliateId) {
  const commissions = readCommissions();
  let approved = 0;
  commissions.forEach((c) => {
    if (c.affiliateId === affiliateId && c.status === "pending") {
      c.status = "approved";
      c.approvedAt = new Date().toISOString();
      approved++;
    }
  });
  saveCommissions(commissions);
  return { success: true, approved };
}

// ---- Payout Management ----

/**
 * Request a payout for an affiliate.
 * Supports BTC, USDC, USD.
 */
function requestPayout(affiliateId, { method, amount, notes = "" } = {}) {
  const affiliates = readAffiliates();
  const idx = affiliates.findIndex((a) => a.id === affiliateId);
  if (idx === -1) return { success: false, error: "Affiliate not found." };

  const aff = affiliates[idx];
  const payoutAmount = amount || aff.pendingBalance;

  if (payoutAmount <= 0) return { success: false, error: "No pending balance available for payout." };
  if (payoutAmount > aff.pendingBalance) return { success: false, error: "Requested amount exceeds pending balance." };
  if (payoutAmount < 10) return { success: false, error: "Minimum payout is $10." };

  const payoutId = "pay_" + crypto.randomBytes(6).toString("hex");
  const payMethod = method || aff.paymentMethod || "btc";
  const now = new Date().toISOString();

  const payout = {
    id: payoutId,
    affiliateId,
    affiliateName: aff.name,
    amount: payoutAmount,
    currency: "USD",
    method: payMethod,         // btc | usdc | eth | usd | paypal
    destination: payMethod === "btc" ? aff.btcAddress : aff.paypalEmail,
    btcEquivalent: null,       // Calculated at processing time
    status: "requested",       // requested → processing → completed | failed
    notes,
    requestedAt: now,
    processedAt: null,
    txHash: null,               // Blockchain transaction hash
    coinbaseChargeId: null,     // If using Coinbase Commerce
  };

  const payouts = readPayouts();
  payouts.push(payout);
  savePayouts(payouts);

  // Deduct from pending balance
  affiliates[idx].pendingBalance -= payoutAmount;
  affiliates[idx].lastActiveAt = now;
  saveAffiliates(affiliates);

  return { success: true, payout };
}

// ---- Generate Affiliate Link ----

/**
 * Create a trackable affiliate link for a specific product.
 */
function generateAffiliateLink(affiliateId, productId, productUrl) {
  const aff = getAffiliate(affiliateId);
  if (!aff) return null;

  // Use EVICS tracking URL — EVICS gets paid first through this link
  const trackingUrl = `${process.env.EVICS_PUBLIC_BASE_URL || "https://evics.store"}/track?ref=${aff.code}&pid=${productId}`;
  return trackingUrl;
}

// ---- Leaderboard & Analytics ----

function getLeaderboard(limit = 20) {
  const affiliates = readAffiliates();
  return affiliates
    .filter((a) => a.status === "active")
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, limit)
    .map((a, i) => ({
      rank: i + 1,
      id: a.id,
      name: a.name,
      code: a.code,
      tier: a.tier,
      badge: TIERS[a.tier]?.badge || "🌱",
      totalSales: a.totalSales,
      totalEarnings: a.totalEarnings,
      pendingBalance: a.pendingBalance,
    }));
}

function getAffiliateStats(affiliateId) {
  const aff = getAffiliate(affiliateId);
  if (!aff) return null;

  const commissions = readCommissions().filter((c) => c.affiliateId === affiliateId);
  const payouts = readPayouts().filter((p) => p.affiliateId === affiliateId);

  const tierInfo = TIERS[aff.tier] || TIERS.starter;
  const nextTier = getNextTier(aff.tier);
  const nextTierInfo = nextTier ? TIERS[nextTier] : null;
  const salesUntilNextTier = nextTierInfo ? Math.max(0, nextTierInfo.minSales - aff.totalSales) : 0;

  return {
    affiliate: aff,
    tier: { ...tierInfo, id: aff.tier },
    nextTier: nextTierInfo ? { ...nextTierInfo, id: nextTier, salesRequired: salesUntilNextTier } : null,
    commissions: {
      total: commissions.length,
      pending: commissions.filter((c) => c.status === "pending").length,
      approved: commissions.filter((c) => c.status === "approved").length,
      paid: commissions.filter((c) => c.status === "paid").length,
      totalEarned: commissions.reduce((sum, c) => sum + c.commissionEarned, 0),
    },
    payouts: {
      total: payouts.length,
      completed: payouts.filter((p) => p.status === "completed").length,
      totalPaid: payouts.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0),
    },
    recentCommissions: commissions.slice(-5).reverse(),
    recentPayouts: payouts.slice(-5).reverse(),
  };
}

// ---- Helpers ----

function getTierForSales(totalSales) {
  const tiers = Object.entries(TIERS).sort((a, b) => b[1].minSales - a[1].minSales);
  for (const [key, tier] of tiers) {
    if (totalSales >= tier.minSales) return key;
  }
  return "starter";
}

function getNextTier(currentTier) {
  const order = ["starter", "growth", "elite", "diamond"];
  const idx = order.indexOf(currentTier);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
}

function getAllAffiliates(status = null) {
  const affiliates = readAffiliates();
  return status ? affiliates.filter((a) => a.status === status) : affiliates;
}

// ---- Track-Aware Functions (NEW) ----

/**
 * Get tier definitions for a specific track
 */
function getTiersForTrack(track) {
  return track === "high-commission" ? HIGH_COMMISSION_TIERS : TIERS;
}

/**
 * Get current tier info for affiliate
 */
function getAffiliateCurrentTier(affiliateId) {
  const aff = getAffiliate(affiliateId);
  if (!aff) return null;

  const tierDefs = getTiersForTrack(aff.track);
  return tierDefs[aff.tier] || tierDefs.starter;
}

/**
 * Get recommended products for affiliate based on track and niche
 * @param {string} affiliateId
 * @param {number} limit
 */
function getRecommendedProducts(affiliateId, limit = 20) {
  const aff = getAffiliate(affiliateId);
  if (!aff) return [];

  // For now, return product IDs from assigned products
  // In full implementation, would call high-commission-products.js
  return aff.assignedProducts.slice(0, limit);
}

/**
 * Get track stats dashboard
 */
function getTrackStats(track) {
  const affiliates = readAffiliates().filter((a) => a.track === track);
  const totalSales = affiliates.reduce((sum, a) => sum + a.totalSales, 0);
  const totalEarnings = affiliates.reduce((sum, a) => sum + a.totalEarnings, 0);
  const activeCount = affiliates.filter((a) => a.status === "active").length;

  const tierBreakdown = {};
  const tierDefs = getTiersForTrack(track);
  Object.keys(tierDefs).forEach((tierName) => {
    tierBreakdown[tierName] = affiliates.filter((a) => a.tier === tierName).length;
  });

  return {
    track,
    totalAffiliates: affiliates.length,
    activeAffiliates: activeCount,
    totalSales,
    totalEarnings,
    averageSalesPerAffiliate: affiliates.length > 0 ? Math.round(totalSales / affiliates.length) : 0,
    tierBreakdown,
  };
}

module.exports = {
  registerAffiliate,
  getAffiliate,
  updateAffiliate,
  recordSale,
  approveCommissions,
  requestPayout,
  assignProducts,
  generateAffiliateLink,
  getLeaderboard,
  getAffiliateStats,
  getAllAffiliates,
  getTiersForTrack,
  getAffiliateCurrentTier,
  getRecommendedProducts,
  getTrackStats,
  TIERS,
  HIGH_COMMISSION_TIERS,
  AFFILIATES_FILE,
  COMMISSIONS_FILE,
  PAYOUTS_FILE,
};
