import { useState, useEffect, useRef } from "react";
import { Upload, FileText, Trash2, Edit3, ExternalLink, ChevronDown, ChevronRight, Plus, Send, ArrowUpRight, ArrowDownLeft, Users, RefreshCw, Eye, X } from "lucide-react";
import NoWorkspace from "../components/NoWorkspace";
import useAppStore from "../stores/useAppStore";
import useEmailStore from "../stores/useEmailStore";
import useContactStore from "../stores/useContactStore";
import useNoteStore from "../stores/useNoteStore";
import { uid, STAGE_COLOR, EMAIL_STATUSES } from "../lib/constants";
import { isFileSystemSupported, hasRootDirectory, saveFile, createCompanyFolder, listFiles } from "../services/fileSystem";
import { isGmailConnected, sendEmail, connectGmail, getEmailBody } from "../services/gmail";
import { syncInboundEmails, clearSkippedCache } from "../services/emailSync";
import FormModal from "../components/FormModal";
import { format, parseISO } from "date-fns";
import useSettingsStore from "../stores/useSettingsStore";

function emailMatchesTargets(email, domain) {
  if (!domain || !email.recipientEmail) return false;
  const recipient = email.recipientEmail.toLowerCase();
  const targets = domain.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  return targets.some((t) =>
    t.includes("@") ? recipient === t : recipient.endsWith("@" + t)
  );
}

