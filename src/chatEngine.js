/**
 * Chat Engine — orchestrates classification → retrieval → escalation → response
 *
 * ML Upgrade:
 *  - Uses an ensemble of the keyword classifier (fast, deterministic) and
 *    the Bayes ML classifier (natural.BayesClassifier, trained on labeled data).
 *  - The Bayes model is loaded once at startup (or trained fresh if no saved
 *    model exists) so it never blocks request handling.
 *  - Category decision: if both agree → high confidence; if they disagree →
 *    the Bayes model wins but confidence is penalised; fallback to keyword
 *    classifier if Bayes has not loaded yet.
 */

const { classify }            = require("./classifier");
const { loadOrTrain, mlClassify } = require("./mlClassifier");
const { retrieve, getBestMatch, RETRIEVAL_THRESHOLD } = require("./rag");
const { evaluateEscalation }  = require("./escalation");
const { buildAnswer, buildEscalation, buildGreeting } = require("./responseBuilder");

// ── Greeting patterns (compiled once) ────────────────────────────────────────
const GREETING_PATTERNS = [
  /^(hi|hello|hey|howdy|greetings|good (morning|afternoon|evening)|sup|yo)[\s!?.]*$/i,
  /^(what can you do|help me|i need help|start|begin)[\s!?.]*$/i,
];

// ── Load ML model at startup (non-blocking) ───────────────────────────────────
let bayesModel = null;
loadOrTrain().then((model) => {
  bayesModel = model;
  console.log("[chatEngine] Bayes classifier ready");
}).catch((err) => {
  console.warn("[chatEngine] Bayes classifier failed to load, using keyword-only mode:", err.message);
});

// ── Ensemble Classification ───────────────────────────────────────────────────
/**
 * Combine keyword classifier + Bayes ML classifier.
 *
 * Agreement bonus: when both agree, confidence increases.
 * Disagreement penalty: when they disagree, Bayes wins but confidence drops.
 *
 * @param {string} message
 * @returns {{ category: string, confidence: number, method: string }}
 */
function ensembleClassify(message) {
  const kw = classify(message);

  if (!bayesModel) {
    // Bayes not ready yet — fall back gracefully to keyword classifier
    return { category: kw.category, confidence: kw.confidence, method: "keyword-only" };
  }

  const ml = mlClassify(message, bayesModel);

  if (kw.category === ml.category) {
    // Both agree — boost confidence
    const confidence = Math.min(kw.confidence * 0.5 + ml.confidence * 0.5 + 0.1, 1.0);
    return { category: kw.category, confidence, method: "ensemble-agree" };
  } else {
    // Disagree — Bayes model wins (trained signal), but confidence is penalised
    const confidence = ml.confidence * 0.65;
    return { category: ml.category, confidence, method: "ensemble-disagree" };
  }
}

// ── Message Processor ─────────────────────────────────────────────────────────

/**
 * Process a user message and return a structured response.
 *
 * @param {string} message - Raw user input (already trimmed)
 * @param {Array}  history - Previous [{role, content}] turns
 * @returns {object} Structured response object
 */
function processMessage(message, history = []) {
  // ── 1. Greeting short-circuit ──────────────────────────────────────────
  if (GREETING_PATTERNS.some((p) => p.test(message))) {
    return buildGreeting();
  }

  // ── 2. Ensemble classification ─────────────────────────────────────────
  const { category, confidence: classifierConf, method } = ensembleClassify(message);

  // ── 3. Retrieve — single call, category-scoped first ──────────────────
  let candidates = retrieve(message, { category, topK: 5 });
  let bestMatch  = candidates[0] ?? null;

  // Global fallback only when category-scoped result is weak
  if (!bestMatch || bestMatch.score < RETRIEVAL_THRESHOLD) {
    const globalCandidates = retrieve(message, { topK: 5 });
    const globalBest = globalCandidates[0] ?? null;
    if (globalBest && (!bestMatch || globalBest.score > bestMatch.score)) {
      bestMatch  = globalBest;
      candidates = globalCandidates;
    }
  }

  const retrievalScore = bestMatch ? bestMatch.score : 0;
  const finalCategory = bestMatch && bestMatch.score >= RETRIEVAL_THRESHOLD
    ? bestMatch.entry.category
    : category;

  // ── 4. Evaluate escalation (ML sentiment + rules) ──────────────────────
  const { escalate, reasons, severity } = evaluateEscalation({
    message,
    classifierConf,
    retrievalScore,
    retrievalThreshold: RETRIEVAL_THRESHOLD,
    category: finalCategory,
  });

  // ── 5. Build response ──────────────────────────────────────────────────
  if (escalate) {
    return buildEscalation({
      category: finalCategory,
      classifierConf,
      retrievalScore,
      reasons,
      severity,
      bestEntry: bestMatch,
    });
  }

  if (!bestMatch) {
    return {
      type: "answer",
      category: finalCategory,
      categoryLabel: "ℹ️ General",
      categoryColor: "#6b7280",
      confidence: {
        classifier: Math.min(Math.round(classifierConf * 100), 99),
        retrieval: 0,
      },
      answer: "I couldn’t find a strong match in the support database for that question. Please rephrase it, and if it’s urgent, I can connect you to a human agent.",
      sourceId: null,
      sourceQuestion: null,
      related: [],
    };
  }

  const related = candidates
    .filter((r) => r.entry.id !== bestMatch.entry.id)
    .slice(0, 3);

  return buildAnswer({
    category: finalCategory,
    classifierConf,
    entry: bestMatch.entry,
    retrievalScore,
    relatedEntries: related,
  });
}

module.exports = { processMessage };
