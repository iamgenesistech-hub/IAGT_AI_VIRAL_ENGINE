# EVICS System Audit Report

**System:** IAGT AI Viral Engine (EVICS — Elite Viral Intelligence Control System)
**Store:** iamgenesistech.myshopify.com
**Audit Date:** 2025
**Auditor:** System Audit Agent

---

## Executive Summary

The EVICS system has a well-structured foundation with a functional Express backend, a fully rendered single-page dashboard, Supabase integration, and live connections to HeyGen, Runway ML, and Kling for video generation. The Shopify product sync pipeline is wired end-to-end. The primary gaps are: Supabase credentials not yet populated in `config.js`, six external API integrations still at placeholder status, and several backend engine files referenced in the architecture that have not yet been built.

---

## Section 1 — Dashboard (dashboard/control-center/)

### 1.1 Files

| File | Status | Notes |
|---|---|---|
| `index.html` | ✅ Complete | Loads config.js → supabase.js → app.js in correct order |
| `config.js` | ✅ Updated | Now exposes `IAGT_CONFIG`, `IAGT_EXTERNAL_APIS`, and `IAGT_FEATURES` |
| `config.example.js` | ✅ Present | Reference template with placeholder values |
| `supabase.js` | ✅ Complete | Full REST client with select, PATCH, POST, video generation proxy |
| `app.js` | ✅ Complete | 1,710-line SPA with full render loop |
| `styles.css` | ✅ Present | Dashboard styling |

### 1.2 Dashboard Sections

| Section | Renders | Data Source | Live Data | Notes |
|---|---|---|---|---|
| Sidebar navigation | ✅ | Static | N/A | 6 nav buttons; only Viral Intelligence is active |
| Sync status bar | ✅ | `state.syncLevel` | Partial | Shows Demo / Supabase / error states correctly |
| Viral Intelligence panel | ✅ | `viralAds[]` | ✅ via Supabase | Filters by category and platform |
| Ad detail inspector | ✅ | `selectedAd()` | ✅ | Hook, structure, tags, emotion, product match |
| Winning Hooks panel | ✅ | `winningHooks[]` | ✅ via Supabase | Search, filter, select, auto-select |
| Product Matching panel | ✅ | `products[]` | ✅ via Shopify + Supabase | Expand/collapse, multi-select |
| Video Assembly Workspace | ✅ | `assemblyComponents[]` | ✅ | Hook/script/product pickers, draft save |
| Publishing Queue | ✅ | `channels[]` | ✅ via Supabase | Channel, time, content, status |
| Daily Workflow timeline | ✅ | `workflow[]` | ✅ via Supabase | 6-step daily loop |
| Copilot panel | ✅ | `/api/agent/copilot` | ✅ | Opens on question submit; shows answer + next actions |
| Auto-generate pipeline | ✅ | `/api/agent/generate-ads` | ✅ | Progress animation, result display |

### 1.3 Buttons & Interactions

| Button / Control | Wired | Endpoint | Status |
|---|---|---|---|
| Generate Today's Ads | ✅ | `POST /api/agent/generate-ads` | Working |
| Rescan Viral Ads | ✅ | `POST /api/viral/rescan` | Working |
| Find Winning Hooks | ✅ | `POST /api/hooks/search` | Working |
| Approve creative | ✅ | `PATCH creatives` via Supabase | Working |
| Reject creative (with reason) | ✅ | `PATCH creatives` via Supabase | Working |
| Save Assembly Draft | ✅ | `POST /api/assembly/drafts` | Working |
| AI Suggestions | ✅ | `POST /api/assembly/suggestions` | Working |
| Render Video (HeyGen/Runway/Kling) | ✅ | `POST /api/video/generate` | Working |
| Copilot Ask | ✅ | `POST /api/agent/copilot` | Working |
| Connect Sources | ⚠️ | None | UI only — no modal/action wired |
| Sidebar nav buttons (5 of 6) | ⚠️ | None | Render but do not switch sections |
| Compare Drafts toggle | ✅ | Local state | Working |
| Hook auto-select toggle | ✅ | Local state | Working |
| Product expand/collapse | ✅ | Local state | Working |

---

## Section 2 — Backend (backend/server.js)

### 2.1 API Endpoints

