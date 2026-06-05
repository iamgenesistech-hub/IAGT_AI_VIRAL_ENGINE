# EVICS Elite Enhancements

**System:** IAGT AI Viral Engine (EVICS)
**Purpose:** Improvements required to reach elite operational status

---

## Overview

The EVICS system has a strong foundation. The following enhancements are organized by category — each one moves the system from functional to elite. Priority is assigned based on impact on revenue, reliability, and competitive advantage.

---

## Category 1 — Backend Completeness

### 1.1 Create `utils/shopifyLiveConnector.js`

**Priority:** P0 — Blocking
**Impact:** Shopify product sync is completely non-functional without this file.

The file is imported in `backend/server.js` as:
```js
const { fetchShopifyProducts, fetchShopifyCollections } = require('../utils/shopifyLiveConnector');
```

It must export `fetchShopifyProducts()` and `fetchShopifyCollections()` using the Shopify Admin REST API with `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_ADMIN_ACCESS_TOKEN` environment variables.

---

### 1.2 Add `/api/shopify/synced-products` Route

**Priority:** P0 — Blocking
**Impact:** `app.js` calls this endpoint in `hydrateFromServerApi()` to load Shopify products into the Product Matching panel. Without it, the fetch fails silently and the panel shows only Supabase data.

The route should merge Shopify products with any existing `evics_products` records and return a unified product list with `title`, `product_type`, `image_url`, and `tags`.

---

### 1.3 Wire OpenAI GPT-4o into the Copilot

**Priority:** P1 — High
**Impact:** The copilot currently returns a hardcoded rule-based string. Replacing it with a real GPT-4o call transforms the copilot from a static suggestion box into a genuine AI advisor.

Implementation pattern:
```js
if (process.env.OPENAI_API_KEY) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: EVICS_SYSTEM_PROMPT },
      { role: 'user', content: buildCopilotPrompt(question, workspaceContext) }
    ]
  });
  answer = completion.choices[0].message.content;
} else {
  answer = buildRuleBasedAnswer(workspaceContext); // existing fallback
}
```

The system prompt should encode EVICS rules: profit-first, viral intelligence, supplement brand voice, and the 7-agent framework.

---

### 1.4 Add Rate Limiting

**Priority:** P1 — High
**Impact:** Without rate limiting, a single bad actor or runaway client loop can exhaust Supabase connection limits and third-party API quotas.

Install `express-rate-limit` and apply:
- `/api/video/generate` — 5 requests/minute (expensive API calls)
- `/api/agent/generate-ads` — 10 requests/minute
- `/api/agent/copilot` — 30 requests/minute
- `/api/viral/rescan` — 10 requests/minute
- All other `/api/*` routes — 60 requests/minute

---

### 1.5 Standardize Render Table Name

**Priority:** P1 — High
**Impact:** `supabase.js` (frontend client) writes render results to `video_renders`. `server.js` (backend) writes to `evics_renders`. This split means render history is fragmented across two tables.

Decision: consolidate on `evics_renders`. Update `supabase.js` methods `saveRenderResult()` and `updateRenderStatus()` to use `evics_renders`.

---

## Category 2 — Dashboard UX

### 2.1 Wire Sidebar Navigation

**Priority:** P1 — High
**Impact:** Five of six sidebar buttons are purely decorative. Users cannot navigate to AI Reconstruction, Video Generation, Distribution, Analytics, or Twin Automation sections.

Add `state.activeSection` (default: `"viral-intelligence"`) and render each section conditionally. The sidebar buttons should set `state.activeSection` and call `render()`.

Sections to build out:
- **AI Reconstruction** — Deconstruct selected viral ad, generate recreation brief
- **Video Generation** — Dedicated render workspace with platform selector
- **Distribution** — Full publishing queue management
- **Analytics** — Performance charts, ROAS, top creatives, channel breakdown
- **Twin Automation** — Agent status dashboard, schedule configuration

---

### 2.2 "Connect Sources" Modal

**Priority:** P2 — Medium
**Impact:** The "Connect Sources" button in the topbar renders but has no action. New users have no in-app way to enter their Supabase credentials.

Build a modal that:
1. Shows current connection status (Demo / Connected / Error).
2. Provides input fields for Supabase URL and Anon Key.
3. Saves to `localStorage` and updates `window.IAGT_CONFIG`.
4. Triggers `hydrateFromSupabase()` on save.
5. Shows a test connection button with live feedback.

---

### 2.3 Real-Time Render Status Polling

**Priority:** P2 — Medium
**Impact:** HeyGen and Runway jobs are asynchronous — the video URL is not available immediately. The dashboard needs to poll for job completion.

Add a polling loop that:
1. Checks `evics_renders` every 10 seconds for rows with `status = 'pending'`.
2. For each pending render, calls the platform's status endpoint (HeyGen: `GET /v1/video_status.get?video_id=...`, Runway: `GET /v1/tasks/{id}`).
3. Updates the row in `evics_renders` when the video URL is available.
4. Updates the dashboard render card from "Pending" to "Complete" with a preview link.

