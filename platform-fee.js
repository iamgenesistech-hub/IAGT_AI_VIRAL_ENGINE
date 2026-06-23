/**
 * EVICS Platform Fee Engine
 *
 * Automatically deducts a 5% platform fee from every trading profit
 * made through the EVICS AI signal / wallet investment feature.
 *
 * Fee Policy (governed by Board of Directors):
 *  - Rate: 5% of NET profit on each closed winning trade
 *  - Trigger: Trade close event reported by affiliate
 *  - Destination: Company Profit Wallet (BTC or ETH)
 *  - Ledger: Immutable, append-only fee ledger
 *  - Withdrawal: Admin-only (requires EVICS_ADMIN_TOKEN env var)
 *
 * Revenue is split between:
 *  - Platform usage fee
 *  - Notification & signal delivery cost
 *  - Trading advice (AI + Buffett governance overhead)
 */

"use strict";

const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const FEE_LEDGER_FILE    = path.join(__dirname, "fee-ledger.local.json");
const PROFIT_WALLET_FILE = path.join(__dirname, "profit-wallet.local.json");

const PLATFORM_FEE_RATE = 0.05; // 5%
const SUPPORTED_CURRENCIES = ["BTC", "ETH", "USD"];

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function loadLedger() {
  if (!fs.existsSync(FEE_LEDGER_FILE)) return initLedger();
  try { return JSON.parse(fs.readFileSync(FEE_LEDGER_FILE, "utf8")); }
  catch { return initLedger(); }
}

function initLedger() {
  return {
    version: 1,
    feeRate: PLATFORM_FEE_RATE,
    createdAt: new Date().toISOString(),
    totalFeesCollectedUSD: 0,
    totalFeesCollectedBTC: 0,
    totalFeesCollectedETH: 0,
    entries: [],
  };
}

function saveLedger(data) {
  fs.writeFileSync(FEE_LEDGER_FILE, JSON.stringify(data, null, 2));
}

function loadWallet() {
  if (!fs.existsSync(PROFIT_WALLET_FILE)) return initWallet();
  try { return JSON.parse(fs.readFileSync(PROFIT_WALLET_FILE, "utf8")); }
  catch { return initWallet(); }
}

