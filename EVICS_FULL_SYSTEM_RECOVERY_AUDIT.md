# EVICS Full System Recovery Audit

Date: 2026-06-05

## Recovery Position

EVICS is not a minimal workflow app. The current repository contains one execution system with legacy intelligence/control layers feeding it:

- The newer strict workflow engine: `Create -> Render -> Review -> Publish -> Insights`.
- The original full EVICS command platform: research, product intelligence, campaign generation, media operations, agent orchestration, voice control, brand profiles, compliance, and admin utilities.

The strict workflow is the only execution path. Legacy generation, command, and automation layers are inputs/controllers only and must create media records through `/api/media/create` before any render, review, publish, or distribution action can happen.

## Core State Model

The authoritative media lifecycle should remain:

`draft -> queued -> rendering -> render_complete | render_failed -> review_pending -> approved | rework_requested | discarded -> scheduled | published | archived`

The current backend uses similar media state fields in `media-ops.js`, but the static strict workspace uses browser asset stages. Recovery should normalize both into backend-owned state transitions.

## File Inventory And Accountability

| File | Classification | Current Status | Purpose | Dependencies | Dependents | Recovery Decision |
|---|---|---:|---|---|---|---|
| `server.js` | Core active | Active | Local HTTP API server, app routes, vault, owner AI, office agent, media, render, brand, Shopify, Supabase, playback pages. | `evics-connectors`, `media-ops`, `agent-orchestrator`, `render-provider-router`, `quality-checker`, `storage-router` | Browser pages, worker, legacy dashboard, strict workspace | Keep as current backend entry until modular API extraction. |
| `media-ops.js` | Core active | Active | Media registry, lifecycle actions, quality persistence, provider queue records, scanner, archive, analytics, compliance, alerts. | local JSON state | `server.js`, `render-provider-router.js`, `agent-orchestrator.js`, tests | Keep as state authority; harden transition validation. |
| `render-provider-router.js` | Core active / providers | Active | HeyGen/Runway/Kling submission, polling, callback completion, storage save, quality check. | `media-ops`, `quality-checker`, `storage-router`, `twin-agent-directives` | `server.js`, `agent-orchestrator.js`, strict workspace | Keep; provider env contracts still need real provider credentials/endpoints. |
| `quality-checker.js` | Core active | Active | Scores media text/metadata for review readiness. | none | `server.js`, `render-provider-router.js`, `agent-orchestrator.js` | Keep; expand into Elite Quality Rendering Standards. |
| `storage-router.js` | Active support | Active | Saves completed media storage record and reports Google Workspace configuration. | local JSON, env | `server.js`, `render-provider-router.js` | Keep; later replace mock Google save with real Drive adapter. |
| `agent-orchestrator.js` | Active automation | Active after async fix | Classifies text commands, creates agent tasks, delegates render/review/status work. | `media-ops`, `render-provider-router`, `quality-checker` | `server.js`, `voice-copilot.js` via API | Keep; expand command map and make all command outcomes logged. |
| `evics-connectors.js` | Active support/admin | Active | Shopify, Supabase, creatives, approval, scheduling, run log, human review alerts. | env, local JSON, external APIs | `server.js`, `sync-shopify-products.js` | Keep; normalize responses and avoid browser-direct writes where possible. |
| `autonomous-worker.js` | Active automation | Active when `npm run worker` is running | Calls `/api/office-agent/run` on startup and interval for autonomous EVICS runs. | server at `EVICS_BASE_URL` | package script `worker` | Keep; add visible worker health and durable run log display. |
| `app.js` | Active legacy surface / admin command center | Partially active | Original all-in-one dashboard: viral intelligence, product matching, campaign builder, media ops, brand settings, queue, connections, voice bridge. | `brand-profile.js`, `supabase.js`, `voice-copilot.js`, backend routes | `index.html` and `/legacy-dashboard` | Keep, but reframe as Admin Command Center or split into route-specific modules. |
| `brand-profile.js` | Active support/admin | Active legacy seed | Browser-side default brand profiles, approved claims, restricted claims, CTA preferences, styles. | none | `app.js` | Keep; migrate to backend brand profile contract as shared source. |
| `supabase.js` | Transitional compatibility | Active legacy helper | Browser REST helper for Supabase select and creative approval. | `/config.js`, Supabase anon key | `app.js` | Keep short-term for legacy admin; production writes should go backend-first. |
| `voice-copilot.js` | Active command/voice | Active on legacy surface | Speech/text command UI, voice state, directive routing, Office Agent and agent command calls. | `window.evicsActions`, `/api/agent/command`, `/api/office-agent/*` | `app.js` | Keep; surface in `/voice`, `/agents`, and admin rail. |
| `workspace.html` | Core workflow surface | Active | Strict static workflow: Create, Render, Review, Publish, Insights. | `/api/media/create`, `/api/render/*`, `/api/media/*` | root/workspace route after restart | Keep as stable workflow until Next surface is fully backend-driven. |
| `index.html` | Legacy shell | Active compatibility | Loads original full dashboard JS files. | `config.js`, `brand-profile.js`, `supabase.js`, `voice-copilot.js`, `app.js` | `/legacy-dashboard` | Keep during migration. |
| `sync-shopify-products.js` | Active support CLI | Active manual script | Runs Shopify product sync through connector. | `evics-connectors` | package script `sync:shopify` | Keep. |
| `test-media-ops.js` | Test | Active | Media lifecycle smoke test. | `media-ops` | package script `test:media` | Keep and expand. |
| `evidence-media-ops.js` | Test/evidence | Active | Generates media ops evidence state/report. | `media-ops` | package script `evidence:media` | Keep. |
| `twin-agent-directives.js` | Active support | Active | Builds provider task directive metadata. | none | `render-provider-router.js` | Keep. |
| `config.js` | Transitional compatibility | Active browser config | Legacy browser Supabase config shell. | none | `supabase.js` | Prefer `/config.js` generated by server. Keep only for compatibility. |
| `config.example.js` | Example config | Active reference | Shows config shape. | none | developers | Keep. |
| `app/workspace/page.tsx` | Next workflow surface | Partially active | Next route shell for strict workspace. | `WorkspaceShell` | Next app | Keep but backend integration is incomplete. |
| `components/workspace/*` | Next workflow components | Partially active | React version of strict workflow panels. | `useWorkspaceStore` | Next workspace | Keep; should become primary once Next can run on target host. |
| `store/useWorkspaceStore.ts` | Next state store | Partially active | Browser state machine for Next workspace. | React | Next workspace | Keep; eventually hydrate from backend `media-ops`. |
| `lib/types.ts`, `lib/actions.ts`, `lib/validation.ts` | Core TypeScript model | Partially active | Strict workflow types, dummy contracts, validation. | none | Next store/components | Keep; align with backend media contract. |