---

### 2.4 Creative Score Visualization

**Priority:** P2 — Medium
**Impact:** Creative scores (0–100) are displayed as plain numbers. A visual score bar or color-coded badge makes quality assessment instant.

Add a score bar component:
- 90–100: Gold / Elite
- 80–89: Green / Strong
- 70–79: Blue / Good
- Below 70: Gray / Needs work

Apply to creative cards, product cards, and the video assembly workspace.

---

### 2.5 Bulk Actions on Creatives

**Priority:** P2 — Medium
**Impact:** Approving or rejecting creatives one at a time is slow when reviewing a batch of 20+.

Add a bulk action toolbar that appears when multiple creatives are selected:
- Approve all selected
- Reject all selected (with shared rejection reason)
- Queue all selected for publishing
- Delete all selected drafts

---

## Category 3 — Agent System

### 3.1 Build the Profit Auditor Engine

**Priority:** P1 — High
**Impact:** The entire capital allocation and product tier system depends on accurate profit scores. Without this engine, budget decisions are manual guesses.

File: `engines/profitScoreEngine.js`

Responsibilities:
- Pull order and refund data from Shopify
- Calculate net profit per SKU: `revenue - cogs - ad_spend - refunds - fees`
- Compute Weighted Profit Score using `evicsMasterConfig.js` thresholds
- Write daily profit logs to Supabase
- Feed product tier rankings

---

### 3.2 Build the Product Tier Manager

**Priority:** P1 — High
**Impact:** Without tier management, all products are treated equally. The system cannot automatically protect Tier 1 winners or cut Tier 4 losers.

File: `engines/productTierEngine.js`

Tier definitions (from EVICS rules):
- **Tier 1:** Top performers — protect and scale
- **Tier 2:** Strong performers — maintain and optimize
- **Tier 3:** Developing — test and monitor
- **Tier 4:** Underperforming — 2-month recovery window, then pause

---

### 3.3 Build the Capital Allocator

**Priority:** P1 — High
**Impact:** Manual budget allocation is the single biggest lever for profit. Automating the 80/20 rule (80% to Top 30 ads, 20% to Promotion Pool) compounds returns over time.

File: `engines/capitalAllocatorEngine.js`

Logic:
- Sort ads by Weighted Profit Score
- Allocate 80% of daily budget to Top 30
- Allocate 20% to Promotion Pool (Tier 3 challengers)
- Reallocate Tier 4 spend immediately on pause
- Output daily allocation report to Supabase

---

### 3.4 Build the Render Grading Engine

**Priority:** P2 — Medium
**Impact:** The HAVE system requires a 99% authenticity score before deployment. Without automated grading, every render requires manual review.

File: `engines/renderGradingEngine.js`

Grading dimensions:
- Facial realism (no uncanny valley artifacts)
- Hand realism (correct finger count, natural movement)
- Motion realism (no jitter, smooth transitions)
- Lighting consistency
- Human behavior authenticity
- AI artifact detection (halos, texture bleed, unnatural edges)

Minimum deployment score: 92 (from `evicsMasterConfig.js`). HAVE system minimum: 99.

---

### 3.5 Build the Experiment Governor

**Priority:** P2 — Medium
**Impact:** Without controlled A/B testing, the system cannot distinguish between a genuinely better creative and random variance.

File: `engines/experimentGovernorEngine.js`

Logic:
- Maintain one Baseline A and one Challenger B per SKU
- Run tests for minimum 3 days or 1,000 impressions
- Kill challengers with CTR < 80% of baseline after day 2
- Promote challengers with CTR > 120% of baseline
- Archive all experiment results with statistical confidence scores

---

### 3.6 Build the Library Steward

**Priority:** P2 — Medium
**Impact:** Without active library management, the `creatives` table grows unbounded with low-quality drafts that pollute the assembly workspace.

File: `engines/libraryStewardEngine.js`

Rules:
- Keep Top 5 active creatives per SKU (by score)
- Archive creatives scoring below 70 to `creatives_archive`
- Maintain Fallout Top 100 (best rejected creatives for reference)
- Maintain Elite Top 20 (all-time best performers)
- Run nightly cleanup

---

## Category 4 — External API Integrations

### 4.1 Veo 3 Integration

**Priority:** P3 — Low (placeholder)
**Impact:** Google Veo 3 produces photorealistic video that could outperform HeyGen for certain ad formats.

When the API becomes publicly available:
1. Add `REACT_APP_VEO3_API_KEY` to Railway.
2. Add a `veo3` branch to the `/api/video/generate` route.
3. Set `window.IAGT_FEATURES.externalApis.veo3 = true` in `config.js`.

---

### 4.2 Canva Integration

**Priority:** P3 — Low (placeholder)
**Impact:** Bulk product graphic generation for static ad formats (Pinterest, Facebook carousel, Shopify blog thumbnails).

