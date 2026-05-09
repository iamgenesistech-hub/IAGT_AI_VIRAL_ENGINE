require('dotenv').config();

const axios = require('axios');

const {
  calculateNetProfit,
  calculateWeightedProfitScore
} = require('../utils/profitScoreEngine');

async function testSystem() {

  try {

    console.log("EVICS Profit Intelligence System Initialized...");

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
        netProfit: netProfit,
        profitVelocity: 9,
        profitStability: 8,
        scalability: 9,
        fatigueRisk: 2,
        refundRisk: 1
      },
      {
        netProfitWeight: 0.35,
        velocityWeight: 0.2,
        stabilityWeight: 0.15,
        scalabilityWeight: 0.15,
        fatigueRiskWeight: 0.075,
        refundRiskWeight: 0.075
      }
    );

    console.log("Net Profit:", netProfit);

    console.log("Weighted Profit Score:", weightedScore);

    const response = await axios.get('https://example.com');

    console.log("Website Status:", response.status);

    console.log("Profit Intelligence Engine Operational");

  } catch (error) {

    console.error("System Error:", error.message);

  }

}

testSystem();