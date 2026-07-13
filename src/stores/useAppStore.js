import { create } from "zustand";
import db from "../services/offlineDb";
import { api } from "../services/api";
import { uid } from "../lib/constants";
import { isFileSystemSupported, hasRootDirectory, saveFile, readFile } from "../services/fileSystem";

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
  online: false,

  load: async () => {
    const workspace = getWorkspace();

    if (!get().loaded) {
      const cached = await db.applications.toArray();
      const filtered = workspace ? cached.filter((a) => !a.workspace || a.workspace === workspace) : cached;
      set({ apps: filtered, loaded: true });
    }

    try {
      const remote = await api.getAll("applications");
      if (Array.isArray(remote) && remote.length > 0) {
        await db.applications.clear();
        await db.applications.bulkPut(remote);
        const remoteFiltered = workspace ? remote.filter((a) => !a.workspace || a.workspace === workspace) : remote;
        set({ apps: remoteFiltered, online: true });
      } else {
        set({ online: true });
      }
    } catch {
      set({ online: false });
    }
  },

  addApp: async (data) => {
    const workspace = getWorkspace();
    const currentApps = get().apps;
    const appNumber = currentApps.length + 1;
    const app = { ...data, id: uid(), workspace, createdAt: new Date().toISOString() };
    set({ apps: [app, ...currentApps] });
    await db.applications.put(app);
    try { await api.create("applications", app); } catch {}
    createAppFolder(app, appNumber).catch(() => {});
    return app;
  },

  updateApp: async (id, data) => {
    const existing = get().apps.find((a) => a.id === id);
    if (!existing) return;
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    set({ apps: get().apps.map((a) => (a.id === id ? updated : a)) });
    await db.applications.put(updated);
    try { await api.update("applications", id, updated); } catch {}
  },

  deleteApp: async (id) => {
    set({ apps: get().apps.filter((a) => a.id !== id) });
    await db.applications.delete(id);
    try { await api.remove("applications", id); } catch {}
  },

  moveStage: async (id, newStatus) => {
    const app = get().apps.find((a) => a.id === id);
    if (!app) return;
    const updated = { ...app, status: newStatus, updatedAt: new Date().toISOString() };
    set({ apps: get().apps.map((a) => (a.id === id ? updated : a)) });
    await db.applications.put(updated);
    try { await api.update("applications", id, updated); } catch {}
  },
}));

export default useAppStore;
