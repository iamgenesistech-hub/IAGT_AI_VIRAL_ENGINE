# EVICS Production Scalability Audit
## Target: 1,000+ concurrent users, 100s of daily video renders

**Status:** Current architecture has critical gaps for production scale.  
**Priority:** CRITICAL — Must address before public launch.

---

## Executive Summary

The EVICS platform currently uses:
- **Express.js** single-threaded Node.js (max ~100-200 concurrent req/process on Cloud Run)
- **Cloud Run** with auto-scaling (good, but expensive without request pooling)
- **GCS** for file storage (good)
- **Firestore** for persistence (good for JSON docs, not ideal for high-volume transaction logs)
- **In-memory caches** alongside Firestore (risk of stale data under load)
- **Synchronous file I/O** on uploads (blocks event loop)
- **Basic rate limiting** (IP-based, not user-aware)
- **No queue system** for HeyGen renders (blocking requests)
- **No request coalescing** for duplicate operations
- **No caching layer** (CDN, Redis) for hot data
- **No monitoring/observability** (traces, metrics, logs)
- **No database connection pooling** oversight

---

## Critical Bottlenecks

### 1. **Avatar/Video Generation Queue** (CRITICAL)
**Problem:**  
- HeyGen API calls block HTTP requests (1-3 min per video).
- Concurrent video generation hits HeyGen rate limits (10-20 req/min tier).
- No queue means 100 simultaneous video requests = 100 pending HTTP connections = OOM or request timeout.

**Current state:**
```
User submits video request → server calls HeyGen.startHeyGenRender() → waits 1-3 min → returns
```

**Scale failure at:**
- 20 concurrent users = 20 pending renders = 20 open connections
- Cloud Run memory grows unbounded during peak
- HeyGen API returns 429 (rate limit) after ~20 concurrent requests

**What breaks first:**
- Cloud Run instances crash due to OOM (memory leak from pending promises).
- HeyGen rate limit (plan-dependent, 5-50 req/min).
- Users see 504 Gateway Timeout.

---

### 2. **Firestore Transaction Contention** (HIGH)
**Problem:**  
- High write volume to single affiliate profile document (avatar gallery, video list, cost log).
- Firestore write throughput per document: ~100 writes/sec.
- 100 concurrent users each writing progress logs = contention.

**Current state:**
```
Video render → update job status in Firestore → write cost log → update profile → return
```

**Scale failure at:**
- 500+ concurrent users all writing status updates simultaneously.
- Firestore returns `RESOURCE_EXHAUSTED` or stalls writes (queue backlog).
- Cost log becomes unreadable (conflicts/delays).

---

### 3. **Cloud Run Memory & CPU** (HIGH)
**Problem:**  
- Single Cloud Run instance holds in-memory L1 cache (avatarJobs, videoJobs, voiceProfiles maps).
- Each video render keeps ~100 KB pending in memory during HeyGen wait.
- 100 concurrent renders = 10 MB memory just for job state.
- Node.js garbage collection pauses under memory pressure.

**Scale failure at:**
- 200-300 concurrent users.
- Cloud Run instance hits memory limit (default 512 MB → 2 GB on high plans).
- GC pauses cause user-visible latency (>1 sec response times).
- Auto-scale creates 10+ instances, each holding duplicate cache = waste.

---

### 4. **Affiliate ID Caching & Isolation** (MEDIUM)
**Problem:**  
- Current isolation fix hardened the API layer, but phone app still uses local storage.
- Stale affiliate code in localStorage can cause cross-account reads on app reload.
- No cache invalidation strategy.

**Scale failure at:**
- 100+ concurrent phone app users.
- Network lag or app crash leaves stale affiliate code.
- User sees mismatched avatar/video/profile on reload (privacy violation).

---

### 5. **GCS Upload Concurrency** (MEDIUM)
**Problem:**  
- Synchronous `fs.readFileSync()` on avatar photo/voice upload blocks event loop.
- Large files (1-5 MB audio) can block for 100-500 ms.

**Scale failure at:**
- 50+ concurrent uploads.
- Event loop backlog causes cascading latency on unrelated requests.
- HeyGen render requests starve behind upload I/O.

---

### 6. **No HTTP/2 Server Push or WebSocket** (MEDIUM)
**Problem:**  
- Phone app polls video status every 2-5 sec (wasteful).
- 1,000 users polling = 200-500 req/sec just for status.
- No real-time progress feedback (users feel app is frozen).

**Scale failure at:**
- 500+ concurrent users.
- Polling creates artificial load spike every 5 sec.
- Server CPU maxes out between polling windows.

---

