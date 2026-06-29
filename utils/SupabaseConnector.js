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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.evics_supabase_key;

if (!supabaseUrl || !supabaseKey) {
  // Return a graceful no-op proxy so the server starts without crashing.
  // All DB calls will return empty results and log a warning.
  console.warn('[SupabaseConnector] Missing SUPABASE_URL or SUPABASE_KEY — running in offline mode. Set env vars to activate live data.');

  const noopResult = { data: [], error: null, count: 0 };
  const noopQuery = () => ({
    select: () => noopQuery(),
    insert: () => noopQuery(),
    upsert: () => noopQuery(),
    update: () => noopQuery(),
    delete: () => noopQuery(),
    eq: () => noopQuery(),
    neq: () => noopQuery(),
    not: () => noopQuery(),
    in: () => noopQuery(),
    lt: () => noopQuery(),
    lte: () => noopQuery(),
    gt: () => noopQuery(),
    gte: () => noopQuery(),
    ilike: () => noopQuery(),
    order: () => noopQuery(),
    limit: () => noopQuery(),
    single: () => Promise.resolve({ data: null, error: null }),
    then: (resolve) => resolve(noopResult),
    [Symbol.thennable]: true
  });

  const noopClient = {
    from: () => noopQuery()
  };

  // Make all query chains thenable
  const makeThenable = (obj) => {
    return new Proxy(obj, {
      get(target, prop) {
        if (prop === 'then') {
          return (resolve) => Promise.resolve(noopResult).then(resolve);
        }
        if (prop === 'catch') {
          return () => Promise.resolve(noopResult);
        }
        if (typeof target[prop] === 'function') {
          return (...args) => makeThenable(target[prop](...args));
        }
        return target[prop];
      }
    });
  };

  module.exports = {
    from: (table) => makeThenable(noopQuery())
  };
} else {
  try {
    const { createClient } = requirePackage('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    module.exports = supabase;
  } catch (e) {
    console.warn('[SupabaseConnector] Failed to load @supabase/supabase-js — falling back to offline no-op client:', e.message);
    const noopResult = { data: [], error: null, count: 0 };
    const noopQuery = () => ({
      select: () => noopQuery(),
      insert: () => noopQuery(),
      upsert: () => noopQuery(),
      update: () => noopQuery(),
      delete: () => noopQuery(),
      eq: () => noopQuery(),
      neq: () => noopQuery(),
      not: () => noopQuery(),
      in: () => noopQuery(),
      lt: () => noopQuery(),
      lte: () => noopQuery(),
      gt: () => noopQuery(),
      gte: () => noopQuery(),
      ilike: () => noopQuery(),
      order: () => noopQuery(),
      limit: () => noopQuery(),
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve) => resolve(noopResult),
      [Symbol.thennable]: true
    });
    const makeThenable = (obj) => {
      return new Proxy(obj, {
        get(target, prop) {
          if (prop === 'then') return (resolve) => Promise.resolve(noopResult).then(resolve);
          if (prop === 'catch') return () => Promise.resolve(noopResult);
          if (typeof target[prop] === 'function') return (...args) => makeThenable(target[prop](...args));
          return target[prop];
        }
      });
    };
    module.exports = { from: (table) => makeThenable(noopQuery()) };
  }
}