function initWallet() {
  return {
    version: 1,
    adminWalletBTC:  process.env.EVICS_PROFIT_WALLET_BTC  || null,
    adminWalletETH:  process.env.EVICS_PROFIT_WALLET_ETH  || null,
    preferredCurrency: process.env.EVICS_PROFIT_CURRENCY || "BTC",
    balanceBTC:  0,
    balanceETH:  0,
    balanceUSD:  0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    withdrawals: [],
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}

function saveWallet(data) {
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PROFIT_WALLET_FILE, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE FEE CALCULATION & RECORDING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the 5% platform fee on a given profit amount.
 * Returns { grossProfit, feeAmount, netProfit, feeRate }
 */
function calculateFee(grossProfitAmount, currency = "USD") {
  if (!grossProfitAmount || grossProfitAmount <= 0) {
    return { grossProfit: grossProfitAmount, feeAmount: 0, netProfit: grossProfitAmount, feeRate: PLATFORM_FEE_RATE };
  }
  const feeAmount  = +(grossProfitAmount * PLATFORM_FEE_RATE).toFixed(8);
  const netProfit  = +(grossProfitAmount - feeAmount).toFixed(8);
  return { grossProfit: +grossProfitAmount.toFixed(8), feeAmount, netProfit, feeRate: PLATFORM_FEE_RATE, currency };
}

/**
 * Record a platform fee transaction.
 * Called when an affiliate closes a profitable trade.
 *
 * @param {string} affiliateId
 * @param {object} trade  { asset, action, entryPrice, exitPrice, quantity, grossProfit, currency }
 * @returns {object} feeEntry
 */
function recordFee(affiliateId, trade = {}) {
  if (!affiliateId) throw new Error("affiliateId required");
  if (!trade.grossProfit || trade.grossProfit <= 0) {
    return { skipped: true, reason: "No profit — fee not applicable on losses" };
  }

  const calc = calculateFee(trade.grossProfit, trade.currency || "USD");

  const entry = {
    id:          `FEE-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    affiliateId,
    tradeAsset:  trade.asset     || "UNKNOWN",
    tradeAction: trade.action    || "UNKNOWN",
    entryPrice:  trade.entryPrice || 0,
    exitPrice:   trade.exitPrice  || 0,
    quantity:    trade.quantity   || 0,
    grossProfit: calc.grossProfit,
    feeAmount:   calc.feeAmount,
    netProfit:   calc.netProfit,
    feeRate:     PLATFORM_FEE_RATE,
    currency:    calc.currency,
    signalId:    trade.signalId  || null,
    status:      "collected",
    collectedAt: new Date().toISOString(),
    checksum:    crypto
      .createHash("sha256")
      .update(`${affiliateId}:${calc.feeAmount}:${calc.currency}:${Date.now()}`)
      .digest("hex"),
  };

  // Append to immutable ledger
  const ledger = loadLedger();
  ledger.entries.push(entry);

  // Update running totals
  const cur = (calc.currency || "USD").toUpperCase();
  if (cur === "USD") ledger.totalFeesCollectedUSD = +(ledger.totalFeesCollectedUSD + calc.feeAmount).toFixed(8);
  if (cur === "BTC") ledger.totalFeesCollectedBTC = +(ledger.totalFeesCollectedBTC + calc.feeAmount).toFixed(8);
  if (cur === "ETH") ledger.totalFeesCollectedETH = +(ledger.totalFeesCollectedETH + calc.feeAmount).toFixed(8);
  saveLedger(ledger);

  // Credit the profit wallet immediately
  creditProfitWallet(calc.feeAmount, calc.currency, entry.id);

  return { success: true, feeEntry: entry, calculation: calc };
}

/**
 * Credit the company profit wallet with a fee amount.
 * Internal — called automatically by recordFee().
 */
function creditProfitWallet(amount, currency, feeEntryId) {
  const wallet = loadWallet();
  const cur = (currency || "USD").toUpperCase();

  if (cur === "BTC") wallet.balanceBTC = +(wallet.balanceBTC + amount).toFixed(8);
  else if (cur === "ETH") wallet.balanceETH = +(wallet.balanceETH + amount).toFixed(8);
  else wallet.balanceUSD = +(wallet.balanceUSD + amount).toFixed(8);

  wallet.totalDeposited = +(wallet.totalDeposited + amount).toFixed(8);
  saveWallet(wallet);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN-ONLY OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify admin token. Must match EVICS_ADMIN_TOKEN environment variable.
 * Returns true if valid, throws if not.
 */
function verifyAdminToken(token) {
  const adminToken = process.env.EVICS_ADMIN_TOKEN || "";
  if (!adminToken.trim()) {
    throw new Error("EVICS_ADMIN_TOKEN is not configured. Set this env var to enable admin access.");
  }
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(String(token || "").trim().padEnd(64, "\0"));
  const b = Buffer.from(String(adminToken).trim().padEnd(64, "\0"));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Invalid admin token. Access denied.");
  }
  return true;
}

/**
 * Admin: configure the company profit wallet addresses.
 * Requires valid admin token.
 */
function setWalletAddresses(adminToken, { btcAddress, ethAddress, preferredCurrency } = {}) {
  verifyAdminToken(adminToken);

  const wallet = loadWallet();
  if (btcAddress)        wallet.adminWalletBTC = btcAddress;
  if (ethAddress)        wallet.adminWalletETH = ethAddress;
  if (preferredCurrency) wallet.preferredCurrency = preferredCurrency.toUpperCase();
  saveWallet(wallet);

  return {
    success: true,
    message: "Company profit wallet addresses updated",
    adminWalletBTC: wallet.adminWalletBTC,
    adminWalletETH: wallet.adminWalletETH,
    preferredCurrency: wallet.preferredCurrency,
  };
}

/**
 * Admin: request a withdrawal from the profit wallet.
 * Records the withdrawal in the ledger; actual on-chain transfer
 * must be executed manually or via connected exchange API.
 */
function requestWithdrawal(adminToken, { amount, currency, destinationAddress, reason } = {}) {
  verifyAdminToken(adminToken);

  const wallet = loadWallet();
  const cur = (currency || wallet.preferredCurrency || "BTC").toUpperCase();

  const available = cur === "BTC" ? wallet.balanceBTC
                  : cur === "ETH" ? wallet.balanceETH
                  : wallet.balanceUSD;

  if (!amount || amount <= 0) throw new Error("Withdrawal amount must be > 0");
  if (amount > available) {
    throw new Error(`Insufficient balance. Available: ${available} ${cur}, requested: ${amount} ${cur}`);
  }

  const destination = destinationAddress
    || (cur === "BTC" ? wallet.adminWalletBTC : wallet.adminWalletETH)
    || null;

  if (!destination) {
    throw new Error(`No ${cur} wallet address configured. Set via setWalletAddresses() first.`);
  }

  const withdrawal = {
    id:          `WD-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    amount,
    currency:    cur,
    destination,
    reason:      reason || "Admin withdrawal",
    status:      "pending",          // pending → confirmed (after on-chain verification)
    requestedAt: new Date().toISOString(),
    checksum:    crypto
      .createHash("sha256")
      .update(`${amount}:${cur}:${destination}:${Date.now()}`)
      .digest("hex"),
  };

  // Deduct from balance
  if (cur === "BTC") wallet.balanceBTC = +(wallet.balanceBTC - amount).toFixed(8);
  else if (cur === "ETH") wallet.balanceETH = +(wallet.balanceETH - amount).toFixed(8);
  else wallet.balanceUSD = +(wallet.balanceUSD - amount).toFixed(8);

  wallet.totalWithdrawn = +(wallet.totalWithdrawn + amount).toFixed(8);
  wallet.withdrawals.push(withdrawal);
  saveWallet(wallet);

  return { success: true, withdrawal };
}

/**
 * Admin: confirm a completed on-chain withdrawal.
 */
function confirmWithdrawal(adminToken, withdrawalId, txHash) {
  verifyAdminToken(adminToken);

  const wallet = loadWallet();
  const wd = wallet.withdrawals.find((w) => w.id === withdrawalId);
  if (!wd) throw new Error(`Withdrawal ${withdrawalId} not found`);

  wd.status    = "confirmed";
  wd.txHash    = txHash || null;
  wd.confirmedAt = new Date().toISOString();
  saveWallet(wallet);

  return { success: true, withdrawal: wd };
}

// ─────────────────────────────────────────────────────────────────────────────
// READ / QUERY (admin and affiliate-facing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get wallet balance summary (admin only).
 */
function getWalletBalance(adminToken) {
  verifyAdminToken(adminToken);
  const wallet = loadWallet();
  return {
    balanceBTC:        wallet.balanceBTC,
    balanceETH:        wallet.balanceETH,
    balanceUSD:        wallet.balanceUSD,
    totalDeposited:    wallet.totalDeposited,
    totalWithdrawn:    wallet.totalWithdrawn,
    adminWalletBTC:    wallet.adminWalletBTC,
    adminWalletETH:    wallet.adminWalletETH,
    preferredCurrency: wallet.preferredCurrency,
    lastUpdated:       wallet.lastUpdated,
  };
}

/**
 * Get fee ledger summary (admin only).
 */
function getFeeLedger(adminToken, { affiliateId, currency, startDate, endDate, limit = 200 } = {}) {
  verifyAdminToken(adminToken);

  const ledger  = loadLedger();
  let entries   = [...ledger.entries];

  if (affiliateId) entries = entries.filter((e) => e.affiliateId === affiliateId);
  if (currency)    entries = entries.filter((e) => e.currency === currency.toUpperCase());
  if (startDate)   entries = entries.filter((e) => new Date(e.collectedAt) >= new Date(startDate));
  if (endDate)     entries = entries.filter((e) => new Date(e.collectedAt) <= new Date(endDate));

  entries.sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));

  return {
    entries:             entries.slice(0, limit),
    total:               entries.length,
    totalFeesUSD:        ledger.totalFeesCollectedUSD,
    totalFeesBTC:        ledger.totalFeesCollectedBTC,
    totalFeesETH:        ledger.totalFeesCollectedETH,
    feeRate:             PLATFORM_FEE_RATE,
  };
}

/**
 * Get a single affiliate's fee history (affiliate-facing, no admin token needed).
 */
function getAffiliateFeeHistory(affiliateId, limit = 50) {
  if (!affiliateId) throw new Error("affiliateId required");
  const ledger = loadLedger();
  const entries = ledger.entries
    .filter((e) => e.affiliateId === affiliateId)
    .sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt))
    .slice(0, limit);

  return {
    affiliateId,
    entries,
    totalFeesPaid: entries.reduce((s, e) => s + (e.feeAmount || 0), 0),
    feeRate: PLATFORM_FEE_RATE,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  PLATFORM_FEE_RATE,
  calculateFee,
  recordFee,
  setWalletAddresses,
  requestWithdrawal,
  confirmWithdrawal,
  getWalletBalance,
  getFeeLedger,
  getAffiliateFeeHistory,
  verifyAdminToken,
};
