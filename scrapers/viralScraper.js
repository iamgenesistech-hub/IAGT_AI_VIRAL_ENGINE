require('dotenv').config();

const supabase = require('../utils/supabaseConnector');

async function testDatabase() {

  console.log("Testing EVICS Product Intelligence Database...");

  const { data, error } = await supabase
    .from('evics_products')
    .insert([
      {
        sku: 'ROC_SEAMOSS',
        product_name: 'Sea Moss Complex',
        category: 'General Wellness',
        net_profit: 6200,
        profit_score: 2174,
        momentum_score: 88,
        awareness_score: 76,
        fatigue_score: 22,
        render_grade: 94,
        tier: 'Tier 1'
      }
    ])
    .select();

  if (error) {
    console.log("Database Error:");
    console.log(error.message);
  } else {
    console.log("Inserted Product:");
    console.log(data);
  }

  console.log("EVICS PRODUCT DATABASE OPERATIONAL");
}

testDatabase();