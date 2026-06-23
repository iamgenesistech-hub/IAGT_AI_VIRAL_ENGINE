# EVICS Agent Instructions

EVICS ("EVIE Commercial Intelligence System") is a Node.js + Next.js AI-powered ecommerce intelligence dashboard. It runs a custom Express API (`server.js`) alongside a Next.js shell (`app/`), with a VP Copilot, autonomous worker agents, HeyGen video render pipeline, Shopify/Supabase integration, and an affiliate engine.

## Architecture

| Layer | Entry Point | Purpose |
|---|---|---|
| Express API | `server.js` | All `/api/*` routes, brand profile, agent endpoints, scanner |
| Next.js shell | `app/` | React frontend pages / executive workspace |
| Legacy UI | `workspace.html`, `public/legacy/workspace.html` | Operator surfaces (19 stage renderers) |
| Agent orchestrator | `agent-orchestrator.js` | Schedules and sequences agent tasks |
| Autonomous worker | `autonomous-worker.js` | External recurring Office Agent calls |
| VP Copilot | `voice-copilot.js` | Voice/text executive directive engine |
| Media ops | `media-ops.js`, `render-provider-router.js`, `render-provider-adapters.js` | Video render pipeline |
| Affiliate engine | `affiliate-engine.js`, `affiliate-notifications.js` | Affiliate/supplier management |
| Agent contracts | `agent-contract-registry.js`, `agent-evaluator.js`, `agent-contract.schema.json` | Formal agent handoff contracts |

### Key supporting modules

- `brand-profile.js` — white-label brand values (edit to rebrand without touching core logic)
- `evics-persistence.js` — local JSON persistence layer
- `product-intelligence.js` — product scanner and intel scoring
- `quality-checker.js` — elite quality gate (`quality_status=Approved` + `quality_score>=82` required before approve/publish)
- `backup-and-recovery.js` — AES-256-GCM encrypted backups, optional GCS upload
- `config.js` / `config.example.js` — browser-safe config only (no secrets)
- `supabase.js`, `sync-shopify-products.js` — live data layer and Shopify sync

## Commands

```powershell
npm start                    # Start Express API on port 8080 (or $env:PORT)
npm run start:stable         # Start on first free port from EVICS_PORT_CANDIDATES (prefers 8081)
npm run dev                  # Next.js dev server on port 4176
npm run build                # Next.js production build
npm run doctor               # Runtime diagnostics (Shopify, provider preflights, render totals)
npm run doctor:reset-auth    # Reset cached auth state then diagnose
npm test                     # Syntax-check server.js + key agent files + codex self-test
npm run codex:check          # Syntax-check agent-orchestrator.js, autonomous-worker.js, app.js, agent-event-bus.js
npm run smoke:elite          # Elite pipeline smoke test
```

Always run `npm test` after editing server-side JS files. It is fast and catches parse errors before runtime.

## Port behaviour

- Default port: **8080**. Auto-binds to **8081** if 8080 is occupied.
- Local validation should probe **both** 8080 and 8081.
- `start:stable` reads `EVICS_PORT_CANDIDATES` env var (comma-separated) to pick the first free port.

## Windows startup (canonical workflow)

Desktop shortcuts are the primary launcher. Batch scripts create them:

| Script | What it launches |
|---|---|
| `CREATE_EVICS_ELITE_PORTS_SHORTCUT.bat` | Runs `START_EVICS_ELITE_LOCAL_PORTS.bat` → opens workspace + Shopify health + dev access |
| `CREATE_EVICS_RUNTIME_DOCTOR_SHORTCUT.bat` | Runs `RUN_EVICS_RUNTIME_DOCTOR.bat` → one-click diagnostics |
| `CREATE_EVICS_DESKTOP_SHORTCUT.bat` | Basic localhost launcher |
| `EVICS-LAUNCH.bat` / `EVICS-RESTART.bat` / `EVICS-STOP.bat` | Direct process control |

Run `START_EVICS_ELITE_LOCAL_PORTS.bat` (or the shortcut) for the recommended full-stack startup.

## Environment and secrets

