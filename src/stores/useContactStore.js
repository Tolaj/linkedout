import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";

const useContactStore = create((set, get) => ({
  contacts: [],
  loaded: false,

  load: async () => {
    try {
      const remote = await api.getAll("contacts");
      set({ contacts: Array.isArray(remote) ? remote : [], loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
    }
  },

  addContact: async (data) => {
    const contact = { ...data, id: data.id || uid(), createdAt: new Date().toISOString() };
    set({ contacts: [contact, ...get().contacts] });
    try { await api.create("contacts", contact); } catch {}
    return contact;
  },

  updateContact: async (id, data) => {
    const existing = get().contacts.find((c) => c.id === id);
    const updated = { ...existing, ...data, id };
    set({ contacts: get().contacts.map((c) => (c.id === id ? updated : c)) });
    try { await api.update("contacts", id, updated); } catch {}
  },

  deleteContact: async (id) => {
    set({ contacts: get().contacts.filter((c) => c.id !== id) });
    try { await api.remove("contacts", id); } catch {}
  },
}));

export default useContactStore;
