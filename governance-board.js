/**
 * Board of Directors & VP Governance Engine
 * 
 * Central authority for:
 * - Product database management policies
 * - Affiliate communication guidelines
 * - Risk thresholds and approval workflows
 * - Strategic decisions affecting platform
 * - Audit logging and compliance tracking
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const GOVERNANCE_FILE = path.join(__dirname, "governance-policies.local.json");
const DECISIONS_LOG = path.join(__dirname, "board-decisions.local.json");
const AUDIT_LOG = path.join(__dirname, "audit-trail.local.json");

/**
 * Board member roles and authority levels
 */
const BOARD_STRUCTURE = {
  ceo: {
    title: "Chief Executive Officer",
    authority: "executive",
    permissions: ["product_management", "affiliate_oversight", "financial_decisions", "communications", "audit_review"],
    signingRequired: true,
  },
  cfo: {
    title: "Chief Financial Officer",
    authority: "executive",
    permissions: ["financial_decisions", "payout_approval", "commission_rates", "audit_review"],
    signingRequired: true,
  },
  vp_affiliate: {
    title: "VP of Affiliate Operations",
    authority: "operational",
    permissions: ["product_management", "affiliate_oversight", "communications", "tier_management"],
    signingRequired: false,
  },
  vp_product: {
    title: "VP of Product",
    authority: "operational",
    permissions: ["product_management", "product_approval", "category_decisions"],
    signingRequired: false,
  },
  general_counsel: {
    title: "General Counsel",
    authority: "compliance",
    permissions: ["audit_review", "communications_review", "compliance_check"],
    signingRequired: true,
  },
  head_compliance: {
    title: "Head of Compliance",
    authority: "compliance",
    permissions: ["audit_review", "communications_review", "compliance_check"],
    signingRequired: false,
  },
  chief_market_strategist: {
    title: "Chief Market Strategist",
    authority: "investment",
    permissions: [
      "investment_guidance",
      "risk_assessment",
      "portfolio_philosophy",
      "signal_review",
      "long_term_strategy",
    ],
    signingRequired: false,
    voteWeight: 1,
  },
  chief_trading_architect: {
    title: "Chief Trading Architect",
    authority: "investment",
    permissions: [
      "signal_review",
      "execution_guardrails",
      "risk_assessment",
      "portfolio_philosophy",
      "strategy_backtesting",
    ],
    signingRequired: false,
    voteWeight: 1,
  },
};

const INVESTMENT_PRINCIPLES = [
  "Protect capital first: risk-adjusted returns over raw return chasing.",
  "Trade only where edge is measurable and execution is testable.",
  "Position size follows confidence, liquidity, and maximum downside.",
  "Prefer repeatable systems over discretionary impulse decisions.",
  "Diversify by uncorrelated strategies, not by ticker count alone.",
  "Scale winners gradually and reduce exposure when variance expands.",
  "Document rationale, monitor drift, and review post-trade outcomes daily.",
  "No strategy is exempt from stop-loss and drawdown governance.",
  "Preserve optionality: keep dry powder for asymmetric opportunities.",
  "Governance is committee-led: no single advisor overrides the board.",
];

/**
 * Default governance policies
 */
function getDefaultPolicies() {
  return {
    productDatabase: {
      backupFrequency: "daily",
      backupTime: "02:00 UTC",
      retentionDays: 90,
      versioning: true,
      requiresApproval: false,
      maxProductsPerUpdate: 100,
      autoArchiveOldData: true,
      archiveAfterDays: 365,
    },
    affiliateManagement: {
      maxTierJumps: 3,
      requiresApprovalAbove: 25000,
      commissionAudit: "weekly",
      notificationFrequency: "daily",
      maxPayoutRequest: 50000,
      requiresSigningAbove: 100000,
    },
    communications: {
      requiresReview: ["general_counsel", "head_compliance"],
      templates: ["product_digest", "tier_upgrade", "payout_alert"],
      maxFrequencyPerDay: 2,
      requiresApprovalAbove: 5000,
    },
    dataGovernance: {
      dataClassification: {
        publicProducts: "public",
        affiliateData: "confidential",
        financialData: "restricted",
        personalData: "pii",
      },
      encryptionRequired: ["affiliateData", "financialData", "personalData"],
      auditTrail: true,
      immutableLogs: true,
    },
    escalations: {
      multipleFailures: { threshold: 3, action: "executive_review" },
      largePayouts: { threshold: 100000, requiresExecApproval: true },
      dataAnomaly: { threshold: 1000000, requiresBoard: true },
    },
  };
}

