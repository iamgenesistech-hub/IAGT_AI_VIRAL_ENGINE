/**
 * EVICS Crypto Payment System
 * Handles Bitcoin + crypto payouts to affiliates.
 * Primary: Coinbase Commerce API (no custody — direct to affiliate wallet)
 * Secondary: BTCPay Server (self-hosted)
 * Also supports: USDC, ETH, USD via PayPal
 *
 * Flow: Admin approves payout → EVICS creates crypto invoice/transfer →
 *       Funds route to affiliate BTC wallet → TX hash recorded for audit
 */

"use strict";

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BTC_PRICE_CACHE_FILE = path.join(__dirname, "btc-price-cache.local.json");

// ---- BTC Price Cache (refreshes every 5 min) ----
let _btcPriceCache = { price: 65000, updatedAt: 0 };

async function getBtcPrice() {
  const now = Date.now();
  if (now - _btcPriceCache.updatedAt < 5 * 60 * 1000) return _btcPriceCache.price;

  try {
    const price = await fetchBtcPriceFromApi();
    if (price > 0) {
      _btcPriceCache = { price, updatedAt: now };
      fs.writeFileSync(BTC_PRICE_CACHE_FILE, JSON.stringify(_btcPriceCache));
    }
    return _btcPriceCache.price;
  } catch {
    return _btcPriceCache.price;
  }
}

async function fetchBtcPriceFromApi() {
  return new Promise((resolve) => {
    https.get("https://api.coinbase.com/v2/prices/BTC-USD/spot", {
      headers: { "CB-VERSION": "2016-02-18" },
    }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => {
        try { resolve(parseFloat(JSON.parse(data).data.amount)); } catch { resolve(0); }
      });
    }).on("error", () => resolve(0));
  });
}

// ---- Coinbase Commerce ----

class CoinbaseCommerceProvider {
  constructor(env = {}) {
    this.apiKey = env.COINBASE_COMMERCE_API_KEY;
  }

  isConfigured() { return Boolean(this.apiKey); }

  /**
   * Create a crypto charge (invoice) for an affiliate payout.
   * Affiliate receives a checkout link; they can pay via BTC, ETH, USDC.
   * NOTE: For OUTGOING payments, use direct wallet transfer instead.
   */
  async createCharge({ name, description, amount, currency = "USD" }) {
    const body = JSON.stringify({
      name,
      description,
      pricing_type: "fixed_price",
      local_price: { amount: String(amount), currency },
      metadata: { evics_payout: "true" },
    });

    return this._post("/charges", body);
  }

  /**
   * Send a direct crypto payout via Coinbase Commerce (business account).
   * Requires COINBASE_API_KEY and COINBASE_API_SECRET (different from Commerce).
   */
  async sendCryptoPayout({ toAddress, amountUsd, currency = "BTC", affiliateId, payoutId }) {
    // For production: use Coinbase Advanced Trade API or Coinbase Transfers
    // This creates the transfer record and queues it for manual or automated execution
    const btcPrice = await getBtcPrice();
    const btcAmount = (amountUsd / btcPrice).toFixed(8);

    return {
      queued: true,
      method: "btc_direct",
      toAddress,
      amountUsd,
      btcAmount: parseFloat(btcAmount),
      btcPrice,
      currency,
      affiliateId,
      payoutId,
      instructions: `Send ${btcAmount} BTC to ${toAddress} | Est. USD value: $${amountUsd}`,
      requiresManualApproval: amountUsd > 500, // Auto-approve under $500, manual above
    };
  }

  _post(path, body) {
    return new Promise((resolve) => {
      const req = https.request({
        hostname: "api.commerce.coinbase.com",
        path,
        method: "POST",
        headers: {
          "X-CC-Api-Key": this.apiKey,
          "X-CC-Version": "2018-03-22",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      }, (res) => {
        let data = "";
        res.on("data", (c) => { data += c; });
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({ error: data }); } });
      });
      req.on("error", (e) => resolve({ error: e.message }));
      req.write(body);
      req.end();
    });
  }
}

// ---- Payout Processor ----

/**
 * Process a payout request from the affiliate engine.
 * Returns detailed instructions for the payment method.
 */
async function processPayout({ payoutId, affiliateId, affiliateName, amount, method, destination, btcAddress, paypalEmail }) {
  const btcPrice = await getBtcPrice();

  const result = {
    payoutId,
    affiliateId,
    affiliateName,
    amount,
    method,
    status: "ready_to_send",
    processedAt: new Date().toISOString(),
    btcPrice,
  };

  if (method === "btc" || method === "bitcoin") {
    const btcAmount = (amount / btcPrice).toFixed(8);
    const walletAddress = btcAddress || destination;

    if (!walletAddress) {
      return { ...result, status: "failed", error: "No BTC wallet address on file. Affiliate must add their BTC address." };
    }

    result.btcAmount = parseFloat(btcAmount);
    result.walletAddress = walletAddress;
    result.instructions = `BTC Transfer: Send ${btcAmount} BTC to ${walletAddress}`;
    result.qrCode = `bitcoin:${walletAddress}?amount=${btcAmount}&label=${encodeURIComponent(affiliateName)}`;
    result.method = "btc";

    // If Coinbase Commerce is configured, use it
    const cbProvider = new CoinbaseCommerceProvider(process.env);
    if (cbProvider.isConfigured()) {
      const payoutData = await cbProvider.sendCryptoPayout({
        toAddress: walletAddress, amountUsd: amount, affiliateId, payoutId,
      });
      result.coinbaseData = payoutData;
    }
  } else if (method === "usdc") {
    const ethAddress = destination || btcAddress;
    result.usdcAmount = amount;
    result.walletAddress = ethAddress;
    result.instructions = `USDC Transfer: Send ${amount} USDC on Ethereum/Polygon to ${ethAddress}`;
  } else if (method === "paypal") {
    const email = paypalEmail || destination;
    result.paypalEmail = email;
    result.instructions = `PayPal: Send $${amount} USD to ${email}`;
    result.paypalLink = `https://www.paypal.com/myaccount/transfer/homepage/external/profile?country.x=US&locale.x=en_US`;
  } else {
    // USD / bank wire
    result.instructions = `USD Wire: $${amount} to affiliate bank account on file.`;
  }

  return result;
}

/**
 * Convert USD to BTC at current market rate.
 */
async function usdToBtc(usdAmount) {
  const price = await getBtcPrice();
  return { usd: usdAmount, btc: parseFloat((usdAmount / price).toFixed(8)), btcPrice: price };
}

/**
 * Get current BTC price and market stats.
 */
async function getMarketData() {
  const btcPrice = await getBtcPrice();
  return {
    btcUsd: btcPrice,
    updatedAt: new Date().toISOString(),
    note: "Price sourced from Coinbase public API",
  };
}

/**
 * Validate a Bitcoin wallet address (basic format check).
 */
function validateBtcAddress(address) {
  if (!address) return { valid: false, error: "No address provided." };
  // P2PKH (starts with 1), P2SH (starts with 3), Bech32 (starts with bc1)
  const valid = /^(1|3)[a-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(address);
  return valid ? { valid: true } : { valid: false, error: "Invalid Bitcoin address format." };
}

module.exports = {
  processPayout,
  getBtcPrice,
  usdToBtc,
  getMarketData,
  validateBtcAddress,
  CoinbaseCommerceProvider,
};
