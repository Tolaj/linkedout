window.LinkedOut = window.LinkedOut || {};

LinkedOut.API = {
  async _getConfig() {
    const data = await chrome.storage.local.get(["linkedout_token", "linkedout_api_url"]);
    return {
      token: data.linkedout_token || null,
      apiUrl: data.linkedout_api_url || "http://localhost:4000/api",
    };
  },

  async _request(path, options = {}) {
    const { token, apiUrl } = await this._getConfig();
    if (!apiUrl) throw new Error("API URL not configured. Set it in the extension popup.");
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers.Authorization = "Bearer " + token;

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
    const allFields = await this._request("/profilefields");
    if (allFields._unauthorized || !Array.isArray(allFields)) return allFields;
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

  async logout() {
    await chrome.storage.local.remove(["linkedout_token", "linkedout_user"]);
  },
};
