import { useState } from "react";
import { isGmailConnected, connectGmail } from "../services/gmail";
import { syncInboundEmails, clearSkippedCache } from "../services/emailSync";

export default function useEmailSync() {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

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

  return { syncing, syncMsg, setSyncMsg, handleSync };
}
