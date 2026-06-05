# Agent Endpoint Test Scripts

Complete cURL and JavaScript test scripts for all agent endpoints.

## Prerequisites

```bash
# Set environment variables
export API_BASE="http://localhost:3000"
# OR for production:
export API_BASE="https://your-railway-url.up.railway.app"
```

---

## 1. Agent Status Check

### cURL
```bash
curl -X GET "${API_BASE}/api/agents/status" \
  -H "Accept: application/json"
```

### JavaScript
```javascript
async function testAgentStatus() {
  const res = await fetch(`${API_BASE}/api/agents/status`);
  const data = await res.json();
  console.log('Agent Status:', data);
  // Expected: { systemStatus, agents[], copilot{}, timestamp }
}
testAgentStatus();
```

### Expected Response
```json
{
  "agent": "OfficeAgent",
  "systemStatus": "operational",
  "supabaseConnected": true,
  "totalAgents": 6,
  "operationalAgents": 6,
  "agents": [
    {
      "id": "TrendScoutTwin",
      "name": "Trend Scout",
      "status": "operational",
      "ready": true
    },
    // ... more agents
  ],
  "copilot": {
    "configured": true,
    "apiReachable": false,
    "activeSource": "evics-intelligence"
  },
  "timestamp": "2026-05-27T..."
}
```

---

## 2. Trend Scout Scan

### cURL
```bash
curl -X POST "${API_BASE}/api/agents/trend-scout/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["TikTok", "Instagram"],
    "categories": ["Wellness", "Beauty"],
    "limit": 20
  }'
```

### JavaScript
```javascript
async function testTrendScout() {
  const res = await fetch(`${API_BASE}/api/agents/trend-scout/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platforms: ['TikTok', 'Instagram'],
      categories: ['Wellness'],
      limit: 10
    })
  });
  const data = await res.json();
  console.log('Trends Found:', data.summary.totalFound);
  console.log('Top Trend:', data.topTrends[0]);
}
testTrendScout();
```

### Expected Response
```json
{
  "agent": "TrendScoutTwin",
  "status": "complete",
  "scannedPlatforms": ["TikTok", "Instagram"],
  "totalScanned": 40,
  "topTrends": [
    {
      "platform": "TikTok",
      "hook": "Nobody talks about this morning habit…",
      "emotion": "curiosity",
      "structure": "Problem-Reveal",
      "viralScore": 92,
      "confidence": "High",
      "metrics": {
        "views": 1500000,
        "shares": 18000,
        "velocity": 85
      }
    }
  ],
  "summary": {
    "totalFound": 10,
    "highConfidence": 6,
    "avgViralScore": 78
  }
}
```

---

## 3. Product Match

### cURL
```bash
curl -X POST "${API_BASE}/api/agents/product-match/analyze" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### JavaScript
```javascript
async function testProductMatch() {
  const res = await fetch(`${API_BASE}/api/agents/product-match/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trends: [
        {
          hook: "Nobody talks about this morning habit…",
          platform: "TikTok",
          category: "Wellness",
          emotion: "curiosity",
          viralScore: 85
        }
      ],
      topN: 3
    })
  });
  const data = await res.json();
  console.log('Best Product Match:', data.matches[0].bestProduct);
}
testProductMatch();
```

### Expected Response
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
        "emotion": "curiosity"
      },
      "topMatches": [
        {
          "product": "Sea Moss Mineral Gel",
          "fitScore": 92,
          "positioningAngle": "daily mineral ritual",
          "baseScore": 96
        }
      ],
      "bestProduct": {
        "product": "Sea Moss Mineral Gel",
        "fitScore": 92
      }
    }
  ],
  "summary": {
    "topProduct": "Sea Moss Mineral Gel",
    "avgFitScore": 88
  }
}
```

---

## 4. Script Writer Generation

### cURL
```bash
curl -X POST "${API_BASE}/api/agents/script-writer/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "hook": "Nobody talks about this morning habit…",
    "product": "Sea Moss Mineral Gel",
    "angle": "daily mineral ritual",
    "emotion": "curiosity",
    "formats": ["UGC", "Commercial"],
    "variations": 2
  }'
```