/**
 * Read current policies
 */
function getPolicies() {
  try {
    if (fs.existsSync(GOVERNANCE_FILE)) {
      return JSON.parse(fs.readFileSync(GOVERNANCE_FILE, "utf8"));
    }
  } catch (err) {
    console.error("[Governance] Error reading policies:", err.message);
  }
  return getDefaultPolicies();
}

/**
 * Save policies (requires executive approval)
 */
function updatePolicies(newPolicies, approvedBy) {
  try {
    const boardMember = BOARD_STRUCTURE[approvedBy];
    if (!boardMember || !boardMember.signingRequired) {
      return {
        success: false,
        error: `Only executive board members can update policies. ${approvedBy} does not have signing authority.`,
      };
    }

    const decision = {
      id: `dec_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      type: "policy_update",
      approvedBy,
      approver: boardMember.title,
      timestamp: new Date().toISOString(),
      oldPolicies: getPolicies(),
      newPolicies,
      signature: crypto.randomBytes(32).toString("hex"),
    };

    let decisions = [];
    if (fs.existsSync(DECISIONS_LOG)) {
      decisions = JSON.parse(fs.readFileSync(DECISIONS_LOG, "utf8")) || [];
    }
    decisions.push(decision);
    fs.writeFileSync(DECISIONS_LOG, JSON.stringify(decisions, null, 2));

    fs.writeFileSync(GOVERNANCE_FILE, JSON.stringify(newPolicies, null, 2));

    logAudit("POLICY_UPDATE", approvedBy, boardMember.title, {
      changes: Object.keys(newPolicies),
      decisionId: decision.id,
    });

    return { success: true, decision };
  } catch (err) {
    console.error("[Governance] Error updating policies:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Check if action requires approval
 */
function requiresApproval(actionType, amount = 0) {
  const policies = getPolicies();

  switch (actionType) {
    case "affiliate_tier_change":
      return amount > policies.affiliateManagement.requiresApprovalAbove;
    case "payout_request":
      return amount > policies.affiliateManagement.maxPayoutRequest;
    case "communication":
      return amount > policies.communications.requiresApprovalAbove;
    case "policy_change":
      return true;
    default:
      return false;
  }
}

/**
 * Get required approvers for action
 */
function getRequiredApprovers(actionType, amount = 0) {
  const policies = getPolicies();
  const approvers = [];

  if (actionType === "communication") {
    return policies.communications.requiresReview;
  }

  if (actionType === "payout_request" && amount > 100000) {
    return ["ceo", "cfo"];
  }

  if (actionType === "policy_change") {
    return ["ceo", "cfo", "general_counsel"];
  }

  return approvers;
}

/**
 * Log audit trail event
 */
function logAudit(action, actor, actorTitle, details = {}) {
  try {
    let auditTrail = [];
    if (fs.existsSync(AUDIT_LOG)) {
      auditTrail = JSON.parse(fs.readFileSync(AUDIT_LOG, "utf8")) || [];
    }

    const entry = {
      id: `audit_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      timestamp: new Date().toISOString(),
      action,
      actor,
      actorTitle,
      details,
      ipAddress: details.ipAddress || "internal",
      userAgent: details.userAgent || "EVICS-System",
    };

    auditTrail.push(entry);

    // Keep immutable logs (rotate if needed)
    if (auditTrail.length > 100000) {
      const rotatedFile = path.join(
        __dirname,
        `audit-trail.${new Date().toISOString().split("T")[0]}.json`
      );
      fs.writeFileSync(rotatedFile, JSON.stringify(auditTrail.slice(0, 50000), null, 2));
      auditTrail = auditTrail.slice(50000);
    }

    fs.writeFileSync(AUDIT_LOG, JSON.stringify(auditTrail, null, 2));
    return entry;
  } catch (err) {
    console.error("[Governance] Error logging audit:", err.message);
  }
}

/**
 * Get audit trail with filters
 */
