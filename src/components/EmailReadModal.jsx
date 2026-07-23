import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { isGmailConnected, getEmailBody } from "../services/gmail";
import { format, parseISO } from "date-fns";

export default function EmailReadModal({ email, onClose, updateEmail }) {
  const [body, setBody] = useState(null);
  const [loading, setLoading] = useState(true);
  const modalRef = useRef(null);

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
  }, [email?.id, email?.body, email?.gmailId, updateEmail]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (email && modalRef.current) modalRef.current.focus();
  }, [email]);

  if (!email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Read email"
        tabIndex={-1}
        className="bg-base-800 border border-base-600 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col mx-4 outline-none"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-base-600">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{email.subject || "(no subject)"}</h3>
            <div className="text-xs text-base-400 mt-1">
              <span>From: {email.recipientEmail}</span>
              {email.sentAt && <span className="ml-3">{format(parseISO(email.sentAt), "MMM d, yyyy 'at' h:mm a")}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-base-400 hover:text-base-100 ml-3 mt-0.5" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-center text-base-400 py-8">Loading email...</div>
          ) : body?.html ? (
            <iframe
              srcDoc={body.html}
              title="Email content"
              className="w-full border-0 rounded bg-white"
              style={{ minHeight: "400px" }}
              sandbox=""
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
