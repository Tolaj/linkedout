import { create } from "zustand";
import db from "../services/offlineDb";
import { api } from "../services/api";
import { uid } from "../lib/constants";

const useEmailStore = create((set, get) => ({
  emails: [],
  templates: [],
  loaded: false,

  load: async () => {
    if (!get().loaded) {
      const [cachedEmails, cachedTemplates] = await Promise.all([
        db.emails.toArray(),
        db.emailTemplates.toArray(),
      ]);
      set({ emails: cachedEmails, templates: cachedTemplates, loaded: true });
    }

    try {
      const [remoteEmails, remoteTemplates] = await Promise.all([
        api.getAll("emails"),
        api.getAll("templates"),
      ]);
      await db.emails.clear();
      await db.emails.bulkPut(remoteEmails);
      await db.emailTemplates.clear();
      await db.emailTemplates.bulkPut(remoteTemplates);
      set({ emails: remoteEmails, templates: remoteTemplates });
    } catch {}
  },

  addTemplate: async (data) => {
    const template = { ...data, id: uid(), createdAt: new Date().toISOString() };
    set({ templates: [template, ...get().templates] });
    await db.emailTemplates.put(template);
    try { await api.create("templates", template); } catch {}
  },

  updateTemplate: async (id, data) => {
    const updated = { ...data, id };
    set({ templates: get().templates.map((t) => (t.id === id ? updated : t)) });
    await db.emailTemplates.put(updated);
    try { await api.update("templates", id, updated); } catch {}
  },

  deleteTemplate: async (id) => {
    set({ templates: get().templates.filter((t) => t.id !== id) });
    await db.emailTemplates.delete(id);
    try { await api.remove("templates", id); } catch {}
  },

  addEmail: async (data) => {
    const email = { id: uid(), sentAt: new Date().toISOString(), ...data };
    set({ emails: [email, ...get().emails] });
    await db.emails.put(email);
    try { await api.create("emails", email); } catch {}
    return email;
  },

  updateEmail: async (id, data) => {
    const email = get().emails.find((e) => e.id === id);
    const updated = { ...email, ...data, id };
    set({ emails: get().emails.map((e) => (e.id === id ? updated : e)) });
    await db.emails.put(updated);
    try { await api.update("emails", id, updated); } catch {}
  },

  deleteEmail: async (id) => {
    set({ emails: get().emails.filter((e) => e.id !== id) });
    await db.emails.delete(id);
    try { await api.remove("emails", id); } catch {}
  },
}));

export default useEmailStore;
