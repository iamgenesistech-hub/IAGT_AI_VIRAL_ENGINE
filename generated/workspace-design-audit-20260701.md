Workspace Design & Operations Audit — EVICS Titanium (2026-07-01)

Summary
-------
This audit inspects the Media Output Center, VP mission/Executive workspace, workspace buttons/tabs, and pipeline endpoints. It inventories each interactive element (button/tab), the intended purpose, current wiring (handler + endpoint), status (OK / Needs Improvement / Missing), and recommended fixes prioritized for "elite" performance.

Scope
-----
- UI: dashboard/control-center/media-output.js, dashboard/control-center/app.js (control center)
- Backend: backend/mediaOutputRoutes.js, backend/evicsEliteRoutes.js, backend/server.js
- Worker: backend/publishWorker.js (recently added)

Key findings (high level)
------------------------
- Media Output Center: Core buttons are implemented and wired (Playback, Storage, Approve, Publish, Render, QA, Save Asset). Client-side handlers call well-defined server endpoints. Server implements Supabase-first with robust local JSON fallback; Publish enqueues to publishing_queue with local fallback.
- Proof render injection exists client-side (proof-evics-sea-moss). Server now merges local fallback into GET /api/media-output/outputs — client injection is a safety hack and should be removed after server consolidation.
- Publish worker created (backend/publishWorker.js). It processes generated/local_publishing_queue.json and writes generated/local_publishing_history.json. Worker supports single-run and daemon modes.
- VP mission endpoints exist (POST /api/agents/vp-mission, GET /api/agents/vp-mission/:id). UI has Launch VP Mission button wired in control-center/app.js.
- Mic/voice capture for VP assist is not present in the control-center UI (no obvious getUserMedia handlers). Voice input path & mic UX are missing and must be implemented for VP Assist.
- Scanners and Product Intelligence are implemented with in-memory/local-state fallbacks (evicsEliteRoutes.js). They provide mocked findings; integration with real scrapers needs review for cadence, compliance, and distribution to agent learning loops.

Detailed inventory — Media Output Center (dashboard/control-center/media-output.js)
---------------------------------------------------------------------------------
Note: element references use the data-* attributes as selectors.

1) Playback button
- Selector / markup: <button data-moc-open-url="..." data-moc-open-context="playback" data-moc-id="...">Playback</button>
- Handler: document.querySelectorAll('[data-moc-open-url]') -> openMediaUrl(button.dataset.mocOpenUrl)
- Server: no server call required — opens playback URL in new window via window.open
- Status: OK (works for absolute URLs and served files under /generated static route)
- Recommendation: ensure playback uses an embedded player when possible (inline or modal) for smoother UX; validate gs:// -> https:// storage links and add signed URL support for private buckets.
- Priority: High (UX improvement)

2) Storage button (Recall / Open Google Storage Copy)
- Selector: data-moc-open-url with context=storage / storage-recall
- Handler: same as Playback -> openMediaUrl
- Server: no server call; storageUrl is resolved in normalizeMediaOutput and resolveStorageLink
- Status: OK (opens GCS URL); limitations: requires public access or browser auth
- Recommendation: add support to request signed URLs via backend (GET /api/media-output/storage-signed?path=...) and open these instead; add inline viewer for GCS objects when possible
- Priority: High

3) Buy link / CTA buttons
- Selector: data-moc-open-url context=product or data-moc-buy-now
- Handler: openMediaUrl; CTA timing uses bindBuyNowCtaTiming which monitors <video> timeupdate
- Server: none for opening, but telemetry uses /api/media-output/telemetry
- Status: OK; CTA visibility logic uses video duration heuristics
- Recommendation: add click-tracking and conversion telemetry (POST to /api/media-output/telemetry with richer payload), and ensure CTA button can be customized per variant with startOffset
- Priority: Medium

4) Action buttons (approve, quality, queue, publish, render, reject, archive)
- Selector: data-moc-action="<action>" data-moc-id
- Handler: runOutputAction(action, id) -> calls POST /api/media-output/outputs/:id/actions { action }
- Server: backend/mediaOutputRoutes.js handles updateMediaOutputStatus and publishes to publishing_queue with Supabase-first and local fallback (generated/local_publishing_queue.json)
- Status: OK (end-to-end). Server logs audit events via evics_media_audit_logs (Supabase) and local console when DB not available.
- Recommendation: add UI feedback for queued/published state (poll /api/publish-queue/status). Add optimistic UI state changes and error-handling messaging. Consider preventing duplicate publishes by disabling button while queued.
- Priority: High

