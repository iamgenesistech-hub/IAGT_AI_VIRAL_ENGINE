const supabase = require('./supabaseConnector');

async function saveCampaign(campaign) {
  const { data, error } = await supabase
    .from('evics_campaigns')
    .insert([campaign])
    .select();

  if (error) {
    return {
      success: false,
      error: error.message
    };
  }

  return {
    success: true,
    data
  };
}

module.exports = {
  saveCampaign
};