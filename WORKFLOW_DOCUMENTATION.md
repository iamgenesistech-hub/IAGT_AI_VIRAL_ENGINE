# EVICS Workflow Documentation

**System:** IAGT AI Viral Engine (EVICS)
**Store:** iamgenesistech.myshopify.com

---

## Overview

EVICS operates in two modes: **Manual** (human-in-the-loop, step-by-step) and **Autopilot** (fully automated daily pipeline). Both modes share the same underlying data flow — the difference is whether a human approves each stage or the system advances automatically.

---

## Manual Workflow

The manual workflow gives the operator full control over every stage. Use this mode during initial setup, when testing new creative formats, or when you want to hand-pick which ads get published.

### Step 1 — Viral Intelligence Scan

**Who:** Operator
**When:** Daily, 6:00 AM
**How:**
1. Open the dashboard at your Railway URL.
2. In the Viral Intelligence panel, set the scan amount (default: 1,284 ads).
3. Click **Rescan Viral Ads**.
4. The frontend calls `POST /api/viral/rescan` with `{ amount }`.
5. The backend logs the scan request to `evics_trends` and returns a confirmation.
6. Review the updated viral ad cards — filter by platform (TikTok, Instagram, YouTube, Facebook, Pinterest) and category (Weight loss, Beauty, Testosterone, Nootropics, Luxury wellness).
7. Click any ad card to open the detail inspector: hook, emotional triggers, visual structure, product match, velocity score, and conversion score.

**Output:** Refreshed viral ad library with ranked hooks and structural patterns.

---

### Step 2 — Winning Hook Extraction

**Who:** Operator
**When:** After viral scan
**How:**
1. In the Winning Hooks panel, set the target count (default: 100).
2. Click **Find Winning Hooks**.
3. The frontend calls `POST /api/hooks/search` with `{ target }`.
4. The backend queries `evics_trends` for hooks ordered by recency and returns up to `target` results.
5. Review the hook list — filter by category (Curiosity, Problem-Solution, Transformation, Proof, Aspirational, Reframe, Authority) and platform.
6. Click individual hooks to select them, or enable **Auto-Select** to let the system pick the highest-confidence hooks.

**Output:** A curated set of winning hooks ready for creative assembly.

---

### Step 3 — Product Matching

**Who:** Operator
**When:** After hook extraction
**How:**
1. Expand the Product Matching panel.
2. Products are loaded from Supabase (`evics_products`) and Shopify (`/api/shopify/synced-products`).
3. Each product shows its category, viral score, and recommended creative angle.
4. Click products to select them for the current creative batch. Multi-select is supported.
5. Use the category filter to narrow by supplement type (Sea Moss, Weight Loss, Beauty, Testosterone, Nootropics).

**Output:** A selected product set matched to the current viral trend patterns.

---

### Step 4 — Video Assembly

**Who:** Operator
**When:** After product matching
**How:**
1. Open the Video Assembly Workspace.
2. Use the component pickers to select:
   - **Hook** — from the winning hooks list (filter by category)
   - **Script** — from approved creatives (filter by product)
   - **Product** — from the matched product set (filter by category)
3. Set video parameters: Duration (15s / 30s / 60s), Style (UGC / Story / Problem-Solution / Transformation / Gym Lifestyle), Voice (Female / Male), Background (Music / Silent / Ambient), Aspect ratio (9:16 / 1:1 / 16:9).
4. Click **AI Suggestions** to call `POST /api/assembly/suggestions` — the backend pulls the top-scoring hook, script, and product from Supabase and pre-fills the workspace.
5. Review and adjust the assembled components.
6. Click **Save Draft** to persist to `video_assembly_drafts` via `POST /api/assembly/drafts`.

**Output:** A saved video assembly draft with all components and parameters locked.

---

### Step 5 — Video Generation

**Who:** Operator
**When:** After assembly draft is saved
**How:**
1. In the Video Assembly Workspace, select the render platform: **HeyGen** (avatar/spokesperson), **Runway ML** (image-to-video), or **Kling AI** (text-to-video).
2. Click **Render Video**.
3. The frontend calls `POST /api/video/generate` via `window.iagtSupabase.triggerVideoGeneration()`.
4. The backend dispatches to the selected platform API:
   - **HeyGen:** `POST https://api.heygen.com/v2/video/generate` with avatar, voice, and dimension settings.
   - **Runway:** `POST https://api.runwayml.com/v1/image_to_video` with prompt, model `gen3a_turbo`, and ratio.
   - **Kling:** `POST https://api.klingai.com/v1/videos/text2video` with prompt, duration, and aspect ratio.
