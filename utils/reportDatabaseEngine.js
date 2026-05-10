const supabase = require('./supabaseConnector');

async function saveReport(report) {
  const { data, error } = await supabase
    .from('evics_reports')
    .insert([report])
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
  saveReport
};