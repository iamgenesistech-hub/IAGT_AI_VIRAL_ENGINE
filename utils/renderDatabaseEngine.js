const supabase = require('./supabaseConnector');

async function saveRender(render) {
  const { data, error } = await supabase
    .from('evics_renders')
    .insert([render])
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
  saveRender
};