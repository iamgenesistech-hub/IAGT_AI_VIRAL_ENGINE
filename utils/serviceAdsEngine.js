const LAW_KEYWORDS = [
  'law firm',
  'attorney',
  'lawyer',
  'legal',
  'litigation',
  'injury',
  'criminal defense',
  'estate planning',
  'family law',
  'immigration law',
  'dui'
];

const PROFESSIONAL_KEYWORDS = [
  'consulting',
  'agency',
  'clinic',
  'practice',
  'services',
  'book a consultation',
  'appointment'
];

const LAW_PRACTICE_AREA_KEYWORDS = [
  'personal injury',
  'car accident',
  'criminal defense',
  'dui',
  'family law',
  'divorce',
  'child custody',
  'immigration',
  'estate planning',
  'probate',
  'business law',
  'employment law',
  'medical malpractice',
  'wrongful death'
];

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, max = 220) {
  const text = normalizeWhitespace(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trim()}...`;
}

function normalizeWebsiteUrl(websiteUrl) {
  const raw = String(websiteUrl || '').trim();
  if (!raw) throw new Error('websiteUrl is required.');
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(normalized);
  return parsed.toString();
}

function inferServiceVertical({ hint = '', title = '', metaDescription = '', text = '' } = {}) {
  const normalizedHint = String(hint || '').trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (normalizedHint === 'law-firm' || normalizedHint === 'attorney' || normalizedHint === 'lawyer' || normalizedHint === 'legal') {
    return 'law_firm';
  }
  if (normalizedHint === 'professional-services' || normalizedHint === 'service-business') {
    return 'professional_services';
  }
  const haystack = `${hint} ${title} ${metaDescription} ${text}`.toLowerCase();
  if (LAW_KEYWORDS.some((keyword) => haystack.includes(keyword))) return 'law_firm';
  if (PROFESSIONAL_KEYWORDS.some((keyword) => haystack.includes(keyword))) return 'professional_services';
  return 'service_business';
}

function inferBusinessName({ title = '', ogSiteName = '', hostname = '' } = {}) {
  if (ogSiteName) return truncate(ogSiteName, 80);
  if (title) {
    const cleaned = title.split('|')[0].split('-')[0].trim();
    if (cleaned) return truncate(cleaned, 80);
  }
  return hostname.replace(/^www\./i, '');
}

function firstMatch(html, regex) {
  const match = regex.exec(html);
  return match ? normalizeWhitespace(match[1]) : '';
}

function stripHtmlToText(html) {
  return normalizeWhitespace(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<\/(p|div|h1|h2|h3|li|section|article|br)>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
  );
}

function collectMatches(html, regex, limit = 5) {
  const results = [];
  const source = String(html || '');
  let match = regex.exec(source);
  while (match && results.length < limit) {
    const value = normalizeWhitespace(match[1]);
    if (value) results.push(value);
    match = regex.exec(source);
  }
  return results;
}

function extractPracticeAreas(fullText) {
  const lower = fullText.toLowerCase();
  const hits = LAW_PRACTICE_AREA_KEYWORDS.filter((keyword) => lower.includes(keyword));
  return Array.from(new Set(hits)).slice(0, 6);
}

function buildCompliance(serviceVertical) {
  if (serviceVertical === 'law_firm') {
    return {
      requiredDisclaimer: 'Attorney advertising. Prior results do not guarantee a similar outcome.',
      prohibitedClaims: [
        'guaranteed win',
        'we always win',
        'best lawyer in the city'
      ],
      ctaPolicy: 'Use consultation-focused CTAs only (call, schedule, free case review).'
    };
  }
  return {
    requiredDisclaimer: 'Results may vary by client and case.',
    prohibitedClaims: ['guaranteed outcome'],
    ctaPolicy: 'Use consultation-focused CTAs.'
  };
}

async function intakeServiceWebsite({
  websiteUrl,
  businessTypeHint = '',
  representativeName = '',
  targetAudience = '',
  serviceRegion = ''
} = {}) {
  const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'EVICS-ServiceAdsEngine/1.0 (+https://iamgenesistech.com)'
      }
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`Website fetch failed: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    firstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i);
  const ogSiteName =
    firstMatch(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    firstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["'][^>]*>/i);
  const h1 = collectMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, 3);
  const snippets = collectMatches(html, /<p[^>]*>([\s\S]*?)<\/p>/gi, 8);
  const bodyText = stripHtmlToText(html);
  const parsed = new URL(normalizedUrl);
  const serviceVertical = inferServiceVertical({
    hint: businessTypeHint,
    title,
    metaDescription,
    text: bodyText.slice(0, 6000)
  });
  const businessName = inferBusinessName({
    title,
    ogSiteName,
    hostname: parsed.hostname
  });
  const practiceAreas = serviceVertical === 'law_firm' ? extractPracticeAreas(bodyText) : [];
  const primaryOffer = truncate(
    snippets[0] ||
    metaDescription ||
    h1[0] ||
    `${businessName} professional services`
  );
  const representative = normalizeWhitespace(representativeName) || (serviceVertical === 'law_firm' ? 'Lead Attorney' : 'Lead Consultant');
  const compliance = buildCompliance(serviceVertical);

  return {
    websiteUrl: normalizedUrl,
    fetchedAt: new Date().toISOString(),
    businessName,
    representative,
    serviceVertical,
    targetAudience: normalizeWhitespace(targetAudience),
    serviceRegion: normalizeWhitespace(serviceRegion),
    primaryOffer,
    practiceAreas,
    extracted: {
      title,
      metaDescription,
      h1,
      snippets: snippets.map((entry) => truncate(entry, 240))
    },
    compliance
  };
}

