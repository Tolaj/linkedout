import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Send, FileText, Clock, Mail, Trash2, Edit3, Eye, MailCheck, RefreshCw, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import useEmailStore from "../stores/useEmailStore";
import useAppStore from "../stores/useAppStore";
import useContactStore from "../stores/useContactStore";
import { isGmailConnected, sendEmail, connectGmail } from "../services/gmail";
import { syncInboundEmails } from "../services/emailSync";
import { EMAIL_STATUSES, uid } from "../lib/constants";
import { format, isPast, parseISO } from "date-fns";

const TABS = ["tracker", "templates", "compose"];

export default function ColdEmails() {
  const { emails, templates, loaded, load, addEmail, updateEmail, deleteEmail, addTemplate, updateTemplate, deleteTemplate } = useEmailStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const prelinkedAppId = searchParams.get("app") || "";
  const [tab, setTab] = useState(prelinkedAppId ? "compose" : "tracker");
  const [showComposer, setShowComposer] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const loadContacts = useContactStore((s) => s.load);
  useEffect(() => { load(); loadContacts(); }, [load, loadContacts]);
  useEffect(() => {
    if (prelinkedAppId) setSearchParams({}, { replace: true });
  }, []);

  async function handleSync() {
    if (!isGmailConnected()) {
      try { await connectGmail(); } catch { return; }
    }
    setSyncing(true);
    setSyncMsg("");
    const r = await syncInboundEmails((msg) => setSyncMsg(msg));
    const parts = [];
    if (r.added) parts.push(`${r.added} email${r.added > 1 ? "s" : ""}`);
    if (r.created) parts.push(`${r.created} app${r.created > 1 ? "s" : ""} created`);
    if (r.updated) parts.push(`${r.updated} stage${r.updated > 1 ? "s" : ""} updated`);
    setSyncMsg(parts.length ? parts.join(", ") : "No new emails");
    setSyncing(false);
    setTimeout(() => setSyncMsg(""), 5000);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold font-mono mb-1">emails</h1>
          <p className="text-sm text-base-300">Templates, tracking, and Gmail-powered sends.</p>
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && <span className="text-xs text-green-400">{syncMsg}</span>}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-base-600 text-base-100 text-sm px-4 py-2.5 rounded-md hover:bg-base-500 transition-colors disabled:opacity-50"
            title="Sync incoming emails from Gmail"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </button>
          {tab === "tracker" && (
            <button
              onClick={() => { setTab("compose"); setShowComposer(true); }}
              className="flex items-center gap-2 bg-accent text-accent-dark font-medium text-sm px-4 py-2.5 rounded-md hover:bg-accent-light transition-colors"
            >
              <Send className="w-4 h-4" />
              Compose
            </button>
          )}
          {tab === "templates" && (
            <button
              onClick={() => { setEditTemplate(null); setShowTemplateForm(true); }}
              className="flex items-center gap-2 bg-accent text-accent-dark font-medium text-sm px-4 py-2.5 rounded-md hover:bg-accent-light transition-colors"
            >
              <Plus className="w-4 h-4" />
              New template
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-base-900 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-md capitalize transition-colors ${
              tab === t ? "bg-base-700 text-base-100" : "text-base-300 hover:text-base-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "tracker" && <EmailTracker emails={emails.filter((e) => e.direction !== "inbound")} updateEmail={updateEmail} deleteEmail={deleteEmail} apps={useAppStore.getState().apps} />}
      {tab === "templates" && (
        <TemplateList
          templates={templates}
          onEdit={(t) => { setEditTemplate(t); setShowTemplateForm(true); }}
          onDelete={deleteTemplate}
        />
      )}
      {tab === "compose" && (
        <Composer
          templates={templates}
          onSend={async (data) => {
            await addEmail(data);
            setTab("tracker");
          }}
          apps={useAppStore.getState().apps}
          prelinkedAppId={prelinkedAppId}
        />
      )}

      {showTemplateForm && (
        <TemplateFormModal
          template={editTemplate}
          onSave={async (data) => {
            if (editTemplate) await updateTemplate(editTemplate.id, data);
            else await addTemplate(data);
            setShowTemplateForm(false);
          }}
          onClose={() => setShowTemplateForm(false)}
        />
      )}
    </div>
  );
}

function EmailTracker({ emails, updateEmail, deleteEmail, apps = [] }) {
  if (emails.length === 0) {
    return (
      <div className="text-center py-16 text-base-400 text-sm">
        No emails tracked yet. Compose and send your first cold email.
      </div>
    );
  }

  function getAppLabel(appId) {
    if (!appId) return null;
    const a = apps.find((app) => app.id === appId);
    return a ? `${a.company} — ${a.role}` : null;
  }

  return (
    <div className="overflow-x-auto border border-base-600 rounded-lg">
      <table className="w-full text-sm text-left">
        <thead className="bg-base-700 text-xs text-base-300 uppercase tracking-wider">
          <tr>
            <th className="px-3 py-3 w-8"></th>
            <th className="px-4 py-3 font-medium">Recipient</th>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Linked App</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Follow-up</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-600">
          {emails.map((e) => {
            const needsFollowUp = e.followUpDate && isPast(parseISO(e.followUpDate)) && e.status !== "replied";
            const appLabel = getAppLabel(e.appId);
            return (
              <tr key={e.id} className={`bg-base-900 hover:bg-base-700 transition-colors ${needsFollowUp ? "border-l-2 border-l-[#D97706]" : ""}`}>
                <td className="px-3 py-3">
                  {e.direction === "inbound" ? (
                    <ArrowDownLeft className="w-3.5 h-3.5 text-[#2563EB]" title="Incoming" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#16A34A]" title="Outgoing" />
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{e.recipientName || "—"}</div>
                  <div className="text-[11px] text-base-400">{e.recipientEmail}</div>
                </td>
                <td className="px-4 py-3 text-base-300">{e.company || "—"}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{e.subject}</td>
                <td className="px-4 py-3">
                  {appLabel ? (
                    <span className="bg-base-700 text-base-200 text-xs px-2 py-0.5 rounded">{appLabel}</span>
                  ) : <span className="text-base-400">—</span>}
                </td>
                <td className="px-4 py-3 text-base-300">{e.sentAt ? format(parseISO(e.sentAt), "MMM d") : "—"}</td>
                <td className="px-4 py-3">
                  {e.followUpDate ? (
                    <span className={`text-xs ${needsFollowUp ? "text-[#D97706] font-medium" : "text-base-300"}`}>
                      {format(parseISO(e.followUpDate), "MMM d")}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  {e.direction === "inbound" ? (
                    <span className="text-xs text-[#2563EB]">received</span>
                  ) : (
                    <select
                      value={e.status}
                      onChange={(ev) => updateEmail(e.id, { status: ev.target.value })}
                      className="input text-xs py-0.5 px-2 w-auto"
                    >
                      {EMAIL_STATUSES.filter((s) => s !== "received").map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    <button onClick={() => deleteEmail(e.id)} className="text-base-400 hover:text-[#DC2626]" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TemplateList({ templates, onEdit, onDelete }) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-16 text-base-400 text-sm">
        No templates yet. Create one to speed up your outreach.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {templates.map((t) => (
        <div key={t.id} className="bg-base-700 border border-base-600 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-sm">{t.name}</h3>
            <div className="flex gap-2">
              <button onClick={() => onEdit(t)} className="text-base-400 hover:text-accent">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(t.id)} className="text-base-400 hover:text-[#DC2626]">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-base-300 mb-2">Subject: {t.subject}</div>
          <div className="text-xs text-base-400 line-clamp-3">{t.body}</div>
        </div>
      ))}
    </div>
  );
}

function Composer({ templates, onSend, apps = [], prelinkedAppId = "" }) {
  const preApp = prelinkedAppId ? apps.find((a) => a.id === prelinkedAppId) : null;
  const contacts = useContactStore((s) => s.contacts);
  const addContact = useContactStore((s) => s.addContact);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [linkedAppId, setLinkedAppId] = useState(prelinkedAppId);
  const [form, setForm] = useState({
    recipientEmail: "", recipientName: "",
    company: preApp?.company || "", role: preApp?.role || "",
    subject: "", body: "", followUpDate: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const filtered = form.recipientEmail
    ? contacts.filter((c) =>
        c.email.toLowerCase().includes(form.recipientEmail.toLowerCase()) ||
        (c.name || "").toLowerCase().includes(form.recipientEmail.toLowerCase())
      )
    : contacts;

  function selectContact(c) {
    setForm((f) => ({ ...f, recipientEmail: c.email, recipientName: c.name || "" }));
    setShowSuggestions(false);
  }

  async function ensureContact() {
    const email = form.recipientEmail.trim();
    if (!email || !email.includes("@")) return;
    const exists = contacts.some((c) => c.email.toLowerCase() === email.toLowerCase());
    if (!exists) {
      await addContact({ email, name: form.recipientName });
    }
  }

  function linkApp(appId) {
    setLinkedAppId(appId);
    if (appId) {
      const a = apps.find((app) => app.id === appId);
      if (a) setForm((f) => ({ ...f, company: a.company, role: a.role }));
    }
  }

  function applyTemplate(id) {
    setSelectedTemplate(id);
    const t = templates.find((tpl) => tpl.id === id);
    if (t) {
      setForm((f) => ({
        ...f,
        subject: t.subject,
        body: t.body,
      }));
    }
  }

  function interpolate(text) {
    return text
      .replace(/\{\{company\}\}/g, form.company)
      .replace(/\{\{role\}\}/g, form.role)
      .replace(/\{\{contact_name\}\}/g, form.recipientName)
      .replace(/\{\{name\}\}/g, form.recipientName);
  }

  async function handleSend() {
    if (!form.recipientEmail || !form.subject) return;
    setError("");
    setSending(true);
    try {
      if (!isGmailConnected()) {
        await connectGmail();
      }
      const finalSubject = interpolate(form.subject);
      const finalBody = interpolate(form.body);
      await sendEmail({ to: form.recipientEmail, subject: finalSubject, body: finalBody });
      await ensureContact();
      await onSend({
        ...form,
        subject: finalSubject,
        body: finalBody,
        status: "sent",
        direction: "outbound",
        ...(linkedAppId && { appId: linkedAppId }),
      });
    } catch (e) {
      setError(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function handleSaveAsDraft() {
    await onSend({
      ...form,
      subject: interpolate(form.subject),
      body: interpolate(form.body),
      status: "draft",
      direction: "outbound",
      ...(linkedAppId && { appId: linkedAppId }),
    });
  }

  return (
    <div className="max-w-2xl">
      {templates.length > 0 && (
        <div className="mb-4">
          <label className="text-[11px] text-base-300 mb-1 block">Use template</label>
          <select value={selectedTemplate} onChange={(e) => applyTemplate(e.target.value)} className="input w-full max-w-xs">
            <option value="">None (blank)</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {apps.length > 0 && (
        <div className="mb-4">
          <label className="text-[11px] text-base-300 mb-1 block">Link to application</label>
          <select value={linkedAppId} onChange={(e) => linkApp(e.target.value)} className="input w-full max-w-xs">
            <option value="">None</option>
            {apps.filter((a) => a.status !== "Wishlist").map((a) => (
              <option key={a.id} value={a.id}>{a.company} — {a.role}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative" ref={wrapperRef}>
            <label className="text-[11px] text-base-300 mb-1 block">Recipient email</label>
            <input
              value={form.recipientEmail}
              onChange={(e) => { setForm({ ...form, recipientEmail: e.target.value }); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="input"
              placeholder="name@company.com"
              autoComplete="off"
            />
            {showSuggestions && filtered.length > 0 && (
              <div className="absolute z-10 left-0 right-0 top-full mt-0.5 bg-base-800 border border-base-600 rounded-lg max-h-40 overflow-y-auto shadow-lg">
                {filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectContact(c)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-base-700 flex items-center justify-between"
                  >
                    <span className="font-medium">{c.name || c.email}</span>
                    <span className="text-base-400 font-mono text-[11px]">{c.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Recipient name</label>
            <input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} className="input" placeholder="John Doe" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Company</label>
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input" />
          </div>
          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Role</label>
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-base-300 mb-1 block">Subject</label>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input" />
        </div>
        <div>
          <label className="text-[11px] text-base-300 mb-1 block">Body</label>
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={8} className="input resize-none" placeholder="Use {{company}}, {{role}}, {{contact_name}} as variables..." />
        </div>
        <div className="max-w-xs">
          <label className="text-[11px] text-base-300 mb-1 block">Follow-up date</label>
          <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} className="input" />
        </div>
      </div>

      {error && <div className="mt-3 text-xs text-[#DC2626]">{error}</div>}

      <div className="flex gap-3 mt-5">
        <button
          onClick={handleSend}
          disabled={sending || !form.recipientEmail}
          className="flex items-center gap-2 bg-accent text-accent-dark font-medium text-sm px-4 py-2.5 rounded-md hover:bg-accent-light transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {sending ? "Sending..." : "Send via Gmail"}
        </button>
        <button
          onClick={handleSaveAsDraft}
          className="flex items-center gap-2 bg-base-700 border border-base-600 text-base-200 text-sm px-4 py-2.5 rounded-md hover:bg-base-600 transition-colors"
        >
          Save as draft
        </button>
      </div>
    </div>
  );
}

function TemplateFormModal({ template, onSave, onClose }) {
  const [form, setForm] = useState(
    template || { name: "", subject: "", body: "" }
  );

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  }

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-base-900 border border-base-600 rounded-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-600">
          <h2 className="text-sm font-semibold font-mono">{template ? "edit_template" : "new_template"}</h2>
          <button onClick={onClose} className="text-base-400 hover:text-base-100">
            <span className="sr-only">Close</span>✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Template name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Initial outreach" required />
          </div>
          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Subject line</label>
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input" placeholder="Re: {{role}} at {{company}}" />
          </div>
          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Body</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={8} className="input resize-none" placeholder="Hi {{contact_name}},..." />
          </div>
          <p className="text-[10px] text-base-400">Variables: {"{{company}}, {{role}}, {{contact_name}}"}</p>
          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-accent text-accent-dark text-sm font-medium px-4 py-2 rounded-md hover:bg-accent-light transition-colors">
              {template ? "Update" : "Create"} template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
