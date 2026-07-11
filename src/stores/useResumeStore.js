import { create } from "zustand";
import db from "../services/offlineDb";
import { api } from "../services/api";
import { uid } from "../lib/constants";

function getWorkspace() {
  return localStorage.getItem("linkedout_folder") || "";
}

const useResumeStore = create((set, get) => ({
  resumes: [],
  loaded: false,

  load: async () => {
    const workspace = getWorkspace();

    if (!get().loaded) {
      const cached = await db.resumesMeta.toArray();
      const filtered = workspace ? cached.filter((r) => !r.workspace || r.workspace === workspace) : cached;
      set({ resumes: filtered, loaded: true });
    }

    try {
      const remote = await api.getAll("resumes");
      await db.resumesMeta.clear();
      await db.resumesMeta.bulkPut(remote);
      const remoteFiltered = workspace ? remote.filter((r) => !r.workspace || r.workspace === workspace) : remote;
      set({ resumes: remoteFiltered });
    } catch {}
  },

  addResume: async (meta) => {
    const workspace = getWorkspace();
    const doc = { ...meta, id: meta.id || uid(), workspace, createdAt: new Date().toISOString() };
    set({ resumes: [doc, ...get().resumes] });
    await db.resumesMeta.put(doc);
    try { await api.create("resumes", doc); } catch {}
    return doc;
  },

  deleteResume: async (id) => {
    set({ resumes: get().resumes.filter((r) => r.id !== id) });
    await db.resumesMeta.delete(id);
    try { await api.remove("resumes", id); } catch {}
  },
}));

export default useResumeStore;
