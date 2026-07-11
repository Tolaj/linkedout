import { useState, useEffect } from "react";
import { Upload, Eye, Trash2 } from "lucide-react";
import useResumeStore from "../stores/useResumeStore";
import { RESUME_ARCHETYPES, uid } from "../lib/constants";
import { isFileSystemSupported, hasRootDirectory, saveFile, listFiles, readFile, deleteFile } from "../services/fileSystem";

export default function Resumes() {
  const { resumes, loaded, load, addResume, deleteResume } = useResumeStore();
  const [folderFiles, setFolderFiles] = useState([]);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isFileSystemSupported() && hasRootDirectory()) {
      listFiles("01_Resumes").then(setFolderFiles).catch(() => {});
    }
  }, [resumes]);

  async function handleUpload(file, archetype, version) {
    const destName = `Resume_${archetype}_v${version}.pdf`;
    const meta = {
      id: uid(),
      archetype,
      version,
      fileName: destName,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      localPath: `01_Resumes/${destName}`,
    };
    if (isFileSystemSupported() && hasRootDirectory()) {
      await saveFile(`01_Resumes/${destName}`, file);
    }
    await addResume(meta);
    setShowUpload(false);
  }

  async function handleDelete(resume) {
    await deleteResume(resume.id);
    if (resume.localPath && isFileSystemSupported() && hasRootDirectory()) {
      try { await deleteFile(resume.localPath); } catch {}
    }
  }

  async function handleView(name) {
    try {
      const file = await readFile(`01_Resumes/${name}`);
      const url = URL.createObjectURL(file);
      window.open(url, "_blank");
    } catch {}
  }

  function formatSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  const allResumes = [...resumes].sort((a, b) => a.archetype.localeCompare(b.archetype) || b.version - a.version);

  const trackedFileNames = new Set(resumes.map((r) => r.fileName));
  const untrackedFiles = folderFiles.filter((f) => f.kind === "file" && !trackedFileNames.has(f.name));

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold font-mono mb-1">resumes</h1>
          <p className="text-sm text-base-300">Version per role-archetype, not per company.</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-accent text-accent-dark font-medium text-sm px-4 py-2.5 rounded-md hover:bg-accent-light transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload resume
        </button>
      </div>

      {showUpload && <UploadForm onUpload={handleUpload} onCancel={() => setShowUpload(false)} />}

      {allResumes.length === 0 && untrackedFiles.length === 0 && !showUpload ? (
        <div className="text-center py-16 text-base-400 text-sm">
          No resumes uploaded yet. Upload your first resume PDF.
        </div>
      ) : (
        <div className="overflow-x-auto border border-base-600 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-base-700 text-xs text-base-300 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">File Name</th>
                <th className="px-4 py-3 font-medium">Archetype</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-600">
              {allResumes.map((r) => (
                <tr key={r.id} className="bg-base-900 hover:bg-base-700 transition-colors">
                  <td className="px-4 py-3 font-medium">{r.fileName}</td>
                  <td className="px-4 py-3">
                    <span className="bg-base-700 text-base-200 text-xs px-2 py-0.5 rounded font-mono">{r.archetype}</span>
                  </td>
                  <td className="px-4 py-3">v{r.version}</td>
                  <td className="px-4 py-3 text-base-300">{formatSize(r.size)}</td>
                  <td className="px-4 py-3 text-base-300">{r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {r.localPath && (
                        <button onClick={() => handleView(r.fileName)} className="text-base-400 hover:text-accent" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(r)} className="text-base-400 hover:text-[#DC2626]" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {untrackedFiles.map((f) => (
                <tr key={f.name} className="bg-base-900 hover:bg-base-700 transition-colors">
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-base-400 italic">untracked</span>
                  </td>
                  <td className="px-4 py-3 text-base-400">—</td>
                  <td className="px-4 py-3 text-base-400">—</td>
                  <td className="px-4 py-3 text-base-400">—</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleView(f.name)} className="text-base-400 hover:text-accent" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UploadForm({ onUpload, onCancel }) {
  const [file, setFile] = useState(null);
  const [archetype, setArchetype] = useState(RESUME_ARCHETYPES[0]);
  const [version, setVersion] = useState("1");

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    onUpload(file, archetype, parseInt(version));
  }

  return (
    <form onSubmit={handleSubmit} className="bg-base-900 border border-base-600 rounded-lg p-4 mb-6 space-y-3 max-w-md">
      <div>
        <label className="text-[11px] text-base-300 mb-1 block">PDF file</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
          className="text-sm text-base-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-base-600 file:text-base-200 file:text-xs hover:file:bg-base-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-base-300 mb-1 block">Archetype</label>
          <select value={archetype} onChange={(e) => setArchetype(e.target.value)} className="input">
            {RESUME_ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-base-300 mb-1 block">Version</label>
          <input type="number" min="1" value={version} onChange={(e) => setVersion(e.target.value)} className="input" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={!file} className="bg-accent text-accent-dark text-sm font-medium px-4 py-2 rounded-md hover:bg-accent-light transition-colors disabled:opacity-50">
          Upload
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-base-300 hover:text-base-100 px-3">
          Cancel
        </button>
      </div>
    </form>
  );
}
