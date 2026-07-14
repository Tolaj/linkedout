import { create } from "zustand";
import { api } from "../services/api";
import { uid, DEFAULT_PROFILE_FIELDS } from "../lib/constants";

const useProfileFieldStore = create((set, get) => ({
  fields: [],
  loaded: false,

  load: async () => {
    try {
      const remote = await api.getAll("profilefields");
      const all = Array.isArray(remote) ? remote : [];
      set({ fields: all, loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
    }
  },

  seedDefaults: async () => {
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
    set({ fields: [...get().fields, ...newFields] });
    try { await api.sync("profilefields", newFields); } catch {}
  },

  addField: async (data) => {
    const field = { ...data, id: data.id || uid(), createdAt: new Date().toISOString() };
    set({ fields: [...get().fields, field] });
    try { await api.create("profilefields", field); } catch {}
    return field;
  },

  updateField: async (id, data) => {
    const updated = { ...data, id };
    set({ fields: get().fields.map((f) => (f.id === id ? updated : f)) });
    try { await api.update("profilefields", id, updated); } catch {}
  },

  deleteField: async (id) => {
    set({ fields: get().fields.filter((f) => f.id !== id) });
    try { await api.remove("profilefields", id); } catch {}
  },
}));

export default useProfileFieldStore;
