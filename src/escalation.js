/**
 * Escalation Logic
 *
 * Upgraded to combine:
 *  1. Rule-based regex triggers (human request, sensitive topics, urgency keywords)
 *  2. ML sentiment analysis via natural.SentimentAnalyzer + AFINN lexicon
 *     — replaces the hard-coded frustration regex with a trained lexicon that
 *       generalises to words not in the original list
 *  3. compromise NLP for urgency word detection and negation context
 *
 * Each trigger still produces a human-readable reason string so the UI
 * can display exactly why the ticket was escalated.
 */

const { analyzeSentiment, extractFeatures } = require("./sentimentAnalyzer");

// ── Rule-based Pattern Groups ─────────────────────────────────────────────────

const HUMAN_REQUEST_PATTERNS = [
  /\b(speak|talk|chat)\s+(to|with)\s+(a\s+)?(human|person|agent|representative|rep|someone)\b/i,
  /\b(connect me|transfer me|escalate)\b/i,
  /\breal person\b/i,
  /\bhuman support\b/i,
];

const SENSITIVE_TOPIC_PATTERNS = [
  /\b(legal|court|law enforcement|police|gdpr request|data deletion request|right to erasure)\b/i,
  /\b(hacked|compromised|breach|unauthorized access|stolen account)\b/i,
  /\b(discrimination|harassment|abuse)\b/i,
];

const URGENCY_PATTERNS = [
  /\b(urgent|asap|immediately|critical|emergency|right now)\b/i,
  /\b(losing|lost|missing)\s+(data|revenue|customers|money)\b/i,
  /\b(production|prod)\s+(down|broken|outage)\b/i,
  /\bsla\b/i,
];

// Pre-computed severity rank — O(1) lookup
const SEVERITY_RANK = { low: 0, medium: 1, high: 2 };

// ── Escalation Evaluator ──────────────────────────────────────────────────────

/**
 * Evaluate whether a message should be escalated to a human agent.
 *
 * @param {object} params
 * @param {string} params.message
 * @param {number} params.classifierConf
 * @param {number} params.retrievalScore
 * @param {number} params.retrievalThreshold
 * @param {string} params.category
 *
 * @returns {{ escalate: boolean, reasons: string[], severity: string }}
 */
function evaluateEscalation({
  message,
  classifierConf,
  retrievalScore,
  retrievalThreshold,
  category,
}) {
  const reasons = [];
  let maxSeverity = "low";

  const setSeverity = (s) => {
    if (SEVERITY_RANK[s] > SEVERITY_RANK[maxSeverity]) maxSeverity = s;
  };

  // ── 1. Explicit human request (rule-based) ──────────────────────────────
  for (const pattern of HUMAN_REQUEST_PATTERNS) {
    if (pattern.test(message)) {
      reasons.push("You requested to speak with a human agent.");
      setSeverity("high");
      break;
    }
  }

  // ── 2. Sensitive topics (rule-based) ────────────────────────────────────
  for (const pattern of SENSITIVE_TOPIC_PATTERNS) {
    if (pattern.test(message)) {
      reasons.push(
        "Your message mentions a sensitive topic (security incident, legal matter, or data rights request) that requires human review."
      );
      setSeverity("high");
      break;
    }
  }

  // ── 3. Rule-based urgency keywords ──────────────────────────────────────
  for (const pattern of URGENCY_PATTERNS) {
    if (pattern.test(message)) {
      reasons.push(
        "Your message indicates an urgent or critical situation that needs immediate human attention."
      );
      setSeverity("high");
      break;
    }
  }

  // ── 4. ML Sentiment Analysis (replaces frustration regex) ───────────────
  //    Uses natural.SentimentAnalyzer + AFINN lexicon.
  //    Suppressed when retrieval score is strong — a clear FAQ match means
  //    the user is asking a question, not expressing frustration.
  //    (e.g. "app keeps crashing on my phone" scores negative on AFINN
  //     because "crashing" is negative, but it's a technical support question)
  const sentiment = analyzeSentiment(message);
  const isLikelyFAQ = retrievalScore >= retrievalThreshold * 2; // confident KB match

  if (!isLikelyFAQ) {
    if (sentiment.isUrgent && !reasons.some(r => r.includes("urgent"))) {
      reasons.push(
        `Your message carries strongly negative sentiment (score: ${sentiment.normalised.toFixed(2)}) suggesting an urgent situation. Connecting you with a human agent.`
      );
      setSeverity("high");
    } else if (sentiment.isFrustrated) {
      reasons.push(
        `Your message indicates significant frustration (sentiment score: ${sentiment.normalised.toFixed(2)}) — a human agent can better address your concerns.`
      );
      setSeverity("medium");
    }
  }

  // ── 5. compromise NLP — urgency word detection ──────────────────────────
  //    Catches urgency phrasing not matched by regex above
  const features = extractFeatures(message);
  if (features.urgencyWords.length > 0 && !reasons.some(r => r.includes("urgent"))) {
    reasons.push(
      `Urgency detected in your message ("${features.urgencyWords[0]}"). Escalating to ensure prompt attention.`
    );
    setSeverity("high");
  }

  // ── 6. Low classifier confidence ────────────────────────────────────────
  if (classifierConf < 0.25 && category === "general") {
    reasons.push(
      `I wasn't confident enough to categorize your request (confidence: ${Math.round(classifierConf * 100)}%). A human agent can better understand your specific needs.`
    );
    setSeverity("medium");
  }

  // ── 7. Low retrieval score ───────────────────────────────────────────────
  if (retrievalScore < retrievalThreshold) {
    reasons.push(
      `I couldn't find a reliable answer in my knowledge base for your question (match score: ${Math.round(retrievalScore * 100)}%). Escalating to ensure you get accurate information.`
    );
    setSeverity("medium");
  }

  return {
    escalate: reasons.length > 0,
    reasons,
    severity: maxSeverity,
    sentiment, // pass through so chatEngine can use it if needed
  };
}

module.exports = { evaluateEscalation };
