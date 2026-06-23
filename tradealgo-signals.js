/**
 * Tradealgo Trading Signals Integration
 * 
 * Integrates Tradealgo.com premier membership to disseminate trading advice,
 * signals, and investment opportunities to affiliates with active wallets.
 * 
 * Responsibilities:
 * - Connect to Tradealgo API with premier membership
 * - Fetch current trading signals (buy/sell alerts, asset classes)
 * - Format signals into affiliate notifications
 * - Broadcast to affiliates with active wallet addresses
 * - Track signal delivery and affiliate engagement
 * - Maintain 90-day signal history for audit/analysis
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const SIGNALS_HISTORY = path.join(__dirname, "tradealgo-signals-history.local.json");
const SIGNALS_SUBSCRIPTIONS = path.join(__dirname, "tradealgo-subscriptions.local.json");
const TRADING_WALLETS = path.join(__dirname, "affiliate-trading-wallets.local.json");

let tradealgoApiKey = null;
let tradealgoEndpoint = "https://api.tradealgo.com";
let isConnected = false;
let signalPollingInterval = null;

/**
 * Initialize trading wallets directory
 */
function initializeWalletRegistry() {
  return {
    wallets: [],
    lastUpdated: new Date().toISOString(),
    totalAffiliates: 0,
    activeWallets: 0,
  };
}

/**
 * Initialize subscriptions registry
 */
function initializeSubscriptions() {
  return {
    subscriptions: [],
    lastUpdated: new Date().toISOString(),
    totalSubscribers: 0,
  };
}

/**
 * Connect to Tradealgo API
 */
function connectTradealgo(apiKey, endpoint = "https://api.tradealgo.com") {
  try {
    if (!apiKey || apiKey.trim() === "") {
      console.warn("[Tradealgo] No API key provided. Set TRADEALGO_API_KEY environment variable.");
      return false;
    }

    tradealgoApiKey = apiKey;
    tradealgoEndpoint = endpoint || "https://api.tradealgo.com";
    isConnected = true;

    console.log(`[Tradealgo] Connected to ${tradealgoEndpoint}`);
    logSignalHistory({
      type: "CONNECTION",
      status: "success",
      endpoint: tradealgoEndpoint,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.error("[Tradealgo] Connection error:", err.message);
    return false;
  }
}

/**
 * Fetch trading signals from Tradealgo API
 */
async function fetchTradingSignals(options = {}) {
  return new Promise((resolve, reject) => {
    if (!isConnected) {
      return resolve({
        success: false,
        error: "Not connected to Tradealgo",
        signals: [],
      });
    }

    const {
      assetClass = "all", // "crypto", "stocks", "forex", "commodities", "all"
      signalType = "all", // "buy", "sell", "hold", "all"
      limit = 20,
      minConfidence = 70,
    } = options;

    const path = `/api/v1/signals?assetClass=${assetClass}&type=${signalType}&limit=${limit}&confidence=${minConfidence}`;
    const headers = {
      "Authorization": `Bearer ${tradealgoApiKey}`,
      "User-Agent": "EVICS-Tradealgo-Integration/1.0",
    };

    const url = new URL(tradealgoEndpoint + path);
    const httpsOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: "GET",
      headers,
    };

    const req = https.request(httpsOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200 && parsed.signals) {
            logSignalHistory({
              type: "SIGNALS_FETCHED",
              count: parsed.signals.length,
              assetClass,
              signalType,
              timestamp: new Date().toISOString(),
            });

            resolve({
              success: true,
              signals: parsed.signals || [],
              fetchedAt: new Date().toISOString(),
              options: { assetClass, signalType, limit, minConfidence },
            });
          } else {
            throw new Error(`API returned status ${res.statusCode}: ${data}`);
          }
        } catch (err) {
          console.error("[Tradealgo] Parse error:", err.message);
          resolve({
            success: false,
            error: err.message,
            signals: [],
            fetchedAt: new Date().toISOString(),
          });
        }
      });
    });

    req.on("error", (err) => {
      console.error("[Tradealgo] Request error:", err.message);
      resolve({
        success: false,
        error: err.message,
        signals: [],
        fetchedAt: new Date().toISOString(),
      });
    });

    req.end();
  });
}

