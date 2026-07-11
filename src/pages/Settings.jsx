import { useState } from "react";
import { Mail, FolderOpen, Download, Upload, CheckCircle, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";

import useSettingsStore from "../stores/useSettingsStore";
import useAppStore from "../stores/useAppStore";
import useResumeStore from "../stores/useResumeStore";
import { isGmailConnected, connectGmail, disconnectGmail, initGmail, isGmailConfigured } from "../services/gmail";
import { isFileSystemSupported, selectRootDirectory, createFolderStructure } from "../services/fileSystem";
import db from "../services/offlineDb";

export default function Settings() {
  const settings = useSettingsStore();
  const [clientIdInput, setClientIdInput] = useState(settings.googleClientId);
  const [gmailConnected, setGmailConnected] = useState(isGmailConnected());
  const [folderStatus, setFolderStatus] = useState(settings.folderName ? `Linked: ${settings.folderName}` : "");
  const [message, setMessage] = useState("");
  const [showGmailGuide, setShowGmailGuide] = useState(false);

  function saveClientId() {
    settings.setGoogleClientId(clientIdInput);
    initGmail();
    setMessage("Google Client ID saved.");
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleConnectGmail() {
    try {
      await connectGmail();
      setGmailConnected(true);
      setMessage("Gmail connected!");
    } catch (e) {
      setMessage(`Error: ${e.message}`);
    }
    setTimeout(() => setMessage(""), 3000);
  }

  function handleDisconnectGmail() {
    disconnectGmail();
    setGmailConnected(false);
    setMessage("Gmail disconnected.");
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleSelectFolder() {
    try {
      const name = await selectRootDirectory();
      await createFolderStructure();
      settings.setFolderName(name);
      setFolderStatus(`Linked: ${name}`);
      setMessage("Folder structure created!");
      useAppStore.getState().load();
      useResumeStore.getState().load();
    } catch (e) {
      if (e.name !== "AbortError") setMessage(`Error: ${e.message}`);
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function exportData() {
    const data = {
      applications: await db.applications.toArray(),
      emails: await db.emails.toArray(),
      emailTemplates: await db.emailTemplates.toArray(),
      resumesMeta: await db.resumesMeta.toArray(),
      notes: await db.notes.toArray(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linkedout_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.applications) await db.applications.bulkPut(data.applications);
      if (data.emails) await db.emails.bulkPut(data.emails);
      if (data.emailTemplates) await db.emailTemplates.bulkPut(data.emailTemplates);
      if (data.resumesMeta) await db.resumesMeta.bulkPut(data.resumesMeta);
      if (data.notes) await db.notes.bulkPut(data.notes);
      setMessage("Data imported! Refresh to see changes.");
    } catch {
      setMessage("Failed to import. Check file format.");
    }
    setTimeout(() => setMessage(""), 5000);
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold font-mono mb-1">settings</h1>
        <p className="text-sm text-base-300">Configure storage, email, and file management.</p>
      </div>

      {message && (
        <div className="mb-4 text-xs bg-base-900 border border-base-600 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-accent" />
          {message}
        </div>
      )}

      {/* Gmail */}
      <Section icon={Mail} title="Gmail Integration">
        <div className="space-y-3">
          <button
            onClick={() => setShowGmailGuide(!showGmailGuide)}
            className="flex items-center gap-2 text-xs text-base-300 hover:text-base-100 transition-colors w-full"
          >
            <Info className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>How to set up Gmail API</span>
            {showGmailGuide ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>

          {showGmailGuide && (
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 text-xs text-base-200 space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-base-300">
                <li>Go to <strong>Google Cloud Console</strong> → create a new project (or use existing)</li>
                <li>Navigate to <strong>APIs & Services → Library</strong> → search & enable <strong>Gmail API</strong></li>
                <li>Go to <strong>APIs & Services → Credentials</strong> → click <strong>Create Credentials → OAuth Client ID</strong></li>
                <li>Choose <strong>Web application</strong>, add <code className="bg-base-700 px-1 py-0.5 rounded text-[11px]">https://linkedout.swapniljadhav.com</code> and <code className="bg-base-700 px-1 py-0.5 rounded text-[11px]">http://localhost:5173</code> to Authorized JavaScript origins</li>
                <li>Copy the <strong>Client ID</strong> (ends with <code className="bg-base-700 px-1 py-0.5 rounded text-[11px]">.apps.googleusercontent.com</code>)</li>
                <li>You may also need to configure the <strong>OAuth consent screen</strong> (set to External, add your email as a test user)</li>
              </ol>
            </div>
          )}

          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Google OAuth Client ID</label>
            <input
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              className="input"
              placeholder="xxxx.apps.googleusercontent.com"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={saveClientId} className="bg-accent text-accent-dark text-sm font-medium px-4 py-2 rounded-md hover:bg-accent-light transition-colors">
              Save Client ID
            </button>
            {isGmailConfigured() && !gmailConnected && (
              <button onClick={handleConnectGmail} className="bg-base-600 text-base-100 text-sm px-4 py-2 rounded-md hover:bg-base-500 transition-colors">
                Connect Gmail
              </button>
            )}
            {gmailConnected && (
              <button onClick={handleDisconnectGmail} className="text-sm text-[#DC2626] hover:text-[#B91C1C] px-3">
                Disconnect
              </button>
            )}
          </div>
          {gmailConnected && (
            <div className="flex items-center gap-1 text-xs text-[#16A34A]">
              <CheckCircle className="w-3 h-3" /> Connected
            </div>
          )}
        </div>
      </Section>

      {/* File System */}
      <Section icon={FolderOpen} title="Local Folder">
        <div className="space-y-3">
          {!isFileSystemSupported() ? (
            <div className="flex items-center gap-2 text-xs text-[#D97706]">
              <AlertCircle className="w-3.5 h-3.5" />
              File System Access API not supported in this browser. Use Chrome or Edge.
            </div>
          ) : (
            <>
              <p className="text-xs text-base-300">
                Select a root folder where LinkedOut will create the document structure
                (01_Resumes, 02_Applications, etc.)
              </p>
              <button onClick={handleSelectFolder} className="bg-accent text-accent-dark text-sm font-medium px-4 py-2 rounded-md hover:bg-accent-light transition-colors">
                {folderStatus ? "Change folder" : "Select folder"}
              </button>
              {folderStatus && <p className="text-xs text-base-200">{folderStatus}</p>}
            </>
          )}
        </div>
      </Section>

      {/* Import/Export */}
      <Section icon={Download} title="Backup & Restore">
        <div className="flex gap-3">
          <button onClick={exportData} className="flex items-center gap-2 bg-base-600 text-base-100 text-sm px-4 py-2 rounded-md hover:bg-base-500 transition-colors">
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <label className="flex items-center gap-2 bg-base-600 text-base-100 text-sm px-4 py-2 rounded-md hover:bg-base-500 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import JSON
            <input type="file" accept=".json" className="hidden" onChange={importData} />
          </label>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="bg-base-900 border border-base-600 rounded-lg p-4">
        {children}
      </div>
    </div>
  );
}
