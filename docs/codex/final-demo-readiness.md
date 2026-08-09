# Final Demo Readiness

> Status note: This document is historical context. Canonical source of truth is `/home/runner/work/IAGT_AI_VIRAL_ENGINE/IAGT_AI_VIRAL_ENGINE/docs/codex/canonical-status.md` plus latest `/home/runner/work/IAGT_AI_VIRAL_ENGINE/IAGT_AI_VIRAL_ENGINE/evidence/final-validation/validation-summary.json`.

## Ready Locally
- EVICS boots on localhost:4175.
- Shared EVICS + EVIE APIs are available.
- Ranking, faceless selection, prompt forge, script generation, mocked render, compliance checks, Copilot orchestration, and wisdom memory run locally.
- Playable MP4 evidence exists at /generated/evics-sea-moss-proof-render.mp4.
- Supabase shared EVICS + EVIE tables are reachable.
- Legacy evics_renders logging is app-side fixed and accepts render evidence rows.
- Shopify reconnect route is app-side ready at /shopify/reconnect.

## Not Fully Live Yet
- Shopify live product feed is blocked until OAuth reconnect is approved for iamgenesistech.myshopify.com. Current Admin token is rejected by Shopify with 401 and no primary Supabase session exists.
- HeyGen key is configured and a live job was submitted. HeyGen failed the job because the account has insufficient API credits.

## Demo Verdict
- Local demo is ready for mocked/internal provider proof.
- Production-closeout decision is GO for application-side readiness with external-only blockers documented.
- Production live operation still requires Shopify owner authorization and HeyGen API credits. Supabase app-side closeout is resolved.
- Activation verdict: System is production-ready pending external provider credits and Shopify authorization.
