/**
 * EVICS Decision Engine
 *
 * Real routing/decision logic for the EVICS autonomous pipeline. Given a scored
 * creative concept and its governance result, it decides whether to queue,
 * revise, or block the concept, ranks the best distribution channels for the
 * product, and assigns an execution priority + confidence. Deterministic and
 * dependency-free so it is safe to call inside request handlers and easy to test.
 *
 * Backward compatible with the legacy stub payload
 * ({ product, score, channel, format }).
 */

'use strict';

const DISCOVERY_CHANNELS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Pinterest'];
const CONVERSION_CHANNELS = ['Facebook Feed', 'Instagram Feed', 'Shopify Product Page', 'Retargeting'];

function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

function rankChannels(product) {
  const type = String((product && (product.product_type || product.category)) || '').toLowerCase();
  const tags = String((product && product.tags) || '').toLowerCase();
  const text = type + ' ' + tags;
  const discoveryLean = /(viral|creator|trend|gen[- ]?z|social|ugc|challenge)/.test(text);
  const conversionLean = /(premium|bundle|subscription|wellness|supplement|skincare|performance|offer)/.test(text);
  if (conversionLean && !discoveryLean) return CONVERSION_CHANNELS.concat(DISCOVERY_CHANNELS);
  if (discoveryLean && !conversionLean) return DISCOVERY_CHANNELS.concat(CONVERSION_CHANNELS);
  // Balanced posture: interleave, discovery first (growth default).
  const out = [];
  for (let i = 0; i < 4; i++) { out.push(DISCOVERY_CHANNELS[i]); out.push(CONVERSION_CHANNELS[i]); }
  return out;
}

function makeEVICSDecision(payload) {
  const p = payload || {};
  const productObj = (p.product && typeof p.product === 'object') ? p.product : null;
  const productName = productObj
    ? (productObj.title || productObj.product_name || productObj.name || 'Product')
    : (p.product || 'Default Product');

  const policy = p.policy || {};
  const minApproval = clamp(
    p.minimumApprovalScore != null ? p.minimumApprovalScore : policy.minimumApprovalScore != null ? policy.minimumApprovalScore : 82,
    0, 100
  );
  const boardScore = clamp(p.boardScore != null ? p.boardScore : p.score != null ? p.score : 0, 0, 100);
  const governanceApproved = p.governanceApproved !== false && p.governanceBlocked !== true;
  const manipulationRisk = clamp(p.manipulationRisk || 0, 0, 100);
  const truthScore = clamp(p.truthScore != null ? p.truthScore : 100, 0, 100);

  const boardApproved = boardScore >= minApproval;

  let action, approved, status, reason;
  if (!governanceApproved) {
    action = 'block'; approved = false; status = 'Blocked by Governance';
    reason = 'The Sacred Intelligence governance gate did not approve this concept.';
  } else if (boardApproved) {
    action = 'queue'; approved = true; status = 'Approved & Queued';
    reason = 'Board consensus ' + boardScore + ' met the ' + minApproval + ' threshold and governance approved the message.';
  } else {
    action = 'revise'; approved = false; status = 'Needs Review';
    reason = 'Board consensus ' + boardScore + ' is below the ' + minApproval + ' threshold; hold for revision.';
  }

  const channels = rankChannels(productObj || {});
  const priority = boardScore >= 90 ? 'High' : boardScore >= minApproval ? 'Normal' : 'Low';
  const confidence = Math.round(clamp(boardScore * 0.6 + truthScore * 0.3 + (100 - manipulationRisk) * 0.1, 0, 100));

  return {
    product: productName,
    approved,
    action,
    status,
    reason,
    recommendedAction: action === 'queue'
      ? 'Queue for render and scheduled distribution.'
      : action === 'revise'
        ? 'Return to creative for a stronger hook/CTA, then re-evaluate.'
        : 'Do not distribute; governance review required.',
    confidence,
    routing: {
      primaryChannel: channels[0],
      channels: channels,
      format: p.format || (productObj && productObj.product_type) || 'Short-form vertical video',
      priority: priority
    },
    metadata: {
      boardScore: boardScore,
      minimumApprovalScore: minApproval,
      governanceApproved: governanceApproved,
      manipulationRisk: manipulationRisk,
      truthScore: truthScore,
      generatedAt: new Date().toISOString(),
      engineVersion: '2.0.0'
    }
  };
}

module.exports = {
  makeEVICSDecision,
  rankChannels
};
