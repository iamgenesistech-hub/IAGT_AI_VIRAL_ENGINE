# EVICS Functional Audit

Audit date: 2026-06-02
Local target: `http://127.0.0.1:4175`

## Functional apps and services

- Shopify Store: connected
- Shopify Admin: connected
- Supabase: connected
- OpenAI: connected
- Canva: connected
- HeyGen: connected
- Runway: connected
- Kling: connected
- Office Agent: connected

## Not fully functional yet

- TikTok: missing `TIKTOK_CLIENT_SECRET`
- Meta: missing `META_APP_ID`
- Microsoft Workspace: credentials not configured
- Google Workspace: credentials not configured
- Twilio: credentials not configured
- CapCut: credentials not configured
- YouTube: credentials not configured
- Pinterest: credentials not configured

## Evidence of operation

### Core system

- `/status` returned `ok: true`
- `/api/connections/status` returned the connected services listed above
- `/api/office-agent/status` returned Office Agent connected, with Shopify, Supabase, and OpenAI available

### Product data

- `/api/shopify/synced-products` returned a live synced product payload from Shopify/Supabase
- Store domain in live status: `iamgenesistech.myshopify.com`

### Media and video evidence

- `/api/media/state` returned media registry state with created video records
- `/api/media/evidence` returned explicit evidence-mode media proving all three operating modes
- `/api/media/playback/:id` now returns a working EVICS playback/evidence page with:
  - product-linked `Buy Now` button
  - required two-line centered buyer message
  - provider status
  - audit trail
  - Google Workspace archive link when archived

Evidence-mode videos registered:

1. `Evidence automated Video`
   - mode: `automated`
   - file: `evidence-automated-video.mp4`
   - product URL present
   - buy-now label and message present

2. `Evidence auto_assist Video`
   - mode: `auto_assist`
   - file: `evidence-auto-assist-video.mp4`
   - playback URL present
   - Google Workspace archive link present
   - provider jobs ready for Canva, HeyGen, Runway, and Kling

3. `Evidence manual Video`
   - mode: `manual`
   - file: `evidence-manual-video.mp4`
   - playback URL present
   - Google Workspace archive link present
   - approved by `owner-admin`

Additional registered videos:

- `Wellness Founder Story Video`
- `Genesis Performance UGC Video`

### Scanner evidence

- Scanner enabled: `true`
- Continuous mode: `true`
- Scope: `all_outputs`
- Latest scanner run status observed: completed with findings

### Admin / copilot override evidence

Observed audit events include:

- `archive.override`
- `media.approve`
- `mode.changed`
- `provider.canva.queued`
- `provider.heygen.queued`
- `provider.runway.queued`
- `provider.kling.queued`

## Current limitation

The EVICS playback destination is now functional inside the build, and archived items correctly point to Google Workspace. What is still not proven here is binary final-video delivery from every external provider API. The provider side is now marked `ready_for_provider` where credentials exist, but the audit still stops short of confirming a completed remote mp4 render from Canva, HeyGen, Runway, or Kling.
