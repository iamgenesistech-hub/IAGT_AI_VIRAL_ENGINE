# API Contracts for IAGT_AI_VIRAL_ENGINE

Complete API specifications for frontend integration.

---

## Base URL

**Development**: `http://localhost:3000`
**Production**: `https://exemplary-communication-production-aab5.up.railway.app`

All requests use `Content-Type: application/json` and `Accept: application/json`.

---

## 1. Agent Status

**Endpoint**: `GET /api/agents/status`

**Description**: Returns operational status of all agents and system health.

**Request**
```
GET /api/agents/status
```

**Response** (200 OK)
```json
{
  "agent": "OfficeAgent",
  "systemStatus": "operational|degraded|offline",
  "supabaseConnected": true,
  "totalAgents": 6,
  "operationalAgents": 6,
  "agents": [
    {
      "id": "TrendScoutTwin",
      "name": "Trend Scout",
      "role": "Scans viral content across platforms",
      "status": "operational",
      "ready": true
    },
    {
      "id": "ProductMatchTwin",
      "name": "Product Match",
      "status": "operational",
      "ready": true
    },
    {
      "id": "ScriptWriterTwin",
      "name": "Script Writer",
      "status": "operational",
      "ready": true
    },
    {
      "id": "VisualDirectorTwin",
      "name": "Visual Director",
      "status": "operational",
      "ready": true
    },
    {
      "id": "CopilotAssistant",
      "name": "Copilot",
      "aiPowered": false,
      "source": "evics-intelligence",
      "configured": false
    },
    {
      "id": "OfficeAgent",
      "name": "Office Agent",
      "status": "operational",
      "ready": true
    }
  ],
  "copilot": {
    "configured": false,
    "apiReachable": false,
    "activeSource": "evics-intelligence",
    "model": "gpt-4o",
    "hasOpenAI": false,
    "hasAzure": false,
    "fallbackAvailable": true
  },
  "timestamp": "2026-05-27T18:30:00Z"
}
```

**Error** (500)
```json
{
  "success": false,
  "error": "Supabase connection failed"
}
```

---

## 2. Trend Scout Scan

**Endpoint**: `POST /api/agents/trend-scout/scan`

**Description**: Scans viral content across platforms, returns ranked trends.

**Request**
```json
{
  "platforms": ["TikTok", "Instagram", "YouTube", "Pinterest", "X"],
  "categories": ["Wellness", "Beauty", "Fitness"],
  "limit": 20
}
```

**Parameters**
- `platforms` (array): Platforms to scan. Defaults to all.
- `categories` (array): Content categories to focus on. Defaults to all.
- `limit` (number): Max trends to return. Defaults to 20. Max 100.

**Response** (200 OK)
```json
{
  "agent": "TrendScoutTwin",
  "status": "complete",
  "scannedPlatforms": ["TikTok", "Instagram"],
  "totalScanned": 40,
  "topTrends": [
    {
      "platform": "TikTok",
      "category": "Wellness",
      "hook": "Nobody talks about this morning habit…",
      "emotion": "curiosity",
      "structure": "Problem-Reveal",
      "viralScore": 92,
      "confidence": "High",
      "action": "Scale immediately",
      "metrics": {
        "views": 1500000,
        "shares": 18000,
        "comments": 9000,
        "velocity": 85,
        "hookStrength": 92,
        "productFit": 88,
        "conversionSignal": 78
      },
      "winningStructure": {
        "hook": "Nobody talks about this morning habit…",
        "problem": "Audience energy/wellness pain point",
        "agitation": "Frustration about ineffective solutions",
        "solution": "Product as the answer",
        "proof": "Social proof + transformation visual",
        "cta": "Shop now and begin transformation",
        "visualPattern": "Problem-Reveal visual format",
        "pacing": "Fast cuts, 0.5s hook",
        "emotionalTrigger": "curiosity"
      },
      "scannedAt": "2026-05-27T18:25:00Z"
    }
  ],
  "summary": {
    "totalFound": 20,
    "highConfidence": 14,
    "platformBreakdown": {
      "TikTok": 12,
      "Instagram": 8
    },
    "topEmotions": ["curiosity", "transformation", "aspiration"],
    "topStructures": ["Problem-Solution", "Before-After", "Testimonial"],
    "avgViralScore": 78
  },
  "timestamp": "2026-05-27T18:30:00Z"
}
```