- Copy `.env.example` → `.env` and fill in secrets. Never commit `.env`.
- Browser-safe values go in `config.js` only. Shopify tokens and service-role keys must stay server-side (`.env` or Google Secret Manager).
- See [`API_KEYS_CHECKLIST.md`](API_KEYS_CHECKLIST.md) for the full list of required keys.
- Cloud secrets: `npm run start:cloud-secrets` loads from GCP Secret Manager via `scripts/start-with-cloud-secrets.ps1`.
- `HEYGEN_AVATAR_ID` must be the Secret Manager value `Avatar-Identity-ID` (not a placeholder) or renders will fail even if auth passes.

## Agent and event system

- Agent events: `POST /api/agents/events`, `GET /api/agents/timeline`
- Event signatures are unsigned unless one of `EVICS_AGENT_EVENT_SECRET`, `EVICS_AGENT_TOKEN`, or `TWIN_AGENT_API_KEY` is set.
- Windows `curl` tip: POST JSON files as ASCII/UTF-8-no-BOM — BOM-encoded files cause false `type and lifecycle are required` parse failures.
- Formal contract schema: [`agent-contract.schema.json`](agent-contract.schema.json); runtime registry: `agent-contract-registry.js`; evaluator gate: `agent-evaluator.js`.
- Handoff contracts: `GET /api/agents/contracts/handoffs`; policy profiles: `GET /api/agents/contracts/policies`

## Elite quality gate

Before approving or publishing any media asset, the quality gate must pass:
- `quality_status === "Approved"` AND `quality_score >= 82`
- Run `GET /api/media/:id/quality-check` before calling approve/publish endpoints.
- Frontend auto-approval was removed — completed renders route to review with explicit gate status.

## Render pipeline

- Always call `GET /api/render/:provider/preflight` before submitting a render.
- 401/403 responses cache as `PROVIDER_AUTH_FAILED` and block preflight readiness.
- Submit/poll failures after auth errors are non-retryable.
- VP mission orchestration: `POST /api/agents/vp-mission`, `GET /api/agents/vp-mission/:missionId`
- Evidence export: `GET /api/agents/vp-mission/:missionId/evidence-export` (JSON or `?format=html`)

## Local state files (`.local.json`)

Files ending in `.local.json` (e.g., `evics-pipeline-state.local.json`, `viral-products.local.json`) are runtime cache/state — not source of truth. Do not commit them; they are gitignored.

## Product catalog

- `GET /api/media/products` is the reliable catalog endpoint.
- `POST /api/media/products` can return Not Found in this runtime — prefer GET.
- Supplier scan: `POST /api/affiliate/workspace/products/scan-suppliers`

## Workspace UI stages

The unified shell (`workspace.html`) has 19 operator stages. Admin/ops view toggle gates visibility. The Next.js shell (`app/`) is the future command center but its `lib/actions.ts` are thin local contracts not yet backed by persistent APIs — do not treat Next actions as production data.

## Deployment

- Railway: web service `npm start`, worker service `npm run worker`. See [`DEPLOYMENT.md`](DEPLOYMENT.md) and [`AUTONOMOUS_EVICS.md`](AUTONOMOUS_EVICS.md).
- Docker: `Dockerfile` + `.dockerignore` present.
- Cloud Run: see [`CLOUD_RUN_DEPLOY.md`](CLOUD_RUN_DEPLOY.md).
- Shopify app routes: `GET /shopify/app`, `GET /api/shopify/app-health`, `GET /api/shopify/app-proxy` (signature required).

## Conventions

- `commonjs` modules only (`"type": "commonjs"` in package.json). Do not use ESM `import` in server-side files.
- `server.js` is the single Express entry point. New API routes go here; never split into separate route files without explicit instruction.
- Data writes to `.local.json` files must go through `evics-persistence.js`, not raw `fs` writes.
- Governance: equal-weight committee model at `GET /api/governance/investment-principles` (legacy alias `GET /api/governance/buffett-principles`). Warren-weighted model was removed.
- Scanner controls: `POST /api/scanner/settings` triggers a real backend reschedule — not a display-only update.