### 7. **No CDN for Rendered Videos** (LOW-MEDIUM)
**Problem:**  
- GCS direct serve is slow for large video files from distant regions.
- No video caching at edge.
- Bandwidth cost scales linearly with viewer count.

**Current:** Direct GCS → ~500 ms latency from US East → 2 Mbps minimum bandwidth per viewer.

---

### 8. **Stripe Webhook Replay Vulnerability** (MEDIUM)
**Problem:**  
- No idempotency key tracking for webhook events.
- Duplicate webhook delivery (network retry) = duplicate charges.

**Scale failure at:**
- 100+ subscriptions/day.
- Stripe retries webhook, app processes twice = double billing.

---

### 9. **No Circuit Breaker for External APIs** (HIGH)
**Problem:**  
- HeyGen API slow/down → entire render pipeline hangs.
- OpenAI API timeout → copilot routes become unresponsive.
- No fallback or graceful degradation.

**Current:** Requests wait indefinitely; no timeout or retry strategy.

---

### 10. **Logging & Observability** (MEDIUM)
**Problem:**  
- No structured logging (JSON logs for log aggregation).
- No metrics (request latency, error rate, queue depth).
- No traces (request flow through services).
- Cannot diagnose production issues without SSHing into Cloud Run.

**Impact:**  
- SLA violations undetected until user complaints.
- Outages take 2-4 hours to diagnose (vs 10 min with observability).

---

## Minimum Viable Production Architecture

### Phase 1: Queue System & Async Rendering (CRITICAL)
**What:** Decouple video generation from HTTP request/response.  
**How:**
- Add **Cloud Tasks** queue for HeyGen render jobs.
- Video request → enqueue → return 202 Accepted with job ID.
- Background worker dequeues → calls HeyGen → stores result → webhook callback to phone app.
- Phone app polls job status (lightweight `GET /api/job/{id}` → no render).

**Files to create:**
- `backend/videoQueueEngine.js` — Cloud Tasks client, enqueue/dequeue helpers.
- `backend/renderWorker.js` — Long-running worker pulling from queue.
- `backend/videoQueueRoutes.js` — Job status, callback endpoints.

**Deployment:**
- Deploy Express app to Cloud Run (remains stateless).
- Deploy worker as separate Cloud Run service (long-running, high memory).
- Add Cloud Tasks queue.

**Benefit:**
- Scales to 10,000 concurrent requests (limited by Cloud Run, not HeyGen).
- Renders complete in background; no user-visible timeout.
- HeyGen backpressure isolated from HTTP layer.
- Easy to retry failed jobs.

---

### Phase 2: Distributed Caching (HIGH)
**What:** Replace in-memory maps with Redis for shared, fast L1 cache.  
**How:**
- Add **Cloud Memorystore (Redis)** or **Google Cloud MemcacheD**.
- Replace `avatarJobs = new Map()` with Redis SET/GET.
- TTL: 24 hours for job state, 7 days for video records.
- L1 cache is ephemeral; truth lives in Firestore.

**Files to create:**
- `backend/cacheEngine.js` — Redis client, cache helpers (get, set, invalidate, scan).

**Deployment:**
- Provision Cloud Memorystore Redis (5 GB standard, auto-HA).
- Update server.js to use cache engine.
- Cloud Run instances now stateless; can scale 10x without memory bloat.

**Benefit:**
- All instances read/write same cache (no duplicate data).
- Sub-millisecond cache hits.
- Scales to 1,000+ concurrent users (limited by Redis throughput, not RAM).

---

### Phase 3: Firestore Write Optimization (HIGH)
**What:** Batch writes, use sharded counters, async logging.  
**How:**
- **Batch writes:** Cost log is "write-heavy, read-rare" → batch 100 writes → write once/sec.
- **Sharded counters:** `cost_total` is hot for reads; split into 10 shards, sum on read.
- **Async logging:** Cost/render logs go to `pubsub-topic` → Cloud Functions writes async.

**Files to create:**
- `backend/firestoreOptimizations.js` — Batch writer, sharded counter helpers.
- GCP: Create Cloud Pub/Sub topic `evics-render-logs`.
- GCP: Create Cloud Function to drain topic → write batch to Firestore.

**Deployment:**
- No code changes needed; transparent swap in persistenceEngine.
- Monitor Firestore write throughput; adjust batch size if needed.

**Benefit:**
- Firestore write throughput increases 10x.
- Scales to 1,000+ concurrent users.

---

### Phase 4: CDN for Media (MEDIUM)
**What:** Cache rendered videos + user photos at edge.  
**How:**
- **GCS → Cloud CDN:** GCS bucket already supports CDN.
- **Enable Cloud CDN** on bucket (one-click).
- Media URLs automatically served from 200+ global edge locations.
- Cache TTL: 24 hours for videos, 7 days for photos.