## UI Section Map

| Surface | File(s) | Purpose | Backend Dependencies | Current Status | Recovery Decision |
|---|---|---|---|---|---|
| Strict workflow | `workspace.html`, Next workspace files | Create/render/review/publish/insights pipeline | `/api/media/create`, `/api/render/*`, `/api/media/action`, `/api/media/:id/approve`, `/api/media/:id/reject` | Active | Keep as workflow source of truth, move state backend-first. |
| EVICS Command | `app.js` section `command` | Executive command dashboard, evidence, automation health | `/status`, `/api/system/evidence`, `/api/office-agent/*`, `/api/agents/runs` | Partially active | Keep as `/admin` or `/agents` command shell. |
| Commercial Intelligence | `app.js` section `discovery` | Viral trend monitor and winning structures | local `viralAds` data, eventual research API | Active but local/static | Restore as `/research` with real saved scan records later. |
| Campaign Builder | `app.js` section `studio` | Campaign brief, script/ad generation | `/api/generate/marketing`, `/api/creatives` | Active | Keep; connect generated scripts to strict `draft` assets. |
| Product Library | `app.js` section `matching` | Shopify product matching and product selection | `/api/shopify/synced-products`, `/sync/products` | Active | Keep; connect selected product to workflow `Create`. |
| Media Output Center | `app.js` section `media` | Legacy media gallery/detail/playback evidence | `/api/media/state`, `/api/media/:id`, `/api/render/*`, `/api/media/action` | Active/partially duplicated | Keep as `/published`/media gallery; remove duplicate controls after mapping. |
| Compliance Review | `app.js` section `compliance` | Brand/compliance scoring and review | `/api/compliance/validate`, brand profile | Partially active | Keep; make it quality/compliance surface. |
| Video Creator | `app.js` section `export` | Provider briefs, launch pack, render/export prompts | clipboard/download, `/api/render/*` for media route | Partially active | Convert to `/render` or `/reconstruction`. |
| Campaign Output | `app.js` section `queue` | Approved concepts queue/export | `/api/creatives/approval`, `/api/publishing/schedule-approved` | Active | Keep; merge with Publish. |
| Settings | `app.js` section `brand-settings` | Brand profile and compliance config | `/api/brand-profiles` | Active | Keep as `/admin/brand` or `/admin`. |
| API Connections | `app.js` section `connections` | Connector status and setup | `/status`, `/api/connections/status`, `/secret-vault` | Active | Keep as admin support. |
| Voice Copilot | `voice-copilot.js` rendered inside `app.js` | Voice/text command routing | `/api/agent/command`, `/api/office-agent/*` | Active | Keep, add dedicated route/surface. |
| Owner AI | `server.js` generated page | Owner engineering directive planning | `/api/owner-ai/*` | Active | Keep admin-only. |
| Secret Vault | `server.js` generated page | Local env credential manager | `/api/secrets/*` | Active | Keep admin-only. |
| Products Dashboard | `server.js` generated page | Lightweight product intelligence page | `/api/shopify/synced-products` | Active | Keep or fold into product intelligence. |

