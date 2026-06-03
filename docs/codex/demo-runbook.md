# EVICS + EVIE Demo Runbook

## Local URLs
- Main dashboard: http://localhost:4173/
- Live Ops: http://localhost:4173/live-ops
- EVICS + EVIE health: http://localhost:4173/api/evics-evie/health
- Contracts: http://localhost:4173/api/evics-evie/contracts
- Evidence video: http://localhost:4173/generated/evics-sea-moss-proof-render.mp4

## Demo Flow
1. Open Live Ops and confirm the proof video plays with audio.
2. Run Start Scan to refresh product viral memory.
3. Call /api/evics-evie/rankings to show shared ranking.
4. Call /api/evics-evie/prompt-forge to show prompt and script lineage.
5. Call /api/copilot/orchestrate with a faceless EVIE directive.
6. Open /evidence/final-validation/validation-summary.md after validation completes.

## External Setup
- Reconnect Shopify at /shopify/reconnect for iamgenesistech.myshopify.com.
- Supabase shared tables are currently reachable. Keep /database/evics_evie_shared_schema.sql and /database/evics_dashboard_schema.sql as the forward migration source for future environments.
- Add HEYGEN_API_KEY for live video provider verification.
