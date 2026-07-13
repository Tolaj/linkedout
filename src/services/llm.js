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

const TRIAGE_TOOLS = [
  {
    type: "function",
    function: {
      name: "application_email",
      description: "This email is related to a job application — confirmation, status update, interview invite, rejection, or offer.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Brief reason why this is application-related" },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "not_application",
      description: "This email is NOT related to any job application — newsletter, marketing, OTP, social media, personal, shopping, etc.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Brief reason" },
        },
        required: ["reason"],
      },
    },
  },
];

const ANALYZE_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_application",
      description: "Create a new job application entry. Use ONLY when no existing application matches this company+role.",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "Company name (clean, no Inc/LLC/Corp suffix)" },
          role: { type: "string", description: "Job title/role applied for" },
          location: { type: "string", description: "Job location if mentioned, empty string if not" },
          domain: { type: "string", description: "Sender email domain (e.g. 'google.com' from noreply@google.com)" },
        },
        required: ["company", "role", "domain"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "not_application",
      description: "This email is NOT a direct application confirmation or status update — it is a newsletter, job alert, marketing, or irrelevant email.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Brief reason" },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_application_stage",
      description: "Update the stage of an existing application based on email content.",
      parameters: {
        type: "object",
        properties: {
          appId: { type: "string", description: "ID of the existing application to update" },
          newStage: {
            type: "string",
            enum: ["Screening", "Interviewing", "Offer", "Rejected"],
          },
          reason: { type: "string", description: "Brief reason for the stage change" },
        },
        required: ["appId", "newStage"],
      },
    },
  },
];

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

async function callLlm(config, messages, tools) {
  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      tools,
      tool_choice: "required",
      temperature: 0,
    }),
  });
  captureRateLimits(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `LLM API error: ${res.status}`);
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  if (!msg?.tool_calls?.length) return null;
  const call = msg.tool_calls[0];
  return { action: call.function.name, ...JSON.parse(call.function.arguments) };
}

// Tier 1: Quick triage — just sender + subject, minimal tokens
export async function triageEmail(from, subject) {
  const config = getConfig();
  if (!config) return null;
  return callLlm(config, [
    { role: "system", content: `You decide if an email is a DIRECT response to a specific job the user applied to — like an application confirmation, interview invite, screening update, offer, or rejection for a SPECIFIC role at a SPECIFIC company.

Mark as NOT application:
- Job board newsletters, resume tips, career advice, marketing emails
- Mass emails from job platforms (LinkedIn, Indeed, Glassdoor, Ladders, ZipRecruiter, etc.)
- Emails about "new jobs matching your profile" or job alerts
- Promotional emails even if job-related

Only mark as application_email if the subject clearly references a specific company AND role the user applied to.
You MUST call exactly one tool.` },
    { role: "user", content: `From: ${from}\nSubject: ${subject}` },
  ], TRIAGE_TOOLS);
}

// Tier 2: Full analysis — only called if triage says yes
export async function analyzeEmail(emailData, existingApps) {
  const config = getConfig();
  if (!config) return null;

  const appList = existingApps.map((a) =>
    `- ID: ${a.id} | Company: ${a.company} | Role: ${a.role} | Stage: ${a.status} | Domain: ${a.domain || "none"}`
  ).join("\n");

  return callLlm(config, [
    { role: "system", content: `You analyze job application emails and decide what action to take.

EXISTING APPLICATIONS:
${appList || "(none)"}

RULES:
1. REJECT (call not_application) if this is a newsletter, job alert, marketing, resume tip, career advice, or mass email from a job platform — even if job-related
2. If this is a NEW application confirmation for a company+role not in the list → use create_application
3. If this matches an EXISTING application with a status update → use update_application_stage
   - Interview scheduled → Interviewing
   - Under review/screening → Screening
   - Offer/congratulations → Offer
   - Rejection/not moving forward → Rejected
4. NEVER create a duplicate — match by company name (ignore Inc/LLC/Corp)
5. Extract clean company name and exact role title
6. If unsure whether it's a real application vs marketing, default to NOT creating an application

You MUST call exactly one tool.` },
    { role: "user", content: `From: ${emailData.from}\nSubject: ${emailData.subject}\nSnippet: ${emailData.snippet}` },
  ], ANALYZE_TOOLS);
}
