// backend/agents/copilotAssistant.js
// Copilot Assistant — integrates with OpenAI (or Copilot-compatible API),
// provides real-time suggestions, refines user selections, and explains
// AI decisions across the EVICS pipeline.

'use strict';

// ---------------------------------------------------------------------------
// Copilot configuration
// Supports: OpenAI GPT-4o, Azure OpenAI (Copilot), or local fallback
// ---------------------------------------------------------------------------

const COPILOT_CONFIG = {
  // Primary: OpenAI API (also compatible with Azure OpenAI / GitHub Copilot API)
  openaiEndpoint: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
  openaiKey: process.env.OPENAI_API_KEY || process.env.COPILOT_API_KEY || '',
  model: process.env.COPILOT_MODEL || 'gpt-4o',
  maxTokens: 1200,
  temperature: 0.7,

  // Azure OpenAI (Copilot) override
  azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
  azureKey: process.env.AZURE_OPENAI_KEY || '',
  azureDeployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
};

// ---------------------------------------------------------------------------
// Brand context injected into every Copilot prompt
// ---------------------------------------------------------------------------

const BRAND_SYSTEM_PROMPT = `You are the EVICS Copilot — the AI intelligence layer of the I AM GENESIS TECH viral marketing system.

Your role:
- Help the marketing team make better decisions about viral content, hooks, scripts, and video production
- Provide concise, actionable suggestions grounded in direct-response marketing principles
- Explain AI decisions in plain language
- Refine user selections to maximize conversion potential
- Always align with the brand voice: elite, futuristic, clinical-luxury, transformational, high-converting

Brand: I AM GENESIS TECH
Products: Premium supplements — Sea Moss, Collagen, Testosterone Support, Nootropics, Wellness Bundles
Audience: Health-conscious shoppers, athletes, wellness buyers, men and women seeking transformation
Tone: Elite, futuristic, clinical-luxury, transformational, high-converting

Keep responses focused and actionable. No fluff. Every word earns its place.`;

// ---------------------------------------------------------------------------
// API call wrapper
// ---------------------------------------------------------------------------

/**
 * Makes a call to the Copilot/OpenAI API.
 * Falls back to intelligent rule-based responses if no API key is configured.
 */
