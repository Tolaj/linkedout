import { useState } from "react";
import { FolderOpen } from "lucide-react";

export default function NoWorkspace({ page }) {
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    try {
      const { selectRootDirectory, createFolderStructure } = await import("../services/fileSystem");
      const name = await selectRootDirectory();
      await createFolderStructure();
      const { default: useSettingsStore } = await import("../stores/useSettingsStore");
      await useSettingsStore.getState().setFolderName(name);
      window.location.reload();
    } catch (e) {
      if (e.name !== "AbortError") console.warn(e);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FolderOpen className="w-10 h-10 text-base-500 mb-4" />
      <h2 className="text-base font-medium mb-1">No workspace connected</h2>
      <p className="text-sm text-base-400 max-w-sm mb-5">
        Select or create a folder to get started. The folder name becomes your workspace.
      </p>
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-2 bg-accent text-accent-dark text-sm font-medium px-5 py-2.5 rounded-md hover:bg-accent-light transition-colors disabled:opacity-50"
      >
        <FolderOpen className="w-4 h-4" />
        {connecting ? "Connecting..." : "Connect folder"}
      </button>
    </div>
  );
}