**Error Responses**

(400 Bad Request)
```json
{
  "success": false,
  "error": "limit must be between 1 and 100"
}
```

(500 Server Error)
```json
{
  "success": false,
  "error": "Supabase query failed"
}
```

**Frontend Integration**
```javascript
async function scanTrends() {
  const res = await fetch('/api/agents/trend-scout/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platforms: ['TikTok', 'Instagram'],
      categories: ['Wellness'],
      limit: 20
    })
  });
  
  if (res.ok) {
    const data = await res.json();
    return data.topTrends; // Array of trend objects
  }
  throw new Error(`Scan failed: ${res.status}`);
}
```

---

## 3. Product Match Analyze

**Endpoint**: `POST /api/agents/product-match/analyze`

**Description**: Matches products to viral trends, returns ranked product fits.

**Request**
```json
{
  "trends": [
    {
      "hook": "Nobody talks about this morning habit…",
      "platform": "TikTok",
      "category": "Wellness",
      "emotion": "curiosity",
      "viralScore": 90
    }
  ],
  "topN": 3
}
```

**Parameters**
- `trends` (array): Trend objects from Trend Scout. If empty, uses recent DB trends.
- `topN` (number): Top N products per trend. Default: 3.

**Response** (200 OK)
```json
{
  "agent": "ProductMatchTwin",
  "status": "complete",
  "totalTrendsAnalyzed": 1,
  "totalProductsEvaluated": 6,
  "matches": [
    {
      "trend": {
        "hook": "Nobody talks about this morning habit…",
        "platform": "TikTok",
        "category": "Wellness",
        "emotion": "curiosity",
        "viralScore": 90
      },
      "topMatches": [
        {
          "product": "Sea Moss Mineral Gel",
          "category": "Sea Moss",
          "sku": "ROC_SEAMOSS",
          "fitScore": 92,
          "reasons": [
            "Category match",
            "Emotional resonance",
            "Hook-goal alignment"
          ],
          "positioningAngle": "daily mineral ritual",
          "baseScore": 96,
          "isBundle": false
        },
        {
          "product": "Metabolic Ignite",
          "fitScore": 87,
          "positioningAngle": "morning reset",
          "baseScore": 91
        },
        {
          "product": "NeuroRise Focus",
          "fitScore": 82,
          "positioningAngle": "clean productive energy",
          "baseScore": 82
        }
      ],
      "bestProduct": {
        "product": "Sea Moss Mineral Gel",
        "category": "Sea Moss",
        "fitScore": 92,
        "positioningAngle": "daily mineral ritual",
        "baseScore": 96,
        "isBundle": false
      }
    }
  ],
  "summary": {
    "topProduct": "Sea Moss Mineral Gel",
    "topProductFrequency": 3,
    "avgFitScore": 87,
    "productFrequency": {
      "Sea Moss Mineral Gel": 3,
      "Metabolic Ignite": 2,
      "Genesis Glow Collagen": 1
    }
  },
  "timestamp": "2026-05-27T18:30:00Z"
}
```

**Frontend Integration**
```javascript
async function matchProducts(trends) {
  const res = await fetch('/api/agents/product-match/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trends, topN: 3 })
  });
  
  if (res.ok) {
    const data = await res.json();
    return data.matches.map(m => m.bestProduct); // Best products
  }
}
```

---

## 4. Script Writer Generate

**Endpoint**: `POST /api/agents/script-writer/generate`

**Description**: Generates video scripts from hooks + products.

