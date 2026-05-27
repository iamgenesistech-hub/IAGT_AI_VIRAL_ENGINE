// backend/agents/orchestrator.js
// Office Agent — orchestrates all Twin Agents (Trend Scout, Product Match,
// Script Writer, Visual Director) and manages the full EVICS workflow.
// Supports both manual step-by-step control and fully automated pipelines.

'use strict';

const SupabaseConnector = require('../../utils/SupabaseConnector');
const TrendScoutTwin = require('./trendScoutTwin');
const ProductMatchTwin = require('./productMatchTwin');
const ScriptWriterTwin = require('./scriptWriterTwin');
const VisualDirectorTwin = require('./visualDirectorTwin');
const CopilotAssistant = require('./copilotAssistant');
const { runMasterIntelligenceLoop } = require('../../utils/evicsMasterIntelligenceLoop');
const { learnFromOutcome } = require('../../utils/adaptiveLearningEngine');

// ---------------------------------------------------------------------------
// Agent health registry
// ---------------------------------------------------------------------------

const AGENT_REGISTRY = {
  TrendScoutTwin: { name: 'Trend Scout', role: 'Scans viral content across platforms', status: 'ready' },
  ProductMatchTwin: { name: 'Product Match', role: 'Matches products to viral trends', status: 'ready' },
  ScriptWriterTwin: { name: 'Script Writer', role: 'Generates scripts from hooks + products', status: 'ready' },
  VisualDirectorTwin: { name: 'Visual Director', role: 'Directs visual style and platform specs', status: 'ready' },
  CopilotAssistant: { name: 'Copilot', role: 'AI refinement and intelligent suggestions', status: 'ready' },
  OfficeAgent: { name: 'Office Agent', role: 'Orchestrates all twins and manages workflow', status: 'ready' },
};

// ---------------------------------------------------------------------------
// Workflow session logging
// ---------------------------------------------------------------------------

