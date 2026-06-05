# Remediation Log

- Added shared EVICS + EVIE core contracts, canonical IDs, ranking, prompt forge, script generation, render jobs, compliance flags, and wisdom memory.
- Added Copilot parent orchestration route with child-agent routing and decision logging.
- Added mocked/internal render provider path returning a playable MP4 evidence URL.
- Added production closeout diagnostics for Shopify, Supabase, and HeyGen.
- Fixed render logging against the existing legacy evics_renders schema while preserving the forward migration path.
- Documented live HeyGen blocker when HEYGEN_API_KEY is missing or unavailable.
- Verified Shopify reconnect is app-side ready but requires store owner authorization because the current Admin token is rejected.
- Verified Shopify reconnect routes to the primary store OAuth authorization page and records the active client fingerprint without exposing secrets.
- Verified Supabase shared tables and legacy render evidence logging are ready.
- Verified live HeyGen proof is blocked only by the missing HEYGEN_API_KEY credential.
