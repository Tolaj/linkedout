import { isGmailConnected, searchInboxEmails, parseGmailMessage, getUserEmail } from "./gmail";
import useEmailStore from "../stores/useEmailStore";
import useAppStore from "../stores/useAppStore";
import { triageEmail, analyzeEmail } from "./llm";

let syncing = false;

function buildQuery(apps) {
  const emails = new Set();
  const domains = new Set();
  for (const app of apps) {
    if (!app.domain) continue;
    for (const t of app.domain.split(",")) {
      const v = t.trim().toLowerCase();
      if (!v) continue;
      if (v.includes("@")) emails.add(v);
      else domains.add(v);
    }
  }
  if (emails.size === 0 && domains.size === 0) return null;
  const parts = [];
  for (const e of emails) parts.push(e);
  for (const d of domains) parts.push(d);
  return "in:inbox from:(" + parts.join(" OR ") + ")";
}

function matchAppForSender(sender, apps) {
  for (const app of apps) {
    if (!app.domain) continue;
    const targets = app.domain.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    for (const t of targets) {
      if (t.includes("@") ? sender === t : sender.endsWith("@" + t)) {
        return app;
      }
    }
  }
  return null;
}

function isLlmEnabled() {
  return localStorage.getItem("linkedout_llm_enabled") === "true" && !!localStorage.getItem("linkedout_llm_key");
}

function getSkippedIds() {
  try { return new Set(JSON.parse(localStorage.getItem("linkedout_llm_skipped") || "[]")); }
  catch { return new Set(); }
}

function markSkipped(gmailId) {
  const skipped = getSkippedIds();
  skipped.add(gmailId);
  const arr = [...skipped].slice(-1000);
  localStorage.setItem("linkedout_llm_skipped", JSON.stringify(arr));
}

async function trackEmail(addEmail, parsed, app) {
  await addEmail({
    gmailId: parsed.gmailId,
    threadId: parsed.threadId,
    recipientEmail: parsed.from,
    subject: parsed.subject,
    company: app.company,
    appId: app.id,
    direction: "inbound",
    status: "received",
    sentAt: parsed.date,
    snippet: parsed.snippet,
  });
}

export async function syncInboundEmails(onProgress) {
  if (syncing || !isGmailConnected()) return { added: 0, created: 0, updated: 0 };
  syncing = true;
  const result = { added: 0, created: 0, updated: 0 };
  try {
    const apps = useAppStore.getState().apps;
    const myEmail = await getUserEmail();
    const llmActive = isLlmEnabled();

    // Query: if LLM enabled, pull broader inbox; otherwise only tracked domains
    let query;
    if (llmActive) {
      query = "in:inbox newer_than:7d";
    } else {
      query = buildQuery(apps);
      if (!query) return result;
    }

    const messages = await searchInboxEmails(query);
    if (messages.length === 0) return result;

    const existing = useEmailStore.getState().emails;
    const seenGmailIds = new Set(existing.map((e) => e.gmailId).filter(Boolean));
    const seenThreadIds = new Set(existing.map((e) => e.threadId).filter(Boolean));
    const skippedIds = llmActive ? getSkippedIds() : new Set();
    const addEmail = useEmailStore.getState().addEmail;
    const unmatched = [];

    // Pass 1: System rules — match by domain/email
    for (const msg of messages) {
      const parsed = parseGmailMessage(msg);
      if (seenGmailIds.has(parsed.gmailId)) continue;
      if (seenThreadIds.has(parsed.threadId)) continue;
      if (myEmail && parsed.from === myEmail.toLowerCase()) continue;

      const matchedApp = matchAppForSender(parsed.from, apps);
      if (matchedApp) {
        if (matchedApp.dateApplied && parsed.date && parsed.date.slice(0, 10) < matchedApp.dateApplied.slice(0, 10)) continue;
        await trackEmail(addEmail, parsed, matchedApp);
        seenGmailIds.add(parsed.gmailId);
        seenThreadIds.add(parsed.threadId);
        result.added++;
      } else if (llmActive && !skippedIds.has(parsed.gmailId)) {
        unmatched.push(parsed);
      }
    }

    // Pass 2: LLM — only unmatched, unskipped emails
    if (unmatched.length > 0 && llmActive) {
      onProgress?.(`${unmatched.length} unmatched email${unmatched.length > 1 ? "s" : ""} to check...`);

      for (const parsed of unmatched) {
        try {
          // Tier 1: Quick triage — just sender + subject
          const triage = await triageEmail(parsed.from, parsed.subject);
          if (!triage || triage.action === "not_application") {
            markSkipped(parsed.gmailId);
            continue;
          }

          // Tier 2: Full analysis — only if triage says application-related
          onProgress?.(`Analyzing: ${parsed.subject?.slice(0, 40)}...`);
          const currentApps = useAppStore.getState().apps;
          const decision = await analyzeEmail(parsed, currentApps);

          if (decision?.action === "create_application") {
            const senderDomain = parsed.from.split("@")[1] || "";
            const domain = decision.domain || senderDomain;
            const newApp = await useAppStore.getState().addApp({
              company: decision.company,
              role: decision.role,
              location: decision.location || "",
              status: "Applied",
              dateApplied: parsed.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
              source: "Email",
              domain,
              referral: "N",
              resumeVersion: "",
              link: "",
              notes: "",
            });
            await trackEmail(addEmail, parsed, newApp);
            result.created++;
            result.added++;
          } else if (decision?.action === "update_application_stage" && decision.appId) {
            const app = currentApps.find((a) => a.id === decision.appId);
            if (app) {
              await useAppStore.getState().updateApp(app.id, { ...app, status: decision.newStage });
              await trackEmail(addEmail, parsed, app);
              result.updated++;
              result.added++;
            } else {
              markSkipped(parsed.gmailId);
            }
          } else {
            markSkipped(parsed.gmailId);
          }
        } catch (e) {
          console.error("LLM failed for:", parsed.subject, e);
          markSkipped(parsed.gmailId);
        }
      }
    }
  } catch (e) {
    console.error("Email sync error:", e);
  } finally {
    syncing = false;
  }
  return result;
}
