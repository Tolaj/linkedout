import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";
import useToastStore from "./useToastStore";

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
      useToastStore.getState().addToast("Failed to load resumes");
    }
  },

  addResume: async (meta) => {
    const workspace = getWorkspace();
    const doc = { ...meta, id: meta.id || uid(), workspace, createdAt: new Date().toISOString() };
    const prev = get().resumes;
    set({ resumes: [doc, ...prev] });
    try { await api.create("resumes", doc); } catch { set({ resumes: prev }); useToastStore.getState().addToast("Failed to save resume"); }
    return doc;
  },

  deleteResume: async (id) => {
    const prev = get().resumes;
    set({ resumes: get().resumes.filter((r) => r.id !== id) });
    try { await api.remove("resumes", id); } catch { set({ resumes: prev }); useToastStore.getState().addToast("Failed to delete resume"); }
  },
}));

export default useResumeStore;
