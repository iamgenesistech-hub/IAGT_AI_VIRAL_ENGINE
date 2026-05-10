require('dotenv').config();

const { saveRender } = require('../utils/renderDatabaseEngine');
const { saveCampaign } = require('../utils/campaignDatabaseEngine');
const { saveReport } = require('../utils/reportDatabaseEngine');
const { saveTrend } = require('../utils/trendDatabaseEngine');

async function testDatabaseLayer() {
  console.log("EVICS Database Expansion Test Initialized...");

  const renderResult = await saveRender({
    render_name: "Sea Moss Morning Routine Render",
    sku: "ROC_SEAMOSS",
    product_name: "Sea Moss Complex",
    platform: "TikTok",
    render_grade: 94,
    product_fit: 92,
    brand_alignment: 95,
    conversion_potential: 91,
    viral_potential: 93,
    status: "Approved",
    vault_destination: "EVICS Render Folder - Best of the Best"
  });

  console.log("Render Save Result:", renderResult);

  const campaignResult = await saveCampaign({
    campaign_name: "Sea Moss Morning Routine Campaign",
    sku: "ROC_SEAMOSS",
    product_name: "Sea Moss Complex",
    platform: "TikTok",
    goal: "Sales",
    budget: 500,
    net_profit: 6200,
    profit_score: 2174,
    status: "Planned"
  });

  console.log("Campaign Save Result:", campaignResult);

  const reportResult = await saveReport({
    report_type: "weekly",
    summary: "Sea Moss campaign shows strong profit, high momentum, and strong render quality.",
    recommendations: [
      "Scale Sea Moss carefully",
      "Create three new UGC variations",
      "Monitor fatigue after campaign launch"
    ],
    alerts: [
      "Watch ad frequency",
      "Review refund risk weekly"
    ]
  });

  console.log("Report Save Result:", reportResult);

  const trendResult = await saveTrend({
    trend_name: "Sea Moss Morning Routine",
    platform: "TikTok",
    category: "Wellness",
    viral_score: 92,
    product_fit: 95,
    recommendation: "Test immediately with Sea Moss Complex"
  });

  console.log("Trend Save Result:", trendResult);

  console.log("EVICS DATABASE EXPANSION OPERATIONAL");
}

testDatabaseLayer();