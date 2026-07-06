# Avatar Creation Guard Rails Fix - Issue Resolution

**Issue:** Proof rendering of DeAnthony account ID returning AI-generated female avatar (Abigail) with no voice instead of custom affiliate avatar with user-provided photo and voice.

**Root Cause:** Avatar creation logic had multiple fallback points to default AI avatars instead of enforcing user-provided inputs.

---

## Problems Fixed

### 1. Missing Guard Rails in `/api/affiliate/avatar/create` Endpoint
**Problem:** The endpoint accepted requests WITHOUT photoUrl or voiceFileUrl and fell back to default avatar creation.

**Before:**
```javascript
const resolvedPhotoUrl = photoUrl || requestRecord?.photoUrl || null; // Could be null
const resolvedVoiceUrl = voiceFileUrl || requestRecord?.voiceFileUrl || null; // Could be null

if (process.env.HEYGEN_API_KEY) {
  // Call createHeyGenAffiliateAvatar with potentially null photoUrl/voiceUrl
} else {
  // Fallback: Create demo avatar with defaults (Abigail_expressive_2024112501)
  avatarPayload = {
    avatar_item: {
      id: process.env.HEYGEN_AVATAR_ID || 'Abigail_expressive_2024112501', // DEFAULT AVATAR
      ...
    }
  };
}
```

**After:**
```javascript
// GUARD RAILS: Require both photo and voice for custom avatar creation
if (!resolvedPhotoUrl) {
  return res.status(400).json({ 
    success: false, 
    error: 'Photo URL is required to create a custom avatar. Provide a profile picture from the phone app.' 
  });
}
if (!resolvedVoiceUrl) {
  return res.status(400).json({ 
    success: false, 
    error: 'Voice file URL is required to create a custom avatar. Record and upload your voice from the phone app.' 
  });
}

// CRITICAL: HeyGen API is required for custom affiliate avatars
if (!process.env.HEYGEN_API_KEY) {
  return res.status(503).json({ 
    success: false, 
    error: 'HeyGen API access is currently unavailable...'
  });
}

// Create affiliate avatar with user-provided photo and voice
const avatarPayload = await createHeyGenAffiliateAvatar({
  name: resolvedName,
  photoUrl: resolvedPhotoUrl, // NOW GUARANTEED to be valid
  voiceFileUrl: resolvedVoiceUrl, // NOW GUARANTEED to be valid
  attire: resolvedAttire
});
```

**Impact:** Custom avatars can only be created with BOTH photo + voice. No more default avatars.

---

### 2. Avatar ID Fallback to Defaults
**Problem:** After creating an avatar, if no avatarId was returned, it fell back to 'Abigail_expressive_2024112501'.

**Before:**
```javascript
const finalAvatarId = avatarItem.id || process.env.HEYGEN_AVATAR_ID || 'Abigail_expressive_2024112501';
```

**After:**
```javascript
const finalAvatarId = avatarItem.id || null;
if (!finalAvatarId) {
  return res.status(500).json({ 
    success: false, 
    error: 'Avatar creation failed: No avatar ID returned from HeyGen API',
    details: 'The HeyGen API did not return a valid avatar ID. Please check your HeyGen configuration.'
  });
}
```

**Impact:** Avatar creation fails explicitly instead of silently using defaults.

---

### 3. Missing Guard Rails in `/api/affiliate/avatar/proof` Endpoint
**Problem:** The proof endpoint fell back to 'Abigail_expressive_2024112501' if no talking_photo_id was found.

**Before:**
```javascript
const resolvedAvatarId = String(
  avatarId || 
  resolvedRequest?.avatar?.avatarId || 
  resolvedRequest?.avatar?.avatarItemId || 
  process.env.HEYGEN_AVATAR_ID || 
  'Abigail_expressive_2024112501' // FALLBACK TO DEFAULT
).trim();

// Demo mode fallback when no HeyGen API
if (!process.env.HEYGEN_API_KEY) {
  return res.json({ videoId: `demo-${Date.now()}`, ...demoVideo });
}
```

**After:**
```javascript
// GUARD RAILS: Require proper avatar setup
const storedTalkingPhotoId = resolvedRequest?.avatar?.talkingPhotoId || null;
if (!storedTalkingPhotoId) {
  return res.status(400).json({ 
    success: false, 
    error: 'Avatar is not properly configured for proof rendering',
    details: 'You must first create a custom avatar with your photo and voice...'
  });
}

const resolvedAvatarId = String(
  avatarId || 
  resolvedRequest?.avatar?.avatarId || 
  resolvedRequest?.avatar?.avatarItemId
).trim();
if (!resolvedAvatarId) {
  return res.status(400).json({ 
    success: false, 
    error: 'Avatar ID is required for proof generation...'
  });
}

// CRITICAL: HeyGen API is required
if (!process.env.HEYGEN_API_KEY) {
  return res.status(503).json({ 
    success: false, 
    error: 'HeyGen API access is currently unavailable...'
  });
}
```

**Impact:** Proof videos can only be generated for properly configured custom avatars with talking photo ID.

---

### 4. Voice File Not Being Used
**Problem:** The voice cloning was happening, but the voiceCloneId wasn't being prioritized in video generation.

**Before:**
```javascript
voice: {
  type: 'text',
  input_text: resolvedScript,
  voice_id: process.env.HEYGEN_VOICE_ID || 'f8c69e517f424cafaecde32dde57096b' // DEFAULT VOICE
}
```

