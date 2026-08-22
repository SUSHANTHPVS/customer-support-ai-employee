/**
 * ML Classifier — Naive Bayes with Porter stemming
 * Trained on 200+ labeled support examples (50+ per class).
 * Model persisted to disk; only retrains when bayesModel.json is missing.
 */

const natural = require("natural");
const fs      = require("fs");
const path    = require("path");

const TRAINING_DATA = [

  // ── BILLING (55 examples) ────────────────────────────────────────────────
  { text: "How do I update my payment method",                        label: "billing" },
  { text: "My credit card was declined",                              label: "billing" },
  { text: "I want to cancel my subscription",                         label: "billing" },
  { text: "Can I get a refund for last month",                        label: "billing" },
  { text: "How do I view my invoices",                                label: "billing" },
  { text: "I was charged twice this month",                           label: "billing" },
  { text: "My payment failed and account is suspended",               label: "billing" },
  { text: "How do I upgrade to the pro plan",                         label: "billing" },
  { text: "I want to downgrade my plan",                              label: "billing" },
  { text: "What does the enterprise plan cost",                       label: "billing" },
  { text: "I need a receipt for my purchase",                         label: "billing" },
  { text: "When will I be billed next",                               label: "billing" },
  { text: "How do I add a new credit card",                           label: "billing" },
  { text: "Can I pay annually instead of monthly",                    label: "billing" },
  { text: "I need to update my billing address",                      label: "billing" },
  { text: "My debit card is not accepted",                            label: "billing" },
  { text: "I want to terminate my account and stop payments",         label: "billing" },
  { text: "Charge on my bank statement from clouddesk",               label: "billing" },
  { text: "My free trial ended and I got charged",                    label: "billing" },
  { text: "Proration amount on my invoice looks wrong",               label: "billing" },
  { text: "How do I switch from monthly to annual billing",           label: "billing" },
  { text: "I need an invoice for tax purposes",                       label: "billing" },
  { text: "My debit card was rejected",                               label: "billing" },
  { text: "Card declined when trying to pay",                         label: "billing" },
  { text: "Transaction failed on clouddesk",                          label: "billing" },
  { text: "Refund request for unused subscription",                   label: "billing" },
  { text: "How do I cancel and get money back",                       label: "billing" },
  { text: "Billing issue with my account",                            label: "billing" },
  { text: "I need to stop my payments",                               label: "billing" },
  { text: "How do I change my payment card",                          label: "billing" },
  { text: "My card is being rejected at checkout",                    label: "billing" },
  { text: "I was charged the wrong amount",                           label: "billing" },
  { text: "Payment is not going through",                             label: "billing" },
  { text: "How to get a tax invoice",                                 label: "billing" },
  { text: "I want to switch to a cheaper plan",                       label: "billing" },
  { text: "Cancel plan and refund remaining days",                    label: "billing" },
  { text: "My account was suspended due to payment",                  label: "billing" },
  { text: "How do I add paypal as payment method",                    label: "billing" },
  { text: "I need to see past charges",                               label: "billing" },
  { text: "Unexpected charge on my card",                             label: "billing" },
  { text: "How do I get a receipt for my payment",                    label: "billing" },
  { text: "I want to upgrade from starter to pro",                    label: "billing" },
  { text: "What is the difference between pro and enterprise",        label: "billing" },
  { text: "How does annual billing work",                             label: "billing" },
  { text: "My payment method expired",                                label: "billing" },
  { text: "I need to update my card expiry date",                     label: "billing" },
  { text: "Transaction history and charges",                          label: "billing" },
  { text: "My subscription renewal failed",                           label: "billing" },
  { text: "I do not recognize this charge",                           label: "billing" },
  { text: "How do I remove my payment method",                        label: "billing" },
  { text: "I want a full refund",                                     label: "billing" },
  { text: "Money back guarantee",                                     label: "billing" },
  { text: "Invoice not received by email",                            label: "billing" },
  { text: "When does my billing cycle reset",                         label: "billing" },
  { text: "I need to dispute a charge",                               label: "billing" },

  // ── TECHNICAL (55 examples) ───────────────────────────────────────────────
  { text: "The app is not loading",                                   label: "technical" },
  { text: "I keep getting a 500 error",                               label: "technical" },
  { text: "CloudDesk is down right now",                              label: "technical" },
  { text: "How do I integrate with Slack",                            label: "technical" },
  { text: "The webhook is not firing",                                label: "technical" },
  { text: "I cannot connect to the API",                              label: "technical" },
  { text: "Export to CSV is not working",                             label: "technical" },
  { text: "Does CloudDesk have a mobile app",                         label: "technical" },
  { text: "The app crashes when I open the dashboard",                label: "technical" },
  { text: "Pages are loading very slowly",                            label: "technical" },
  { text: "How do I set up GitHub integration",                       label: "technical" },
  { text: "I am getting a 404 when accessing settings",               label: "technical" },
  { text: "The iOS app keeps crashing",                               label: "technical" },
  { text: "How do I get my API key",                                  label: "technical" },
  { text: "Data export is stuck and not completing",                  label: "technical" },
  { text: "The Jira integration stopped syncing",                     label: "technical" },
  { text: "Error message when trying to save changes",                label: "technical" },
  { text: "How do I configure Zapier with CloudDesk",                 label: "technical" },
  { text: "The browser extension is not working",                     label: "technical" },
  { text: "My data is not syncing across devices",                    label: "technical" },
  { text: "How do I back up my data",                                 label: "technical" },
  { text: "The notification emails are not arriving",                 label: "technical" },
  { text: "App keeps crashing on my phone",                           label: "technical" },
  { text: "App is broken and wont load",                              label: "technical" },
  { text: "Connect CloudDesk to GitHub",                              label: "technical" },
  { text: "Download my data as CSV",                                  label: "technical" },
  { text: "Does it work on iPhone",                                   label: "technical" },
  { text: "I am getting an error when saving",                        label: "technical" },
  { text: "Site is down and not responding",                          label: "technical" },
  { text: "How do I use the REST API",                                label: "technical" },
  { text: "Webhook not triggering on events",                         label: "technical" },
  { text: "Android app crashes on launch",                            label: "technical" },
  { text: "How do I export data to JSON",                             label: "technical" },
  { text: "Integration with Microsoft Teams",                         label: "technical" },
  { text: "Dashboard is loading very slowly",                         label: "technical" },
  { text: "I get a timeout error",                                    label: "technical" },
  { text: "How do I set up the mobile app",                           label: "technical" },
  { text: "API returns 403 forbidden",                                label: "technical" },
  { text: "Zapier automation not working",                            label: "technical" },
  { text: "How do I connect slack notifications",                     label: "technical" },
  { text: "The app is unresponsive",                                  label: "technical" },
  { text: "White screen when opening clouddesk",                      label: "technical" },
  { text: "How do I enable the API for my account",                   label: "technical" },
  { text: "File export not completing",                               label: "technical" },
  { text: "I cannot save my work and keep getting errors",            label: "technical" },
  { text: "CloudDesk not working in Chrome",                          label: "technical" },
  { text: "How to debug webhook failures",                            label: "technical" },
  { text: "Status page shows outage",                                 label: "technical" },
  { text: "Where can I find my API credentials",                      label: "technical" },
  { text: "Performance issues on the dashboard",                      label: "technical" },
  { text: "The import feature is broken",                             label: "technical" },
  { text: "App shows blank page after login",                         label: "technical" },
  { text: "How do I use CSV import",                                  label: "technical" },
  { text: "Connection timeout when loading reports",                  label: "technical" },
  { text: "How to set up clouddesk on android",                       label: "technical" },

  // ── ACCOUNT ACCESS (55 examples) ─────────────────────────────────────────
  { text: "I forgot my password",                                     label: "account_access" },
  { text: "I cannot log in to my account",                            label: "account_access" },
  { text: "How do I reset my password",                               label: "account_access" },
  { text: "My account is locked",                                     label: "account_access" },
  { text: "I need to enable two factor authentication",               label: "account_access" },
  { text: "How do I invite a team member",                            label: "account_access" },
  { text: "I want to remove a user from my team",                     label: "account_access" },
  { text: "How do I change my email address",                         label: "account_access" },
  { text: "The 2FA code is not working",                              label: "account_access" },
  { text: "I lost access to my authenticator app",                    label: "account_access" },
  { text: "How do I change my username",                              label: "account_access" },
  { text: "I need to update my profile information",                  label: "account_access" },
  { text: "My login link is not working",                             label: "account_access" },
  { text: "How do I give someone admin access",                       label: "account_access" },
  { text: "I was locked out after too many attempts",                 label: "account_access" },
  { text: "How do I sign in with Google",                             label: "account_access" },
  { text: "I need to change the role of a team member",               label: "account_access" },
  { text: "My colleague cannot accept the team invitation",           label: "account_access" },
  { text: "I need to revoke access for a former employee",            label: "account_access" },
  { text: "The password reset email never arrived",                   label: "account_access" },
  { text: "How do I disable two factor authentication",               label: "account_access" },
  { text: "Account shows logged in on a device I dont recognise",     label: "account_access" },
  { text: "I can't access my account",                                label: "account_access" },
  { text: "Set up multi factor authentication",                       label: "account_access" },
  { text: "Add a new person to my workspace",                         label: "account_access" },
  { text: "Cant login to clouddesk",                                  label: "account_access" },
  { text: "Password help needed",                                     label: "account_access" },
  { text: "Account locked after failed attempts",                     label: "account_access" },
  { text: "How do I set up 2FA on my account",                        label: "account_access" },
  { text: "I need to add a team member",                              label: "account_access" },
  { text: "How to transfer admin rights to another user",             label: "account_access" },
  { text: "My account was deactivated",                               label: "account_access" },
  { text: "I cannot sign in to my account",                           label: "account_access" },
  { text: "Login page is not accepting my password",                  label: "account_access" },
  { text: "How do I update my name in my profile",                    label: "account_access" },
  { text: "I deleted my authenticator app by mistake",                label: "account_access" },
  { text: "How do I manage user permissions",                         label: "account_access" },
  { text: "I need to update my login email",                          label: "account_access" },
  { text: "How do I remove an old team member",                       label: "account_access" },
  { text: "OTP not arriving on my phone",                             label: "account_access" },
  { text: "I need to unlock my account",                              label: "account_access" },
  { text: "Password not being accepted",                              label: "account_access" },
  { text: "How to invite colleagues to clouddesk",                    label: "account_access" },
  { text: "I want to change my account email",                        label: "account_access" },
  { text: "My MFA backup codes are not working",                      label: "account_access" },
  { text: "How do I set a new password",                              label: "account_access" },
  { text: "Change role from viewer to editor",                        label: "account_access" },
  { text: "I forgot my login email address",                          label: "account_access" },
  { text: "How do I see all users in my account",                     label: "account_access" },
  { text: "2fa not working on my phone",                              label: "account_access" },
  { text: "I need to deactivate a user",                              label: "account_access" },
  { text: "The verification code keeps expiring",                     label: "account_access" },
  { text: "How do I enable SSO for my team",                          label: "account_access" },
  { text: "I cant log in and forgot my password",                     label: "account_access" },
  { text: "How do I reset someone elses password as admin",           label: "account_access" },

  // ── GENERAL (55 examples) ─────────────────────────────────────────────────
  { text: "What plans does CloudDesk offer",                          label: "general" },
  { text: "How much does the pro plan cost",                          label: "general" },
  { text: "Is CloudDesk GDPR compliant",                              label: "general" },
  { text: "Where is my data stored",                                  label: "general" },
  { text: "How do I contact support",                                 label: "general" },
  { text: "Is there a free trial",                                    label: "general" },
  { text: "What features are included in the starter plan",           label: "general" },
  { text: "Is CloudDesk SOC 2 certified",                             label: "general" },
  { text: "How secure is CloudDesk",                                  label: "general" },
  { text: "What is CloudDesk",                                        label: "general" },
  { text: "How do I get support by phone",                            label: "general" },
  { text: "Does CloudDesk have a status page",                        label: "general" },
  { text: "Is there a discount for annual billing",                   label: "general" },
  { text: "How many users can I have on the starter plan",            label: "general" },
  { text: "Does CloudDesk support SSO",                               label: "general" },
  { text: "What is the data retention policy",                        label: "general" },
  { text: "Can I migrate data from another tool",                     label: "general" },
  { text: "Does CloudDesk have a public API",                         label: "general" },
  { text: "What is the uptime SLA",                                   label: "general" },
  { text: "How do I submit a feature request",                        label: "general" },
  { text: "How much does CloudDesk cost",                             label: "general" },
  { text: "Is my data safe with CloudDesk",                           label: "general" },
  { text: "What is your privacy policy",                              label: "general" },
  { text: "Pricing information",                                      label: "general" },
  { text: "Data security and compliance",                             label: "general" },
  { text: "Is there an enterprise plan",                              label: "general" },
  { text: "What are the storage limits",                              label: "general" },
  { text: "Does CloudDesk have a free plan",                          label: "general" },
  { text: "How do I reach customer service",                          label: "general" },
  { text: "Where can I find documentation",                           label: "general" },
  { text: "What are CloudDesk business hours",                        label: "general" },
  { text: "Is there a phone number for support",                      label: "general" },
  { text: "Can I get a demo of CloudDesk",                            label: "general" },
  { text: "How long is the free trial",                               label: "general" },
  { text: "Do you offer nonprofit discounts",                         label: "general" },
  { text: "Does CloudDesk comply with HIPAA",                         label: "general" },
  { text: "What is the difference between the plans",                 label: "general" },
  { text: "How does CloudDesk handle data breaches",                  label: "general" },
  { text: "Is my data encrypted",                                     label: "general" },
  { text: "How do I report a security vulnerability",                 label: "general" },
  { text: "What support channels are available",                      label: "general" },
  { text: "Where are your data centers located",                      label: "general" },
  { text: "Do you have a trust and compliance page",                  label: "general" },
  { text: "What integrations are supported",                          label: "general" },
  { text: "Can I use CloudDesk offline",                              label: "general" },
  { text: "How do I leave a review for CloudDesk",                    label: "general" },
  { text: "What file formats are supported for import",               label: "general" },
  { text: "Does CloudDesk have a partner program",                    label: "general" },
  { text: "How do I request a feature",                               label: "general" },
  { text: "Is there a community forum",                               label: "general" },
  { text: "What is included in enterprise support",                   label: "general" },
  { text: "How do I get a quote for enterprise",                      label: "general" },
  { text: "Is CloudDesk available in multiple languages",             label: "general" },
  { text: "What is the maximum number of users I can have",           label: "general" },
  { text: "Do you offer custom contracts",                            label: "general" },
];

