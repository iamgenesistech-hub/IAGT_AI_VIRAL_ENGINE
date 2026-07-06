#!/usr/bin/env node
/**
 * Cleanup Script: Remove all avatars for DeAnthony
 * Uses Supabase REST API directly (no SDK dependencies)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

const AFFILIATE_CODE = 'DEANTHON277';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables');
  process.exit(1);
}

const BASE_URL = SUPABASE_URL.replace(/\/$/, '');
const REST_URL = `${BASE_URL}/rest/v1`;

async function makeRequest(method, path, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'return=representation'
  };

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${REST_URL}${path}`, options);
    const text = await response.text();
    
    if (!response.ok) {
      console.error(`❌ Request failed: ${method} ${path}`);
      console.error(`Status: ${response.status}`);
      console.error(`Response: ${text}`);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error(`❌ Request error: ${error.message}`);
    throw error;
  }
}

async function cleanup() {
  try {
    console.log(`\n🔍 Starting cleanup for affiliate: ${AFFILIATE_CODE}\n`);

    // Step 1: Find the affiliate
    console.log('📋 Step 1: Finding affiliate profile...');
    const affiliatesPath = `/affiliates?or=(code.ilike.%25${encodeURIComponent(AFFILIATE_CODE)}%25,id.eq.${AFFILIATE_CODE})`;
    const affiliates = await makeRequest('GET', affiliatesPath);

    if (!affiliates || affiliates.length === 0) {
      console.warn(`⚠️  No affiliate found with code or ID: "${AFFILIATE_CODE}"`);
      console.log('\n📋 Alternative search - finding all affiliates...');
      const allAffiliates = await makeRequest('GET', '/affiliates?limit=100');
      if (allAffiliates && allAffiliates.length > 0) {
        console.log('Available affiliates:');
        allAffiliates.forEach((aff, idx) => {
          console.log(`   ${idx + 1}. Code: ${aff.code}, ID: ${aff.id}, Name: ${aff.name}`);
        });
      }
      return;
    }

    const affiliate = affiliates[0];
    const affiliateId = affiliate.id;
    console.log(`✅ Found affiliate: "${affiliate.name}" (ID: ${affiliateId})`);
    console.log(`   Code: ${affiliate.code}`);
    if (affiliate.profile) {
      console.log(`   Profile: ${JSON.stringify(affiliate.profile, null, 2)}`);
    }
    console.log();

    // Step 2: Find all avatars for this affiliate
    console.log('📋 Step 2: Finding all avatars for this affiliate...');
    const avatarsPath = `/affiliate_avatars?affiliate_id=eq.${affiliateId}`;
    const avatars = await makeRequest('GET', avatarsPath);

    console.log(`✅ Found ${avatars?.length || 0} avatars`);
    if (avatars && avatars.length > 0) {
      avatars.forEach((avatar, idx) => {
        console.log(`   ${idx + 1}. ID: ${avatar.id}, Name: ${avatar.name}, Status: ${avatar.status}`);
      });
    }
    console.log();

    // Step 3: Find all avatar requests for this affiliate
    console.log('📋 Step 3: Finding all avatar requests for this affiliate...');
    const requestsPath = `/avatar_requests?affiliate_id=eq.${affiliateId}`;
    const requests = await makeRequest('GET', requestsPath).catch(() => null);

    if (requests) {
      console.log(`✅ Found ${requests.length} avatar requests`);
      if (requests.length > 0) {
        requests.forEach((req, idx) => {
          console.log(`   ${idx + 1}. ID: ${req.id}, Status: ${req.status}, Created: ${req.created_at}`);
        });
      }
    } else {
      console.log(`ℹ️  avatar_requests table not found or inaccessible`);
    }
    console.log();

    // Step 4: DELETE all avatars
    if (avatars && avatars.length > 0) {
      console.log('🗑️  Step 4: Deleting all avatars...');
      for (const avatar of avatars) {
        const deletePath = `/affiliate_avatars?id=eq.${encodeURIComponent(avatar.id)}`;
        await makeRequest('DELETE', deletePath);
        console.log(`   ✓ Deleted: ${avatar.id}`);
      }
      console.log(`✅ Deleted ${avatars.length} avatar records\n`);
    }

    // Step 5: DELETE all avatar requests
    if (requests && requests.length > 0) {
      console.log('🗑️  Step 5: Deleting all avatar requests...');
      for (const request of requests) {
        const deletePath = `/avatar_requests?id=eq.${encodeURIComponent(request.id)}`;
        await makeRequest('DELETE', deletePath);
        console.log(`   ✓ Deleted: ${request.id}`);
      }
      console.log(`✅ Deleted ${requests.length} avatar request records\n`);
    }

    // Step 6: Clear avatar data from affiliate profile
    console.log('🔧 Step 6: Clearing avatar data from profile...');
    const updatedProfile = affiliate.profile || {};
    const hadAvatarData = !!(
      updatedProfile.avatar ||
      updatedProfile.avatarId ||
      updatedProfile.avatarName ||
      updatedProfile.photoUrl ||
      updatedProfile.voiceFileUrl ||
      updatedProfile.talkingPhotoId ||
      updatedProfile.proofVideoId ||
      updatedProfile.proofVideoUrl
    );

    // Clear avatar-related fields
    const clearedFields = [
      'avatar',
      'avatarId',
      'avatarName',
      'photoUrl',
      'voiceFileUrl',
      'talkingPhotoId',
      'proofVideoId',
      'proofVideoUrl',
      'voiceCloneId',
      'voiceCloneStatus',
      'proofThumbnailUrl',
      'proofStatus'
    ];

    clearedFields.forEach(field => {
      delete updatedProfile[field];
    });

    if (hadAvatarData) {
      const updatePath = `/affiliates?id=eq.${affiliateId}`;
      await makeRequest('PATCH', updatePath, { profile: updatedProfile });
      console.log(`✅ Cleared ${clearedFields.length} avatar-related fields from profile`);
      clearedFields.forEach((field, idx) => {
        console.log(`   ${idx + 1}. ${field}`);
      });
    } else {
      console.log('ℹ️  No avatar data found in profile to clear');
    }
    console.log();

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ CLEANUP COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Affiliate: ${affiliate.name} (${affiliate.code})`);
    console.log(`✓ Removed ${avatars?.length || 0} avatar records`);
    console.log(`✓ Removed ${requests?.length || 0} avatar request records`);
    console.log(`✓ Cleared profile avatar data`);
    console.log('\nThe affiliate profile is now ready for a fresh avatar creation.');
    console.log('Next steps:');
    console.log('1. Upload a new profile picture from the phone app');
    console.log('2. Record and upload a new voice file');
    console.log('3. Create a new custom avatar in the Affiliate Hub');
    console.log('4. Generate a new proof video');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

cleanup();
