const OpenAI = require('openai');

const DEFAULT_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 30000);
const DEFAULT_PROMPT_MODEL = process.env.OPENAI_PROMPT_MODEL || 'gpt-4o-mini';
const DEFAULT_SCRIPT_MODEL = process.env.OPENAI_SCRIPT_MODEL || 'gpt-4o';
const DEFAULT_COPILOT_MODEL = process.env.OPENAI_COPILOT_MODEL || 'gpt-4o-mini';
const DEFAULT_ANALYSIS_MODEL = process.env.OPENAI_ANALYSIS_MODEL || 'gpt-4o-mini';

const PRICING_PER_1M_TOKENS = {
  'gpt-4o': { input: 5.00, output: 15.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 }
};

let client;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for LLM generation');
  }
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

function timeoutSignal(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function estimateCost(model, usage = {}) {
  const pricing = PRICING_PER_1M_TOKENS[model] || PRICING_PER_1M_TOKENS['gpt-4o-mini'];
  const inputTokens = usage.prompt_tokens || usage.input_tokens || 0;
  const outputTokens = usage.completion_tokens || usage.output_tokens || 0;
  return Number((((inputTokens / 1000000) * pricing.input) + ((outputTokens / 1000000) * pricing.output)).toFixed(6));
}

function safeJsonParse(content) {
  if (!content) return null;
  try { return JSON.parse(content); } catch (_err) {}
  const match = String(content).match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_err) {}
  }
  return null;
}

async function withRetry(label, operation, options = {}) {
  const retries = options.retries === undefined ? 2 : options.retries;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const retryable = error && (error.status >= 500 || error.code === 'rate_limit_exceeded' || error.name === 'AbortError');
      if (!retryable || attempt === retries) break;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  const wrapped = new Error('OpenAI ' + label + ' failed: ' + (lastError && lastError.message ? lastError.message : lastError));
  wrapped.cause = lastError;
  throw wrapped;
}

async function chatJson({ label, model, system, input, temperature = 0.7, top_p = 0.9, timeoutMs }) {
  return withRetry(label, async () => {
    const timer = timeoutSignal(timeoutMs);
    try {
      const response = await getClient().chat.completions.create({
        model,
        temperature,
        top_p,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(input, null, 2) }
        ]
      }, { signal: timer.signal });
      const content = response.choices && response.choices[0] && response.choices[0].message ? response.choices[0].message.content : '{}';
      const parsed = safeJsonParse(content);
      if (!parsed) throw new Error('LLM returned non-JSON output');
      return {
        data: parsed,
        usage: response.usage || {},
        model: response.model || model,
        estimatedCostUsd: estimateCost(response.model || model, response.usage || {})
      };
    } finally {
      timer.clear();
    }
  });
}

function buildCreativeSystemPrompt(task) {
  return [
    'You are EVICS Evie, a viral direct-response creative strategist.',
    'Preserve the deterministic viral intelligence: hooks, pacing, product fit, compliance, proof, faceless/creator mode, and CTA clarity.',
    'Write creative that is specific, visual, conversion-oriented, and suitable for HeyGen video handoff.',
    'Respect product compliance notes exactly. Avoid medical cures, guaranteed outcomes, disease claims, deceptive urgency, or unsupported claims.',
    'Task: ' + task + '. Return only valid JSON.'
  ].join(' ');
}

async function generatePrompt({ ranking, directive = {}, feedback = null } = {}) {
  const result = await chatJson({
    label: 'prompt generation',
    model: process.env.OPENAI_PROMPT_MODEL || DEFAULT_PROMPT_MODEL,
    temperature: 0.85,
    top_p: 0.92,
    system: buildCreativeSystemPrompt('Generate a creative video prompt object'),
    input: {
      expected_schema: {
        text: 'multi-line video generation prompt',
        creative_angle: 'short strategic angle',
        hook: 'opening hook line',
        visual_style: 'visual direction',
        pacing: 'pacing direction',
        cta: 'CTA direction',
        compliance_notes: ['claims or wording constraints']
      },
      ranking,
      directive,
      retry_feedback: feedback
    }
  });
  const data = result.data || {};
  const text = data.text || [
    data.hook,
    data.visual_style,
    data.pacing,
    data.cta,
    Array.isArray(data.compliance_notes) ? data.compliance_notes.join('; ') : data.compliance_notes
  ].filter(Boolean).join('\n');
  return { ...data, text, llm: { model: result.model, usage: result.usage, estimatedCostUsd: result.estimatedCostUsd } };
}

async function generateScript({ prompt, ranking, feedback = null } = {}) {
  const result = await chatJson({
    label: 'script generation',
    model: process.env.OPENAI_SCRIPT_MODEL || DEFAULT_SCRIPT_MODEL,
    temperature: 0.78,
    top_p: 0.9,
    system: buildCreativeSystemPrompt('Write a concise conversion video script with scene timing'),
    input: {
      expected_schema: {
        hook: 'spoken or on-screen hook',
        scenes: [{ type: 'hook/proof/demo/cta', text: 'scene copy', seconds: 'time range' }],
        voiceover: 'full script voiceover text',
        captions: ['short captions'],
        cta: 'final call to action',
        compliance_notes: ['claim-safety notes']
      },
      prompt,
      ranking,
      retry_feedback: feedback
    }
  });
  const data = result.data || {};
  const scenes = Array.isArray(data.scenes) ? data.scenes : [];
  return { ...data, scenes, llm: { model: result.model, usage: result.usage, estimatedCostUsd: result.estimatedCostUsd } };
}

async function generateCopilotResponse({ operatorCommand, context = {}, wisdom = {}, feedback = null } = {}) {
  const result = await chatJson({
    label: 'copilot response',
    model: process.env.OPENAI_COPILOT_MODEL || DEFAULT_COPILOT_MODEL,
    temperature: 0.55,
    top_p: 0.85,
    system: [
      'You are EVICS Evie Copilot, a practical AI creative operations assistant.',
      'Answer conversationally, recommend concrete next actions, and preserve compliance-first creative decisions.',
      'Return only valid JSON with response, actions, risk_flags, and confidence.'
    ].join(' '),
    input: {
      expected_schema: {
        response: 'conversational assistant answer',
        actions: ['recommended next actions'],
        risk_flags: ['compliance or execution risks'],
        confidence: 'low/medium/high'
      },
      operatorCommand,
      context,
      wisdom,
      retry_feedback: feedback
    }
  });
  return { ...result.data, llm: { model: result.model, usage: result.usage, estimatedCostUsd: result.estimatedCostUsd } };
}

async function generateViralInsight({ ad, score, classification } = {}) {
  const result = await chatJson({
    label: 'viral insight',
    model: process.env.OPENAI_ANALYSIS_MODEL || DEFAULT_ANALYSIS_MODEL,
    temperature: 0.35,
    top_p: 0.8,
    system: 'You are a viral ad analyst. Keep the numeric score primary and add a concise qualitative explanation. Return only valid JSON.',
    input: {
      expected_schema: { viral_insight: '1-2 sentence qualitative score explanation' },
      ad,
      arithmetic_score: score,
      classification
    }
  });
  return { ...result.data, llm: { model: result.model, usage: result.usage, estimatedCostUsd: result.estimatedCostUsd } };
}

module.exports = {
  generatePrompt,
  generateScript,
  generateCopilotResponse,
  generateViralInsight,
  estimateCost
};
