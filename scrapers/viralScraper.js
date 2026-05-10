require('dotenv').config();

const {
  generateExecutiveSummary,
  createActionRecommendation
} = require('../utils/executiveReporterEngine');

function testSystem() {
  console.log("EVICS Executive Reporter Initialized...");

  const summary = generateExecutiveSummary({
    date: "2026-05-09",
    totalRevenue: 25000,
    totalNetProfit: 8200,
    totalAdSpend: 4300,
    topRecommendations: [
      "Scale Tier 1 Sea Moss ads carefully",
      "Reduce spend on weak test ads",
      "Push momentum SKUs into Promotion Pool"
    ],
    alerts: [
      "Watch refund risk on beauty stack",
      "Review Tier 4 recovery products"
    ]
  });

  console.log("Executive Summary:", summary);

  const recommendation = createActionRecommendation({
    netProfit: 1200,
    momentumScore: 85,
    awarenessScore: 76
  });

  console.log("Action Recommendation:", recommendation);
  console.log("Executive Reporter Engine Operational");
}

testSystem();