**Deployment:**
- Enable Cloud CDN on `gs://evics-storage-evics-api/`.
- Update video/photo URLs to use CDN endpoint.
- Cost: minimal (bandwidth saved >> CDN fee).

**Benefit:**
- Video download 5-10x faster globally.
- 80% of bandwidth cached at edge (huge cost savings).
- Scales to unlimited users (CDN handles load).

---

### Phase 5: Real-Time Updates with WebSocket (MEDIUM)
**What:** Replace polling with push-based status updates.  
**How:**
- Add **Firebase Cloud Messaging (FCM)** or **Pusher/Ably** for real-time.
- Video status changes → server sends push notification → app updates UI in <1 sec.
- App subscribes to `render-{jobId}` channel; server publishes status changes.

**Alternative (simpler):**
- Use **Server-Sent Events (SSE)** over HTTP/2 (no WebSocket overhead).
- Client connects to `/api/job/{id}/subscribe` → server streams updates as events.

**Files to create:**
- `backend/realtimeEngine.js` — FCM/SSE helpers.

**Deployment:**
- If FCM: initialize Firebase Admin SDK.
- If SSE: just add endpoint in server.js.

**Benefit:**
- Polling load drops 80% (1,000 users → 50 req/sec instead of 200).
- User sees renders complete in real-time.
- Scales to 10,000+ users.

---

### Phase 6: Structured Logging & Observability (MEDIUM)
**What:** Emit JSON logs to Google Cloud Logging + set up metrics.  
**How:**
- Install `@google-cloud/logging` or use stdout JSON.
- Log all requests with: timestamp, method, path, status, latency, user, error.
- Add counters: `video_renders_started`, `video_renders_failed`, `avatar_creates`, etc.
- Export metrics to Cloud Monitoring (built-in).

**Files to create:**
- `backend/observabilityEngine.js` — Structured logging + metrics helpers.

**Deployment:**
- Update server.js to use observability engine.
- Create Cloud Monitoring dashboard: latency, error rate, render queue depth.

**Benefit:**
- Production issues visible in dashboards (no guessing).
- SLA compliance auditable.
- Scales to any load (logging is decoupled).

---

### Phase 7: Circuit Breaker & Resilience (HIGH)
**What:** Gracefully handle external API failures.  
**How:**
- Add **Node.js circuit-breaker library** (e.g., `opossum`).
- Wrap HeyGen, OpenAI, Stripe calls with breaker.
- If API fails 5x in a row → open circuit → fail fast with 503 → wait 60s → retry.
- Fallback: queue render for later, notify user "Render queued, we'll notify you when ready."

**Files to create:**
- `backend/resilienceEngine.js` — Circuit breaker configuration.

**Deployment:**
- Update server.js calls to HeyGen/OpenAI/Stripe through breaker.

**Benefit:**
- Single external API outage doesn't crash entire platform.
- Users see clear error message + retry option.
- Scales gracefully through degradation.

---

### Phase 8: User-Aware Rate Limiting (MEDIUM)
**Problem:**
- Current rate limiting is IP-based (breaks behind corporate NAT/VPN).
- No per-user limits (whale user can DOS the platform).

**What:** Replace with token-bucket per user.  
**How:**
- Rate limits: Free: 2 videos/day, Creator: 20/day, Elite: unlimited.
- Track against affiliate account, not IP.
- Use Redis to maintain token bucket per user.

**Files to create:**
- `backend/userAwareLimitEngine.js` — Token bucket helpers.

**Deployment:**
- Update videoLimiter in server.js to use user limits.

**Benefit:**
- Prevents whale user DOS attacks.
- Encourages upgrade (soft cap on free tier).

---

### Phase 9: Database Connection Pooling (LOW)
**What:** Firestore already handles pooling, but SQL queries (if added) need pool.  
**Current:** Firestore is document DB, fine at scale.  
**Future:** If migrating to Cloud SQL (PostgreSQL) for relational data, add pgBouncer pool.

---

### Phase 10: Security Hardening (MEDIUM)
**What:** Add defensive layers.  
**How:**
- **DDoS protection:** Cloud Armor rules (rate limit by country, block known bots).
- **API auth:** Switch from affiliate code to JWT tokens + refresh.
- **CORS hardening:** Whitelist specific origins (not `*`).
- **Secret rotation:** Stripe keys, HeyGen API key via Secret Manager.

**Files to create:**
- `backend/authEngine.js` — JWT generation/validation.
- `backend/cloudArmorConfig.yaml` — DDoS rules.

