import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function syncFolderToBackend(name) {
  try {
    const token = localStorage.getItem("linkedout_token");
    if (!token) return;
    await fetch(`${API_URL}/auth/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ folderName: name }),
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
  folderName: localStorage.getItem("linkedout_folder") || "",
  folders: loadFolders(),
  llmApiKey: localStorage.getItem("linkedout_llm_key") || "",
  llmEnabled: localStorage.getItem("linkedout_llm_enabled") === "true",
  llmProvider: localStorage.getItem("linkedout_llm_provider") || "cerebras",

  setGoogleClientId: (id) => {
    localStorage.setItem("google_client_id", id);
    set({ googleClientId: id });
  },

  setLlmApiKey: (key) => {
    localStorage.setItem("linkedout_llm_key", key);
    set({ llmApiKey: key });
  },

  setLlmEnabled: (enabled) => {
    localStorage.setItem("linkedout_llm_enabled", String(enabled));
    set({ llmEnabled: enabled });
  },

  setLlmProvider: (provider) => {
    localStorage.setItem("linkedout_llm_provider", provider);
    set({ llmProvider: provider });
  },

  setFolderName: (name) => {
    localStorage.setItem("linkedout_folder", name);
    const folders = get().folders;
    const updated = folders.includes(name) ? folders : [...folders, name];
    saveFolders(updated);
    set({ folderName: name, folders: updated });
    syncFolderToBackend(name);
  },

  removeFolder: (name) => {
    const folders = get().folders.filter((f) => f !== name);
    saveFolders(folders);
    if (get().folderName === name) {
      localStorage.removeItem("linkedout_folder");
      set({ folderName: "", folders });
      syncFolderToBackend("");
    } else {
      set({ folders });
    }
  },

  loadFromUser: (user) => {
    if (user.folderName && !localStorage.getItem("linkedout_folder")) {
      localStorage.setItem("linkedout_folder", user.folderName);
      const folders = get().folders;
      const updated = folders.includes(user.folderName) ? folders : [...folders, user.folderName];
      saveFolders(updated);
      set({ folderName: user.folderName, folders: updated });
    }
  },
}));

export default useSettingsStore;
