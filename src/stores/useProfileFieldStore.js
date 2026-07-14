import { create } from "zustand";
import db from "../services/offlineDb";
import { api } from "../services/api";
import { uid, DEFAULT_PROFILE_FIELDS } from "../lib/constants";

const useProfileFieldStore = create((set, get) => ({
  fields: [],
  loaded: false,

  load: async () => {
    if (!get().loaded) {
      const cached = await db.profileFields.toArray();
      set({ fields: cached, loaded: true });
    }
    try {
      const remote = await api.getAll("profilefields");
      await db.profileFields.clear();
      await db.profileFields.bulkPut(remote);
      set({ fields: remote });
    } catch {}
  },

  seedDefaults: async () => {
    const { fields, addField } = get();
    const existingKeys = new Set(fields.map((f) => f.fieldKey));

    if (!localStorage.getItem("linkedout_profile_seeded")) {
      if (fields.length > 0) {
        localStorage.setItem("linkedout_profile_seeded", "1");
      } else {
        for (const def of DEFAULT_PROFILE_FIELDS) {
          await addField({ ...def, value: "" });
        }
        localStorage.setItem("linkedout_profile_seeded", "1");
        return;
      }
    }

    for (const def of DEFAULT_PROFILE_FIELDS) {
      if (!existingKeys.has(def.fieldKey)) {
        await addField({ ...def, value: "" });
      }
    }
  },

  addField: async (data) => {
    const field = { ...data, id: data.id || uid(), createdAt: new Date().toISOString() };
    set({ fields: [...get().fields, field] });
    await db.profileFields.put(field);
    try { await api.create("profilefields", field); } catch {}
    return field;
  },

  updateField: async (id, data) => {
    const updated = { ...data, id };
    set({ fields: get().fields.map((f) => (f.id === id ? updated : f)) });
    await db.profileFields.put(updated);
    try { await api.update("profilefields", id, updated); } catch {}
  },

  deleteField: async (id) => {
    set({ fields: get().fields.filter((f) => f.id !== id) });
    await db.profileFields.delete(id);
    try { await api.remove("profilefields", id); } catch {}
  },
}));

export default useProfileFieldStore;
