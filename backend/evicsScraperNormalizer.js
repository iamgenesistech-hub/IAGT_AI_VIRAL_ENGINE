'use strict';

/**
 * EVICS Scraper Normalization Pipeline
 * Takes raw scrape results and produces structured intelligence records
 * ready for scoring, storage, and feed into the content generation pipeline.
 */

// Detect the overall content category from meta + text
function detectContentCategory(raw) {
  const text = String(raw.textContent || raw.meta?.ogDescription || raw.meta?.metaDescription || '').toLowerCase();
  const url = String(raw.url || '').toLowerCase();

  if (url.includes('amazon') || url.includes('/dp/') || url.includes('/product') || raw.prices.length > 0) return 'product';
  if (url.includes('tiktok') || url.includes('instagram') || url.includes('youtube') || url.includes('facebook')) return 'social_content';
  if (text.includes('competitor') || text.includes('vs ') || text.includes('alternative')) return 'competitor';
  if (raw.hashtags.length > 5) return 'trending_social';
  return raw.category || 'general';
}

// Extract product signals from JSON-LD (Schema.org Product)
function extractProductFromJsonLd(jsonLdArray) {
  for (const item of jsonLdArray) {
    const type = String(item['@type'] || '').toLowerCase();
    if (type === 'product' || type === 'offer') {
      const offer = item.offers && typeof item.offers === 'object' ? item.offers : item;
      return {
        name: String(item.name || '').trim().slice(0, 256) || null,
        description: String(item.description || '').trim().slice(0, 1024) || null,
        brand: String(item.brand?.name || item.brand || '').trim() || null,
        sku: String(item.sku || item.gtin || '').trim() || null,
        price: parseFloat(String(offer.price || offer.lowPrice || '').replace(/[^0-9.]/g, '')) || null,
        priceCurrency: String(offer.priceCurrency || 'USD').trim(),
        availability: String(offer.availability || '').replace('https://schema.org/', '') || null,
        imageUrl: Array.isArray(item.image) ? item.image[0] : (String(item.image || '').trim() || null),
        ratingValue: parseFloat(item.aggregateRating?.ratingValue) || null,
        reviewCount: parseInt(item.aggregateRating?.reviewCount, 10) || null,
      };
    }
  }
  return null;
}

// Score a normalized record on 0-100 signal quality
function computeSignalQuality(normalized) {
  let score = 0;
  if (normalized.title) score += 15;
  if (normalized.description && normalized.description.length > 50) score += 15;
  if (normalized.imageUrl) score += 10;
  if (normalized.product?.price != null) score += 20;
  if (normalized.product?.ratingValue != null) score += 10;
  if (normalized.hashtags?.length > 0) score += 10;
  if (normalized.prices?.length > 0) score += 10;
  if (normalized.textLength > 200) score += 10;
  return Math.min(100, score);
}

/**
 * Normalize a raw scrape result into a structured intelligence record.
 * @param {object} raw - output of executeScraperJob
 * @returns {object} normalized intelligence record
 */
function normalizeScraperResult(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('normalizeScraperResult: raw result is required');

  const product = extractProductFromJsonLd(raw.jsonLd || []);
  const contentCategory = detectContentCategory(raw);

  // Title resolution priority: og:title → product name → page title → URL path
  const title = raw.meta?.ogTitle || product?.name || raw.meta?.pageTitle || null;
  const description = raw.meta?.ogDescription || product?.description || raw.meta?.metaDescription || null;
  const imageUrl = raw.meta?.ogImage || product?.imageUrl || null;
  const canonicalUrl = raw.meta?.ogUrl || raw.url;

  const normalized = {
    // Identity
    sourceUrl: raw.url,
    canonicalUrl,
    affiliateCode: raw.affiliateCode || null,
    category: contentCategory,
    scrapedAt: raw.scrapedAt,

    // Content
    title: title ? String(title).trim().slice(0, 256) : null,
    description: description ? String(description).trim().slice(0, 1024) : null,
    imageUrl: imageUrl ? String(imageUrl).trim() : null,
    hashtags: raw.hashtags || [],
    prices: raw.prices || [],

    // Product intelligence
    product: product || null,

    // Social signals
    isShoppingContent: contentCategory === 'product' || (raw.prices.length > 0),
    isSocialContent: contentCategory === 'social_content' || contentCategory === 'trending_social',
    isCompetitorContent: contentCategory === 'competitor',

    // Quality
    signalQuality: 0, // filled below
    httpStatus: raw.httpStatus,
    textLength: raw.textLength || 0,
    completedAt: raw.completedAt,
  };

  normalized.signalQuality = computeSignalQuality(normalized);
  return normalized;
}

module.exports = { normalizeScraperResult, computeSignalQuality, extractProductFromJsonLd, detectContentCategory };
