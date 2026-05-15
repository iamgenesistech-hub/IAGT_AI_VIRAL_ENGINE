const supabase = require('./supabaseConnector');

async function saveViralIntelligence(record) {
  const { data, error } = await supabase
    .from('evics_viral_intelligence')
    .insert([record])
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
  saveViralIntelligence
};
