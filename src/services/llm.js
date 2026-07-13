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
    { role: "system", content: "You decide if an email is related to a job application. You MUST call exactly one tool." },
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
1. If this is a NEW application confirmation for a company+role not in the list → use create_application
2. If this matches an EXISTING application with a status update → use update_application_stage
   - Interview scheduled → Interviewing
   - Under review/screening → Screening
   - Offer/congratulations → Offer
   - Rejection/not moving forward → Rejected
3. NEVER create a duplicate — match by company name (ignore Inc/LLC/Corp)
4. Extract clean company name and exact role title

You MUST call exactly one tool.` },
    { role: "user", content: `From: ${emailData.from}\nSubject: ${emailData.subject}\nSnippet: ${emailData.snippet}` },
  ], ANALYZE_TOOLS);
}
