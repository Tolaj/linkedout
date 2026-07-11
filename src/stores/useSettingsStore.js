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

const useSettingsStore = create((set) => ({
  googleClientId: localStorage.getItem("google_client_id") || "",
  folderName: localStorage.getItem("linkedout_folder") || "",

  setGoogleClientId: (id) => {
    localStorage.setItem("google_client_id", id);
    set({ googleClientId: id });
  },

  setFolderName: (name) => {
    localStorage.setItem("linkedout_folder", name);
    set({ folderName: name });
    syncFolderToBackend(name);
  },

  loadFromUser: (user) => {
    if (user.folderName && !localStorage.getItem("linkedout_folder")) {
      localStorage.setItem("linkedout_folder", user.folderName);
      set({ folderName: user.folderName });
    }
  },
}));

export default useSettingsStore;
