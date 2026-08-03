// backend/avatarStudioRoutes.js
// EVICS Avatar Studio — custom avatar & voice registration.
//
// Purpose
//   Provide a workspace surface to add new avatars (Jordan, Roland's own,
//   others) and record/clone the voice that will be bound to each one.
//   Every new avatar_id is written to evics_avatars, and its voice_id is
//   also pinned in evics_avatar_voice_bindings so the voice-guardrail
//   enforced by mediaRenderCreator will never let it drift.
//
// Voice cloning provider: HeyGen Instant Voice Clone (single vendor).
// Avatar creation:        HeyGen Photo Avatar (v2/photo_avatar/photo/generate)
//                         or user-supplied HeyGen avatar_id (stock).
//
// Storage
//   - Uploaded audio + images are stored under UPLOADS_DIR (temp only) and
//     forwarded to HeyGen. HeyGen returns a permanent asset URL.
//
// Routes (all admin-gated by x-admin-key header)
//   GET  /api/avatar-studio/registry
//   POST /api/avatar-studio/voice/upload        (multipart: file, name, avatarId?)
//   POST /api/avatar-studio/avatar/upload       (multipart: file, name, gender, voiceId?)
//   POST /api/avatar-studio/register            (json: avatarId, name, gender, voiceId, source)
//   POST /api/avatar-studio/pin                 (json: avatarId, voiceId)
//   POST /api/avatar-studio/set-active          (json: avatarId, active)
//   POST /api/avatar-studio/set-default         (json: avatarId)
//   DELETE /api/avatar-studio/avatar/:id
//   POST /api/avatar-studio/test-render         (json: avatarId, script?)
//
// NOTE: This module intentionally has no side-effects until the request
//       is made. HeyGen calls are lazy and gated behind admin auth.

const fs      = require('fs');
const path    = require('path');
const multer  = require('multer');
// Node 18+ provides fetch, FormData, Blob as globals via undici.
const fetch    = global.fetch;
const FormData = global.FormData;
const Blob     = global.Blob;
if (!fetch || !FormData || !Blob) {
  throw new Error('avatarStudioRoutes requires Node 18+ (global fetch / FormData / Blob).');
}

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'avatar-studio');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) ||
                (file.mimetype && file.mimetype.includes('audio') ? '.m4a' :
                 file.mimetype && file.mimetype.includes('video') ? '.mp4' : '.jpg');
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /image\/(jpeg|png|webp|jpg)|audio\/(mpeg|mp3|mp4|wav|x-m4a|m4a|webm|ogg)|video\/(mp4|quicktime|webm)/;
    cb(null, allowed.test(file.mimetype || ''));
  }
});

const HEYGEN_BASE   = 'https://api.heygen.com';
const ADMIN_KEY_ENV = process.env.EVICS_ADMIN_KEY || process.env.ADMIN_KEY || '';

function isAdminAuthorized(req) {
  const supplied = String(req.get('x-admin-key') || req.query.adminKey || '').trim();
  if (!supplied) return false;
  if (!ADMIN_KEY_ENV) return true; // no key configured → allow (dev)
  return supplied === ADMIN_KEY_ENV;
}

function noStore(res) { res.setHeader('Cache-Control', 'no-store'); }

function heygenHeaders() {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error('HEYGEN_API_KEY missing in env');
  return { 'X-Api-Key': key, 'Accept': 'application/json' };
}

async function heygenPostJson(pathname, body) {
  const r = await fetch(`${HEYGEN_BASE}${pathname}`, {
    method: 'POST',
    headers: { ...heygenHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!r.ok) throw new Error(`HeyGen ${pathname} failed (${r.status}): ${text.slice(0, 500)}`);
  return json;
}

async function heygenPostMultipart(pathname, fields) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v && typeof v === 'object' && v.stream) {
      // Read the file into a Blob (Node 18 fetch handles Blob in FormData).
      const buf = await new Promise((resolve, reject) => {
        const chunks = [];
        v.stream.on('data', c => chunks.push(c));
        v.stream.on('end', () => resolve(Buffer.concat(chunks)));
        v.stream.on('error', reject);
      });
      const blob = new Blob([buf], { type: v.contentType || 'application/octet-stream' });
      form.append(k, blob, v.filename || 'upload.bin');
    } else if (v !== undefined && v !== null) {
      form.append(k, String(v));
    }
  }
  const r = await fetch(`${HEYGEN_BASE}${pathname}`, {
    method: 'POST',
    headers: heygenHeaders(), // do NOT set Content-Type — fetch adds multipart boundary automatically
    body: form
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!r.ok) throw new Error(`HeyGen ${pathname} failed (${r.status}): ${text.slice(0, 500)}`);
  return json;
}

