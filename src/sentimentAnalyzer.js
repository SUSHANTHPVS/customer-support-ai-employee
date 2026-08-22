/**
 * Sentiment & Frustration Analyzer
 *
 * Uses natural.SentimentAnalyzer with the AFINN lexicon — a word-list of
 * ~2500 English words scored from -5 (very negative) to +5 (very positive).
 *
 * This replaces the hand-crafted frustration regex patterns in escalation.js
 * with a trained lexicon-based approach that generalises to words not in the
 * original regex list (e.g. "appalling", "infuriated", "disgusted").
 *
 * Additionally uses compromise for linguistic analysis:
 *   - Entity extraction (detects names, places, orgs in messages)
 *   - Negation detection ("not working", "cannot login", "won't load")
 *   - Verb-phrase extraction (what action the user is trying to perform)
 */

const natural     = require("natural");
const nlp         = require("compromise");

// AFINN lexicon with Porter stemmer — so "frustrated" matches "frustrate" etc.
const analyzer = new natural.SentimentAnalyzer(
  "English",
  natural.PorterStemmer,
  "afinn"
);
const tokenizer = new natural.WordTokenizer();

// ── Thresholds ────────────────────────────────────────────────────────────────
// AFINN scores are summed and normalised by token count.
// Normalised score ranges: [-1, -0.5] = strong negative, [-0.5, -0.2] = mild negative
const FRUSTRATION_THRESHOLD = -0.25; // normalised score below this → frustrated
const URGENCY_THRESHOLD     = -0.45; // strong negative → urgent / critical

/**
 * Analyse the sentiment of a message.
 *
 * @param {string} message
 * @returns {{
 *   score: number,          // raw AFINN sum
 *   normalised: number,     // score / token count  (-1 to +1 range)
 *   isFrustrated: boolean,  // true if normalised < FRUSTRATION_THRESHOLD
 *   isUrgent: boolean,      // true if normalised < URGENCY_THRESHOLD
 *   label: string           // "positive" | "neutral" | "negative" | "critical"
 * }}
 */
function analyzeSentiment(message) {
  const tokens     = tokenizer.tokenize(message.toLowerCase()) || [];
  const rawScore   = analyzer.getSentiment(tokens);
  // getSentiment() already normalises by token count
  const normalised = rawScore;

  const isFrustrated = normalised < FRUSTRATION_THRESHOLD;
  const isUrgent     = normalised < URGENCY_THRESHOLD;

  let label;
  if      (normalised > 0.1)  label = "positive";
  else if (normalised > -0.2) label = "neutral";
  else if (normalised > -0.45)label = "negative";
  else                         label = "critical";

  return { score: rawScore, normalised, isFrustrated, isUrgent, label };
}

/**
 * Extract linguistic features from a message using compromise NLP.
 *
 * @param {string} message
 * @returns {{
 *   hasNegation: boolean,     // "not working", "cannot", "won't"
 *   topics: string[],         // nouns / noun-phrases detected
 *   verbs: string[],          // root-form verbs (what the user wants to DO)
 *   isQuestion: boolean,      // ends with ? or starts with wh-word
 *   urgencyWords: string[],   // "urgent", "asap", "critical", etc. detected
 * }}
 */
function extractFeatures(message) {
  const doc = nlp(message);

  // Negation: look for "not", "cannot", "can't", "won't", "never", "no"
  const negationTerms = doc.match("(not|never|no|cannot|can't|won't|doesn't|didn't|isn't|aren't)");
  const hasNegation   = negationTerms.length > 0;

  // Topics: noun phrases (what they're talking about)
  const topics = doc.nouns().out("array").map(t => t.toLowerCase()).filter(Boolean);

  // Verbs: what action they want (infinitive form via compromise)
  const verbs  = doc.verbs().toInfinitive().out("array").map(v => v.toLowerCase()).filter(Boolean);

  // Is it a question?
  const isQuestion = message.trim().endsWith("?") ||
    /^(what|how|why|when|where|who|can|could|would|is|are|do|does|did)\b/i.test(message.trim());

  // Urgency words detected via compromise term matching
  const urgencyWords = doc
    .match("(urgent|urgently|asap|immediately|critical|emergency|right now|production down|outage|down right now)")
    .out("array")
    .map(w => w.toLowerCase())
    .filter(Boolean);

  return { hasNegation, topics, verbs, isQuestion, urgencyWords };
}

module.exports = { analyzeSentiment, extractFeatures };
