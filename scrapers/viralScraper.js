require('dotenv').config();

const { runScheduledTask } = require('../utils/automationScheduler');
const { insertApprovedVideo } = require('../utils/shopifyVideoInserter');
const { routeYouTubeUpload } = require('../utils/youtubeUploadRouter');
const { routeToVault } = require('../utils/vaultAutomationEngine');
const { generateReport } = require('../utils/reportAutomationEngine');
const { queueCampaignAction } = require('../utils/campaignActionQueue');

const { prepareDashboardData } = require('../utils/dashboardDataEngine');
const { updateControlSettings } = require('../utils/controlPanelConfigEngine');
const { reviewRender } = require('../utils/renderReviewCenterEngine');
const { createCampaignPlan } = require('../utils/campaignManagerEngine');
const { summarizeAnalytics } = require('../utils/analyticsSummaryEngine');

const { learnFromOutcome } = require('../utils/adaptiveLearningEngine');
const { forecastSkuOpportunity } = require('../utils/predictiveSkuForecastEngine');
const { recommendBudgetShift } = require('../utils/autonomousBudgetShiftEngine');
const { preventCreativeFatigue } = require('../utils/creativeFatiguePreventionEngine');
const { selectBestRenderPattern } = require('../utils/selfImprovingRenderSelector');
const { runMasterIntelligenceLoop } = require('../utils/evicsMasterIntelligenceLoop');

function testSystem() {
  console.log("EVICS Phase 5, 6, 7 Full System Test Initialized...");

  console.log(runScheduledTask("Daily Profit Audit", "daily"));

  console.log(insertApprovedVideo(
    { type: "product", name: "Sea Moss Complex", destination: "Product Page Video Section" },
    { title: "Sea Moss Best Render" }
  ));

  console.log(routeYouTubeUpload({ title: "Sea Moss Best Render", grade: 94 }));

  console.log(routeToVault({ grade: 94, performanceScore: 91 }));

  console.log(generateReport("weekly", {
    summary: "Strong profit and momentum this week.",
    recommendations: ["Scale Sea Moss", "Refresh weak creatives"],
    alerts: ["Watch refund risk"]
  }));

  console.log(queueCampaignAction({
    type: "Scale",
    target: "Sea Moss Campaign",
    priority: "high"
  }));

  console.log(prepareDashboardData({
    profit: { netProfit: 8200 },
    tiers: { tier1: 12, tier2: 28 },
    campaigns: ["Sea Moss", "Beauty Glow"],
    alerts: ["Tier 4 review needed"]
  }));

  console.log(updateControlSettings(
    { renderCount: 3, strictMode: true },
    { renderCount: 5 }
  ));

  console.log(reviewRender({ name: "Render 1", grade: 91 }));

  console.log(createCampaignPlan({
    name: "Sea Moss Morning Routine",
    product: "Sea Moss Complex",
    platform: "TikTok",
    goal: "Sales"
  }));

  console.log(summarizeAnalytics({
    revenue: 25000,
    netProfit: 8200,
    adSpend: 4300,
    momentum: 88,
    awareness: 76
  }));

  console.log(learnFromOutcome({
    winnerPattern: "UGC morning routine",
    loserPattern: "static product-only ad",
    nextRecommendation: "Create 3 more UGC lifestyle variations"
  }));

  console.log(forecastSkuOpportunity({
    sku: "ROC_SEAMOSS",
    netProfit: 6200,
    momentumScore: 88,
    awarenessScore: 76,
    fatigueRisk: 20
  }));

  console.log(recommendBudgetShift(
    "Weak Test Campaign",
    "Sea Moss Winning Campaign",
    500
  ));

  console.log(preventCreativeFatigue({ fatigueScore: 75 }));

  console.log(selectBestRenderPattern([
    { name: "UGC Routine", successScore: 94 },
    { name: "Gym Scene", successScore: 87 }
  ]));

  console.log(runMasterIntelligenceLoop({
    profitSignal: "positive",
    creativeSignal: "strong",
    budgetSignal: "increase"
  }));

  console.log("EVICS MASTER INTELLIGENCE LOOP OPERATIONAL");
}

testSystem();