5) Render-route buttons (render master, render selected preset, duplicate variant, sendToManualReview)
- Selector: data-moc-render-route on buttons in renderActionBar
- Handler: runRenderRouteAction(action, id) -> POST /api/media-output/outputs/:id/render-route { action, context }
- Server: mediaOutputRoutes.js supports render-route, generates job object in parameters.routeHistory and updates status
- Status: OK (works for mock/demo). Hook to real render providers (HeyGen/Runway) already exists in evicsEliteRoutes.js render endpoints for provider-specific pipelines
- Recommendation: unify render submission pathway so front-end uses a single /api/render/:provider/submit flow for actual provider calls; add job-status polling and stream logs to UI
- Priority: High

6) Asset Editor (Save asset)
- Selector: data-moc-save-asset -> saveAsset(id) -> PATCH /api/media-output/outputs/:id
- Handler: updates render_name, video_url, thumbnail_url, product_url, parameters
- Server: updateMediaOutputAsset performs Supabase update; no local fallback for patch (server uses fetchMediaOutputById fallback then Supabase update; if Supabase missing, update may error) — but persist-proof endpoint has local fallback
- Status: Partial — Save works when Supabase is present; when Supabase missing updateMediaOutputAsset will attempt Supabase update and throw on error; currently no local fallback write for PATCH
- Recommendation: Add local fallback for asset updates (persist updated fields into generated/local_evics_renders.json) to allow offline editing when Supabase is not configured
- Priority: High

7) QA / Learning Loop (Save learning loop)
- Selector: data-moc-save-qa -> saveQa(id) -> POST /api/media-output/outputs/:id/qa
- Handler: sends mocState.qa payload to server
- Server: mediaOutputRoutes.js updates parameters.qaInstructions in Supabase; logs audit event
- Status: OK when Supabase is present; no local fallback currently
- Recommendation: Add a local fallback write path for QA updates (generated/local_evics_renders.json) and add telemetry to track board decisions and training signals for agent learning loops
- Priority: High

8) Player bindings and CTA timing
- Selector: <video data-moc-video>
- Handler: bindBuyNowCtaTiming attaches play/loadedmetadata/timeupdate/ended handlers to manage CTA visibility and telemetry
- Server: telemetry posted to /api/media-output/telemetry
- Status: OK. Works for direct file playback served from /generated static route.
- Recommendation: add support for streaming and signed URLs and ensure autoplay rules across browsers are handled (muted autoplay allowed). Also expose player controls for trimming and exporting timestamps to QA
- Priority: Medium

9) Proof injection (client-side fallback)
- Code: loadMediaOutputs() injects a proof item with id 'proof-evics-sea-moss' when API returns empty
- Rationale: ensures demo shows a playable proof clip even when Supabase is empty
- Status: Works but is hacky/duplicate since server now merges local fallback
- Recommendation: Remove client proof injection and rely on server GET merging local_evics_renders.json; if kept, add a robust check and mark as demo-only flag
- Priority: Low

Detailed inventory — Backend (mediaOutputRoutes.js)
--------------------------------------------------
- GET /api/media-output/outputs: Supabase-first, reads generated/local_evics_renders.json fallback, merges and de-dupes, returns normalized items. Status: OK (merged fallback added).
- GET /api/media-output/outputs/:id: Supabase-first, fallback to generated/local_evics_renders.json. Status: OK.
- POST /api/media-output/outputs/:id/actions: Supports action mapping, updates status in Supabase; on publish attempts to insert into publishing_queue, falls back to appending generated/local_publishing_queue.json. Status: OK.
- PATCH /api/media-output/outputs/:id: updateMediaOutputAsset uses Supabase update; currently throws if Supabase missing (no local fallback). Status: Partial.
- POST /api/media-output/outputs/:id/render-route: Accepts render route actions, updates routeHistory in parameters. Status: OK.
- POST /api/media-output/outputs/:id/qa: Updates QA instructions in Supabase; no local fallback. Status: Partial.
- POST /api/media-output/telemetry: Writes to evics_media_audit_logs (Supabase) with fallback console.warn. Status: Partial — add local telemetry buffering.