## Control Activation Matrix

This matrix groups repeated controls by selector where the same handler controls multiple UI instances.

| Control / Selector | File | Purpose | Handler | Dependency | Current Status | Final Disposition |
|---|---|---|---|---|---|---|
| Stage tabs | `workspace.html` | Switch strict workflow stage | `setStage` | local state | Working | Keep; later route-backed. |
| Save Draft | `workspace.html` | Save draft script | `saveDraft` | local storage | Working local-only | Keep; backend draft save needed. |
| Send to Render | `workspace.html` | Move draft to queued | `sendToRender` | local state | Working local-only until render creates media | Keep; should create backend draft earlier. |
| Provider dropdown | `workspace.html` | Select HeyGen/Runway/Kling | `startRender` reads value | `/api/render/:provider/submit` | Working if provider configured; fails honestly if not | Keep with provider config messaging. |
| Generate Video | `workspace.html` | Create media and submit provider job | `startRender` | `/api/media/create`, `/api/render/:provider/submit` | Working contract | Keep. |
| Retry | `workspace.html` | Move failed render back to queue | `retryRender` | local state | Working local-only | Keep; should also retry backend job where possible. |
| Attach Provider Result | `workspace.html` | Manually complete render with real URL | `completeRender` | `/api/render/:provider/callback` when job exists | Working | Keep. |
| Approve | `workspace.html` | Approve review asset | `approveAsset` | `/api/media/:id/approve` if media exists | Working | Keep. |
| Request Re-render | `workspace.html` | Reject/rework asset | `requestRerender` | `/api/media/:id/reject` if media exists | Working | Keep. |
| Discard | `workspace.html` | Reject/discard asset | `discardAsset` | `/api/media/:id/reject` if media exists | Working | Keep. |
| Publish Now | `workspace.html` | Publish approved asset | `publishNow` | `/api/media/action` publish_now if media exists | Working | Keep. |
| Download | `workspace.html` | Download finished asset | anchor only appears with `downloadUrl` | direct URL | Working | Keep hidden until URL exists. |
| Logs | `workspace.html` | Open local logs drawer | `openDrawer` | local logs | Working | Keep; add backend run logs later. |
| Navigation section buttons | `app.js` | Switch legacy dashboard sections | data-section handler | local state | Working | Keep while migrating to routes. |
| Connect Sources | `app.js` | Check Shopify/Supabase status | data-connect-sources handler | `/status`, `/api/shopify/synced-products` | Working | Keep. |
| Generate Today's Ads / Generate Script / Generate | `app.js` | Generate campaign concepts/scripts | data-generate-ads handler | `/api/generate/marketing`, `/api/creatives` | Working if OpenAI/server configured | Keep; connect output to `draft`. |
| Workspace Mode dropdown | `app.js` | Change display complexity | data-workspace-mode handler | local state | Working UI mode only | Keep but label as display mode. |
| Show Advanced Options | `app.js` | Toggle advanced sections | data-toggle-advanced | local state | Working | Keep. |
| Simple product/style/length/audience pulldowns | `app.js` | Build simple creative brief | data-simple-* / data-brief | local state, product list | Working local | Keep; connect to script generation payload. |
| Review Output / Export Approved | `app.js` | Copy approved campaign pack | data-export-pack | clipboard/local generated creatives | Working | Keep as admin/export tool. |
| Send to provider / Canva Brief / Video Brief / Writer Brief | `app.js` | Export production briefs | data-tool-brief | clipboard/download | Working as brief export, not direct render | Keep but rename during migration to "Copy Brief" unless backend render submit is added. |
| Download Pack | `app.js` | Download markdown launch pack | data-download-pack | browser download | Working | Keep. |
| Schedule | `app.js` | Schedule approved creatives | data-schedule-approved | `/api/publishing/schedule-approved` | Working if approved creatives exist | Keep. |
| Refresh Products | `app.js` | Sync/load Shopify products | data-sync-products | `/sync/products`, `/api/shopify/synced-products` | Working if Shopify configured | Keep. |
| Autopilot mode buttons | `app.js` | Select automation mode | data-autopilot-mode | local state | Working display only | Keep but wire to `/api/office-agent/continuous` or label as mode selection. |
| Run Daily Agents | `app.js` | Run Office Agent workflow | data-run-autopilot | `/api/office-agent/run`, `/api/agents/runs` | Partially active; latest server restart required for run logs route | Keep and verify after restart. |
| Product cards/search/filter/Selected | `app.js` | Select/filter product inputs | data-product-* / data-select | product list | Working | Keep. |
| Viral ad rows/category/platform filters | `app.js` | Select/filter research example | data-ad / data-select | local `viralAds` | Working local/static | Keep but later connect to research scans. |
| Brand profile select/create/save/fields/logo | `app.js` | Manage brand config | data-brand-profile* | `/api/brand-profiles`, local storage | Working | Keep and migrate seed file to backend. |
| Creative approval toggle | `app.js` | Approve generated creative | data-approve | `/api/creatives/approval`, Supabase fallback | Working | Keep; align with review model. |
| Creative Export | `app.js` | Copy one creative | data-export | clipboard | Working | Keep. |
| Voice VP toggle, Speak, Run, quick commands | `app.js`, `voice-copilot.js` | Voice/text command control | voice handlers | `window.evicsActions`, `/api/agent/command`, `/api/office-agent/*` | Active | Keep and route into `/voice`/right rail. |
| Scanner settings/run/archive/export/retry/analytics/compliance/SMS controls | `app.js` media area | Media ops admin controls | `postMedia` handlers | `/api/scanner/*`, `/api/archive/*`, `/api/providers/export`, `/api/dispatch/retry`, `/api/analytics/record`, `/api/compliance/validate`, `/api/alerts/sms` | Active where rendered; some depend on config | Keep in admin/media ops, not primary workflow. |