### JavaScript
```javascript
async function testScriptWriter() {
  const res = await fetch(`${API_BASE}/api/agents/script-writer/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hook: "Nobody talks about this morning habit…",
      product: "Sea Moss Mineral Gel",
      angle: "daily mineral ritual",
      emotion: "curiosity",
      formats: ["UGC", "Commercial"],
      variations: 2
    })
  });
  const data = await res.json();
  console.log('Top Script Quality:', data.topScript.qualityScore);
  console.log('Generated Scripts:', data.totalGenerated);
}
testScriptWriter();
```

### Expected Response
```json
{
  "agent": "ScriptWriterTwin",
  "status": "complete",
  "hook": "Nobody talks about this morning habit…",
  "product": "Sea Moss Mineral Gel",
  "totalGenerated": 4,
  "topScript": {
    "variationId": "v1",
    "format": "UGC",
    "hook": "Nobody talks about this morning habit…",
    "qualityScore": 88,
    "estimatedDuration": "15-20s",
    "fullScript": "[HOOK]\nOpen on authentic setting...",
    "qualityBreakdown": {
      "hookClarity": 92,
      "emotionalFlow": 85,
      "productIntegration": 91
    }
  },
  "scripts": [/* ... 4 scripts sorted by quality ... */],
  "summary": {
    "bestFormat": "UGC",
    "topQualityScore": 88,
    "avgQualityScore": 82,
    "readyCount": 3
  }
}
```

---

## 5. Visual Direction

### cURL
```bash
curl -X POST "${API_BASE}/api/agents/visual-director/direct" \
  -H "Content-Type: application/json" \
  -d '{
    "product": "Sea Moss Mineral Gel",
    "hook": "Nobody talks about this morning habit…",
    "emotion": "curiosity",
    "format": "UGC",
    "platform": "TikTok",
    "angle": "daily mineral ritual"
  }'
```

### JavaScript
```javascript
async function testVisualDirector() {
  const res = await fetch(`${API_BASE}/api/agents/visual-director/direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: "Sea Moss Mineral Gel",
      hook: "Nobody talks about this morning habit…",
      emotion: "curiosity",
      format: "UGC",
      platform: "TikTok",
      angle: "daily mineral ritual"
    })
  });
  const data = await res.json();
  console.log('Status:', data.status);
  console.log('Shot List:', data.shotList.length, 'shots');
  console.log('Render Prompts:', Object.keys(data.renderPrompts));
}
testVisualDirector();
```

### Expected Response
```json
{
  "agent": "VisualDirectorTwin",
  "status": "approved",
  "product": "Sea Moss Mineral Gel",
  "emotion": "curiosity",
  "format": "UGC",
  "primaryPlatform": "TikTok",
  "visualStyle": {
    "cameraAngle": "Handheld POV",
    "lighting": "Natural window light",
    "pacing": "Fast cuts — 0.5s hook, 1-2s scenes, 3s product reveal",
    "colorGrade": "Warm, authentic, slightly desaturated"
  },
  "platformSpecs": {
    "aspectRatio": "9:16",
    "optimalDuration": "15-30s",
    "captionStyle": "Bold subtitles, high contrast"
  },
  "shotList": [
    {
      "shot": 1,
      "type": "Hook Shot",
      "description": "Handheld POV — Nobody talks about this morning habit…",
      "duration": "0-1.5s",
      "notes": "0-2s: Pattern interrupt. No logo. Pure hook."
    }
  ],
  "renderPrompts": {
    "heygen": { /* ... */ },
    "runway": { /* ... */ },
    "kling": { /* ... */ }
  }
}
```

---

## 6. Copilot Suggest

### cURL
```bash
curl -X POST "${API_BASE}/api/agents/copilot/suggest" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Working on a TikTok UGC video for wellness",
    "content": "Nobody talks about this morning habit",
    "type": "hook"
  }'
```

### JavaScript
```javascript
async function testCopilotSuggest() {
  const res = await fetch(`${API_BASE}/api/agents/copilot/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: "TikTok UGC wellness video",
      content: "Nobody talks about this morning habit",
      type: "hook"
    })
  });
  const data = await res.json();
  console.log('Suggestions:', data.suggestions);
  console.log('Powered by:', data.source);
}
testCopilotSuggest();
```

### Expected Response (with API key)
```json
{
  "agent": "CopilotAssistant",
  "type": "hook",
  "suggestions": "1. Add specificity: mention a timeframe like '7 days'...\n2. Create a loop: make viewers curious to scroll...",
  "source": "openai",
  "powered": true
}
```

### Expected Response (without API key - fallback)
```json
{
  "agent": "CopilotAssistant",
  "type": "hook",
  "suggestions": "1. Lead with the transformation, not the product...\n2. Add a specific timeframe...",
  "source": "evics-intelligence",
  "powered": false,
  "note": "Set OPENAI_API_KEY or COPILOT_API_KEY to enable full AI suggestions."
}
```

---

## 7. Copilot Refine

### cURL
```bash
curl -X POST "${API_BASE}/api/agents/copilot/refine" \
  -H "Content-Type: application/json" \
  -d '{
    "selection": "Nobody talks about this morning habit",
    "type": "hook",
    "context": {
      "product": "Sea Moss Mineral Gel",
      "platform": "TikTok",
      "emotion": "curiosity"
    }
  }'