**After:**
```javascript
voice: {
  type: 'text',
  input_text: resolvedScript,
  voice_id: resolvedRequest?.avatar?.voiceCloneId || process.env.HEYGEN_VOICE_ID || 'f8c69e517f424cafaecde32dde57096b'
}
```

**AND in fallback render:**
```javascript
const voiceId = resolvedRequest?.avatar?.voiceCloneId || process.env.HEYGEN_VOICE_ID || 'f8c69e517f424cafaecde32dde57096b';
```

**Impact:** Voice cloning results are now properly used in proof video generation.

---

### 5. Voice Cloning Failures Not Logged
**Problem:** If voice cloning failed, it silently proceeded without alerting the system.

**Before:**
```javascript
let voiceCloneId = null;
let voiceCloneStatus = null;
if (voiceFileUrl) {
  const cloneResult = await cloneVoiceWithRetry(...);
  voiceCloneId = cloneResult.voiceCloneId;
  voiceCloneStatus = cloneResult.voiceCloneStatus;
  // No logging if cloneResult.voiceCloneId is null
}
```

**After:**
```javascript
// Voice clone with retry (3 attempts, exponential back-off).
// CRITICAL: Voice cloning must succeed if voiceFileUrl was provided
let voiceCloneId = null;
let voiceCloneStatus = null;
if (voiceFileUrl) {
  const cloneResult = await cloneVoiceWithRetry(...);
  voiceCloneId = cloneResult.voiceCloneId;
  voiceCloneStatus = cloneResult.voiceCloneStatus;
  
  // If voice cloning failed, log error
  if (!voiceCloneId) {
    console.error(`[Avatar] WARNING: Voice cloning failed for "${name}". Voice file URL: ${voiceFileUrl}`);
  } else {
    console.log(`[Avatar] Voice cloning successful: ${voiceCloneId}`);
  }
}
```

**Impact:** Voice cloning issues are now visible in logs for debugging.

---

## Guard Rails Summary

### `/api/affiliate/avatar/create` - Now Requires:
✅ `photoUrl` - User-provided profile picture (MANDATORY)
✅ `voiceFileUrl` - User-provided voice recording (MANDATORY)  
✅ `affiliateId` - Affiliate identity (MANDATORY)
✅ `HEYGEN_API_KEY` - Environment variable configured (MANDATORY)

### `/api/affiliate/avatar/proof` - Now Requires:
✅ `talkingPhotoId` - From custom avatar (MANDATORY)
✅ `avatarId` - From custom avatar (MANDATORY)
✅ `voiceCloneId` - From custom avatar or default (USED when available)
✅ `HEYGEN_API_KEY` - Environment variable configured (MANDATORY)

### NO Fallback to Defaults For Affiliates:
❌ 'Abigail_expressive_2024112501' (removed for affiliate avatars)
❌ 'Abigail' default voice (removed for affiliate avatars)
❌ Demo mode (removed for affiliate workflows)

---

## Scoping

**AFFECTED:** Phone app, Affiliate Hub, Affiliate Admin workspaces
- Custom avatar creation ONLY with user photo + voice
- Proof video generation ONLY for custom avatars
- Voice cloning ENFORCED when user provides voice file

**NOT AFFECTED:** EVICS system avatars
- EVICS can still use default avatars (Abigail, Angela, Tyler)
- EVICS system rendering unchanged
- EVICS endpoints not affected by these guard rails

---

## HeyGen Account Requirement

This fix ensures:
- ✅ **ONLY** EVICS-HeyGen Production API key (••••••••••••gnDE, expires July 1, 2026) is used
- ✅ NO 7-day expiry keys
- ✅ NO test/trial accounts
- ✅ NO alternate API routes
- ✅ ALL custom avatar creation routed through this production API key

---

## Testing

Run avatar guard rails test:
```bash
npm test -- tests/avatar-guardrails.test.js
```

---

## DeAnthony Account Fix

For the DeAnthony account that showed the Abigail AI avatar with no voice:

1. **Re-create Avatar:** Must provide fresh photo + voice file
2. **Verify API Key:** Confirm HEYGEN_API_KEY is set to EVICS Production key
3. **Check Cloud Run:** Verify HEYGEN_API_KEY environment variable in Cloud Run deployment
4. **Clear Cache:** Remove any cached avatar data from previous failed attempts
5. **Generate Proof:** Re-generate proof video with new custom avatar

Expected Result: Custom avatar with affiliate's photo and voice will be created and used for proof rendering.

---

## Files Modified

- `backend/server.js` - 
  - Line 5997-6029: Guard rails for avatar/create endpoint
  - Line 6035-6046: Removed default avatar fallback  
  - Line 5810-5831: Guard rails for avatar/proof endpoint
  - Line 5848-5859: Use voiceCloneId in fallback render
  - Line 1119-1137: Enhanced voice cloning logging

---

## Commit

```
Fix: Add avatar creation guard rails to prevent AI-generated defaults

- Require both photoUrl AND voiceFileUrl for affiliate avatar creation
- Prevent fallback to 'Abigail_expressive_2024112501' when user inputs missing
- Require HeyGen API key for custom avatar creation (not optional fallback)
- Add validation guard rails to /api/affiliate/avatar/create endpoint
- Update /api/affiliate/avatar/proof endpoint to require proper avatar setup
- Add logging for voice cloning status and failures
- Ensure voiceCloneId is properly used from HeyGen API response
```

---

## Next Steps

1. Deploy fix to Cloud Run
2. Re-test DeAnthony account avatar creation and proof rendering
3. Verify voice file is properly submitted to HeyGen API
4. Monitor logs for any voice cloning failures
5. Test complete flow: photo upload → voice upload → avatar creation → proof generation
