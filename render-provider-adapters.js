class RenderProviderAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  validateConfig() {
    return { ready: false, configured: false, missing: [], error: "Adapter validation is not implemented." };
  }

  buildPayload() {
    throw new Error("buildPayload must be implemented by a render provider adapter.");
  }

  async submitRender() {
    throw new Error("submitRender must be implemented by a render provider adapter.");
  }

  async getRenderStatus() {
    throw new Error("getRenderStatus must be implemented by a render provider adapter.");
  }
}

class HeygenAdapter extends RenderProviderAdapter {
  validateConfig() {
    const hasApiKey = Boolean(this.config.HEYGEN_API_KEY);
    const hasPayload = Boolean(this.config.HEYGEN_RENDER_PAYLOAD_JSON);
    const hasAvatarVoice = Boolean(this.config.HEYGEN_AVATAR_ID && this.config.HEYGEN_VOICE_ID);
    const missing = [];
    if (!hasApiKey) missing.push("HEYGEN_API_KEY");
    if (!hasPayload && !this.config.HEYGEN_AVATAR_ID) missing.push("HEYGEN_AVATAR_ID");
    if (!hasPayload && !this.config.HEYGEN_VOICE_ID) missing.push("HEYGEN_VOICE_ID");

    return {
      configured: hasApiKey,
      ready: hasApiKey && (hasPayload || hasAvatarVoice),
      missing,
      error: missing.length
        ? "HeyGen setup is incomplete. Add HEYGEN_AVATAR_ID and HEYGEN_VOICE_ID, or provide HEYGEN_RENDER_PAYLOAD_JSON."
        : ""
    };
  }

  buildPayload(media = {}, input = {}, prompt = "") {
    const scriptParts = resolveHeygenScriptParts(media, input, prompt);
    const productImageUrl = input.productImageUrl || media.metadata_json?.productImageUrl || "";

    if (this.config.HEYGEN_RENDER_PAYLOAD_JSON) {
      const templatedPayload = JSON.parse(applyJsonTemplate(String(this.config.HEYGEN_RENDER_PAYLOAD_JSON), {
        prompt: scriptParts.spokenScript,
        spokenScript: scriptParts.spokenScript,
        script: scriptParts.rawScript,
        sceneInstructions: scriptParts.devToolsDirections,
        renderDirectives: scriptParts.devToolsDirections,
        devToolsDirections: scriptParts.devToolsDirections,
        heygenDevToolsDirections: scriptParts.devToolsDirections,
        title: media.title || "",
        mediaId: media.id || "",
        avatarId: this.config.HEYGEN_AVATAR_ID || input.avatarId || "",
        voiceId: this.config.HEYGEN_VOICE_ID || input.voiceId || "",
        productName: input.productName || media.metadata_json?.productName || media.title || "Product",
        productImageUrl
      }));
      return enforceProductMockupInPayload(templatedPayload, productImageUrl);
    }

    const narration = ensureNarrationLength(scriptParts.spokenScript, {
      title: media.title || input.title || "Product",
      productName: input.productName || media.metadata_json?.productName || media.title || "Product",
      productImageUrl: input.productImageUrl || media.metadata_json?.productImageUrl || ""
    });

    const payload = {
      video_inputs: [
        {
          character: { type: "avatar", avatar_id: this.config.HEYGEN_AVATAR_ID || input.avatarId },
          voice: {
            type: "text",
            input_text: narration,
            voice_id: this.config.HEYGEN_VOICE_ID || input.voiceId || undefined
          },
          background: productImageUrl
            ? { type: "image", value: productImageUrl, url: productImageUrl, image_url: productImageUrl }
            : { type: "color", value: "#111827" }
        }
      ],
      title: media.title || input.title || undefined,
      captions: input.captions === undefined ? true : Boolean(input.captions),
      dimension: { width: Number(input.width || media.width || 1080), height: Number(input.height || media.height || 1920) },
      callback_url: this.config.EVICS_PUBLIC_BASE_URL ? `${this.config.EVICS_PUBLIC_BASE_URL.replace(/\/$/, "")}/api/render/heygen/callback` : undefined
    };

    return enforceProductMockupInPayload(payload, productImageUrl);
  }
}

