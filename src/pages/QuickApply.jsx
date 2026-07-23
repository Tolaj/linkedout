import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Upload, X } from "lucide-react";
import NoWorkspace from "../components/NoWorkspace";
import useProfileFieldStore from "../stores/useProfileFieldStore";
import { PROFILE_CATEGORIES, uid } from "../lib/constants";
import useSettingsStore from "../stores/useSettingsStore";

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
  const [collapsed, setCollapsed] = useState({});
  const [adding, setAdding] = useState(null);
  const folderName = useSettingsStore((s) => s.folderName);
  const hasWorkspace = !!folderName;

  useEffect(() => { if (hasWorkspace) load(); }, [load, hasWorkspace, folderName]);
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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold font-mono mb-1">quick apply</h1>
          <p className="text-sm text-base-300">Pre-store your answers. The extension auto-fills application forms.</p>
        </div>
        <NoWorkspace page="quickapply" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold font-mono mb-1">quick apply</h1>
          <p className="text-sm text-base-300">Pre-store your answers. The extension auto-fills application forms.</p>
        </div>
        <div className="flex items-center gap-2">
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

function FieldCard({ field, onBlur, onDelete }) {
  const [value, setValue] = useState(field.value || "");

  useEffect(() => { setValue(field.value || ""); }, [field.value]);

  const inputClass = "w-full bg-base-800 border border-base-600 rounded-md px-3 py-2 text-sm text-base-100 focus:border-accent focus:outline-none transition-colors";

  if (field.type === "file") {
    return <FileFieldCard field={field} onBlur={onBlur} onDelete={onDelete} />;
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

function FileFieldCard({ field, onBlur, onDelete }) {
  const fileRef = useRef(null);
  const parsed = field.value ? (() => { try { return JSON.parse(field.value); } catch { return null; } })() : null;

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const payload = JSON.stringify({ name: file.name, type: file.type, size: file.size, data: reader.result });
      onBlur(field, payload);
    };
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    onBlur(field, "");
    if (fileRef.current) fileRef.current.value = "";
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
          <span className="text-sm text-base-100 truncate flex-1">{parsed.name}</span>
          <span className="text-xs text-base-400">{(parsed.size / 1024).toFixed(0)} KB</span>
          <button onClick={handleRemove} className="text-base-400 hover:text-[#DC2626] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 bg-base-800 border border-dashed border-base-500 rounded-md px-3 py-2.5 cursor-pointer hover:border-accent transition-colors">
          <Upload className="w-4 h-4 text-base-400" />
          <span className="text-sm text-base-400">Upload {field.label.toLowerCase()}</span>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFile}
            className="hidden"
          />
        </label>
      )}
    </div>
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
