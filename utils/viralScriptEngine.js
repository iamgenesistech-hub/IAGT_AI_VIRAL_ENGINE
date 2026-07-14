/**
 * viralScriptEngine.js — EVICS Elite Viral Script Generator
 *
 * Generates platform-optimized, psychologically-engineered video scripts
 * that drive clicks, shares, and sales for IAGT products.
 *
 * Hook patterns:
 *   transformation  — before/after journey (highest conversion for supplements/health)
 *   curiosity_gap   — withhold answer until CTA (tech, new products)
 *   controversy     — challenge a belief (spiritual, education)
 *   authority       — expert credibility (skincare, health)
 *   social_proof    — others already doing it (fitness, lifestyle)
 *   problem_solution — pain point → immediate relief (beauty, health)
 *   divine_purpose  — spiritual wealth alignment (IAGT brand signature)
 *
 * Uses OpenAI GPT-4o-mini when available, falls back to elite template engine.
 */

'use strict';

const PROHIBITED_MARKETING_CLAIMS = [
  /\bmilitary\s+owned\s+(and|&)\s+operated\b/gi,
  /\bmilitary\s+operated\b/gi,
  /\bmilitary\s+owned\b/gi
];

function sanitizeGeneratedCopy(text) {
  const input = String(text || '');
  if (!input) return '';
  const stripped = PROHIBITED_MARKETING_CLAIMS.reduce((next, pattern) => next.replace(pattern, ''), input);
  return stripped
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\((?:[^)(]*?(?:camera|scene|visual|b-?roll|sfx|music|caption|direction)[^)(]*)\)/gi, ' ')
    .replace(/^\s*(?:scene|camera|visual|b-?roll|sfx|music|on-?screen(?:\s+text)?|caption)\s*:\s.*$/gim, ' ')
    .replace(/^\s*(?:narrator|host|speaker|avatar|voice(?:over)?)\s*:\s*/gim, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Platform specs ────────────────────────────────────────────────────────────

const PLATFORM_SPECS = {
  tiktok:    { maxWords: 70,  maxSeconds: 20, hookStyle: 'pattern-interrupt', captionCTA: 'Link in bio 👆' },
  instagram: { maxWords: 90,  maxSeconds: 25, hookStyle: 'lifestyle-aspiration', captionCTA: 'Tap the link in bio' },
  youtube:   { maxWords: 200, maxSeconds: 60, hookStyle: 'authority-build', captionCTA: 'Link in description below' },
  facebook:  { maxWords: 110, maxSeconds: 30, hookStyle: 'social-proof', captionCTA: 'Shop now — link below' },
  pinterest: { maxWords: 60,  maxSeconds: 15, hookStyle: 'visual-aspiration', captionCTA: 'Shop iamgenesistech.com' }
};

// ── Hook library by pattern + category ───────────────────────────────────────

const HOOKS = {
  transformation: {
    health:      ['I was exhausted EVERY single day... until I tried this.',
                  'Doctors said it was just stress. Then I found THIS.',
                  '30 days ago I could barely get off the couch. Watch what happened.'],
    supplements: ['My energy levels were at zero. THIS changed everything in week one.',
                  'I stopped drinking coffee. Here is what replaced it.',
                  'Took this for 21 days. The results actually shocked me.'],
    fitness:     ['I trained for 6 months and saw nothing. Then I added THIS.',
                  'The gym was not working. This one change made all the difference.',
                  'I almost quit. Then I discovered what I was missing.'],
    beauty:      ['My skin looked 10 years older. This fixed it in 14 days.',
                  'I stopped buying expensive serums. THIS is what actually works.',
                  'The glow-up is real and I am going to show you exactly how.'],
    skincare:    ['Acne for 8 years. Gone in 3 weeks. Here is what I used.',
                  'My skin texture is COMPLETELY different. This is why.',
                  'I finally found the secret to glass skin.'],
    spiritual:   ['I was broke and lost. Then I discovered God\'s law of abundance.',
                  'Everything changed the moment I aligned with divine purpose.',
                  'I stopped struggling and started flowing. This is what shifted.'],
    finance:     ['I used to trade my time for money. I do not do that anymore.',
                  'Most people will never build wealth. Here is the reason why.',
                  'I was living paycheck to paycheck. Then I changed ONE thing.'],
    education:   ['I wasted 4 years in college. THIS taught me more in 30 days.',
                  'The knowledge they do not want you to have.',
                  'I learned more from this than from any class I ever took.'],
    default:     ['Stop scrolling. You need to see this.',
                  'I almost missed this. Glad I did not.',
                  'This changed the way I think about everything.']
  },
  curiosity_gap: {
    health:      ['The one ingredient in your supplements that is actually harming you.',
                  'Why most health products do NOT work — and what to use instead.',
                  'What no one tells you about weight loss.'],
    spiritual:   ['The spiritual law that determines how much money you make.',
                  'God\'s blueprint for abundance — and almost nobody knows this.',
                  'What your energy vibration is actually doing to your finances.'],
    finance:     ['The wealth strategy the top 1% use and never talk about.',
                  'How people are making money while they sleep.',
                  'The passive income truth nobody is explaining.'],
    default:     ['The secret behind this product that nobody is talking about.',
                  'Why this is the most underrated product of the year.',
                  'What happens when you use this every single day for 30 days.']
  },
  social_proof: {
    health:      ['Over 50,000 people already made this switch. Here is why.',
                  'My entire family is using this now. Mom would not stop.',
                  'I recommended this to 20 people. Every single one came back.'],
    fitness:     ['The entire gym started asking me what I was taking.',
                  'My trainer was shocked at my progress. Here is what I did.',
                  '12,000 people hit their goals with this. I am one of them.'],
    spiritual:   ['Communities around the world are waking up to this truth.',
                  'Thousands found financial freedom through this understanding.',
                  'I am not the only one whose life changed because of this.'],
    default:     ['I gave this to 10 people. Here are the results.',
                  'The reviews on this are unreal. I had to try it myself.',
                  'Everyone is talking about this product for good reason.']
  },
  problem_solution: {
    health:      ['Tired of being tired? This is your answer.',
                  'If your energy crashes every afternoon, watch this entire video.',
                  'Bloating. Brain fog. Fatigue. One product solved all three.'],
    beauty:      ['Dark spots. Uneven skin tone. ONE product fixed it all.',
                  'If foundation is creasing on you, you need this first.',
                  'Dry skin is not a skin type. It is a signal. This fixes it.'],
    finance:     ['Living paycheck to paycheck? There is a way out.',
                  'If you are working harder but earning less, this is for you.',
                  'Debt is a mindset problem before it is a money problem.'],
    default:     ['Most people are doing this wrong. Here is the right way.',
                  'If this is a problem for you, this product is the answer.',
                  'Stop wasting money on things that do not work.']
  },
  divine_purpose: {
    spiritual:   ['God placed wealth in you before you were born. Access it now.',
                  'Abundance is spiritual law. This product aligns you with it.',
                  'Your purpose and your prosperity are connected. Here is how.'],
    education:   ['Wisdom is the foundation of every great life. Build yours here.',
                  'Knowledge is the greatest asset. Invest in yours today.',
                  'The wisdom in this changed how I see everything.'],
    health:      ['Your body is a temple. Feed it with divine intention.',
                  'Taking care of yourself IS a spiritual practice.',
                  'When your body is clear, your spirit can move freely.'],
    default:     ['Everything you need has been placed inside you. This helps unlock it.',
                  'Purpose and prosperity move together. Start here.',
                  'I AM GENESIS TECH — because you were made to create.']
  }
};

// ── CTA templates by platform ─────────────────────────────────────────────────

const CTAS = {
  tiktok:    [
    'Grab yours at iamgenesistech.com — link in my bio right now.',
    'Get it before it sells out — link in bio.',
    'Shop now at iamgenesistech.com. Link. In. Bio. Go.',
    'Do not wait on this one. Link in bio.'
  ],
  instagram: [
    'Shop the link in my bio. I promise you will not regret it.',
    'Available now at iamgenesistech.com — tap the link in bio.',
    'Use my link — iamgenesistech.com. It is in my bio.',
    'Go to iamgenesistech.com right now. Link is in the bio.'
  ],
  youtube:   [
    'Check the link in the description to get yours today at iamgenesistech.com.',
    'Head to iamgenesistech.com — full link is in the description below.',
    'I put the direct link in the description. Go get yours now.'
  ],
  facebook:  [
    'Click the link below to shop at iamgenesistech.com.',
    'Available now — link is right below this video.',
    'Tap the link below and order yours today.'
  ],
  default:   [
    'Get yours at iamgenesistech.com.',
    'Shop now at iamgenesistech.com — link is right there.',
    'Head to iamgenesistech.com and grab yours today.'
  ]
};

// ── Emotional bridge phrases ──────────────────────────────────────────────────

const BRIDGES = {
  energizing:    ['I feel ALIVE again.', 'My energy is through the roof.', 'The difference is night and day.'],
  transformative:['This rewired how I think about my health.', 'Nothing has worked like THIS.', 'My whole body changed.'],
  luxurious:     ['I feel like royalty using this.', 'This is self-care at its highest level.', 'I will never go back to anything else.'],
  powerful:      ['I push harder every single session.', 'My performance jumped immediately.', 'I feel unstoppable.'],
  awakening:     ['Something in me shifted the moment I started this.', 'I feel more aligned than I ever have.', 'This is not just a product — it is a practice.'],
  empowering:    ['I know things now that I wish I knew at 20.', 'This knowledge alone is worth thousands.', 'The understanding I gained is priceless.'],
  prosperity:    ['My relationship with money is completely different now.', 'I think like a wealthy person now.', 'The abundance mindset is real.'],
  premium:       ['The quality speaks for itself.', 'This is what investing in yourself looks like.', 'I chose excellence and it showed up for me.']
};

// ── Template engine ───────────────────────────────────────────────────────────

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeBenefitList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeText(entry)).filter(Boolean);
  }
  return normalizeText(value)
    .split(/[\n;|]+/)
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

