# Deployment Checklist

Complete step-by-step guide to deploy IAGT_AI_VIRAL_ENGINE to production.

---

## Phase 1: Pre-Deployment Code Review

- [ ] PR #3 reviewed and approved
  - [ ] Verify changes don't break existing DB queries
  - [ ] Test with limit=300 locally
  
- [ ] PR #5 reviewed and approved
  - [ ] Verify static file serving works
  - [ ] Test dashboard loads at `/`
  
- [ ] PR #6 reviewed and approved
  - [ ] All 6 agent modules have valid syntax
  - [ ] Supabase connector properly imported
  - [ ] Error handling in place
  
- [ ] PR #7 reviewed and approved
  - [ ] Dashboard buttons wire to correct endpoints
  - [ ] Copilot panel UI renders correctly
  - [ ] Auto-generate pipeline shows progress

---

## Phase 2: Code Merging

- [ ] **Merge PR #3** (product sync limit)
  ```bash
  git checkout main
  git pull origin main
  git merge --no-ff origin/railway/code-change-2iPXUR
  git push origin main
  ```

- [ ] **Merge PR #5** (dashboard static serving)
  ```bash
  git merge --no-ff origin/railway/code-change-HWfqy-
  git push origin main
  ```

- [ ] **Merge PR #6** (agent system)
  ```bash
  git merge --no-ff origin/railway/code-change-Qv9T7V
  git push origin main
  ```

- [ ] **Merge PR #7** (dashboard wiring)
  ```bash
  git merge --no-ff origin/railway/code-change-BFarEi
  git push origin main
  ```

- [ ] Verify all merges succeeded
  - [ ] No merge conflicts
  - [ ] CI checks pass (if configured)
  - [ ] Railway auto-deployment triggered

---

## Phase 3: Database Setup

### Supabase Tables