## Backend Route Map

| Route | Method | Owner | Contract/Purpose |
|---|---|---|---|
| `/health` | GET | server | Basic server health. |
| `/status` | GET | server/connectors | Full connection status and evidence counts. |
| `/api/system/evidence` | GET | server | Audit/evidence summary. |
| `/config.js` | GET | server | Browser-safe config injection. |
| `/secret-vault` | GET | server | Admin credential UI. |
| `/api/secrets/status` | GET | server | Secret configuration status. |
| `/api/secrets/unlock` | POST | server | Unlock vault. |
| `/api/secrets/save` | POST | server | Save env values. |
| `/api/secrets/change-password` | POST | server | Change local vault password. |
| `/owner-ai` | GET | server | Owner engineering directive UI. |
| `/api/owner-ai/status` | GET | server | Owner AI status. |
| `/api/owner-ai/directives` | POST | server | Create owner directive. |
| `/api/owner-ai/list` | POST | server | List directives after password auth. |
| `/api/connections/status` | GET | server | Connector list. |
| `/api/office-agent/status` | GET | server | Office Agent state and connections. |
| `/api/office-agent/run` | POST | server | Run beginning-to-end automation. |
| `/api/office-agent/continuous` | POST | server | Enable/disable continuous automation. |
| `/api/media/state` | GET | media-ops | Full media state. |
| `/api/media-output/outputs` | GET | media-ops | Media Output Center records. |
| `/api/media-output/outputs/:id` | GET | media-ops | Single media output. |
| `/api/media` | GET | media-ops | Media list. |
| `/api/media/:id` | GET | media-ops | Single media record. |
| `/api/media/evidence` | GET | media-ops | Media evidence report. |
| `/api/media/playback/:id` | GET | server/media-ops | Playback evidence page with Buy Now CTA timing. |
| `/api/media/seed` | POST | media-ops | Seed demo media. Should be admin-only later. |
| `/api/media/mode` | POST | media-ops | Set operating mode. |
| `/api/media/create` | POST | media-ops | Create media record. |
| `/api/media/action` | POST | media-ops | Apply lifecycle/admin action: approve, reject, publish, archive, duplicate, etc. |
| `/api/media/:id/quality-check` | POST | quality-checker/media-ops | Run quality check and persist. |
| `/api/media/:id/approve` | POST | media-ops | Approve media. |
| `/api/media/:id/reject` | POST | media-ops | Reject/rework/discard media. |
| `/api/agent/command` | POST | agent-orchestrator | Create and execute command task. |
| `/api/agent/tasks` | GET | agent-orchestrator | List tasks. |
| `/api/agent/tasks/:id` | GET | agent-orchestrator | Get task. |
| `/api/agent/tasks/:id/retry` | POST | agent-orchestrator | Retry task. |
| `/api/agent/tasks/:id/cancel` | POST | agent-orchestrator | Cancel task. |
| `/api/render/:provider/submit` | POST | render-provider-router | Submit provider render. |
| `/api/render/:provider/status/:jobId` | GET | render-provider-router | Poll provider job. |
| `/api/render/:provider/callback` | POST | render-provider-router | Complete provider job with media URL. |
| `/api/render/jobs` | GET | render-provider-router | List and poll jobs. |
| `/api/storage/media` | GET | storage-router | Storage records and Google config. |
| `/api/scanner/settings` | POST | media-ops | Update scanner settings. |
| `/api/scanner/run` | POST | media-ops | Run scanner. |
| `/api/archive/run-due` | POST | media-ops | Archive due hot media. |
| `/api/providers/export` | POST | media-ops | Log provider export dispatch. |
| `/api/dispatch/retry` | POST | media-ops | Retry failed dispatches. |
| `/api/analytics/record` | POST | media-ops | Record media analytics. |
| `/api/compliance/validate` | POST | media-ops | Validate compliance. |
| `/api/alerts/sms` | POST | media-ops | Send/log SMS alert. |
| `/api/generate/marketing` | POST | server/OpenAI | Generate marketing assets. |
| `/api/brand-profiles` | GET/POST | server | Brand profile get/save. |
| `/sync/products` | GET | evics-connectors | Sync Shopify products. |
| `/sync/collections` | GET | evics-connectors | Sync Shopify collections. |
| `/api/shopify/synced-products` | GET | evics-connectors | Read synced products. |
| `/api/shopify/synced-collections` | GET | evics-connectors | Read synced collections. |
| `/api/creatives` | POST | evics-connectors | Save creatives. |
| `/api/creatives/approval` | POST | evics-connectors | Set creative approval. |
| `/api/publishing/schedule-approved` | POST | evics-connectors | Disabled for legacy creative bypass. Use `/api/media/action` after strict Render and Review. |
| `/api/agents/runs` | GET/POST | evics-connectors | Run history. Current running server may need restart to expose GET. |