Detailed inventory — VP mission and executive flows (backend/evicsEliteRoutes.js)
-------------------------------------------------------------------------------
- POST /api/agents/vp-mission: Creates a VP mission object in local elite state (generated/evics-elite-state.json), logs timeline, returns mission snapshot. Status: OK.
- GET /api/agents/vp-mission/:missionId: Reads mission from local state. Status: OK.
- UI wiring: control-center/app.js contains Launch VP Mission button (id=launch-vp-mission-btn) which calls POST /api/agents/vp-mission and updates state.vpMission. Status: OK.
- Recommendation: Implement VP mic/voice capture UX and backend ingestion path. Current code does not show microphone capture or speech-to-text integration. Add endpoints to receive audio blobs or transcriptions and route to agent orchestration (e.g., /api/agents/vp-assist).
- Priority: High (core feature requested)

Detailed inventory — Scanners / Scrapers
---------------------------------------
- evicsEliteRoutes.js contains scanner state (readState().scanner), endpoints: /api/scanner/run, /api/scanner/settings, /api/product-intel/scanner/start, /stop.
- These endpoints currently run mocked product discovery using loadProducts() and produce board-summary findings. Status: OK for demo; needs production scrapers.
- Recommendation: Implement robust scraping pipelines as separate jobs (serverless or scheduled workers), ensure rate limiting and compliance (robots.txt, API terms), and publish findings to the VP mission and board learning loop. Add provenance metadata and sampling statistics.
- Priority: Medium → High depending on production intent

AI Agents Audit (summary)
-------------------------
- Agents configured in code: vp_copilot, board_agent, scanner_agent (names appear in buildAgentReport)
- Agents are implemented as in-process logic producing state and timeline; they are not separate microservices. Status: OK (demo), but for elite performance recommend:
  - Separate agent processes or orchestrator service with retry, observability, and per-agent telemetry
  - Add per-agent grading metrics: latency, success rate, quality delta (pre/post agent), and A/B compare renders
  - Connect QA learning loop: when board saves QA, feed into agent retraining / prompt tuning pipeline
- Priority: High for production-grade orchestration

VP Floating Button, Mic, and Assist UX
--------------------------------------
- Current code provides VP mission controls (launch/refresh) but no floating VP button or mic capture handlers in control-center UI
- Recommendation (implementation plan):
  1) Add a floating VP control (component) accessible across workspaces. UX: single floating circular button that expands to quick actions (Start VP mission, Microphone, Quick Publish, Help).
  2) Mic flow: use navigator.mediaDevices.getUserMedia({ audio: true }) -> record audio in browser (WebAudio / MediaRecorder) -> upload audio blob to /api/agents/vp-assist/audio -> server invokes speech-to-text (OpenAI/whisper, Google STT, or provider) -> transcription returned and used as VP instruction to agents.
  3) Add real-time transcription (optional) and an interim prompt/confirm UI; allow 'VP Assist' to accept transcription and create mission or patch existing render job.
  4) Add permission checks and fallback when microphone unsupported.
- Priority: Critical (user requested VP mic and assistant flows)

Gaps & Immediate quick wins
---------------------------
1) Add local fallback for PATCH (asset edits) and QA writes so admins can edit assets and save QA without Supabase keys. (High)
2) Add signed URL support for private GCS playback and storage recall. (High)
3) Remove client proof injection once server fallback merge is fully trusted — keep as demo-only flag. (Low)
4) Add /api/publish-queue/status endpoint for UI polling of queue length and last-processed items; wire an indicator in UI to show queued/published status. (High)
5) Implement VP mic UI and /api/agents/vp-assist audio ingestion + STT (Critical)
6) Add telemetry buffering for audit logs when Supabase is unavailable. (Medium)
7) Strengthen publish worker: support retries, failure backoff, per-item audit and optional real channel publishing. (High)

Acceptance criteria (audit completion)
-------------------------------------
- Inventory of all interactive elements completed (this file).
- High-priority fixes implemented or scheduled as todos with owners and acceptance criteria (next step: create-elite-todo-list).
- Publish worker present and tested locally (backend/publishWorker.js created).

Next steps (recommended immediate next actions)
---------------------------------------------
1) Implement local fallback for PATCH /api/media-output/outputs/:id and POST /api/media-output/outputs/:id/qa
   - Add to todo: implement-local-fallback-asset-qa (High)
2) Add /api/publish-queue/status and UI indicator for queued items (High)
3) Implement VP mic UI and /api/agents/vp-assist audio ingestion + STT (Critical)
4) Configure signed URL generation for GCS via backend and wire playback buttons to use signed URLs when storage is private (High)
5) Start iterative implementation: create elite todo list from this audit and execute in priority order

Audit author: automated audit by Copilot CLI runtime (session) — 2026-07-01