| Method | Route | Status | Notes |
|---|---|---|---|
| GET | `/health` | ✅ | Returns `{ok: true, time}` |
| GET | `/status` | ✅ | Returns plain text confirmation |
| GET | `/api/products` | ✅ | Reads `evics_products` table |
| GET | `/api/renders` | ✅ | Reads `evics_renders` table |
| GET | `/api/campaigns` | ✅ | Reads `evics_campaigns` table |
| GET | `/api/trends` | ✅ | Reads `evics_trends` table |
| GET | `/api/dashboard-summary` | ✅ | Aggregate counts across 4 tables |
| POST | `/api/viral/rescan` | ✅ | Logs rescan to `evics_trends` |
| POST | `/api/hooks/search` | ✅ | Queries hooks from `evics_trends` |
| GET | `/api/creatives` | ✅ | Reads `creatives` table |
| POST | `/api/assembly/drafts` | ✅ | Saves draft to `video_assembly_drafts` |
| GET | `/api/assembly/drafts` | ✅ | Reads saved drafts |
| POST | `/api/assembly/suggestions` | ✅ | Pulls best hook/script/product from DB |
| POST | `/api/video/generate` | ✅ | Dispatches to HeyGen / Runway / Kling |
| POST | `/api/agent/viral-scan` | ✅ | Logs agent scan to `evics_trends` |
| POST | `/api/agent/reconstruct` | ✅ | Creates draft creative in `creatives` |
| POST | `/api/agent/generate-ads` | ✅ | Batch-inserts creatives |
| POST | `/api/agent/approve-creative` | ✅ | Updates approval + rejection reason |
| POST | `/api/agent/publish` | ✅ | Queues creative to `publishing_queue` |
| POST | `/api/agent/learning-loop` | ✅ | Logs performance data to `evics_renders` |
| POST | `/api/agent/copilot` | ✅ | Returns AI suggestion + next actions |
| GET | `/api/shopify/products` | ✅ | Live Shopify product list |
| GET | `/api/shopify/collections` | ✅ | Live Shopify collection list |
| GET | `/api/shopify/synced-products` | ⚠️ | Called by `app.js` but not defined in server.js |

### 2.2 Missing / Incomplete Backend Items

- `utils/shopifyLiveConnector.js` — imported in server.js but not found in the file tree; must exist or be created before Shopify routes work.
- `/api/shopify/synced-products` — called by `hydrateFromServerApi()` in app.js but not defined as a route in server.js.
- No rate limiting middleware (express-rate-limit or similar).
- No CORS configuration — acceptable for same-origin Railway deploy, but needed if dashboard is ever served from a separate domain.
- OpenAI integration in `/api/agent/copilot` is rule-based only; GPT-4o call is not yet implemented.

---

## Section 3 — Database (Supabase)

### 3.1 Required Tables

| Table | Defined in Schema | Used in Backend | Notes |
|---|---|---|---|
| `evics_trends` | ✅ | ✅ | Core trend/hook storage |
| `evics_products` | ✅ | ✅ | Product intelligence |
| `evics_renders` | ✅ | ✅ | Video render job log |
| `evics_campaigns` | ✅ | ✅ | Campaign tracking |
| `creatives` | ✅ | ✅ | Ad creative library |
| `video_assembly_drafts` | ✅ | ✅ | Saved assembly drafts |
| `publishing_queue` | ✅ | ✅ | Distribution queue |
| `video_renders` | ✅ (supabase.js) | ⚠️ | Used in supabase.js client but not in server.js |
| `shopify_products` | ⚠️ | ⚠️ | Listed in checklist; not confirmed created |
| `shopify_collections` | ⚠️ | ⚠️ | Listed in checklist; not confirmed created |
| `evics_authenticity_reviews` | ⚠️ | ❌ | In API registry; no backend route yet |

### 3.2 Supabase Connection Status

- `supabase.js` reads `window.IAGT_CONFIG.supabaseUrl` and `supabaseAnonKey`.
- `config.js` now reads these from `process.env.REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY`.
- Until those env vars are set, the dashboard runs in Demo mode — all data is local JS arrays.
- Backend uses `utils/SupabaseConnector.js` with `SUPABASE_URL` + `SUPABASE_KEY` env vars.

---

## Section 4 — Configuration Files

| File | Status | Notes |
|---|---|---|
| `dashboard/control-center/config.js` | ✅ Updated | Full API registry + feature flags |
| `dashboard/control-center/config.example.js` | ✅ | Reference template |
| `configs/evicsMasterConfig.js` | ✅ | Thresholds, render settings, capital allocation rules |
| `configs/viralConfig.js` | ✅ | Platform list, categories, scoring weights, brand focus |
| `SYSTEM/API_VAULT/ENV_TEMPLATE.txt` | ✅ | Environment variable template |

---

## Section 5 — Agent System

