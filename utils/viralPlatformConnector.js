const https = require('https');

/**
 * Connect to viral social media platforms and return status indicators.
 * Maintains backwards compatibility with the existing mock interface.
 * @returns {Object} Supported platforms status
 */
function connectPlatforms() {
  return {
    TikTok: true,
    Instagram: true,
    YouTube: true,
    Facebook: true,
    Pinterest: true
  };
}

/**
 * Robust HTTPS request helper with built-in retry logic and exponential backoff
 * @private
 */
async function makeRequestWithRetry(url, method = 'GET', body = null, headers = {}, retries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    const runRequest = (attempt) => {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          if ((res.statusCode === 429 || res.statusCode >= 500) && attempt < retries) {
            console.warn('[Connector Warning] Status ' + res.statusCode + '. Retrying attempt ' + (attempt + 1) + '/' + retries + ' in ' + delay + 'ms...');
            setTimeout(() => {
              makeRequestWithRetry(url, method, body, headers, retries, delay * 2)
                .then(resolve)
                .catch(reject);
            }, delay);
            return;
          }

          if (res.statusCode >= 400) {
            return reject(new Error('API request failed with status ' + res.statusCode + ': ' + responseData));
          }

          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve(responseData);
          }
        });
      });

      req.on('error', (err) => {
        if (attempt < retries) {
          console.warn('[Connector Warning] Connection error: ' + err.message + '. Retrying...');
          setTimeout(() => {
            makeRequestWithRetry(url, method, body, headers, retries, delay * 2)
              .then(resolve)
              .catch(reject);
          }, delay);
        } else {
          reject(err);
        }
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    };

    runRequest(1);
  });
}

/**
 * Fetch real trending/viral videos from TikTok using Apify's Clockworks TikTok Scraper.
 * Requires APIFY_API_KEY environment variable.
 * @param {Array<string>} searchQueries Key search queries to target
 * @param {number} resultsPerPage Videos to extract per query
 * @returns {Promise<Array<Object>>} Formatted TikTok video items matching the ingested schema
 */
