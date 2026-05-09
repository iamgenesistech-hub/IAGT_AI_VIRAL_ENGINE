require('dotenv').config();

const {
  calculateNetProfit,
  calculateWeightedProfitScore
} = require('../utils/profitScoreEngine');

const {
  determineProductTier,
  getTierAction
} = require('../utils/productTierEngine');

function testSystem() {
  console.log("EVICS Profit + Tier Intelligence Initialized...");

  const financialData = {
    revenue: 12000,
    adSpend: 2500,
    cogs: 1800,
    shipping: 450,
    fees: 300,
    refunds: 200,
    creativeProduction: 400,
    marketingOverhead: 150
  };

  const netProfit = calculateNetProfit(financialData);

  const weightedScore = calculateWeightedProfitScore(
    {
      netProfit,
      profitVelocity: 9,
      profitStability: 8,
      scalability: 9,
      fatigueRisk: 2,
      refundRisk: 1
    },
    {}
  );

  const percentileRank = 18;
  const tier = determineProductTier(percentileRank);
  const tierAction = getTierAction(tier, 0);

  console.log("Net Profit:", netProfit);
  console.log("Weighted Profit Score:", weightedScore);
  console.log("Product Percentile Rank:", percentileRank);
  console.log("Product Tier:", tier);
  console.log("Recommended Action:", tierAction.action);
  console.log("Ad Spend Status:", tierAction.adSpendStatus);
  console.log("Product Tier Engine Operational");
}

testSystem();