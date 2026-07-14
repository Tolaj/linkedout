import { create } from "zustand";
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
    try {
      const remote = await api.getAll("resumes");
      const all = Array.isArray(remote) ? remote : [];
      const filtered = workspace ? all.filter((r) => !r.workspace || r.workspace === workspace) : all;
      set({ resumes: filtered, loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
    }
  },

  addResume: async (meta) => {
    const workspace = getWorkspace();
    const doc = { ...meta, id: meta.id || uid(), workspace, createdAt: new Date().toISOString() };
    set({ resumes: [doc, ...get().resumes] });
    try { await api.create("resumes", doc); } catch {}
    return doc;
  },

  deleteResume: async (id) => {
    set({ resumes: get().resumes.filter((r) => r.id !== id) });
    try { await api.remove("resumes", id); } catch {}
  },
}));

export default useResumeStore;
