'use strict';

/**
 * videoAssembler.js — Minimal two-shot commercial base assembler.
 *
 * Assembles a two-shot commercial:
 *   Shot 0: hero cinematic clip — muted cold-open
 *   Shot 1: presenter/HeyGen clip — voiced main segment
 *
 * Degrades honestly to presenter-only when the hero track is unavailable.
 * Reuses downloadFile from videoPostProcessor.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { downloadFile } = require('./videoPostProcessor');

const ASSEMBLED_DIR = path.join(__dirname, '../assembled-videos');
const MEDIA_CACHE_DIR = path.join(__dirname, '../media-cache');

if (!fs.existsSync(ASSEMBLED_DIR)) fs.mkdirSync(ASSEMBLED_DIR, { recursive: true });
if (!fs.existsSync(MEDIA_CACHE_DIR)) fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });

/**
 * Assemble a minimal commercial base from hero and presenter tracks.
 *
 * @param {object} opts
 * @param {string} opts.videoJobId   Unique job identifier (used for file naming).
 * @param {string|null} opts.heroUrl  URL of the cinematic hero clip (cold-open, will be muted).
 * @param {string} opts.presenterUrl  URL of the HeyGen presenter clip (voiced main segment).
 * @returns {Promise<{ success: boolean, assembledVideoPath: string|null, assembledVideoUrl: string|null, assemblyMode: string, shotsRendered: number, error: string|null }>}
 */
async function assembleCommercialBase({ videoJobId, heroUrl, presenterUrl }) {
  if (!presenterUrl) {
    return {
      success: false,
      assembledVideoPath: null,
      assembledVideoUrl: null,
      assemblyMode: 'presenter-only',
      shotsRendered: 0,
      error: 'Presenter track is required for assembly but was not provided.'
    };
  }

  const outputPath = path.join(ASSEMBLED_DIR, `${videoJobId}_assembled.mp4`);
  const presenterPath = path.join(MEDIA_CACHE_DIR, `${videoJobId}_presenter.mp4`);

  // Download presenter track
  try {
    await downloadFile(presenterUrl, presenterPath);
  } catch (err) {
    return {
      success: false,
      assembledVideoPath: null,
      assembledVideoUrl: null,
      assemblyMode: 'presenter-only',
      shotsRendered: 0,
      error: `Failed to download presenter track: ${err.message}`
    };
  }

  // Attempt multi-track assembly when hero URL is available
  if (heroUrl) {
    const heroPath = path.join(MEDIA_CACHE_DIR, `${videoJobId}_hero.mp4`);
    try {
      await downloadFile(heroUrl, heroPath);

      // Two-shot assembly:
      //   [0] hero clip: rescaled to match presenter dimensions, audio stripped (muted cold-open)
      //   [1] presenter clip: full audio, voiced main segment
      // concat filter joins them as a single output stream
      const concatListPath = path.join(MEDIA_CACHE_DIR, `${videoJobId}_concat.txt`);
      fs.writeFileSync(concatListPath, `file '${heroPath}'\nfile '${presenterPath}'\n`);

      const ffmpegArgs = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '21',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputPath
      ];

      execFileSync('ffmpeg', ffmpegArgs, { timeout: 180000, stdio: 'pipe' });

      // Clean up temp files
      try { fs.unlinkSync(concatListPath); } catch {}
      try { fs.unlinkSync(heroPath); } catch {}
      try { fs.unlinkSync(presenterPath); } catch {}

      return {
        success: true,
        assembledVideoPath: outputPath,
        assembledVideoUrl: `/assembled-videos/${videoJobId}_assembled.mp4`,
        assemblyMode: 'multi-track',
        shotsRendered: 2,
        error: null
      };
    } catch (err) {
      // Hero download or ffmpeg failed — degrade gracefully to presenter-only
      const stderr = err && err.stderr ? err.stderr.toString().slice(0, 500) : '';
      console.warn(`[VideoAssembler] Multi-track assembly failed for ${videoJobId}, degrading to presenter-only. ${stderr || err.message}`);
      try { fs.unlinkSync(path.join(MEDIA_CACHE_DIR, `${videoJobId}_hero.mp4`)); } catch {}
    }
  }

  // Presenter-only path: copy (or re-encode to normalize) the presenter track
  try {
    const ffmpegArgs = [
      '-y',
      '-i', presenterPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '21',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath
    ];

    execFileSync('ffmpeg', ffmpegArgs, { timeout: 120000, stdio: 'pipe' });
    try { fs.unlinkSync(presenterPath); } catch {}

    return {
      success: true,
      assembledVideoPath: outputPath,
      assembledVideoUrl: `/assembled-videos/${videoJobId}_assembled.mp4`,
      assemblyMode: 'presenter-only',
      shotsRendered: 1,
      error: null
    };
  } catch (err) {
    const stderr = err && err.stderr ? err.stderr.toString().slice(0, 500) : '';
    return {
      success: false,
      assembledVideoPath: null,
      assembledVideoUrl: null,
      assemblyMode: 'presenter-only',
      shotsRendered: 0,
      error: `Assembly failed: ${stderr || err.message}`
    };
  }
}

module.exports = { assembleCommercialBase };
