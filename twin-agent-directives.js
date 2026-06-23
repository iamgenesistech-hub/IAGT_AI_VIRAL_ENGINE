function buildTwinDirective(task = {}, media = {}, provider = "HeyGen") {
  const nextAgent = media?.metadata_json?.nextAgent || task?.handoff?.nextAgent || "Quality Validator";
  return {
    taskId: task.taskId || task.id || "",
    campaignName: media.campaign_id || task.assignedModule || "EVICS Campaign",
    productSku: media.metadata_json?.productName || media.product_url || "",
    videoFormat: media.media_type === "video" ? "short-form vertical video" : media.media_type || "media",
    selectedTemplate: media.metadata_json?.template || "premium-ugc",
    provider,
    script: media.metadata_json?.script || media.description || "",
    sceneInstructions: media.metadata_json?.sceneInstructions || [
      "Open with a product-forward hook.",
      "Show the wellness or performance routine.",
      "Close with the approved Buy Now CTA."
    ],
    musicAudioInstructions: media.metadata_json?.audio || "Use clear professional narration and brand-safe background audio.",
    brandRules: media.metadata_json?.brandRules || [],
    complianceRules: media.metadata_json?.complianceRules || [
      "Do not make disease treatment claims.",
      "Keep all claims compliant and product-relevant."
    ],
    renderSettings: {
      durationSeconds: media.duration_seconds || 30,
      width: media.width || 1080,
      height: media.height || 1920
    },
    outputDestination: "EVICS media registry",
    qualityChecklist: [
      "Brand alignment",
      "Product relevance",
      "Hook clarity",
      "Visual quality",
      "Audio quality",
      "CTA clarity",
      "Compliance safety"
    ],
    handoff: {
      fromAgent: task.assignedModule || "EVICS",
      toAgent: nextAgent,
      objective: task.sourceCommand || task.objective || "",
      acceptanceCriteria: [
        "Return a playable provider URL or a specific failure reason.",
        "Preserve product visibility and brand constraints.",
        "Emit quality evidence for the next agent."
      ],
      evidence: Array.isArray(task?.stepLogs) ? task.stepLogs.slice(-5) : []
    },
    returnCallbackEndpoint: `/api/render/${String(provider).toLowerCase()}/callback`
  };
}

module.exports = { buildTwinDirective };
