import { create } from "zustand";
import useSettingsStore from "./useSettingsStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const USER_STORAGE_KEYS = [
  "linkedout_token",
  "linkedout_folder",
  "linkedout_folders",
  "linkedout_profile_seeded",
  "linkedout_llm_key",
  "linkedout_llm_enabled",
  "linkedout_llm_provider",
  "linkedout_llm_usage",
  "linkedout_llm_skipped",
  "linkedout_gmail_usage",
  "google_client_id",
  "google_client_secret",
];

function clearUserData() {
  USER_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith("linkedout_backup_")) localStorage.removeItem(k);
  });
}

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("linkedout_token"),
  loading: true,

  setAuth(user, token) {
    localStorage.setItem("linkedout_token", token);
    set({ user, token, loading: false });
    useSettingsStore.getState().loadFromUser(user);
  },

  logout() {
    clearUserData();
    set({ user: null, token: null, loading: false });
    window.location.href = "/login";
  },

  async register(name, email, password) {
    clearUserData();
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    get().setAuth(data.user, data.token);
  },

  async login(email, password) {
    clearUserData();
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    get().setAuth(data.user, data.token);
  },

  async checkAuth() {
    const token = get().token;
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        get().logout();
        return;
      }
      if (!res.ok) {
        set({ loading: false });
        return;
      }
      const data = await res.json();
      set({ user: data.user, loading: false });
      useSettingsStore.getState().loadFromUser(data.user);
    } catch {
      set({ loading: false });
    }
  },
}));

export default useAuthStore;
