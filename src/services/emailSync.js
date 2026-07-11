import { isGmailConnected, searchInboxEmails, parseGmailMessage, getUserEmail } from "./gmail";
import useEmailStore from "../stores/useEmailStore";
import useAppStore from "../stores/useAppStore";

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

export async function syncInboundEmails() {
  if (syncing || !isGmailConnected()) return 0;
  syncing = true;
  let added = 0;
  try {
    const apps = useAppStore.getState().apps;
    const query = buildQuery(apps);
    if (!query) return 0;

    const myEmail = await getUserEmail();
    const messages = await searchInboxEmails(query);
    if (messages.length === 0) return 0;

    const existing = useEmailStore.getState().emails;
    const existingGmailIds = new Set(existing.map((e) => e.gmailId).filter(Boolean));

    const addEmail = useEmailStore.getState().addEmail;

    for (const msg of messages) {
      const parsed = parseGmailMessage(msg);
      if (existingGmailIds.has(parsed.gmailId)) continue;
      if (myEmail && parsed.from === myEmail.toLowerCase()) continue;

      const app = matchAppForSender(parsed.from, apps);
      if (!app) continue;

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
      added++;
    }
  } catch (e) {
    console.error("Email sync error:", e);
  } finally {
    syncing = false;
  }
  return added;
}
