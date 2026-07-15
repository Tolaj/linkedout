const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const REQUEST_TIMEOUT = 30000;

function getToken() {
  return localStorage.getItem("linkedout_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("linkedout_token");
        localStorage.removeItem("linkedout_user");
        window.location.href = "/login";
        throw new Error("Session expired. Please log in again.");
      }
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request timed out");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function healthCheck() {
  try {
    const data = await request("/health");
    return data.db === "connected";
  } catch {
    return false;
  }
}

export const api = {
  getAll:  (collection) => request(`/${collection}`),
  getOne:  (collection, id) => request(`/${collection}/${id}`),
  create:  (collection, data) => request(`/${collection}`, { method: "POST", body: JSON.stringify(data) }),
  update:  (collection, id, data) => request(`/${collection}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove:  (collection, id) => request(`/${collection}/${id}`, { method: "DELETE" }),
  sync:    (collection, items) => request(`/${collection}/sync`, { method: "POST", body: JSON.stringify(items) }),
};
