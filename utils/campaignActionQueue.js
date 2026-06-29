function queueCampaignAction(action) {
  return {
    queued: true,
    actionType: action.type,
    target: action.target,
    priority: action.priority || "normal",
    timestamp: new Date().toISOString()
  };
}

module.exports = { queueCampaignAction };