**Deployment:**
- Deploy to Cloud Armor.
- Swap auth layer in server.js.

**Benefit:**
- Prevents basic attacks (DDoS, token theft).
- Scales securely to 10,000+ users.

---

## Build Order (by ROI)

| Phase | Priority | Effort | ROI | Concurrent Users | Est. Timeline |
|-------|----------|--------|-----|------------------|---------------|
| 1. Queue System | CRITICAL | 2 days | 10x | 500 → 5,000 | 2 days |
| 2. Redis Cache | CRITICAL | 1 day | 5x | 500 → 2,500 | 1 day |
| 3. Firestore Batch | HIGH | 1 day | 2x | 2,500 → 5,000 | 1 day |
| 4. CDN | MEDIUM | 1 hour | 5x BW saved | Unlimited | 1 hour |
| 5. WebSocket/SSE | MEDIUM | 1 day | 5x polling reduction | Unlimited | 1 day |
| 6. Observability | MEDIUM | 1 day | ∞ (debugging) | Unlimited | 1 day |
| 7. Circuit Breaker | HIGH | 0.5 day | High resilience | Unlimited | 0.5 day |
| 8. User-Aware Rate Limit | MEDIUM | 0.5 day | Prevents whale DOS | Unlimited | 0.5 day |
| 9. Security Hardening | MEDIUM | 1 day | SOC 2 compliance | Unlimited | 1 day |
| 10. SQL & Pooling | LOW | Future | — | Unlimited | Future |

**Total:** ~10 days to production-scale architecture.

---

## Deployment Strategy

### Week 1: Critical Path (Phases 1-3, 7)
- Day 1: Queue system (Cloud Tasks + render worker).
- Day 2: Redis cache layer.
- Day 3: Firestore batch writes.
- Day 4: Circuit breaker + resilience.
- Deploy to staging; run load test (500 concurrent users).

### Week 2: User Experience (Phases 4-6, 8)
- Day 5: CDN for media.
- Day 6: WebSocket/SSE for real-time.
- Day 7: Structured logging + dashboards.
- Day 8: User-aware rate limiting.
- Deploy to staging; run load test (1,000 concurrent users).

### Week 3: Security & Polish (Phase 9, 10)
- Day 9: Security hardening (Cloud Armor, JWT, auth).
- Day 10: Load test to 2,000 concurrent; stress test to breaking point.
- Day 11: Production deploy (blue-green, canary).

---

## Cost Estimates (Monthly, 1,000 concurrent users, 100 renders/day)

| Service | Current | After Scaling |
|---------|---------|----------------|
| **Cloud Run (render)** | $50 | $200 (increased # of instances) |
| **Cloud Tasks** | $0 | $20 (queue ops) |
| **Cloud Memorystore Redis** | $0 | $100 (5 GB standard) |
| **Cloud CDN** | $0 | $50 (bandwidth saved >> fee) |
| **Firestore** | $50 | $150 (increased write volume) |
| **GCS** | $20 | $50 (more videos archived) |
| **Cloud Logging** | $10 | $30 (more volume) |
| **Cloud Monitoring** | $0 | $20 (metrics) |
| **HeyGen API** | $200 (assumed) | $600 (100 renders × $6/min) |
| **TOTAL** | ~$330 | ~$1,220 |

**Assumption:** HeyGen is the dominant cost. Scaling infrastructure to support 100x render demand costs 3-4x (mostly API fees).

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Redis node failure | Enable HA (multi-zone replication). |
| Firestore hot shard | Use document sharding + eventual consistency. |
| Cloud Tasks queue overflow | Auto-scale worker. Set queue depth alerting. |
| HeyGen API outages | Circuit breaker + queue. Notify users. |
| Cross-affiliate data leak (cache) | Add affiliate namespace to all cache keys. |
| Subscriber spam (WebSocket) | Rate limit subscriptions per user. |
| DDoS attacks | Cloud Armor + regional failover. |

---

## Success Metrics

- **99.9% uptime** (5.25 hours downtime/month max).
- **Latency p95 < 500 ms** (status check).
- **Latency p95 < 5 sec** (video generation with queue).
- **Error rate < 0.5%**.
- **Cost per render < $6.50** (HeyGen API cost, not platform cost).
- **Queue depth < 100** (renders queued, not backed up).
- **Cache hit rate > 80%** (Redis serving most requests).

---

## Next Steps

1. **Immediate:** Approve build order + timeline.
2. **Week 1 Day 1:** Start Phase 1 (Cloud Tasks + queue system).
3. **Weekly:** Load test + validate metrics.
4. **Week 3 Day 11:** Production launch to 1,000 concurrent users.