function AppEmailReadModal({ email, onClose, updateEmail }) {
  const [body, setBody] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) { setLoading(false); return; }
    if (email.body) {
      setBody({ html: email.body });
      setLoading(false);
      return;
    }
    if (!email.gmailId) { setLoading(false); return; }
    setLoading(true);
    getEmailBody(email.gmailId).then((data) => {
      setBody(data);
      if (data && updateEmail) {
        const content = data.html || data.text || "";
        updateEmail(email.id, { body: content });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [email?.id]);

  if (!email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-base-800 border border-base-600 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col mx-4" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-base-600">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{email.subject || "(no subject)"}</h3>
            <div className="text-xs text-base-400 mt-1">
              <span>From: {email.recipientEmail}</span>
              {email.sentAt && <span className="ml-3">{format(parseISO(email.sentAt), "MMM d, yyyy 'at' h:mm a")}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-base-400 hover:text-base-100 ml-3 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-center text-base-400 py-8">Loading email...</div>
          ) : body?.html ? (
            <iframe
              srcDoc={body.html}
              className="w-full border-0 rounded bg-white"
              style={{ minHeight: "400px" }}
              sandbox="allow-same-origin"
              onLoad={(ev) => {
                const doc = ev.target.contentDocument;
                if (doc) ev.target.style.height = doc.documentElement.scrollHeight + "px";
              }}
            />
          ) : body?.text ? (
            <pre className="whitespace-pre-wrap text-sm text-base-200 font-sans">{body.text}</pre>
          ) : (
            <div className="text-center text-base-400 py-8">
              {isGmailConnected() ? "Could not load email body." : "Connect Gmail to read emails."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Applications() {
  const { apps, loaded, load, deleteApp } = useAppStore();
  const { emails, load: loadEmails, updateEmail, deleteEmail } = useEmailStore();
  const loadContacts = useContactStore((s) => s.load);
  const loadNotes = useNoteStore((s) => s.load);
  const [editingApp, setEditingApp] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [readingEmail, setReadingEmail] = useState(null);
  const hasWorkspace = isFileSystemSupported() && hasRootDirectory();
  const folderName = useSettingsStore((s) => s.folderName);

  useEffect(() => {
    if (hasWorkspace) { load(); loadEmails(); loadContacts(); loadNotes(); }
  }, [load, loadEmails, loadContacts, loadNotes, hasWorkspace, folderName]);

  useEffect(() => {
    if (loaded && isGmailConnected()) {
      syncInboundEmails().then((r) => {
        const parts = [];
        if (r.added) parts.push(`${r.added} email${r.added > 1 ? "s" : ""}`);
        if (r.created) parts.push(`${r.created} app${r.created > 1 ? "s" : ""} created`);
        if (r.linked) parts.push(`${r.linked} linked`);
        if (r.updated) parts.push(`${r.updated} stage${r.updated > 1 ? "s" : ""} updated`);
        if (parts.length) setSyncMsg(parts.join(", "));
      });
    }
  }, [loaded]);

  const activeApps = apps.filter((a) => a.status !== "Wishlist");

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleSync() {
    if (!isGmailConnected()) {
      try { await connectGmail(); } catch { return; }
    }
    if (!localStorage.getItem("linkedout_skipped_v2")) {
      await clearSkippedCache();
      localStorage.setItem("linkedout_skipped_v2", "1");
    }
    setSyncing(true);
    setSyncMsg("");
    const r = await syncInboundEmails((msg) => setSyncMsg(msg));
    const parts = [];
    if (r.added) parts.push(`${r.added} email${r.added > 1 ? "s" : ""}`);
    if (r.created) parts.push(`${r.created} app${r.created > 1 ? "s" : ""} created`);
    if (r.linked) parts.push(`${r.linked} linked`);
    if (r.updated) parts.push(`${r.updated} stage${r.updated > 1 ? "s" : ""} updated`);
    setSyncMsg(parts.length ? parts.join(", ") : "No new emails");
    setSyncing(false);
    setTimeout(() => setSyncMsg(""), 5000);
  }

  if (hasWorkspace && !loaded) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-base-400" />
      </div>
    );
  }

  if (!hasWorkspace) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold font-mono mb-1">applications</h1>
          <p className="text-sm text-base-300">Per-company docs, JD snapshots, cover letters & notes.</p>
        </div>
        <NoWorkspace page="applications" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {readingEmail && (
        <AppEmailReadModal email={readingEmail} onClose={() => setReadingEmail(null)} updateEmail={updateEmail} />
      )}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold font-mono mb-1">applications</h1>
          <p className="text-sm text-base-300">Per-company docs, JD snapshots, cover letters & notes.</p>
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && (
            <span className="text-xs text-green-400">{syncMsg}</span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-base-600 text-base-100 text-sm px-4 py-2.5 rounded-md hover:bg-base-500 transition-colors disabled:opacity-50"
            title="Sync incoming emails from Gmail"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={() => { setEditingApp(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-accent text-accent-dark font-medium text-sm px-4 py-2.5 rounded-md hover:bg-accent-light transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Log application
          </button>
        </div>
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
                <th className="px-4 py-3 font-medium">Email / Domain</th>
                <th className="px-4 py-3 font-medium">Emails</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-600">
              {activeApps.map((app) => {
                const color = STAGE_COLOR[app.status] || {};
                const domainEmails = emails.filter((e) => {
                  if (e.appId === app.id && e.direction !== "inbound") return true;
                  if (e.direction === "inbound" && emailMatchesTargets(e, app.domain)) {
                    if (app.dateApplied && e.sentAt && e.sentAt.slice(0, 10) < app.dateApplied.slice(0, 10)) return false;
                    return true;
                  }
                  return false;
                });
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
                    addEmail={useEmailStore.getState().addEmail}
                    onReadEmail={setReadingEmail}
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

function AppRow({ app, color, domainEmails, isExpanded, onToggle, onEdit, onDelete, updateEmail, deleteEmail, addEmail, onReadEmail }) {
  const appNote = useNoteStore((s) => s.getAppNote(app.id));
  const addNote = useNoteStore((s) => s.addNote);
  const updateNoteStore = useNoteStore((s) => s.updateNote);
  const [noteText, setNoteText] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [noteLoaded, setNoteLoaded] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);

  useEffect(() => {
    if (isExpanded && !noteLoaded) {
      if (appNote) setNoteText(appNote.content || "");
      setNoteLoaded(true);
      if (isFileSystemSupported() && hasRootDirectory()) {
        listFiles("02_Applications").then((entries) => {
          const companySlug = sanitize(app.company);
          const match = entries.find((e) => e.kind === "directory" && e.name.includes(companySlug));
          if (match) listFiles(`02_Applications/${match.name}`).then(setFiles).catch(() => {});
        }).catch(() => {});
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
      const entries = await listFiles("02_Applications");
      const companySlug = sanitize(app.company);
      const match = entries.find((en) => en.kind === "directory" && en.name.includes(companySlug));
      const folderName = match ? match.name : `${companySlug}_${sanitize(app.role)}`;
      if (!match) await createCompanyFolder(app.company, app.role);
      await saveFile(`02_Applications/${folderName}/${file.name}`, file);
      const updated = await listFiles(`02_Applications/${folderName}`);
      setFiles(updated);
    }
  }

  async function handleSaveNote() {
    setSaving(true);
    if (appNote) {
      await updateNoteStore(appNote.id, { content: noteText });
    } else {
      await addNote({
        appId: app.id,
        section: "application",
        title: `${app.company} - ${app.role}`,
        content: noteText,
      });
    }
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
            <span className="text-xs font-mono truncate max-w-[120px] inline-block">{app.domain}</span>
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-base-300">
                    Emails {app.domain ? `(${app.domain})` : ""} ({domainEmails.length})
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setShowRecipients(!showRecipients); setShowCompose(false); }}
                      className={`flex items-center gap-1 text-xs ${showRecipients ? "text-accent-light" : "text-accent"} hover:text-accent-light`}
                    >
                      <Users className="w-3 h-3" /> Recipients
                    </button>
                    <button
                      onClick={() => { setShowCompose(!showCompose); setShowRecipients(false); }}
                      className={`flex items-center gap-1 text-xs ${showCompose ? "text-accent-light" : "text-accent"} hover:text-accent-light`}
                    >
                      <Send className="w-3 h-3" /> Compose
                    </button>
                  </div>
                </div>

                {showRecipients && <RecipientsPanel app={app} />}

                {showCompose && (
                  <InlineCompose
                    app={app}
                    onSend={async (data) => {
                      await addEmail(data);
                      setShowCompose(false);
                    }}
                    onCancel={() => setShowCompose(false)}
                  />
                )}

                {!app.domain ? (
                  <p className="text-xs text-base-400">Add emails or domains in the application form to auto-track related emails.</p>
                ) : domainEmails.length === 0 ? (
                  <p className="text-xs text-base-400">No matching emails found yet.</p>
                ) : (
                  <div className="border border-base-600 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-base-700 text-base-300 uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2 w-8"></th>
                          <th className="px-3 py-2 font-medium">Recipient</th>
                          <th className="px-3 py-2 font-medium">Subject</th>
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-600">
                        {domainEmails.sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || "")).map((e) => (
                          <tr key={e.id} className="bg-base-900 hover:bg-base-700 cursor-pointer" onClick={() => e.gmailId && onReadEmail(e)}>
                            <td className="px-3 py-2">
                              {e.direction === "inbound" ? (
                                <ArrowDownLeft className="w-3.5 h-3.5 text-[#2563EB]" title="Incoming" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5 text-[#16A34A]" title="Outgoing" />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{e.recipientName || "—"}</div>
                              <div className="text-base-400">{e.recipientEmail}</div>
                            </td>
                            <td className="px-3 py-2">{e.subject}</td>
                            <td className="px-3 py-2 text-base-300 whitespace-nowrap">
                              {e.sentAt ? (
                                <>
                                  <div>{format(parseISO(e.sentAt), "MMM d, yyyy")}</div>
                                  <div className="text-[11px] text-base-400">{format(parseISO(e.sentAt), "h:mm a")}</div>
                                </>
                              ) : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {e.direction === "inbound" ? (
                                <span className="text-xs text-[#2563EB]">received</span>
                              ) : (
                                <select value={e.status} onChange={(ev) => { ev.stopPropagation(); updateEmail(e.id, { status: ev.target.value }); }} onClick={(ev) => ev.stopPropagation()} className="input text-xs py-0 px-1 w-auto">
                                  {EMAIL_STATUSES.filter((s) => s !== "received").map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {e.gmailId && (
                                  <button onClick={(ev) => { ev.stopPropagation(); onReadEmail(e); }} className="text-base-400 hover:text-[#2563EB]" title="Read email">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button onClick={(ev) => { ev.stopPropagation(); deleteEmail(e.id); }} className="text-base-400 hover:text-[#DC2626]">
                                  <Trash2 className="w-3.5 h-3.5" />
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
                        : "No workspace connected — files are only available on the device where they were uploaded."}
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

              {/* Captured Form Fields */}
              {app.formFields && app.formFields.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-base-300 mb-2">
                    Application Form Data ({app.formFields.length} fields)
                  </h3>
                  <div className="border border-base-600 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-base-600">
                      {app.formFields.map((f, i) => (
                        <div key={i} className="bg-base-900 px-3 py-2">
                          <div className="text-[10px] text-base-400 uppercase tracking-wider">{f.label}</div>
                          <div className="text-xs text-base-100 mt-0.5 break-words">{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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

function RecipientsPanel({ app }) {
  const contacts = useContactStore((s) => s.contacts);
  const addContact = useContactStore((s) => s.addContact);
  const updateContact = useContactStore((s) => s.updateContact);
  const deleteContact = useContactStore((s) => s.deleteContact);
  const [form, setForm] = useState({ name: "", email: "", position: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", position: "" });

  const appContacts = contacts.filter((c) => c.appId === app.id);

  async function handleAdd() {
    if (!form.email.trim()) return;
    await addContact({ ...form, appId: app.id });
    setForm({ name: "", email: "", position: "" });
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditForm({ name: c.name || "", email: c.email, position: c.position || "" });
  }

  async function saveEdit() {
    if (!editForm.email.trim()) return;
    const c = contacts.find((ct) => ct.id === editingId);
    await updateContact(editingId, { ...c, ...editForm });
    setEditingId(null);
  }

  return (
    <div className="bg-base-900 border border-base-600 rounded-lg p-4 mb-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-base-300 mb-3">Recipients</h4>
      <div className="flex gap-2 mb-3">
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input text-xs flex-1" placeholder="Email *" />
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input text-xs flex-1" placeholder="Name" />
        <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="input text-xs flex-1" placeholder="Position" />
        <button onClick={handleAdd} disabled={!form.email.trim()} className="bg-accent text-accent-dark text-xs px-3 py-1.5 rounded hover:bg-accent-light disabled:opacity-50">Add</button>
      </div>
      {appContacts.length === 0 ? (
        <p className="text-xs text-base-400">No recipients for this application yet.</p>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {appContacts.map((c) => (
            <div key={c.id}>
              {editingId === c.id ? (
                <div className="flex gap-1.5 bg-base-800 rounded px-3 py-1.5">
                  <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input text-xs flex-1" placeholder="Email" />
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input text-xs flex-1" placeholder="Name" />
                  <input value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} className="input text-xs flex-1" placeholder="Position" />
                  <button onClick={saveEdit} className="text-xs text-accent hover:text-accent-light px-2">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-base-400 hover:text-base-200 px-1">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-base-800 rounded px-3 py-1.5 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{c.name || "—"}</span>
                    <span className="text-base-400 font-mono text-[11px]">{c.email}</span>
                    {c.position && <span className="text-base-400">{c.position}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEdit(c)} className="text-base-400 hover:text-accent">
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteContact(c.id)} className="text-base-400 hover:text-[#DC2626]">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineCompose({ app, onSend, onCancel }) {
  const templates = useEmailStore.getState().templates;
  const contacts = useContactStore((s) => s.contacts);
  const addContact = useContactStore((s) => s.addContact);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [form, setForm] = useState({
    recipientEmail: "", recipientName: "",
    subject: "", body: "", followUpDate: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const appContacts = contacts.filter((c) => c.appId === app.id);

  const filtered = form.recipientEmail
    ? appContacts.filter((c) =>
        c.email.toLowerCase().includes(form.recipientEmail.toLowerCase()) ||
        (c.name || "").toLowerCase().includes(form.recipientEmail.toLowerCase())
      )
    : appContacts;

  function selectContact(c) {
    setForm((f) => ({ ...f, recipientEmail: c.email, recipientName: c.name || "" }));
    setShowSuggestions(false);
  }

  async function ensureContact() {
    const email = form.recipientEmail.trim();
    if (!email || !email.includes("@")) return;
    const exists = appContacts.some((c) => c.email.toLowerCase() === email.toLowerCase());
    if (!exists) {
      await addContact({ email, name: form.recipientName, appId: app.id });
    }
  }

  function applyTemplate(id) {
    setSelectedTemplate(id);
    const t = templates.find((tpl) => tpl.id === id);
    if (t) setForm((f) => ({ ...f, subject: t.subject, body: t.body }));
  }

  function interpolate(text) {
    return text
      .replace(/\{\{company\}\}/g, app.company || "")
      .replace(/\{\{role\}\}/g, app.role || "")
      .replace(/\{\{contact_name\}\}/g, form.recipientName)
      .replace(/\{\{name\}\}/g, form.recipientName);
  }

  async function handleSend() {
    if (!form.recipientEmail || !form.subject) return;
    setError("");
    setSending(true);
    try {
      if (!isGmailConnected()) await connectGmail();
      const finalSubject = interpolate(form.subject);
      const finalBody = interpolate(form.body);
      await sendEmail({ to: form.recipientEmail, subject: finalSubject, body: finalBody });
      await ensureContact();
      await onSend({
        ...form,
        subject: finalSubject,
        body: finalBody,
        company: app.company,
        role: app.role,
        status: "sent",
        direction: "outbound",
        appId: app.id,
      });
    } catch (e) {
      setError(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-base-900 border border-base-600 rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <ArrowUpRight className="w-3.5 h-3.5 text-[#16A34A]" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-base-300">Compose Email</h4>
      </div>
      <div className="space-y-2">
        <div>
          <label className="text-[11px] text-base-300 mb-0.5 block">Template</label>
          <select value={selectedTemplate} onChange={(e) => applyTemplate(e.target.value)} className="input text-xs max-w-xs">
            <option value="">None (blank)</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative" ref={wrapperRef}>
            <label className="text-[11px] text-base-300 mb-0.5 block">Recipient email</label>
            <input
              value={form.recipientEmail}
              onChange={(e) => { setForm({ ...form, recipientEmail: e.target.value }); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="input text-xs"
              placeholder="name@company.com"
              autoComplete="off"
            />
            {showSuggestions && filtered.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-0.5 bg-base-800 border border-base-600 rounded-lg max-h-36 overflow-y-auto shadow-lg">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectContact(c)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-base-700 flex items-center justify-between"
                  >
                    <span className="font-medium">{c.name || c.email}</span>
                    <span className="text-base-400 font-mono text-[11px]">{c.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] text-base-300 mb-0.5 block">Recipient name</label>
            <input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} className="input text-xs" placeholder="John Doe" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-base-300 mb-0.5 block">Subject</label>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input text-xs" />
        </div>
        <div>
          <label className="text-[11px] text-base-300 mb-0.5 block">Body</label>
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} className="input text-xs resize-none" placeholder="Use {{company}}, {{role}}, {{contact_name}} as variables..." />
        </div>
        <div className="max-w-[200px]">
          <label className="text-[11px] text-base-300 mb-0.5 block">Follow-up date</label>
          <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} className="input text-xs" />
        </div>
      </div>
      {error && <div className="mt-2 text-xs text-[#DC2626]">{error}</div>}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSend}
          disabled={sending || !form.recipientEmail}
          className="flex items-center gap-1.5 bg-accent text-accent-dark font-medium text-xs px-3 py-1.5 rounded-md hover:bg-accent-light transition-colors disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
          {sending ? "Sending..." : "Send via Gmail"}
        </button>
        <button onClick={onCancel} className="text-xs text-base-400 hover:text-base-200 px-3 py-1.5">
          Cancel
        </button>
      </div>
    </div>
  );
}
