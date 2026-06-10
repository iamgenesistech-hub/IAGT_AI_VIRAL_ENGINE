// EVICS Cloud Run Node 20 WebSocket shim for Supabase realtime dependency
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = require('ws');
}

const path = require('path');
const { createRequire } = require('module');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

function requirePackage(name) {
  try {
    return require(name);
  } catch (error) {
    try {
      const parentNodeModules = path.join(__dirname, '../node_modules');
      return createRequire(path.join(parentNodeModules, 'package.json'))(name);
    } catch (e) {
      throw new Error(`Failed to resolve package "${name}": ${error.message}`);
    }
  }
}

const { createClient } = requirePackage('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.evics_supabase_key;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = supabase;