**Request**
```json
{
  "hook": "Nobody talks about this morning habit…",
  "product": "Sea Moss Mineral Gel",
  "angle": "daily mineral ritual",
  "emotion": "curiosity",
  "formats": ["UGC", "Commercial"],
  "variations": 2
}
```

**Parameters**
- `hook` (string): Required or product required
- `product` (string): Product name
- `angle` (string): Positioning angle
- `emotion` (string): Primary emotion (curiosity, transformation, urgency, etc.)
- `formats` (array): Video formats (UGC, Commercial, Luxury, Educational)
- `variations` (number): Variations per format. Default: 2

**Response** (200 OK)
```json
{
  "agent": "ScriptWriterTwin",
  "status": "complete",
  "hook": "Nobody talks about this morning habit…",
  "product": "Sea Moss Mineral Gel",
  "angle": "daily mineral ritual",
  "emotion": "curiosity",
  "totalGenerated": 4,
  "scripts": [
    {
      "variationId": "v1",
      "format": "UGC",
      "hook": "Nobody talks about this morning habit…",
      "product": "Sea Moss Mineral Gel",
      "angle": "daily mineral ritual",
      "emotion": "curiosity",
      "emotionalSequence": ["curiosity", "frustration", "belief", "confidence"],
      "scenes": [
        {
          "scene": 1,
          "type": "Hook",
          "content": "Open on authentic setting. Creator picks up Sea Moss Mineral Gel. VO: \"Nobody talks about this morning habit…\""
        },
        {
          "scene": 2,
          "type": "Problem",
          "content": "Cut to relatable moment showing the curiosity pain point. Real, unpolished."
        },
        {
          "scene": 3,
          "type": "Proof",
          "content": "Product close-up. VO: \"I started using Sea Moss Mineral Gel for daily mineral ritual. Here's what happened.\""
        },
        {
          "scene": 4,
          "type": "Transformation",
          "content": "Quick montage: before vs after. Real results, real person."
        },
        {
          "scene": 5,
          "type": "CTA",
          "content": "Hold product to camera. VO: \"Start your Sea Moss Mineral Gel ritual today. Link in bio.\""
        }
      ],
      "fullScript": "[HOOK]\nOpen on authentic setting...\n\n[PROBLEM]\n...\n\n[PROOF]\n...",
      "wordCount": 247,
      "estimatedDuration": "15-20s",
      "qualityScore": 88,
      "qualityBreakdown": {
        "hookClarity": 92,
        "emotionalFlow": 85,
        "productIntegration": 91,
        "ctaStrength": 87,
        "pacing": 86,
        "originality": 82
      }
    }
  ],
  "topScript": {
    "variationId": "v1",
    "format": "UGC",
    "qualityScore": 88,
    "estimatedDuration": "15-20s"
  },
  "summary": {
    "bestFormat": "UGC",
    "bestVariation": "v1",
    "topQualityScore": 88,
    "avgQualityScore": 82,
    "readyCount": 3
  },
  "timestamp": "2026-05-27T18:30:00Z"
}
```

**Error** (400)
```json
{
  "success": false,
  "error": "At least one of hook or product is required."
}
```

---

## 5. Visual Director Direct

**Endpoint**: `POST /api/agents/visual-director/direct`

**Description**: Generates visual direction and shot lists for video production.

**Request**
```json
{
  "product": "Sea Moss Mineral Gel",
  "hook": "Nobody talks about this morning habit…",
  "emotion": "curiosity",
  "format": "UGC",
  "platform": "TikTok",
  "angle": "daily mineral ritual"
}
```

**Parameters**
- `product` (string): Required. Product name
- `hook` (string): Hook text
- `emotion` (string): Primary emotion
- `format` (string): UGC, Commercial, Luxury, Educational
- `platform` (string): TikTok, Instagram, YouTube, Pinterest, Facebook
- `angle` (string): Positioning angle

