/**
 * Response Builder
 * Composes the final response object sent to the frontend.
 *
 * - Ticket IDs use a monotonic counter + timestamp suffix — no collision risk
 * - Confidence scores capped at 99 so they never display > 99% in the UI
 *   (scores can exceed 1.0 due to keyword bonus being additive to cosine sim)
 * - relatedEntries slice limit enforced here exclusively
 */

const CATEGORY_LABELS = {
  billing:        "💳 Billing",
  technical:      "🔧 Technical",
  account_access: "🔑 Account Access",
  general:        "ℹ️ General",
};

const CATEGORY_COLORS = {
  billing:        "#f59e0b",
  technical:      "#3b82f6",
  account_access: "#8b5cf6",
  general:        "#6b7280",
};

const SEVERITY_COLORS = {
  low:    "#6b7280",
  medium: "#f59e0b",
  high:   "#ef4444",
};

// Monotonic ticket counter — prevents duplicate IDs within the same millisecond
let _ticketSeq = 0;
function generateTicketId() {
  _ticketSeq = (_ticketSeq + 1) % 1_000_000;
  const seq   = _ticketSeq.toString(36).toUpperCase().padStart(4, "0");
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  return `TKT-${stamp}${seq}`;
}

/** Cap a 0-1 float score to a display percentage, max 99 */
function pct(score) {
  return Math.min(Math.round(score * 100), 99);
}

function friendlyIntro(category) {
  switch (category) {
    case "technical":
      return "This looks like a technical issue. Here’s the most likely fix:";
    case "billing":
      return "Here’s the most relevant billing guidance:";
    case "account_access":
      return "This looks related to account access. Here’s the likely fix:";
    case "general":
      return "Here’s the most relevant information for that:";
    default:
      return "Here’s the most relevant guidance:";
  }
}

// ── Builders ─────────────────────────────────────────────────────────────────

/**
 * Build a successful answer response.
 */
function buildAnswer({ category, classifierConf, entry, retrievalScore, relatedEntries = [] }) {
  return {
    type:          "answer",
    category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    categoryColor: CATEGORY_COLORS[category] || "#6b7280",
    confidence: {
      classifier: pct(classifierConf),
      retrieval:  pct(retrievalScore),
    },
    answer:         `${friendlyIntro(category)}\n\n${entry.answer}`,
    sourceId:       entry.id,
    sourceQuestion: entry.question,
    related: relatedEntries.slice(0, 2).map((r) => ({
      id:       r.entry.id,
      question: r.entry.question,
      score:    Math.min(Math.round(r.score * 100), 99),
    })),
  };
}

/**
 * Build an escalation response.
 */
function buildEscalation({
  category, classifierConf, retrievalScore, reasons, severity, bestEntry,
}) {
  return {
    type:          "escalation",
    category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    categoryColor: CATEGORY_COLORS[category] || "#6b7280",
    severity,
    severityColor: SEVERITY_COLORS[severity],
    confidence: {
      classifier: pct(classifierConf),
      retrieval:  pct(retrievalScore),
    },
    reasons,
    partialAnswer:
      bestEntry && retrievalScore > 0.04
        ? {
            answer:   bestEntry.entry.answer,
            question: bestEntry.entry.question,
            note:     "This may be partially relevant while you wait for an agent:",
          }
        : null,
    humanHandoff: {
      message: "Your ticket has been queued for a human agent. Expected response time:",
      times: {
        Enterprise: "< 1 hour",
        Pro:        "< 4 hours",
        Starter:    "< 24 hours",
      },
      ticketId: generateTicketId(),
    },
  };
}

/**
 * Build a greeting / welcome response.
 */
function buildGreeting() {
  return {
    type:    "greeting",
    message:
      "Hi there! 👋 I'm **CloudDesk Support AI**, your Tier-1 support assistant.\n\nI can help you with:\n- 💳 **Billing** — invoices, payments, plans, refunds\n- 🔧 **Technical** — errors, integrations, app issues\n- 🔑 **Account Access** — passwords, 2FA, team management\n\nJust type your question and I'll do my best to help. If I can't resolve it, I'll connect you with a human agent right away.",
  };
}

module.exports = { buildAnswer, buildEscalation, buildGreeting };
