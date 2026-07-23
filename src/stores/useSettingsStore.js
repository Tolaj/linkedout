import { create } from "zustand";
import { API_URL } from "../services/api";

async function syncSettingsToBackend(data) {
  try {
    const token = localStorage.getItem("linkedout_token");
    if (!token) return;
    await fetch(`${API_URL}/auth/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  } catch {}
}

function loadFolders() {
  try {
    return JSON.parse(localStorage.getItem("linkedout_folders") || "[]");
  } catch { return []; }
}

function saveFolders(folders) {
  localStorage.setItem("linkedout_folders", JSON.stringify(folders));
}

const useSettingsStore = create((set, get) => ({
  googleClientId: localStorage.getItem("google_client_id") || "",
  googleClientSecret: localStorage.getItem("google_client_secret") || "",
  folderName: localStorage.getItem("linkedout_folder") || "",
  folders: loadFolders(),
  llmApiKey: localStorage.getItem("linkedout_llm_key") || "",
  llmEnabled: localStorage.getItem("linkedout_llm_enabled") === "true",
  llmProvider: localStorage.getItem("linkedout_llm_provider") || "cerebras",

  setGoogleClientId: (id) => {
    localStorage.setItem("google_client_id", id);
    set({ googleClientId: id });
    syncSettingsToBackend({ googleClientId: id });
  },

  setGoogleClientSecret: (secret) => {
    localStorage.setItem("google_client_secret", secret);
    set({ googleClientSecret: secret });
    syncSettingsToBackend({ googleClientSecret: secret });
  },

  setLlmApiKey: (key) => {
    localStorage.setItem("linkedout_llm_key", key);
    set({ llmApiKey: key });
    syncSettingsToBackend({ llmApiKey: key });
  },

  setLlmEnabled: (enabled) => {
    localStorage.setItem("linkedout_llm_enabled", String(enabled));
    set({ llmEnabled: enabled });
    syncSettingsToBackend({ llmEnabled: enabled });
  },

  setLlmProvider: (provider) => {
    localStorage.setItem("linkedout_llm_provider", provider);
    set({ llmProvider: provider });
    syncSettingsToBackend({ llmProvider: provider });
  },

  setFolderName: async (name) => {
    localStorage.setItem("linkedout_folder", name);
    const folders = get().folders;
    const updated = folders.includes(name) ? folders : [...folders, name];
    saveFolders(updated);
    set({ folderName: name, folders: updated });
    await syncSettingsToBackend({ folderName: name, folders: updated });
  },

  removeFolder: (name) => {
    const folders = get().folders.filter((f) => f !== name);
    saveFolders(folders);
    if (get().folderName === name) {
      localStorage.removeItem("linkedout_folder");
      set({ folderName: "", folders });
      syncSettingsToBackend({ folderName: "", folders });
    } else {
      set({ folders });
      syncSettingsToBackend({ folders });
    }
  },

  loadFromUser: (user) => {
    if (!user) return;
    const s = user.settings || user;

    if (s.folderName) {
      localStorage.setItem("linkedout_folder", s.folderName);
      set({ folderName: s.folderName });
    }
    if (s.folders && Array.isArray(s.folders)) {
      const merged = [...new Set([...get().folders, ...s.folders])];
      saveFolders(merged);
      set({ folders: merged });
    }
    if (s.googleClientId) {
      localStorage.setItem("google_client_id", s.googleClientId);
      set({ googleClientId: s.googleClientId });
    }
    if (s.googleClientSecret) {
      localStorage.setItem("google_client_secret", s.googleClientSecret);
      set({ googleClientSecret: s.googleClientSecret });
    }
    if (s.llmApiKey) {
      localStorage.setItem("linkedout_llm_key", s.llmApiKey);
      set({ llmApiKey: s.llmApiKey });
    }
    if (s.llmProvider) {
      localStorage.setItem("linkedout_llm_provider", s.llmProvider);
      set({ llmProvider: s.llmProvider });
    }
    if (s.llmEnabled != null) {
      localStorage.setItem("linkedout_llm_enabled", String(s.llmEnabled));
      set({ llmEnabled: !!s.llmEnabled });
    }
  },
}));

export default useSettingsStore;
