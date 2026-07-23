import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";
import useToastStore from "./useToastStore";

const useNoteStore = create((set, get) => ({
  notes: [],
  loaded: false,

  load: async () => {
    try {
      const remote = await api.getAll("notes");
      set({ notes: Array.isArray(remote) ? remote : [], loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
      useToastStore.getState().addToast("Failed to load notes");
    }
  },

  addNote: async (data) => {
    const note = { ...data, id: data.id || uid(), createdAt: new Date().toISOString() };
    const prev = get().notes;
    set({ notes: [note, ...prev] });
    try { await api.create("notes", note); } catch { set({ notes: prev }); useToastStore.getState().addToast("Failed to save note"); }
    return note;
  },

  updateNote: async (id, data) => {
    const existing = get().notes.find((n) => n.id === id);
    if (!existing) return;
    const prev = get().notes;
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    set({ notes: get().notes.map((n) => (n.id === id ? updated : n)) });
    try { await api.update("notes", id, updated); } catch { set({ notes: prev }); useToastStore.getState().addToast("Failed to save note"); }
    return updated;
  },

  deleteNote: async (id) => {
    const prev = get().notes;
    set({ notes: get().notes.filter((n) => n.id !== id) });
    try { await api.remove("notes", id); } catch { set({ notes: prev }); useToastStore.getState().addToast("Failed to delete note"); }
  },

  getBySection: (section) => {
    return get().notes.filter((n) => n.section === section);
  },

  getAppNote: (appId) => {
    return get().notes.find((n) => n.section === "application" && n.appId === appId);
  },
}));

export default useNoteStore;