async function _callCopilotAPI(messages, options = {}) {
  const { maxTokens = COPILOT_CONFIG.maxTokens, temperature = COPILOT_CONFIG.temperature } = options;

  // Try Azure OpenAI first (Copilot)
  if (COPILOT_CONFIG.azureKey && COPILOT_CONFIG.azureEndpoint) {
    try {
      const url = `${COPILOT_CONFIG.azureEndpoint}/openai/deployments/${COPILOT_CONFIG.azureDeployment}/chat/completions?api-version=2024-02-01`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': COPILOT_CONFIG.azureKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages, max_tokens: maxTokens, temperature }),
      });
      if (response.ok) {
        const data = await response.json();
        return { success: true, content: data.choices[0]?.message?.content || '', source: 'azure-copilot' };
      }
    } catch (e) {
      console.warn('[CopilotAssistant] Azure OpenAI call failed:', e.message);
    }
  }

  // Try OpenAI API
  if (COPILOT_CONFIG.openaiKey) {
    try {
      const response = await fetch(`${COPILOT_CONFIG.openaiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${COPILOT_CONFIG.openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: COPILOT_CONFIG.model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return { success: true, content: data.choices[0]?.message?.content || '', source: 'openai' };
      }
    } catch (e) {
      console.warn('[CopilotAssistant] OpenAI call failed:', e.message);
    }
  }

  // Fallback: rule-based intelligent response
  return { success: false, content: null, source: 'fallback' };
}

// ---------------------------------------------------------------------------
// Rule-based fallback intelligence
// Used when no API key is configured — still provides real value
// ---------------------------------------------------------------------------

const HOOK_IMPROVEMENT_RULES = [
  { pattern: /nobody/i, suggestion: 'Strong pattern interrupt. Add a specific timeframe: "Nobody talks about this 7-day morning habit…"' },
  { pattern: /i tried/i, suggestion: 'Good testimonial opener. Add specificity: "I tried this for 30 days and my [specific result] changed."' },
  { pattern: /stop/i, suggestion: 'Pattern interrupt works. Follow with an immediate benefit: "Stop scrolling — this is the only supplement that actually [specific benefit]."' },
  { pattern: /this changed/i, suggestion: 'Proof-based hook. Add a timeframe and no-filter qualifier: "This changed my [specific thing] in 7 days — no filter, no edits."' },
  { pattern: /what if/i, suggestion: 'Reframe hook. Make the reframe more specific: "What if your [problem] was never about [common assumption]?"' },
];

function _ruleBasedSuggestion(context, type) {
  const suggestions = {
    hook: [
      'Lead with the transformation, not the product. The product is the vehicle, not the destination.',
      'Add a specific timeframe (7 days, 30 days, 90 days) — specificity builds credibility.',
      'Use "nobody talks about" or "I stopped treating X like Y" — these are proven pattern interrupts.',
      'The first 1.5 seconds must create a loop in the viewer\'s mind. Ask a question they can\'t ignore.',
      'Avoid starting with the brand name. Start with the viewer\'s pain or aspiration.',
    ],
    script: [
      'Your hook is strong. Make sure the problem scene (scene 2) amplifies the pain before introducing the solution.',
      'The product reveal should feel earned — not forced. Build tension first.',
      'Add a social proof moment: one real customer result, even as text overlay.',
      'Your CTA needs urgency. "Today" and "now" outperform "whenever you\'re ready".',
      'Consider a pattern interrupt at the 3-second mark to re-hook viewers who almost scrolled.',
    ],
    product: [
      'Lead with the transformation angle, not the ingredient list. Benefits over features.',
      'Position against the viewer\'s current failed solution, not against competitors.',
      'Bundle products perform 23% better in UGC formats — consider featuring the bundle.',
      'The "daily ritual" angle consistently outperforms "supplement" positioning in wellness.',
      'Use the product name in the hook only if it\'s already a known brand. Otherwise, lead with the result.',
    ],
    visual: [
      'The first frame must be visually distinct from everything else in the feed. Break the pattern.',
      'Warm color grades outperform cool grades for wellness and beauty products by 18%.',
      'Handheld, slightly imperfect footage outperforms polished studio shots in UGC formats.',
      'Show the product being used, not just displayed. Action beats static.',
      'Subtitles increase watch time by 40% on TikTok and Instagram. Always add them.',
    ],
    general: [
      'The EVICS pipeline is optimized for direct-response. Every element should drive toward one action.',
      'Test 3 hook variations before scaling. The winning hook is rarely the first one written.',
      'Platform-first thinking: TikTok rewards authenticity, Instagram rewards aesthetics, YouTube rewards depth.',
      'Your emotional arc should be: curiosity → tension → belief → confidence. Never skip tension.',
      'The best-performing ads feel like content, not ads. Authenticity is the competitive advantage.',
    ],
  };

  const pool = suggestions[type] || suggestions.general;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get real-time Copilot suggestions for a given context.
 *
 * @param {object} options
 * @param {string} options.context    - What the user is working on (hook, script, product, visual)
 * @param {string} [options.content]  - The current content to suggest improvements for
 * @param {string} [options.type]     - Suggestion type: 'hook' | 'script' | 'product' | 'visual' | 'general'
 * @returns {Promise<object>}
 */
async function suggest(options = {}) {
  const { context = '', content = '', type = 'general' } = options;

  const messages = [
    { role: 'system', content: BRAND_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `I'm working on a ${type} for the EVICS system. Here's what I have:\n\n"${content}"\n\nContext: ${context}\n\nGive me 3 specific, actionable suggestions to improve this. Be direct and concise.`,
    },
  ];

  const apiResult = await _callCopilotAPI(messages, { maxTokens: 600 });

  if (apiResult.success && apiResult.content) {
    return {
      agent: 'CopilotAssistant',
      type,
      suggestions: apiResult.content,
      source: apiResult.source,
      powered: true,
      timestamp: new Date().toISOString(),
    };
  }

  // Fallback: rule-based
  const fallbackSuggestion = _ruleBasedSuggestion(context, type);
  const hookRule = HOOK_IMPROVEMENT_RULES.find((r) => r.pattern.test(content));

  return {
    agent: 'CopilotAssistant',
    type,
    suggestions: [
      fallbackSuggestion,
      hookRule ? hookRule.suggestion : _ruleBasedSuggestion(context, type),
      _ruleBasedSuggestion(context, 'general'),
    ].join('\n\n'),
    source: 'evics-intelligence',
    powered: false,
    note: 'Set OPENAI_API_KEY or COPILOT_API_KEY to enable full AI suggestions.',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Refine a user selection with Copilot intelligence.
 *
 * @param {object} options
 * @param {string} options.selection  - What the user selected (hook text, script, product name)
 * @param {string} options.type       - Type: 'hook' | 'script' | 'product' | 'visual'
 * @param {object} [options.context]  - Additional context (platform, emotion, product, etc.)
 * @returns {Promise<object>}
 */
async function refine(options = {}) {
  const { selection = '', type = 'hook', context = {} } = options;

  const contextStr = Object.entries(context)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const messages = [
    { role: 'system', content: BRAND_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Refine this ${type} for maximum conversion performance:\n\n"${selection}"\n\nContext: ${contextStr || 'I AM GENESIS TECH wellness brand'}\n\nProvide:\n1. An improved version\n2. Why it performs better\n3. One A/B test variation\n\nBe specific and direct.`,
    },
  ];

  const apiResult = await _callCopilotAPI(messages, { maxTokens: 800 });

  if (apiResult.success && apiResult.content) {
    return {
      agent: 'CopilotAssistant',
      action: 'refine',
      type,
      original: selection,
      refinement: apiResult.content,
      source: apiResult.source,
      powered: true,
      timestamp: new Date().toISOString(),
    };
  }

  // Fallback refinement
  const refinements = {
    hook: {
      improved: selection.replace(/\.\.\.$/, ' — and it changed everything.').replace(/^I /, 'I finally '),
      reason: 'Added specificity and emotional payoff to increase curiosity loop completion.',
      abVariant: `What if ${selection.toLowerCase().replace(/^[^a-z]*/, '')}`,
    },
    script: {
      improved: `[REFINED] ${selection}\n\n[ADDED] Social proof moment: "Over 10,000 customers started this ritual. Here's what they said."`,
      reason: 'Social proof insertion at the proof scene increases conversion by 15-25%.',
      abVariant: selection.replace(/today/gi, 'this week').replace(/now/gi, 'before you scroll'),
    },
    product: {
      improved: selection,
      reason: 'Product positioning is strong. Focus on the transformation angle in the hook.',
      abVariant: `The ${selection} ritual`,
    },
    visual: {
      improved: selection,
      reason: 'Visual direction is solid. Ensure the first frame breaks the feed pattern.',
      abVariant: selection.replace(/UGC/i, 'Luxury UGC hybrid'),
    },
  };

  const fallback = refinements[type] || refinements.hook;

  return {
    agent: 'CopilotAssistant',
    action: 'refine',
    type,
    original: selection,
    refinement: `**Improved Version:**\n${fallback.improved}\n\n**Why it performs better:**\n${fallback.reason}\n\n**A/B Test Variant:**\n${fallback.abVariant}`,
    source: 'evics-intelligence',
    powered: false,
    note: 'Set OPENAI_API_KEY or COPILOT_API_KEY to enable full AI refinement.',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Explain an AI decision in plain language.
 *
 * @param {object} options
 * @param {string} options.decision   - The AI decision to explain
 * @param {object} [options.data]     - Supporting data (scores, metrics, etc.)
 * @returns {Promise<object>}
 */
async function explain(options = {}) {
  const { decision = '', data = {} } = options;

  const dataStr = JSON.stringify(data, null, 2);

  const messages = [
    { role: 'system', content: BRAND_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Explain this AI decision in plain language for a marketing team member:\n\nDecision: ${decision}\n\nData: ${dataStr}\n\nExplain in 2-3 sentences: what the AI decided, why, and what action the team should take.`,
    },
  ];

  const apiResult = await _callCopilotAPI(messages, { maxTokens: 400 });

  if (apiResult.success && apiResult.content) {
    return {
      agent: 'CopilotAssistant',
      action: 'explain',
      decision,
      explanation: apiResult.content,
      source: apiResult.source,
      powered: true,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    agent: 'CopilotAssistant',
    action: 'explain',
    decision,
    explanation: `The EVICS system made this decision based on viral score analysis, product-trend fit scoring, and historical performance patterns. The recommendation is grounded in direct-response marketing principles optimized for the I AM GENESIS TECH brand. Review the supporting data and proceed if the scores align with your campaign goals.`,
    source: 'evics-intelligence',
    powered: false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check Copilot API connectivity and configuration status.
 */
async function checkStatus() {
  const hasOpenAI = Boolean(COPILOT_CONFIG.openaiKey);
  const hasAzure = Boolean(COPILOT_CONFIG.azureKey && COPILOT_CONFIG.azureEndpoint);
  const isConfigured = hasOpenAI || hasAzure;

  let apiReachable = false;
  let activeSource = 'evics-intelligence (fallback)';

  if (isConfigured) {
    try {
      const testResult = await _callCopilotAPI([
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Reply with: OK' },
      ], { maxTokens: 10 });
      apiReachable = testResult.success;
      if (apiReachable) activeSource = testResult.source;
    } catch (e) {
      apiReachable = false;
    }
  }

  return {
    agent: 'CopilotAssistant',
    configured: isConfigured,
    apiReachable,
    activeSource,
    model: COPILOT_CONFIG.model,
    hasOpenAI,
    hasAzure,
    fallbackAvailable: true,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  suggest,
  refine,
  explain,
  checkStatus,
};
