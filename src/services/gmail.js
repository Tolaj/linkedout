const SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly";

let tokenClient = null;
let accessToken = null;

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
