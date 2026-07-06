'use strict';

function normalizeProfileId(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64);
}

function resolveAvatarOwnerCode(record) {
  if (!record || typeof record !== 'object') return '';
  return normalizeProfileId(
    record.profileId ||
    record.affiliateCode ||
    record.affiliateId ||
    record.avatar?.profileId ||
    record.avatar?.affiliateCode ||
    record.avatar?.affiliateId
  );
}

function resolveAvatarCreationGuardrails(input = {}) {
  const photoUrl = String(input.photoUrl || '').trim();
  const voiceFileUrl = String(input.voiceFileUrl || '').trim();
  const voiceCloneId = String(input.voiceCloneId || '').trim();

  if (!photoUrl) {
    throw new Error('A photo URL is required to create an avatar.');
  }

  return {
    photoUrl,
    voiceFileUrl: voiceFileUrl || null,
    voiceCloneId: voiceCloneId || null,
    mustCloneVoice: Boolean(voiceFileUrl),
    allowStockVoiceFallback: !voiceFileUrl
  };
}

module.exports = {
  normalizeProfileId,
  resolveAvatarOwnerCode,
  resolveAvatarCreationGuardrails
};
