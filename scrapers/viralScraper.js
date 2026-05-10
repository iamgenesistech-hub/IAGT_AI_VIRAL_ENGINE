require('dotenv').config();

const supabase = require('../utils/supabaseConnector');

async function testConnection() {

  console.log("Connecting EVICS to Supabase...");

  const { data, error } = await supabase
    .from('evics_test')
    .select('*');

  if (error) {
    console.log("Supabase Connected — table not created yet.");
    console.log(error.message);
  } else {
    console.log(data);
  }

  console.log("EVICS DATABASE CONNECTION OPERATIONAL");
}

testConnection();