## Original EVICS Workflow Connection Map

| Original Area | Existing Code Anchor | Pipeline Connection | Gap |
|---|---|---|---|
| Viral Intelligence | `app.js` Commercial Intelligence, `viralAds` | Research informs script/product matching | Needs persistent scan data route. |
| Product Viral Intelligence | `app.js` Product Library, Shopify sync routes | Product selection feeds script generation and media create | Working, needs direct strict-workflow handoff. |
| AI Reconstruction | `app.js` Campaign Builder/Founder Story/brief generation | Generated scripts should become `draft` assets | Partially connected; generated creative approval separate from media draft. |
| Video Generation | `workspace.html`, `render-provider-router.js`, `app.js` media/export | `queued -> rendering -> review_pending` | Provider credentials/endpoints needed for live auto completion. |
| Media Review & Approval | `workspace.html`, `app.js` Media Output Center | `review_pending -> approved/rework/discarded` | Working in strict workspace; legacy needs dedupe. |
| Published Media Gallery | `app.js` Media section, `/api/media/playback/:id` | `approved -> published`, CTA playback evidence | Active but should be a first-class `/published` surface. |
| Analytics Dashboard | `workspace.html` counts, `media-ops.recordAnalytics` | published outcome loop | Basic only; needs real KPIs. |
| Agent Orchestration Dashboard | `app.js` EVICS Command, `agent-orchestrator.js`, Office Agent routes | automation can create/render/review/log | Active but run logs need verified restart and UI health. |
| Elite Quality Rendering Standards | `quality-checker.js`, `/api/media/:id/quality-check` | quality gate before review/publish | Basic scoring only; needs richer visible standard. |

