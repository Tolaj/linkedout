import { isGmailConnected, restoreGmail, searchInboxEmails, parseGmailMessage, getUserEmail } from "./gmail";
import useEmailStore from "../stores/useEmailStore";
import useAppStore from "../stores/useAppStore";
import useProcessedEmailStore from "../stores/useProcessedEmailStore";
import { batchAnalyzeEmails, batchVerifyMatches } from "./llm";

let syncing = false;

const SKIP_DOMAINS = new Set([
  "amazon.com", "ebay.com", "target.com", "walmart.com", "bestbuy.com",
  "uber.com", "ubereats.com", "grubhub.com",
  "netflix.com", "spotify.com", "apple.com", "google.com",
  "facebook.com", "instagram.com", "twitter.com", "x.com", "tiktok.com",
  "reddit.com", "quora.com", "medium.com", "substack.com",
  "github.com", "gitlab.com", "bitbucket.org",
  "paypal.com", "venmo.com", "cashapp.com", "zelle.com",
  "chase.com", "bankofamerica.com", "wellsfargo.com", "capitalone.com",
  "dunkindonuts.com", "starbucks.com", "chipotle.com", "panera.com", "panerabread.com",
  "southwest.com", "united.com", "delta.com", "aa.com",
  "nytimes.com", "washingtonpost.com", "cnn.com",
  "discord.com", "slack.com", "zoom.us",
  "linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com",
  "hackerrank.com", "leetcode.com",
  "dropbox.com", "box.com", "notion.so",
]);

function isSkipDomain(senderEmail) {
  const domain = senderEmail.split("@")[1]?.toLowerCase() || "";
  return SKIP_DOMAINS.has(domain);
}

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

