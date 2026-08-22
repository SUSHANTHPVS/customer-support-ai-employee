/**
 * CloudDesk Support AI — Frontend Script
 *
 * Optimizations vs original:
 *  - loadKBCount() calls /api/kb/count instead of fetching the full KB list
 *  - onInputChange() wraps height resize in requestAnimationFrame to avoid
 *    forced synchronous layout on every keystroke
 *  - escapeHtml() uses a single-pass replace with a lookup map (4 → 1 pass)
 *  - All compiled regexes in markdownToHtml() hoisted to module level
 *  - Typing indicator ID uses a monotonic counter instead of Date.now()
 *  - CSS transition: all → specific properties (in style.css)
 *  - scrollToBottom() called once after DOM insert, not redundantly
 */

// ── State ─────────────────────────────────────────────────────────────────────
let sessionId    = null;
let isProcessing = false;
let _typingSeq   = 0; // monotonic counter for typing indicator IDs

// ── Pre-compiled markdown regexes (hoisted — compiled once) ──────────────────
const MD_BOLD  = /\*\*(.+?)\*\*/g;
const MD_CODE  = /`([^`]+)`/g;
const MD_LINK  = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const MD_LIST  = /^- (.+)/;

// Single-pass HTML-escape lookup
const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const ESC_RE  = /[&<>"]/g;

// ── DOM Refs ──────────────────────────────────────────────────────────────────
const appRoot           = document.querySelector(".app");
const sidebar           = document.querySelector(".sidebar");
const messagesContainer = document.getElementById("messagesContainer");
const messageInput      = document.getElementById("messageInput");
const sendBtn           = document.getElementById("sendBtn");
const charCount         = document.getElementById("charCount");
const kbCountEl         = document.getElementById("kbCount");
const mobileMenuBtn     = document.querySelector(".mobile-menu-btn");
const sidebarCloseBtn   = document.querySelector(".sidebar-close-btn");
const mobileSidebarHandle = document.querySelector(".mobile-sidebar-handle");
const EDGE_GRAB_ZONE = 24;
const DRAG_ACTIVE_SLOP = 12;
const SWIPE_OPEN_THRESHOLD = 72;
const SIDEBAR_DRAG_MAX = () => Math.min(window.innerWidth * 0.82, 320);
let touchStartX = 0;
let touchStartY = 0;
let touchState = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadKBCount();
  showWelcome();
  messageInput.addEventListener("input",   onInputChange);
  messageInput.addEventListener("keydown", onKeyDown);
  attachMobileMenuHandlers();
});

function attachMobileMenuHandlers() {
  if (!mobileMenuBtn && !mobileSidebarHandle) return;

  const setSidebarVisualOffset = (offset) => {
    const max = SIDEBAR_DRAG_MAX();
    const safeOffset = Math.min(Math.max(offset, 0), max);
    sidebar.style.setProperty("--sidebar-pan", `${safeOffset}px`);
  };

  const openSidebar = () => {
    appRoot.classList.add("sidebar-open");
    appRoot.classList.remove("sidebar-dragging");
    sidebar.style.setProperty("--sidebar-pan", "100%");
    mobileMenuBtn?.setAttribute("aria-expanded", "true");
  };

  const closeSidebar = () => {
    appRoot.classList.remove("sidebar-open");
    appRoot.classList.remove("sidebar-dragging");
    sidebar.style.setProperty("--sidebar-pan", "0px");
    mobileMenuBtn?.setAttribute("aria-expanded", "false");
  };

  mobileMenuBtn?.addEventListener("click", () => {
    const isOpen = appRoot.classList.toggle("sidebar-open");
    sidebar.style.setProperty("--sidebar-pan", isOpen ? "100%" : "0px");
    mobileMenuBtn.setAttribute("aria-expanded", String(isOpen));
  });

  mobileSidebarHandle?.addEventListener("click", openSidebar);

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener("click", closeSidebar);
  }

  appRoot.addEventListener("click", (event) => {
    if (window.innerWidth > 640) return;
    const clickedSidebar = sidebar && sidebar.contains(event.target);
    const clickedMenu = mobileMenuBtn ? mobileMenuBtn.contains(event.target) : false;
    const clickedHandle = mobileSidebarHandle ? mobileSidebarHandle.contains(event.target) : false;
    const clickedQuickTopic = event.target.closest(".topic-btn");
    const clickedNavItem = event.target.closest(".nav-item");

    if (!clickedSidebar && !clickedMenu && !clickedHandle && !clickedQuickTopic && !clickedNavItem && appRoot.classList.contains("sidebar-open")) {
      closeSidebar();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && window.innerWidth <= 640 && appRoot.classList.contains("sidebar-open")) {
      closeSidebar();
    }
  });

  document.addEventListener("touchstart", (event) => {
    if (window.innerWidth > 640) return;

    const touch = event.changedTouches[0];
    const isSidebarVisible = appRoot.classList.contains("sidebar-open");
    const nearEdge = touch.clientX <= EDGE_GRAB_ZONE;

    if (!isSidebarVisible && !nearEdge) return;

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchState = {
      startedOpen: isSidebarVisible,
      dragOffset: 0,
      moved: false,
    };
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (window.innerWidth > 640 || !touchState) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) < DRAG_ACTIVE_SLOP || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) {
      return;
    }

    touchState.dragOffset = deltaX;
    touchState.moved = true;
    appRoot.classList.add("sidebar-dragging");

    const max = SIDEBAR_DRAG_MAX();
    const visualOffset = touchState.startedOpen ? Math.min(Math.max(max + deltaX, 0), max) : Math.min(Math.max(deltaX, 0), max);
    setSidebarVisualOffset(visualOffset);
    event.preventDefault();
  }, { passive: false });

  document.addEventListener("touchend", (event) => {
    if (window.innerWidth > 640 || !touchState) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const max = SIDEBAR_DRAG_MAX();

    appRoot.classList.remove("sidebar-dragging");

    if (Math.abs(deltaX) < SWIPE_OPEN_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) {
      if (touchState.startedOpen && Math.abs(deltaX) < SWIPE_OPEN_THRESHOLD && !touchState.moved) {
        closeSidebar();
      }
      touchState = null;
      sidebar.style.setProperty("--sidebar-pan", appRoot.classList.contains("sidebar-open") ? "100%" : "0px");
      return;
    }

    const shouldOpen = touchState.startedOpen ? deltaX > -max * 0.35 : deltaX > max * 0.35;

    if (shouldOpen) {
      openSidebar();
    } else {
      closeSidebar();
    }

    touchState = null;
  }, { passive: true });
}

function loadKBCount() {
  // Lightweight count endpoint — no longer fetches the full KB article list
  fetch("/api/kb/count")
    .then((r) => r.json())
    .then(({ count }) => {
      kbCountEl.textContent = `${count} KB articles loaded`;
    })
    .catch(() => {
      kbCountEl.textContent = "KB status unknown";
    });
}

function showWelcome() {
  messagesContainer.insertAdjacentHTML("beforeend", `
    <div class="message-row bot" id="welcomeMsg">
      <div class="avatar bot">🤖</div>
      <div class="message-content">
        <div class="greeting-card">
          <div class="greeting-title">👋 Welcome to CloudDesk Support</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px;">
            I'm your AI Tier-1 support assistant. I can handle billing questions, technical issues,
            and account access problems — or escalate to a human agent when needed.
          </p>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--text-secondary);">
            <span>💳 <strong style="color:var(--text-primary)">Billing</strong> — invoices, payments, plans, refunds</span>
            <span>🔧 <strong style="color:var(--text-primary)">Technical</strong> — errors, integrations, app issues</span>
            <span>🔑 <strong style="color:var(--text-primary)">Account Access</strong> — passwords, 2FA, team management</span>
          </div>
          <p style="color:var(--text-muted);font-size:12px;margin-top:12px;">
            Type your question below, or pick a topic from the sidebar.
          </p>
        </div>
        <div class="timestamp">${formatTime(new Date())}</div>
      </div>
    </div>`);
}

// ── Input Handlers ─────────────────────────────────────────────────────────────
function onInputChange() {
  const len = messageInput.value.length;

  // Synchronous: cheap DOM text + color update
  charCount.textContent = `${len} / 2000`;
  charCount.style.color = len > 1800 ? "var(--danger)" : "var(--text-muted)";

  // Defer layout-triggering height resize to next animation frame —
  // avoids forced synchronous layout (read scrollHeight) on every keystroke
  requestAnimationFrame(() => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
  });
}

function onKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ── Send Message ───────────────────────────────────────────────────────────────
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isProcessing) return;

  appendUserMessage(text);
  messageInput.value = "";
  messageInput.style.height = "auto";
  charCount.textContent = "0 / 2000";

  setProcessing(true);
  const typingId = showTyping();

  fetch("/api/chat", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ message: text, sessionId }),
  })
    .then((r) => {
      if (!r.ok) return r.json().then((e) => { throw new Error(e.error || "Server error"); });
      return r.json();
    })
    .then((data) => {
      sessionId = data.sessionId;
      removeTyping(typingId);
      renderBotResponse(data.response);
    })
    .catch((err) => {
      removeTyping(typingId);
      renderError(err.message || "Something went wrong. Please try again.");
    })
    .finally(() => {
      setProcessing(false);
    });
}

// Quick message helper (called by sidebar buttons)
function sendQuickMessage(text) {
  messageInput.value = text;
  onInputChange();
  if (window.innerWidth <= 640) {
    appRoot.classList.remove("sidebar-open");
    mobileMenuBtn?.setAttribute("aria-expanded", "false");
  }
  sendMessage();
}

// New chat
function startNewChat() {
  sessionId = null;
  messagesContainer.innerHTML = "";
  showWelcome();
  messageInput.value = "";
  messageInput.style.height = "auto";
  charCount.textContent = "0 / 2000";
  if (window.innerWidth <= 640) {
    appRoot.classList.remove("sidebar-open");
    mobileMenuBtn?.setAttribute("aria-expanded", "false");
  }
  messageInput.focus();
}

// ── UI Helpers ─────────────────────────────────────────────────────────────────
function setProcessing(state) {
  isProcessing          = state;
  sendBtn.disabled      = state;
  messageInput.disabled = state;
}

function appendUserMessage(text) {
  messagesContainer.insertAdjacentHTML("beforeend", `
    <div class="message-row user">
      <div class="avatar user">🧑</div>
      <div class="message-content">
        <div class="bubble user">${escapeHtml(text)}</div>
        <div class="timestamp">${formatTime(new Date())}</div>
      </div>
    </div>`);
  scrollToBottom();
}

function showTyping() {
  // Monotonic counter — no Date.now() collision risk
  const id = `typing-${++_typingSeq}`;
  messagesContainer.insertAdjacentHTML("beforeend", `
    <div class="message-row bot" id="${id}">
      <div class="avatar bot">🤖</div>
      <div class="message-content">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>`);
  scrollToBottom();
  return id;
}

function removeTyping(id) {
  document.getElementById(id)?.remove();
}

function renderError(msg) {
  messagesContainer.insertAdjacentHTML("beforeend", `
    <div class="message-row bot">
      <div class="avatar bot">🤖</div>
      <div class="message-content">
        <div class="bubble bot" style="border-color:var(--danger);color:#fca5a5;">
          ⚠️ ${escapeHtml(msg)}
        </div>
        <div class="timestamp">${formatTime(new Date())}</div>
      </div>
    </div>`);
  scrollToBottom();
}

// ── Response Renderer ──────────────────────────────────────────────────────────
function renderBotResponse(response) {
  let inner = "";
  switch (response.type) {
    case "greeting":   inner = renderGreeting(response);   break;
    case "answer":     inner = renderAnswer(response);     break;
    case "escalation": inner = renderEscalation(response); break;
    default:           inner = `<div class="bubble bot">${escapeHtml(JSON.stringify(response))}</div>`;
  }

  messagesContainer.insertAdjacentHTML("beforeend", `
    <div class="message-row bot">
      <div class="avatar bot">🤖</div>
      <div class="message-content">
        ${inner}
        <div class="timestamp">${formatTime(new Date())}</div>
      </div>
    </div>`);
  scrollToBottom();
}

function renderGreeting(r) {
  return `
    <div class="greeting-card">
      <div class="greeting-title">CloudDesk Support AI</div>
      <div class="answer-text">${markdownToHtml(r.message)}</div>
    </div>`;
}

function renderAnswer(r) {
  const confColor = r.confidence.retrieval >= 60 ? "var(--success)"
                  : r.confidence.retrieval >= 35 ? "var(--warning)"
                  : "var(--danger)";

  // Use data-question attribute instead of inline onclick to avoid
  // JSON.stringify double-quotes breaking the HTML attribute boundary.
  // The delegated listener at the bottom of this file handles clicks.
  const relatedHtml = r.related && r.related.length > 0
    ? `<div class="card-related">
         <div class="related-title">Related Articles</div>
         <div class="related-links">
           ${r.related.map((rel) => `
             <button class="related-link" data-question="${escapeHtml(rel.question)}">
               <span>📄</span>
               <span>${escapeHtml(rel.question)}</span>
               <span style="margin-left:auto;font-size:10px;color:var(--text-muted)">${rel.score}%</span>
             </button>`).join("")}
         </div>
       </div>`
    : "";

  return `
    <div class="bot-card">
      <div class="card-header">
        <span class="category-badge" style="color:${r.categoryColor};border-color:${r.categoryColor}40">
          ${r.categoryLabel}
        </span>
        <div class="confidence-bar-group">
          <div class="conf-row">
            <span>Category</span>
            <div class="conf-bar-bg">
              <div class="conf-bar-fill" style="width:${r.confidence.classifier}%;background:var(--accent)"></div>
            </div>
            <span>${r.confidence.classifier}%</span>
          </div>
          <div class="conf-row">
            <span>Match</span>
            <div class="conf-bar-bg">
              <div class="conf-bar-fill" style="width:${r.confidence.retrieval}%;background:${confColor}"></div>
            </div>
            <span>${r.confidence.retrieval}%</span>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="answer-text">${markdownToHtml(r.answer)}</div>
      </div>
      <div class="card-source">
        <span>📖</span>
        <span>Source: ${escapeHtml(r.sourceQuestion)}</span>
        <span style="margin-left:auto;font-family:monospace;font-size:10px">${r.sourceId}</span>
      </div>
      ${relatedHtml}
    </div>`;
}

function renderEscalation(r) {
  const severityLabel = r.severity === "high"   ? "🔴 High Priority"
                      : r.severity === "medium" ? "🟡 Medium Priority"
                      :                           "🟢 Low Priority";

  const reasonsHtml = r.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");

  const partialHtml = r.partialAnswer
    ? `<div class="partial-answer">
         <div class="partial-note">📋 Possibly Relevant Info</div>
         <div class="partial-question">"${escapeHtml(r.partialAnswer.question)}"</div>
         <div class="answer-text" style="font-size:13px">${markdownToHtml(r.partialAnswer.answer)}</div>
       </div>`
    : "";

  const { ticketId, times } = r.humanHandoff;

  return `
    <div class="escalation-card">
      <div class="escalation-header">
        <div class="escalation-title"><span>🚨</span> Escalating to Human Agent</div>
        <span class="severity-badge" style="color:${r.severityColor};border-color:${r.severityColor}40">
          ${severityLabel}
        </span>
      </div>
      <div class="escalation-body">
        <div class="escalation-reasons-title">Why this is being escalated</div>
        <ul class="escalation-reasons">${reasonsHtml}</ul>
        ${partialHtml}
        <div class="handoff-box">
          <div class="handoff-header"><span>✅</span> Ticket Created — Human Agent Notified</div>
          <div class="handoff-ticket">
            Ticket ID: <span class="ticket-id">${ticketId}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Expected response times:</div>
          <div class="response-times">
            <span class="time-badge">Enterprise: <strong>${times.Enterprise}</strong></span>
            <span class="time-badge">Pro: <strong>${times.Pro}</strong></span>
            <span class="time-badge">Starter: <strong>${times.Starter}</strong></span>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