/**
 * Format Tradealgo signal into affiliate notification
 */
function formatSignalNotification(signal, affiliateId) {
  return {
    type: "investment_signal",
    title: `${signal.action.toUpperCase()} Alert: ${signal.asset}`,
    body: `${signal.confidence}% confidence ${signal.action} signal for ${signal.asset} (${signal.assetClass})`,
    data: {
      signalId: signal.id,
      asset: signal.asset,
      assetClass: signal.assetClass,
      action: signal.action, // "buy", "sell", "hold"
      confidence: signal.confidence,
      entryPrice: signal.entryPrice,
      exitPrice: signal.exitPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      reasoning: signal.reasoning,
      timeframe: signal.timeframe, // "1h", "4h", "1d"
      generatedAt: signal.generatedAt,
      expiresAt: signal.expiresAt,
      tradingLink: signal.tradingLink,
    },
    priority: signal.confidence > 80 ? "high" : "normal",
    actionUrl: signal.tradingLink,
    expiresAt: signal.expiresAt,
  };
}

/**
 * Get affiliates with active trading wallets
 */
function getAffiliatesWithWallets() {
  try {
    let walletRegistry = {};
    if (fs.existsSync(TRADING_WALLETS)) {
      walletRegistry = JSON.parse(fs.readFileSync(TRADING_WALLETS, "utf8"));
    } else {
      walletRegistry = initializeWalletRegistry();
      fs.writeFileSync(TRADING_WALLETS, JSON.stringify(walletRegistry, null, 2));
    }

    return walletRegistry.wallets || [];
  } catch (err) {
    console.error("[Tradealgo] Error reading wallet registry:", err.message);
    return [];
  }
}

/**
 * Broadcast trading signal to eligible affiliates
 */
async function broadcastToAffiliateWallets(signal, affiliateNotifications) {
  try {
    const wallets = getAffiliatesWithWallets();
    const broadcast = {
      signalId: signal.id,
      asset: signal.asset,
      action: signal.action,
      broadcastedAt: new Date().toISOString(),
      recipients: [],
      failedDeliveries: [],
    };

    for (const wallet of wallets) {
      if (!wallet.active || !wallet.affiliateId) continue;

      try {
        const notification = formatSignalNotification(signal, wallet.affiliateId);
        
        // Store notification using provided notifications module
        if (affiliateNotifications && affiliateNotifications.storeNotification) {
          affiliateNotifications.storeNotification(wallet.affiliateId, notification);
          broadcast.recipients.push({
            affiliateId: wallet.affiliateId,
            wallet: wallet.address,
            delivered: new Date().toISOString(),
          });
        }
      } catch (err) {
        broadcast.failedDeliveries.push({
          affiliateId: wallet.affiliateId,
          error: err.message,
        });
      }
    }

    logSignalHistory({
      type: "SIGNAL_BROADCAST",
      signalId: signal.id,
      recipients: broadcast.recipients.length,
      failed: broadcast.failedDeliveries.length,
      timestamp: new Date().toISOString(),
    });

    return broadcast;
  } catch (err) {
    console.error("[Tradealgo] Broadcast error:", err.message);
    return { error: err.message, recipients: [] };
  }
}

/**
 * Register affiliate for trading signal delivery
 */
