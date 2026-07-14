import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";

const useEmailStore = create((set, get) => ({
  emails: [],
  templates: [],
  loaded: false,

  load: async () => {
    try {
      const [remoteEmails, remoteTemplates] = await Promise.all([
        api.getAll("emails"),
        api.getAll("templates"),
      ]);
      set({
        emails: Array.isArray(remoteEmails) ? remoteEmails : [],
        templates: Array.isArray(remoteTemplates) ? remoteTemplates : [],
        loaded: true,
      });
    } catch {
      if (!get().loaded) set({ loaded: true });
    }
  },

  addTemplate: async (data) => {
    const template = { ...data, id: uid(), createdAt: new Date().toISOString() };
    set({ templates: [template, ...get().templates] });
    try { await api.create("templates", template); } catch {}
  },

  updateTemplate: async (id, data) => {
    const existing = get().templates.find((t) => t.id === id);
    if (!existing) return;
    const updated = { ...existing, ...data, id };
    set({ templates: get().templates.map((t) => (t.id === id ? updated : t)) });
    try { await api.update("templates", id, updated); } catch {}
  },

  deleteTemplate: async (id) => {
    set({ templates: get().templates.filter((t) => t.id !== id) });
    try { await api.remove("templates", id); } catch {}
  },

  addEmail: async (data) => {
    const email = { id: uid(), sentAt: new Date().toISOString(), ...data };
    set({ emails: [email, ...get().emails] });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await api.create("emails", email);
        break;
      } catch (e) {
        if (attempt === 2) console.error("Failed to persist email to backend:", e.message);
      }
    }
    return email;
  },

  updateEmail: async (id, data) => {
    const email = get().emails.find((e) => e.id === id);
    const updated = { ...email, ...data, id };
    set({ emails: get().emails.map((e) => (e.id === id ? updated : e)) });
    try { await api.update("emails", id, updated); } catch {}
  },

  deleteEmail: async (id) => {
    set({ emails: get().emails.filter((e) => e.id !== id) });
    try { await api.remove("emails", id); } catch {}
  },
}));

export default useEmailStore;
