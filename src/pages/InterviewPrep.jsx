import { useState, useEffect } from "react";
import { BookOpen, Plus, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NoWorkspace from "../components/NoWorkspace";
import useNoteStore from "../stores/useNoteStore";
import { uid } from "../lib/constants";
import { isFileSystemSupported, hasRootDirectory } from "../services/fileSystem";
import useSettingsStore from "../stores/useSettingsStore";

const SECTIONS = ["DSA", "System Design", "Behavioral (STAR)", "Company Specific"];

export default function InterviewPrep() {
  const { notes: allNotes, loaded, load, addNote, updateNote, deleteNote } = useNoteStore();
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSection, setNewSection] = useState(SECTIONS[0]);

  const hasWorkspace = isFileSystemSupported() && hasRootDirectory();
  const navigate = useNavigate();
  const folderName = useSettingsStore((s) => s.folderName);

  useEffect(() => {
    if (hasWorkspace) load();
  }, [hasWorkspace, folderName, load]);

  const notes = allNotes.filter((n) => n.section !== "application");

  function selectNote(note) {
    setSelected(note);
    setContent(note.content || "");
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    const updated = await updateNote(selected.id, { content });
    if (updated) setSelected(updated);
    setSaving(false);
  }

  async function createNote(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const note = await addNote({
      section: newSection,
      title: newTitle,
      content: "",
    });
    setShowNew(false);
    setNewTitle("");
    selectNote(note);
  }

  async function handleDelete(id) {
    await deleteNote(id);
    if (selected?.id === id) {
      setSelected(null);
      setContent("");
    }
  }

  const grouped = SECTIONS.reduce((acc, s) => {
    acc[s] = notes.filter((n) => n.section === s);
    return acc;
  }, {});

  if (!hasWorkspace) {
    return (
      <div className="p-6 h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-xl font-semibold font-mono mb-1">interview_prep</h1>
          <p className="text-sm text-base-300">DSA, System Design, Behavioral & company-specific notes.</p>
        </div>
        <NoWorkspace page="prep" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold font-mono mb-1">interview_prep</h1>
          <p className="text-sm text-base-300">DSA, System Design, Behavioral & company-specific notes.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-accent text-accent-dark font-medium text-sm px-4 py-2.5 rounded-md hover:bg-accent-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          New note
        </button>
      </div>

      {showNew && (
        <form onSubmit={createNote} className="bg-base-900 border border-base-600 rounded-lg p-4 mb-4 flex gap-3 items-end max-w-lg">
          <div className="flex-1">
            <label className="text-[11px] text-base-300 mb-1 block">Title</label>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input" placeholder="Note title" autoFocus />
          </div>
          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Section</label>
            <select value={newSection} onChange={(e) => setNewSection(e.target.value)} className="input">
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="submit" className="bg-accent text-accent-dark text-sm px-3 py-[7px] rounded-md">Create</button>
        </form>
      )}

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="w-64 flex-shrink-0 overflow-y-auto space-y-4">
          {SECTIONS.map((section) => {
            const items = grouped[section];
            if (!items || items.length === 0) return null;
            return (
              <div key={section}>
                <h3 className="text-[11px] text-base-400 uppercase tracking-wide mb-2">{section}</h3>
                <div className="space-y-1">
                  {items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => selectNote(n)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        selected?.id === n.id ? "bg-base-600 text-accent" : "text-base-200 hover:bg-base-700"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{n.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {notes.length === 0 && (
            <p className="text-xs text-base-400 text-center py-8">No notes yet.</p>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium font-mono truncate">{selected.title}</h2>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-xs text-accent hover:text-accent-light">
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => handleDelete(selected.id)} className="text-xs text-base-400 hover:text-[#DC2626]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input flex-1 resize-none font-mono text-xs leading-relaxed"
                placeholder="Write your notes here..."
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-base-400 text-sm">
              Select a note or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