```

### JavaScript
```javascript
async function testCopilotRefine() {
  const res = await fetch(`${API_BASE}/api/agents/copilot/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selection: "Nobody talks about this morning habit",
      type: "hook",
      context: {
        product: "Sea Moss Mineral Gel",
        platform: "TikTok"
      }
    })
  });
  const data = await res.json();
  console.log('Refinement:', data.refinement);
}
testCopilotRefine();
```

### Expected Response
```json
{
  "agent": "CopilotAssistant",
  "action": "refine",
  "original": "Nobody talks about this morning habit",
  "refinement": "**Improved Version:**\nNobody tells you: this morning habit changed my energy in 7 days.\n\n**Why it performs better:**\nAdded specificity (7 days) and emotional payoff (energy change).\n\n**A/B Test Variant:**\nWhat if your morning energy problem wasn't about sleep?",
  "source": "openai",
  "powered": true
}
```

---

## 8. Copilot Explain

### cURL
```bash
curl -X POST "${API_BASE}/api/agents/copilot/explain" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "Selected Sea Moss Mineral Gel for Wellness trend",
    "data": {
      "fitScore": 92,
      "viralScore": 88,
      "productScore": 96
    }
  }'
```

### JavaScript
```javascript
async function testCopilotExplain() {
  const res = await fetch(`${API_BASE}/api/agents/copilot/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decision: "Selected Sea Moss Mineral Gel",
      data: {
        fitScore: 92,
        viralScore: 88
      }
    })
  });
  const data = await res.json();
  console.log('Explanation:', data.explanation);
}
testCopilotExplain();
```

### Expected Response
```json
{
  "agent": "CopilotAssistant",
  "action": "explain",
  "decision": "Selected Sea Moss Mineral Gel for Wellness trend",
  "explanation": "The AI matched Sea Moss Mineral Gel (fitScore: 92) to this viral trend because the product's mineral-focus aligns with the wellness category and curiosity emotion. The high viral score (88) indicates strong market demand. Proceed with script generation for TikTok UGC format.",
  "source": "openai",
  "powered": true
}
```

---

## 9. Full Pipeline Auto-Generate

### cURL
```bash
curl -X POST "${API_BASE}/api/agents/auto-generate" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### JavaScript
```javascript
async function testAutoGenerate() {
  const res = await fetch(`${API_BASE}/api/agents/auto-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  console.log('Pipeline Status:', data.status);
  console.log('Generated:', data.generated);
  console.log('Top Recommendation:', data.topRecommendation);
}
testAutoGenerate();
```

### Expected Response
```json
{
  "agent": "OfficeAgent",
  "pipeline": "auto_generate",
  "status": "complete",
  "pipelineId": "pipeline_1716820...",
  "duration": "2847ms",
  "generated": {
    "trends": 10,
    "productMatches": 8,
    "scripts": 4,
    "visualDirections": 1
  },
  "topRecommendation": {
    "hook": "Nobody talks about this morning habit…",
    "product": "Sea Moss Mineral Gel",
    "platform": "TikTok",
    "format": "UGC",
    "qualityScore": 92,
    "cameraAngle": "Handheld POV"
  },
  "copilotInsight": "Refined hook includes specificity...",
  "readyToRender": true,
  "nextStep": "Review top script (score: 92) and send to HeyGen, Runway, or Kling."
}
```

---

## 10. Full-Cycle Orchestration (Manual Control)

### cURL
```bash
curl -X POST "${API_BASE}/api/agents/orchestrate/full-cycle" \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["TikTok", "Instagram"],
    "categories": ["Wellness"],
    "formats": ["UGC", "Commercial"],
    "copilotRefine": true,
    "trendLimit": 15
  }'
```

### JavaScript
```javascript
async function testFullCycle() {
  const res = await fetch(`${API_BASE}/api/agents/orchestrate/full-cycle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platforms: ["TikTok", "Instagram"],
      categories: ["Wellness"],
      formats: ["UGC", "Commercial"],
      copilotRefine: true
    })
  });
  const data = await res.json();
  console.log('Pipeline completed in:', data.duration);
  console.log('Stages:', data.stagesCompleted);
}
testFullCycle();
```

---

## Smoke Test Script

Run all endpoints in sequence:

```javascript
async function smokeTest() {
  const tests = [
    { name: 'Agent Status', fn: testAgentStatus },
    { name: 'Trend Scout', fn: testTrendScout },
    { name: 'Product Match', fn: testProductMatch },
    { name: 'Script Writer', fn: testScriptWriter },
    { name: 'Visual Director', fn: testVisualDirector },
    { name: 'Copilot Suggest', fn: testCopilotSuggest },
    { name: 'Copilot Refine', fn: testCopilotRefine },
    { name: 'Copilot Explain', fn: testCopilotExplain },
    { name: 'Auto-Generate', fn: testAutoGenerate }
  ];

  for (const { name, fn } of tests) {
    try {
      console.log(`\n✓ Testing ${name}...`);
      await fn();
      console.log(`✓ ${name} passed`);
    } catch (err) {
      console.error(`✗ ${name} failed:`, err.message);
    }
  }
}

smokeTest();
```

---

## Success Criteria

- ✅ All endpoints return `200 OK`
- ✅ Response shapes match expected schema
- ✅ Supabase persistence works (check database)
- ✅ Agent status shows "operational"
- ✅ Copilot works with or without API key
- ✅ Auto-generate completes in under 10s
- ✅ Dashboard buttons trigger correct endpoints

