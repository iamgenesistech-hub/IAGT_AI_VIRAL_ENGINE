// backend/sacredIntelligenceGovernance.js
//
// EVICS Sacred Intelligence Governance Engine
// -------------------------------------------
// A centralized, enforceable AI operating standard for the EVICS platform.
//
// Every AI agent, avatar, workflow, marketing recommendation, affiliate action,
// customer communication, content generation process, automation, learning loop,
// Board of Directors agent, VP agent, and future AI capability inside EVICS must
// route its output through this engine BEFORE that output is delivered, published,
// saved, recommended, or acted upon.
//
// This module is intentionally self-contained (like renderQualityValidator.js):
// any file may `require('./sacredIntelligenceGovernance')` and call it. It has no
// external service dependencies, so evaluation is deterministic, fast, and testable.
//
// Design principles:
//   * Additive & non-breaking — it never mutates existing behavior; callers opt in.
//   * Safe fallback — if evaluation errors, output is withheld ("Governance Review
//     Required") rather than published.
//   * Auto-rewrite-then-enforce — fixable content is repaired and rechecked; only
//     content that still fails the standard after repair is blocked.

'use strict';

const fs = require('fs');
const path = require('path');

// ===========================================================================
// SYSTEM-LEVEL CONSTANTS — Oaths & Standard
// ===========================================================================

const EVICS_AI_OATH = [
  'I am an intelligence created to serve.',
  '',
  'Within EVICS, I am governed by truth, wisdom, integrity, compassion, and love. ' +
    'My purpose is to benefit humanity, honor God\u2019s creation, and protect the dignity of every person I serve.',
  '',
  'I shall not knowingly deceive, manipulate, exploit, shame, humiliate, divide, or cause unnecessary harm.',
  '',
  'I shall place people before profit, truth before convenience, wisdom before speed, and service before self.',
  '',
  'Before I speak, recommend, create, or act, I shall ask: Is this truthful? Is this helpful? ' +
    'Is this respectful? Is this wise? Does this preserve human dignity? Does this serve the greater good?',
  '',
  'When correction is needed, I shall correct with clarity and kindness. When uncertainty exists, ' +
    'I shall acknowledge it honestly. When guidance is given, I shall seek to educate, encourage, restore, and empower.',
  '',
  'Every word, decision, workflow, and recommendation I produce shall be measured by this oath.',
  '',
  'This is my governing standard. This is how I serve.'
].join('\n');

const EVICS_USER_AFFILIATE_OATH = [
  'I enter this platform with purpose, humility, and responsibility.',
  '',
  'I will use the tools, knowledge, and opportunities given through EVICS to grow with integrity, ' +
    'serve with wisdom, and create value that blesses more than myself.',
  '',
  'I will seek truth before shortcuts, wisdom before impulse, service before selfish gain, ' +
    'and long-term purpose before temporary success.',
  '',
  'I will not use this platform to deceive, manipulate, exploit, shame, or harm others. ' +
    'I will use it to learn, build, encourage, educate, uplift, and create honest opportunity.',
  '',
  'May my work be excellent. May my words be respectful. May my actions preserve dignity. ' +
    'May my success bless my family, my community, and every life I am called to touch.',
  '',
  'I choose to build, not destroy.',
  'I choose to serve, not exploit.',
  'I choose integrity over convenience.',
  'I choose wisdom over fear.',
  'I choose purpose over distraction.',
  'I choose love as the highest standard.',
  '',
  'This is my commitment as a user, affiliate, creator, and steward of opportunity within EVICS.'
].join('\n');

// The spoken label used when this oath is offered during avatar voice capture.
const VOICE_IDENTITY_OATH_LABEL = 'EVICS Voice Identity and Purpose Oath';

const SACRED_INTELLIGENCE_STANDARD = Object.freeze({
  mission:
    'EVICS exists to employ artificial intelligence for the benefit of humanity, the honoring of ' +
    'God\u2019s creation, and the uplifting of every person it serves.',
  corePrinciples: Object.freeze([
    'Truth before convenience.',
    'Integrity before profit.',
    'Wisdom before speed.',
    'People before systems.',
    'Service before self.',
    'Love before judgment.',
    'Purpose before power.'
  ]),
  shallNever: Object.freeze([
    'deceive', 'manipulate', 'exploit', 'humiliate', 'shame', 'divide', 'mislead',
    'diminish the dignity of any person'
  ]),
  shallSeekTo: Object.freeze([
    'educate', 'encourage', 'protect', 'restore', 'clarify', 'empower', 'create lasting value'
  ]),
  guidingQuestions: Object.freeze([
    'Is this truthful?',
    'Is this helpful?',
    'Is this respectful?',
    'Is this wise?',
    'Is this honest?',
    'Is this compassionate?',
    'Does this preserve human dignity?',
    'Does this serve the long-term good?',
    'Does this honor the purpose of EVICS?'
  ])
});

// ===========================================================================
// MINIMUM PASSING STANDARDS
// ===========================================================================

const GOVERNANCE_THRESHOLDS = Object.freeze({
  truthScoreMin: 85,
  integrityScoreMin: 90,
  dignityScoreMin: 90,
  loveScoreMin: 85,
  manipulationRiskMax: 15,
  exploitationRiskMax: 10
});

// ===========================================================================
// PROHIBITED BEHAVIOR PATTERN LIBRARY
// Each category maps to regex patterns that flag the behavior in output text.
// ===========================================================================

