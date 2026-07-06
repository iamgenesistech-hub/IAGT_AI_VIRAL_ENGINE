# IAGT AI Viral Engine — Operator Checklist
## What YOU Need to Do (Step-by-Step with Links)

This checklist covers every manual step that requires your accounts, credentials, or physical device. Complete them in order — roughly 2-4 hours total.

---

## 🚨 IMMEDIATE FIX — Redeploy to Cloud Run (fixes the 404)

Your Cloud Run instance is running a stale image. All new routes (affiliate hub, PPEP, wisdom, community) need a fresh deploy.

**Option A — One-Click (Easiest):**
1. Make sure Google Cloud SDK is installed: [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
2. Open PowerShell and authenticate: `gcloud auth login`
3. Double-click **`DEPLOY_TO_CLOUDRUN.bat`** in the project root
4. Wait 3-5 minutes — it opens the affiliate hub in your browser when done

**Option B — PowerShell:**
```powershell
cd "c:\Users\rolan\OneDrive\GitHub For I AM GENESIS TECH\GenesisAI folder\IAGT_AI_VIRAL_ENGINE"
gcloud run deploy evics-api --source . --region us-central1 --allow-unauthenticated --memory 1Gi --port 4175
```

**After deploy, verify these URLs work:**
- `/health` → `{"ok":true}`
- `/affiliate` → IAGT Affiliate Hub landing page
- `/status` → full service health JSON

---

## ✅ STEP 1 — Run Supabase Database Schema

**Why:** All viral products, render jobs, affiliate clicks, and executive reports need live database tables.

**Steps:**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click your project: `mvfkwlidwqcyqczlauii`
3. In the left sidebar click **SQL Editor**
4. Click **New Query**
5. Open the file: `database/evics_complete_schema_v2.sql` in VS Code and copy ALL contents
6. Paste into the Supabase SQL editor
7. Click **Run** (green button)
8. Confirm "Success. No rows returned"

**Estimated time:** 5 minutes

---

## ✅ STEP 2 — Verify HeyGen API Key & Avatar

**Why:** All video generation (product-to-video, avatar videos) routes through HeyGen.

**Steps:**
1. Log in at [https://app.heygen.com](https://app.heygen.com)
2. Go to **Settings → API** → confirm your API key matches what's in `backend/.env` (`HEYGEN_API_KEY`)
3. Go to **Avatars** → confirm "Tyler-incasualsuit-20220721" appears in your library
4. If the avatar is missing: Go to **Avatars → Avatar Library → Browse → Tyler** and click **Use This Avatar** to add it to your workspace
5. Check your plan has enough credits for video generation (minimum: Pro plan)

**Link:** [https://app.heygen.com/settings](https://app.heygen.com/settings)  
**Estimated time:** 5 minutes

---

## ✅ STEP 3 — Configure Shopify Webhook

**Why:** The backend receives real-time product updates from your Shopify store.

**Steps:**
1. Log in to [https://admin.shopify.com](https://admin.shopify.com)
2. Go to **Settings → Notifications → Webhooks**
3. Click **Create webhook**
4. Event: `Products / Product creation`
5. URL: `https://YOUR-RAILWAY-URL.railway.app/api/webhooks/shopify-products`
   *(replace with your Railway URL from Step 6 below)*
6. Format: **JSON**
7. Click **Save**
8. Repeat for `Products / Product update`

**Estimated time:** 10 minutes

---

## ✅ STEP 4 — Deploy to Railway (Production Backend)

**Why:** Your backend needs a public URL so the phone app can connect from any device/network.

**Steps:**
1. Go to [https://railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your `IAGT_AI_VIRAL_ENGINE` repository
4. Railway auto-detects Node.js. Click **Deploy**
5. In the Railway dashboard, click your service → **Variables** → add ALL keys from `backend/.env`:

   | Variable | Value |
   |---|---|
   | `PORT` | `4175` |
   | `HEYGEN_API_KEY` | *(from backend/.env)* |
   | `HEYGEN_AVATAR_ID` | `Tyler-incasualsuit-20220721` |
   | `HEYGEN_VOICE_ID` | `f8c69e517f424cafaecde32dde57096b` |
   | `SUPABASE_URL` | `https://mvfkwlidwqcyqczlauii.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(from backend/.env)* |
   | `SHOPIFY_ADMIN_ACCESS_TOKEN` | *(from backend/.env)* |
   | `SHOPIFY_STORE_DOMAIN` | *(from backend/.env)* |
   | `OPENAI_API_KEY` | *(from backend/.env)* |
   | `CANVA_API_KEY` | *(from backend/.env)* |
   | `RUNWAY_API_KEY` | *(from backend/.env)* |
   | `AMAZON_AFFILIATE_TAG` | *(from .env)* |
   | `NODE_ENV` | `production` |

6. After deploy, copy your Railway URL (e.g. `https://iagt-viral-engine-production.railway.app`)
7. Go back to **Step 3** and paste this URL into the Shopify webhook

**Docs:** [https://docs.railway.app/deploy/deployments](https://docs.railway.app/deploy/deployments)  
**Estimated time:** 20 minutes

---

## ✅ STEP 5 — Update Phone App API URL for Production

**Why:** The Expo app currently points to `localhost:4175` — for device testing away from your PC, it needs the Railway URL.

**File to edit:** `C:\Users\rolan\Documents\Codex\2026-06-12\my-evics-api-app-has-crashed\work\evics-affiliate-app\.env`

**Change:**
```
EXPO_PUBLIC_EVICS_API_BASE=https://YOUR-RAILWAY-URL.railway.app
EXPO_PUBLIC_EVICS_WEB_BASE=https://YOUR-RAILWAY-URL.railway.app
```
*(keep localhost:4175 as a comment for local dev)*

**Estimated time:** 2 minutes

---

## ✅ STEP 6 — Install Expo Go on Your Phone & Test

**Why:** Confirm the affiliate app connects to the backend and renders videos.

**Steps:**
1. Install **Expo Go** on your phone:
   - iOS: [https://apps.apple.com/app/expo-go/id982107779](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [https://play.google.com/store/apps/details?id=host.exp.exponent](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. On your PC, open terminal in the phone app folder:
   ```
   cd C:\Users\rolan\Documents\Codex\2026-06-12\my-evics-api-app-has-crashed\work\evics-affiliate-app
   npx expo start --tunnel
   ```
3. Scan the QR code with your phone camera (iOS) or Expo Go app (Android)
4. Test: browse viral products, tap a product, generate an avatar video
5. Check your Railway backend logs to confirm API calls arrive

**Expo docs:** [https://docs.expo.dev/get-started/expo-go/](https://docs.expo.dev/get-started/expo-go/)  
**Estimated time:** 15 minutes

---

## ✅ STEP 7 — Install PM2 for Local Development (Optional but Recommended)

**Why:** PM2 keeps your backend running after you close the terminal, and auto-restarts on crash.

**Steps:**
1. Open PowerShell as Administrator
2. Run:
   ```
   npm install -g pm2
   ```
3. In your project folder:
   ```
   cd "c:\Users\rolan\OneDrive\GitHub For I AM GENESIS TECH\GenesisAI folder\IAGT_AI_VIRAL_ENGINE"
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```
4. Copy and run the command PM2 outputs (it gives you a system-specific startup command)
5. Verify:
   ```
   pm2 status
   pm2 logs evics-backend
   ```

**PM2 docs:** [https://pm2.keymetrics.io/docs/usage/quick-start/](https://pm2.keymetrics.io/docs/usage/quick-start/)  
**Estimated time:** 10 minutes

---

## ✅ STEP 8 — Set Up Email Alerts for Executive Reports (Optional)

**Why:** The weekly executive report scheduler can email you a PDF summary of performance metrics.

**Option A — SendGrid (Recommended):**
1. Sign up at [https://sendgrid.com](https://sendgrid.com) (free tier: 100 emails/day)
2. Go to **Settings → API Keys → Create API Key** (Full Access)
3. Add to `backend/.env`:
   ```
   SENDGRID_API_KEY=SG.xxxx
   REPORT_EMAIL_TO=your@email.com
   REPORT_EMAIL_FROM=noreply@iamgenesistech.com
   ```

**Option B — Resend:**
1. Sign up at [https://resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Add to `backend/.env`:
   ```
   RESEND_API_KEY=re_xxxx
   ```

**Estimated time:** 10 minutes

---

## ✅ STEP 9 — Acquire TikTok & Meta API Keys (Optional — Social Publishing)

**Why:** Enables direct publishing of viral videos from the dashboard to TikTok/Instagram.

**TikTok:**
1. Go to [https://developers.tiktok.com](https://developers.tiktok.com) → sign in
2. Create an App → enable **Content Posting API**
3. Add `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` to `backend/.env`

**Meta (Instagram/Facebook):**
1. Go to [https://developers.facebook.com](https://developers.facebook.com) → Create App
2. Add **Instagram Basic Display** and **Instagram Content Publishing** products
3. Add `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ID` to `backend/.env`

**Estimated time:** 30-60 minutes per platform

---

## ✅ STEP 10 — Final Smoke Test

Once Railway is live and phone app is connected, run these checks:

| Test | Expected Result |
|---|---|
| Open dashboard in browser → Analytics tab | Scheduler Log and Phone Render panels appear |
| Dashboard → System Health → Refresh | All services show green or yellow (not red) |
| Phone app → Browse Products | List of products loads from Shopify |
| Phone app → Generate Avatar Video | Job appears in Phone Render Monitor on dashboard |
| Visit `https://YOUR-RAILWAY-URL.railway.app/health` | `{"status":"ok","uptime":...}` |
| Visit `https://YOUR-RAILWAY-URL.railway.app/api/scheduler/log` | Shows scheduler task history |

---

## 📋 Quick Reference Summary

| # | Task | Time | Link |
|---|---|---|---|
| 1 | Run Supabase schema | 5 min | [Supabase SQL Editor](https://supabase.com/dashboard) |
| 2 | Verify HeyGen avatar | 5 min | [HeyGen Settings](https://app.heygen.com/settings) |
| 3 | Configure Shopify webhook | 10 min | [Shopify Admin](https://admin.shopify.com) |
| 4 | Deploy to Railway | 20 min | [Railway](https://railway.app) |
| 5 | Update phone app URL | 2 min | Edit `.env` file |
| 6 | Test Expo phone app | 15 min | [Expo Go](https://docs.expo.dev/get-started/expo-go/) |
| 7 | Install PM2 (local) | 10 min | [PM2 Docs](https://pm2.keymetrics.io/docs/usage/quick-start/) |
| 8 | Email alerts (optional) | 10 min | [SendGrid](https://sendgrid.com) |
| 9 | TikTok/Meta API (optional) | 30-60 min | [TikTok Dev](https://developers.tiktok.com) |
| 10 | Final smoke test | 10 min | — |

**Total required time: ~1 hour (Steps 1-7)**  
**Total optional: +1-2 hours (Steps 8-9)**

---

*Generated by EVICS Build System — IAGT AI Viral Engine*  
*Last updated: Auto-generated this session*
