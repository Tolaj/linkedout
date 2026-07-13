const SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly";

let tokenClient = null;
let accessToken = null;

function trackGmailCall(type) {
  const today = new Date().toISOString().slice(0, 10);
  let usage;
  try { usage = JSON.parse(localStorage.getItem("linkedout_gmail_usage") || "{}"); }
  catch { usage = {}; }
  if (usage.date !== today) usage = { date: today, sent: 0, read: 0 };
  usage[type] = (usage[type] || 0) + 1;
  localStorage.setItem("linkedout_gmail_usage", JSON.stringify(usage));
}

export function getGmailUsage() {
  try {
    const usage = JSON.parse(localStorage.getItem("linkedout_gmail_usage") || "{}");
    const today = new Date().toISOString().slice(0, 10);
    if (usage.date !== today) return { date: today, sent: 0, read: 0 };
    return usage;
  } catch { return { date: new Date().toISOString().slice(0, 10), sent: 0, read: 0 }; }
}

export function getClientId() {
  return localStorage.getItem("google_client_id") || "";
}

export function isGmailConfigured() {
  return !!getClientId();
}

export function isGmailConnected() {
  return !!accessToken;
}

export function initGmail() {
  const clientId = getClientId();
  if (!clientId || !window.google?.accounts?.oauth2) return;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (response) => {
      if (response.access_token) {
        accessToken = response.access_token;
      }
    },
  });
}

export function connectGmail() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      initGmail();
    }
    if (!tokenClient) {
      reject(new Error("Google client not initialized. Set Client ID in Settings."));
      return;
    }
    const original = tokenClient.callback;
    tokenClient.callback = (response) => {
      if (response.access_token) {
        accessToken = response.access_token;
        resolve(response.access_token);
      } else {
        reject(new Error("Failed to get access token"));
      }
      tokenClient.callback = original;
    };
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

export function disconnectGmail() {
  if (accessToken) {
    window.google?.accounts?.oauth2?.revoke?.(accessToken);
  }
  accessToken = null;
}

function buildRawEmail({ to, subject, body, from }) {
  const lines = [
    `From: ${from || "me"}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    body,
  ];
  const raw = lines.join("\r\n");
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendEmail({ to, subject, body }) {
  if (!accessToken) throw new Error("Gmail not connected");
  trackGmailCall("sent");

  const raw = buildRawEmail({ to, subject, body });
  const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to send email");
  }
  return res.json();
}

export async function getUserEmail() {
  if (!accessToken) return null;
  const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.emailAddress;
}

export async function checkForReplies(threadId) {
  if (!accessToken || !threadId) return [];
  const res = await fetch(`https://www.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages || [];
}

export async function searchInboxEmails(query, maxResults = 50) {
  if (!accessToken) return [];
  trackGmailCall("read");
  const q = encodeURIComponent(query);
  const res = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.messages) return [];

  const details = await Promise.all(
    data.messages.map(async (m) => {
      const r = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!r.ok) return null;
      return r.json();
    })
  );
  return details.filter(Boolean);
}

function extractHeader(msg, name) {
  const h = msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

function extractEmail(fromHeader) {
  const match = fromHeader.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : fromHeader.toLowerCase().trim();
}

export function parseGmailMessage(msg) {
  const from = extractHeader(msg, "From");
  const subject = extractHeader(msg, "Subject");
  const date = extractHeader(msg, "Date");
  return {
    gmailId: msg.id,
    threadId: msg.threadId,
    from: extractEmail(from),
    fromRaw: from,
    subject,
    date: date ? new Date(date).toISOString() : new Date().toISOString(),
    snippet: msg.snippet || "",
  };
}