**Response** (200 OK)
```json
{
  "agent": "VisualDirectorTwin",
  "status": "approved",
  "product": "Sea Moss Mineral Gel",
  "emotion": "curiosity",
  "format": "UGC",
  "primaryPlatform": "TikTok",
  "visualStyle": {
    "format": "UGC",
    "cameraAngle": "Handheld POV",
    "lighting": "Natural window light",
    "pacing": "Fast cuts — 0.5s hook, 1-2s scenes, 3s product reveal",
    "effects": ["Subtitles", "Jump cuts", "Zoom punch"],
    "colorGrade": "Warm, authentic, slightly desaturated",
    "musicStyle": "Trending audio, upbeat, relatable",
    "openingRule": "0-2s: Pattern interrupt. No logo. Pure hook.",
    "emotionMapping": {
      "colorTemp": "Cool-neutral",
      "energy": "Building",
      "transitionStyle": "Quick cuts with pause"
    }
  },
  "platformSpecs": {
    "aspectRatio": "9:16",
    "resolution": "1080x1920",
    "optimalDuration": "15-30s",
    "captionStyle": "Bold subtitles, high contrast",
    "hookWindow": "0-1.5s",
    "bestFormats": ["UGC", "Commercial"]
  },
  "recommendedPlatforms": [
    {
      "platform": "TikTok",
      "specs": { "aspectRatio": "9:16", "optimalDuration": "15-30s" },
      "priority": 1
    },
    {
      "platform": "Instagram",
      "specs": { "aspectRatio": "9:16", "optimalDuration": "15-30s" },
      "priority": 2
    }
  ],
  "shotList": [
    {
      "shot": 1,
      "type": "Hook Shot",
      "description": "Handheld POV — Nobody talks about this morning habit…",
      "duration": "0-1.5s",
      "lighting": "Natural window light",
      "notes": "0-2s: Pattern interrupt. No logo. Pure hook."
    },
    {
      "shot": 2,
      "type": "Problem Scene",
      "description": "Show the curiosity pain point. Building energy.",
      "duration": "2-3s",
      "lighting": "Natural window light",
      "notes": "Color temp: Cool-neutral"
    },
    {
      "shot": 3,
      "type": "Product Hero",
      "description": "Sea Moss Mineral Gel close-up. Handheld POV. Angle: daily mineral ritual.",
      "duration": "3-4s",
      "lighting": "Product hero lighting — clean and premium",
      "notes": "Show label clearly."
    },
    {
      "shot": 4,
      "type": "Transformation",
      "description": "Before/after or lifestyle result. Quick cuts with pause.",
      "duration": "3-5s",
      "lighting": "Natural window light",
      "notes": "Real, authentic result. No over-production."
    },
    {
      "shot": 5,
      "type": "CTA",
      "description": "Product in hand. Direct to camera. Start your Sea Moss Mineral Gel ritual today.",
      "duration": "2-3s",
      "lighting": "Match opening shot",
      "notes": "Link in bio overlay."
    }
  ],
  "renderPrompts": {
    "heygen": {
      "avatarStyle": "casual",
      "voiceStyle": "energetic and authentic",
      "background": "natural home setting",
      "script": "Nobody talks about this morning habit… [Product reveal: Sea Moss Mineral Gel]..."
    },
    "runway": {
      "promptText": "UGC style video. Nobody talks about this morning habit… Sea Moss Mineral Gel daily mineral ritual. Cool-neutral color grade.",
      "model": "gen3a_turbo",
      "ratio": "768:1280"
    },
    "kling": {
      "prompt": "UGC advertisement for Sea Moss Mineral Gel...",
      "aspectRatio": "9:16"
    }
  },
  "productionNotes": [
    "Hook must land in 0-1.5s — no exceptions.",
    "Optimal duration: 15-30s.",
    "Caption style: Bold subtitles, high contrast.",
    "Color grade: Warm, authentic, slightly desaturated.",
    "Music: Trending audio, upbeat, relatable."
  ],
  "timestamp": "2026-05-27T18:30:00Z"
}
```