## Target Architecture

### Route Model

| Route | Purpose | Primary Owner |
|---|---|---|
| `/` | EVICS main shell / command landing | App shell |
| `/workflow` or `/workspace` | Strict Create -> Render -> Review -> Publish -> Insights | Workflow engine |
| `/research` | Viral Intelligence + Product Viral Intelligence | Research module |
| `/reconstruction` | AI Reconstruction, script generation, script scoring | Creation module |
| `/render` | Video Generation, provider dispatch, job monitor | Render module |
| `/review` | Media Review & Approval | Review module |
| `/published` | Published Media Gallery and playback evidence | Media module |
| `/insights` | Analytics Dashboard | Analytics module |
| `/agents` | Agent orchestration, worker health, run logs | Automation module |
| `/quality` | Elite Quality Rendering Standards | Quality module |
| `/admin` | Admin Command Center, brand, compliance, connections | Admin module |
| `/voice` | Voice Copilot and typed command surface | Command module |
| `/legacy-dashboard` | Temporary compatibility surface | Migration support |

### Ownership Model

| Domain | Owner File Today | Target Owner |
|---|---|---|
| Product and brand inputs | `app.js`, `brand-profile.js`, `evics-connectors.js` | backend brand/product service + UI modules |
| Script generation | `app.js`, `server.js /api/generate/marketing` | reconstruction service |
| Render dispatch | `render-provider-router.js` | provider service |
| Render callbacks | `render-provider-router.js`, `server.js` | provider callback service |
| Review decisions | `media-ops.js` | workflow state service |
| Publish actions | `media-ops.js`, `evics-connectors.js` | publish service |
| Analytics assembly | `media-ops.js` | insights service |
| Automation scheduling | `autonomous-worker.js`, Office Agent routes | automation service |
| Voice command routing | `voice-copilot.js`, `agent-orchestrator.js` | command service |
| Brand/compliance configuration | `brand-profile.js`, server brand routes, `media-ops` compliance | admin config service |

## Migration Plan