async function ensureAppDomain(app, senderEmail) {
  const senderDomain = senderEmail.split("@")[1] || "";
  if (!senderDomain) return;
  const existing = (app.domain || "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (existing.includes(senderDomain) || existing.includes(senderEmail.toLowerCase())) return;
  const updated = existing.length > 0 ? existing.join(", ") + ", " + senderDomain : senderDomain;
  await useAppStore.getState().updateApp(app.id, { ...app, domain: updated });
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

export async function clearSkippedCache() {
  await useProcessedEmailStore.getState().clearSkipped();
  console.log("[EmailSync] Cleared skipped email cache");
}

async function applyDecision(decision, parsed, addEmail, result) {
  const currentApps = useAppStore.getState().apps;
  const { markProcessed } = useProcessedEmailStore.getState();

  if (decision.action === "create_application") {
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
    await markProcessed(parsed.gmailId, "tracked", parsed.date);
    result.created++;
    result.added++;
  } else if (decision.action === "link_to_application" && decision.appId) {
    const app = currentApps.find((a) => a.id === decision.appId);
    if (app) {
      await ensureAppDomain(app, parsed.from);
      await trackEmail(addEmail, parsed, app);
      await markProcessed(parsed.gmailId, "tracked", parsed.date);
      result.linked++;
      result.added++;
    } else {
      await markProcessed(parsed.gmailId, "skipped", parsed.date);
    }
  } else if (decision.action === "update_application_stage" && decision.appId) {
    const app = currentApps.find((a) => a.id === decision.appId);
    if (app) {
      await ensureAppDomain(app, parsed.from);
      await useAppStore.getState().updateApp(app.id, { ...app, status: decision.newStage });
      await trackEmail(addEmail, parsed, app);
      await markProcessed(parsed.gmailId, "tracked", parsed.date);
      result.updated++;
      result.added++;
    } else {
      await markProcessed(parsed.gmailId, "skipped", parsed.date);
    }
  } else {
    await markProcessed(parsed.gmailId, "skipped", parsed.date);
  }
}

function buildSyncQuery(llmActive, apps, lastProcessedDate) {
  // Gmail's after: uses epoch seconds and is date-only (not time-precise),
  // so subtract 1 day as buffer to avoid missing emails at the boundary
  let afterClause = "";
  if (lastProcessedDate) {
    const d = new Date(lastProcessedDate);
    d.setDate(d.getDate() - 1);
    const epoch = Math.floor(d.getTime() / 1000);
    afterClause = ` after:${epoch}`;
  }

  if (llmActive) {
    return "in:inbox" + (afterClause || " newer_than:7d");
  }

  const domainQuery = buildQuery(apps);
  if (!domainQuery) return null;
  return domainQuery + afterClause;
}

export async function syncInboundEmails(onProgress) {
  if (syncing) return { added: 0, created: 0, updated: 0, linked: 0 };
  if (!isGmailConnected()) await restoreGmail();
  if (!isGmailConnected()) {
    console.warn("[EmailSync] Gmail not connected — skipping sync");
    return { added: 0, created: 0, updated: 0, linked: 0 };
  }
  syncing = true;
  const result = { added: 0, created: 0, updated: 0, linked: 0 };
  try {
    const apps = useAppStore.getState().apps;
    const myEmail = await getUserEmail();
    const llmActive = isLlmEnabled();

    const peStore = useProcessedEmailStore.getState();
    if (!peStore.loaded) await peStore.load();
    const processedIds = peStore.getProcessedIds();
    const lastProcessedDate = peStore.getLastProcessedDate();

    console.log("[EmailSync] Starting sync — apps:", apps.length, "llmActive:", llmActive, "processed:", processedIds.size, "lastDate:", lastProcessedDate);

    const query = buildSyncQuery(llmActive, apps, lastProcessedDate);
    if (!query) {
      console.warn("[EmailSync] No domains configured and LLM disabled — nothing to sync");
      return result;
    }
    console.log("[EmailSync] Query:", query);

    const messages = await searchInboxEmails(query);
    console.log("[EmailSync] Fetched", messages.length, "messages from Gmail");
    if (messages.length === 0) return result;

    const existing = useEmailStore.getState().emails;
    const seenGmailIds = new Set(existing.map((e) => e.gmailId).filter(Boolean));
    const seenThreadIds = new Set(existing.map((e) => e.threadId).filter(Boolean));
    const addEmail = useEmailStore.getState().addEmail;
    const { markProcessed, markProcessedBulk } = useProcessedEmailStore.getState();
    const ruleMatched = [];
    const unmatched = [];

    // ── Pass 1: Rule-based domain matching (instant) ──
    for (const msg of messages) {
      const parsed = parseGmailMessage(msg);
      if (seenGmailIds.has(parsed.gmailId)) continue;
      if (seenThreadIds.has(parsed.threadId)) continue;
      if (processedIds.has(parsed.gmailId)) continue;
      if (myEmail && parsed.from === myEmail.toLowerCase()) continue;

      const matchedApp = matchAppForSender(parsed.from, apps);
      if (matchedApp) {
        if (matchedApp.dateApplied && parsed.date && parsed.date.slice(0, 10) < matchedApp.dateApplied.slice(0, 10)) continue;
        ruleMatched.push({ parsed, app: matchedApp });
      } else if (llmActive) {
        unmatched.push(parsed);
      }
    }
    console.log("[EmailSync] Pass 1 — rule-matched:", ruleMatched.length, "unmatched:", unmatched.length);

    // Track rule-matched emails immediately
    for (const { parsed, app } of ruleMatched) {
      await trackEmail(addEmail, parsed, app);
      await markProcessed(parsed.gmailId, "tracked", parsed.date);
      seenGmailIds.add(parsed.gmailId);
      seenThreadIds.add(parsed.threadId);
      result.added++;
    }

    if (!llmActive) return result;

    // Pre-filter obvious non-job domains
    const candidates = unmatched.filter((p) => !isSkipDomain(p.from));
    const preFilterSkipped = unmatched
      .filter((p) => isSkipDomain(p.from))
      .map((p) => ({ gmailId: p.gmailId, emailDate: p.date }));
    if (preFilterSkipped.length > 0) await markProcessedBulk(preFilterSkipped, "skipped");
    console.log("[EmailSync] After pre-filter:", candidates.length, "candidates (skipped", preFilterSkipped.length, "spam domains)");

    const totalLlmWork = (ruleMatched.length > 0 ? 1 : 0) + candidates.length;
    if (totalLlmWork === 0) return result;

    // ── Pass 2: LLM batch verification of rule-based matches (1 request) ──
    if (ruleMatched.length > 0) {
      onProgress?.("Verifying matched emails...");
      try {
        const verifyPayload = ruleMatched.map(({ parsed, app }) => ({
          email: { from: parsed.from, subject: parsed.subject, snippet: parsed.snippet },
          app: { id: app.id, company: app.company },
        }));
        const verification = await batchVerifyMatches(verifyPayload, apps);
        console.log("[EmailSync] Verification result:", verification);

        if (verification?.results) {
          for (const v of verification.results) {
            const idx = v.emailIndex;
            if (idx < 0 || idx >= ruleMatched.length) continue;
            const { parsed, app } = ruleMatched[idx];

            if (v.verified === false && v.correctedAppId) {
              const correctApp = apps.find((a) => a.id === v.correctedAppId);
              if (correctApp) {
                console.log("[EmailSync] Verify corrected:", parsed.from, "→", correctApp.company, "(was", app.company, ")");
                await ensureAppDomain(correctApp, parsed.from);
              }
            } else if (v.verified === false && v.correctedAppId === null) {
              console.log("[EmailSync] Verify rejected:", parsed.from, "— not a job email");
            }
          }
        }
      } catch (e) {
        console.error("[EmailSync] Verification batch failed:", e.message);
      }
    }

    // ── Pass 3: LLM batch analysis of unmatched emails ──
    if (candidates.length > 0) {
      const BATCH_SIZE = Math.max(4, Math.ceil(candidates.length / 4));
      const batches = [];
      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        batches.push(candidates.slice(i, i + BATCH_SIZE));
      }
      console.log("[EmailSync] Processing", candidates.length, "unmatched in", batches.length, "batch(es) of ~" + BATCH_SIZE);

      for (let b = 0; b < batches.length; b++) {
        const batch = batches[b];
        if (b > 0) {
          onProgress?.(`Waiting for rate limit... (batch ${b + 1}/${batches.length})`);
          await new Promise((r) => setTimeout(r, 62000));
        }
        onProgress?.(`Analyzing batch ${b + 1}/${batches.length} (${batch.length} emails)...`);

        try {
          const currentApps = useAppStore.getState().apps;
          const emailPayload = batch.map((p) => ({
            from: p.from,
            subject: p.subject,
            snippet: p.snippet,
          }));
          const response = await batchAnalyzeEmails(emailPayload, currentApps);
          console.log("[EmailSync] Batch", b + 1, "response:", response);

          if (response?.results) {
            for (const decision of response.results) {
              const idx = decision.emailIndex;
              if (idx < 0 || idx >= batch.length) continue;
              const parsed = batch[idx];
              await applyDecision(decision, parsed, addEmail, result);
            }
            const handledIndexes = new Set(response.results.map((r) => r.emailIndex));
            const missed = [];
            for (let i = 0; i < batch.length; i++) {
              if (!handledIndexes.has(i)) missed.push({ gmailId: batch[i].gmailId, emailDate: batch[i].date });
            }
            if (missed.length > 0) await markProcessedBulk(missed, "skipped");
          } else {
            await markProcessedBulk(batch.map((p) => ({ gmailId: p.gmailId, emailDate: p.date })), "skipped");
          }
        } catch (e) {
          const isRateLimit = e.message?.includes("rate limit");
          console.error("[EmailSync] Batch", b + 1, "failed:", isRateLimit ? "(rate limited, will retry next sync)" : e.message);
          if (!isRateLimit) {
            await markProcessedBulk(batch.map((p) => ({ gmailId: p.gmailId, emailDate: p.date })), "skipped");
          }
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
