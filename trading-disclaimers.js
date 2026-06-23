/**
 * EVICS Trading Disclaimers & Risk Compliance System
 *
 * Legal risk disclosures, electronic signature capture,
 * and compliance gating for the trading/investment feature.
 *
 * An affiliate CANNOT access wallet trading until they have:
 *  1. Completed all required trading education modules
 *  2. Acknowledged all required disclaimers (with electronic signature)
 *
 * Governed by the EVICS Board of Directors per platform policy.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ACKNOWLEDGMENTS_FILE = path.join(__dirname, "trading-disclaimers-acknowledged.local.json");

// ─────────────────────────────────────────────────────────────────────────────
// DISCLAIMER CONTENT
// ─────────────────────────────────────────────────────────────────────────────

const DISCLAIMERS = {
  general_risk: {
    id: "general_risk",
    title: "General Investment Risk Disclosure",
    version: "1.2",
    required: true,
    lastUpdated: "2026-06-22",
    approvedBy: "general_counsel",
    content: `
GENERAL INVESTMENT RISK DISCLOSURE

This disclosure is required by the EVICS Board of Directors under the platform's financial governance policy.

IMPORTANT: PLEASE READ THIS CAREFULLY BEFORE USING ANY TRADING OR INVESTMENT FEATURE

1. RISK OF LOSS
   Investing in stocks, options, and other financial instruments involves substantial risk of loss. 
   You may lose some or ALL of your invested capital. Past performance is not indicative of future results.
   Never invest money that you cannot afford to lose.

2. NO GUARANTEE OF PROFITS
   EVICS, its Board of Directors, TradeAlgo signals, AI-generated recommendations, and any 
   affiliated advisors (including Warren Buffett-aligned principles) do NOT guarantee any specific 
   returns, profits, or investment outcomes. All market information is provided for educational 
   and informational purposes only.

3. NOT FINANCIAL ADVICE
   Nothing on this platform constitutes personalized financial advice, investment advice, trading 
   advice, or any other form of professional financial guidance. You should consult a licensed 
   financial advisor before making any investment decisions.

4. MARKET VOLATILITY
   Financial markets can be highly volatile. Prices can change rapidly and unpredictably. 
   Events including earnings reports, economic data, geopolitical events, and market sentiment 
   can cause substantial and sudden price movements.

5. LEVERAGE AND OPTIONS RISK
   Options trading and leveraged instruments carry amplified risk. You can lose more than your 
   initial investment with certain strategies. Options can expire worthless, resulting in a 
   100% loss of the premium paid.

6. AI SIGNAL LIMITATIONS
   AI-generated trading signals and recommendations are based on algorithmic analysis and 
   historical patterns. They do not account for all market conditions and can be wrong. 
   Always conduct your own due diligence before acting on any signal.

7. YOUR RESPONSIBILITY
   All investment decisions are YOUR sole responsibility. EVICS, its officers, directors, 
   employees, and affiliates will not be liable for any losses incurred based on information, 
   signals, or recommendations provided on this platform.

By acknowledging this disclosure, you confirm that you understand and accept these risks.
    `.trim(),
  },

  options_risk: {
    id: "options_risk",
    title: "Options Trading Specific Risk Disclosure",
    version: "1.1",
    required: true,
    lastUpdated: "2026-06-22",
    approvedBy: "general_counsel",
    content: `
OPTIONS TRADING RISK DISCLOSURE

OPTIONS TRADING IS NOT SUITABLE FOR ALL INVESTORS. This disclosure is specifically required 
before accessing any options-related trading features or signals.

1. COMPLEXITY RISK
   Options are complex financial instruments that require thorough understanding before trading.
   Warren Buffett has specifically warned that "derivatives are financial weapons of mass destruction"
   when used without proper knowledge and discipline.

2. TIME DECAY (THETA)
   Options lose value over time due to theta decay, even if the underlying stock moves in your favor.
   An option can expire worthless even if your directional view was correct, if timing was wrong.

3. LEVERAGE AMPLIFICATION
   Options provide leverage that amplifies both gains AND losses. Small stock moves can result in 
   large percentage changes in option value — both up and down.

4. LIQUIDITY RISK
   Some options contracts may have low liquidity (wide bid-ask spreads), making it difficult to 
   enter or exit positions at favorable prices.

5. EXERCISE AND ASSIGNMENT RISK
   Selling options carries assignment risk. You may be required to buy or sell 100 shares of 
   stock for each contract, requiring significant capital you may not have.

6. EDUCATION PREREQUISITE
   You must complete the EVICS Certified Trader Program (all 5 levels including the Options 
   Trading module) before this feature is activated. This is a firm requirement, not a suggestion.

7. BUFFETT ADVISORY NOTE
   In alignment with Warren Buffett's investment principles (which carry elevated authority 
   in our governance framework), we strongly recommend only using options for income-generation 
   strategies (covered calls, cash-secured puts) rather than speculative directional bets.

By acknowledging this disclosure, you confirm understanding of all options-specific risks.
    `.trim(),
  },

  ai_signals_risk: {
    id: "ai_signals_risk",
    title: "AI Trading Signals Disclaimer",
    version: "1.0",
    required: true,
    lastUpdated: "2026-06-22",
    approvedBy: "vp_affiliate",
    content: `
AI TRADING SIGNALS DISCLAIMER

1. ALGORITHMIC LIMITATIONS
   TradeAlgo AI signals are generated using machine learning models trained on historical market 
   data. These models cannot predict the future. Markets are influenced by unpredictable events 
   that no algorithm can anticipate.

2. NO INDEPENDENT VERIFICATION
   EVICS does not independently verify the accuracy of TradeAlgo signals. We provide them as 
   one data point among many. Never rely solely on AI signals for investment decisions.

3. SIGNAL LATENCY
   Signal delivery through EVICS notifications may be delayed due to technical factors. 
   Time-sensitive signals may no longer be actionable by the time you receive them.

4. PAPER TRADING FIRST
   We strongly recommend practicing with paper (simulated) trading for a minimum of 30 days 
   before committing real capital, regardless of signal quality.

5. DIVERSIFICATION
   Never concentrate more than 5% of your portfolio in a single trade based on any signal.
   Portfolio diversification is a core principle of sound risk management.

6. BOARD GOVERNANCE
   All AI trading recommendations displayed through EVICS are subject to review and override 
   by the Board of Directors' investment governance framework, with Warren Buffett's 
   value-investing principles carrying primary weight in evaluating signal quality.

By acknowledging this disclaimer, you agree not to hold EVICS responsible for any losses 
incurred by following AI-generated trading signals.
    `.trim(),
  },

  crypto_risk: {
    id: "crypto_risk",
    title: "Cryptocurrency & Wallet Risk Disclosure",
    version: "1.0",
    required: true,
    lastUpdated: "2026-06-22",
    approvedBy: "cfo",
    content: `
CRYPTOCURRENCY AND WALLET RISK DISCLOSURE

1. EXTREME VOLATILITY
   Cryptocurrency markets are significantly more volatile than traditional financial markets.
   Assets can lose 50-90% of their value in short periods. Only allocate capital you can 
   afford to lose entirely.

2. REGULATORY UNCERTAINTY
   Cryptocurrency regulation varies by country and is subject to rapid change. Regulatory 
   actions can affect the value and availability of digital assets.

3. IRREVERSIBLE TRANSACTIONS
   Cryptocurrency transactions are generally irreversible. Mistakes in wallet addresses or 
   transaction errors cannot be undone. Always double-check wallet addresses before transacting.

4. WALLET SECURITY
   You are solely responsible for the security of your wallet credentials and private keys. 
   EVICS does not store, manage, or have access to your private keys. Loss of private keys 
   means permanent loss of access to your funds.

5. PROFIT REINVESTMENT
   Using affiliate earnings to fund crypto/market investments involves additional risk. 
   Your affiliate commission payments are separate from any investment activity. 
   Investment losses do not affect your affiliate earnings status.

6. TAX OBLIGATIONS
   You are responsible for understanding and complying with applicable tax laws regarding 
   cryptocurrency gains in your jurisdiction.

By acknowledging this disclosure, you accept all risks associated with cryptocurrency 
and digital wallet usage on the EVICS platform.
    `.trim(),
  },

  platform_terms: {
    id: "platform_terms",
    title: "EVICS Platform Terms & Affiliate Agreement",
    version: "2.1",
    required: true,
    lastUpdated: "2026-06-22",
    approvedBy: "ceo",
    content: `
EVICS PLATFORM TERMS & AFFILIATE AGREEMENT

1. CERTIFICATION REQUIREMENT
   Access to trading and investment features is conditioned on completing the EVICS Certified 
   Trader Program. This includes all required video modules and acknowledgment of all risk 
   disclosures. This is a hard gate — no exceptions.

2. AFFILIATE EARNINGS vs. INVESTMENT ACCOUNT
   Your affiliate marketing earnings and your investment/trading activity are separate. 
   We provide investment education and signals as a value-added service. Your affiliate 
   commission structure is not affected by investment performance.

3. PROPER USE ONLY
   The trading signals and educational content are for lawful personal investment use only.
   You may not redistribute, resell, or share proprietary signals or platform content.

4. ACCOUNT SUSPENSION
   Accounts showing evidence of manipulation, fraud, or misuse of the trading feature may 
   be suspended and referred to appropriate authorities.

5. GOVERNING AUTHORITY
   All investment-related decisions on this platform are governed by the EVICS Board of 
   Directors framework. Warren Buffett's value-investing principles are incorporated as the 
   primary philosophical framework for all investment guidance provided through this platform.

6. MODIFICATION OF TERMS
   EVICS reserves the right to update these terms. Material changes will be communicated and 
   may require re-acknowledgment.

7. EDUCATIONAL PURPOSE
   All content, signals, and recommendations on this platform are provided for educational 
   purposes. They do not constitute personalized financial advice.

I confirm that I am 18 years of age or older, I am legally permitted to invest in financial 
instruments in my jurisdiction, and I have read, understood, and accept all terms above.
    `.trim(),
  },

  platform_fee_consent: {
    id: "platform_fee_consent",
    title: "Platform Fee Agreement — 5% Profit Share",
    version: "1.0",
    required: true,
    lastUpdated: "2026-06-22",
    approvedBy: "cfo",
    content: `
EVICS PLATFORM FEE AGREEMENT

IMPORTANT: READ THIS CAREFULLY. This agreement governs the financial fee structure 
applicable to all trading activity conducted through the EVICS platform.

1. PLATFORM SERVICE FEE
   EVICS charges a 5% (five percent) platform service fee on ALL NET TRADING PROFITS 
   generated through the EVICS investment feature.

   This fee covers:
   a) Platform usage and infrastructure
   b) AI trading signal delivery and processing
   c) Real-time push notification delivery
   d) Warren Buffett-governed investment advisory oversight
   e) Board of Directors governance and compliance operations
   f) Ongoing platform maintenance and development

2. FEE CALCULATION EXAMPLE
   If you close a trade with a profit of $1,000 USD (or equivalent in BTC/ETH):
   - Platform fee (5%): $50.00
   - Your net profit: $950.00
   
   The fee is calculated ONLY on winning trades. There is NO fee on losses.
   There is NO monthly subscription or usage fee — only a share of actual profits.

3. AUTOMATIC DEDUCTION
   The 5% fee is automatically calculated and deducted at the time you report a 
   profitable trade close through the platform. The fee is transferred immediately 
   to the EVICS company profit wallet (maintained in Bitcoin or Ethereum).

4. COMPANY PROFIT WALLET
   The collected fees are deposited into the official EVICS company profit wallet, 
   maintained in Bitcoin (BTC) and/or Ethereum (ETH). This wallet is:
   - Accessible only to registered EVICS administrators
   - Governed by the EVICS Board of Directors
   - Subject to withdrawal only by authorised admin with verified credentials
   - Audited and traceable through the platform's immutable fee ledger

5. TRANSPARENCY
   You may view your complete personal fee history at any time through your affiliate 
   dashboard under Settings → Trading → Fee History. All fee transactions are recorded 
   with timestamps, amounts, and trade details.

6. NO HIDDEN FEES
   The 5% profit fee is the ONLY platform fee charged for use of the trading and 
   investment features. There are no hidden charges, subscription fees, or other 
   deductions beyond this stated 5% profit share.

7. ACCEPTANCE
   By signing this agreement, you:
   a) Acknowledge and accept the 5% platform service fee on all trading profits
   b) Authorise EVICS to automatically deduct this fee from reported trade profits
   c) Acknowledge that fee amounts will be credited immediately to the company profit wallet
   d) Confirm you have read and understood the complete fee structure above

SIGNED AGREEMENT IS BINDING. You cannot access the trading and investment features 
without signing this agreement.
    `.trim(),
  },
};

const REQUIRED_DISCLAIMERS = Object.values(DISCLAIMERS).filter((d) => d.required).map((d) => d.id);

// ─────────────────────────────────────────────────────────────────────────────
// ACKNOWLEDGMENT STORAGE
// ─────────────────────────────────────────────────────────────────────────────

function loadAcknowledgments() {
  if (!fs.existsSync(ACKNOWLEDGMENTS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(ACKNOWLEDGMENTS_FILE, "utf8")) || {};
  } catch {
    return {};
  }
}

function saveAcknowledgments(data) {
  fs.writeFileSync(ACKNOWLEDGMENTS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Record an affiliate's acknowledgment of a specific disclaimer.
 */