function splitProductFacts(product = {}) {
  const description = normalizeText(product.description || product.body_html || '');
  const benefits = normalizeBenefitList(product.benefits);
  const howToUse = normalizeText(product.howToUse || product.usageInstructions);
  return {
    description,
    benefits,
    howToUse
  };
}

function buildProductFocusedTemplate({ title, platform, price, affiliateCode, product = {} }) {
  const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.tiktok;
  const facts = splitProductFacts(product);
  const ctaBank = CTAS[platform] || CTAS.default;
  let cta = pickRandom(ctaBank);
  if (affiliateCode && !cta.includes(affiliateCode)) {
    cta = cta.replace('iamgenesistech.com', `iamgenesistech.com/?ref=${affiliateCode}`);
  }

  const hook = spec.maxSeconds <= 20
    ? `If you've been looking at ${title}, here's what actually makes it worth trying.`
    : `Let me show you exactly why ${title} stands out.`;
  const lines = [hook];

  if (facts.description) {
    const summary = facts.description.split('. ').slice(0, 2).join('. ').trim();
    lines.push(/[.!?]$/.test(summary) ? summary : `${summary}.`);
  }
  if (facts.benefits[0]) {
    lines.push(`What I like most is ${facts.benefits[0].replace(/^[•✔✅-]\s*/, '')}.`);
  }
  if (facts.benefits[1]) {
    lines.push(`You also get ${facts.benefits[1].replace(/^[•✔✅-]\s*/, '')}.`);
  }
  if (facts.howToUse) {
    lines.push(`How to use it is simple: ${facts.howToUse.replace(/\.$/, '')}.`);
  }
  if (price) {
    lines.push(`It starts at $${parseFloat(price).toFixed(2)}.`);
  }
  lines.push(`If ${title} fits your routine, ${cta}`);
  return sanitizeGeneratedCopy(lines.join(' '));
}