function ensureNarrationLength(prompt = "", context = {}) {
  const raw = String(prompt || "").replace(/\s+/g, " ").trim();
  const words = raw ? raw.split(" ").filter(Boolean) : [];
  if (words.length >= 85) return raw;

  const productName = context.productName || context.title || "the product";
  const filler = [
    `${productName} delivers a clear daily benefit with a simple routine.`,
    "Start with a strong hook in the first five seconds.",
    "Use value and proof language with concrete daily-use context.",
    "End with a clear buy-now call to action and a confident brand close."
  ].join(" ");

  let expanded = [raw, filler].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  while (expanded.split(" ").filter(Boolean).length < 95) {
    expanded += " Reinforce the key benefit and repeat customer outcomes with natural delivery.";
  }
  return expanded;
}

function extractNarration(prompt = "", media = {}, input = {}) {
  const preferred = [
    input.spokenScript,
    media.metadata_json?.spokenScript,
    prompt,
    media.metadata_json?.script,
    media.description,
    media.title
  ].find((value) => String(value || "").trim());

  return sanitizeNarrationText(preferred || "");
}

function sanitizeNarrationText(value = "") {
  const compact = String(value || "").replace(/\r/g, " ").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  if (!compact) return "";

  const withoutTimecodes = compact.replace(/\[[^\]]*\]/g, " ");
  const clauses = withoutTimecodes.split(/(?<=[.!?])\s+/);
  const spoken = clauses
    .map((clause) => clause.trim())
    .filter(Boolean)
    .map((clause) => clause
      .replace(/^on-screen line\s*\d+\s*:\s*/i, "")
      .replace(/^visual format guidance\s*:\s*/i, "")
      .replace(/^scene instructions?\s*:\s*/i, "")
      .replace(/^camera instructions?\s*:\s*/i, "")
      .replace(/^voiceover explains\s*:\s*/i, "")
      .replace(/^cta\s*:\s*/i, ""))
    .filter((clause) => clause && !isDirectionClause(clause));

  return spoken.join(" ").replace(/\s+/g, " ").trim();
}

function isDirectionClause(clause = "") {
  const value = String(clause || "").trim();
  if (!value) return true;
  if (/^(show|display|keep|replicate|use|camera|scene|shot|visual|overlay|subtitle|caption)\b/i.test(value)) return true;
  if (/(on[- ]screen|camera|scene|shot|b-roll|overlay|subtitle|caption|mockup|visual format guidance)/i.test(value)) return true;
  return false;
}

function normalizeDirectionText(value = "") {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean).join(" ");
  return String(value || "").trim();
}

function resolveHeygenScriptParts(media = {}, input = {}, prompt = "") {
  const rawScript = String(
    input.script || media.metadata_json?.script || media.description || media.title || ""
  ).trim();

  const spokenSource = [
    input.spokenScript,
    media.metadata_json?.spokenScript,
    prompt,
    rawScript,
    media.title
  ].find((value) => String(value || "").trim());

  const spokenScript = sanitizeNarrationText(spokenSource || "");
  const devToolsDirections = normalizeDirectionText(
    input.devToolsDirections
    || input.heygenDevToolsDirections
    || input.renderDirectives
    || input.sceneInstructions
    || media.metadata_json?.sceneInstructions
    || media.metadata_json?.directorNotes
    || ""
  );

  return {
    rawScript,
    spokenScript,
    devToolsDirections
  };
}

function jsonEscaped(value) {
  return JSON.stringify(String(value || "")).slice(1, -1);
}

function applyJsonTemplate(template, values = {}) {
  const entries = Object.entries(values);
  return entries.reduce((output, [key, value]) => {
    const token = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    return output.replace(token, jsonEscaped(value));
  }, String(template || ""));
}

function enforceProductMockupInPayload(payload = {}, productImageUrl = "") {
  if (!productImageUrl || !payload || !Array.isArray(payload.video_inputs) || !payload.video_inputs.length) {
    return payload;
  }

  const firstInput = payload.video_inputs[0] || {};
  const background = firstInput.background || {};
  firstInput.background = {
    ...background,
    type: "image",
    value: productImageUrl,
    url: productImageUrl,
    image_url: productImageUrl
  };
  payload.video_inputs[0] = firstInput;
  return payload;
}

module.exports = {
  RenderProviderAdapter,
  HeygenAdapter
};
