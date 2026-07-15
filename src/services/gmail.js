const SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

let codeClient = null;
let accessToken = localStorage.getItem("gmail_access_token") || null;
let refreshing = null;
let restorePromise = null;

function getAuthHeaders() {
  const token = localStorage.getItem("linkedout_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

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

  codeClient = window.google.accounts.oauth2.initCodeClient({
    client_id: clientId,
    scope: SCOPES,
    ux_mode: "popup",
    callback: () => {},
  });
}

// Try to restore connection using backend refresh token
export function restoreGmail() {
  if (accessToken) return Promise.resolve(true);
  if (restorePromise) return restorePromise;
  const clientId = getClientId();
  if (!clientId) return Promise.resolve(false);
  restorePromise = (async () => {
    try {
      const token = localStorage.getItem("linkedout_token");
      if (!token) return false;
      const res = await fetch(`${API_URL}/gmail/token?clientId=${encodeURIComponent(clientId)}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return false;
      const data = await res.json();
      accessToken = data.accessToken;
      localStorage.setItem("gmail_access_token", accessToken);
      return true;
    } catch {
      return false;
    } finally {
      restorePromise = null;
    }
  })();
  return restorePromise;
}

// Refresh access token via backend
async function refreshAccessToken() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const clientId = getClientId();
    if (!clientId) throw new Error("No Google Client ID");
    const res = await fetch(`${API_URL}/gmail/token?clientId=${encodeURIComponent(clientId)}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      accessToken = null;
      localStorage.removeItem("gmail_access_token");
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to refresh Gmail token");
    }
    const data = await res.json();
    accessToken = data.accessToken;
    localStorage.setItem("gmail_access_token", accessToken);
    return accessToken;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

// Gmail API fetch wrapper with auto-refresh on 401
async function gmailFetch(url, options = {}) {
  const doFetch = (token) =>
    fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });

  let res = await doFetch(accessToken);
  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      res = await doFetch(newToken);
    } catch {
      return res;
    }
  }
  return res;
}

export function connectGmail() {
  return new Promise((resolve, reject) => {
    if (!codeClient) initGmail();
    if (!codeClient) {
      reject(new Error("Google client not initialized. Set Client ID in Settings."));
      return;
    }

    codeClient.callback = async (response) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      try {
        const res = await fetch(`${API_URL}/gmail/connect`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ code: response.code, clientId: getClientId() }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          reject(new Error(err.error || "Failed to connect Gmail"));
          return;
        }
        const data = await res.json();
        accessToken = data.accessToken;
        localStorage.setItem("gmail_access_token", accessToken);
        resolve(accessToken);
      } catch (e) {
        reject(e);
      }
    };

    codeClient.requestCode();
  });
}

export async function disconnectGmail() {
  if (accessToken) {
    window.google?.accounts?.oauth2?.revoke?.(accessToken, () => {});
  }
  accessToken = null;
  localStorage.removeItem("gmail_access_token");
  try {
    await fetch(`${API_URL}/gmail/disconnect`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {}
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
  const res = await gmailFetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to send email");
  }
  return res.json();
}

export async function getUserEmail() {
  if (!accessToken) return null;
  const res = await gmailFetch("https://www.googleapis.com/gmail/v1/users/me/profile");
  if (!res.ok) return null;
  const data = await res.json();
  return data.emailAddress;
}

export async function checkForReplies(threadId) {
  if (!accessToken || !threadId) return [];
  const res = await gmailFetch(`https://www.googleapis.com/gmail/v1/users/me/threads/${threadId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages || [];
}

export async function searchInboxEmails(query, maxResults = 50) {
  if (!accessToken) return [];
  trackGmailCall("read");
  const q = encodeURIComponent(query);
  const res = await gmailFetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${maxResults}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.messages) return [];

  const BATCH = 5;
  const results = [];
  for (let i = 0; i < data.messages.length; i += BATCH) {
    const chunk = data.messages.slice(i, i + BATCH);
    const details = await Promise.all(
      chunk.map(async (m) => {
        const r = await gmailFetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
        );
        if (!r.ok) return null;
        return r.json();
      })
    );
    results.push(...details.filter(Boolean));
    if (i + BATCH < data.messages.length) await new Promise((r) => setTimeout(r, 200));
  }
  return results;
}

export async function getEmailBody(messageId) {
  if (!accessToken || !messageId) return null;
  const res = await gmailFetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`
  );
  if (!res.ok) return null;
  const msg = await res.json();

  function decodeBase64(str) {
    try { return decodeURIComponent(escape(atob(str.replace(/-/g, "+").replace(/_/g, "/")))); }
    catch { return atob(str.replace(/-/g, "+").replace(/_/g, "/")); }
  }

  function extractBody(payload) {
    if (payload.mimeType === "text/html" && payload.body?.data) {
      return { html: decodeBase64(payload.body.data) };
    }
    if (payload.mimeType === "text/plain" && payload.body?.data) {
      return { text: decodeBase64(payload.body.data) };
    }
    if (payload.parts) {
      let html = null, text = null;
      for (const part of payload.parts) {
        const result = extractBody(part);
        if (result?.html) html = result.html;
        if (result?.text && !text) text = result.text;
      }
      if (html) return { html };
      if (text) return { text };
    }
    return null;
  }

  const body = extractBody(msg.payload);
  const from = extractHeader(msg, "From");
  const subject = extractHeader(msg, "Subject");
  const date = extractHeader(msg, "Date");
  const to = extractHeader(msg, "To");

  return {
    from,
    to,
    subject,
    date: date ? new Date(date).toISOString() : null,
    html: body?.html || null,
    text: body?.text || null,
  };
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
