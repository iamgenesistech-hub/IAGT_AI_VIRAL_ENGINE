# Elite Runtime Audit - 2026-06-22

## Scope
- Single-build consolidation status
- Runtime API functionality
- Agent communication integrity
- Scanner/scraper/script-writer capability level
- Purpose mapping and utilization plan for non-elite or partially functional components

## Consolidation status

### Completed
- Single master workspace file retained: workspace.html
- Duplicate workspace file removed: public/legacy/workspace.html
- Next workspace route now redirects to the master workspace path
- Next rewrites adjusted to backend master routes for workspace-related URLs
- VP panel directive routing now stays inside the master workspace stages (no legacy section jumps)

### Remaining technical debt
- Legacy UI code still exists in app.js and public/legacy/* support files, but no longer serves a separate workspace.html shell.
- Legacy code should be progressively decomposed into master workspace services and then retired.

## Live functionality checks (runtime)

### Pass
- GET /status: healthy response
- GET /api/agents/system-status: healthy response
- GET /api/media/state: healthy response with populated media/scanner state
- POST /api/agents/events: accepted and persisted
- GET /api/agents/timeline: returns live timeline entries
- POST /api/scanner/run: successful and updates findings
- GET /api/render/heygen/preflight: returns readiness + auth-aware preflight payload

### Fail / degraded
- POST /api/render/heygen/submit: provider_failed (401 Unauthorized)
  - Meaning: provider is configured in env contract, but credentials/request are not accepted by provider endpoint at runtime.
  - New behavior: failure is now classified as PROVIDER_AUTH_FAILED and marked non-retryable.
  - Impact: queue pollution and blind retries are reduced; provider credentials still need correction to restore full render reliability.

## Preflight hardening update (implemented)

### Backend
- Added auth-aware provider preflight endpoint: GET /api/render/:provider/preflight
- Added auth failure cache in render provider router with cooldown-based blocking after 401/403
- Added reset path for recovery testing: GET /api/render/:provider/preflight?resetAuth=1
- Submit and poll failures now classify auth faults as PROVIDER_AUTH_FAILED and set retryable=false
- provider readiness now reflects recent auth faults via errorCode=PROVIDER_AUTH_FAILED

### Workspace UI
- startRender now runs provider preflight before media creation/submit
- Render launch is blocked early with actionable error when provider auth is invalid
- Render stage is no longer advanced to rendering after a failed submit
- Connected App System online/standby now respects provider ready status, not just provider presence

### Verification snapshot
- Initial preflight check: ready=true
- Submit probe: 400 provider_failed with errorCode=PROVIDER_AUTH_FAILED and retryable=false
- Follow-up preflight check after 401: ready=false, errorCode=PROVIDER_AUTH_FAILED
- Reset check (resetAuth=1): ready=true

## Intelligence hardening update (implemented)

### Script writer improvements
- `scriptWriterWorker` now uses a multi-pass optimizer (up to 3 passes) with quality scoring for hook, proof, CTA, spoken length, and compliance tone.
- Script metadata now stores `generationMode=multi_pass_optimizer`, pass count, and quality signals.
- Spoken script sanitization now strips direction tags from narration payloads.

### Source ingest improvements
- Source ingest now records confidence and source signals, with `live_source_ingest` mode when high-confidence social URLs are detected.

### Scanner improvements
- Scanner now deduplicates findings per asset/code and keeps highest-severity/highest-confidence findings.
- Low-confidence info findings are suppressed to reduce noise when warnings/critical findings already exist.
- Weighted risk now includes confidence-adjusted scoring.

### Discovery intelligence improvements
- Discovery grid is now live-signal-first using pipeline/media evidence from backend state.
- Seed pattern library is retained only as explicit fallback guidance.
- Discovery labels now surface `live signal` vs `seed fallback` to prevent false live-data claims.

### Agent and Dev API wiring improvements
- Added missing frontend-required endpoint: `POST /api/media/products/sync`.
- Added command endpoint consumed by VP copilot: `POST /api/agents/command`.
- Added office orchestration endpoints: `POST /api/agents/office-run`, `POST /api/agents/office-continuous`.
- Added agent direction surface: `GET /api/agents/directions`.
- Added developer integration surface: `GET /api/dev/access-point`.
- Office workflow now creates real media concepts and executes source/match/script/prompt/compiler worker chain.

### Regression verification
- `node ./test-production-pipeline.js`: pass
- `node ./test-media-ops.js`: pass
- Runtime API validation (port 8081):
  - `GET /api/dev/access-point`: 200
  - `GET /api/agents/directions`: 200
  - `POST /api/agents/command`: 200 (scanner command completed)
  - `POST /api/agents/office-run`: 200 (generated concepts)
  - `POST /api/media/products/sync`: 200 (products synced)

## Pipeline health snapshot
- totalMedia: 29
- byRenderState: failed=11, complete=8, initialized=7, rendering=3
- byDeliveryState: render_failed=11, partial=5, not_ready=7, pending_delivery=3, rendering=3
- scanner state: completed with high finding volume (indicates quality/compliance pressure and/or noisy rules)

Interpretation:
- Orchestration fabric is active.
- Quality gates and transitions are firing.
- Provider execution reliability is below elite because auth/adapter correctness is not yet stable.

## Are script writers and scrapers elite?

### Script writer status: Partially Elite
Observed implementation:
- evics-queue-workers.js scriptWriterWorker builds structured scripts and directives, but currently relies on deterministic templates.
- It enforces product visibility and includes source linkage, which is good for operational consistency.
- It is not yet model-intelligent generation by default; this limits originality and adaptation quality.

Verdict:
- Strong operational baseline, not top-tier intelligence yet.

Required to be elite:
- Primary generation path should use model-driven writing with multi-pass optimization.
- Add scoring loop: hook strength, compliance risk, platform fit, CTA clarity, narrative novelty.
- Add auto-rewrite loop on score threshold failures.

### Scrapers / scanners status: Mixed
Observed implementation:
- Scanner logic in lib/scanner-engine.ts is rule-based and deterministic.
- Discovery in app.js still uses seeded viralAds structures in several flows.
- Scanner run endpoint is functional and produces findings, but current rule noise is high.

Verdict:
- Scanning is functional but not elite intelligence.
- Scraping/discovery is partially seeded and not fully live-intelligence first.

Required to be elite:
- Replace seeded discovery with live ingestion connectors as primary source.
- Add confidence calibration and false-positive suppression.
- Add per-source trust weighting and adaptive thresholding.

## Agent communications status

### What works
- Structured event envelope with correlation/signature model exists.
- Timeline and system-status routes expose agent event traces.
- Queue workers persist lifecycle events to pipeline state.

### What is not yet elite
- Unsigned event fallback is allowed when secrets are missing.
- Event quality and SLA dashboards are not fully normalized per agent/stage.

Required to be elite:
- Enforce signed events in production mode.
- Add per-agent SLA metrics (latency, success, retries, backlog, quality).
- Add event schema validation and dead-letter handling.

## Purpose mapping for non-elite components and tie-in plan

1. Seeded discovery structures in app.js
- Purpose: bootstrap ideation when no live data is available.
- Correct utilization: fallback-only mode with explicit label.
- Tie-in target: live scraper pipelines as primary input.

2. Rule-only scanner engine
- Purpose: deterministic governance guardrails.
- Correct utilization: baseline safety layer.
- Tie-in target: hybrid rule + model scanner with confidence blending.

3. Template script writer path
- Purpose: guaranteed deterministic output and policy-safe structure.
- Correct utilization: fallback and low-risk generation mode.
- Tie-in target: model-first script generation with template fallback.

4. Provider adapters returning 401
- Purpose: live rendering integration.
- Correct utilization: strict failure signaling with retry/rework.
- Tie-in target: credential verification workflow + adapter contract tests.

## Elite upgrade sequence (high priority)

1. Rendering reliability first
- Add provider credential verifier endpoint and startup health checks.
- Add adapter contract tests for HeyGen/Kling/Runway.
- Block render button when provider auth fails preflight.

2. Script intelligence lift
- Introduce model-based script writer service with scoring and rewrite loop.
- Keep template writer as fallback mode only.

3. Discovery intelligence lift
- Replace seeded viralAds-first flow with live source ingestion-first flow.
- Keep seeded patterns only as explicit offline fallback.

4. Scanner intelligence lift
- Add ML-assisted finding ranking and suppression.
- Add scanner precision/recall telemetry and drift monitoring.

5. Agent operations hardening
- Enforce signed events in production.
- Add per-agent performance cards and queue health alarms.

## Current production readiness verdict
- Architecture: strong
- Consolidation: materially improved and now single-master for workspace shell
- Intelligence level: medium (not yet elite)
- Runtime reliability: medium-low due provider auth failures
- Recommended status: continue hardening before declaring top-tier elite operation
