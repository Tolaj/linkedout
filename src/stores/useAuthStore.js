import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("linkedout_token"),
  loading: true,

  setAuth(user, token) {
    localStorage.setItem("linkedout_token", token);
    set({ user, token, loading: false });
  },

  logout() {
    localStorage.removeItem("linkedout_token");
    set({ user: null, token: null, loading: false });
  },

  async register(name, email, password) {
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
      if (!res.ok) throw new Error();
      const data = await res.json();
      set({ user: data.user, loading: false });
    } catch {
      get().logout();
    }
  },
}));

export default useAuthStore;
