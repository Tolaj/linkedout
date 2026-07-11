import { useState, useEffect } from "react";
import { Upload, FileText, Trash2, Edit3, ExternalLink, ChevronDown, ChevronRight, Plus } from "lucide-react";
import useAppStore from "../stores/useAppStore";
import useEmailStore from "../stores/useEmailStore";
import db from "../services/offlineDb";
import { uid, STAGE_COLOR, EMAIL_STATUSES } from "../lib/constants";
import { isFileSystemSupported, hasRootDirectory, saveFile, createCompanyFolder, listFiles } from "../services/fileSystem";
import FormModal from "../components/FormModal";
import { format, parseISO } from "date-fns";

function emailMatchesDomain(email, domain) {
  if (!domain || !email.recipientEmail) return false;
  const d = domain.toLowerCase();
  return email.recipientEmail.toLowerCase().endsWith("@" + d);
}

export default function Applications() {
  const { apps, loaded, load, deleteApp } = useAppStore();
  const { emails, load: loadEmails, updateEmail, deleteEmail } = useEmailStore();
  const [editingApp, setEditingApp] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { load(); loadEmails(); }, [load, loadEmails]);

  const activeApps = apps.filter((a) => a.status !== "Wishlist");

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold font-mono mb-1">applications</h1>
          <p className="text-sm text-base-300">Per-company docs, JD snapshots, cover letters & notes.</p>
        </div>
        <button
          onClick={() => { setEditingApp(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-accent text-accent-dark font-medium text-sm px-4 py-2.5 rounded-md hover:bg-accent-light transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Log application
        </button>
      </div>

      {activeApps.length === 0 ? (
        <div className="text-center py-16 text-base-400 text-sm">
          No applications yet. Add them from the Pipeline view.
        </div>
      ) : (
        <div className="overflow-x-auto border border-base-600 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-base-700 text-xs text-base-300 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 w-8"></th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Applied</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Resume</th>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Emails</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-600">
              {activeApps.map((app) => {
                const color = STAGE_COLOR[app.status] || {};
                const domainEmails = emails.filter((e) => emailMatchesDomain(e, app.domain));
                const isExpanded = expandedId === app.id;
                return (
                  <AppRow
                    key={app.id}
                    app={app}
                    color={color}
                    domainEmails={domainEmails}
                    isExpanded={isExpanded}
                    onToggle={() => toggleExpand(app.id)}
                    onEdit={() => setEditingApp(app)}
                    onDelete={() => deleteApp(app.id)}
                    updateEmail={updateEmail}
                    deleteEmail={deleteEmail}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(modalOpen || editingApp) && (
        <FormModal app={editingApp} onClose={() => { setModalOpen(false); setEditingApp(null); }} />
      )}
    </div>
  );
}

function AppRow({ app, color, domainEmails, isExpanded, onToggle, onEdit, onDelete, updateEmail, deleteEmail }) {
  const [noteText, setNoteText] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [noteLoaded, setNoteLoaded] = useState(false);

  useEffect(() => {
    if (isExpanded && !noteLoaded) {
      db.notes.where("section").equals("application").and((n) => n.appId === app.id).first().then((n) => {
        if (n) setNoteText(n.content || "");
        setNoteLoaded(true);
      });
      if (isFileSystemSupported() && hasRootDirectory()) {
        const folderName = `${sanitize(app.company)}_${sanitize(app.role)}`;
        listFiles(`02_Applications/${folderName}`).then(setFiles).catch(() => {});
      }
    }
  }, [isExpanded]);

  function sanitize(s) {
    return s.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
  }

  async function handleUploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (isFileSystemSupported() && hasRootDirectory()) {
      const folderName = `${sanitize(app.company)}_${sanitize(app.role)}`;
      await createCompanyFolder(app.company, app.role);
      await saveFile(`02_Applications/${folderName}/${file.name}`, file);
      const updated = await listFiles(`02_Applications/${folderName}`);
      setFiles(updated);
    }
  }

  async function handleSaveNote() {
    setSaving(true);
    const existing = await db.notes.where("section").equals("application").and((n) => n.appId === app.id).first();
    const doc = {
      id: existing?.id || uid(),
      appId: app.id,
      section: "application",
      title: `${app.company} - ${app.role}`,
      content: noteText,
      updatedAt: new Date().toISOString(),
    };
    await db.notes.put(doc);
    setSaving(false);
  }

  const colCount = 11;

  return (
    <>
      <tr className={`bg-base-900 hover:bg-base-700 transition-colors ${isExpanded ? "bg-base-700" : ""}`}>
        <td className="px-3 py-3">
          <button onClick={onToggle} className="text-base-400 hover:text-base-100 transition-colors">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-4 py-3 font-medium">{app.company}</td>
        <td className="px-4 py-3">{app.role}</td>
        <td className="px-4 py-3 text-base-300">{app.location || "—"}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded ${color.bg || ""} ${color.text || ""}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${color.dot || ""}`} />
            {app.status}
          </span>
        </td>
        <td className="px-4 py-3 text-base-300">{app.dateApplied || "—"}</td>
        <td className="px-4 py-3 text-base-300">{app.source || "—"}</td>
        <td className="px-4 py-3 text-base-300">
          {app.resumeVersion ? (
            <span className="bg-base-700 text-base-200 text-xs px-2 py-0.5 rounded font-mono">{app.resumeVersion}</span>
          ) : "—"}
        </td>
        <td className="px-4 py-3 text-base-300">
          {app.domain ? (
            <span className="text-xs font-mono">{app.domain}</span>
          ) : <span className="text-base-400 text-xs italic">not set</span>}
        </td>
        <td className="px-4 py-3 text-base-300">
          {domainEmails.length > 0 ? (
            <span className="bg-base-700 text-base-200 text-xs px-2 py-0.5 rounded">{domainEmails.length}</span>
          ) : "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            <button onClick={onEdit} className="text-base-400 hover:text-accent" title="Edit">
              <Edit3 className="w-4 h-4" />
            </button>
            {app.link && (
              <a href={app.link} target="_blank" rel="noopener noreferrer" className="text-base-400 hover:text-accent" title="Job posting">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button onClick={onDelete} className="text-base-400 hover:text-[#DC2626]" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-base-800">
          <td colSpan={colCount} className="px-6 py-5">
            <div className="space-y-5">
              {/* Domain-matched emails */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-base-300 mb-3">
                  Emails {app.domain ? `(@${app.domain})` : ""} ({domainEmails.length})
                </h3>
                {!app.domain ? (
                  <p className="text-xs text-base-400">Set a domain in the application to auto-track emails sent to that company.</p>
                ) : domainEmails.length === 0 ? (
                  <p className="text-xs text-base-400">No emails sent to @{app.domain} yet. Send one from the Cold Emails page.</p>
                ) : (
                  <div className="border border-base-600 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-base-700 text-base-300 uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2 font-medium">Recipient</th>
                          <th className="px-3 py-2 font-medium">Subject</th>
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-600">
                        {domainEmails.sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || "")).map((e) => (
                          <tr key={e.id} className="bg-base-900 hover:bg-base-700">
                            <td className="px-3 py-2">
                              <div className="font-medium">{e.recipientName || "—"}</div>
                              <div className="text-base-400">{e.recipientEmail}</div>
                            </td>
                            <td className="px-3 py-2">{e.subject}</td>
                            <td className="px-3 py-2 text-base-300">{e.sentAt ? format(parseISO(e.sentAt), "MMM d, yyyy") : "—"}</td>
                            <td className="px-3 py-2">
                              <select value={e.status} onChange={(ev) => updateEmail(e.id, { status: ev.target.value })} className="input text-xs py-0 px-1 w-auto">
                                {EMAIL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => deleteEmail(e.id)} className="text-base-400 hover:text-[#DC2626]">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Documents & Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-base-300">Documents</h3>
                    <label className="flex items-center gap-1 text-xs text-accent cursor-pointer hover:text-accent-light">
                      <Upload className="w-3 h-3" /> Upload
                      <input type="file" className="hidden" onChange={handleUploadFile} />
                    </label>
                  </div>
                  {files.length === 0 ? (
                    <p className="text-xs text-base-400">
                      {isFileSystemSupported() && hasRootDirectory()
                        ? "No files yet. Upload JD, resume, or cover letter."
                        : "Select a root folder in Settings to manage files."}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {files.filter((f) => f.kind === "file").map((f) => (
                        <div key={f.name} className="bg-base-700 border border-base-600 rounded px-3 py-2 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-base-300" />
                          <span className="text-xs flex-1 truncate">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-base-300">Notes</h3>
                    <button onClick={handleSaveNote} disabled={saving} className="text-xs text-accent hover:text-accent-light">
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={6}
                    className="input resize-none font-mono text-xs"
                    placeholder="# Contacts&#10;&#10;# Interview Questions&#10;&#10;# Notes"
                  />
                </div>
              </div>

              {/* Extra info */}
              {(app.contact || app.notes || app.referral === "Y") && (
                <div className="flex gap-6 text-xs text-base-300">
                  {app.contact && <span>Contact: <strong className="text-base-200">{app.contact}</strong></span>}
                  {app.referral === "Y" && <span className="text-[#16A34A] font-medium">Referral</span>}
                  {app.notes && <span className="truncate max-w-xs">{app.notes}</span>}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
