# EVICS Stack Sync

This build is now organized around three active systems:

1. `VS Code / local build`
   This is the source of truth for code, UI, server logic, local vault files, and batch launchers.

2. `GitHub`
   This is the shared backup and version-history layer for the codebase.

3. `Supabase`
   This is the live data layer for synced Shopify products, creatives, publishing queue items, and workflow history.

Railway is optional for now and does not need to be part of the daily update loop.

## Normal Update Flow

1. Make build changes in the local EVICS folder.
2. Test locally at `http://localhost:4175`.
3. Run `npm run check`.
4. If Shopify data changed, run `npm run sync:shopify`.
5. Commit and push the updated code to GitHub.
6. Keep Supabase schema in sync with `supabase/schema.sql`.

## What Lives Where

- `config.js`
  Browser-safe Supabase URL and anon key only.

- `.env`
  Private server-side secrets for Shopify, Supabase service role, OpenAI, alerts, and admin access.

- `secrets-vault.local.json`
  Local vault mirror of private credentials used by the Secret Vault page.

- `supabase/schema.sql`
  Database structure for EVICS tables.

- `supabase/seed.sql`
  Optional starter rows for the dashboard.

## Current Direction

- Use local EVICS plus GitHub plus Supabase as the stable operating stack.
- Keep Shopify connected through the local app and Supabase sync.
- Reintroduce Railway only when hosting and credits are no longer a blocker.
