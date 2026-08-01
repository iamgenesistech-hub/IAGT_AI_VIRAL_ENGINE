'use strict';

const assert = require('assert');
const Module = require('module');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const originalModuleLoad = Module._load;

Module._load = function patchedModuleLoad(request, parent, isMain) {
  if (request === 'axios') {
    return {
      get: async () => ({ status: 200, data: { products: [] } }),
      post: async () => ({ data: {} }),
    };
  }

  if (request === './SupabaseConnector' && parent && parent.filename === path.join(ROOT, 'utils', 'shopifyLiveConnector.js')) {
    return {
      from: () => ({
        select() { return this; },
        limit() { return Promise.resolve({ data: [], error: null }); },
      }),
    };
  }

  return originalModuleLoad(request, parent, isMain);
};

const { checkShopifyHealth } = require(path.join(ROOT, 'utils', 'shopifyLiveConnector'));
Module._load = originalModuleLoad;

let passed = 0;
let failed = 0;
const failures = [];

function makeHttpError(status, statusText) {
  return {
    message: statusText,
    response: {
      status,
      statusText,
    },
  };
}

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, message: error.message });
    console.log(`  ❌ ${name}`);
    console.log(`     → ${error.message}`);
  }
}

async function run() {
  console.log('\n=== Shopify Health Validation ===\n');

  await test('admin API success reports healthy admin mode', async () => {
    const health = await checkShopifyHealth({
      adminProbe: async () => ({ shop: { id: 1 } }),
      storefrontProbe: async () => {
        throw new Error('storefront should not be called');
      },
      supabaseCatalogProbe: async () => false,
      localCacheProbe: () => null,
    });

    assert.strictEqual(health.status, 'ok');
    assert.strictEqual(health.mode, 'admin_api');
    assert.strictEqual(health.httpStatus, 200);
    assert.strictEqual(health.adminStatus, 200);
  });

  await test('storefront catalog keeps health ok when admin auth is rejected', async () => {
    const health = await checkShopifyHealth({
      adminProbe: async () => {
        throw makeHttpError(401, 'Unauthorized');
      },
      storefrontProbe: async () => ({ httpStatus: 200, productCount: 1 }),
      supabaseCatalogProbe: async () => false,
      localCacheProbe: () => null,
    });

    assert.strictEqual(health.status, 'ok');
    assert.strictEqual(health.mode, 'storefront_catalog');
    assert.strictEqual(health.httpStatus, 200);
    assert.strictEqual(health.adminStatus, 401);
    assert.strictEqual(health.catalogAvailable, true);
    assert.strictEqual(health.productCount, 1);
  });

  await test('supabase catalog fallback keeps health ok when live probes fail', async () => {
    const health = await checkShopifyHealth({
      adminProbe: async () => {
        throw makeHttpError(401, 'Unauthorized');
      },
      storefrontProbe: async () => {
        throw makeHttpError(503, 'Service Unavailable');
      },
      supabaseCatalogProbe: async () => true,
      localCacheProbe: () => null,
    });

    assert.strictEqual(health.status, 'ok');
    assert.strictEqual(health.mode, 'supabase_catalog_cache');
    assert.strictEqual(health.adminStatus, 401);
    assert.strictEqual(health.storefrontStatus, 503);
    assert.strictEqual(health.catalogAvailable, true);
  });

  await test('local cache fallback keeps health ok when live probes fail', async () => {
    const health = await checkShopifyHealth({
      adminProbe: async () => {
        throw makeHttpError(401, 'Unauthorized');
      },
      storefrontProbe: async () => {
        throw makeHttpError(503, 'Service Unavailable');
      },
      supabaseCatalogProbe: async () => false,
      localCacheProbe: () => [{ id: 'cached-product' }],
    });

    assert.strictEqual(health.status, 'ok');
    assert.strictEqual(health.mode, 'local_catalog_cache');
    assert.strictEqual(health.adminStatus, 401);
    assert.strictEqual(health.storefrontStatus, 503);
    assert.strictEqual(health.productCount, 1);
  });

  await test('health returns error only when all catalog paths are unavailable', async () => {
    const health = await checkShopifyHealth({
      adminProbe: async () => {
        throw makeHttpError(401, 'Unauthorized');
      },
      storefrontProbe: async () => {
        throw makeHttpError(503, 'Service Unavailable');
      },
      supabaseCatalogProbe: async () => false,
      localCacheProbe: () => null,
    });

    assert.strictEqual(health.status, 'error');
    assert.strictEqual(health.mode, 'unavailable');
    assert.strictEqual(health.httpStatus, 503);
    assert.strictEqual(health.adminStatus, 401);
    assert.strictEqual(health.storefrontStatus, 503);
    assert.strictEqual(health.error, 'Service Unavailable');
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    console.log('FAILURES:');
    failures.forEach((failure) => console.log(`  • ${failure.name}: ${failure.message}`));
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
