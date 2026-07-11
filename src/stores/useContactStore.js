import { create } from "zustand";
import db from "../services/offlineDb";
import { api } from "../services/api";
import { uid } from "../lib/constants";

const useContactStore = create((set, get) => ({
  contacts: [],
  loaded: false,

  load: async () => {
    if (!get().loaded) {
      const cached = await db.contacts.toArray();
      set({ contacts: cached, loaded: true });
    }
    try {
      const remote = await api.getAll("contacts");
      await db.contacts.clear();
      await db.contacts.bulkPut(remote);
      set({ contacts: remote });
    } catch {}
  },

  addContact: async (data) => {
    const contact = { ...data, id: data.id || uid(), createdAt: new Date().toISOString() };
    set({ contacts: [contact, ...get().contacts] });
    await db.contacts.put(contact);
    try { await api.create("contacts", contact); } catch {}
    return contact;
  },

  updateContact: async (id, data) => {
    const updated = { ...data, id };
    set({ contacts: get().contacts.map((c) => (c.id === id ? updated : c)) });
    await db.contacts.put(updated);
    try { await api.update("contacts", id, updated); } catch {}
  },

  deleteContact: async (id) => {
    set({ contacts: get().contacts.filter((c) => c.id !== id) });
    await db.contacts.delete(id);
    try { await api.remove("contacts", id); } catch {}
  },
}));

export default useContactStore;