// ---------- Supabase helpers -------------------------------------------------
async function upsertAvatar(SupabaseConnector, row) {
  if (!SupabaseConnector) return { data: null, error: 'SupabaseConnector missing' };
  try {
    const payload = { ...row, updated_at: new Date().toISOString() };
    const { data, error } = await SupabaseConnector
      .from('evics_avatars')
      .upsert(payload, { onConflict: 'avatar_id' })
      .select();
    if (error) return { data: null, error: error.message };
    return { data: (data && data[0]) || null, error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

async function writeVoicePin(SupabaseConnector, avatarId, voiceId, meta = {}) {
  if (!SupabaseConnector) return false;
  try {
    const { error } = await SupabaseConnector
      .from('evics_avatar_voice_bindings')
      .upsert({
        avatar_id: avatarId,
        voice_id: voiceId,
        gender:   meta.gender || null,
        language: meta.language || null,
        voice_name: meta.voice_name || null,
        source: meta.source || 'avatar-studio',
        created_at: new Date().toISOString()
      }, { onConflict: 'avatar_id' });
    if (error) console.warn('[avatar-studio] writeVoicePin failed:', error.message);
    return !error;
  } catch (e) {
    console.warn('[avatar-studio] writeVoicePin threw:', e.message);
    return false;
  }
}

async function listAvatars(SupabaseConnector) {
  if (!SupabaseConnector) return [];
  const { data, error } = await SupabaseConnector
    .from('evics_avatars')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name',       { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// ---------- Route registration ----------------------------------------------
function registerAvatarStudioRoutes(app, SupabaseConnector) {
  if (!app) throw new Error('registerAvatarStudioRoutes: app required');

  const requireAdmin = (req, res, next) => {
    if (!isAdminAuthorized(req)) {
      return res.status(401).json({ success: false, error: 'Admin key required (x-admin-key header).' });
    }
    next();
  };

  // --- GET registry --------------------------------------------------------
  app.get('/api/avatar-studio/registry', requireAdmin, async (_req, res) => {
    try {
      noStore(res);
      const rows = await listAvatars(SupabaseConnector);
      res.json({ success: true, count: rows.length, avatars: rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- POST /register (existing HeyGen stock or manually created) ---------
  app.post('/api/avatar-studio/register', requireAdmin, async (req, res) => {
    try {
      noStore(res);
      const { avatarId, name, gender, voiceId, source, previewUrl, notes, isDefault, active } = req.body || {};
      if (!avatarId || !name) {
        return res.status(400).json({ success: false, error: 'avatarId and name are required' });
      }
      const row = {
        avatar_id: String(avatarId).trim(),
        name: String(name).trim(),
        source: source || 'heygen_stock',
        gender: gender || null,
        voice_id: voiceId || null,
        preview_url: previewUrl || null,
        notes: notes || null,
        active: active !== false,
        is_default: !!isDefault,
        created_by: req.get('x-actor') || 'admin'
      };
      const up = await upsertAvatar(SupabaseConnector, row);
      if (up.error) return res.status(500).json({ success: false, error: up.error });

      if (voiceId) {
        await writeVoicePin(SupabaseConnector, row.avatar_id, String(voiceId).trim(), {
          gender: row.gender, source: 'avatar-studio/register'
        });
      }

      // If isDefault requested, clear other defaults.
      if (row.is_default) {
        try {
          await SupabaseConnector.from('evics_avatars')
            .update({ is_default: false })
            .neq('avatar_id', row.avatar_id);
        } catch {}
      }

      res.json({ success: true, avatar: up.data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- POST /voice/upload -------------------------------------------------
  // Multipart: file (audio), name, avatarId? (optional immediate pin)
  app.post('/api/avatar-studio/voice/upload', requireAdmin, upload.single('file'), async (req, res) => {
    try {
      noStore(res);
      if (!req.file) return res.status(400).json({ success: false, error: 'audio file field "file" is required' });
      const displayName = String(req.body.name || `EVICS Voice ${Date.now()}`).trim();
      const avatarId    = req.body.avatarId ? String(req.body.avatarId).trim() : null;
      const filePath    = req.file.path;
      const originalname = req.file.originalname || 'voice.m4a';
      const contentType  = req.file.mimetype || 'audio/mp4';

      // Send to HeyGen Instant Voice Clone.
      // Endpoint per HeyGen docs (as of 2025): POST /v1/voice_clone
      // Payload multipart: audio file + name.
      let heygenResult;
      try {
        const stream = fs.createReadStream(filePath);
        heygenResult = await heygenPostMultipart('/v1/voice_clone', {
          audio: { stream, filename: originalname, contentType },
          name:  displayName
        });
      } catch (err) {
        // Cleanup upload
        try { fs.unlinkSync(filePath); } catch {}
        return res.status(502).json({ success: false, error: `HeyGen voice clone failed: ${err.message}` });
      }

      // Remove temp upload (HeyGen has it now)
      try { fs.unlinkSync(filePath); } catch {}

      const voice = (heygenResult && (heygenResult.data || heygenResult)) || {};
      const voiceId = voice.voice_id || voice.id || voice.voiceId || null;

      if (!voiceId) {
        return res.status(502).json({
          success: false,
          error: 'HeyGen returned no voice_id',
          heygenResult
        });
      }

      // Pin to avatar if requested.
      if (avatarId) {
        await writeVoicePin(SupabaseConnector, avatarId, voiceId, {
          voice_name: displayName, source: 'avatar-studio/voice-clone'
        });
        try {
          await SupabaseConnector
            .from('evics_avatars')
            .update({ voice_id: voiceId, updated_at: new Date().toISOString() })
            .eq('avatar_id', avatarId);
        } catch {}
      }

      res.json({
        success: true,
        voice: { voice_id: voiceId, name: displayName },
        pinned_to_avatar: avatarId,
        heygenResult
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- POST /avatar/upload ------------------------------------------------
  // Multipart: file (image or short video), name, gender, voiceId?
  app.post('/api/avatar-studio/avatar/upload', requireAdmin, upload.single('file'), async (req, res) => {
    try {
      noStore(res);
      if (!req.file) return res.status(400).json({ success: false, error: 'file field "file" is required' });
      const name    = String(req.body.name || `EVICS Avatar ${Date.now()}`).trim();
      const gender  = String(req.body.gender || '').trim().toLowerCase() || null;
      const voiceId = req.body.voiceId ? String(req.body.voiceId).trim() : null;
      const filePath = req.file.path;
      const originalname = req.file.originalname || 'avatar.jpg';
      const contentType  = req.file.mimetype || 'image/jpeg';
      const isVideo = contentType.startsWith('video/');

      // 1) Upload the asset to HeyGen so we get an asset URL.
      //    HeyGen: POST /v1/asset with multipart file → returns asset_id + url.
      let assetJson;
      try {
        const stream = fs.createReadStream(filePath);
        assetJson = await heygenPostMultipart('/v1/asset', {
          file: { stream, filename: originalname, contentType },
          type: isVideo ? 'video' : 'image'
        });
      } catch (err) {
        try { fs.unlinkSync(filePath); } catch {}
        return res.status(502).json({ success: false, error: `HeyGen asset upload failed: ${err.message}` });
      }
      try { fs.unlinkSync(filePath); } catch {}

      const asset = (assetJson && (assetJson.data || assetJson)) || {};
      const assetUrl = asset.url || asset.asset_url || asset.image_url || asset.video_url || null;
      const assetId  = asset.id  || asset.asset_id  || null;

      if (!assetUrl && !assetId) {
        return res.status(502).json({
          success: false,
          error: 'HeyGen asset upload returned no url/id',
          assetJson
        });
      }

      // 2) Create a Photo Avatar (image path) or Talking Photo (video path).
      let avatarId = null;
      let previewUrl = assetUrl;
      let source = isVideo ? 'talking_photo' : 'photo_avatar';
      let createResult = null;

      try {
        if (isVideo) {
          // Talking Photo from video
          createResult = await heygenPostJson('/v2/talking_photo', {
            name,
            video_url: assetUrl,
            gender
          });
        } else {
          // Photo avatar
          createResult = await heygenPostJson('/v2/photo_avatar/photo/generate', {
            name,
            image_url: assetUrl,
            gender
          });
        }
        const d = (createResult && (createResult.data || createResult)) || {};
        avatarId = d.avatar_id || d.talking_photo_id || d.id || null;
        previewUrl = d.image_url || d.image_key || d.preview_image_url || previewUrl;
      } catch (err) {
        // Fallback: register the uploaded asset as a bare "user_upload" row so
        // the user can still bind it later manually if HeyGen create failed.
        console.warn('[avatar-studio] HeyGen avatar create failed:', err.message);
        avatarId = `user_upload_${Date.now()}`;
        source   = 'user_upload';
      }

      const row = {
        avatar_id: avatarId,
        name,
        source,
        gender,
        voice_id: voiceId || null,
        preview_url: previewUrl || null,
        notes: 'created via Avatar Studio upload',
        active: true,
        is_default: false,
        created_by: req.get('x-actor') || 'admin'
      };
      const up = await upsertAvatar(SupabaseConnector, row);

      if (voiceId) {
        await writeVoicePin(SupabaseConnector, avatarId, voiceId, {
          gender, source: 'avatar-studio/avatar-upload'
        });
      }

      res.json({
        success: true,
        avatar: up.data || row,
        heygenCreate: createResult,
        heygenAsset: assetJson
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- POST /pin ----------------------------------------------------------
  app.post('/api/avatar-studio/pin', requireAdmin, async (req, res) => {
    try {
      noStore(res);
      const { avatarId, voiceId, gender, voiceName } = req.body || {};
      if (!avatarId || !voiceId) {
        return res.status(400).json({ success: false, error: 'avatarId and voiceId required' });
      }
      const ok = await writeVoicePin(SupabaseConnector, String(avatarId), String(voiceId), {
        gender: gender || null, voice_name: voiceName || null, source: 'avatar-studio/manual'
      });
      // Mirror onto evics_avatars.voice_id
      try {
        await SupabaseConnector
          .from('evics_avatars')
          .update({ voice_id: String(voiceId), updated_at: new Date().toISOString() })
          .eq('avatar_id', String(avatarId));
      } catch {}
      res.json({ success: ok, avatarId, voiceId });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- POST /set-active ---------------------------------------------------
  app.post('/api/avatar-studio/set-active', requireAdmin, async (req, res) => {
    try {
      noStore(res);
      const { avatarId, active } = req.body || {};
      if (!avatarId) return res.status(400).json({ success: false, error: 'avatarId required' });
      const { error } = await SupabaseConnector
        .from('evics_avatars')
        .update({ active: !!active, updated_at: new Date().toISOString() })
        .eq('avatar_id', String(avatarId));
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, avatarId, active: !!active });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- POST /set-default --------------------------------------------------
  app.post('/api/avatar-studio/set-default', requireAdmin, async (req, res) => {
    try {
      noStore(res);
      const { avatarId } = req.body || {};
      if (!avatarId) return res.status(400).json({ success: false, error: 'avatarId required' });
      // Clear existing default
      try {
        await SupabaseConnector.from('evics_avatars').update({ is_default: false }).neq('avatar_id', String(avatarId));
      } catch {}
      const { error } = await SupabaseConnector
        .from('evics_avatars')
        .update({ is_default: true, active: true, updated_at: new Date().toISOString() })
        .eq('avatar_id', String(avatarId));
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, avatarId });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- DELETE avatar ------------------------------------------------------
  app.delete('/api/avatar-studio/avatar/:id', requireAdmin, async (req, res) => {
    try {
      noStore(res);
      const id = String(req.params.id || '').trim();
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const { error } = await SupabaseConnector.from('evics_avatars').delete().eq('avatar_id', id);
      if (error) return res.status(500).json({ success: false, error: error.message });
      res.json({ success: true, avatarId: id });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- POST /test-render --------------------------------------------------
  // Delegates to /api/media-output/create-render internally by requiring
  // mediaRenderCreator lazily so we don't hard-couple the modules.
  app.post('/api/avatar-studio/test-render', requireAdmin, async (req, res) => {
    try {
      noStore(res);
      const { avatarId, script } = req.body || {};
      if (!avatarId) return res.status(400).json({ success: false, error: 'avatarId required' });

      let mediaRenderCreator;
      try { mediaRenderCreator = require('./mediaRenderCreator'); } catch (e) {
        return res.status(503).json({ success: false, error: 'mediaRenderCreator unavailable' });
      }
      if (typeof mediaRenderCreator.createProductVideoRender !== 'function') {
        return res.status(503).json({ success: false, error: 'createProductVideoRender not exported' });
      }

      const testScript = script || `Hello, I am your EVICS presenter. This is a voice and avatar test.`;
      const result = await mediaRenderCreator.createProductVideoRender({
        avatarId: String(avatarId),
        script:   testScript,
        aspect:   '9:16',
        test:     true,
        actor:    req.get('x-actor') || 'avatar-studio',
        skipProduct: true
      }, { SupabaseConnector });

      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log('[EVICS Avatar Studio] routes registered');
}

module.exports = { registerAvatarStudioRoutes };