/**
 * Single-pass HTML escape — 4× faster than chained .replace() calls
 */
function escapeHtml(str) {
  return String(str).replace(ESC_RE, (c) => ESC_MAP[c]);
}

/**
 * Minimal markdown → HTML renderer.
 * All regexes are module-level constants (compiled once, not on every call).
 */
function markdownToHtml(text) {
  if (!text) return "";

  let html = escapeHtml(text);

  // Reset stateful global regexes before use
  MD_BOLD.lastIndex = 0;
  MD_CODE.lastIndex = 0;
  MD_LINK.lastIndex = 0;

  html = html.replace(MD_BOLD, "<strong>$1</strong>");
  html = html.replace(MD_CODE, "<code>$1</code>");
  html = html.replace(MD_LINK, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bullet list processing
  const lines = html.split("\n");
  const out   = [];
  let inList  = false;

  for (const line of lines) {
    const listMatch = MD_LIST.exec(line);
    if (listMatch) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (line) out.push(`<p>${line}</p>`);
    }
  }
  if (inList) out.push("</ul>");

  return out.join("");
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// ── Delegated click handler for dynamically rendered related-article buttons ──
// Catches clicks on any .related-link[data-question] inserted into the chat,
// regardless of when they were added to the DOM.
messagesContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".related-link[data-question]");
  if (btn) sendQuickMessage(btn.dataset.question);
});