function acknowledgeDisclaimer(affiliateId, disclaimerId, metadata = {}) {
  if (!affiliateId || !disclaimerId) throw new Error("affiliateId and disclaimerId required");
  if (!DISCLAIMERS[disclaimerId]) throw new Error(`Unknown disclaimer: ${disclaimerId}`);

  const all = loadAcknowledgments();
  if (!all[affiliateId]) all[affiliateId] = [];

  // Idempotent — only store once per version
  const disclaimer = DISCLAIMERS[disclaimerId];
  const existing = all[affiliateId].find(
    (a) => a.disclaimerId === disclaimerId && a.version === disclaimer.version
  );
  if (!existing) {
    all[affiliateId].push({
      disclaimerId,
      version: disclaimer.version,
      acknowledgedAt: new Date().toISOString(),
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      signatureToken: crypto.randomBytes(16).toString("hex"),
    });
  }

  saveAcknowledgments(all);
  return getComplianceStatus(affiliateId);
}

/**
 * Get compliance status for an affiliate.
 * Returns what disclaimers are pending and whether all are complete.
 */
function getComplianceStatus(affiliateId) {
  const all = loadAcknowledgments();
  const record = all[affiliateId] || [];
  const acknowledged = new Set(record.map((a) => a.disclaimerId));

  const pending = REQUIRED_DISCLAIMERS.filter((id) => !acknowledged.has(id));
  const complete = pending.length === 0;

  return {
    affiliateId,
    complete,
    acknowledgedCount: REQUIRED_DISCLAIMERS.filter((id) => acknowledged.has(id)).length,
    requiredCount: REQUIRED_DISCLAIMERS.length,
    pending: pending.map((id) => ({
      id,
      title: DISCLAIMERS[id].title,
      version: DISCLAIMERS[id].version,
    })),
    acknowledgedAt: complete
      ? record.reduce(
          (latest, a) => (!latest || a.acknowledgedAt > latest ? a.acknowledgedAt : latest),
          null
        )
      : null,
  };
}