1. Keep `workspace.html` as the strict operational pipeline while full surfaces are recovered.
2. Preserve `index.html`/`app.js` as the Admin Command Center, not as trash or hidden clutter.
3. Convert visible legacy sections into explicit routes or route-like sections: research, reconstruction, render, review, published, insights, agents, quality, admin, voice.
4. Make all generated campaign scripts create backend `draft` media records instead of floating only in `creatives`.
5. Move brand seed data into `/api/brand-profiles` as the shared contract; keep `brand-profile.js` as compatibility seed.
6. Keep `supabase.js` only for read/admin compatibility; production writes should go through server routes.
7. Add backend route contracts for missing research scan persistence and quality standards retrieval.
8. Replace copy-only provider controls with either "Copy Brief" labels or real provider submission.
9. Add a worker/agent health section backed by `/api/office-agent/status`, `/api/agent/tasks`, and `/api/agents/runs`.
10. Retire `/legacy-dashboard` only after all original sections exist as purposeful recovered surfaces.

## Immediate Broken / Risk Items

- The running server on port 4175 may be stale after edits; `/api/agents/runs` returned 404 during audit even though the route exists on disk.
- `app.js` has many valid handlers, but several controls are local-only mode selectors or clipboard exports. They should be renamed or backed by real route actions.
- `app.js` generation now creates strict workflow media drafts through `/api/media/create`; `/api/creatives` also enforces this as a backend safety net.
- `supabase.js` remains compatibility-only; production generation and publishing paths are backend-first.
- Research data is mostly local/static (`viralAds`) and needs a real scan/intelligence persistence route.
- Quality standards are basic scoring only; "Elite Quality Rendering Standards" needs a visible, route-backed module.
- Provider auto-render completion depends on real provider API credentials/endpoints and returned media URLs.

## Validation Plan

| Suite | Starting State | Action | Expected Route | Expected State/UI | Evidence |
|---|---|---|---|---|---|
| Manual pipeline | No asset | Create script, send render, paste preview URL | `/api/media/create`, `/api/render/:provider/callback` if job exists | Review video appears only with URL | local logs, media state |
| Automated render | Queued asset and provider configured | Generate Video | `/api/render/:provider/submit`, `/api/render/jobs` | rendering then review_pending when URL returns | render jobs list |
| Provider callback | Existing job | POST callback with mediaUrl | `/api/render/:provider/callback` | media playback URL attached, quality saved | media audit events |
| Review approval | review_pending asset with previewUrl | Approve | `/api/media/:id/approve` | approved, visible in Publish | media state |
| Re-render/discard | review_pending asset | Request Re-render or Discard | `/api/media/:id/reject` | rework_requested or discarded | media audit events |
| Publish | approved asset | Publish Now | `/api/media/action` publish_now | published dispatch record | dispatches |
| Worker automation | server running | `npm run worker` or Office Agent run | `/api/office-agent/run` | run log saved | `agent-runs.local.json`, `/api/agents/runs` |
| Voice command | legacy/admin surface loaded | Type "submit HeyGen render" | `/api/agent/command`, `/api/render/heygen/submit` | task logged, render job created/config-blocked | agent tasks |
| Research to script | products loaded | Generate campaign | `/api/generate/marketing`, `/api/creatives` | generated creative visible | creatives/sync message |
| Brand influence | brand profile edited | Generate campaign | `/api/generate/marketing` | payload includes brand claims/voice | request payload/code review |
| Analytics | published asset | record analytics | `/api/analytics/record` | insights count/metrics update | media state analytics |

## Phase 2 Implementation Priority

1. Restart server and verify current route map.
2. Add a system recovery status page/endpoint that reports active modules, route health, and visible sections.
3. Wire `app.js` campaign generation to create strict workflow drafts.
4. Rename or disable copy-only provider controls so they do not look like direct renders.
5. Add `/api/research/scans` and `/api/quality/standards` local-first routes.
6. Build `/agents` or admin agent panel reading `/api/office-agent/status`, `/api/agent/tasks`, `/api/agents/runs`.
7. Add a control activation checklist file generated from selectors to keep future buttons honest.
