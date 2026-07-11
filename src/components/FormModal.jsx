import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { STAGES, SOURCES, EMPTY_APP } from "../lib/constants";
import useAppStore from "../stores/useAppStore";
import useResumeStore from "../stores/useResumeStore";

export default function FormModal({ app, onClose }) {
  const isEdit = !!app;
  const { addApp, updateApp, deleteApp } = useAppStore();
  const resumes = useResumeStore((s) => s.resumes);
  const [form, setForm] = useState(app ? { ...EMPTY_APP, ...app } : { ...EMPTY_APP });

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
    await deleteApp(app.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-base-900 border border-base-600 rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-600">
          <h2 className="text-sm font-semibold font-mono">
            {isEdit ? "edit_application" : "new_application"}
          </h2>
          <button onClick={onClose} className="text-base-400 hover:text-base-100">
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
            <Field label="Email domain">
              <input value={form.domain} onChange={(e) => set("domain", e.target.value)} className="input" placeholder="company.com" />
            </Field>
            <Field label="Next action date">
              <input type="date" value={form.nextActionDate} onChange={(e) => set("nextActionDate", e.target.value)} className="input" />
            </Field>
          </div>
          <Field label="Job link">
            <input value={form.link} onChange={(e) => set("link", e.target.value)} className="input" placeholder="https://" />
          </Field>
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="input resize-none" />
          </Field>

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
