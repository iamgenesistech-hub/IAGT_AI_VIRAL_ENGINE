# Phase 10a - Shopify Closeout

## Checks Performed
- Verified primary store target: `iamgenesistech.myshopify.com`.
- Verified reconnect route: `/shopify/reconnect`.
- Verified redirect target: `https://iamgenesistech.myshopify.com/admin/oauth/authorize`.
- Verified callback route: `/auth/callback`.
- Verified callback rejects non-primary stores.
- Verified HMAC validation is present before token exchange.
- Verified successful token exchange stores an offline session in `shopify_sessions`.
- Verified dashboard Live Ops includes the Shopify reconnect link.
- Verified diagnostics do not expose full secrets and only show fingerprints.

## Current Result
- App-side reconnect flow is ready.
- OAuth prerequisites are present: client ID, client secret, host, scopes, callback path.
- The active client fingerprint is recorded in evidence as `298faa...7e5f`.
- Current Admin token is rejected by Shopify with `401`.
- No primary Supabase session exists yet for `iamgenesistech.myshopify.com`.

## External Requirement
- The store owner/operator must open `/shopify/reconnect` and approve/install the app for `iamgenesistech.myshopify.com`.
- After approval, Shopify should return to `/auth/callback` and EVICS will store the offline session.

## Verdict
- Shopify closeout is GO for app-side readiness.
- Live store access remains externally blocked until owner OAuth approval completes.
