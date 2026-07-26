import { useState } from "react";
import { Mail } from "lucide-react";
import useSettingsStore from "../stores/useSettingsStore";
import useAuthStore from "../stores/useAuthStore";
import { isGmailConfigured, connectGmail, initGmail } from "../services/gmail";
import GmailLogo from "./GmailLogo";

export default function GmailSetupBanner({ onConnected }) {
  const googleClientId = useSettingsStore((s) => s.googleClientId);
  const googleClientSecret = useSettingsStore((s) => s.googleClientSecret);
  const setGoogleClientId = useSettingsStore((s) => s.setGoogleClientId);
  const setGoogleClientSecret = useSettingsStore((s) => s.setGoogleClientSecret);
  const user = useAuthStore((s) => s.user);
  const isGoogleUser = user?.isGoogleUser || !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const [clientId, setClientId] = useState(googleClientId);
  const [clientSecret, setClientSecret] = useState(googleClientSecret);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  async function handleConnect() {
    setError("");
    if (!isGoogleUser && !isGmailConfigured()) {
      if (!clientId.trim() || !clientSecret.trim()) {
        setError("Both fields are required.");
        return;
      }
      setGoogleClientId(clientId.trim());
      setGoogleClientSecret(clientSecret.trim());
    }
    const hint = isGoogleUser ? user.email : undefined;
    initGmail(hint);
    setConnecting(true);
    try {
      await connectGmail(hint);
      if (onConnected) onConnected();
    } catch (e) {
      setError(e.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  const needsCredentials = !isGoogleUser && !isGmailConfigured();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Mail className="w-10 h-10 text-base-500 mb-4" />
      <h2 className="text-base font-medium mb-1">
        {isGoogleUser ? "Enable Gmail" : isGmailConfigured() ? "Connect Gmail" : "Set up Gmail"}
      </h2>
      <p className="text-sm text-base-400 max-w-sm mb-5">
        {isGoogleUser
          ? "Enable Gmail integration to sync and send emails directly from LinkedOut."
          : isGmailConfigured()
            ? "Gmail credentials saved. Connect to enable email sync and sends."
            : "Enter your Google OAuth credentials to sync and send emails."}
      </p>
      {needsCredentials && (
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
        onClick={handleConnect}
        disabled={connecting || (needsCredentials && (!clientId.trim() || !clientSecret.trim()))}
        className="flex items-center gap-2 bg-accent text-accent-dark text-sm font-medium px-5 py-2.5 rounded-md hover:bg-accent-light transition-colors disabled:opacity-50"
      >
        <span className="w-5 h-5 bg-white rounded flex items-center justify-center"><GmailLogo size={14} /></span>
        {connecting ? "Connecting..." : isGoogleUser ? "Enable Gmail" : isGmailConfigured() ? "Connect Gmail" : "Save & Connect"}
      </button>
    </div>
  );
}