/**
 * Check if an affiliate has completed ALL required disclaimers.
 */
function hasCompletedDisclaimers(affiliateId) {
  return getComplianceStatus(affiliateId).complete;
}

/**
 * Full trading gate check — must pass BOTH education AND disclaimers.
 */
function checkTradingGate(affiliateId, education) {
  const disclaimersOk = hasCompletedDisclaimers(affiliateId);
  const educationOk = education ? education.isTradingUnlocked(affiliateId) : false;

  return {
    allowed: disclaimersOk && educationOk,
    educationComplete: educationOk,
    disclaimersComplete: disclaimersOk,
    blockers: [
      ...(!educationOk ? ["Complete all required trading education modules (5 levels)"] : []),
      ...(!disclaimersOk ? ["Acknowledge all risk disclosures and platform terms"] : []),
    ],
  };
}

/**
 * Get full text of a specific disclaimer.
 */
function getDisclaimer(disclaimerId) {
  return DISCLAIMERS[disclaimerId] || null;
}

/**
 * Get all disclaimers (for display).
 */
function getAllDisclaimers() {
  return Object.values(DISCLAIMERS);
}

module.exports = {
  DISCLAIMERS,
  REQUIRED_DISCLAIMERS,
  acknowledgeDisclaimer,
  getComplianceStatus,
  hasCompletedDisclaimers,
  checkTradingGate,
  getDisclaimer,
  getAllDisclaimers,
};
