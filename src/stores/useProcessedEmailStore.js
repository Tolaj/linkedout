import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";
import useToastStore from "./useToastStore";

const useProcessedEmailStore = create((set, get) => ({
  entries: [],
  loaded: false,

  load: async () => {
    try {
      const remote = await api.getAll("processedemails");
      set({ entries: Array.isArray(remote) ? remote : [], loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
      useToastStore.getState().addToast("Failed to load processed emails");
    }
  },

  isProcessed: (gmailId) => {
    return get().entries.some((e) => e.gmailId === gmailId);
  },

  getProcessedIds: () => {
    return new Set(get().entries.map((e) => e.gmailId));
  },

  getSkippedIds: () => {
    return new Set(get().entries.filter((e) => e.status === "skipped").map((e) => e.gmailId));
  },

  getLastProcessedDate: () => {
    let latest = null;
    for (const e of get().entries) {
      if (!e.emailDate) continue;
      if (!latest || e.emailDate > latest) latest = e.emailDate;
    }
    return latest;
  },

  markProcessed: async (gmailId, status, emailDate) => {
    if (get().entries.some((e) => e.gmailId === gmailId)) return;
    const entry = { id: uid(), gmailId, status, emailDate: emailDate || null };
    const prev = get().entries;
    set({ entries: [...prev, entry] });
    try { await api.create("processedemails", entry); } catch { set({ entries: prev }); useToastStore.getState().addToast("Failed to save processed email"); }
  },

  markProcessedBulk: async (items, status) => {
    const existing = get().getProcessedIds();
    const newEntries = items
      .filter((item) => {
        const gid = typeof item === "string" ? item : item.gmailId;
        return !existing.has(gid);
      })
      .map((item) => {
        if (typeof item === "string") return { id: uid(), gmailId: item, status, emailDate: null };
        return { id: uid(), gmailId: item.gmailId, status, emailDate: item.emailDate || null };
      });
    if (newEntries.length === 0) return;
    const prev = get().entries;
    set({ entries: [...prev, ...newEntries] });
    try { await api.sync("processedemails", newEntries); } catch { set({ entries: prev }); useToastStore.getState().addToast("Failed to save processed emails"); }
  },

  clearSkipped: async () => {
    const skipped = get().entries.filter((e) => e.status === "skipped");
    const remaining = get().entries.filter((e) => e.status !== "skipped");
    set({ entries: remaining });
    for (const entry of skipped) {
      try { await api.remove("processedemails", entry.id); } catch { useToastStore.getState().addToast("Failed to clear skipped emails"); break; }
    }
  },
}));

export default useProcessedEmailStore;
