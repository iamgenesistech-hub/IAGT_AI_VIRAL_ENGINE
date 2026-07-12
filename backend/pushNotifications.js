// backend/pushNotifications.js — Expo Push Notification sender.
// Sends push alerts to affiliate devices when their videos complete.
'use strict';

const https = require('https');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send one or more Expo push notifications.
 * @param {Array<{to: string, title: string, body: string, data?: object, sound?: string}>} messages
 */
async function sendExpoPushNotifications(messages) {
  if (!messages || messages.length === 0) return;
  const validMessages = messages.filter(m => m.to && String(m.to).startsWith('ExponentPushToken['));
  if (validMessages.length === 0) return;

  return new Promise((resolve) => {
    const payload = JSON.stringify(validMessages);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(EXPO_PUSH_URL, options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('error', (err) => {
      console.error('[Push] Expo push request failed:', err.message);
      resolve(null);
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Notify an affiliate that their video is ready.
 * @param {object} params
 * @param {string} params.expoPushToken - Token from mobile/app/_layout.tsx
 * @param {string} params.productTitle - Product name for the notification body
 * @param {string} params.videoJobId
 * @param {number} [params.qualityScore]
 */
async function notifyVideoReady({ expoPushToken, productTitle, videoJobId, qualityScore }) {
  if (!expoPushToken) return;
  try {
    const body = productTitle
      ? `Your "${productTitle}" video is ready!${qualityScore != null ? ` Score: ${qualityScore}` : ''}`
      : `Your AI video is ready to share!`;
    await sendExpoPushNotifications([{
      to: expoPushToken,
      title: '🎬 Video Ready',
      body,
      sound: 'default',
      data: { videoJobId, type: 'video_ready' },
    }]);
    console.log(`[Push] Sent video-ready notification for job ${videoJobId}`);
  } catch (err) {
    console.error('[Push] notifyVideoReady failed (non-fatal):', err.message);
  }
}

/**
 * Notify an affiliate that a payout has been processed.
 * @param {object} params
 * @param {string} params.expoPushToken
 * @param {string} params.amount
 * @param {string} params.method - 'btc' | 'eth' | 'usd'
 */
async function notifyPayoutProcessed({ expoPushToken, amount, method }) {
  if (!expoPushToken) return;
  try {
    await sendExpoPushNotifications([{
      to: expoPushToken,
      title: '💰 Payout Sent',
      body: `${amount} sent via ${method.toUpperCase()}. Check your wallet.`,
      sound: 'default',
      data: { type: 'payout_processed' },
    }]);
  } catch (err) {
    console.error('[Push] notifyPayoutProcessed failed (non-fatal):', err.message);
  }
}

module.exports = { sendExpoPushNotifications, notifyVideoReady, notifyPayoutProcessed };
