# Shopify + HeyGen Activation Runbook (Steps B-C)

Last updated: 2026-08-09

## Scope
This runbook covers the remaining external activation steps required to move from app-side ready to fully live.

## Step B — Shopify reconnect and session confirmation
1. Open:
   - `http://localhost:4175/shopify/reconnect`
2. Complete store-owner OAuth approval for:
   - `iamgenesistech.myshopify.com`
3. Verify diagnostics:
   - `GET /api/shopify/diagnostics`
4. Confirmation target:
   - `primary.ok = true`
   - `primarySession.ok = true`
   - `oauthReady = true`

If these are not true after reconnect, keep status as externally blocked.

## Step C — HeyGen live provider readiness + proof
1. Verify account status:
   - `GET /api/heygen/account-status`
2. Confirm:
   - connected = true
   - usable credits available
3. Trigger one real provider render via the existing video route with platform `heygen`.
4. Confirm closeout evidence:
   - `GET /api/production-closeout/status`
   - `checks.heygen.liveProofAvailable = true`
   - `checks.heygen.proof` contains provider artifact metadata

If live proof is absent, keep status as externally blocked.

## Post-activation
After Steps B and C are complete:
- Run `npm test`
- Confirm updated `evidence/final-validation/*`
- Update `/docs/codex/canonical-status.md` if state changed
