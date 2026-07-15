import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";

const useProcessedEmailStore = create((set, get) => ({
  entries: [],
  loaded: false,

  load: async () => {
    try {
      const remote = await api.getAll("processedemails");
      set({ entries: Array.isArray(remote) ? remote : [], loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
    }
  },

  isProcessed: (gmailId) => {
    return get().entries.some((e) => e.gmailId === gmailId);
  },

  isSkipped: (gmailId) => {
    return get().entries.some((e) => e.gmailId === gmailId && e.status === "skipped");
  },

  getProcessedIds: () => {
    return new Set(get().entries.map((e) => e.gmailId));
  },

  getSkippedIds: () => {
    return new Set(get().entries.filter((e) => e.status === "skipped").map((e) => e.gmailId));
  },

  markProcessed: async (gmailId, status) => {
    if (get().entries.some((e) => e.gmailId === gmailId)) return;
    const entry = { id: uid(), gmailId, status };
    set({ entries: [...get().entries, entry] });
    try { await api.create("processedemails", entry); } catch {}
  },

  markProcessedBulk: async (gmailIds, status) => {
    const existing = get().getProcessedIds();
    const newEntries = gmailIds
      .filter((id) => !existing.has(id))
      .map((gmailId) => ({ id: uid(), gmailId, status }));
    if (newEntries.length === 0) return;
    set({ entries: [...get().entries, ...newEntries] });
    try { await api.sync("processedemails", newEntries); } catch {}
  },

  clearSkipped: async () => {
    const skipped = get().entries.filter((e) => e.status === "skipped");
    const remaining = get().entries.filter((e) => e.status !== "skipped");
    set({ entries: remaining });
    for (const entry of skipped) {
      try { await api.remove("processedemails", entry.id); } catch {}
    }
  },
}));

export default useProcessedEmailStore;
