import { create } from "zustand";
import { api } from "../services/api";
import { uid } from "../lib/constants";
import { isFileSystemSupported, hasRootDirectory, saveFile, readFile, listFiles, deleteDirectory } from "../services/fileSystem";
import useEmailStore from "./useEmailStore";
import useToastStore from "./useToastStore";

function getWorkspace() {
  return localStorage.getItem("linkedout_folder") || "";
}

function sanitize(s) {
  return (s || "").replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
}

async function createAppFolder(app, appNumber) {
  if (!isFileSystemSupported() || !hasRootDirectory()) return;
  const date = app.dateApplied || new Date().toISOString().slice(0, 10);
  const folderName = `${String(appNumber).padStart(3, "0")}_${sanitize(app.company)}_${date}`;
  const basePath = `02_Applications/${folderName}`;

  const appMd = `# ${app.company} — ${app.role}

| Field | Value |
|-------|-------|
| Company | ${app.company} |
| Role | ${app.role} |
| Location | ${app.location || "—"} |
| Date Applied | ${date} |
| Source | ${app.source || "—"} |
| Status | ${app.status} |
| Resume | ${app.resumeVersion || "—"} |
| Referral | ${app.referral} |
| Domain | ${app.domain || "—"} |
| Link | ${app.link || "—"} |

## Notes
${app.notes || ""}
`;

  await saveFile(`${basePath}/application.md`, new Blob([appMd], { type: "text/markdown" }));
  await saveFile(`${basePath}/notes.md`, new Blob(["# Notes\n\n"], { type: "text/markdown" }));

  if (app.resumeVersion) {
    try {
      const resumeFile = await readFile(`01_Resumes/Resume_${app.resumeVersion}.pdf`);
      await saveFile(`${basePath}/Resume_${app.resumeVersion}.pdf`, resumeFile);
    } catch {}
  }
}

const useAppStore = create((set, get) => ({
  apps: [],
  loaded: false,

  load: async () => {
    const workspace = getWorkspace();
    try {
      const remote = await api.getAll("applications");
      const all = Array.isArray(remote) ? remote : [];
      const filtered = workspace ? all.filter((a) => !a.workspace || a.workspace === workspace) : all;
      set({ apps: filtered, loaded: true });
    } catch {
      if (!get().loaded) set({ loaded: true });
      useToastStore.getState().addToast("Failed to load applications");
    }
  },

  addApp: async (data) => {
    const workspace = getWorkspace();
    const currentApps = get().apps;
    const appNumber = currentApps.length + 1;
    const app = { ...data, id: uid(), workspace, createdAt: new Date().toISOString() };
    const prev = get().apps;
    set({ apps: [app, ...currentApps] });
    try { await api.create("applications", app); } catch (e) { set({ apps: prev }); useToastStore.getState().addToast("Failed to save application"); }
    createAppFolder(app, appNumber).catch(() => {});
    return app;
  },

  updateApp: async (id, data) => {
    const existing = get().apps.find((a) => a.id === id);
    if (!existing) return;
    const prev = get().apps;
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    set({ apps: get().apps.map((a) => (a.id === id ? updated : a)) });
    try { await api.update("applications", id, updated); } catch (e) { set({ apps: prev }); useToastStore.getState().addToast("Failed to save application"); }
  },

  deleteApp: async (id) => {
    const app = get().apps.find((a) => a.id === id);
    const prev = get().apps;
    set({ apps: get().apps.filter((a) => a.id !== id) });
    try { await api.remove("applications", id); } catch (e) { set({ apps: prev }); useToastStore.getState().addToast("Failed to delete application"); return; }
    const emailStore = useEmailStore.getState();
    const linked = emailStore.emails.filter((e) => e.appId === id);
    for (const e of linked) {
      await emailStore.deleteEmail(e.id);
    }
    if (app && isFileSystemSupported() && hasRootDirectory()) {
      try {
        const entries = await listFiles("02_Applications");
        const companySlug = sanitize(app.company);
        const match = entries.find((e) => e.kind === "directory" && e.name.includes(companySlug));
        if (match) await deleteDirectory(`02_Applications/${match.name}`);
      } catch {}
    }
  },

  moveStage: async (id, newStatus) => {
    const app = get().apps.find((a) => a.id === id);
    if (!app) return;
    const prev = get().apps;
    const updated = { ...app, status: newStatus, updatedAt: new Date().toISOString() };
    set({ apps: get().apps.map((a) => (a.id === id ? updated : a)) });
    try { await api.update("applications", id, updated); } catch (e) { set({ apps: prev }); useToastStore.getState().addToast("Failed to save application"); }
  },
}));

export default useAppStore;
