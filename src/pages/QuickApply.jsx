import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Upload, X, FileText } from "lucide-react";
import NoWorkspace from "../components/NoWorkspace";
import useProfileFieldStore from "../stores/useProfileFieldStore";
import useResumeStore from "../stores/useResumeStore";
import { PROFILE_CATEGORIES, RESUME_ARCHETYPES, uid } from "../lib/constants";
import useSettingsStore from "../stores/useSettingsStore";
import { isFileSystemSupported, hasRootDirectory, saveFile, readFile } from "../services/fileSystem";

const CATEGORY_LABELS = {
  personal: "Personal Info",
  work: "Work Details",
  education: "Education",
  links: "Links & Profiles",
  eeo: "EEO / Demographics",
  custom: "Custom Fields",
};

export default function QuickApply() {
  const { fields, loaded, load, seedDefaults, updateField, addField, deleteField } = useProfileFieldStore();
  const { resumes, load: loadResumes } = useResumeStore();
  const [collapsed, setCollapsed] = useState({});
  const [adding, setAdding] = useState(null);
  const folderName = useSettingsStore((s) => s.folderName);
  const hasWorkspace = !!folderName;

  useEffect(() => { if (hasWorkspace) { load(); loadResumes(); } }, [load, loadResumes, hasWorkspace, folderName]);
  useEffect(() => { if (hasWorkspace && loaded) seedDefaults(); }, [loaded, seedDefaults, hasWorkspace]);

  const byCategory = {};
  for (const cat of PROFILE_CATEGORIES) byCategory[cat] = [];
  for (const f of fields) {
    if (byCategory[f.category]) byCategory[f.category].push(f);
  }
  for (const cat of PROFILE_CATEGORIES) {
    byCategory[cat].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  const total = fields.length;
  const filled = fields.filter((f) => f.value && f.value.trim()).length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  function toggle(cat) {
    setCollapsed((p) => ({ ...p, [cat]: !p[cat] }));
  }

  function handleBlur(field, newValue) {
    if (newValue === field.value) return;
    updateField(field.id, { ...field, value: newValue });
  }

  function handleAddField(category, label, type) {
    if (!label.trim()) return;
    const sortOrder = (byCategory[category]?.length ?? 0);
    addField({
      category,
      fieldKey: "custom_" + uid(),
      label: label.trim(),
      type,
      value: "",
      options: type === "select" ? ["Yes", "No"] : undefined,
      sortOrder,
    });
    setAdding(null);
  }

  if (!hasWorkspace) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold font-mono mb-1">quick_apply</h1>
          <p className="text-sm text-base-300">Pre-store your answers. The extension auto-fills application forms.</p>
        </div>
        <NoWorkspace page="quickapply" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold font-mono mb-1">quick_apply</h1>
        <p className="text-sm text-base-300">Pre-store your answers. The extension auto-fills application forms.</p>
        <div className="flex items-center gap-2 mt-3">
          <div className="text-sm text-base-300">{filled} / {total} filled</div>
          <div className="w-24 h-2 bg-base-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-accent">{pct}%</span>
        </div>
      </div>

      <div className="space-y-4">
        {PROFILE_CATEGORIES.map((cat) => {
          const catFields = byCategory[cat];
          if (cat === "custom" && catFields.length === 0 && adding !== "custom") {
            return (
              <div key={cat} className="border border-base-600 rounded-lg">
                <button
                  onClick={() => setAdding("custom")}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-base-300 hover:text-base-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Field
                </button>
                {adding === "custom" && <AddFieldForm category="custom" onAdd={handleAddField} onCancel={() => setAdding(null)} />}
              </div>
            );
          }

          const catFilled = catFields.filter((f) => f.value && f.value.trim()).length;
          const isCollapsed = collapsed[cat];

          return (
            <div key={cat} className="border border-base-600 rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(cat)}
                className="w-full flex items-center justify-between px-4 py-3 bg-base-900 hover:bg-base-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-base-400" /> : <ChevronDown className="w-4 h-4 text-base-400" />}
                  <span className="text-sm font-medium">{CATEGORY_LABELS[cat]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-base-400">{catFilled} / {catFields.length} filled</span>
                  <div className="w-16 h-1.5 bg-base-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: catFields.length > 0 ? `${Math.round((catFilled / catFields.length) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              </button>

              {!isCollapsed && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {catFields.map((field) => (
                      <FieldCard
                        key={field.id}
                        field={field}
                        resumes={resumes}
                        onBlur={handleBlur}
                        onDelete={field.fieldKey.startsWith("custom_") ? () => deleteField(field.id) : null}
                      />
                    ))}
                  </div>
                  {cat === "custom" && (
                    <div className="mt-3">
                      {adding === cat ? (
                        <AddFieldForm category={cat} onAdd={handleAddField} onCancel={() => setAdding(null)} />
                      ) : (
                        <button
                          onClick={() => setAdding(cat)}
                          className="flex items-center gap-1.5 text-xs text-base-400 hover:text-accent transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add field
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldCard({ field, resumes, onBlur, onDelete }) {
  const [value, setValue] = useState(field.value || "");

  useEffect(() => { setValue(field.value || ""); }, [field.value]);

  const inputClass = "w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm text-base-100 focus:border-accent focus:outline-none transition-colors";

  if (field.type === "file") {
    return <ResumeFieldCard field={field} resumes={resumes || []} onBlur={onBlur} onDelete={onDelete} />;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-base-300 uppercase tracking-wider">{field.label}</label>
        {onDelete && (
          <button onClick={onDelete} className="text-base-500 hover:text-[#DC2626] transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {field.type === "select" ? (
        <select
          value={value}
          onChange={(e) => { setValue(e.target.value); onBlur(field, e.target.value); }}
          className={inputClass}
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => onBlur(field, value)}
          rows={2}
          className={inputClass + " resize-y"}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => onBlur(field, value)}
          className={inputClass}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
        />
      )}
    </div>
  );
}

function ResumeFieldCard({ field, resumes, onBlur, onDelete }) {
  const { addResume } = useResumeStore();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [error, setError] = useState("");
  const parsed = field.value ? (() => { try { return JSON.parse(field.value); } catch { return null; } })() : null;
  const selectedResumeId = parsed?.resumeId || "";

  function readFileAsDataURL(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  async function handleSelectResume(resumeId) {
    if (!resumeId) { onBlur(field, ""); return; }
    const resume = resumes.find((r) => r.id === resumeId);
    if (!resume) return;
    setError("");

    let fileData = null;
    if (resume.localPath && isFileSystemSupported() && hasRootDirectory()) {
      try {
        const file = await readFile(resume.localPath);
        fileData = await readFileAsDataURL(file);
      } catch {}
    }

    if (!fileData) {
      setError("Couldn't read local file — autofill won't attach this resume. Upload new to fix.");
    } else {
      setError("");
    }

    const payload = JSON.stringify({
      resumeId: resume.id,
      name: resume.fileName,
      type: "application/pdf",
      size: resume.size || 0,
      archetype: resume.archetype,
      ...(fileData ? { data: fileData } : {}),
    });
    onBlur(field, payload);
  }

  async function handleUploadNew(file, archetype, version) {
    const baseName = file.name.replace(/\.pdf$/i, "");
    const existing = resumes.filter((r) => r.fileName === file.name || r.fileName.startsWith(baseName));
    const destName = existing.length > 0 ? `${baseName}_v${existing.length + 1}.pdf` : file.name;

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
      try { await saveFile(`01_Resumes/${destName}`, file); } catch {}
    }
    await addResume(meta);

    const fileData = await readFileAsDataURL(file);
    const payload = JSON.stringify({
      resumeId: meta.id,
      name: destName,
      type: file.type,
      size: file.size,
      archetype,
      data: fileData,
    });
    onBlur(field, payload);
    setShowUploadForm(false);
    setError("");
  }

  function handleRemove() {
    onBlur(field, "");
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-base-300 uppercase tracking-wider">{field.label}</label>
        {onDelete && (
          <button onClick={onDelete} className="text-base-500 hover:text-[#DC2626] transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {parsed ? (
        <div className="flex items-center gap-2 bg-base-800 border border-base-600 rounded-md px-3 py-2">
          <FileText className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-sm text-base-100 truncate flex-1">{parsed.name}</span>
          {parsed.size > 0 && <span className="text-xs text-base-400">{(parsed.size / 1024).toFixed(0)} KB</span>}
          <button onClick={handleRemove} className="text-base-400 hover:text-[#DC2626] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : showUploadForm ? (
        <ResumeUploadForm onUpload={handleUploadNew} onCancel={() => setShowUploadForm(false)} />
      ) : resumes.length > 0 ? (
        <div className="space-y-2">
          <select
            value={selectedResumeId}
            onChange={(e) => handleSelectResume(e.target.value)}
            className="w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm text-base-100 focus:border-accent focus:outline-none transition-colors"
          >
            <option value="">Select a resume...</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fileName} ({r.archetype} v{r.version})
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-[#DC2626]">{error}</p>}
          <button
            onClick={() => { setShowUploadForm(true); setError(""); }}
            className="flex items-center justify-center gap-1.5 text-xs text-base-400 hover:text-accent transition-colors w-full"
          >
            <Upload className="w-3 h-3" />
            <span>or upload new</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowUploadForm(true)}
          className="w-full flex items-center gap-2 bg-base-800 border border-dashed border-base-500 rounded-md px-3 py-2.5 hover:border-accent transition-colors"
        >
          <Upload className="w-4 h-4 text-base-400" />
          <span className="text-sm text-base-400">Upload resume</span>
        </button>
      )}
    </div>
  );
}

function ResumeUploadForm({ onUpload, onCancel }) {
  const [file, setFile] = useState(null);
  const [archetype, setArchetype] = useState(RESUME_ARCHETYPES[0]);
  const [version, setVersion] = useState("1");

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    onUpload(file, archetype, parseInt(version));
  }

  const inputClass = "w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm text-base-100 focus:border-accent focus:outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="bg-base-900 border border-base-600 rounded-lg p-4 space-y-3">
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
          <select value={archetype} onChange={(e) => setArchetype(e.target.value)} className={inputClass}>
            {RESUME_ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-base-300 mb-1 block">Version</label>
          <input type="number" min="1" value={version} onChange={(e) => setVersion(e.target.value)} className={inputClass} />
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

function AddFieldForm({ category, onAdd, onCancel }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");

  function handleSubmit(e) {
    e.preventDefault();
    onAdd(category, label, type);
  }

  const inputClass = "w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm text-base-100 focus:border-accent focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4 pb-4">
      <div className="flex-1">
        <label className="text-[11px] text-base-300 mb-1 block">Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={inputClass}
          placeholder="e.g. Cover Letter Note"
          autoFocus
        />
      </div>
      <div className="w-28">
        <label className="text-[11px] text-base-300 mb-1 block">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          <option value="text">Text</option>
          <option value="textarea">Textarea</option>
          <option value="select">Yes/No</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={!label.trim()}
        className="bg-accent text-accent-dark text-sm font-medium px-3 py-2 rounded-md hover:bg-accent-light transition-colors disabled:opacity-50"
      >
        Add
      </button>
      <button type="button" onClick={onCancel} className="text-sm text-base-300 hover:text-base-100 px-2 py-2">
        Cancel
      </button>
    </form>
  );
}
