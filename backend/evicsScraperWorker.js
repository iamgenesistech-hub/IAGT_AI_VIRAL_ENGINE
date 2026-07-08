'use strict';

/**
 * EVICS Scraper HTTP Worker
 * Executes scrape jobs against allowed sources using native fetch.
 * Returns normalized raw data ready for the normalization pipeline.
 * No headless browser required — HTTP-only for Cloud Run compatibility.
 */

const https = require('https');
const http = require('http');

const DEFAULT_TIMEOUT_MS = 12000;

// Safe fetch using Node.js built-in https/http (no external deps)
function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EVICS-Scraper/1.0; +https://iamgenesistech.com)',
        Accept: 'text/html,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(options.headers || {}),
      },
      timeout: timeoutMs,
    };

    const timer = setTimeout(() => {
      req.destroy(new Error(`Fetch timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const req = lib.request(reqOptions, (res) => {
      clearTimeout(timer);
      // Follow one redirect
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) && res.headers.location) {
        try {
          const redirectUrl = new URL(res.headers.location, url).href;
          return fetchWithTimeout(redirectUrl, options, timeoutMs).then(resolve).catch(reject);
        } catch {
          return reject(new Error(`Redirect to invalid URL: ${res.headers.location}`));
        }
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });

    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.on('timeout', () => { req.destroy(); reject(new Error(`Request timed out after ${timeoutMs}ms`)); });
    req.end();
  });
}

// Extract text content from raw HTML (no DOM parser — regex-based)
function extractTextFromHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 8000);
}

// Extract open-graph / meta tags from HTML
function extractMetaTags(html) {
  const meta = {};
  const patterns = [
    [/og:title[^>]*content="([^"]+)"/i, 'ogTitle'],
    [/og:description[^>]*content="([^"]+)"/i, 'ogDescription'],
    [/og:image[^>]*content="([^"]+)"/i, 'ogImage'],
    [/og:url[^>]*content="([^"]+)"/i, 'ogUrl'],
    [/<title>([^<]+)<\/title>/i, 'pageTitle'],
    [/<meta[^>]*name="description"[^>]*content="([^"]+)"/i, 'metaDescription'],
  ];
  for (const [pattern, key] of patterns) {
    const m = html.match(pattern);
    if (m) meta[key] = m[1].trim().slice(0, 512);
  }
  return meta;
}

// Extract JSON-LD structured data from HTML
function extractJsonLd(html) {
  const results = [];
  const matches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of matches) {
    try {
      results.push(JSON.parse(m[1]));
    } catch { /* skip malformed */ }
  }
  return results;
}

// Extract price signals from page text
function extractPriceSignals(text) {
  const prices = [];
  const pricePattern = /\$\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/g;
  let match;
  while ((match = pricePattern.exec(text)) !== null) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (!Number.isNaN(value) && value > 0 && value < 100000) {
      prices.push(value);
    }
  }
  // Deduplicate and sort
  return [...new Set(prices)].sort((a, b) => a - b).slice(0, 20);
}

// Extract hashtags from text
function extractHashtags(text) {
  const tags = [];
  const pattern = /#([A-Za-z][A-Za-z0-9_]{1,49})/g;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    tags.push(m[1].toLowerCase());
  }
  return [...new Set(tags)].slice(0, 30);
}

/**
 * Execute a single scrape job and return normalized raw data.
 * @param {object} job - scraper job record
 * @returns {Promise<object>} - raw scrape result
 */
async function executeScraperJob(job) {
  const startedAt = new Date().toISOString();

  const response = await fetchWithTimeout(job.url, {}, DEFAULT_TIMEOUT_MS);

  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status} from ${job.url}`);
  }

  const contentType = String(response.headers['content-type'] || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const isHtml = contentType.includes('text/html') || contentType.includes('text/plain');

  let parsed = null;
  if (isJson) {
    try { parsed = JSON.parse(response.body); } catch { /* ok */ }
  }

  const text = isHtml ? extractTextFromHtml(response.body) : response.body.slice(0, 8000);
  const meta = isHtml ? extractMetaTags(response.body) : {};
  const jsonLd = isHtml ? extractJsonLd(response.body) : [];
  const prices = extractPriceSignals(text);
  const hashtags = extractHashtags(text);

  return {
    url: job.url,
    category: job.category,
    affiliateCode: job.affiliateCode || null,
    httpStatus: response.status,
    contentType,
    isJson,
    isHtml,
    rawJson: parsed,
    meta,
    jsonLd,
    textContent: text,
    prices,
    hashtags,
    textLength: text.length,
    scrapedAt: startedAt,
    completedAt: new Date().toISOString(),
  };
}

module.exports = { executeScraperJob, fetchWithTimeout, extractTextFromHtml, extractMetaTags, extractHashtags, extractPriceSignals };
