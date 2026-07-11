import { FOLDER_STRUCTURE } from "../lib/constants";

let rootHandle = null;

const DB_NAME = "linkedout_fs";
const STORE_NAME = "handles";

function openHandleDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function persistHandle(handle) {
  const idb = await openHandleDB();
  const tx = idb.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(handle, "root");
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandle() {
  const idb = await openHandleDB();
  const tx = idb.transaction(STORE_NAME, "readonly");
  const req = tx.objectStore(STORE_NAME).get("root");
  return new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export function isFileSystemSupported() {
  return "showDirectoryPicker" in window;
}

export function hasRootDirectory() {
  return !!rootHandle;
}

export async function restoreRootDirectory() {
  if (!isFileSystemSupported()) return false;
  const handle = await loadHandle();
  if (!handle) return false;
  const perm = await handle.queryPermission({ mode: "readwrite" });
  if (perm === "granted") {
    rootHandle = handle;
    return true;
  }
  return false;
}

export async function requestPermission() {
  const handle = await loadHandle();
  if (!handle) return false;
  const perm = await handle.requestPermission({ mode: "readwrite" });
  if (perm === "granted") {
    rootHandle = handle;
    return true;
  }
  return false;
}

export async function selectRootDirectory() {
  if (!isFileSystemSupported()) {
    throw new Error("File System Access API not supported in this browser");
  }
  rootHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  await persistHandle(rootHandle);
  return rootHandle.name;
}

export async function createFolderStructure() {
  if (!rootHandle) throw new Error("No root directory selected");

  for (const path of FOLDER_STRUCTURE) {
    const parts = path.split("/");
    let current = rootHandle;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }
  }

  const prepDir = await rootHandle.getDirectoryHandle("03_Interview_Prep");
  const defaultFiles = [
    { name: "DSA_notes.md", content: "# DSA Notes\n\n" },
    { name: "System_Design_notes.md", content: "# System Design Notes\n\n" },
    { name: "Behavioral_STAR_stories.md", content: "# Behavioral STAR Stories\n\n" },
  ];
  for (const { name, content } of defaultFiles) {
    try {
      await prepDir.getFileHandle(name, { create: false });
    } catch {
      const fh = await prepDir.getFileHandle(name, { create: true });
      const w = await fh.createWritable();
      await w.write(content);
      await w.close();
    }
  }

}

export async function saveFile(subPath, file) {
  if (!rootHandle) throw new Error("No root directory selected");
  const parts = subPath.split("/");
  const fileName = parts.pop();
  let dir = rootHandle;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  const fh = await dir.getFileHandle(fileName, { create: true });
  const writable = await fh.createWritable();
  await writable.write(file);
  await writable.close();
}

export async function readFile(subPath) {
  if (!rootHandle) throw new Error("No root directory selected");
  const parts = subPath.split("/");
  const fileName = parts.pop();
  let dir = rootHandle;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part);
  }
  const fh = await dir.getFileHandle(fileName);
  return fh.getFile();
}

export async function listFiles(subPath) {
  if (!rootHandle) throw new Error("No root directory selected");
  const parts = subPath.split("/").filter(Boolean);
  let dir = rootHandle;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part);
  }
  const entries = [];
  for await (const [name, handle] of dir) {
    entries.push({ name, kind: handle.kind });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCompanyFolder(company, role) {
  if (!rootHandle) return;
  const sanitize = (s) => s.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
  const folderName = `${sanitize(company)}_${sanitize(role)}`;
  const appsDir = await rootHandle.getDirectoryHandle("02_Applications", { create: true });
  const compDir = await appsDir.getDirectoryHandle(folderName, { create: true });

  try {
    await compDir.getFileHandle("notes.md", { create: false });
  } catch {
    const fh = await compDir.getFileHandle("notes.md", { create: true });
    const w = await fh.createWritable();
    await w.write(`# ${company} — ${role}\n\n## Contacts\n\n## Interview Questions\n\n## Notes\n\n`);
    await w.close();
  }
}

export async function deleteFile(subPath) {
  if (!rootHandle) throw new Error("No root directory selected");
  const parts = subPath.split("/");
  const fileName = parts.pop();
  let dir = rootHandle;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part);
  }
  await dir.removeEntry(fileName);
}
