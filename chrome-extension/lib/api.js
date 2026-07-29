window.LinkedOut = window.LinkedOut || {};

LinkedOut.API = {
  async _getConfig() {
    const data = await chrome.storage.local.get(["linkedout_token", "linkedout_api_url"]);
    return {
      token: data.linkedout_token || null,
      apiUrl: data.linkedout_api_url || LinkedOut.DEFAULT_API_URL,
    };
  },

  async _request(path, options = {}) {
    const { token, apiUrl } = await this._getConfig();
    if (!apiUrl) throw new Error("API URL not configured. Set it in the extension popup.");
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers.Authorization = "Bearer " + token;

    // Content scripts run on the page's origin, causing CORS issues.
    // Detect content script context and proxy through the service worker.
    const isContentScript = typeof window !== "undefined"
      && window.location
      && !window.location.protocol.startsWith("chrome-extension");

    if (isContentScript) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: "API_PROXY",
          url: apiUrl + path,
          options: { method: options.method || "GET", headers, body: options.body },
        }, (response) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (!response) return reject(new Error("No response from proxy"));
          if (response._proxyError) return reject(new Error(response._proxyError));
          if (response._unauthorized) {
            chrome.storage.local.remove(["linkedout_token", "linkedout_user"]);
            return resolve({ _unauthorized: true });
          }
          resolve(response);
        });
      });
    }

    const res = await fetch(apiUrl + path, { ...options, headers });
    if (!res.ok) {
      if (res.status === 401) {
        await chrome.storage.local.remove(["linkedout_token", "linkedout_user"]);
        return { _unauthorized: true };
      }
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },

  async login(email, password) {
    const { apiUrl } = await this._getConfig();
    if (!apiUrl) throw new Error("API URL not configured. Set it in the extension popup.");
    const res = await fetch(apiUrl + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Login failed");
    }
    const data = await res.json();
    await chrome.storage.local.set({
      linkedout_token: data.token,
      linkedout_user: data.user,
    });
    return data.user;
  },

  async googleLogin(credential) {
    const { apiUrl } = await this._getConfig();
    if (!apiUrl) throw new Error("API URL not configured.");
    const res = await fetch(apiUrl + "/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Google login failed");
    }
    const data = await res.json();
    await chrome.storage.local.set({
      linkedout_token: data.token,
      linkedout_user: data.user,
    });
    return data.user;
  },

  async signup(name, email, password) {
    const { apiUrl } = await this._getConfig();
    if (!apiUrl) throw new Error("API URL not configured. Set it in the extension popup.");
    const res = await fetch(apiUrl + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Signup failed");
    }
    const data = await res.json();
    await chrome.storage.local.set({
      linkedout_token: data.token,
      linkedout_user: data.user,
    });
    return data.user;
  },

  async checkAuth() {
    const result = await this._request("/auth/me");
    if (result._unauthorized) return null;
    return result.user || result;
  },

  async createApplication(appData) {
    const id = LinkedOut.uid();
    var settings = await this.getSettings();
    var workspace = settings && settings.folderName ? settings.folderName : "";
    const app = {
      ...LinkedOut.EMPTY_APP,
      ...appData,
      id,
      workspace,
      createdAt: new Date().toISOString(),
    };
    const result = await this._request("/applications", {
      method: "POST",
      body: JSON.stringify(app),
    });
    if (result._unauthorized) return { _unauthorized: true };
    return result;
  },

  async getProfileFields() {
    var raw = await this._request("/profilefields");
    if (raw._unauthorized) return raw;
    var allFields = this._unwrapArray(raw);
    if (!Array.isArray(allFields)) return allFields;
    const settings = await this.getSettings();
    const workspace = settings && settings.folderName ? settings.folderName : "";
    if (!workspace) return allFields;
    return allFields.filter(function (f) {
      return !f.workspace || f.workspace === workspace;
    });
  },

  async getSettings() {
    return this._request("/auth/me").then(function (res) {
      if (res._unauthorized) return null;
      return (res.user && res.user.settings) || res.settings || {};
    }).catch(function () { return {}; });
  },

  _unwrapArray: function (raw) {
    return Array.isArray(raw) ? raw : (raw && Array.isArray(raw.data) ? raw.data : raw);
  },

  async getApplications() {
    var raw = await this._request("/applications");
    if (raw._unauthorized) return raw;
    return this._unwrapArray(raw);
  },

  async getTodayApps() {
    var all = await this.getApplications();
    if (all._unauthorized || !Array.isArray(all)) return all;
    var today = new Date().toISOString().slice(0, 10);
    return all.filter(function (a) { return a.dateApplied === today; });
  },

  async updateApplication(id, data) {
    return this._request("/applications/" + id, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async saveProfileFields(fields) {
    return this._request("/profilefields/sync", {
      method: "POST",
      body: JSON.stringify(fields),
    });
  },

  async logout() {
    await chrome.storage.local.remove(["linkedout_token", "linkedout_user"]);
  },
};
