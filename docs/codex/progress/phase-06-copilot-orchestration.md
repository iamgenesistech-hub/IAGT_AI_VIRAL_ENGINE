# Phase 06 - Copilot Orchestration

## Summary
- Added /api/copilot/orchestrate as the parent Copilot route.
- Copilot routes EVICS vs EVIE tasks, invokes child-agent stages, logs orchestration decisions, explains ranking/prompt/render results, and remains the final responder layer.

## Files Changed
- /backend/sharedEvicsEvieCore.js
- /backend/evicsEvieRoutes.js

## Verification
- Validation checks that Copilot is the final responder and that EVIE faceless routing works.

## Blockers
- Microsoft 365 Copilot itself is external; this local app exposes the orchestration contract and evidence layer for it.