function subscribeAffiliateToSignals(affiliateId, walletAddress, options = {}) {
  try {
    let subscriptions = {};
    if (fs.existsSync(SIGNALS_SUBSCRIPTIONS)) {
      subscriptions = JSON.parse(fs.readFileSync(SIGNALS_SUBSCRIPTIONS, "utf8"));
    } else {
      subscriptions = initializeSubscriptions();
    }

    const subscription = {
      affiliateId,
      walletAddress,
      subscriptionDate: new Date().toISOString(),
      assetClasses: options.assetClasses || ["crypto"], // ["crypto", "stocks", "forex", "commodities"]
      signalTypes: options.signalTypes || ["buy", "sell"], // ["buy", "sell", "hold"]
      minConfidence: options.minConfidence || 70,
      active: true,
    };

    subscriptions.subscriptions.push(subscription);
    subscriptions.totalSubscribers = subscriptions.subscriptions.filter((s) => s.active).length;
    subscriptions.lastUpdated = new Date().toISOString();

    fs.writeFileSync(SIGNALS_SUBSCRIPTIONS, JSON.stringify(subscriptions, null, 2));

    logSignalHistory({
      type: "SUBSCRIPTION_ADDED",
      affiliateId,
      walletAddress,
      timestamp: new Date().toISOString(),
    });

    return subscription;
  } catch (err) {
    console.error("[Tradealgo] Subscription error:", err.message);
    throw err;
  }
}

/**
 * Schedule periodic signal polling
 */
function scheduleSignalPolling(intervalMs = 3600000, affiliateNotifications = null) {
  // Default 1 hour interval
  if (signalPollingInterval) {
    clearInterval(signalPollingInterval);
  }

  signalPollingInterval = setInterval(async () => {
    if (!isConnected) {
      console.warn("[Tradealgo] Not connected, skipping signal poll");
      return;
    }

    try {
      const signals = await fetchTradingSignals({
        assetClass: "all",
        signalType: "all",
        limit: 10,
        minConfidence: 70,
      });

      if (signals.success && signals.signals.length > 0) {
        for (const signal of signals.signals) {
          await broadcastToAffiliateWallets(signal, affiliateNotifications);
        }
        console.log(`[Tradealgo] Polled and broadcast ${signals.signals.length} signals`);
      }
    } catch (err) {
      console.error("[Tradealgo] Polling error:", err.message);
    }
  }, intervalMs);

  console.log(`[Tradealgo] Signal polling scheduled every ${intervalMs}ms`);
}

/**
 * Log signal operation to history (90-day rotation)
 */
function logSignalHistory(entry) {
  try {
    let history = [];
    if (fs.existsSync(SIGNALS_HISTORY)) {
      history = JSON.parse(fs.readFileSync(SIGNALS_HISTORY, "utf8"));
    }

    history.push({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });

    // Rotate if >10k entries (90-day = ~270 signals/day * ~30k entries)
    if (history.length > 50000) {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      history = history.filter((h) => new Date(h.timestamp) > ninetyDaysAgo);
    }

    fs.writeFileSync(SIGNALS_HISTORY, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error("[Tradealgo] History log error:", err.message);
  }
}

/**
 * Get signal history with filters
 */
function getSignalHistory(options = {}) {
  try {
    if (!fs.existsSync(SIGNALS_HISTORY)) {
      return [];
    }

    const { type, signalId, affiliateId, startDate, endDate, limit = 100 } = options;
    let history = JSON.parse(fs.readFileSync(SIGNALS_HISTORY, "utf8")) || [];

    if (type) {
      history = history.filter((h) => h.type === type);
    }
    if (signalId) {
      history = history.filter((h) => h.signalId === signalId);
    }
    if (affiliateId) {
      history = history.filter((h) => h.affiliateId === affiliateId);
    }
    if (startDate) {
      const start = new Date(startDate);
      history = history.filter((h) => new Date(h.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      history = history.filter((h) => new Date(h.timestamp) <= end);
    }

    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return history.slice(0, limit);
  } catch (err) {
    console.error("[Tradealgo] History retrieval error:", err.message);
    return [];
  }
}

module.exports = {
  connectTradealgo,
  fetchTradingSignals,
  formatSignalNotification,
  broadcastToAffiliateWallets,
  subscribeAffiliateToSignals,
  scheduleSignalPolling,
  getSignalHistory,
  getAffiliatesWithWallets,
  isConnected: () => isConnected,
};
