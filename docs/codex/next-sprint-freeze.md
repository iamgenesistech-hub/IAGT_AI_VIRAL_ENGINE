# Production Activation Freeze + Next Sprint

Last updated: 2026-08-09

## Frozen activation criteria
Production activation is considered fully complete only when all criteria below pass:
- Shopify reconnect approval completed by store owner for `iamgenesistech.myshopify.com`
- Primary Shopify session persisted and visible as connected
- HeyGen runtime credential is valid and account has usable credits
- One real HeyGen provider render completes and is recorded as evidence
- Final validation artifacts are regenerated with no app-side failures

## Decision freeze
- Until all activation criteria pass, status remains:
  - **GO for application-side readiness**
  - **External blockers prevent full-live claim**

## Next sprint selection (frozen)
- Selected next sprint: **Scalability Track — Phase 1 Integration & Deployment**
- Reason: queue-system code already exists and is the shortest path to measurable reliability/concurrency gains after activation blockers clear.

## Next sprint execution checklist
- Deploy/verify queue worker and queue routes in target runtime
- Verify async render flow (`QUEUED -> IN_PROGRESS -> COMPLETE`) end-to-end
- Verify queue stats and failure retry behavior in runtime
- Run `npm test` and `node tests/media-gallery-routes-validation.js`
- Capture and store updated evidence after successful integration
