'use strict';

function normalizeText(value) {
  return String(value || '').trim();
}

function getHeyGenKeyLockConfig() {
  return {
    requiredPrefix: normalizeText(process.env.HEYGEN_REQUIRED_KEY_PREFIX || 'sk_V2_'),
    requiredSuffix: normalizeText(process.env.HEYGEN_REQUIRED_KEY_SUFFIX || 'gnDE'),
    strict: String(process.env.HEYGEN_ACCOUNT_LOCK_STRICT || 'true').toLowerCase() === 'true'
  };
}

function assertLockedHeyGenApiKey(apiKey = process.env.HEYGEN_API_KEY) {
  const key = normalizeText(apiKey);
  if (!key) {
    const error = new Error('HEYGEN_API_KEY is not configured.');
    error.code = 'HEYGEN_API_KEY_MISSING';
    throw error;
  }

  const cfg = getHeyGenKeyLockConfig();
  if (!cfg.strict) return key;

  if (cfg.requiredPrefix && !key.startsWith(cfg.requiredPrefix)) {
    const error = new Error(`HEYGEN_API_KEY prefix mismatch. Expected prefix "${cfg.requiredPrefix}".`);
    error.code = 'HEYGEN_ACCOUNT_LOCK_MISMATCH';
    throw error;
  }

  if (cfg.requiredSuffix && !key.endsWith(cfg.requiredSuffix)) {
    const error = new Error(`HEYGEN_API_KEY suffix mismatch. Expected suffix "${cfg.requiredSuffix}".`);
    error.code = 'HEYGEN_ACCOUNT_LOCK_MISMATCH';
    throw error;
  }

  return key;
}

module.exports = {
  getHeyGenKeyLockConfig,
  assertLockedHeyGenApiKey
};