5. The render job is logged to `evics_renders` with status `pending` or `complete`.
6. The dashboard shows render progress. Poll `/api/renders` to check job status.

**Output:** A video render job submitted to the selected AI platform, with the job ID and URL stored in Supabase.

---

### Step 6 — Creative Review & Approval

**Who:** Operator
**When:** After video generation
**How:**
1. In the Creative Review panel, filter by status: Ready / Review / Draft / All.
2. For each creative, review the hook, script, asset description, channel, and quality score.
3. Click **Approve** to mark the creative as approved — calls `PATCH creatives` via Supabase with `{ approved: true }`.
4. Click **Reject** to open the rejection reason field — enter specific feedback (e.g., "Hook lacks urgency. Needs stronger emotional trigger before product reveal.") and submit. Calls `PATCH creatives` with `{ approved: false, rejection_reason: "..." }`.
5. Approved creatives advance to the publishing queue. Rejected creatives return to Draft status for revision.

**Output:** A reviewed creative library with approved ads ready for distribution.

---

### Step 7 — Distribution

**Who:** Operator
**When:** After creative approval
**How:**
1. In the Publishing Queue panel, review scheduled posts by channel and time.
2. To queue a creative manually, call `POST /api/agent/publish` with `{ creativeId, channel, publishAt }`.
3. The queue shows: Channel (TikTok, Instagram, YouTube Shorts, Pinterest, Shopify Blog), scheduled time, content title, and status (Ready / Review / Queued / Draft).
4. Confirm the schedule and publish.

**Output:** Approved creatives queued for distribution across all active channels.

---

### Step 8 — Learning Loop

**Who:** System (triggered by operator or nightly cron)
**When:** Nightly
**How:**
1. After ads run, collect performance data: watch time, engagement rate, CTR, sales, conversion rate.
2. Call `POST /api/agent/learning-loop` with `{ creativeId, watchTime, engagement, ctr, sales, conversionRate }`.
3. The backend logs the data to `evics_renders`.
4. Nightly analysis updates best-performing hooks, formats, and product angles in `evics_trends` and `evics_products`.

**Output:** Updated performance intelligence that improves the next day's viral scan and hook extraction.

---

## Autopilot Workflow

The autopilot workflow runs the full pipeline automatically with a single trigger. Use this mode once the system is calibrated and you trust the quality thresholds.

### Trigger

Click **Generate Today's Ads** in the dashboard header, or call:

```
POST /api/agent/generate-ads
Body: { products: [...], hooks: [...] }
```

### Pipeline Stages

```
Stage 1: Viral Scan
  POST /api/agent/viral-scan
  → Logs scan to evics_trends
  → Returns: { count, message }

Stage 2: Hook Extraction
  POST /api/hooks/search
  → Queries evics_trends for top hooks
  → Returns: { found, hooks[] }

Stage 3: Product Matching
  GET /api/products  (evics_products)
  GET /api/shopify/synced-products  (Shopify live)
  → Merges and scores products by viral fit

Stage 4: Creative Generation
  POST /api/agent/generate-ads
  → Batch-inserts up to 5 creatives into creatives table
  → Each creative: product, hook, format, channel, score=75, approved=false

Stage 5: Assembly Suggestions
  POST /api/assembly/suggestions
  → Pulls best hook + script + product from DB
  → Returns pre-filled component set

Stage 6: Video Generation
  POST /api/video/generate
  → Dispatches to HeyGen / Runway / Kling
  → Logs render to evics_renders

Stage 7: Auto-Approval (optional)
  POST /api/agent/approve-creative
  → Approves creatives scoring above threshold (default: 80)
  → Rejects below-threshold creatives with auto-generated reason

Stage 8: Publish Queue
  POST /api/agent/publish
  → Queues approved creatives to publishing_queue
  → Schedules by channel optimal time

Stage 9: Learning Loop
  POST /api/agent/learning-loop
  → Logs performance data nightly
  → Updates trend and product intelligence
```

### Auto-Generate Progress Display

The dashboard shows a live progress animation during auto-generate:

1. Scanning viral content...
2. Extracting winning hooks...
3. Matching products...
4. Generating ad scripts...
5. Assembling video components...
6. Queuing for render...
7. Complete — N ads generated.

---

## Copilot Workflow

The AI Copilot answers workspace questions and suggests next actions at any point in the workflow.

### How to Use

