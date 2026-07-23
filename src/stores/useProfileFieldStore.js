import { create } from "zustand";
import { api } from "../services/api";
import { uid, DEFAULT_PROFILE_FIELDS } from "../lib/constants";
import useToastStore from "./useToastStore";

const useProfileFieldStore = create((set, get) => ({
  fields: [],
  loaded: false,
  _seeding: false,

  load: async () => {
    try {
      const remote = await api.getAll("profilefields");
      const all = Array.isArray(remote) ? remote : [];
      set({ fields: all, loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
      useToastStore.getState().addToast("Failed to load profile fields");
    }
  },

  seedDefaults: async () => {
    if (get()._seeding) return;
    set({ _seeding: true });
    try {
      const { fields } = get();
      const existingKeys = new Set(fields.map((f) => f.fieldKey));
      const missing = DEFAULT_PROFILE_FIELDS.filter((d) => !existingKeys.has(d.fieldKey));
      if (missing.length === 0) return;

      const newFields = missing.map((def) => ({
        ...def,
        id: uid(),
        value: "",
        createdAt: new Date().toISOString(),
      }));
      const prev = get().fields;
      set({ fields: [...prev, ...newFields] });
      try { await api.sync("profilefields", newFields); } catch { set({ fields: prev }); useToastStore.getState().addToast("Failed to save profile fields"); }
    } finally {
      set({ _seeding: false });
    }
  },

  addField: async (data) => {
    const field = { ...data, id: data.id || uid(), createdAt: new Date().toISOString() };
    const prev = get().fields;
    set({ fields: [...prev, field] });
    try { await api.create("profilefields", field); } catch { set({ fields: prev }); useToastStore.getState().addToast("Failed to save profile field"); }
    return field;
  },

  updateField: async (id, data) => {
    const existing = get().fields.find((f) => f.id === id);
    const prev = get().fields;
    const updated = { ...existing, ...data, id };
    set({ fields: get().fields.map((f) => (f.id === id ? updated : f)) });
    try { await api.update("profilefields", id, updated); } catch { set({ fields: prev }); useToastStore.getState().addToast("Failed to save profile field"); }
  },

  deleteField: async (id) => {
    const prev = get().fields;
    set({ fields: get().fields.filter((f) => f.id !== id) });
    try { await api.remove("profilefields", id); } catch { set({ fields: prev }); useToastStore.getState().addToast("Failed to delete profile field"); }
  },
}));

export default useProfileFieldStore;
