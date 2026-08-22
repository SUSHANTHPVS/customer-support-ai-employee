/**
 * CloudDesk Support AI — Express Server
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { processMessage } = require("./src/chatEngine");

// Hoist KB require once — Node caches it, but we also use it in multiple routes
const kb = require("./src/knowledgeBase");

const app = express();
const PORT = process.env.PORT || 3000;
const STATUS_URL = process.env.CLOUDDESK_STATUS_URL || "https://status.clouddesk.io";

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "16kb" })); // guard against oversized payloads
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: "1h",           // cache static assets in browser
  etag: true,
}));

// ── Session Store ───────────────────────────────────────────────────────────
// Each entry: { history: Array, lastSeen: number }
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_HISTORY   = 40;              // max message turns kept per session

// Sweep stale sessions every 5 minutes — prevents unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of sessions) {
    if (s.lastSeen < cutoff) sessions.delete(id);
  }
}, 5 * 60 * 1000).unref(); // .unref() so this timer doesn't prevent process exit

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/chat
 * Body: { message: string, sessionId?: string }
 * Returns: { sessionId, response: <structured response object> }
 */
app.post("/api/chat", (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Message is required." });
  }

  const trimmed = message.trim();

  if (trimmed.length > 2000) {
    return res.status(400).json({ error: "Message too long (max 2000 characters)." });
  }

  // Get or create session
  const sid = sessionId && sessions.has(sessionId) ? sessionId : uuidv4();
  if (!sessions.has(sid)) {
    sessions.set(sid, { history: [], lastSeen: Date.now() });
  }
  const session = sessions.get(sid);
  session.lastSeen = Date.now(); // refresh TTL on activity

  // Process the message
  const response = processMessage(trimmed, session.history);

  // Store in history — avoid serialising the full response object (it's never read back)
  session.history.push({ role: "user", content: trimmed });
  session.history.push({ role: "assistant", content: response.type });

  // Ring-buffer trim: remove two oldest entries when over limit
  while (session.history.length > MAX_HISTORY) {
    session.history.splice(0, 2);
  }

  res.json({ sessionId: sid, response });
});

/**
 * GET /api/health
 */
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    sessions: sessions.size,
    kbArticles: kb.length,
    statusUrl: STATUS_URL,
  });
});

/**
 * GET /api/kb — list knowledge base summary
 */
app.get("/api/kb", (_req, res) => {
  // Pre-projected at module load — no per-request allocation needed
  res.json(kbSummary);
});

/**
 * GET /api/kb/count — lightweight count endpoint for the sidebar
 */
app.get("/api/kb/count", (_req, res) => {
  res.json({ count: kb.length });
});

// Serve index.html for all other routes (SPA fallback)
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Pre-compute KB summary once at startup ──────────────────────────────────
const kbSummary = kb.map(({ id, category, question }) => ({ id, category, question }));

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 CloudDesk Support AI running at http://localhost:${PORT}`);
  console.log(`   Knowledge base: ${kb.length} articles loaded`);
  console.log(`   Status URL: ${STATUS_URL}`);
  console.log(`   Session TTL: ${SESSION_TTL_MS / 60000} min`);
  console.log(`   Press Ctrl+C to stop\n`);
});

module.exports = app;
