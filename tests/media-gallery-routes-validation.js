'use strict';

const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const {
  summarizeMediaGallery,
  applyMediaGalleryFilters
} = require(path.join(ROOT, 'backend', 'mediaOutputRoutes'));

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, message: error.message });
    console.log(`  ❌ ${name}`);
    console.log(`     → ${error.message}`);
  }
}

const sampleItems = [
  { id: '1', status: 'approved', sourceProvider: 'HeyGen', mediaType: 'video', title: 'Approved clip', tags: ['ugc'] },
  { id: '2', status: 'queued', sourceProvider: 'Runway', mediaType: 'video', title: 'Queued render', tags: ['requeue'] },
  { id: '3', status: 'needs_rerender', sourceProvider: 'Runway', mediaType: 'video', title: 'Retry render', tags: ['fix'] },
  { id: '4', status: 'archived', sourceProvider: 'Internal', mediaType: 'image', title: 'Old asset', tags: ['archive'] }
];

console.log('\n=== Media Gallery Route Validation ===\n');

test('Summary counts core approval buckets', () => {
  const summary = summarizeMediaGallery(sampleItems);
  assert.strictEqual(summary.total, 4);
  assert.strictEqual(summary.approved, 1);
  assert.strictEqual(summary.pending, 1);
  assert.strictEqual(summary.rerender, 1);
  assert.strictEqual(summary.discarded, 1);
});

test('Filters narrow items by status and media type', () => {
  const { filteredItems, filters } = applyMediaGalleryFilters(sampleItems, { status: 'approved', mediaType: 'video' });
  assert.strictEqual(filteredItems.length, 1);
  assert.strictEqual(filteredItems[0].id, '1');
  assert.strictEqual(filters.status, 'approved');
  assert.strictEqual(filters.mediaType, 'video');
});

test('Search filter matches title/provider/tags', () => {
  const fromTitle = applyMediaGalleryFilters(sampleItems, { search: 'approved clip' }).filteredItems;
  const fromProvider = applyMediaGalleryFilters(sampleItems, { search: 'runway' }).filteredItems;
  const fromTag = applyMediaGalleryFilters(sampleItems, { search: 'archive' }).filteredItems;
  assert.strictEqual(fromTitle.length, 1);
  assert.strictEqual(fromProvider.length, 2);
  assert.strictEqual(fromTag.length, 1);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  console.log('FAILURES:');
  failures.forEach((failure) => console.log(`  • ${failure.name}: ${failure.message}`));
  process.exit(1);
}

console.log('📦 Media gallery filtering and stats helpers are stable.\n');
