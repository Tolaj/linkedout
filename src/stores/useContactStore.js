import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";
import useToastStore from "./useToastStore";

const useContactStore = create((set, get) => ({
  contacts: [],
  loaded: false,

  load: async () => {
    try {
      const remote = await api.getAll("contacts");
      set({ contacts: Array.isArray(remote) ? remote : [], loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
      useToastStore.getState().addToast("Failed to load contacts");
    }
  },

  addContact: async (data) => {
    const contact = { ...data, id: data.id || uid(), createdAt: new Date().toISOString() };
    const prev = get().contacts;
    set({ contacts: [contact, ...prev] });
    try { await api.create("contacts", contact); } catch { set({ contacts: prev }); useToastStore.getState().addToast("Failed to save contact"); }
    return contact;
  },

  updateContact: async (id, data) => {
    const existing = get().contacts.find((c) => c.id === id);
    const prev = get().contacts;
    const updated = { ...existing, ...data, id };
    set({ contacts: get().contacts.map((c) => (c.id === id ? updated : c)) });
    try { await api.update("contacts", id, updated); } catch { set({ contacts: prev }); useToastStore.getState().addToast("Failed to save contact"); }
  },

  deleteContact: async (id) => {
    const prev = get().contacts;
    set({ contacts: get().contacts.filter((c) => c.id !== id) });
    try { await api.remove("contacts", id); } catch { set({ contacts: prev }); useToastStore.getState().addToast("Failed to delete contact"); }
  },
}));

export default useContactStore;
