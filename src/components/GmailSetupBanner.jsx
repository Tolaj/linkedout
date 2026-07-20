import { useState } from "react";
import { Mail } from "lucide-react";
import useSettingsStore from "../stores/useSettingsStore";
import { isGmailConfigured, connectGmail, initGmail } from "../services/gmail";

export default function GmailSetupBanner({ onConnected }) {
  const settings = useSettingsStore();
  const [clientId, setClientId] = useState(settings.googleClientId);
  const [clientSecret, setClientSecret] = useState(settings.googleClientSecret);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  async function handleSaveAndConnect() {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError("Both fields are required.");
      return;
    }
    setError("");
    settings.setGoogleClientId(clientId.trim());
    settings.setGoogleClientSecret(clientSecret.trim());
    initGmail();

    setConnecting(true);
    try {
      await connectGmail();
      if (onConnected) onConnected();
    } catch (e) {
      setError(e.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Mail className="w-10 h-10 text-base-500 mb-4" />
      <h2 className="text-base font-medium mb-1">
        {isGmailConfigured() ? "Connect Gmail" : "Set up Gmail"}
      </h2>
      <p className="text-sm text-base-400 max-w-sm mb-5">
        {isGmailConfigured()
          ? "Gmail credentials saved. Connect to enable email sync and sends."
          : "Enter your Google OAuth credentials to sync and send emails."}
      </p>
      {!isGmailConfigured() && (
        <div className="space-y-2 mb-4 w-72">
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="input w-full text-xs"
            placeholder="Google OAuth Client ID"
          />
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            className="input w-full text-xs"
            placeholder="Google OAuth Client Secret"
          />
        </div>
      )}
      {error && <p className="text-xs text-[#DC2626] mb-3">{error}</p>}
      <button
        onClick={handleSaveAndConnect}
        disabled={connecting || (!isGmailConfigured() && (!clientId.trim() || !clientSecret.trim()))}
        className="flex items-center gap-2 bg-accent text-accent-dark text-sm font-medium px-5 py-2.5 rounded-md hover:bg-accent-light transition-colors disabled:opacity-50"
      >
        <Mail className="w-4 h-4" />
        {connecting ? "Connecting..." : isGmailConfigured() ? "Connect Gmail" : "Save & Connect"}
      </button>
    </div>
  );
}
