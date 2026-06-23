# EVICS API Keys And Secrets Checklist

Use this checklist to gather the keys that make the build fully functional. The easiest path is:

1. Fill in `.env.example`.
2. Save it as `.env`.
3. Start EVICS again.
4. The server will mirror filled values into the local vault file automatically.

## Already present in the current local .env

- Shopify store domain
- Shopify public store domain
- Shopify API version
- Shopify client ID
- Shopify client secret
- Shopify Admin access token
- Shopify OAuth access token
- ngrok authtoken
- Supabase URL
- Supabase anon key
- Supabase service role key
- EVICS alert phone
- Secret vault password

These values already live in the active local build. I am not repeating the raw secret values here.

## Still missing if you want more of the build activated now

- `OPENAI_API_KEY`
  Enables OpenAI generation and owner AI planning.

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE`
- `TWILIO_MESSAGING_SERVICE_SID`

## Optional render and workflow providers

- `CANVA_API_KEY`
- `HEYGEN_API_KEY`
- `RUNWAY_API_KEY`
- `CAPCUT_API_KEY`
- `KLING_API_KEY`

## Optional publishing and channel keys

- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `META_APP_ID`
- `META_APP_SECRET`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `PINTEREST_APP_ID`
- `PINTEREST_APP_SECRET`

## Optional workspace integrations

- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_USER_EMAIL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_OWNER_EMAIL`

## Optional alerts and automation

- `EVICS_AGENT_TOKEN`
- `EVICS_AUTONOMY_ENABLED`
- `EVICS_AUTONOMY_INTERVAL_MINUTES`
- `EVICS_AUTONOMY_MAX_PRODUCTS`