---

## 6. Copilot Suggest

**Endpoint**: `POST /api/agents/copilot/suggest`

**Description**: Get AI suggestions for video components.

**Request**
```json
{
  "context": "Working on a TikTok UGC video for wellness",
  "content": "Nobody talks about this morning habit",
  "type": "hook"
}
```

**Parameters**
- `context` (string): What user is working on
- `content` (string): Current content to suggest improvements
- `type` (string): hook, script, product, visual, general

**Response** (200 OK) - With API Key
```json
{
  "agent": "CopilotAssistant",
  "type": "hook",
  "suggestions": "1. Add a specific timeframe (7 days, 30 days)...\n2. Create curiosity loop by withholding answer...",
  "source": "openai",
  "powered": true,
  "timestamp": "2026-05-27T18:30:00Z"
}
```

**Response** (200 OK) - Without API Key (Fallback)
```json
{
  "agent": "CopilotAssistant",
  "type": "hook",
  "suggestions": "1. Lead with transformation, not product...\n2. Add specific timeframe...",
  "source": "evics-intelligence",
  "powered": false,
  "note": "Set OPENAI_API_KEY or COPILOT_API_KEY to enable full AI suggestions.",
  "timestamp": "2026-05-27T18:30:00Z"
}
```

---

## 7. Copilot Refine

**Endpoint**: `POST /api/agents/copilot/refine`

**Description**: Refine user selection with AI intelligence.

**Request**
```json
{
  "selection": "Nobody talks about this morning habit",
  "type": "hook",
  "context": {
    "product": "Sea Moss Mineral Gel",
    "platform": "TikTok",
    "emotion": "curiosity"
  }
}
```

**Parameters**
- `selection` (string): Required. Text to refine (hook, script, product)
- `type` (string): hook, script, product, visual
- `context` (object): Additional context

**Response** (200 OK)
```json
{
  "agent": "CopilotAssistant",
  "action": "refine",
  "type": "hook",
  "original": "Nobody talks about this morning habit",
  "refinement": "**Improved Version:**\nNobody talks about this 7-day morning habit that changed my energy.\n\n**Why it performs better:**\nAdded specific timeframe (7 days) and emotional payoff (energy change).\n\n**A/B Test Variant:**\nWhat if your morning energy problem wasn't about sleep?",
  "source": "openai",
  "powered": true,
  "timestamp": "2026-05-27T18:30:00Z"
}
```

---

## 8. Copilot Explain

**Endpoint**: `POST /api/agents/copilot/explain`

**Description**: Explain AI decisions in plain language.

**Request**
```json
{
  "decision": "Selected Sea Moss Mineral Gel for Wellness trend",
  "data": {
    "fitScore": 92,
    "viralScore": 88,
    "productScore": 96
  }
}
```

**Response** (200 OK)
```json
{
  "agent": "CopilotAssistant",
  "action": "explain",
  "decision": "Selected Sea Moss Mineral Gel for Wellness trend",
  "explanation": "The EVICS system matched Sea Moss Mineral Gel (fitScore: 92) to this viral trend because the product's mineral focus aligns with the wellness category and curiosity emotion. The high viral score (88) indicates strong market demand. Recommendation: Proceed with script generation for TikTok UGC format.",
  "source": "openai",
  "powered": true,
  "timestamp": "2026-05-27T18:30:00Z"
}
```

---

## 9. Auto-Generate Pipeline

**Endpoint**: `POST /api/agents/auto-generate`

**Description**: Run the complete EVICS pipeline end-to-end.

**Request**
```json
{}
```

**Optional Parameters**
```json
{
  "platforms": ["TikTok", "Instagram"],
  "categories": ["Wellness"],
  "formats": ["UGC", "Commercial"],
  "copilotRefine": true,
  "trendLimit": 15
}
```