- [ ] **evics_trends** table exists
  ```sql
  CREATE TABLE evics_trends (
    id BIGSERIAL PRIMARY KEY,
    title TEXT,
    hook TEXT,
    platform TEXT,
    category TEXT,
    confidence TEXT,
    viral_score INTEGER,
    emotion TEXT,
    structure TEXT,
    action TEXT,
    source TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **evics_products** table exists
  ```sql
  CREATE TABLE evics_products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE,
    category TEXT,
    sku TEXT,
    score INTEGER,
    angle TEXT,
    goals TEXT[],
    benefits TEXT[],
    is_bundle BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **creatives** table exists
  ```sql
  CREATE TABLE creatives (
    id BIGSERIAL PRIMARY KEY,
    status TEXT,
    product TEXT,
    format TEXT,
    hook TEXT,
    script TEXT,
    asset TEXT,
    channel TEXT,
    score INTEGER,
    approved BOOLEAN,
    source TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **evics_renders** table exists
  ```sql
  CREATE TABLE evics_renders (
    id BIGSERIAL PRIMARY KEY,
    platform TEXT,
    status TEXT,
    job_id TEXT,
    video_url TEXT,
    script TEXT,
    parameters JSONB,
    source TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **shopify_products** table exists
- [ ] **shopify_collections** table exists

- [ ] Test Supabase connection
  ```bash
  curl -X GET "https://your-supabase.supabase.co/rest/v1/evics_trends?limit=1" \
    -H "apikey: your-key" \
    -H "Authorization: Bearer your-key"
  ```

---

## Phase 4: Environment Variables (Railway)

Set these in Railway dashboard > Environment:

**Core**
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3000`

**Supabase**
- [ ] `SUPABASE_URL` = your Supabase URL
- [ ] `SUPABASE_KEY` = your Supabase public key
- [ ] `SUPABASE_ROLE` = `authenticated` or `anon`

**OpenAI (Optional - for full Copilot power)**
- [ ] `OPENAI_API_KEY` = `sk-...` (optional)
- [ ] `OPENAI_API_BASE` = (optional, defaults to OpenAI)

**Azure OpenAI (Optional - alternative to OpenAI)**
- [ ] `AZURE_OPENAI_KEY` = (optional)
- [ ] `AZURE_OPENAI_ENDPOINT` = (optional)
- [ ] `AZURE_OPENAI_DEPLOYMENT` = (optional)

**Shopify (Optional - for product sync)**
- [ ] `SHOPIFY_STORE` = your-store.myshopify.com
- [ ] `SHOPIFY_ACCESS_TOKEN` = (optional)

**Testing**
- [ ] Verify all env vars are set
  ```bash
  curl -X GET "https://your-railway-url/api/agents/status"
  # Should return agent system status
  ```

---

## Phase 5: Railway Deployment

- [ ] Repository is connected to Railway
- [ ] Auto-deploy on `main` push is enabled
- [ ] Build log shows no errors
  ```
  ✓ Build successful
  ✓ Dependencies installed
  ✓ Server starting on port 3000
  ```

- [ ] Health check endpoint working
  ```bash
  curl -X GET "https://your-railway-url/status"
  # Should return HTTP 200
  ```

- [ ] Logs show no critical errors
  ```
  ✓ EVICS backend running at https://your-railway-url
  ✓ Agents operational
  ✓ Supabase connected
  ```

---

## Phase 6: Agent Endpoint Testing

### 1. Agent Status
- [ ] Test endpoint
  ```bash
  curl -X GET "https://your-railway-url/api/agents/status"
  ```
- [ ] Verify response includes all 6 agents
- [ ] Verify `systemStatus: "operational"`
- [ ] Verify Supabase connection status

### 2. Trend Scout
- [ ] Test endpoint
  ```bash
  curl -X POST "https://your-railway-url/api/agents/trend-scout/scan" \
    -H "Content-Type: application/json" \
    -d '{"limit": 5}'
  ```
- [ ] Verify 5 trends returned
- [ ] Verify trends have required fields (hook, platform, viralScore)
- [ ] Verify data persisted to Supabase

### 3. Product Match
- [ ] Test with sample trends
  ```bash
  curl -X POST "https://your-railway-url/api/agents/product-match/analyze" \
    -H "Content-Type: application/json" \
    -d '{"trends": []}'
  ```
- [ ] Verify products matched
- [ ] Verify fit scores calculated

### 4. Script Writer
- [ ] Test with hook + product
  ```bash
  curl -X POST "https://your-railway-url/api/agents/script-writer/generate" \
    -H "Content-Type: application/json" \
    -d '{"hook": "Test", "product": "Test product"}'
  ```
- [ ] Verify scripts generated
- [ ] Verify quality scores assigned
- [ ] Verify scripts persisted

### 5. Visual Director
- [ ] Test with product
  ```bash
  curl -X POST "https://your-railway-url/api/agents/visual-director/direct" \
    -H "Content-Type: application/json" \
    -d '{"product": "Test product"}'
  ```
- [ ] Verify visual specs returned
- [ ] Verify shot list generated
- [ ] Verify render prompts for HeyGen/Runway/Kling

### 6. Copilot Suggest
- [ ] Test without API key
  ```bash
  curl -X POST "https://your-railway-url/api/agents/copilot/suggest" \
    -H "Content-Type: application/json" \
    -d '{"type": "hook"}'
  ```
- [ ] Verify fallback suggestions returned
- [ ] Verify `powered: false` (no API key)
- [ ] Add OPENAI_API_KEY and test again
- [ ] Verify `powered: true` with API key

### 7. Copilot Refine
- [ ] Test hook refinement
  ```bash
  curl -X POST "https://your-railway-url/api/agents/copilot/refine" \
    -H "Content-Type: application/json" \
    -d '{"selection": "Test hook"}'
  ```
- [ ] Verify refinements returned
- [ ] Verify A/B variants included

### 8. Copilot Explain
- [ ] Test decision explanation
  ```bash
  curl -X POST "https://your-railway-url/api/agents/copilot/explain" \
    -H "Content-Type: application/json" \
    -d '{"decision": "Test"}'
  ```
- [ ] Verify explanation returned

### 9. Auto-Generate
- [ ] Test full pipeline
  ```bash
  curl -X POST "https://your-railway-url/api/agents/auto-generate" \
    -H "Content-Type: application/json" \
    -d '{}'
  ```
- [ ] Verify completes without errors
- [ ] Verify all stages run (scan → match → script → visual)
- [ ] Verify quality score assigned
- [ ] Verify `readyToRender: true`

---

## Phase 7: Dashboard Testing

- [ ] Dashboard loads at `/`
  ```bash
  curl -X GET "https://your-railway-url/"
  # Should return HTML
  ```

- [ ] Test each button
  - [ ] **Rescan** button triggers Trend Scout scan
  - [ ] **Find Hooks** button with keyword search
  - [ ] **Generate Creatives** button triggers Script Writer
  - [ ] **Match Products** button triggers Product Match
  - [ ] **AI Suggestions** button shows Copilot suggestions
  - [ ] **Refine Hook** button shows refinement options with one-click apply
  - [ ] **Explain** button shows decision explanations
  - [ ] **Auto-Generate Everything** button runs full pipeline

- [ ] Test Copilot panel
  - [ ] Opens when buttons clicked
  - [ ] Shows suggestions, refinements, explanations
  - [ ] Can apply refinements to builder
  - [ ] Can close panel

- [ ] Test live renders polling
  - [ ] Renders poll every 5 seconds
  - [ ] Status updates in real-time
  - [ ] Can view render results

- [ ] Test video assembly builder
  - [ ] Can drag components
  - [ ] Can save drafts
  - [ ] Can select render platform (HeyGen/Runway/Kling)

---

## Phase 8: Performance & Load Testing

- [ ] Agent response times
  - [ ] Trend Scout: < 3s
  - [ ] Product Match: < 2s
  - [ ] Script Writer: < 3s
  - [ ] Visual Director: < 2s
  - [ ] Auto-Generate: < 10s

- [ ] Database performance
  - [ ] Queries return in < 500ms
  - [ ] No N+1 queries
  - [ ] Indexes created on common filters

- [ ] Load test with Apache Bench or k6
  ```bash
  # Test 100 requests, 10 concurrent
  ab -n 100 -c 10 https://your-railway-url/api/agents/status
  ```

---

## Phase 9: Security & Monitoring

- [ ] No secrets in code
  - [ ] OPENAI_API_KEY not hardcoded
  - [ ] SUPABASE_KEY not hardcoded
  - [ ] All sensitive env vars in Railway
  
- [ ] CORS configured (if needed)
  - [ ] Dashboard origin allowed
  - [ ] No `Access-Control-Allow-Origin: *`

- [ ] Rate limiting configured
  - [ ] 10 req/min for Trend Scout
  - [ ] 5 req/min for Auto-Generate
  - [ ] 30 req/min for Copilot

- [ ] Error logging enabled
  - [ ] Rails logs to Railway
  - [ ] Errors include stack traces
  - [ ] No PII in logs

- [ ] Monitoring set up
  - [ ] Railway uptime monitoring
  - [ ] Error rate alerts
  - [ ] Database connection monitoring
  - [ ] Copilot API failure alerts

---

## Phase 10: Post-Deployment Verification

- [ ] **User Acceptance Testing**
  - [ ] Marketing team can scan trends
  - [ ] Marketing team can match products
  - [ ] Marketing team can generate scripts
  - [ ] Marketing team can set visual direction
  - [ ] Marketing team can run auto-generate

- [ ] **Data Verification**
  - [ ] Supabase tables have recent data
  - [ ] Trends table has 100+ rows
  - [ ] Creatives table has scripts
  - [ ] Renders table has job history

- [ ] **Documentation Updated**
  - [ ] API docs match deployment
  - [ ] Test scripts verified
  - [ ] Deployment checklist complete
  - [ ] Team trained on new features

---

## Rollback Plan

If deployment has critical issues:

1. **Immediate Rollback**
   ```bash
   git revert <commit-sha>
   git push origin main
   # Railway auto-deploys previous version
   ```

2. **Check Logs**
   ```bash
   railway logs --tail 100
   ```

3. **Verify Health**
   ```bash
   curl https://your-railway-url/api/agents/status
   ```

4. **Notify Team**
   - Document issue
   - Create issue for fix
   - Schedule post-mortem

---

## Post-Deployment Monitoring (First 24 Hours)

- [ ] Monitor error rates (should be < 1%)
- [ ] Monitor API response times
- [ ] Monitor database connection pool
- [ ] Monitor Supabase usage
- [ ] Monitor Copilot API costs (if enabled)
- [ ] Monitor Railway resource usage

**Checklist Items to Keep**:
- [ ] Uptime > 99.9%
- [ ] P95 response time < 2s
- [ ] Error rate < 0.5%
- [ ] Database connections healthy

---

## Sign-Off

- [ ] Project Lead approval
- [ ] Engineering review
- [ ] Marketing team confirmation
- [ ] Deployment complete and verified

**Deployed By**: ___________________
**Deployment Date**: ___________________
**Verified By**: ___________________

