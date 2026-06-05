const https = require('https');

/**
 * Connect to advertising platforms and return status indicators.
 * Maintains backwards compatibility with the existing mock interface.
 * @returns {Object} Supported ad platforms status
 */
function connectAdPlatforms() {
  return {
    Meta: true,
    TikTokAds: true,
    GoogleAds: true,
    YouTubeAds: true
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
 * Fetch real active ad campaigns from the Meta Ad Library using Apify's Meta Ads Scraper.
 * Requires APIFY_API_KEY environment variable.
 * @param {Array<string>} startUrls Brand/Page URLs from Meta Ad Library to query
 * @param {number} resultsLimit Maximum ad creatives to extract
 * @returns {Promise<Array<Object>>} Formatted ad records matching the ingested schema
 */
async function fetchMetaAds(startUrls = [{ url: 'https://www.facebook.com/shopify' }], resultsLimit = 10) {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    console.warn('[Connector Warning] APIFY_API_KEY is not defined. Falling back to local simulated data.');
    return getMockMetaAdsData();
  }

  console.log('[Meta Ads Connector] Launching real data fetch for ' + startUrls.length + ' pages...');
  const startUrl = 'https://api.apify.com/v2/acts/apify~facebook-ads-scraper/runs?token=' + apiKey;

  const input = {
    startUrls: startUrls,
    resultsLimit: resultsLimit,
    activeStatus: 'active'
  };

  try {
    const runInfo = await makeRequestWithRetry(startUrl, 'POST', input);
    const runId = runInfo.data.id;
    const datasetId = runInfo.data.defaultDatasetId;

    console.log('[Meta Ads Connector] Scraper run started. Run ID: ' + runId + '. Waiting for results...');
    
    const statusUrl = 'https://api.apify.com/v2/acts/apify~facebook-ads-scraper/runs/' + runId + '?token=' + apiKey;
    let isFinished = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusInfo = await makeRequestWithRetry(statusUrl, 'GET');
      if (statusInfo.data.status === 'SUCCEEDED') {
        isFinished = true;
        break;
      } else if (statusInfo.data.status === 'FAILED' || statusInfo.data.status === 'ABORTED') {
        throw new Error('Meta Ads Scraper run terminated with status: ' + statusInfo.data.status);
      }
    }

    if (!isFinished) {
      throw new Error('Meta Ads Scraper execution timed out (max polling reached).');
    }

    const datasetUrl = 'https://api.apify.com/v2/datasets/' + datasetId + '/items?token=' + apiKey;
    const items = await makeRequestWithRetry(datasetUrl, 'GET');
    
    return items.map(item => {
      const ad_id = item.adArchiveId || item.adArchiveID || 'Unknown_Ad_ID';
      
      let ad_text = '';
      if (item.snapshot) {
        if (item.snapshot.body?.text) ad_text = item.snapshot.body.text;
        else if (item.snapshot.caption) ad_text = item.snapshot.caption;
        else if (item.snapshot.cards?.[0]?.body) ad_text = item.snapshot.cards[0].body;
      }
      if (!ad_text) ad_text = 'No ad text';

      let media_url = '';
      if (item.snapshot) {
        if (item.snapshot.images?.length > 0) {
          media_url = item.snapshot.images[0].original_image_url || item.snapshot.images[0].url || '';
        }
        if (!media_url && item.snapshot.videos?.length > 0) {
          media_url = item.snapshot.videos[0].video_hd_url || item.snapshot.videos[0].video_preview_image_url || '';
        }
        if (!media_url && item.snapshot.cards?.length > 0) {
          for (const card of item.snapshot.cards) {
            media_url = card.originalImageUrl || card.resizedImageUrl || card.videoHdUrl || card.videoPreviewImageUrl || '';
            if (media_url) break;
          }
        }
        if (!media_url) {
          media_url = item.snapshot.pageProfilePictureUrl || '';
        }
      }

      return {
        ad_id: ad_id,
        ad_text: ad_text,
        media_url: media_url,
        page_name: item.pageName || 'Unknown',
        start_date: item.startDateFormatted || '',
        platform: (item.publisherPlatform || []).join(','),
        ingested_at: new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('[Meta Ads Connector] Error fetching live data:', error.message);
    throw error;
  }
}

function getMockMetaAdsData() {
  return [
    {
      ad_id: '1255018519439095',
      ad_text: 'Ready to build your store? With Shopify, itâs as easy as drag, drop, done.',
      media_url: 'https://video-lga3-3.xx.fbcdn.net/o1/v/t2/f2/m412/...mp4',
      page_name: 'Shopify',
      start_date: '2025-08-26T07:00:00.000Z',
      platform: 'FACEBOOK,INSTAGRAM,MESSENGER,THREADS',
      ingested_at: new Date().toISOString()
    }
  ];
}

module.exports = {
  connectAdPlatforms,
  fetchMetaAds
};