1. Click the **Copilot** button or type a question in the copilot input field.
2. The frontend calls `POST /api/agent/copilot` with `{ question, context }`.
3. The backend pulls live workspace context from Supabase (top trends, top creatives, top products).
4. Returns: `{ answer, nextActions[], workspaceContext }`.
5. The copilot panel displays the answer and a list of one-click next actions.

### Example Questions

- "What should I focus on today?"
- "Which product has the best viral momentum right now?"
- "Why is my Sea Moss ad underperforming?"
- "What hook format is working best on TikTok this week?"
- "Should I scale the NeuroRise Focus campaign?"

---

## Data Flow Diagram

```
[Viral Platforms]
  TikTok / Instagram / YouTube / Facebook / Pinterest
        │
        ▼
[Viral Scan Agent]  ──────────────────────────────────────────────────────┐
  POST /api/viral/rescan                                                   │
  POST /api/agent/viral-scan                                               │
        │                                                                  │
        ▼                                                                  │
[Supabase: evics_trends]                                                   │
  hook, platform, category, confidence, viral_score                        │
        │                                                                  │
        ├──────────────────────────────────────────────────────────────────┤
        │                                                                  │
        ▼                                                                  ▼
[Hook Extraction]                                              [Product Matching]
  POST /api/hooks/search                                         GET /api/products
        │                                                        GET /api/shopify/synced-products
        │                                                               │
        └──────────────────────┬────────────────────────────────────────┘
                               │
                               ▼
                    [Video Assembly Workspace]
                      Hook + Script + Product
                      Duration / Style / Voice / Aspect
                               │
                               ▼
                    [AI Suggestions]
                      POST /api/assembly/suggestions
                               │
                               ▼
                    [Draft Save]
                      POST /api/assembly/drafts
                      Supabase: video_assembly_drafts
                               │
                               ▼
                    [Video Generation]
                      POST /api/video/generate
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
                [HeyGen]  [Runway ML]  [Kling AI]
                    │          │          │
                    └──────────┴──────────┘
                               │
                               ▼
                    [Supabase: evics_renders]
                      job_id, video_url, status
                               │
                               ▼
                    [Creative Review]
                      Approve / Reject
                      PATCH creatives (Supabase)
                               │
                               ▼
                    [Publishing Queue]
                      POST /api/agent/publish
                      Supabase: publishing_queue
                               │
                               ▼
                    [Distribution Channels]
                      TikTok / Instagram / YouTube Shorts
                      Pinterest / Shopify Blog
                               │
                               ▼
                    [Learning Loop]
                      POST /api/agent/learning-loop
                      Supabase: evics_renders (performance log)
                               │
                               ▼
                    [Intelligence Update]
                      evics_trends / evics_products updated
                      Next day's scan is smarter
```

---

## Integration Points

| Integration | Direction | Protocol | Auth |
|---|---|---|---|
| Supabase (dashboard) | Read/Write | REST (fetch) | `apikey` + `Authorization: Bearer` headers |
| Supabase (backend) | Read/Write | `@supabase/supabase-js` | `SUPABASE_URL` + `SUPABASE_KEY` env vars |
| HeyGen | Write | REST POST | `X-Api-Key` header |
| Runway ML | Write | REST POST | `Authorization: Bearer` header |
| Kling AI | Write | REST POST | `Authorization: Bearer` header |
| Shopify Admin | Read | REST GET | `X-Shopify-Access-Token` header |
| OpenAI (planned) | Write | REST POST | `Authorization: Bearer` header |

---

## Environment Variables Reference

| Variable | Used By | Purpose |
|---|---|---|
| `SUPABASE_URL` | backend/server.js | Supabase project URL |
| `SUPABASE_KEY` | backend/server.js | Supabase service role or anon key |
| `REACT_APP_SUPABASE_URL` | dashboard/config.js | Supabase URL for frontend client |
| `REACT_APP_SUPABASE_ANON_KEY` | dashboard/config.js | Supabase anon key for frontend client |
| `HEYGEN_API_KEY` | backend/server.js | HeyGen video generation |
| `RUNWAY_API_KEY` | backend/server.js | Runway ML video generation |
| `KLING_API_KEY` | backend/server.js | Kling AI video generation |
| `SHOPIFY_STORE_DOMAIN` | backend (shopifyLiveConnector) | Shopify store domain |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | backend (shopifyLiveConnector) | Shopify Admin API token |
| `OPENAI_API_KEY` | backend/server.js (planned) | GPT-4o for copilot |
| `PORT` | backend/server.js | Server port (default: 3000) |