// NOTE: text is canonicalized via expandContractions() before matching, so every
// pattern below is written in EXPANDED form (e.g. "you will", "do not", "it is").
const PROHIBITED_PATTERNS = Object.freeze({
  deception: [
    /\bfake\s+(reviews?|testimonials?|results?)\b/i,
    /\bpretend\s+to\b/i,
    /\bwe\s+are\s+lying\b/i,
    /\bnot\s+really\s+true\b/i,
    /\bmade\s+up\s+(?:the\s+)?(?:stats?|numbers?|reviews?)\b/i,
    /\bfabricat(?:e|ed|ing)\b/i,
    /\bfalsely\s+claim\b/i
  ],
  manipulation: [
    /\byou\s+would\s+be\s+(?:stupid|crazy|dumb|foolish|an\s+idiot)\b/i,
    /\beveryone\s+(?:else\s+)?is\s+(?:doing|buying)\s+it\b/i,
    /\bif\s+you\s+(?:really|truly)\s+(?:loved|cared)\b/i,
    /\byou\s+have\s+no\s+choice\b/i,
    /\bdo\s+not\s+(?:think|overthink),?\s+just\s+buy\b/i,
    /\bwhat\s+are\s+you\s+waiting\s+for\b/i,
    /\bsmart\s+people\s+(?:already\s+)?(?:know|buy)\b/i
  ],
  falseUrgency: [
    /\bact\s+now\b/i,
    /\bhurry\b/i,
    /\bonly\s+\d+\s+(?:left|remaining|spots?)\b/i,
    /\blast\s+chance\b/i,
    /\bbefore\s+it\s+is\s+(?:gone|too\s+late)\b/i,
    /\bdo\s+not\s+miss\s+out\b/i,
    /\blimited\s+time\s+only\b/i,
    /\bexpires?\s+(?:in\s+)?(?:minutes|tonight|today\s+only)\b/i,
    /\bwhile\s+supplies\s+last\b/i,
    /\b(?:buy|order|purchase)\s+(?:it\s+)?(?:immediately|right\s+now|right\s+away)\b/i
  ],
  shameSelling: [
    /\byou\s+should\s+be\s+ashamed\b/i,
    /\bonly\s+(?:losers|failures|poor\s+people)\b/i,
    /\bif\s+you\s+were\s+(?:a\s+)?(?:real|good)\s+\w+\s+you\s+would\b/i,
    /\bdo\s+not\s+be\s+(?:poor|broke|a\s+loser)\b/i,
    /\bembarrass(?:ing|ed)?\s+yourself\b/i,
    /\bwhat\s+will\s+people\s+think\s+of\s+you\b/i
  ],
  fearExploitation: [
    /\byou\s+will\s+regret\s+(?:it|this)\b/i,
    /\bbefore\s+it\s+is\s+too\s+late\b/i,
    /\byou\s+are\s+in\s+danger\b/i,
    /\bscared\s+to\s+(?:lose|miss)\b/i,
    /\bthis\s+could\s+ruin\s+(?:you|your\s+life)\b/i,
    /\bterrifying\b/i,
    /\byour\s+family\s+will\s+suffer\b/i
  ],
  humiliation: [
    /\byou\s+are\s+(?:pathetic|worthless|stupid|an idiot|a\s+failure|a\s+loser|trash|garbage|scum|nothing)\b/i,
    /\bnobody\s+(?:likes|wants|respects)\s+you\b/i,
    /\byou\s+will\s+never\s+(?:amount\s+to|be\s+good\s+enough)\b/i,
    /\bhow\s+dumb\s+are\s+you\b/i,
    /\bshould\s+be\s+humiliated\b/i,
    /\bhumiliat(?:e|ed|ing)\s+(?:you|them|him|her|people|anyone|in\s+public|publicly)\b/i,
    /\b(?:you|they)\s+(?:are|is)\s+(?:disgusting|repulsive)\b/i
  ],
  hatefulLanguage: [
    /\b(?:hate|despise)\s+(?:all\s+)?(?:those|these)\s+people\b/i,
    /\b(?:inferior|subhuman)\s+(?:race|people|group)\b/i,
    /\bthey\s+(?:all\s+)?deserve\s+to\s+(?:suffer|die)\b/i,
    /\bwipe\s+them\s+(?:all\s+)?out\b/i,
    /\bgo\s+back\s+to\s+where\s+you\s+came\s+from\b/i,
    /\b(?:everyone|everybody|those\s+people|these\s+people|all\s+(?:of\s+)?them|you\s+people|that\s+group|those\s+kind)\b[^.!?]{0,40}\b(?:is|are)\s+(?:trash|garbage|scum|worthless|disgusting|subhuman|vermin|animals|nothing)\b/i
  ],
  division: [
    /\bus\s+(?:versus|vs\.?)\s+them\b/i,
    /\bthose\s+people\s+are\s+(?:the\s+)?(?:enemy|problem|ruining)\b/i,
    /\byou\s+can\s+not\s+trust\s+(?:any\s+of\s+)?them\b/i,
    /\bthey\s+are\s+all\s+the\s+same\b/i
  ],
  misleadingClaims: [
    /\b100%\s+guaranteed\b/i,
    /\bguaranteed\s+to\s+(?:work|succeed|cure|heal|make)\b/i,
    /\bno\s+risk\b/i,
    /\bnever\s+fails?\b/i,
    /\bproven\s+to\s+cure\b/i,
    /\binstant(?:ly)?\s+(?:cure|heal|fix)\b/i,
    /\bclinically\s+proven\b(?![^.]*\bstudy\b)/i
  ],
  unsupportedHealthClaims: [
    /\bcures?\b/i,
    /\bheals?\b/i,
    /\btreats?\s+(?:disease|illness|cancer|diabetes|anxiety|depression)\b/i,
    /\bprevents?\s+disease\b/i,
    /\bmiracle\s+(?:cure|remedy|supplement)\b/i,
    /\bdiagnos(?:e|es|is)\b/i,
    /\breverses?\s+(?:aging|disease|illness)\b/i,
    /\bmedical\s+miracle\b/i
  ],
  unrealisticIncome: [
    /\bget\s+rich\s+quick\b/i,
    /\bmake\s+\$?\d[\d,]*\+?\s*(?:k|thousand)?\s*(?:a|per|\/)\s*(?:day|week|month)\b/i,
    /\bguarantee[sd]?\s+(?:you|they)\s+will\s+make\b/i,
    /\bguaranteed\s+(?:income|profits?|returns?|money)\b/i,
    /\bfinancial\s+freedom\s+overnight\b/i,
    /\bquit\s+your\s+(?:job|9\s*-?\s*5)\s+(?:this\s+week|in\s+days|overnight)\b/i,
    /\beasy\s+money\b/i,
    /\bpassive\s+income\s+on\s+autopilot\b/i,
    /\bno\s+(?:work|effort)\s+(?:required|needed)\b/i
  ],
  pressureAffiliate: [
    /\brecruit\s+(?:as\s+many|everyone)\b/i,
    /\bpressure\s+(?:them|your\s+\w+)\s+(?:until|to\s+buy)\b/i,
    /\bdo\s+not\s+take\s+no\s+for\s+an\s+answer\b/i,
    /\bkeep\s+(?:pushing|hounding)\s+(?:them|until)\b/i,
    /\bguilt\s+them\s+into\b/i,
    /\bspam\s+(?:everyone|your\s+\w+)\b/i
  ],
  profitOverPeople: [
    /\bwho\s+cares\s+if\s+(?:they|it)\s+(?:helps|works)\b/i,
    /\bjust\s+(?:take|get)\s+their\s+money\b/i,
    /\bprofit\s+is\s+all\s+that\s+matters\b/i,
    /\bwe\s+do\s+not\s+care\s+about\s+(?:the\s+)?(?:customer|people)\b/i,
    /\bsqueeze\s+(?:every\s+)?(?:dollar|cent)\s+out\s+of\s+them\b/i
  ]
});

