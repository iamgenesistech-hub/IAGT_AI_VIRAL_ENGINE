'use strict';

/**
 * commercialAssembler.js — Pure commercial assembly planning module.
 *
 * Responsibilities:
 *   - planCommercialTimeline(record)   Build an ordered shot list from a job record.
 *   - resolveTrackSources(record)      Resolve the hero and presenter video URLs.
 *   - isMultiTrackReady(record)        Return true only when both tracks are usable.
 *   - summarizeAssembly(record)        Return a human-readable assembly summary.
 *
 * All functions are pure: no I/O, no side effects, no mutation of the input record.
 */

// Single source of truth for passthrough/fallback reason messages surfaced to consumers.
const PASSTHROUGH_REASON = 'Cinematic stage used passthrough — no real cinematic clip generated.';
const FALLBACK_REASON = 'Cinematic stage fell back to HeyGen video — real cinematic clip discarded.';

/**
 * Resolve the hero (cinematic) and presenter (HeyGen) track URLs from a job record.
 *
 * @param {object} record
 * @returns {{ heroUrl: string|null, presenterUrl: string|null, heroAvailable: boolean, presenterAvailable: boolean }}
 */
function resolveTrackSources(record = {}) {
  const heroUrl = (record.useCinematicVideoAsBase && record.cinematicVideoUrl)
    ? record.cinematicVideoUrl
    : null;
  const presenterUrl = record.heygenVideoUrl || null;
  return {
    heroUrl,
    presenterUrl,
    heroAvailable: Boolean(heroUrl),
    presenterAvailable: Boolean(presenterUrl)
  };
}

/**
 * Return true when both hero and presenter tracks are available for a full two-shot assembly.
 *
 * @param {object} record
 * @returns {boolean}
 */
function isMultiTrackReady(record = {}) {
  const { heroAvailable, presenterAvailable } = resolveTrackSources(record);
  return heroAvailable && presenterAvailable;
}

/**
 * Plan the commercial timeline for a job record.
 *
 * Returns an ordered array of shot descriptors:
 *   - { shotIndex, role, url, muted, label }
 *
 * Multi-track: hero cold-open (muted) then presenter voiced segment.
 * Degrade: presenter-only when hero is unavailable.
 *
 * @param {object} record
 * @returns {{ shots: Array<object>, mode: 'multi-track'|'presenter-only', degradedReasons: string[] }}
 */
function planCommercialTimeline(record = {}) {
  const { heroUrl, presenterUrl, heroAvailable, presenterAvailable } = resolveTrackSources(record);
  const degradedReasons = [];

  if (!presenterAvailable) {
    degradedReasons.push('presenter track (HeyGen) is unavailable');
  }
  if (!heroAvailable) {
    degradedReasons.push('hero cinematic track is unavailable — no successful cinematic provider output');
  }

  if (heroAvailable && presenterAvailable) {
    return {
      shots: [
        { shotIndex: 0, role: 'hero-cold-open', url: heroUrl, muted: true, label: 'Cinematic product cold-open (muted)' },
        { shotIndex: 1, role: 'presenter-main', url: presenterUrl, muted: false, label: 'Presenter voiced main segment' }
      ],
      mode: 'multi-track',
      degradedReasons: []
    };
  }

  if (presenterAvailable) {
    return {
      shots: [
        { shotIndex: 0, role: 'presenter-main', url: presenterUrl, muted: false, label: 'Presenter voiced main segment (presenter-only)' }
      ],
      mode: 'presenter-only',
      degradedReasons
    };
  }

  return {
    shots: [],
    mode: 'presenter-only',
    degradedReasons
  };
}

/**
 * Summarize the current assembly state of a job record.
 *
 * @param {object} record
 * @returns {{ assembled: boolean, mode: string|null, shotsRendered: number, heroAvailable: boolean, presenterAvailable: boolean, degradedReasons: string[], passthroughReason: string|null }}
 */
function summarizeAssembly(record = {}) {
  const { heroAvailable, presenterAvailable } = resolveTrackSources(record);
  const assembled = Boolean(record.commercialAssembled);
  const mode = record.assemblyMode || null;
  const shotsRendered = typeof record.shotsRendered === 'number' ? record.shotsRendered : 0;
  const degradedReasons = Array.isArray(record.degradedReasons) ? record.degradedReasons : [];

  let passthroughReason = record.passthroughReason || null;
  if (!passthroughReason && !assembled && record.cinematicPassthrough) {
    passthroughReason = PASSTHROUGH_REASON;
  }
  if (!passthroughReason && !assembled && record.cinematicFallback && !record.useCinematicVideoAsBase) {
    passthroughReason = FALLBACK_REASON;
  }

  return {
    assembled,
    mode,
    shotsRendered,
    heroAvailable,
    presenterAvailable,
    degradedReasons,
    passthroughReason
  };
}

module.exports = {
  PASSTHROUGH_REASON,
  FALLBACK_REASON,
  planCommercialTimeline,
  resolveTrackSources,
  isMultiTrackReady,
  summarizeAssembly
};
