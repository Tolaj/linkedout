const PROVIDERS = {
  cerebras: {
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: "gpt-oss-120b",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  },
};

function getConfig() {
  const provider = localStorage.getItem("linkedout_llm_provider") || "cerebras";
  const apiKey = localStorage.getItem("linkedout_llm_key");
  if (!apiKey) return null;
  const config = PROVIDERS[provider];
  if (!config) return null;
  return { ...config, apiKey };
}

function captureRateLimits(res) {
  const get = (name) => res.headers.get(name);
  const usage = {};
  const limitReq = get("x-ratelimit-limit-requests");
  const remainReq = get("x-ratelimit-remaining-requests");
  const resetReq = get("x-ratelimit-reset-requests");
  const limitTok = get("x-ratelimit-limit-tokens");
  const remainTok = get("x-ratelimit-remaining-tokens");
  const resetTok = get("x-ratelimit-reset-tokens");
  if (limitReq != null) usage.requestLimit = parseInt(limitReq, 10);
  if (remainReq != null) usage.requestRemaining = parseInt(remainReq, 10);
  if (resetReq != null) usage.requestReset = resetReq;
  if (limitTok != null) usage.tokenLimit = parseInt(limitTok, 10);
  if (remainTok != null) usage.tokenRemaining = parseInt(remainTok, 10);
  if (resetTok != null) usage.tokenReset = resetTok;
  if (Object.keys(usage).length > 0) {
    usage.updatedAt = new Date().toISOString();
    localStorage.setItem("linkedout_llm_usage", JSON.stringify(usage));
  }
}

export function getLlmUsage() {
  try { return JSON.parse(localStorage.getItem("linkedout_llm_usage") || "null"); }
  catch { return null; }
}

async function callLlmJson(config, messages, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });
    captureRateLimits(res);
    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      const wait = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 65000) : (2 ** attempt) * 15000;
      // console.log(`[LLM] Rate limited, waiting ${wait}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `LLM API error: ${res.status}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    try { return JSON.parse(content); }
    catch { return null; }
  }
  throw new Error("LLM rate limit exceeded after retries");
}

// Batch analyze: process multiple emails in one LLM call
// Returns array of decisions: { emailIndex, action, appId?, company?, role?, domain?, newStage?, reason? }
export async function batchAnalyzeEmails(emails, existingApps) {
  const config = getConfig();
  if (!config) return null;

  const appList = existingApps.map((a) =>
    `- ID: ${a.id} | Company: ${a.company} | Role: ${a.role} | Stage: ${a.status} | Domain: ${a.domain || "none"}`
  ).join("\n");

  const emailList = emails.map((e, i) =>
    `[${i}] From: ${e.from} | Subject: ${e.subject} | Snippet: ${e.snippet || ""}`
  ).join("\n");

  return callLlmJson(config, [
    { role: "system", content: `You analyze job application emails in batch. Return a JSON object with a "results" array.

EXISTING APPLICATIONS:
${appList || "(none)"}

For EACH email, decide one action:
- "not_application" — newsletter, job alert, marketing, OTP, social media, shopping, personal, etc.
- "create_application" — NEW application confirmation for a company+role NOT in the list. Include company, role, location, domain.
- "link_to_application" — matches an EXISTING app, stage unchanged. Include appId.
- "update_application_stage" — matches an EXISTING app with a stage change. Include appId, newStage (Screening|Interviewing|Offer|Rejected).

RULES:
1. REJECT if newsletter, job alert, marketing, resume tip, career advice, mass email from job platform
2. NEVER create duplicates — match by company name (ignore Inc/LLC/Corp)
3. Sender domain may differ from company (e.g. notify@dayforce.com for West Shore Home, notification@jobvite.com for Mini-Circuits) — match by company name in subject/snippet, not sender domain
4. If unsure, default to "not_application"

Return JSON: { "results": [{ "emailIndex": 0, "action": "...", "appId": "...", "company": "...", "role": "...", "location": "...", "domain": "...", "newStage": "...", "reason": "..." }, ...] }
Every email MUST have exactly one entry in results.` },
    { role: "user", content: emailList },
  ]);
}

// Batch verify: cross-check rule-based matches with LLM
// Returns array: { emailIndex, verified, correctedAppId? }
export async function batchVerifyMatches(matches, existingApps) {
  const config = getConfig();
  if (!config) return null;

  const appList = existingApps.map((a) =>
    `- ID: ${a.id} | Company: ${a.company} | Role: ${a.role} | Stage: ${a.status} | Domain: ${a.domain || "none"}`
  ).join("\n");

  const matchList = matches.map((m, i) =>
    `[${i}] From: ${m.email.from} | Subject: ${m.email.subject} | Snippet: ${m.email.snippet || ""} → Pre-matched to: ${m.app.company} (ID: ${m.app.id})`
  ).join("\n");

  return callLlmJson(config, [
    { role: "system", content: `You verify rule-based email-to-job-application matches. Return a JSON object with a "results" array.

ALL APPLICATIONS:
${appList || "(none)"}

Each email below was matched to a job application by domain. Verify if the match is correct.
- If correct: { "emailIndex": N, "verified": true }
- If wrong match (should be different app): { "emailIndex": N, "verified": false, "correctedAppId": "correct_id", "reason": "..." }
- If not a job email at all: { "emailIndex": N, "verified": false, "correctedAppId": null, "reason": "not a job application email" }

Return JSON: { "results": [...] }
Every email MUST have exactly one entry.` },
    { role: "user", content: matchList },
  ]);
}
