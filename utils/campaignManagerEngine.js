function createCampaignPlan(campaign) {
  return {
    campaignName: campaign.name,
    product: campaign.product,
    platform: campaign.platform,
    goal: campaign.goal,
    status: "Planned"
  };
}

module.exports = { createCampaignPlan };