**Response** (200 OK)
```json
{
  "agent": "OfficeAgent",
  "pipeline": "auto_generate",
  "status": "complete|partial|failed",
  "pipelineId": "pipeline_1716820903456",
  "duration": "2847ms",
  "generated": {
    "trends": 10,
    "productMatches": 8,
    "scripts": 4,
    "visualDirections": 1
  },
  "topRecommendation": {
    "hook": "Nobody talks about this morning habit…",
    "hookPlatform": "TikTok",
    "hookConfidence": "High",
    "product": "Sea Moss Mineral Gel",
    "productScore": 96,
    "productAngle": "daily mineral ritual",
    "script": "Open on authentic setting. Hook: \"Nobody talks about this morning habit…\"...",
    "platform": "TikTok",
    "format": "UGC",
    "duration": "30s",
    "aspect": "9:16",
    "qualityScore": 92,
    "components": [
      { "type": "hook", "id": "h-001", "text": "Nobody talks about this morning habit…" },
      { "type": "script", "id": "cr-001", "text": "Open on authentic setting..." },
      { "type": "product", "id": "Sea Moss Mineral Gel", "text": "Sea Moss Mineral Gel" }
    ]
  },
  "copilotInsight": "Hook refined to include 7-day timeframe for specificity...",
  "readyToRender": true,
  "nextStep": "Review top script (score: 92) and send to HeyGen, Runway, or Kling.",
  "timestamp": "2026-05-27T18:30:00Z"
}
```

---

## 10. Full-Cycle Orchestration

**Endpoint**: `POST /api/agents/orchestrate/full-cycle`

**Description**: Run complete pipeline with detailed stage outputs.

**Request**
```json
{
  "platforms": ["TikTok", "Instagram"],
  "categories": ["Wellness"],
  "formats": ["UGC", "Commercial"],
  "copilotRefine": true,
  "trendLimit": 15
}
```

**Response** (200 OK)
```json
{
  "agent": "OfficeAgent",
  "pipeline": "full_cycle",
  "status": "complete|partial|failed",
  "pipelineId": "pipeline_...",
  "duration": "2847ms",
  "stagesCompleted": 5,
  "stagesFailed": 0,
  "stages": {
    "trendScan": { /* ... */ },
    "productMatch": { /* ... */ },
    "scriptGeneration": { /* ... */ },
    "visualDirection": { /* ... */ },
    "copilotRefinement": { /* ... */ }
  },
  "topTrend": { /* trend object */ },
  "topProduct": "Sea Moss Mineral Gel",
  "topScript": { /* script object */ },
  "visualDirection": { /* visual spec */ },
  "intelligenceSignal": { /* master loop data */ },
  "learningOutcome": { /* adaptive learning */ },
  "errors": []
}
```

---

## Response Codes

| Code | Meaning | Example |
|---|---|---|
| 200 | Success | Endpoint executed successfully |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing API key (if required) |
| 429 | Rate Limited | Too many requests |
| 500 | Server Error | Supabase/API failure |
| 503 | Service Unavailable | Maintenance or outage |

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

**Frontend Pattern**
```javascript
async function callAgent(endpoint, body) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`${endpoint} failed:`, error.message);
    throw error;
  }
}

// Usage
try {
  const result = await callAgent('/api/agents/auto-generate', {});
  console.log('Success:', result);
} catch (error) {
  console.error('Pipeline failed:', error);
  // Show user-friendly error UI
}
```

---

## Rate Limiting

- **Trend Scout**: 10 requests per minute per API key
- **Auto-Generate**: 5 requests per minute per API key
- **Copilot**: 30 requests per minute per API key

---

## Caching

- Trend Scout results cached for 1 hour
- Product Match results cached for 24 hours
- Script Writer results never cached (always fresh)

---

## Webhooks (Future)

Subscribe to render completion events:

```javascript
// Example: POST /api/webhooks/subscribe
{
  "event": "render_complete",
  "url": "https://your-domain.com/webhooks/renders"
}
```