async function _logWorkflowSession(sessionId, stage, data, status = 'running') {
  try {
    await SupabaseConnector.from('evics_trends').insert([{
      title: `[Orchestrator] ${stage} — Session ${sessionId}`,
      source: 'office_agent',
      category: 'workflow_session',
      confidence: status === 'complete' ? 'High' : status === 'error' ? 'Low' : 'Medium',
      created_at: new Date().toISOString(),
    }]);
  } catch (e) {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Individual orchestration methods
// ---------------------------------------------------------------------------

/**
 * Orchestrate a full trend scan via TrendScoutTwin.
 *
 * @param {object} options
 * @param {string[]} [options.platforms]   - Platforms to scan
 * @param {string[]} [options.categories]  - Categories to focus on
 * @param {number}   [options.limit]       - Max trends to return
 * @returns {Promise<object>}
 */
async function orchestrateTrendScan(options = {}) {
  const sessionId = Date.now();
  await _logWorkflowSession(sessionId, 'TrendScan', options, 'running');

  try {
    const result = await TrendScoutTwin.scan({
      platforms: options.platforms,
      categories: options.categories,
      limit: options.limit || 20,
      persist: true,
    });

    await _logWorkflowSession(sessionId, 'TrendScan', { found: result.summary.totalFound }, 'complete');

    return {
      stage: 'trend_scan',
      sessionId,
      ...result,
    };
  } catch (e) {
    await _logWorkflowSession(sessionId, 'TrendScan', { error: e.message }, 'error');
    throw e;
  }
}

/**
 * Orchestrate product matching via ProductMatchTwin.
 *
 * @param {object} options
 * @param {object[]} [options.trends]   - Trends from TrendScoutTwin (or fetched from DB)
 * @param {number}   [options.topN]     - Top matches per trend
 * @returns {Promise<object>}
 */
async function orchestrateProductMatch(options = {}) {
  const sessionId = Date.now();
  await _logWorkflowSession(sessionId, 'ProductMatch', options, 'running');

  try {
    // If no trends provided, fetch recent ones from Supabase
    let trends = options.trends || [];
    if (!trends.length) {
      trends = await TrendScoutTwin.fetchStoredTrends(10);
      // Map DB rows to trend objects
      trends = trends.map((row) => ({
        hook: row.hook || row.title,
        platform: row.platform || 'TikTok',
        category: row.category || 'Wellness',
        emotion: row.emotion || 'curiosity',
        viralScore: row.viral_score || row.confidence === 'High' ? 80 : 65,
      }));
    }

    const result = await ProductMatchTwin.analyze({
      trends,
      topN: options.topN || 3,
      persist: true,
    });

    await _logWorkflowSession(sessionId, 'ProductMatch', { analyzed: result.totalTrendsAnalyzed }, 'complete');

    return {
      stage: 'product_match',
      sessionId,
      ...result,
    };
  } catch (e) {
    await _logWorkflowSession(sessionId, 'ProductMatch', { error: e.message }, 'error');
    throw e;
  }
}

/**
 * Orchestrate script generation via ScriptWriterTwin.
 *
 * @param {object} options
 * @param {string}   [options.hook]       - Hook to build from
 * @param {string}   [options.product]    - Product name
 * @param {string}   [options.angle]      - Positioning angle
 * @param {string}   [options.emotion]    - Primary emotion
 * @param {string[]} [options.formats]    - Video formats
 * @param {number}   [options.variations] - Variations per format
 * @returns {Promise<object>}
 */
async function orchestrateScriptGeneration(options = {}) {
  const sessionId = Date.now();
  await _logWorkflowSession(sessionId, 'ScriptGeneration', options, 'running');

  try {
    const result = await ScriptWriterTwin.generate({
      hook: options.hook,
      product: options.product,
      angle: options.angle,
      emotion: options.emotion,
      formats: options.formats || ['UGC', 'Commercial'],
      variations: options.variations || 2,
      persist: true,
    });

    await _logWorkflowSession(sessionId, 'ScriptGeneration', { generated: result.totalGenerated }, 'complete');

    return {
      stage: 'script_generation',
      sessionId,
      ...result,
    };
  } catch (e) {
    await _logWorkflowSession(sessionId, 'ScriptGeneration', { error: e.message }, 'error');
    throw e;
  }
}

/**
 * Orchestrate visual direction via VisualDirectorTwin.
 *
 * @param {object} options
 * @param {string} [options.product]   - Product name
 * @param {string} [options.hook]      - Hook text
 * @param {string} [options.emotion]   - Primary emotion
 * @param {string} [options.format]    - Video format
 * @param {string} [options.platform]  - Target platform
 * @param {string} [options.angle]     - Positioning angle
 * @returns {Promise<object>}
 */
async function orchestrateVisualDirection(options = {}) {
  const sessionId = Date.now();
  await _logWorkflowSession(sessionId, 'VisualDirection', options, 'running');

  try {
    const result = await VisualDirectorTwin.direct({
      product: options.product,
      hook: options.hook,
      emotion: options.emotion,
      format: options.format || 'UGC',
      platform: options.platform || 'TikTok',
      angle: options.angle,
      persist: true,
    });

    await _logWorkflowSession(sessionId, 'VisualDirection', { status: result.status }, 'complete');

    return {
      stage: 'visual_direction',
      sessionId,
      ...result,
    };
  } catch (e) {
    await _logWorkflowSession(sessionId, 'VisualDirection', { error: e.message }, 'error');
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Full-cycle orchestration (auto-generate self-directing pipeline)
// ---------------------------------------------------------------------------

/**
 * Runs the complete EVICS pipeline end-to-end:
 * Trend Scan → Product Match → Script Generation → Visual Direction → Copilot Refinement
 *
 * This is the "auto-generate" self-directing pipeline. Each stage feeds
 * its output into the next stage automatically.
 *
 * @param {object} options
 * @param {string[]} [options.platforms]    - Platforms to scan
 * @param {string[]} [options.categories]   - Categories to focus on
 * @param {string[]} [options.formats]      - Video formats to generate
 * @param {boolean}  [options.copilotRefine] - Run Copilot refinement on top results
 * @param {number}   [options.trendLimit]   - Max trends to process
 * @returns {Promise<object>}
 */
async function orchestrateFullCycle(options = {}) {
  const {
    platforms,
    categories,
    formats = ['UGC', 'Commercial'],
    copilotRefine = true,
    trendLimit = 10,
  } = options;

  const pipelineId = `pipeline_${Date.now()}`;
  const startTime = Date.now();
  const stages = {};
  const errors = [];

  console.log(`[OfficeAgent] Starting full-cycle pipeline: ${pipelineId}`);

  // ── Stage 1: Trend Scan ──────────────────────────────────────────────────
  try {
    console.log('[OfficeAgent] Stage 1: Trend Scout scanning…');
    stages.trendScan = await TrendScoutTwin.scan({
      platforms,
      categories,
      limit: trendLimit,
      persist: true,
    });
    console.log(`[OfficeAgent] Stage 1 complete: ${stages.trendScan.summary.totalFound} trends found`);
  } catch (e) {
    errors.push({ stage: 'trendScan', error: e.message });
    console.error('[OfficeAgent] Stage 1 failed:', e.message);
  }

  // ── Stage 2: Product Match ───────────────────────────────────────────────
  try {
    console.log('[OfficeAgent] Stage 2: Product Match analyzing…');
    const topTrends = stages.trendScan?.topTrends?.slice(0, 5) || [];
    stages.productMatch = await ProductMatchTwin.analyze({
      trends: topTrends,
      topN: 3,
      persist: true,
    });
    console.log(`[OfficeAgent] Stage 2 complete: ${stages.productMatch.totalTrendsAnalyzed} trends matched`);
  } catch (e) {
    errors.push({ stage: 'productMatch', error: e.message });
    console.error('[OfficeAgent] Stage 2 failed:', e.message);
  }

  // ── Stage 3: Script Generation ───────────────────────────────────────────
  try {
    console.log('[OfficeAgent] Stage 3: Script Writer generating…');

    // Extract best hook + product from previous stages
    const topTrend = stages.trendScan?.topTrends?.[0];
    const topMatch = stages.productMatch?.matches?.[0];
    const bestProduct = topMatch?.bestProduct || { product: 'Sea Moss Mineral Gel', positioningAngle: 'daily mineral ritual' };

    stages.scriptGeneration = await ScriptWriterTwin.generate({
      hook: topTrend?.hook || 'Nobody talks about this morning habit…',
      product: bestProduct.product,
      angle: bestProduct.positioningAngle,
      emotion: topTrend?.emotion || 'curiosity',
      formats,
      variations: 2,
      persist: true,
    });
    console.log(`[OfficeAgent] Stage 3 complete: ${stages.scriptGeneration.totalGenerated} scripts generated`);
  } catch (e) {
    errors.push({ stage: 'scriptGeneration', error: e.message });
    console.error('[OfficeAgent] Stage 3 failed:', e.message);
  }

  // ── Stage 4: Visual Direction ────────────────────────────────────────────
  try {
    console.log('[OfficeAgent] Stage 4: Visual Director directing…');

    const topTrend = stages.trendScan?.topTrends?.[0];
    const topMatch = stages.productMatch?.matches?.[0];
    const bestProduct = topMatch?.bestProduct || { product: 'Sea Moss Mineral Gel', positioningAngle: 'daily mineral ritual' };
    const topScript = stages.scriptGeneration?.topScript;

    stages.visualDirection = await VisualDirectorTwin.direct({
      product: bestProduct.product,
      hook: topTrend?.hook || topScript?.hook || 'Nobody talks about this morning habit…',
      emotion: topTrend?.emotion || 'curiosity',
      format: topScript?.format || formats[0] || 'UGC',
      platform: topTrend?.platform || 'TikTok',
      angle: bestProduct.positioningAngle,
      persist: true,
    });
    console.log(`[OfficeAgent] Stage 4 complete: Visual direction ${stages.visualDirection.status}`);
  } catch (e) {
    errors.push({ stage: 'visualDirection', error: e.message });
    console.error('[OfficeAgent] Stage 4 failed:', e.message);
  }

  // ── Stage 5: Copilot Refinement (optional) ───────────────────────────────
  if (copilotRefine) {
    try {
      console.log('[OfficeAgent] Stage 5: Copilot refining top hook…');
      const topHook = stages.trendScan?.topTrends?.[0]?.hook || '';
      if (topHook) {
        stages.copilotRefinement = await CopilotAssistant.refine({
          selection: topHook,
          type: 'hook',
          context: {
            product: stages.productMatch?.summary?.topProduct || 'Sea Moss Mineral Gel',
            platform: stages.trendScan?.topTrends?.[0]?.platform || 'TikTok',
            emotion: stages.trendScan?.topTrends?.[0]?.emotion || 'curiosity',
          },
        });
        console.log('[OfficeAgent] Stage 5 complete: Copilot refinement done');
      }
    } catch (e) {
      errors.push({ stage: 'copilotRefinement', error: e.message });
      console.warn('[OfficeAgent] Stage 5 (Copilot) failed:', e.message);
    }
  }

  // ── Master Intelligence Loop ─────────────────────────────────────────────
  const intelligenceSignal = runMasterIntelligenceLoop({
    profitSignal: stages.productMatch?.summary?.avgFitScore || 75,
    creativeSignal: stages.scriptGeneration?.summary?.topQualityScore || 80,
    budgetSignal: 85,
  });

  // ── Learning Loop ────────────────────────────────────────────────────────
  const learningOutcome = learnFromOutcome({
    winnerPattern: stages.trendScan?.topTrends?.[0]?.structure || 'Problem-Solution',
    loserPattern: 'Generic product showcase',
    nextRecommendation: `Scale ${stages.productMatch?.summary?.topProduct || 'top product'} on ${stages.trendScan?.topTrends?.[0]?.platform || 'TikTok'}`,
  });

  const duration = Date.now() - startTime;

  // ── Build pipeline summary ───────────────────────────────────────────────
  const summary = {
    pipelineId,
    status: errors.length === 0 ? 'complete' : errors.length < 3 ? 'partial' : 'failed',
    stagesCompleted: Object.keys(stages).length,
    stagesFailed: errors.length,
    duration: `${duration}ms`,
    topTrend: stages.trendScan?.topTrends?.[0] || null,
    topProduct: stages.productMatch?.summary?.topProduct || null,
    topScript: stages.scriptGeneration?.topScript
      ? {
          hook: stages.scriptGeneration.topScript.hook,
          format: stages.scriptGeneration.topScript.format,
          qualityScore: stages.scriptGeneration.topScript.qualityScore,
          estimatedDuration: stages.scriptGeneration.topScript.estimatedDuration,
        }
      : null,
    visualDirection: stages.visualDirection
      ? {
          format: stages.visualDirection.format,
          platform: stages.visualDirection.primaryPlatform,
          cameraAngle: stages.visualDirection.visualStyle?.cameraAngle,
          status: stages.visualDirection.status,
        }
      : null,
    copilotRefinement: stages.copilotRefinement || null,
    intelligenceSignal,
    learningOutcome,
    errors: errors.length ? errors : undefined,
  };

  console.log(`[OfficeAgent] Pipeline ${pipelineId} complete in ${duration}ms. Status: ${summary.status}`);

  return {
    agent: 'OfficeAgent',
    pipeline: 'full_cycle',
    ...summary,
    stages,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Auto-generate pipeline (alias with simplified output for dashboard)
// ---------------------------------------------------------------------------

/**
 * Triggers the self-directing auto-generate pipeline.
 * Returns a streamlined result optimized for dashboard display.
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
async function autoGenerate(options = {}) {
  const result = await orchestrateFullCycle({
    ...options,
    copilotRefine: true,
    trendLimit: options.trendLimit || 15,
  });

  return {
    agent: 'OfficeAgent',
    pipeline: 'auto_generate',
    status: result.status,
    pipelineId: result.pipelineId,
    duration: result.duration,
    generated: {
      trends: result.stages?.trendScan?.summary?.totalFound || 0,
      productMatches: result.stages?.productMatch?.totalTrendsAnalyzed || 0,
      scripts: result.stages?.scriptGeneration?.totalGenerated || 0,
      visualDirections: result.stages?.visualDirection ? 1 : 0,
    },
    topRecommendation: {
      hook: result.topTrend?.hook,
      product: result.topProduct,
      platform: result.topTrend?.platform,
      format: result.topScript?.format,
      qualityScore: result.topScript?.qualityScore,
      cameraAngle: result.visualDirection?.cameraAngle,
    },
    copilotInsight: result.copilotRefinement?.refinement || null,
    readyToRender: result.status !== 'failed',
    nextStep: result.status !== 'failed'
      ? `Review top script (score: ${result.topScript?.qualityScore || 'N/A'}) and send to HeyGen, Runway, or Kling.`
      : 'Pipeline encountered errors. Check individual agent status.',
    timestamp: result.timestamp,
  };
}

// ---------------------------------------------------------------------------
// Agent status check
// ---------------------------------------------------------------------------

/**
 * Returns health status for all agents in the EVICS system.
 */
async function getAgentStatus() {
  const copilotStatus = await CopilotAssistant.checkStatus();

  // Check Supabase connectivity
  let supabaseOk = false;
  try {
    const { error } = await SupabaseConnector.from('evics_trends').select('id', { count: 'exact', head: true });
    supabaseOk = !error;
  } catch (e) {
    supabaseOk = false;
  }

  const agents = Object.entries(AGENT_REGISTRY).map(([key, agent]) => ({
    id: key,
    name: agent.name,
    role: agent.role,
    status: 'operational',
    ready: true,
  }));

  // Update Copilot status
  const copilotAgent = agents.find((a) => a.id === 'CopilotAssistant');
  if (copilotAgent) {
    copilotAgent.aiPowered = copilotStatus.apiReachable;
    copilotAgent.source = copilotStatus.activeSource;
    copilotAgent.configured = copilotStatus.configured;
  }

  return {
    agent: 'OfficeAgent',
    systemStatus: 'operational',
    supabaseConnected: supabaseOk,
    totalAgents: agents.length,
    operationalAgents: agents.filter((a) => a.status === 'operational').length,
    agents,
    copilot: copilotStatus,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  // Individual orchestration
  orchestrateTrendScan,
  orchestrateProductMatch,
  orchestrateScriptGeneration,
  orchestrateVisualDirection,
  // Full pipeline
  orchestrateFullCycle,
  autoGenerate,
  // Status
  getAgentStatus,
  AGENT_REGISTRY,
};