/**
 * Build a script from templates — no API needed.
 */
function buildTemplateScript({ title, category, mood, platform, hookPattern, price, product = {}, affiliateCode }) {
  const facts = splitProductFacts(product);
  if (facts.description || facts.benefits.length || facts.howToUse) {
    return buildProductFocusedTemplate({ title, platform, price, affiliateCode, product });
  }
  const spec     = PLATFORM_SPECS[platform] || PLATFORM_SPECS.default || PLATFORM_SPECS.tiktok;
  const hookBank = (HOOKS[hookPattern] || HOOKS.transformation);
  const hook     = pickRandom(hookBank[category] || hookBank.default || HOOKS.transformation.default);
  const bridge   = pickRandom(BRIDGES[mood] || BRIDGES.premium);
  const ctaBank  = CTAS[platform] || CTAS.default;
  const cta      = pickRandom(ctaBank);

  const priceTag = price ? ` Starting at $${parseFloat(price).toFixed(0)}.` : '';

  // Short script (TikTok/Instagram)
  if (spec.maxSeconds <= 25) {
    return [hook, `This is the ${title}.`, bridge, `${priceTag}`, cta].filter(Boolean).join(' ');
  }

  // Medium script (Facebook)
  if (spec.maxSeconds <= 35) {
    return [
      hook,
      `Let me show you something. This is the ${title}.`,
      `I have been using this consistently and the results are real.`,
      bridge,
      `This is built for people who are serious about elevating their routine.${priceTag}`,
      cta
    ].join(' ');
  }

  // Long script (YouTube)
  return [
    hook,
    `Let me break this down for you. This is the ${title}.`,
    `I want to be real with you — I was skeptical. I have tried a lot of products in this space and most of them overpromise and underdeliver.`,
    `But this one is different. Here is why.`,
    bridge,
    `It is built for people who are done settling and want something they can actually use consistently.`,
    `If you are watching this, that is you.${priceTag}`,
    cta
  ].join(' ');
}

