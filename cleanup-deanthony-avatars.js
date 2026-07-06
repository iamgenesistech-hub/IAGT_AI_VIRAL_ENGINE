#!/usr/bin/env node
/**
 * Cleanup Script: Remove all avatars for DeAnthony (DEANTHON277)
 * 
 * This script removes:
 * 1. All avatar records from affiliate_avatars table
 * 2. All avatar request records
 * 3. Clears avatar data from affiliate profile
 * 
 * Usage: node cleanup-deanthony-avatars.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

const SupabaseConnector = require('./utils/SupabaseConnector.js');

const AFFILIATE_CODE = 'DEANTHON277';

async function cleanup() {
  try {
    console.log(`\n🔍 Starting cleanup for affiliate: ${AFFILIATE_CODE}\n`);

    // Step 1: Find the affiliate profile
    console.log('📋 Step 1: Finding affiliate profile...');
    const { data: affiliates, error: affiliateError } = await SupabaseConnector
      .from('affiliates')
      .select('id, name, code, profile')
      .ilike('code', `%${AFFILIATE_CODE}%`)
      .limit(1);

    if (affiliateError) {
      throw new Error(`Failed to fetch affiliate: ${affiliateError.message}`);
    }

    if (!affiliates || affiliates.length === 0) {
      console.warn(`⚠️  No affiliate found with code matching "${AFFILIATE_CODE}"`);
      return;
    }

    const affiliate = affiliates[0];
    const affiliateId = affiliate.id;
    console.log(`✅ Found affiliate: "${affiliate.name}" (ID: ${affiliateId})`);
    console.log(`   Profile: ${JSON.stringify(affiliate.profile, null, 2)}\n`);

    // Step 2: Find all avatars for this affiliate
    console.log('📋 Step 2: Finding all avatars for this affiliate...');
    const { data: avatars, error: avatarError } = await SupabaseConnector
      .from('affiliate_avatars')
      .select('*')
      .eq('affiliate_id', affiliateId);

    if (avatarError) {
      throw new Error(`Failed to fetch avatars: ${avatarError.message}`);
    }

    console.log(`✅ Found ${avatars?.length || 0} avatars`);
    if (avatars && avatars.length > 0) {
      avatars.forEach((avatar, idx) => {
        console.log(`   ${idx + 1}. ID: ${avatar.id}, Name: ${avatar.name}, Status: ${avatar.status}`);
      });
    }
    console.log();

    // Step 3: Find all avatar requests for this affiliate
    console.log('📋 Step 3: Finding all avatar requests for this affiliate...');
    const { data: requests, error: requestError } = await SupabaseConnector
      .from('avatar_requests')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .or(`affiliate_code.eq.${AFFILIATE_CODE},affiliate_code.ilike.%${AFFILIATE_CODE}%`);

    if (!requestError && requests) {
      console.log(`✅ Found ${requests.length} avatar requests`);
      if (requests.length > 0) {
        requests.forEach((req, idx) => {
          console.log(`   ${idx + 1}. ID: ${req.id}, Status: ${req.status}, Created: ${req.created_at}`);
        });
      }
    } else {
      console.log(`ℹ️  No avatar_requests table or error: ${requestError?.message || 'N/A'}`);
    }
    console.log();

    // Step 4: DELETE all avatars
    if (avatars && avatars.length > 0) {
      console.log('🗑️  Step 4: Deleting all avatars...');
      const avatarIds = avatars.map(a => a.id);
      
      const { error: deleteError } = await SupabaseConnector
        .from('affiliate_avatars')
        .delete()
        .in('id', avatarIds);

      if (deleteError) {
        throw new Error(`Failed to delete avatars: ${deleteError.message}`);
      }

      console.log(`✅ Deleted ${avatarIds.length} avatar records`);
      avatarIds.forEach((id, idx) => {
        console.log(`   ${idx + 1}. ${id}`);
      });
      console.log();
    }

    // Step 5: DELETE all avatar requests
    if (requests && requests.length > 0) {
      console.log('🗑️  Step 5: Deleting all avatar requests...');
      const requestIds = requests.map(r => r.id);
      
      const { error: deleteReqError } = await SupabaseConnector
        .from('avatar_requests')
        .delete()
        .in('id', requestIds);

      if (deleteReqError) {
        throw new Error(`Failed to delete avatar requests: ${deleteReqError.message}`);
      }

      console.log(`✅ Deleted ${requestIds.length} avatar request records`);
      requestIds.forEach((id, idx) => {
        console.log(`   ${idx + 1}. ${id}`);
      });
      console.log();
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
      const { error: profileError } = await SupabaseConnector
        .from('affiliates')
        .update({ profile: updatedProfile })
        .eq('id', affiliateId);

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

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
    console.log(`Affiliate: ${affiliate.name} (${AFFILIATE_CODE})`);
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
    console.error(error);
    process.exit(1);
  }
}

cleanup();