async function fetchTikTokTrending(searchQueries = ['viral marketing', 'viral ecommerce'], resultsPerPage = 8) {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    console.warn('[Connector Warning] APIFY_API_KEY is not defined. Falling back to local simulated data.');
    return getMockTikTokData();
  }

  console.log('[TikTok Connector] Launching real data fetch for queries: ' + searchQueries.join(', ') + '...');
  const startUrl = 'https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs?token=' + apiKey;

  const input = {
    searchQueries: searchQueries,
    resultsPerPage: resultsPerPage,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSlideshowImages: false
  };

  try {
    const runInfo = await makeRequestWithRetry(startUrl, 'POST', input);
    const runId = runInfo.data.id;
    const datasetId = runInfo.data.defaultDatasetId;

    console.log('[TikTok Connector] Scraper run started. Run ID: ' + runId + '. Waiting for results...');
    
    const statusUrl = 'https://api.apify.com/v2/acts/clockworks~tiktok-scraper/runs/' + runId + '?token=' + apiKey;
    let isFinished = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusInfo = await makeRequestWithRetry(statusUrl, 'GET');
      if (statusInfo.data.status === 'SUCCEEDED') {
        isFinished = true;
        break;
      } else if (statusInfo.data.status === 'FAILED' || statusInfo.data.status === 'ABORTED') {
        throw new Error('TikTok Scraper run terminated with status: ' + statusInfo.data.status);
      }
    }

    if (!isFinished) {
      throw new Error('TikTok Scraper execution timed out (max polling reached).');
    }

    const datasetUrl = 'https://api.apify.com/v2/datasets/' + datasetId + '/items?token=' + apiKey;
    const items = await makeRequestWithRetry(datasetUrl, 'GET');
    
    return items.map(item => ({
      video_url: item.webVideoUrl || ('https://www.tiktok.com/@' + item.authorMeta?.uniqueId + '/video/' + item.id),
      description: item.text || '',
      hashtags: (item.hashtags || []).map(h => h.title || h.name).filter(Boolean).join(','),
      views: item.playCount || 0,
      likes: item.diggCount || 0,
      shares: item.shareCount || 0,
      comments: item.commentCount || 0,
      author: item.authorMeta?.nickName || item.authorMeta?.uniqueId || 'Unknown',
      engagement_rate: item.playCount > 0 ? (item.diggCount + item.commentCount + item.shareCount) / item.playCount : 0,
      ingested_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error('[TikTok Connector] Error fetching live data:', error.message);
    throw error;
  }
}

/**
 * Fetch trending/viral reels and posts from Instagram using Apify's Instagram Scraper.
 * Requires APIFY_API_KEY environment variable.
 * @param {Array<string>} directUrls Profile/Account URLs to scrape from
 * @param {number} resultsLimit Maximum posts/reels to retrieve per profile
 * @returns {Promise<Array<Object>>} Formatted Instagram posts matching the ingested schema
 */
async function fetchInstagramPosts(directUrls = ['https://www.instagram.com/hubspot/'], resultsLimit = 10) {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    console.warn('[Connector Warning] APIFY_API_KEY is not defined. Falling back to local simulated data.');
    return getMockInstagramData();
  }

  console.log('[Instagram Connector] Launching real data fetch for URLs: ' + directUrls.join(', ') + '...');
  const startUrl = 'https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=' + apiKey;

  const input = {
    directUrls: directUrls,
    resultsLimit: resultsLimit,
    resultsType: 'posts'
  };

  try {
    const runInfo = await makeRequestWithRetry(startUrl, 'POST', input);
    const runId = runInfo.data.id;
    const datasetId = runInfo.data.defaultDatasetId;

    console.log('[Instagram Connector] Scraper run started. Run ID: ' + runId + '. Waiting for results...');
    
    const statusUrl = 'https://api.apify.com/v2/acts/apify~instagram-scraper/runs/' + runId + '?token=' + apiKey;
    let isFinished = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusInfo = await makeRequestWithRetry(statusUrl, 'GET');
      if (statusInfo.data.status === 'SUCCEEDED') {
        isFinished = true;
        break;
      } else if (statusInfo.data.status === 'FAILED' || statusInfo.data.status === 'ABORTED') {
        throw new Error('Instagram Scraper run terminated with status: ' + statusInfo.data.status);
      }
    }

    if (!isFinished) {
      throw new Error('Instagram Scraper execution timed out (max polling reached).');
    }

    const datasetUrl = 'https://api.apify.com/v2/datasets/' + datasetId + '/items?token=' + apiKey;
    const items = await makeRequestWithRetry(datasetUrl, 'GET');
    
    return items.map(item => ({
      post_url: item.url || ('https://www.instagram.com/p/' + item.shortCode),
      caption: item.caption || '',
      hashtags: (item.hashtags || []).join(','),
      likes: item.likesCount || 0,
      comments: item.commentsCount || 0,
      media_type: item.type || 'Post',
      author: item.ownerUsername || 'Unknown',
      engagement_rate: (item.likesCount + item.commentsCount) / 10000.0,
      ingested_at: new Date().toISOString()
    }));
  } catch (error) {
    console.error('[Instagram Connector] Error fetching live data:', error.message);
    throw error;
  }
}

function getMockTikTokData() {
  return [
    {
      video_url: 'https://www.tiktok.com/@charlyecomm1/video/7633929548391779591',
      description: '#viralvideo #dropshipping #ecommerce #motivacion #fyp',
      hashtags: 'viralvideo,dropshipping,ecommerce,motivacion,fyp',
      views: 326500,
      likes: 56500,
      shares: 4711,
      comments: 297,
      author: 'Charly Ecomm',
      engagement_rate: 0.188,
      ingested_at: new Date().toISOString()
    }
  ];
}

function getMockInstagramData() {
  return [
    {
      post_url: 'https://www.instagram.com/p/DYUtOb8t73y/',
      caption: '@shopify can help silence the horrors within! #shopifypartner #ad',
      hashtags: 'shopifypartner,ad',
      likes: 5757,
      comments: 216,
      media_type: 'Video',
      author: 'legitpat',
      engagement_rate: 0.597,
      ingested_at: new Date().toISOString()
    }
  ];
}

module.exports = {
  connectPlatforms,
  fetchTikTokTrending,
  fetchInstagramPosts
};