Integration points:
- Use Canva Connect API to create designs from templates
- Pass product name, image URL, and hook text as template variables
- Export as PNG/JPG for use in ad creative packages

---

### 4.3 Predis AI Integration

**Priority:** P3 — Low (placeholder)
**Impact:** Predis AI predicts which social media content will perform before publishing, adding a pre-flight quality gate.

Integration point: Call `POST /api/predis/predict` before queuing a creative. If predicted engagement score is below threshold, flag for human review.

---

### 4.4 Vizard AI Integration

**Priority:** P3 — Low (placeholder)
**Impact:** Vizard automatically repurposes long-form video into short clips optimized for each platform, multiplying output from a single render.

Integration point: After a video render completes, pass the URL to Vizard to generate TikTok, Reels, and Shorts variants automatically.

---

### 4.5 Gemini Omni Integration

**Priority:** P3 — Low (placeholder)
**Impact:** Gemini Omni's multimodal capabilities enable video analysis — the system could analyze competitor ads visually, not just by text metadata.

Integration point: Use Gemini Omni to analyze viral ad video files and extract visual patterns (camera movement, scene timing, color palette, product placement) that text-only scraping misses.

---

## Category 5 — Analytics & Reporting

### 5.1 Analytics Dashboard Section

**Priority:** P2 — Medium
**Impact:** Without a dedicated analytics view, performance data lives only in Supabase tables with no visual summary.

Build the Analytics section (currently a non-functional sidebar button) with:
- Daily revenue and profit trend chart
- Top 10 creatives by CTR and conversion rate
- Channel performance breakdown (TikTok vs Instagram vs YouTube vs Facebook vs Pinterest)
- Hook category performance (which hook types convert best)
- Product tier distribution chart
- Render success rate by platform (HeyGen vs Runway vs Kling)

---

### 5.2 Executive Weekly Report

**Priority:** P2 — Medium
**Impact:** The Executive Reporter agent is defined in the playbook but not implemented. A weekly automated report closes the loop on system performance.

Build `engines/executiveReporterEngine.js` to generate a weekly Markdown report covering:
- Total ads generated and approved
- Top 5 performing creatives
- Budget allocation summary
- Tier movement events (promotions and pauses)
- Experiment results
- Recommended focus for next week

Output to Supabase and optionally email via a transactional email service.

---

### 5.3 ROAS Tracking

**Priority:** P1 — High
**Impact:** Return on Ad Spend is the primary KPI for the entire system. Without it, there is no way to measure whether EVICS is actually working.

Connect Shopify order data to ad creative IDs via UTM parameters:
1. Tag each published creative with a UTM campaign ID.
2. Pull Shopify orders with matching UTM source.
3. Calculate ROAS per creative: `revenue_from_orders / ad_spend`.
4. Feed ROAS into the Weighted Profit Score.
5. Display ROAS on creative cards in the dashboard.

---

## Category 6 — Performance & Reliability

### 6.1 Database Indexes

**Priority:** P1 — High
**Impact:** As `evics_trends` and `creatives` tables grow to thousands of rows, unindexed queries will slow the dashboard noticeably.

Add indexes:
```sql
CREATE INDEX idx_evics_trends_created_at ON evics_trends(created_at DESC);
CREATE INDEX idx_evics_trends_platform ON evics_trends(platform);
CREATE INDEX idx_creatives_status ON creatives(status);
CREATE INDEX idx_creatives_score ON creatives(score DESC);
CREATE INDEX idx_evics_renders_status ON evics_renders(status);
CREATE INDEX idx_publishing_queue_publish_at ON publishing_queue(publish_at);
```

---

### 6.2 Error Boundary in Dashboard

**Priority:** P2 — Medium
**Impact:** A single JavaScript error in `app.js` currently crashes the entire dashboard. An error boundary catches failures in individual sections and shows a recovery UI instead of a blank screen.

Wrap each major section render in a try/catch. On error, render a fallback card with the error message and a "Reload section" button.

---

### 6.3 Offline / Demo Mode Indicator

**Priority:** P2 — Medium
**Impact:** When Supabase credentials are not set, the dashboard silently shows demo data. Users may not realize they are not seeing live data.

Make the demo mode indicator more prominent:
- Show a persistent banner: "Demo Mode — Add Supabase credentials to load live data."
- Add a direct link to the Connect Sources modal.
- Dim or badge all data cards with "Demo" when in demo mode.

---

### 6.4 Health Check Endpoint Enhancement

**Priority:** P3 — Low
**Impact:** The current `/health` endpoint returns `{ok: true}`. A richer health check enables Railway uptime monitoring and faster incident diagnosis.

Enhance to return:
```json
{
  "ok": true,
  "time": "2025-01-01T06:00:00Z",
  "version": "1.0.0",
  "supabase": "connected",
  "shopify": "configured",
  "agents": {
    "viralScan": "ready",
    "generateAds": "ready",
    "copilot": "ready"
  }
}
```