function getAuditTrail(options = {}) {
  try {
    const { action, actor, startDate, endDate, limit = 1000 } = options;

    if (!fs.existsSync(AUDIT_LOG)) {
      return [];
    }

    let trail = JSON.parse(fs.readFileSync(AUDIT_LOG, "utf8")) || [];

    if (action) {
      trail = trail.filter((e) => e.action === action);
    }
    if (actor) {
      trail = trail.filter((e) => e.actor === actor);
    }
    if (startDate) {
      trail = trail.filter((e) => new Date(e.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      trail = trail.filter((e) => new Date(e.timestamp) <= new Date(endDate));
    }

    trail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return trail.slice(0, limit);
  } catch (err) {
    console.error("[Governance] Error retrieving audit trail:", err.message);
    return [];
  }
}

/**
 * Get board decisions log
 */
function getBoardDecisions(options = {}) {
  try {
    const { type, approvedBy, limit = 50 } = options;

    if (!fs.existsSync(DECISIONS_LOG)) {
      return [];
    }

    let decisions = JSON.parse(fs.readFileSync(DECISIONS_LOG, "utf8")) || [];

    if (type) {
      decisions = decisions.filter((d) => d.type === type);
    }
    if (approvedBy) {
      decisions = decisions.filter((d) => d.approvedBy === approvedBy);
    }

    decisions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return decisions.slice(0, limit);
  } catch (err) {
    console.error("[Governance] Error retrieving decisions:", err.message);
    return [];
  }
}

/**
 * Create board decision record (for major actions)
 */
function recordBoardDecision(decisionData, approvedBy) {
  try {
    const boardMember = BOARD_STRUCTURE[approvedBy];
    if (!boardMember) {
      return { success: false, error: "Invalid board member" };
    }

    const decision = {
      id: `dec_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      type: decisionData.type,
      title: decisionData.title,
      description: decisionData.description,
      approvedBy,
      approver: boardMember.title,
      authority: boardMember.authority,
      timestamp: new Date().toISOString(),
      data: decisionData.data,
      signature: crypto.randomBytes(32).toString("hex"),
      immutable: true,
    };

    let decisions = [];
    if (fs.existsSync(DECISIONS_LOG)) {
      decisions = JSON.parse(fs.readFileSync(DECISIONS_LOG, "utf8")) || [];
    }
    decisions.push(decision);
    fs.writeFileSync(DECISIONS_LOG, JSON.stringify(decisions, null, 2));

    logAudit("BOARD_DECISION", approvedBy, boardMember.title, {
      decisionId: decision.id,
      type: decisionData.type,
    });

    return { success: true, decision };
  } catch (err) {
    console.error("[Governance] Error recording decision:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get investment guidance for a given signal or situation.
 * Guidance is committee-based with equal-weight voting and no single-advisor bias.
 */
function getInvestmentGuidance(context = {}) {
  const strategist = BOARD_STRUCTURE.chief_market_strategist;
  const architect = BOARD_STRUCTURE.chief_trading_architect;
  const { action, assetClass, confidence, reasoning } = context;

  // Principles that apply based on context
  const applicablePrinciples = [];
  const warnings = [];

  if (action === "buy") {
    applicablePrinciples.push(INVESTMENT_PRINCIPLES[1]);
    applicablePrinciples.push(INVESTMENT_PRINCIPLES[2]);
    if (confidence < 70) {
      warnings.push("Low confidence signal. Require tighter risk controls before initiating a buy.");
    }
  }

  if (action === "sell") {
    applicablePrinciples.push(INVESTMENT_PRINCIPLES[5]);
    warnings.push("Confirm the exit thesis: validate whether edge deterioration or risk escalation drove the sell decision.");
  }

  if (assetClass === "crypto") {
    warnings.push(
      "Crypto asset class detected. Require strict position sizing, volatility caps, and liquidity-aware execution."
    );
  }

  if (assetClass === "options") {
    warnings.push(
      "Options strategy detected. Allow only defined-risk structures and enforce max loss limits before execution."
    );
  }

  return {
    advisor: "EVICS Investment Committee",
    voteWeight: 1,
    committee: [strategist.title, architect.title],
    applicablePrinciples,
    warnings,
    overarchingPrinciple: INVESTMENT_PRINCIPLES[0],
    governanceNote:
      "Investment guidance is committee-driven with equal vote weighting and auditability across all signal decisions.",
    reasoning: reasoning || "",
  };
}

module.exports = {
  BOARD_STRUCTURE,
  INVESTMENT_PRINCIPLES,
  getPolicies,
  updatePolicies,
  requiresApproval,
  getRequiredApprovers,
  logAudit,
  getAuditTrail,
  getBoardDecisions,
  recordBoardDecision,
  getDefaultPolicies,
  getInvestmentGuidance,
};

