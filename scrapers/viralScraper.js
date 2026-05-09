require('dotenv').config();

const {
  allocateMarketingBudget,
  rankAdsByProfitScore,
  determineBudgetAction
} = require('../utils/capitalAllocatorEngine');

function testSystem() {
  console.log("EVICS Capital Allocator Initialized...");

  const totalBudget = 10000;

  const ads = [
    { name: "Sea Moss UGC Ad", sku: "ROC_SEAMOSS", weightedProfitScore: 2174.13 },
    { name: "Nootropic Focus Ad", sku: "ROC_FOCUS", weightedProfitScore: 1425.55 },
    { name: "Beauty Glow Ad", sku: "ROC_BEAUTY", weightedProfitScore: 725.2 },
    { name: "Weak Test Ad", sku: "ROC_TEST", weightedProfitScore: 300.1 }
  ];

  const rankedAds = rankAdsByProfitScore(ads);

  const topAds = rankedAds.slice(0, 3);
  const promotionAds = rankedAds.slice(3);

  const allocation = allocateMarketingBudget(totalBudget, topAds, promotionAds);

  console.log("Total Budget:", allocation.totalBudget);
  console.log("Top Ads Allocation:", allocation.top30.allocation);
  console.log("Promotion Pool Allocation:", allocation.promotionPool.allocation);

  console.log("Ranked Ads:");
  rankedAds.forEach((ad, index) => {
    console.log(
      `${index + 1}. ${ad.name} | ${ad.sku} | Score: ${ad.weightedProfitScore} | Action: ${determineBudgetAction(ad.weightedProfitScore)}`
    );
  });

  console.log("Capital Allocator Engine Operational");
}

testSystem();