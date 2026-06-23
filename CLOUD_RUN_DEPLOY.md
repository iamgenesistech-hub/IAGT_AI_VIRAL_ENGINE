# EVICS Cloud Run Deployment

The deployed Cloud Run root must serve `workspace.html`, which is now the Elite Executive Workspace.

Use this from the repaired build folder:

```powershell
gcloud run deploy evics-api --source . --region us-central1 --allow-unauthenticated
```

This build includes a `.gcloudignore` so `package-lock.json`, `workspace.html`, `server.js`, and the Cloud Run `Dockerfile` are included while local secrets and state files are excluded.

The service should preserve existing Cloud Run environment variables unless you explicitly change them.
Confirm these are set in Cloud Run:

- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_PUBLIC_STORE_DOMAIN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

After deploy, verify:

```powershell
curl https://evics-api-480958062306.us-central1.run.app/
curl https://evics-api-480958062306.us-central1.run.app/status
curl https://evics-api-480958062306.us-central1.run.app/workspace
```
