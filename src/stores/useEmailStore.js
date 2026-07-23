import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";
import useToastStore from "./useToastStore";

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
      useToastStore.getState().addToast("Failed to load emails");
    }
  },

  addTemplate: async (data) => {
    const template = { ...data, id: uid(), createdAt: new Date().toISOString() };
    const prev = get().templates;
    set({ templates: [template, ...prev] });
    try { await api.create("templates", template); } catch { set({ templates: prev }); useToastStore.getState().addToast("Failed to save template"); }
  },

  updateTemplate: async (id, data) => {
    const existing = get().templates.find((t) => t.id === id);
    if (!existing) return;
    const prev = get().templates;
    const updated = { ...existing, ...data, id };
    set({ templates: get().templates.map((t) => (t.id === id ? updated : t)) });
    try { await api.update("templates", id, updated); } catch { set({ templates: prev }); useToastStore.getState().addToast("Failed to save template"); }
  },

  deleteTemplate: async (id) => {
    const prev = get().templates;
    set({ templates: get().templates.filter((t) => t.id !== id) });
    try { await api.remove("templates", id); } catch { set({ templates: prev }); useToastStore.getState().addToast("Failed to delete template"); }
  },

  addEmail: async (data) => {
    const email = { id: uid(), sentAt: new Date().toISOString(), ...data };
    const prev = get().emails;
    set({ emails: [email, ...prev] });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await api.create("emails", email);
        return email;
      } catch (e) {
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
        if (attempt === 2) { set({ emails: prev }); useToastStore.getState().addToast("Failed to save email"); }
      }
    }
    return email;
  },

  updateEmail: async (id, data) => {
    const email = get().emails.find((e) => e.id === id);
    const prev = get().emails;
    const updated = { ...email, ...data, id };
    set({ emails: get().emails.map((e) => (e.id === id ? updated : e)) });
    try { await api.update("emails", id, updated); } catch { set({ emails: prev }); useToastStore.getState().addToast("Failed to save email"); }
  },

  deleteEmail: async (id) => {
    const prev = get().emails;
    set({ emails: get().emails.filter((e) => e.id !== id) });
    try { await api.remove("emails", id); } catch { set({ emails: prev }); useToastStore.getState().addToast("Failed to delete email"); }
  },
}));

export default useEmailStore;