// ── OpenAI-enhanced generator ─────────────────────────────────────────────────

async function buildOpenAIScript({ title, category, mood, platform, hookPattern, price, emotional_trigger, product = {}, affiliateCode }) {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const spec   = PLATFORM_SPECS[platform] || PLATFORM_SPECS.tiktok;
  const facts = splitProductFacts(product);

  const systemPrompt = `You are an elite viral video ad scriptwriter specializing in authentic, high-converting social media ads. 
You write scripts that feel REAL — not salesy.
Use only supplied product facts. Do not invent testimonials, outcomes, diagnoses, or health claims.
The brand is I AM GENESIS TECH (iamgenesistech.com), but you may mention the brand at most once, ideally only in the closing CTA.
Never include unverified military-affiliation claims unless explicit legal authorization is provided (it is not authorized by default).`;

  const userPrompt = `Write a ${spec.maxSeconds}-second viral ${platform} video ad script for: "${title}"

Product category: ${category}
Emotional mood: ${mood}
Hook pattern: ${hookPattern}
Emotional trigger: ${emotional_trigger || 'transformation and purpose'}
${price ? `Price: $${parseFloat(price).toFixed(0)}` : ''}
Product description facts: ${facts.description || 'Use only the product name and provided benefits.'}
Product benefits: ${facts.benefits.length ? facts.benefits.join(' | ') : 'None supplied'}
How to use: ${facts.howToUse || 'Not supplied'}

Requirements:
- Start with a POWERFUL hook that stops the scroll (first 3 seconds decide everything)
- Use the ${hookPattern} pattern naturally — never forced
- Mention the product by name naturally in conversation
- Keep the script product-first: explain what it is, why it helps, and how it is used
- Do NOT add any claim that is not explicitly supported by the provided facts
- Mention the brand no more than once, preferably only in the CTA
- End with a clear CTA directing to ${affiliateCode ? `iamgenesistech.com/?ref=${affiliateCode}` : 'iamgenesistech.com'} and "${PLATFORM_SPECS[platform]?.captionCTA || 'link in bio'}"
- Write ONLY the words the avatar will speak out loud — absolutely NO stage directions, NO brackets like [Hold up product], NO action cues
- Approximately ${spec.maxWords} words maximum
- Sound like a real person sharing their genuine experience, not a commercial
- The script must be pure dialogue — every word gets spoken by the avatar`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt }
    ],
    max_tokens:   400,
    temperature:  0.82
  });

  return sanitizeGeneratedCopy(completion.choices[0]?.message?.content?.trim() || null);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an elite viral script for a product + platform.
 *
 * @param {object} opts
 * @param {string}  opts.title           — product title
 * @param {object}  [opts.product]       — full product object (for auto-detection)
 * @param {string}  [opts.platform]      — tiktok | instagram | youtube | facebook | pinterest
 * @param {string}  [opts.category]      — overrides auto-detect
 * @param {string}  [opts.mood]          — overrides auto-detect
 * @param {string}  [opts.hookPattern]   — transformation|curiosity_gap|social_proof|problem_solution|divine_purpose
 * @param {string}  [opts.price]         — product price string
 * @param {string}  [opts.affiliateCode] — affiliate code for CTA
 * @returns {{ scriptText:string, hook:string, cta:string, platform:string, hookPattern:string, duration_estimate:string, source:'openai'|'template' }}
 */
