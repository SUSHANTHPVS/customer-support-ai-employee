/**
 * Knowledge Base for CloudDesk SaaS
 * Each entry has: id, category, question, answer, keywords[]
 */
const STATUS_URL = process.env.CLOUDDESK_STATUS_URL || "https://status.clouddesk.io";
const STATUS_NOTICE = STATUS_URL
  ? `Check the live status page: [status](${STATUS_URL})` 
  : "Check your team’s public incident page";

const knowledgeBase = [
  // ─── BILLING ─────────────────────────────────────────────────────────────
  {
    id: "bill-01",
    category: "billing",
    question: "How do I update my payment method?",
    answer:
      "To update your payment method, go to **Settings → Billing → Payment Methods**. Click **Edit** next to your current card, enter your new card details, and click **Save**. Changes take effect on your next billing cycle. We accept Visa, Mastercard, Amex, and PayPal.",
    keywords: [
      "payment method", "payment", "card", "credit card",
      "billing", "update payment", "change payment", "update card",
      "change card", "new card", "visa", "mastercard", "paypal", "method",
      "billing issue", "billing problem", "billing question",
    ],
  },
  {
    id: "bill-02",
    category: "billing",
    question: "When am I billed and how do I view my invoices?",
    answer:
      "CloudDesk bills on the same date each month as your original sign-up date. You can view and download all past invoices from **Settings → Billing → Invoice History**. Invoices are also emailed to your registered billing address within 24 hours of each charge.",
    keywords: ["invoice", "bill", "charge", "receipt", "statement", "monthly", "date"],
  },
  {
    id: "bill-03",
    category: "billing",
    question: "How do I cancel my subscription or request a refund?",
    answer:
      "To cancel your subscription, navigate to **Settings → Billing → Subscription** and click **Cancel Plan**. Your access continues until the end of the current billing period. Refunds are available within **14 days** of a charge if the service was not used — contact support with your invoice number to request one.",
    keywords: ["cancel", "refund", "subscription", "end", "stop", "money back", "terminate"],
  },
  {
    id: "bill-04",
    category: "billing",
    question: "What happens if my payment fails?",
    answer:
      "If a payment fails, CloudDesk will retry the charge after **3 days** and again after **7 days**. You'll receive an email notification after each attempt. If payment is not resolved within **14 days**, your account will be suspended (data is retained for 30 days). You can update your payment method at any time to restore access immediately.",
    keywords: [
      "failed", "payment fail", "payment failed", "declined", "rejected",
      "card declined", "card rejected", "debit card rejected", "debit card declined",
      "credit card declined", "credit card rejected", "card not working",
      "retry", "suspended", "past due", "overdue",
      "charge failed", "payment not going through", "transaction failed",
      "payment issue", "payment problem",
    ],
  },
  {
    id: "bill-05",
    category: "billing",
    question: "How do I upgrade or downgrade my plan?",
    answer:
      "Go to **Settings → Billing → Subscription** and click **Change Plan**. Upgrades take effect immediately (you're charged a prorated amount for the remainder of the cycle). Downgrades take effect at the start of your next billing cycle. You won't lose any data when downgrading, but features beyond your new plan's limits will be locked.",
    keywords: ["upgrade", "downgrade", "plan", "tier", "change plan", "pro", "enterprise", "starter"],
  },

  // ─── TECHNICAL ──────────────────────────────────────────────────────────
  {
    id: "tech-01",
    category: "technical",
    question: "The app is loading slowly or not loading at all",
    answer:
      `Check whether there is a public incident or outage notice first: ${STATUS_NOTICE}. If no outage is reported: (1) Clear your browser cache and cookies, (2) Try a different browser or incognito mode, (3) Disable browser extensions, (4) Check your internet connection. If the issue persists, note your browser version and OS, then contact support with this information.`,
    keywords: [
      "slow", "loading", "not loading", "down", "unresponsive", "freezing",
      "blank", "white screen", "app broken", "app not working", "app crashing",
      "app crashes", "crashing", "crash", "keeps crashing", "site down",
      "not responding", "won't load", "wont load", "page not loading",
    ],
  },
  {
    id: "tech-02",
    category: "technical",
    question: "How do I integrate CloudDesk with Slack or other tools?",
    answer:
      "CloudDesk supports integrations with Slack, Microsoft Teams, GitHub, Jira, and Zapier. Go to **Settings → Integrations**, find the app you want to connect, and click **Connect**. You'll be redirected to authorize the connection. For API integrations, your API key is available under **Settings → Developer → API Keys**. See our full [Integration Docs](https://docs.clouddesk.io/integrations) for detailed guides.",
    keywords: ["integrate", "slack", "teams", "github", "jira", "zapier", "api", "webhook", "connect"],
  },
  {
    id: "tech-03",
    category: "technical",
    question: "I'm getting an error message — what should I do?",
    answer:
      `When you see an error, please: (1) Note the **exact error message** and any error code shown, (2) Screenshot or copy the full message, (3) Note what action triggered the error and the time it occurred, (4) Try refreshing and repeating the action. For **500-series errors**, this is usually server-side — check whether there is an active outage notice: ${STATUS_NOTICE}. For **400-series errors**, there's usually an issue with your input or permissions. Share these details with support for faster resolution.`,
    keywords: ["error", "bug", "crash", "500", "404", "broken", "not working", "issue", "problem"],
  },
  {
    id: "tech-04",
    category: "technical",
    question: "How do I export my data from CloudDesk?",
    answer:
      "You can export your data from **Settings → Data Management → Export**. Available formats are CSV, JSON, and PDF (for reports). Large exports are processed in the background and emailed to you when ready — typically within 30 minutes. Note: Exports are only available on the **Pro** and **Enterprise** plans.",
    keywords: ["export", "download", "data", "csv", "backup", "extract"],
  },
  {
    id: "tech-05",
    category: "technical",
    question: "Does CloudDesk have a mobile app?",
    answer:
      "Yes! CloudDesk has native apps for **iOS** (App Store) and **Android** (Google Play). Search for 'CloudDesk' in your app store. The mobile app supports all core features except bulk data exports and advanced admin settings, which remain desktop-only. Mobile app requires iOS 14+ or Android 10+.",
    keywords: ["mobile", "app", "ios", "android", "iphone", "phone", "tablet", "download app"],
  },

  // ─── ACCOUNT ACCESS ─────────────────────────────────────────────────────
  {
    id: "acct-01",
    category: "account_access",
    question: "I forgot my password — how do I reset it?",
    answer:
      "On the login page, click **Forgot Password?** below the sign-in form. Enter your registered email address and click **Send Reset Link**. You'll receive an email within 5 minutes (check your spam folder). The reset link expires in **1 hour**. If you don't receive the email, ensure you're using the correct email address associated with your account.",
    keywords: [
      "password", "forgot password", "reset password", "forgot my password",
      "cannot log in", "can't log in", "cannot login", "can not log in",
      "login", "log in", "sign in", "locked out", "lost password",
      "change password", "new password", "password help", "password reset link",
      "cannot access", "can't access", "cannot access my account",
      "can't access my account", "access my account", "unable to login",
      "unable to log in", "trouble logging in", "trouble signing in",
    ],
  },
  {
    id: "acct-02",
    category: "account_access",
    question: "How do I enable two-factor authentication (2FA)?",
    answer:
      "To enable 2FA: Go to **Settings → Security → Two-Factor Authentication** and click **Enable**. You can use an authenticator app (Google Authenticator, Authy) or SMS. Scan the QR code with your authenticator app, enter the 6-digit code to confirm, and save your **backup codes** in a secure place. 2FA applies to all logins, including SSO.",
    keywords: ["2fa", "two factor", "mfa", "authenticator", "security", "otp", "code", "verification"],
  },
  {
    id: "acct-03",
    category: "account_access",
    question: "How do I add or remove team members?",
    answer:
      "To invite a team member: Go to **Settings → Team → Members** and click **Invite Member**. Enter their email and assign a role (Admin, Editor, or Viewer). They'll receive an invitation email valid for **48 hours**. To remove a member, click the **⋯** menu next to their name and select **Remove**. Removing a member immediately revokes their access.",
    keywords: ["team", "member", "invite", "add user", "remove user", "seat", "colleague", "permission", "role"],
  },
  {
    id: "acct-04",
    category: "account_access",
    question: "My account has been locked — how do I unlock it?",
    answer:
      "Accounts are locked after **10 consecutive failed login attempts** as a security measure. To unlock: (1) Wait **30 minutes** for the automatic unlock, or (2) Click **Forgot Password?** to reset your password, which also unlocks the account immediately. If you suspect unauthorized access, contact support immediately and we'll investigate.",
    keywords: ["locked", "account locked", "blocked", "suspended", "access denied", "too many attempts"],
  },
  {
    id: "acct-05",
    category: "account_access",
    question: "How do I change my email address or account name?",
    answer:
      "To update your email: Go to **Settings → Profile → Contact Information**, click **Edit**, enter your new email, and confirm via the verification email sent to the new address. Your login email updates once confirmed. To change your display name, go to **Settings → Profile → Personal Details** and click **Edit Name**. Name changes are visible to all team members.",
    keywords: ["email", "change email", "update email", "name", "profile", "account details", "username"],
  },
  {
    id: "acct-06",
    category: "account_access",
    question: "How do I delete or deactivate my account?",
    answer:
      "To delete or deactivate your account, go to **Settings → Profile → Account Settings** and select **Delete Account** or **Deactivate Account**. You’ll be asked to confirm the action and may be prompted to download your data first. Account deletion is permanent and may take up to 72 hours to fully remove from active systems. If you need to keep your data, export it before deleting the account.",
    keywords: ["delete account", "deactivate account", "close account", "remove account", "delete profile", "account deletion", "deactivate profile"],
  },

  // ─── BILLING / REPORTS ───────────────────────────────────────────────────
  {
    id: "bill-06",
    category: "billing",
    question: "How do I download my invoice or billing statement?",
    answer:
      "Go to **Settings → Billing → Invoice History** and choose the invoice or statement you need. You can download it as PDF or CSV from the invoice detail page. For older invoices, use the date range filter or contact support if the statement is missing from your billing history.",
    keywords: ["download invoice", "billing statement", "invoice pdf", "download receipt", "statement", "tax invoice", "account bill"],
  },

  // ─── TECHNICAL / API ─────────────────────────────────────────────────────
  {
    id: "tech-06",
    category: "technical",
    question: "Why am I getting rate limit or 429 errors?",
    answer:
      "A **429 Too Many Requests** response means your account or app has hit CloudDesk’s request limit for a short time. Wait a few minutes before retrying, then reduce the number of concurrent API calls or spread the requests over time. If you are consistently hitting the limit, check whether a sync or job is looping, and review your API usage under **Settings → Developer → API Usage**.",
    keywords: ["429", "rate limit", "too many requests", "throttled", "api limit", "quota exceeded", "request limit", "api error"],
  },

  // ─── GENERAL / PRODUCT ─────────────────────────────────────────────────
  {
    id: "gen-01",
    category: "general",
    question: "What plans does CloudDesk offer?",
    answer:
      "CloudDesk offers three plans:\n\n- **Starter** ($19/month): Up to 3 users, 5GB storage, core features\n- **Pro** ($49/month): Up to 15 users, 50GB storage, integrations, data export\n- **Enterprise** (custom pricing): Unlimited users, 1TB+ storage, SSO, dedicated support, SLA\n\nAll plans include a **14-day free trial** with no credit card required. Annual billing saves 20%.",
    keywords: ["plan", "pricing", "cost", "price", "starter", "pro", "enterprise", "tier", "how much"],
  },
  {
    id: "gen-02",
    category: "general",
    question: "How do I contact support?",
    answer:
      "You can reach CloudDesk support through: (1) **This chat** — available 24/7 for Tier-1 support, (2) **Email**: support@clouddesk.io — response within 4 hours for Pro/Enterprise, 24 hours for Starter, (3) **Phone**: +1-800-CLOUDSK (Enterprise only), (4) **Help Center**: [help.clouddesk.io](https://help.clouddesk.io). For urgent billing or account issues, include your account ID in your message for faster routing.",
    keywords: ["contact", "support", "help", "reach", "phone", "email", "talk to human", "agent"],
  },
  {
    id: "gen-03",
    category: "general",
    question: "Is my data secure and where is it stored?",
    answer:
      "CloudDesk takes security seriously: Data is stored in **AWS US-East and EU-West** data centers with AES-256 encryption at rest and TLS 1.3 in transit. We are **SOC 2 Type II** and **GDPR** compliant. Data is backed up daily with 30-day retention. For EU customers, data residency is guaranteed within EU boundaries. Our full security policy is at [clouddesk.io/security](https://clouddesk.io/security).",
    keywords: ["security", "data", "privacy", "gdpr", "soc2", "encryption", "safe", "stored", "compliance"],
  },
];

module.exports = knowledgeBase;
