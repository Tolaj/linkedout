import { useState, useEffect, useRef } from "react";
import { X, Trash2 } from "lucide-react";
import { STAGES, SOURCES, EMPTY_APP } from "../lib/constants";
import useAppStore from "../stores/useAppStore";
import useResumeStore from "../stores/useResumeStore";

export default function FormModal({ app, onClose }) {
  const isEdit = !!app;
  const { addApp, updateApp, deleteApp } = useAppStore();
  const resumes = useResumeStore((s) => s.resumes);
  const [form, setForm] = useState(app ? { ...EMPTY_APP, ...app } : { ...EMPTY_APP, dateApplied: new Date().toISOString().slice(0, 10) });
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (modalRef.current) modalRef.current.focus();
  }, []);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;
    if (isEdit) {
      await updateApp(app.id, form);
    } else {
      await addApp(form);
    }
    onClose();
  }

  async function handleDelete() {
    if (!window.confirm("Delete this application?")) return;
    await deleteApp(app.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit application" : "New application"}
        tabIndex={-1}
        className="bg-base-900 border border-base-600 rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-600">
          <h2 className="text-sm font-semibold font-mono">
            {isEdit ? "edit_application" : "new_application"}
          </h2>
          <button onClick={onClose} className="text-base-400 hover:text-base-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <Field label="Company">
            <input required value={form.company} onChange={(e) => set("company", e.target.value)} className="input" />
          </Field>
          <Field label="Role">
            <input required value={form.role} onChange={(e) => set("role", e.target.value)} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location">
              <input value={form.location} onChange={(e) => set("location", e.target.value)} className="input" />
            </Field>
            <Field label="Date applied">
              <input type="date" value={form.dateApplied} onChange={(e) => set("dateApplied", e.target.value)} className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source">
              <select value={form.source} onChange={(e) => set("source", e.target.value)} className="input">
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Stage">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Resume version">
              <select value={form.resumeVersion} onChange={(e) => set("resumeVersion", e.target.value)} className="input">
                <option value="">None</option>
                {resumes
                  .sort((a, b) => a.archetype.localeCompare(b.archetype) || b.version - a.version)
                  .map((r) => (
                    <option key={r.id} value={`${r.archetype}_v${r.version}`}>
                      {r.archetype} v{r.version}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Referral">
              <select value={form.referral} onChange={(e) => set("referral", e.target.value)} className="input">
                <option value="N">No</option>
                <option value="Y">Yes</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={1} className="input resize-none" />
            </Field>
            <Field label="Next action date">
              <input type="date" value={form.nextActionDate} onChange={(e) => set("nextActionDate", e.target.value)} className="input" />
            </Field>
          </div>
          <Field label="Job link">
            <input value={form.link} onChange={(e) => set("link", e.target.value)} className="input" placeholder="https://" />
          </Field>
          <DomainField value={form.domain} onChange={(v) => set("domain", v)} />

          <div className="flex items-center justify-between pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs text-[#DC2626] hover:text-[#B91C1C]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="bg-accent text-accent-dark text-sm font-medium px-4 py-2 rounded-md hover:bg-accent-light transition-colors"
            >
              {isEdit ? "Save changes" : "Add application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] text-base-300 mb-1">{label}</div>
      {children}
    </label>
  );
}

function DomainField({ value, onChange }) {
  const [input, setInput] = useState("");
  const items = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];

  function addItem() {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v].join(", "));
    setInput("");
  }

  function removeItem(idx) {
    onChange(items.filter((_, i) => i !== idx).join(", "));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addItem();
    }
    if (e.key === "Backspace" && !input && items.length > 0) {
      removeItem(items.length - 1);
    }
  }

  return (
    <div>
      <div className="text-[11px] text-base-300 mb-1">Email / Domain</div>
      <div className="input flex flex-wrap items-center gap-1 min-h-[38px] h-auto py-1.5 cursor-text" onClick={(e) => e.currentTarget.querySelector("input")?.focus()}>
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-0.5 bg-base-700 text-xs px-1.5 py-0.5 rounded">
            <span className="font-mono text-[11px]">{item}</span>
            <button type="button" onClick={() => removeItem(i)} className="text-base-400 hover:text-[#DC2626]">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addItem}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm border-none p-0 focus:ring-0"
          placeholder={items.length === 0 ? "Add email or domain, press Enter" : ""}
        />
      </div>
    </div>
  );
}
