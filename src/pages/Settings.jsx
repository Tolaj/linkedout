import { useState, useEffect } from "react";
import { Mail, FolderOpen, Download, Upload, CheckCircle, AlertCircle, Info, ChevronDown, ChevronUp, Trash2, Plus, Brain, Power, BarChart3 } from "lucide-react";

import useSettingsStore from "../stores/useSettingsStore";
import useAppStore from "../stores/useAppStore";
import useResumeStore from "../stores/useResumeStore";
import { isGmailConnected, connectGmail, disconnectGmail, initGmail, isGmailConfigured, getGmailUsage } from "../services/gmail";
import { isFileSystemSupported, selectRootDirectory, createFolderStructure, switchToFolder, removeFolderHandle } from "../services/fileSystem";
import { getLlmUsage } from "../services/llm";
import { api } from "../services/api";

export default function Settings() {
  const settings = useSettingsStore();
  const [clientIdInput, setClientIdInput] = useState(settings.googleClientId);
  const [clientSecretInput, setClientSecretInput] = useState(settings.googleClientSecret);
  const [gmailConnected, setGmailConnected] = useState(isGmailConnected());
  const [message, setMessage] = useState("");
  const [showGmailGuide, setShowGmailGuide] = useState(false);
  const [llmKeyInput, setLlmKeyInput] = useState(settings.llmApiKey);
  const [showLlmGuide, setShowLlmGuide] = useState(false);
  const [gmailUsage, setGmailUsage] = useState(getGmailUsage());
  const [llmUsage, setLlmUsage] = useState(getLlmUsage());

  useEffect(() => {
    const interval = setInterval(() => {
      setGmailUsage(getGmailUsage());
      setLlmUsage(getLlmUsage());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  function saveGoogleCredentials() {
    settings.setGoogleClientId(clientIdInput);
    settings.setGoogleClientSecret(clientSecretInput);
    initGmail();
    setMessage("Google credentials saved.");
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

  async function handleDisconnectGmail() {
    await disconnectGmail();
    setGmailConnected(false);
    setMessage("Gmail disconnected.");
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleSelectFolder() {
    try {
      const name = await selectRootDirectory();
      await createFolderStructure();
      settings.setFolderName(name);
      setMessage(`Workspace "${name}" added and activated!`);
      useAppStore.getState().load();
      useResumeStore.getState().load();
    } catch (e) {
      if (e.name !== "AbortError") setMessage(`Error: ${e.message}`);
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleSwitchFolder(name) {
    if (name === settings.folderName) return;
    try {
      const ok = await switchToFolder(name);
      if (!ok) {
        setMessage("Permission denied — please re-select the folder.");
        return;
      }
      settings.setFolderName(name);
      setMessage(`Switched to workspace "${name}"`);
      useAppStore.getState().load();
      useResumeStore.getState().load();
    } catch (e) {
      setMessage(`Error: ${e.message}`);
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleRemoveFolder(name) {
    await removeFolderHandle(name);
    settings.removeFolder(name);
    setMessage(`Workspace "${name}" removed.`);
    if (name === settings.folderName) {
      useAppStore.getState().load();
      useResumeStore.getState().load();
    }
    setTimeout(() => setMessage(""), 3000);
  }

  async function exportData() {
    try {
      const [applications, emails, emailTemplates, resumes, notes] = await Promise.all([
        api.getAll("applications"),
        api.getAll("emails"),
        api.getAll("templates"),
        api.getAll("resumes"),
        api.getAll("notes"),
      ]);
      const data = { applications, emails, emailTemplates, resumesMeta: resumes, notes };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `linkedout_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Failed to export. Check your connection.");
      setTimeout(() => setMessage(""), 5000);
    }
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const imports = [];
      if (data.applications) imports.push(api.sync("applications", data.applications));
      if (data.emails) imports.push(api.sync("emails", data.emails));
      if (data.emailTemplates) imports.push(api.sync("templates", data.emailTemplates));
      if (data.resumesMeta) imports.push(api.sync("resumes", data.resumesMeta));
      if (data.notes) imports.push(api.sync("notes", data.notes));
      await Promise.all(imports);
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
        <div className={`mb-4 text-xs bg-base-900 border rounded-lg px-4 py-2.5 flex items-center gap-2 ${
          message.startsWith("Error") || message.startsWith("Failed") ? "border-[#DC2626]/40" : "border-base-600"
        }`}>
          {message.startsWith("Error") || message.startsWith("Failed")
            ? <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
            : <CheckCircle className="w-3.5 h-3.5 text-accent" />
          }
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
                <li>Copy the <strong>Client ID</strong> (ends with <code className="bg-base-700 px-1 py-0.5 rounded text-[11px]">.apps.googleusercontent.com</code>) and <strong>Client Secret</strong></li>
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
          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Google OAuth Client Secret</label>
            <input
              type="password"
              value={clientSecretInput}
              onChange={(e) => setClientSecretInput(e.target.value)}
              className="input"
              placeholder="GOCSPX-..."
            />
          </div>
          <div className="flex gap-2">
            <button onClick={saveGoogleCredentials} className="bg-accent text-accent-dark text-sm font-medium px-4 py-2 rounded-md hover:bg-accent-light transition-colors">
              Save Credentials
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
      <Section icon={FolderOpen} title="Workspaces">
        <div className="space-y-3">
          {!isFileSystemSupported() ? (
            <div className="flex items-center gap-2 text-xs text-[#D97706]">
              <AlertCircle className="w-3.5 h-3.5" />
              File System Access API not supported in this browser. Use Chrome or Edge.
            </div>
          ) : (
            <>
              <p className="text-xs text-base-300">
                Each workspace is a local folder. Only the active workspace tracks and stores data.
              </p>
              {settings.folders.length > 0 && (
                <div className="space-y-1">
                  {settings.folders.map((name) => (
                    <div
                      key={name}
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                        name === settings.folderName
                          ? "bg-accent/15 border border-accent/40 text-accent"
                          : "bg-base-800 border border-base-600 text-base-200 hover:border-base-400"
                      }`}
                      onClick={() => handleSwitchFolder(name)}
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{name}</span>
                        {name === settings.folderName && (
                          <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full font-medium">active</span>
                        )}
                      </div>
                      {name !== settings.folderName && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveFolder(name); }}
                          className="text-base-400 hover:text-[#DC2626] transition-colors p-1"
                          title="Remove workspace"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleSelectFolder}
                className="flex items-center gap-2 bg-accent text-accent-dark text-sm font-medium px-4 py-2 rounded-md hover:bg-accent-light transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add workspace
              </button>
            </>
          )}
        </div>
      </Section>

      {/* LLM */}
      <Section icon={Brain} title="Email Intelligence (LLM)">
        <div className="space-y-4">
          <button
            onClick={() => setShowLlmGuide(!showLlmGuide)}
            className="flex items-center gap-2 text-xs text-base-300 hover:text-base-100 transition-colors w-full"
          >
            <Info className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>How to get a free API key</span>
            {showLlmGuide ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>

          {showLlmGuide && (
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 text-xs text-base-200 space-y-3">
              <p className="font-medium text-base-100">Cerebras (recommended)</p>
              <ol className="list-decimal list-inside space-y-2 text-base-300">
                <li>Go to <strong>cloud.cerebras.ai</strong> → sign up for a free account</li>
                <li>Navigate to <strong>API keys</strong> in the left sidebar</li>
                <li>Click <strong>Create API Key</strong> → give it a name</li>
                <li>Copy the key (starts with <code className="bg-base-700 px-1 py-0.5 rounded text-[11px]">csk-</code>)</li>
                <li>Free tier: <strong>2,400 requests/day</strong>, <strong>1M tokens/day</strong></li>
              </ol>
              <hr className="border-[#BFDBFE]" />
              <p className="font-medium text-base-100">Groq (alternative)</p>
              <ol className="list-decimal list-inside space-y-2 text-base-300">
                <li>Go to <strong>console.groq.com</strong> → sign up for a free account</li>
                <li>Navigate to <strong>API Keys</strong></li>
                <li>Click <strong>Create API Key</strong></li>
                <li>Copy the key (starts with <code className="bg-base-700 px-1 py-0.5 rounded text-[11px]">gsk_</code>)</li>
                <li>Free tier: <strong>30 RPM</strong>, <strong>100K tokens/day</strong></li>
              </ol>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable AI email analysis</p>
              <p className="text-xs text-base-400 mt-0.5">
                Auto-create applications and update stages from incoming emails
              </p>
            </div>
            <button
              onClick={() => {
                const next = !settings.llmEnabled;
                settings.setLlmEnabled(next);
                setMessage(next ? "LLM enabled" : "LLM disabled");
                setTimeout(() => setMessage(""), 3000);
              }}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                settings.llmEnabled ? "bg-accent" : "bg-base-600"
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.llmEnabled ? "translate-x-5" : ""
              }`} />
            </button>
          </div>

          <div>
            <label className="text-[11px] text-base-300 mb-1 block">Provider</label>
            <select
              value={settings.llmProvider}
              onChange={(e) => settings.setLlmProvider(e.target.value)}
              className="input w-full max-w-xs"
            >
              <option value="cerebras">Cerebras (GPT-OSS 120B)</option>
              <option value="groq">Groq (Llama 3.3 70B)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-base-300 mb-1 block">API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={llmKeyInput}
                onChange={(e) => setLlmKeyInput(e.target.value)}
                className="input flex-1"
                placeholder={settings.llmProvider === "cerebras" ? "csk-..." : "gsk_..."}
              />
              <button
                onClick={() => {
                  settings.setLlmApiKey(llmKeyInput);
                  setMessage("API key saved.");
                  setTimeout(() => setMessage(""), 3000);
                }}
                className="bg-accent text-accent-dark text-sm font-medium px-4 py-2 rounded-md hover:bg-accent-light transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-base-400 mt-1">
              Stored in localStorage. Get a free key from{" "}
              {settings.llmProvider === "cerebras" ? (
                <span className="text-base-300">cloud.cerebras.ai</span>
              ) : (
                <span className="text-base-300">console.groq.com</span>
              )}
            </p>
          </div>

          {settings.llmEnabled && settings.llmApiKey && (
            <div className="flex items-center gap-1.5 text-xs text-[#16A34A]">
              <Power className="w-3 h-3" /> Active — emails will be analyzed during sync
            </div>
          )}
          {settings.llmEnabled && !settings.llmApiKey && (
            <div className="flex items-center gap-1.5 text-xs text-[#D97706]">
              <AlertCircle className="w-3 h-3" /> Enabled but no API key set
            </div>
          )}
        </div>
      </Section>

      {/* API Usage */}
      <Section icon={BarChart3} title="API Usage">
        <div className="space-y-4">
          {/* Gmail usage */}
          <div>
            <p className="text-sm font-medium mb-2">Gmail API</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-base-800 rounded-md px-3 py-2">
                <p className="text-[10px] text-base-400 uppercase tracking-wide">Emails sent today</p>
                <p className="text-lg font-semibold mt-0.5">{gmailUsage.sent}</p>
              </div>
              <div className="bg-base-800 rounded-md px-3 py-2">
                <p className="text-[10px] text-base-400 uppercase tracking-wide">Sync calls today</p>
                <p className="text-lg font-semibold mt-0.5">{gmailUsage.read}</p>
              </div>
            </div>
            <p className="text-[10px] text-base-400 mt-1.5">
              Counts from this app only. Resets daily at midnight.
            </p>
          </div>

          {/* LLM usage */}
          <div>
            <p className="text-sm font-medium mb-2">
              LLM API {settings.llmProvider === "cerebras" ? "(Cerebras)" : "(Groq)"}
            </p>
            {llmUsage ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {llmUsage.requestLimit != null && (
                    <div className="bg-base-800 rounded-md px-3 py-2">
                      <p className="text-[10px] text-base-400 uppercase tracking-wide">Requests</p>
                      <p className="text-lg font-semibold mt-0.5">
                        <span className={llmUsage.requestRemaining < llmUsage.requestLimit * 0.1 ? "text-[#DC2626]" : ""}>
                          {llmUsage.requestRemaining?.toLocaleString()}
                        </span>
                        <span className="text-sm text-base-400 font-normal"> / {llmUsage.requestLimit?.toLocaleString()}</span>
                      </p>
                      {llmUsage.requestReset && (
                        <p className="text-[10px] text-base-400 mt-0.5">Resets: {formatReset(llmUsage.requestReset)}</p>
                      )}
                    </div>
                  )}
                  {llmUsage.tokenLimit != null && (
                    <div className="bg-base-800 rounded-md px-3 py-2">
                      <p className="text-[10px] text-base-400 uppercase tracking-wide">Tokens</p>
                      <p className="text-lg font-semibold mt-0.5">
                        <span className={llmUsage.tokenRemaining < llmUsage.tokenLimit * 0.1 ? "text-[#DC2626]" : ""}>
                          {formatTokens(llmUsage.tokenRemaining)}
                        </span>
                        <span className="text-sm text-base-400 font-normal"> / {formatTokens(llmUsage.tokenLimit)}</span>
                      </p>
                      {llmUsage.tokenReset && (
                        <p className="text-[10px] text-base-400 mt-0.5">Resets: {formatReset(llmUsage.tokenReset)}</p>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-base-400 mt-1.5">
                  From API response headers. Updated: {new Date(llmUsage.updatedAt).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <p className="text-xs text-base-400">No usage data yet — data appears after first LLM call.</p>
            )}
          </div>
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

function formatTokens(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

function formatReset(val) {
  if (!val) return "";
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toLocaleTimeString();
  const match = val.match(/^(\d+(\.\d+)?)(ms|s|m|h)$/);
  if (match) {
    const [, num, , unit] = match;
    const n = parseFloat(num);
    if (unit === "ms") return n < 1000 ? `${Math.round(n)}ms` : `${(n / 1000).toFixed(0)}s`;
    if (unit === "s") return n < 60 ? `${Math.round(n)}s` : `${(n / 60).toFixed(0)}m`;
    if (unit === "m") return `${Math.round(n)}m`;
    if (unit === "h") return `${Math.round(n)}h`;
  }
  return val;
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