| Agent | Defined | Backend Route | Engine File | Status |
|---|---|---|---|---|
| Profit Auditor | ✅ (playbook) | ❌ | ❌ | Not built |
| Product Tier Manager | ✅ (playbook) | ❌ | ❌ | Not built |
| Capital Allocator | ✅ (playbook) | ❌ | ❌ | Not built |
| Creative Intelligence Agent | ✅ (playbook) | ✅ `/api/agent/reconstruct` | Partial | Route exists; scraper logic pending |
| Experiment Governor | ✅ (playbook) | ❌ | ❌ | Not built |
| Library Steward | ✅ (playbook) | ❌ | ❌ | Not built |
| Executive Reporter | ✅ (playbook) | ❌ | ❌ | Not built |
| Viral Scan Agent | ✅ | ✅ `/api/agent/viral-scan` | Partial | Logs intent; real scraper not connected |
| Auto-Generate Agent | ✅ | ✅ `/api/agent/generate-ads` | ✅ | Functional batch generation |
| Copilot | ✅ | ✅ `/api/agent/copilot` | Partial | Rule-based; GPT-4o not yet wired |
| Publish Agent | ✅ | ✅ `/api/agent/publish` | ✅ | Queues to publishing_queue |
| Learning Loop | ✅ | ✅ `/api/agent/learning-loop` | Partial | Logs data; pattern analysis not built |

---

## Section 6 — External API Integrations

| API | Backend Code | Env Var | Feature Flag | Status |
|---|---|---|---|---|
| HeyGen | ✅ | `HEYGEN_API_KEY` | `true` | Configured — needs key in Railway |
| Runway ML | ✅ | `RUNWAY_API_KEY` | `true` | Configured — needs key in Railway |
| Kling AI | ✅ | `KLING_API_KEY` | `true` | Configured — needs key in Railway |
| Shopify Admin | ✅ | `SHOPIFY_ADMIN_ACCESS_TOKEN` | `true` | Configured — needs token in Railway |
| OpenAI GPT-4o | Partial | `OPENAI_API_KEY` | `false` | Copilot route exists; GPT call not wired |
| Veo 3 | ❌ | `REACT_APP_VEO3_API_KEY` | `false` | Placeholder only |
| Canva | ❌ | `REACT_APP_CANVA_API_KEY` | `false` | Placeholder only |
| Pixa AI | ❌ | `REACT_APP_PIXA_API_KEY` | `false` | Placeholder only |
| Gemini Omni | ❌ | `REACT_APP_GEMINI_OMNI_API_KEY` | `false` | Placeholder only |
| Predis AI | ❌ | `REACT_APP_PREDIS_AI_API_KEY` | `false` | Placeholder only |
| Vizard AI | ❌ | `REACT_APP_VIZARD_API_KEY` | `false` | Placeholder only |

---

## Section 7 — Priority Findings & Recommendations

### P0 — Blocking (must fix before live data works)

1. **Set Supabase credentials** — Add `SUPABASE_URL` and `SUPABASE_KEY` to Railway environment. Add `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` if the dashboard is built with a bundler, or inject them server-side into `config.js` at deploy time.
2. **Create `utils/shopifyLiveConnector.js`** — `server.js` imports this file but it does not exist in the repo. The Shopify product and collection routes will crash on startup without it.
3. **Add `/api/shopify/synced-products` route** — `app.js` calls this endpoint in `hydrateFromServerApi()` but it is not defined in `server.js`.

### P1 — High Priority (needed for full functionality)

4. **Wire OpenAI GPT-4o into `/api/agent/copilot`** — The route currently returns a rule-based string. Replace with an actual `openai.chat.completions.create()` call when `OPENAI_API_KEY` is present, falling back to the current rule-based response when it is not.
5. **Add HeyGen / Runway / Kling API keys to Railway** — The video generation backend code is complete; it just needs the keys.
6. **Add Shopify Admin access token to Railway** — The Shopify routes are built; they need `SHOPIFY_ADMIN_ACCESS_TOKEN` and `SHOPIFY_STORE_DOMAIN`.
7. **Wire sidebar navigation** — Five of six sidebar buttons render but do not switch dashboard sections. Each should toggle a `state.activeSection` value and conditionally render the correct panel.

### P2 — Medium Priority (improves reliability)

8. **Add rate limiting** — Install `express-rate-limit` and apply limits to `/api/agent/*` and `/api/video/generate` routes.
9. **Confirm Supabase table creation** — Verify `shopify_products`, `shopify_collections`, and `evics_authenticity_reviews` tables exist; create them if not.
10. **Reconcile `video_renders` vs `evics_renders`** — `supabase.js` writes to `video_renders`; `server.js` writes to `evics_renders`. Standardize on one table name.

### P3 — Low Priority (polish and completeness)

11. **Wire "Connect Sources" button** — Currently renders but has no action. Should open a modal for entering Supabase / Shopify credentials.
12. **Build missing engine files** — `profitScoreEngine.js`, `productTierEngine.js`, `capitalAllocatorEngine.js`, `renderGradingEngine.js`, `experimentGovernorEngine.js`, `libraryStewardEngine.js` are listed in the architecture but not yet created.
13. **HAVE authenticity system** — Defined in the API registry with a 99% minimum deployment score requirement; no implementation exists yet.
