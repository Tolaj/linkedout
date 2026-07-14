import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";

const useNoteStore = create((set, get) => ({
  notes: [],
  loaded: false,

  load: async () => {
    try {
      const remote = await api.getAll("notes");
      set({ notes: Array.isArray(remote) ? remote : [], loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
    }
  },

  addNote: async (data) => {
    const note = { ...data, id: data.id || uid(), createdAt: new Date().toISOString() };
    set({ notes: [note, ...get().notes] });
    try { await api.create("notes", note); } catch {}
    return note;
  },

  updateNote: async (id, data) => {
    const existing = get().notes.find((n) => n.id === id);
    if (!existing) return;
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    set({ notes: get().notes.map((n) => (n.id === id ? updated : n)) });
    try { await api.update("notes", id, updated); } catch {}
    return updated;
  },

  deleteNote: async (id) => {
    set({ notes: get().notes.filter((n) => n.id !== id) });
    try { await api.remove("notes", id); } catch {}
  },

  getBySection: (section) => {
    return get().notes.filter((n) => n.section === section);
  },

  getAppNote: (appId) => {
    return get().notes.find((n) => n.section === "application" && n.appId === appId);
  },
}));

export default useNoteStore;
