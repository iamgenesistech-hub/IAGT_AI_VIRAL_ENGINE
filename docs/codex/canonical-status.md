# Canonical Status (Single Source of Truth)

Last updated: 2026-08-09
Owner: EVICS closeout workflow

## Purpose
- This file is the authoritative status source for closeout decisions.
- If any other status/evidence doc conflicts with this file, treat this file + latest validation artifacts as truth.

## Authoritative precedence
1. `/home/runner/work/IAGT_AI_VIRAL_ENGINE/IAGT_AI_VIRAL_ENGINE/evidence/final-validation/validation-summary.json`
2. `/home/runner/work/IAGT_AI_VIRAL_ENGINE/IAGT_AI_VIRAL_ENGINE/evidence/final-validation/validation-summary.md`
3. This file
4. Legacy progress/readiness notes in `/docs/codex/*` and `/docs/codex/progress/*`

## Current phase + sprint position
- Delivery phase: **Phase 10 (Production Closeout / Activation Verification)**
- Sprint track status:
  - Codex track: **Phase 10 closeout active**
  - Scalability track: **Phase 1 code complete; integration/deployment pending**

## Current system state
- App-side EVICS + EVIE flow: **ready**
- Supabase runtime checks: **ready when environment connectivity is valid**
- Shopify live activation: **externally blocked until owner OAuth reconnect is completed**
- HeyGen live provider activation: **externally blocked until credential/credits/provider artifact success are confirmed**

## Step A–E execution status
- Step A (single source of truth + stale policy): **complete**
- Step B (Shopify reconnect + session confirmation): **app-side complete; external owner approval required**
- Step C (HeyGen live capability + real provider proof): **app-side complete; external provider/account action required**
- Step D (rerun validation + refresh evidence): **complete whenever `npm test` is run and artifacts are regenerated**
- Step E (freeze activation criteria + next sprint decision): **complete in `/docs/codex/next-sprint-freeze.md`**

## Activation gate (must all be true for full-live claim)
- Shopify reconnect approved by store owner for `iamgenesistech.myshopify.com`
- Shopify primary session confirmed active after reconnect
- HeyGen account/key/credits valid in runtime
- At least one completed live HeyGen provider artifact recorded
- Validation summary verdict is `pass` or `pass-with-external-blockers` with no unresolved app-side blocker

## Stale/conflicting evidence policy
- Documents that contain narrative status claims may become stale.
- Before any release decision, regenerate final validation evidence and update this canonical file if status changed.
- Legacy docs are informational only unless aligned with latest final-validation artifacts.
