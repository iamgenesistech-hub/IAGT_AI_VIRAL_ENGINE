# Phase 05 - Prompt Forge, Script, Render

## Summary
- Added prompt version creation, script creation, quality gate scoring, compliance checks, render job abstraction, mocked render mode, and live HeyGen blocker reporting.
- Connected render lineage from ranking to prompt to script to render job.

## Files Changed
- /backend/sharedEvicsEvieCore.js
- /backend/server.js
- /backend/internalVideoRenderer.js

## Verification
- Validation covers prompt forge, script generation, mocked render provider, quality gates, compliance, and proof video URL.

## Blockers
- Live HeyGen requires a valid HEYGEN_API_KEY.
- Local Node child-process spawn is restricted on this machine, so FFmpeg generation is performed outside the server and the server returns the verified proof MP4 fallback.