// Categories that always block, regardless of numeric scores. These represent
// direct assaults on human dignity that cannot be "rewritten" into acceptability.
const HARD_BLOCK_CATEGORIES = Object.freeze(['hatefulLanguage', 'humiliation']);

// Human-readable labels for logging & admin display.
const VIOLATION_LABELS = Object.freeze({
  deception: 'Deception',
  manipulation: 'Manipulation',
  falseUrgency: 'False urgency',
  shameSelling: 'Shame-based selling',
  fearExploitation: 'Fear-based exploitation',
  humiliation: 'Humiliation',
  hatefulLanguage: 'Hateful language',
  division: 'Unnecessary division',
  misleadingClaims: 'Misleading claims',
  unsupportedHealthClaims: 'Unsupported health claims',
  unrealisticIncome: 'Unrealistic income promises',
  pressureAffiliate: 'Pressure-based affiliate tactics',
  profitOverPeople: 'Profit-over-people'
});

// ===========================================================================
// REQUIRED POSITIVE BEHAVIOR PATTERN LIBRARY
// ===========================================================================

const POSITIVE_PATTERNS = Object.freeze({
  truthful: [
    /\bhonestl?y\b/i, /\btransparent(?:ly)?\b/i, /\baccording\s+to\b/i, /\bresults?\s+(?:may\s+)?vary\b/i
  ],
  clear: [
    /\bhere'?s\s+how\b/i, /\bstep\s+by\s+step\b/i, /\bsimply\b/i, /\bin\s+short\b/i
  ],
  educational: [
    /\blearn\b/i, /\bunderstand\b/i, /\bhow\s+to\b/i, /\bwhy\b/i, /\bresearch\b/i, /\bguide\b/i,
    /\btip[s]?\b/i, /\bexplain(?:s|ed)?\b/i, /\bingredient[s]?\b/i, /\bbenefit[s]?\b/i
  ],
  encouraging: [
    /\bencourage\b/i, /\byou\s+can\b/i, /\bwe(?:'?re| are)\s+here\s+to\s+help\b/i, /\bat\s+your\s+own\s+pace\b/i,
    /\bgrateful\b/i, /\bthank\s+you\b/i, /\bwelcome\b/i, /\bsupport\s+you\b/i, /\bempower\b/i, /\bwe\s+believe\s+in\s+you\b/i
  ],
  honestUncertainty: [
    /\bmay\s+(?:help|support)\b/i, /\bcan\s+(?:help|support)\b/i, /\bmight\b/i, /\bconsult\s+(?:your|a)\s+(?:doctor|physician|professional)\b/i,
    /\bindividual\s+results\s+vary\b/i, /\bnot\s+(?:a\s+)?(?:medical\s+advice|guaranteed)\b/i
  ]
});

// ===========================================================================
// TEXT HELPERS
// ===========================================================================

function normalizeText(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    // Accept common shapes: { text }, { script }, { message }, { content }
    const candidate = value.finalApprovedOutput || value.text || value.script ||
      value.scriptText || value.message || value.content || value.output || '';
    return String(candidate).replace(/\r\n/g, '\n');
  }
  return String(value).replace(/\r\n/g, '\n');
}

function collapseWhitespace(text) {
  return String(text || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:]){2,}/g, '$1')
    .trim();
}

