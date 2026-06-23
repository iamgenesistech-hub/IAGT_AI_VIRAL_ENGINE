# EVICS Production Hosting Checklist

Use production hosting only when you want EVICS online without relying on the local computer, the dashboard window, or ngrok. Until then, the active stack can stay `VS Code + GitHub + Supabase`.

## Recommended First Deployment

Use a Node web service on Render, Railway, or another host that supports:

- `npm install`
- `npm start`
- an assigned HTTPS URL
- environment variables
- health checks

The app already reads `PORT`, so the hosting provider can assign the port.

If Railway credits or errors are getting in the way, pause Railway and keep the build synced locally plus GitHub plus Supabase first.

## Required Environment Variables

Set these in the host dashboard:

```text
SHOPIFY_STORE_DOMAIN=
SHOPIFY_PUBLIC_STORE_DOMAIN=
SHOPIFY_API_VERSION=2026-04
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_ADMIN_ACCESS_TOKEN=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EVICS_ALERT_PHONE=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_PHONE=
TWILIO_MESSAGING_SERVICE_SID=
```

Leave Twilio values blank until SMS alerts are ready.

## Shopify App URLs

After deployment, replace ngrok URLs in Shopify with the hosted URL.

```text
App URL:
https://YOUR-PRODUCTION-DOMAIN

Redirect URLs:
https://YOUR-PRODUCTION-DOMAIN/auth/callback
https://YOUR-PRODUCTION-DOMAIN/api/auth/callback
```

## Health Checks

Use:

```text
/status
```

Expected response includes:

```json
{
  "ok": true,
  "shopifyConfigured": true,
  "supabaseConfigured": true
}
```

## After Deployment

1. Update Shopify App URL and Redirect URLs.
2. Run the Shopify OAuth install/update flow once.
3. Open `/sync/products`.
4. Confirm products sync.
5. Open `/` and run EVICS Autopilot.