function buildLawFirmConcepts(profile) {
  const areas = profile.practiceAreas.length
    ? profile.practiceAreas.map((entry) => entry.replace(/\b\w/g, (m) => m.toUpperCase())).join(', ')
    : 'Personalized legal representation';
  const who = profile.representative || 'Lead attorney';
  const audience = profile.targetAudience || 'people needing immediate legal guidance';
  const region = profile.serviceRegion ? ` in ${profile.serviceRegion}` : '';
  const disclaimer = profile.compliance.requiredDisclaimer;

  return [
    {
      id: 'law-trust-authority',
      angle: 'Trust + authority',
      hook: `${who} explains what clients should do in the first 24 hours after a legal issue.`,
      script: `${who} from ${profile.businessName}${region} speaking directly to ${audience}. If you are facing a legal issue, the first decisions you make matter. We guide you step by step, explain your options clearly, and help protect your rights from day one. Practice focus: ${areas}. Call now to schedule a consultation. ${disclaimer}`,
      cta: `Schedule a consultation at ${profile.websiteUrl}`
    },
    {
      id: 'law-case-guidance',
      angle: 'Case guidance',
      hook: `A quick legal checklist from ${who}.`,
      script: `${who} shares a simple checklist for evaluating your case and avoiding costly mistakes. At ${profile.businessName}, we review facts, set realistic expectations, and build a strategy tailored to your situation. Practice focus: ${areas}. Reach out today for a case review. ${disclaimer}`,
      cta: `Book your case review at ${profile.websiteUrl}`
    },
    {
      id: 'law-client-clarity',
      angle: 'Client clarity',
      hook: `Legal help should feel clear, not confusing.`,
      script: `${who} explains how ${profile.businessName} keeps clients informed at every step, from intake through resolution. You get transparent communication, focused representation, and a team that advocates for your best interests. Practice focus: ${areas}. Talk to our office today. ${disclaimer}`,
      cta: `Talk to ${profile.businessName} at ${profile.websiteUrl}`
    }
  ];
}