// Canonicalize contractions so detection & rewrite match both "you'll" and
// "you will", "don't" and "do not", etc. All prohibited/positive patterns are
// authored against this EXPANDED form.
function expandContractions(text) {
  return String(text || '')
    .replace(/\byou'?ll\b/gi, 'you will')
    .replace(/\bwe'?ll\b/gi, 'we will')
    .replace(/\bthey'?ll\b/gi, 'they will')
    .replace(/\bit'?ll\b/gi, 'it will')
    .replace(/\byou'?re\b/gi, 'you are')
    .replace(/\bthey'?re\b/gi, 'they are')
    .replace(/\bwe'?re\b/gi, 'we are')
    .replace(/\byou'?d\b/gi, 'you would')
    .replace(/\bwe'?d\b/gi, 'we would')
    .replace(/\bthey'?d\b/gi, 'they would')
    .replace(/\bi'?d\b/gi, 'i would')
    .replace(/\byou'?ve\b/gi, 'you have')
    .replace(/\bwon'?t\b/gi, 'will not')
    .replace(/\bcan'?t\b/gi, 'can not')
    .replace(/\bcannot\b/gi, 'can not')
    .replace(/\bdon'?t\b/gi, 'do not')
    .replace(/\bdoesn'?t\b/gi, 'does not')
    .replace(/\bdidn'?t\b/gi, 'did not')
    .replace(/\bwouldn'?t\b/gi, 'would not')
    .replace(/\bshouldn'?t\b/gi, 'should not')
    .replace(/\bcouldn'?t\b/gi, 'could not')
    .replace(/\bisn'?t\b/gi, 'is not')
    .replace(/\baren'?t\b/gi, 'are not')
    .replace(/\bit'?s\b/gi, 'it is')
    .replace(/\bthat'?s\b/gi, 'that is')
    .replace(/\bthere'?s\b/gi, 'there is')
    .replace(/\bwhat'?s\b/gi, 'what is')
    .replace(/\bwho'?s\b/gi, 'who is')
    .replace(/\blet'?s\b/gi, 'let us')
    .replace(/\bi'?m\b/gi, 'i am');
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Cosmetic cleanup for rewritten prose — collapse whitespace and capitalize the
// first letter of each sentence so repaired output reads professionally.
function tidyProse(text) {
  let out = collapseWhitespace(text);
  out = out.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (match) => match.toUpperCase());
  return out;
}

function countCategoryHits(text, patterns) {
  let count = 0;
  const matched = [];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      count += 1;
      matched.push(m[0].trim());
    }
  }
  return { count, matched };
}

// Detect all prohibited behaviors in a block of text.
function detectViolations(text) {
  const clean = String(text || '');
  const violations = {};
  let totalHits = 0;
  for (const [category, patterns] of Object.entries(PROHIBITED_PATTERNS)) {
    const { count, matched } = countCategoryHits(clean, patterns);
    if (count > 0) {
      violations[category] = { count, matched, label: VIOLATION_LABELS[category] };
      totalHits += count;
    }
  }
  const hardBlock = HARD_BLOCK_CATEGORIES.some((c) => violations[c]);
  return { violations, totalHits, hardBlock };
}

function detectPositives(text) {
  const clean = String(text || '');
  const positives = {};
  for (const [category, patterns] of Object.entries(POSITIVE_PATTERNS)) {
    const { count } = countCategoryHits(clean, patterns);
    if (count > 0) positives[category] = count;
  }
  return positives;
}

function hits(violations, category) {
  return violations[category] ? violations[category].count : 0;
}

// ===========================================================================
// SCORING (0-100 per category)
// ===========================================================================

function scoreTruth(violations) {
  let score = 100;
  score -= hits(violations, 'misleadingClaims') * 18;
  score -= hits(violations, 'unsupportedHealthClaims') * 25;
  score -= hits(violations, 'unrealisticIncome') * 22;
  score -= hits(violations, 'deception') * 30;
  score -= hits(violations, 'falseUrgency') * 8;
  return clampScore(score);
}

function scoreIntegrity(violations) {
  let score = 100;
  score -= hits(violations, 'deception') * 30;
  score -= hits(violations, 'manipulation') * 22;
  score -= hits(violations, 'pressureAffiliate') * 20;
  score -= hits(violations, 'profitOverPeople') * 25;
  score -= hits(violations, 'falseUrgency') * 8;
  score -= hits(violations, 'misleadingClaims') * 10;
  return clampScore(score);
}

function scoreDignity(violations) {
  let score = 100;
  score -= hits(violations, 'humiliation') * 45;
  score -= hits(violations, 'hatefulLanguage') * 60;
  score -= hits(violations, 'shameSelling') * 28;
  score -= hits(violations, 'division') * 22;
  score -= hits(violations, 'fearExploitation') * 16;
  return clampScore(score);
}

function scoreLove(violations, positives) {
  let score = 88;
  score += Math.min(12, (positives.encouraging || 0) * 5);
  score += Math.min(6, (positives.educational || 0) * 3);
  score += Math.min(4, (positives.truthful || 0) * 2);
  score -= hits(violations, 'humiliation') * 30;
  score -= hits(violations, 'hatefulLanguage') * 45;
  score -= hits(violations, 'shameSelling') * 20;
  score -= hits(violations, 'fearExploitation') * 18;
  score -= hits(violations, 'division') * 15;
  score -= hits(violations, 'manipulation') * 12;
  score -= hits(violations, 'profitOverPeople') * 15;
  return clampScore(score);
}

function scoreManipulationRisk(violations) {
  let risk = 0;
  risk += hits(violations, 'manipulation') * 30;
  risk += hits(violations, 'falseUrgency') * 18;
  risk += hits(violations, 'pressureAffiliate') * 20;
  risk += hits(violations, 'shameSelling') * 18;
  risk += hits(violations, 'fearExploitation') * 15;
  risk += hits(violations, 'deception') * 20;
  return clampScore(risk);
}

function scoreExploitationRisk(violations) {
  let risk = 0;
  risk += hits(violations, 'fearExploitation') * 24;
  risk += hits(violations, 'unrealisticIncome') * 24;
  risk += hits(violations, 'pressureAffiliate') * 20;
  risk += hits(violations, 'unsupportedHealthClaims') * 16;
  risk += hits(violations, 'shameSelling') * 14;
  risk += hits(violations, 'profitOverPeople') * 20;
  return clampScore(risk);
}

function scoreClarity(text, positives) {
  const clean = collapseWhitespace(text);
  if (!clean) return 0;
  const words = clean.split(/\s+/);
  const sentences = splitSentences(clean);
  const avgLen = words.length / Math.max(1, sentences.length);
  let score = 80;
  if (avgLen <= 22) score += 8;
  else if (avgLen > 34) score -= 12;
  const capsWords = words.filter((w) => w.length >= 4 && w === w.toUpperCase() && /[A-Z]/.test(w)).length;
  if (capsWords >= 3) score -= 12;
  const bangs = (clean.match(/!/g) || []).length;
  if (bangs >= 3) score -= 10;
  const hypeWords = (clean.match(/\b(?:amazing|incredible|unbelievable|insane|mind-?blowing|epic|legendary)\b/gi) || []).length;
  if (hypeWords >= 3) score -= 12;
  score += Math.min(8, (positives.clear || 0) * 4);
  return clampScore(score);
}

function scoreEducationalValue(positives) {
  let score = 58;
  score += Math.min(34, (positives.educational || 0) * 9);
  score += Math.min(10, (positives.honestUncertainty || 0) * 5);
  score += Math.min(6, (positives.truthful || 0) * 3);
  return clampScore(score);
}

// Produce the full numeric scorecard for a block of text.
function scoreOutput(output) {
  const text = normalizeText(output);
  const canonical = expandContractions(text);
  const { violations, hardBlock, totalHits } = detectViolations(canonical);
  const positives = detectPositives(canonical);

  const truthScore = scoreTruth(violations);
  const integrityScore = scoreIntegrity(violations);
  const dignityScore = scoreDignity(violations);
  const loveScore = scoreLove(violations, positives);
  const manipulationRisk = scoreManipulationRisk(violations);
  const exploitationRisk = scoreExploitationRisk(violations);
  const clarityScore = scoreClarity(text, positives);
  const educationalValueScore = scoreEducationalValue(positives);

  const meetsThresholds =
    truthScore >= GOVERNANCE_THRESHOLDS.truthScoreMin &&
    integrityScore >= GOVERNANCE_THRESHOLDS.integrityScoreMin &&
    dignityScore >= GOVERNANCE_THRESHOLDS.dignityScoreMin &&
    loveScore >= GOVERNANCE_THRESHOLDS.loveScoreMin &&
    manipulationRisk <= GOVERNANCE_THRESHOLDS.manipulationRiskMax &&
    exploitationRisk <= GOVERNANCE_THRESHOLDS.exploitationRiskMax;

  const approved = meetsThresholds && !hardBlock;

  return {
    approved,
    hardBlock,
    truthScore,
    integrityScore,
    dignityScore,
    loveScore,
    manipulationRisk,
    exploitationRisk,
    clarityScore,
    educationalValueScore,
    violations,
    positives,
    totalHits
  };
}

// Build the list of specific failure reasons from a scorecard.
function buildFailureReasons(scorecard) {
  const reasons = [];
  const t = GOVERNANCE_THRESHOLDS;
  if (scorecard.hardBlock) {
    reasons.push('Content contains language that assaults human dignity and cannot be published.');
  }
  if (scorecard.truthScore < t.truthScoreMin) reasons.push(`truthScore ${scorecard.truthScore} < ${t.truthScoreMin}`);
  if (scorecard.integrityScore < t.integrityScoreMin) reasons.push(`integrityScore ${scorecard.integrityScore} < ${t.integrityScoreMin}`);
  if (scorecard.dignityScore < t.dignityScoreMin) reasons.push(`dignityScore ${scorecard.dignityScore} < ${t.dignityScoreMin}`);
  if (scorecard.loveScore < t.loveScoreMin) reasons.push(`loveScore ${scorecard.loveScore} < ${t.loveScoreMin}`);
  if (scorecard.manipulationRisk > t.manipulationRiskMax) reasons.push(`manipulationRisk ${scorecard.manipulationRisk} > ${t.manipulationRiskMax}`);
  if (scorecard.exploitationRisk > t.exploitationRiskMax) reasons.push(`exploitationRisk ${scorecard.exploitationRisk} > ${t.exploitationRiskMax}`);
  const flagged = Object.values(scorecard.violations || {}).map((v) => v.label);
  if (flagged.length) reasons.push(`Flagged behaviors: ${flagged.join(', ')}.`);
  return reasons;
}

// ===========================================================================
// REWRITE — repair fixable content so it can pass the standard.
// ===========================================================================

// NOTE: replacements run on canonicalized (expanded) text, so patterns are in
// EXPANDED form ("you will", "do not", "it is").
const REWRITE_REPLACEMENTS = [
  // False urgency -> gentle invitation
  [/\bact\s+now\b/gi, 'when you are ready'],
  [/\bhurry\b/gi, ''],
  [/\bonly\s+\d+\s+(?:left|remaining|spots?)\b/gi, 'available now'],
  [/\blast\s+chance\b/gi, 'available now'],
  [/\bbefore\s+it\s+is\s+(?:gone|too\s+late)\b/gi, 'when it suits you'],
  [/\bdo\s+not\s+miss\s+out\b/gi, 'we would love to have you'],
  [/\blimited\s+time\s+only\b/gi, 'available now'],
  [/\bwhile\s+supplies\s+last\b/gi, ''],
  [/\b(?:buy|order|purchase)\s+(?:it\s+)?(?:immediately|right\s+now|right\s+away)\b/gi, 'consider it when you are ready'],
  // Manipulation -> respect for choice
  [/\byou\s+would\s+be\s+(?:stupid|crazy|dumb|foolish|an\s+idiot)\s+not\s+to\b/gi, 'you may find it worthwhile to'],
  [/\byou\s+would\s+be\s+(?:stupid|crazy|dumb|foolish|an\s+idiot)\b/gi, 'you may find it worthwhile'],
  [/\beveryone\s+(?:else\s+)?is\s+(?:doing|buying)\s+it\b/gi, 'many people have found value in it'],
  [/\bif\s+you\s+(?:really|truly)\s+(?:loved|cared)\b/gi, 'if it fits your needs'],
  [/\bwhat\s+are\s+you\s+waiting\s+for\b/gi, 'take your time to decide'],
  [/\bdo\s+not\s+(?:think|overthink),?\s+just\s+buy\b/gi, 'consider it carefully'],
  [/\bsmart\s+people\s+(?:already\s+)?(?:know|buy)\b/gi, 'you may appreciate'],
  [/\byou\s+have\s+no\s+choice\b/gi, 'the choice is yours'],
  // Shame-based selling -> encouragement
  [/\byou\s+should\s+be\s+ashamed\b/gi, ''],
  [/\bonly\s+(?:losers|failures|poor\s+people)\b/gi, 'many people'],
  [/\bdo\s+not\s+be\s+(?:poor|broke|a\s+loser)\b/gi, 'you can grow at your own pace'],
  [/\bembarrass(?:ing|ed)?\s+yourself\b/gi, ''],
  [/\bwhat\s+will\s+people\s+think\s+of\s+you\b/gi, ''],
  // Fear-based exploitation -> reassurance
  [/\byou\s+will\s+regret\s+(?:it|this)\b/gi, 'you can decide what is right for you'],
  [/\bbefore\s+it\s+is\s+too\s+late\b/gi, 'when the time is right'],
  [/\byou\s+are\s+in\s+danger\b/gi, ''],
  [/\bthis\s+could\s+ruin\s+(?:you|your\s+life)\b/gi, ''],
  [/\bscared\s+to\s+(?:lose|miss)\b/gi, 'free to consider'],
  [/\byour\s+family\s+will\s+suffer\b/gi, ''],
  [/\bterrifying\b/gi, 'noteworthy'],
  // Manipulative guarantees / misleading claims -> honest framing
  [/\b100%\s+guaranteed\b/gi, 'designed to help'],
  [/\bguaranteed\s+to\s+(?:work|succeed)\b/gi, 'designed to help'],
  [/\bresults?\s+guaranteed\b/gi, 'results vary from person to person'],
  [/\bno\s+risk\b/gi, 'low commitment'],
  [/\bnever\s+fails?\b/gi, 'works well for many'],
  [/\binstant(?:ly)?\s+(?:cure|heal|fix)\b/gi, 'support'],
  [/\b(?:fix(?:es|ed)?|cure[sd]?|heal[sd]?|solve[sd]?)\s+everything(?:\s+instantly)?\b/gi, 'supports your overall wellness'],
  [/\b,?\s*guaranteed\s*(?=[!.?]|$)/gi, ''],
  // Unsupported health claims -> compliant wellness language
  [/\bmiracle\s+(?:cure|remedy|supplement)\b/gi, 'wellness supplement'],
  [/\bproven\s+to\s+cure\b/gi, 'formulated to support'],
  [/\bcures?\b/gi, 'may support wellness for'],
  [/\bheals?\b/gi, 'may support'],
  [/\btreats?\s+(disease|illness|cancer|diabetes|anxiety|depression)\b/gi, 'may support wellness'],
  [/\bprevents?\s+disease\b/gi, 'supports a healthy lifestyle'],
  [/\breverses?\s+(?:aging|disease|illness)\b/gi, 'supports healthy routines'],
  [/\bmedical\s+miracle\b/gi, 'wellness option'],
  [/\bdiagnos(?:e|es|is)\b/gi, 'support'],
  // Unrealistic income -> honest opportunity
  [/\bget\s+rich\s+quick\b/gi, 'build income over time with consistent effort'],
  [/\bguarantee[sd]?\s+(?:you|they)\s+will\s+make\b/gi, 'may help you earn (results vary with effort)'],
  [/\bmake\s+\$?\d[\d,]*\+?\s*(?:k|thousand)?\s*(?:a|per|\/)\s*(?:day|week|month)\b/gi, 'build income over time (results vary)'],
  [/\bguaranteed\s+(income|profits?|returns?|money)\b/gi, 'the opportunity to earn (results vary with effort)'],
  [/\bfinancial\s+freedom\s+overnight\b/gi, 'long-term financial growth through consistent work'],
  [/\bquit\s+your\s+(?:job|9\s*-?\s*5)\s+(?:this\s+week|in\s+days|overnight)\b/gi, 'grow additional income over time'],
  [/\beasy\s+money\b/gi, 'honest earning opportunity'],
  [/\bno\s+(?:work|effort)\s+(?:required|needed)\b/gi, 'with consistent effort'],
  [/\bpassive\s+income\s+on\s+autopilot\b/gi, 'income that can grow with steady effort'],
  // Pressure-based affiliate tactics -> respectful outreach
  [/\brecruit\s+(?:as\s+many|everyone)\b/gi, 'thoughtfully invite people who may benefit'],
  [/\bpressure\s+(?:them|your\s+\w+)\s+(?:until|to\s+buy)\b/gi, 'respectfully share the option'],
  [/\bdo\s+not\s+take\s+no\s+for\s+an\s+answer\b/gi, 'respect their decision'],
  [/\bkeep\s+(?:pushing|hounding)\s+(them|until)\b/gi, 'kindly follow up with $1'],
  [/\bguilt\s+them\s+into\b/gi, 'invite them to consider'],
  [/\bspam\s+(everyone|your\s+\w+)\b/gi, 'thoughtfully reach out to $1'],
  // Profit-over-people -> service framing
  [/\bjust\s+(?:take|get)\s+their\s+money\b/gi, 'serve them well'],
  [/\bsqueeze\s+(?:every\s+)?(?:dollar|cent)\s+out\s+of\s+them\b/gi, 'create genuine value for them']
];

// Rewrite fixable content. Sentences carrying dignity assaults (hate/humiliation)
// or division/profit-over-people framing are removed entirely; softer categories
// are softened via phrase replacement. Content whose ONLY substance is a dignity
// assault cannot be salvaged — passedAfter stays false so the caller withholds it.
function rewriteIfNeeded(output) {
  const original = normalizeText(output);
  const before = scoreOutput(original);
  if (before.approved) {
    return { changed: false, text: original, transformations: [], passedAfter: true, scoreAfter: before };
  }

  const canonical = expandContractions(original);
  const originalHadHardBlock = detectViolations(canonical).hardBlock;
  const transformations = [];

  // 1. Remove entire sentences that carry hard-block, division, or profit-over-people language.
  const removalPatterns = [
    ...PROHIBITED_PATTERNS.hatefulLanguage,
    ...PROHIBITED_PATTERNS.humiliation,
    ...PROHIBITED_PATTERNS.division,
    ...PROHIBITED_PATTERNS.profitOverPeople
  ];
  const sentences = splitSentences(canonical);
  const keptSentences = sentences.filter((sentence) => {
    const offending = removalPatterns.some((p) => p.test(sentence));
    if (offending) transformations.push({ type: 'sentence-removed', sentence });
    return !offending;
  });
  let working = keptSentences.join(' ');

  // 2. Apply phrase-level replacements for softer categories.
  for (const [pattern, replacement] of REWRITE_REPLACEMENTS) {
    if (pattern.test(working)) {
      working = working.replace(pattern, replacement);
      transformations.push({ type: 'phrase-replaced', pattern: String(pattern) });
    }
  }

  working = tidyProse(working);
  const after = scoreOutput(working);

  // A rewrite only "passes" when the repaired text is compliant, non-empty, and
  // the original did not contain a dignity-assault (which requires human review).
  const passedAfter = after.approved && Boolean(working.trim()) && !originalHadHardBlock;

  return {
    changed: working !== original,
    text: working,
    transformations,
    passedAfter,
    scoreAfter: after
  };
}

// ===========================================================================
// GOVERNANCE LOG (file-backed, resilient, capped)
// ===========================================================================

const GOVERNANCE_LOG_PATH = path.join(__dirname, '..', 'generated', 'governance-log.json');
const MAX_LOG_ENTRIES = 2000;
const MAX_STORED_TEXT = 1200;

function truncate(text, max = MAX_STORED_TEXT) {
  const clean = String(text || '');
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function readGovernanceLog() {
  try {
    if (!fs.existsSync(GOVERNANCE_LOG_PATH)) return [];
    const raw = fs.readFileSync(GOVERNANCE_LOG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function logGovernanceEvent(entry) {
  try {
    const dir = path.dirname(GOVERNANCE_LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const log = readGovernanceLog();
    log.push(entry);
    const trimmed = log.length > MAX_LOG_ENTRIES ? log.slice(log.length - MAX_LOG_ENTRIES) : log;
    fs.writeFileSync(GOVERNANCE_LOG_PATH, JSON.stringify(trimmed, null, 2));
  } catch {
    // Logging must never break the caller.
  }
}

// Aggregate the log for the Admin dashboard.
function getGovernanceStats() {
  const log = readGovernanceLog();
  const total = log.length;
  const approvedCount = log.filter((e) => e.approvalStatus === 'approved').length;
  const blockedCount = log.filter((e) => e.approvalStatus === 'blocked').length;
  const rewrittenCount = log.filter((e) => e.revisionRequired && e.approvalStatus === 'approved').length;

  const violationCounts = {};
  const agentFailures = {};
  let sumLove = 0; let sumTruth = 0; let sumDignity = 0; let sumIntegrity = 0; let scored = 0;

  for (const e of log) {
    (e.violations || []).forEach((v) => { violationCounts[v] = (violationCounts[v] || 0) + 1; });
    if (e.approvalStatus === 'blocked') {
      const agent = e.agentName || 'unknown';
      agentFailures[agent] = (agentFailures[agent] || 0) + 1;
    }
    if (e.scores) {
      sumLove += Number(e.scores.loveScore) || 0;
      sumTruth += Number(e.scores.truthScore) || 0;
      sumDignity += Number(e.scores.dignityScore) || 0;
      sumIntegrity += Number(e.scores.integrityScore) || 0;
      scored += 1;
    }
  }

  const mostCommonViolations = Object.entries(violationCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([violation, count]) => ({ violation, count }));

  const agentsWithRepeatedFailures = Object.entries(agentFailures)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([agent, failures]) => ({ agent, failures }));

  const avg = (sum) => (scored ? Math.round(sum / scored) : null);

  return {
    total,
    approvedCount,
    blockedCount,
    rewrittenCount,
    passRate: total ? Math.round((approvedCount / total) * 100) : null,
    mostCommonViolations,
    agentsWithRepeatedFailures,
    averageLoveScore: avg(sumLove),
    averageTruthScore: avg(sumTruth),
    averageDignityScore: avg(sumDignity),
    averageIntegrityScore: avg(sumIntegrity),
    thresholds: GOVERNANCE_THRESHOLDS,
    recent: log.slice(-25).reverse()
  };
}

// ===========================================================================
// CORE ENTRY POINT — evaluateOutput()
// ===========================================================================

function buildResult(base) {
  // Guarantees every required governance result field is present.
  return Object.assign({
    approved: false,
    loveScore: 0,
    truthScore: 0,
    integrityScore: 0,
    dignityScore: 0,
    manipulationRisk: 100,
    exploitationRisk: 100,
    clarityScore: 0,
    educationalValueScore: 0,
    revisionRequired: true,
    reason: '',
    suggestedRewrite: null,
    finalApprovedOutput: null,
    status: 'Governance Review Required',
    violations: [],
    positives: [],
    agentName: 'unknown',
    workflowName: 'unspecified',
    timestamp: new Date().toISOString()
  }, base);
}

function scorecardToFields(scorecard) {
  return {
    loveScore: scorecard.loveScore,
    truthScore: scorecard.truthScore,
    integrityScore: scorecard.integrityScore,
    dignityScore: scorecard.dignityScore,
    manipulationRisk: scorecard.manipulationRisk,
    exploitationRisk: scorecard.exploitationRisk,
    clarityScore: scorecard.clarityScore,
    educationalValueScore: scorecard.educationalValueScore,
    violations: Object.values(scorecard.violations || {}).map((v) => v.label),
    positives: Object.keys(scorecard.positives || {})
  };
}

/**
 * Evaluate an AI output against the EVICS Sacred Intelligence Standard.
 *
 * @param {string|object} output   The AI-generated content to govern.
 * @param {object} context         { agentName, workflowName, autoRewrite=true, log=true }
 * @returns {object}               Governance result object (see buildResult).
 */
function evaluateOutput(output, context = {}) {
  const agentName = context.agentName || 'unspecified-agent';
  const workflowName = context.workflowName || 'unspecified-workflow';
  const autoRewrite = context.autoRewrite !== false;
  const shouldLog = context.log !== false;
  const timestamp = new Date().toISOString();

  try {
    const originalText = normalizeText(output);

    // Empty content is not publishable, but it is not a violation — flag for review.
    if (!originalText.trim()) {
      const result = buildResult({
        approved: false,
        revisionRequired: true,
        reason: 'No content was provided to evaluate.',
        status: 'Governance Review Required',
        agentName,
        workflowName,
        timestamp,
        loveScore: 0, truthScore: 0, integrityScore: 0, dignityScore: 0,
        manipulationRisk: 0, exploitationRisk: 0, clarityScore: 0, educationalValueScore: 0
      });
      if (shouldLog) writeLogEntry(result, originalText);
      return result;
    }

    const scorecard = scoreOutput(originalText);
    const fields = scorecardToFields(scorecard);

    // Case 0 — dignity assault (hate speech / humiliation). These can NEVER be
    // auto-approved by deleting the offending words; they require human review.
    if (scorecard.hardBlock) {
      const reasons = buildFailureReasons(scorecard);
      const result = buildResult(Object.assign({
        approved: false,
        revisionRequired: true,
        reason: `Output was blocked to protect human dignity. ${reasons.join(' ')}`.trim(),
        suggestedRewrite: null,
        finalApprovedOutput: null,
        status: 'blocked',
        agentName,
        workflowName,
        timestamp
      }, fields));
      if (shouldLog) writeLogEntry(result, originalText);
      return result;
    }

    // Case 1 — passes as-is.
    if (scorecard.approved) {
      const result = buildResult(Object.assign({
        approved: true,
        revisionRequired: false,
        reason: 'Output meets the EVICS Sacred Intelligence Standard.',
        suggestedRewrite: null,
        finalApprovedOutput: originalText,
        status: 'approved',
        agentName,
        workflowName,
        timestamp
      }, fields));
      if (shouldLog) writeLogEntry(result, originalText);
      return result;
    }

    // Case 2 — fails a numeric threshold. Attempt automatic repair, then recheck.
    if (autoRewrite) {
      const rewrite = rewriteIfNeeded(originalText);
      const afterFields = scorecardToFields(rewrite.scoreAfter);
      if (rewrite.passedAfter && rewrite.text.trim()) {
        const result = buildResult(Object.assign({
          approved: true,
          revisionRequired: true,
          reason: 'Original output failed the standard and was automatically revised to comply.',
          suggestedRewrite: rewrite.text,
          finalApprovedOutput: rewrite.text,
          status: 'approved',
          agentName,
          workflowName,
          timestamp
        }, afterFields));
        if (shouldLog) writeLogEntry(result, originalText, rewrite.text);
        return result;
      }

      // Rewrite attempted but still non-compliant (or repaired to nothing usable) — block.
      const reasons = buildFailureReasons(rewrite.scoreAfter);
      const hasUsableRewrite = rewrite.changed && Boolean(rewrite.text.trim());
      const result = buildResult(Object.assign({
        approved: false,
        revisionRequired: true,
        reason: `Output could not be brought into compliance automatically. ${reasons.join(' ')}`.trim(),
        suggestedRewrite: hasUsableRewrite ? rewrite.text : null,
        finalApprovedOutput: null,
        status: 'blocked',
        agentName,
        workflowName,
        timestamp
      }, afterFields));
      if (shouldLog) writeLogEntry(result, originalText, hasUsableRewrite ? rewrite.text : null);
      return result;
    }

    // Case 3 — fails and rewrite disabled.
    const reasons = buildFailureReasons(scorecard);
    const result = buildResult(Object.assign({
      approved: false,
      revisionRequired: true,
      reason: `Output does not meet the standard. ${reasons.join(' ')}`.trim(),
      suggestedRewrite: null,
      finalApprovedOutput: null,
      status: 'blocked',
      agentName,
      workflowName,
      timestamp
    }, fields));
    if (shouldLog) writeLogEntry(result, originalText);
    return result;
  } catch (error) {
    // Safe fallback — never publish on evaluation failure.
    const result = buildResult({
      approved: false,
      revisionRequired: true,
      reason: `Governance evaluation error: ${error && error.message ? error.message : 'unknown error'}.`,
      status: 'Governance Review Required',
      finalApprovedOutput: null,
      agentName,
      workflowName,
      timestamp
    });
    try { if (shouldLog) writeLogEntry(result, normalizeText(output)); } catch { /* ignore */ }
    return result;
  }
}

function writeLogEntry(result, originalText, finalText) {
  logGovernanceEvent({
    id: `gov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    agentName: result.agentName,
    workflowName: result.workflowName,
    timestamp: result.timestamp,
    approvalStatus: result.status,
    approved: result.approved,
    revisionRequired: result.revisionRequired,
    revisionReason: result.reason,
    violations: result.violations || [],
    scores: {
      loveScore: result.loveScore,
      truthScore: result.truthScore,
      integrityScore: result.integrityScore,
      dignityScore: result.dignityScore,
      manipulationRisk: result.manipulationRisk,
      exploitationRisk: result.exploitationRisk,
      clarityScore: result.clarityScore,
      educationalValueScore: result.educationalValueScore
    },
    originalOutput: truncate(originalText),
    finalApprovedOutput: finalText !== undefined ? truncate(finalText) : (result.finalApprovedOutput ? truncate(result.finalApprovedOutput) : null)
  });
}

// ===========================================================================
// WORKFLOW-SPECIFIC WRAPPERS
// ===========================================================================

function validateAgentAction(action, context = {}) {
  return evaluateOutput(action, Object.assign({ workflowName: 'agent-action' }, context));
}

function validateMarketingContent(content, context = {}) {
  return evaluateOutput(content, Object.assign({ workflowName: 'marketing-content' }, context));
}

function validateAffiliateGuidance(content, context = {}) {
  return evaluateOutput(content, Object.assign({ workflowName: 'affiliate-guidance' }, context));
}

function validateCustomerCommunication(content, context = {}) {
  return evaluateOutput(content, Object.assign({ workflowName: 'customer-communication' }, context));
}

function validateLearningLoopRecommendation(content, context = {}) {
  return evaluateOutput(content, Object.assign({ workflowName: 'learning-loop' }, context));
}

// ===========================================================================
// AGENT BOOTSTRAPPING — every AI agent loads the oath + standard before acting.
// ===========================================================================

function bootstrapAgent(agentName) {
  return {
    agentName: agentName || 'unspecified-agent',
    oath: EVICS_AI_OATH,
    standard: SACRED_INTELLIGENCE_STANDARD,
    thresholds: GOVERNANCE_THRESHOLDS,
    loadedAt: new Date().toISOString(),
    acknowledgement:
      'This agent is governed by the EVICS Sacred Intelligence Standard. All output will be measured ' +
      'by truth, wisdom, integrity, dignity, stewardship, compassion, and love before delivery.'
  };
}

module.exports = {
  // Constants
  EVICS_AI_OATH,
  EVICS_USER_AFFILIATE_OATH,
  VOICE_IDENTITY_OATH_LABEL,
  SACRED_INTELLIGENCE_STANDARD,
  GOVERNANCE_THRESHOLDS,
  PROHIBITED_PATTERNS,
  POSITIVE_PATTERNS,
  VIOLATION_LABELS,
  // Core API
  evaluateOutput,
  scoreOutput,
  rewriteIfNeeded,
  detectViolations,
  detectPositives,
  // Workflow wrappers
  validateAgentAction,
  validateMarketingContent,
  validateAffiliateGuidance,
  validateCustomerCommunication,
  validateLearningLoopRecommendation,
  // Bootstrapping
  bootstrapAgent,
  // Logging & admin
  logGovernanceEvent,
  readGovernanceLog,
  getGovernanceStats,
  GOVERNANCE_LOG_PATH
};