async function generateViralScript({
  title,
  product = {},
  platform = 'tiktok',
  category,
  mood,
  hookPattern,
  price,
  affiliateCode,
  emotional_trigger
} = {}) {
  const { detectCategory, CATEGORY_THEMES } = require('./videoBackgroundSelector');

  const detectedCategory = category || detectCategory(product);
  const theme    = CATEGORY_THEMES[detectedCategory] || CATEGORY_THEMES.default;
  const detectedMood = mood || theme.mood || 'premium';

  // Auto-select best hook pattern if not specified
  const categoryHookMap = {
    spiritual:           'divine_purpose',
    meditation:          'divine_purpose',
    'personal-development': 'transformation',
    education:           'curiosity_gap',
    finance:             'curiosity_gap',
    health:              'transformation',
    supplements:         'transformation',
    fitness:             'social_proof',
    beauty:              'problem_solution',
    skincare:            'problem_solution',
    food:                'social_proof',
    tech:                'curiosity_gap',
    default:             'transformation'
  };
  const detectedHook = hookPattern || categoryHookMap[detectedCategory] || 'transformation';

  const productTitle = title || product?.title || 'this product';
  const productPrice = price || product?.price || product?.variants?.[0]?.price;

  let scriptText = null;
  let source     = 'template';

  // Try OpenAI first
  if (process.env.OPENAI_API_KEY) {
    try {
      scriptText = await buildOpenAIScript({
        title:              productTitle,
        category:           detectedCategory,
        mood:               detectedMood,
        platform,
        hookPattern:        detectedHook,
        price:              productPrice,
        emotional_trigger:  emotional_trigger || theme.mood,
        product,
        affiliateCode
      });
      if (scriptText) source = 'openai';
    } catch (e) {
      console.warn('[ViralScript] OpenAI failed, using template:', e.message);
    }
  }

  // Template fallback
  if (!scriptText) {
    scriptText = buildTemplateScript({
      title:       productTitle,
      category:    detectedCategory,
      mood:        detectedMood,
      platform,
      hookPattern: detectedHook,
      price:       productPrice,
      product,
      affiliateCode
    });
  }

  // Append affiliate link if code provided
  if (affiliateCode && !scriptText.includes(affiliateCode)) {
    scriptText = scriptText.replace('iamgenesistech.com', `iamgenesistech.com/?ref=${affiliateCode}`);
  }
  scriptText = sanitizeGeneratedCopy(scriptText);

  const spec = PLATFORM_SPECS[platform] || PLATFORM_SPECS.tiktok;
  const hook = scriptText.split('.')[0].replace(/\[.*?\]/g, '').trim();
  const cta  = `Shop at iamgenesistech.com — ${spec.captionCTA || 'link in bio'}`;

  return {
    scriptText,
    main_script:       scriptText,
    hook,
    cta,
    platform,
    hookPattern:       detectedHook,
    category:          detectedCategory,
    mood:              detectedMood,
    duration_estimate: `${spec.maxSeconds}s`,
    source
  };
}

/**
 * Batch generate scripts for multiple products.
 */
async function batchGenerateScripts(products = [], platform = 'tiktok') {
  const results = [];
  for (const product of products) {
    try {
      const script = await generateViralScript({ title: product.title, product, platform });
      results.push({ productId: product.id, ...script });
    } catch (e) {
      results.push({ productId: product.id, error: e.message });
    }
  }
  return results;
}

module.exports = {
  generateViralScript,
  batchGenerateScripts,
  PLATFORM_SPECS,
  HOOKS,
  CTAS
};
