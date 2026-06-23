# EVIE Commercial Intelligence Setup

If `http://localhost:4175` says site cannot be reached, the app server is not running.

## Easiest Windows Start

1. Double-click `START_DASHBOARD.bat`.
2. Keep that black terminal window open.
3. Open `http://localhost:4175`.

## VS Code Start

1. Open this folder in VS Code.
2. Go to `Terminal > New Terminal`.
3. Run:

```powershell
$env:PORT=4175
npm start
```

4. Keep that terminal open.
5. Open `http://localhost:4175`.

## Ngrok

Start the dashboard first. Then either double-click `START_NGROK.bat`, or open a second VS Code terminal and run:

```powershell
ngrok --config ngrok.local.yml http --domain=lint-salon-breeding.ngrok-free.dev 4175
```

Copy the `https://...ngrok-free.dev` forwarding URL.
That URL should be the Shopify app entry point while you are running locally.

## Supabase

Supabase is the live data layer for this build. The repo now includes the setup files the app expects:

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Run `supabase/seed.sql` if you want starter viral ads and workflow rows.
3. Keep the browser keys in `config.js`.
4. Keep server-side secrets in `.env` or the Secret Vault.

## White-Label Brand Profile

Default brand values live in `brand-profile.js`. Update that file to rebrand EVIE for another ecommerce company without changing the core dashboard code.

Configurable values include company name, public brand name, store URL, Shopify store handle, brand colors, founder story, mission, approved claims, restricted claims, disclaimers, CTAs, visual styles, voiceover styles, render provider, and export formats.

## Shopify

Shopify secrets and admin tokens must stay server-side. Do not put them in `config.js`.

To sync real store products:

1. Create a private `.env` file from `.env.example`.
2. Add `SHOPIFY_ADMIN_ACCESS_TOKEN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
3. Run `npm run sync:shopify`, or use the VS Code task `EVIE: Sync Shopify Products`.
4. Start the dashboard with `npm start`.
5. Open `http://localhost:4175` and refresh.

The Product Matching panel reads synced Shopify products from Supabase through `/api/shopify/synced-products`.

## Sync Source Of Truth

For this phase of the build, keep the stack aligned this way:

1. VS Code local folder is the working source of truth.
2. GitHub stores the current code snapshot and update history.
3. Supabase stores synced products, creatives, queue items, and workflow data.
4. Railway is optional and can stay out of the loop until you want hosted deployment again.

See `SYNC_STACK.md` for the exact update flow.

## Backup Security and Cloud Upload

The backup engine now uses AES-256-GCM encryption and can upload encrypted artifacts to Google Cloud Storage.

Set these environment variables for production:

```powershell
$env:BACKUP_ENCRYPTION_KEY_B64 = "<base64-encoded-32-byte-key>"
$env:BACKUP_GCS_BUCKET = "your-backup-bucket"
```

Optional fallback:

```powershell
$env:BACKUP_ENCRYPTION_KEY = "long-secret-passphrase"
```

If no key is provided, EVICS creates `.backup-key.local` for local development only.
If no bucket is provided, backups stay local with `local_only` upload status.

## Smoke Test Report

Run the end-to-end elite pipeline smoke test:

```powershell
npm run smoke:elite
```

Reports are written to `work/smoke-reports/` as both JSON and Markdown.