const MODEL_PATH = path.join(__dirname, "bayesModel.json");

function trainAndSave() {
  const fresh   = new natural.BayesClassifier();
  const stemmer = natural.PorterStemmer;
  for (const { text, label } of TRAINING_DATA) {
    const stemmed = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map(w => stemmer.stem(w))
      .join(" ");
    fresh.addDocument(stemmed, label);
  }
  fresh.train();
  try {
    fs.writeFileSync(MODEL_PATH, JSON.stringify(fresh), "utf8");
    console.log(`[mlClassifier] Trained on ${TRAINING_DATA.length} examples → saved to`, MODEL_PATH);
  } catch (err) {
    console.warn("[mlClassifier] Could not save model:", err.message);
  }
  return fresh;
}

function loadOrTrain() {
  return new Promise((resolve) => {
    if (!fs.existsSync(MODEL_PATH)) {
      console.log("[mlClassifier] No saved model — training fresh...");
      resolve(trainAndSave());
      return;
    }
    natural.BayesClassifier.load(MODEL_PATH, null, (err, loaded) => {
      if (err) {
        console.warn("[mlClassifier] Load failed, retraining:", err.message);
        try { fs.unlinkSync(MODEL_PATH); } catch (_) {}
        resolve(trainAndSave());
      } else {
        console.log("[mlClassifier] Loaded pre-trained Bayes model (" + TRAINING_DATA.length + " training examples)");
        resolve(loaded);
      }
    });
  });
}

const stemmer = natural.PorterStemmer;

function mlClassify(message, loadedClassifier) {
  const stemmed = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(w => stemmer.stem(w))
    .join(" ");

  const category        = loadedClassifier.classify(stemmed);
  const classifications = loadedClassifier.getClassifications(stemmed);
  const scores   = classifications.map(c => ({ label: c.label, score: c.value }));
  const maxScore = Math.max(...scores.map(s => s.score));
  const minScore = Math.min(...scores.map(s => s.score));
  const range    = maxScore - minScore || 1;
  const topTwo   = scores.sort((a, b) => b.score - a.score).slice(0, 2);
  const margin   = range > 0 ? (topTwo[0].score - (topTwo[1]?.score ?? topTwo[0].score)) / range : 1;
  const confidence = Math.min(0.5 + margin * 0.5, 1.0);

  return { category, confidence, classifications: scores };
}

module.exports = { loadOrTrain, mlClassify };