function buildGenericServiceConcepts(profile) {
  const who = profile.representative || 'Lead specialist';
  const audience = profile.targetAudience || 'high-intent clients';
  const region = profile.serviceRegion ? ` in ${profile.serviceRegion}` : '';
  const disclaimer = profile.compliance.requiredDisclaimer;

  return [
    {
      id: 'svc-authority',
      angle: 'Authority',
      hook: `${who} shares how clients get better outcomes faster.`,
      script: `${who} from ${profile.businessName}${region}. We help ${audience} with ${profile.primaryOffer}. Our approach is practical, transparent, and focused on measurable outcomes. Book a consultation to see if we are the right fit. ${disclaimer}`,
      cta: `Book a consultation at ${profile.websiteUrl}`
    },
    {
      id: 'svc-process',
      angle: 'Process clarity',
      hook: `Here is exactly how we work with new clients.`,
      script: `${who} walks through the process at ${profile.businessName}: discovery, strategy, execution, and ongoing optimization. If you need reliable service and clear communication, start with a consultation today. ${disclaimer}`,
      cta: `Start with a consultation at ${profile.websiteUrl}`
    },
    {
      id: 'svc-proof',
      angle: 'Proof + trust',
      hook: `The difference is in the system, not the hype.`,
      script: `${who} explains why clients choose ${profile.businessName} for ${profile.primaryOffer}. We focus on consistency, speed, and service quality so clients can move forward with confidence. Reach out for your next step. ${disclaimer}`,
      cta: `Contact ${profile.businessName} via ${profile.websiteUrl}`
    }
  ];
}

function buildRenderRequestTemplate(profile, concept, opts = {}) {
  const destination = normalizeWhitespace(opts.destinationUrl) || profile.websiteUrl;
  return {
    platform: 'heygen',
    render_mode: 'video-agent',
    prompt: concept.script,
    script: concept.script,
    avatar_preset: 'Jordan Avatar',
    voice_preset: 'Jordan Voice',
    productTitle: `${profile.businessName} Consultation`,
    productPageUrl: destination,
    companyLabel: profile.businessName,
    text_overlay_position: 'bottom',
    tracking_protocol: 'UTM + consultation intent event'
  };
}

function generateServiceAvatarCampaign({
  profile,
  avatar = {},
  destinationUrl = ''
} = {}) {
  if (!profile || !profile.businessName || !profile.websiteUrl) {
    throw new Error('A valid service website profile is required.');
  }
  const concepts = profile.serviceVertical === 'law_firm'
    ? buildLawFirmConcepts(profile)
    : buildGenericServiceConcepts(profile);
  const enrichedConcepts = concepts.map((concept) => ({
    ...concept,
    renderRequestTemplate: buildRenderRequestTemplate(profile, concept, { destinationUrl })
  }));
  return {
    campaignType: 'service-avatar-ads',
    createdAt: new Date().toISOString(),
    profile,
    avatarProfile: {
      persona: normalizeWhitespace(avatar.persona) || `${profile.representative} spokesperson`,
      style: normalizeWhitespace(avatar.style) || 'Professional authority',
      wardrobe: normalizeWhitespace(avatar.wardrobe) || 'Business professional',
      tone: normalizeWhitespace(avatar.tone) || 'Calm, trustworthy, clear'
    },
    concepts: enrichedConcepts
  };
}

function buildServiceRenderRequest({ campaign, conceptId, avatarId, voiceId } = {}) {
  if (!campaign || !Array.isArray(campaign.concepts) || !campaign.concepts.length) {
    throw new Error('campaign.concepts is required.');
  }
  const selected = campaign.concepts.find((concept) => concept.id === conceptId) || campaign.concepts[0];
  const payload = {
    ...(selected.renderRequestTemplate || {}),
    script: selected.script,
    prompt: selected.script
  };
  if (avatarId) payload.avatar_id = avatarId;
  if (voiceId) payload.voice_id = voiceId;
  return {
    conceptId: selected.id,
    conceptHook: selected.hook,
    request: payload
  };
}

module.exports = {
  normalizeWebsiteUrl,
  intakeServiceWebsite,
  generateServiceAvatarCampaign,
  buildServiceRenderRequest
};
