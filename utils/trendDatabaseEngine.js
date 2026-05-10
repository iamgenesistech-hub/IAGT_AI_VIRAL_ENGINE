const supabase = require('./supabaseConnector');

async function saveTrend(trend) {
  const { data, error } = await supabase
    .from('evics_trends')
    .insert([trend])
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
  saveTrend
};