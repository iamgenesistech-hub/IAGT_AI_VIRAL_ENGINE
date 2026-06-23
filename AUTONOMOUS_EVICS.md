# EVICS Autonomous Operating System

## Elite Architecture

EVICS now has three automation layers:

1. Browser Copilot
   - Accepts typed or spoken owner directives.
   - Starts Office Agent workflows.
   - Opens protected owner/admin areas.

2. Server-side Office/Twin Agent
   - Runs inside `server.js`.
   - Syncs Shopify products.
   - Loads synced product memory from Supabase.
   - Generates EVICS/EVIE campaign concepts.
   - Saves creatives.
   - Schedules approved concepts.
   - Logs run history and review items.

3. External Autonomous Worker
   - Runs with `npm run worker`.
   - Calls the Office Agent on a recurring interval.
   - Best used as a separate Railway worker service for always-on automation.

## Recommended Railway Setup

Use two Railway services from the same repo:

- Web service: `npm start`
- Worker service: `npm run worker`

Required worker environment:

```text
EVICS_BASE_URL=https://your-evics-web-service.up.railway.app
EVICS_AUTONOMY_INTERVAL_MINUTES=60
EVICS_AUTONOMY_MAX_PRODUCTS=5
EVICS_AGENT_TOKEN=your-private-agent-token
```

Optional web environment:

```text
EVICS_AUTONOMY_ENABLED=true
EVICS_AUTONOMY_INTERVAL_MINUTES=60
EVICS_AUTONOMY_MAX_PRODUCTS=5
EVICS_AGENT_TOKEN=your-private-agent-token
```

Use either the separate worker service or web auto-start. The separate worker service is cleaner and more elite for production.

## Workspace Integrations

The vault now tracks placeholders for:

- Microsoft Workspace: tenant ID, client ID, client secret, user email
- Google Workspace: client ID, client secret, refresh token, owner email
- Shopify
- Supabase
- OpenAI

Until Microsoft and Google credentials are connected, the Office Agent records them as review items instead of pretending they are operational.

## Failsafe Rules

Owner AI engineering directives are documented with:

- Checkpoint
- Files likely touched
- Tests to run
- Rollback plan
- Push gate
- Security controls

No master/main push should happen until local checks and browser workflow checks pass.
