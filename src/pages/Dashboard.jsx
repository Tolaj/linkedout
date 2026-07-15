import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAppStore from "../stores/useAppStore";
import NoWorkspace from "../components/NoWorkspace";
import { KANBAN_COLUMNS, CLOSED_STATUSES, STAGE_COLOR } from "../lib/constants";
import AppCard from "../components/AppCard";
import FormModal from "../components/FormModal";
import { EMPTY_APP } from "../lib/constants";
import { isFileSystemSupported, hasRootDirectory } from "../services/fileSystem";
import useSettingsStore from "../stores/useSettingsStore";

export default function Dashboard() {
  const { apps, loaded, load } = useAppStore();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const hasWorkspace = isFileSystemSupported() && hasRootDirectory();
  const navigate = useNavigate();
  const folderName = useSettingsStore((s) => s.folderName);

  useEffect(() => { if (hasWorkspace) load(); }, [load, hasWorkspace, folderName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.company.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q)
    );
  }, [apps, query]);

  const byStage = useMemo(() => {
    const map = {};
    KANBAN_COLUMNS.forEach((col) => (map[col] = []));
    filtered.forEach((a) => {
      if (CLOSED_STATUSES.includes(a.status)) {
        map["Closed"].push(a);
      } else if (map[a.status]) {
        map[a.status].push(a);
      }
    });
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = apps.length;
    const base = apps.filter((a) => a.status !== "Wishlist").length || 1;
    const interviewingOrBeyond = apps.filter((a) => ["Interviewing", "Offer"].includes(a.status)).length;
    const responded = apps.filter((a) => !["Wishlist", "Applied"].includes(a.status)).length;
    const offers = apps.filter((a) => a.status === "Offer").length;
    return {
      total,
      active: apps.filter((a) => !CLOSED_STATUSES.includes(a.status)).length,
      responseRate: Math.round((responded / base) * 100),
      interviewRate: Math.round((interviewingOrBeyond / base) * 100),
      offers,
    };
  }, [apps]);

  if (!hasWorkspace) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold font-mono mb-1">job_pipeline</h1>
          <p className="text-sm text-base-300">Track every application like a build — from queued to shipped.</p>
        </div>
        <NoWorkspace page="dashboard" />
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 text-base-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold font-mono mb-1">job_pipeline</h1>
          <p className="text-sm text-base-300">Track every application like a build — from queued to shipped.</p>
        </div>
        <button
          onClick={() => { setEditingApp(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-accent text-accent-dark font-medium text-sm px-4 py-2.5 rounded-md hover:bg-accent-light transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Log application
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Response rate", value: `${stats.total ? stats.responseRate : 0}%` },
          { label: "Interview rate", value: `${stats.total ? stats.interviewRate : 0}%` },
          { label: "Offers", value: stats.offers },
        ].map((s) => (
          <div key={s.label} className="bg-base-700 border border-base-600 rounded-lg px-4 py-3">
            <div className="text-[11px] text-base-300 uppercase tracking-wide mb-1">{s.label}</div>
            <div className="text-xl font-semibold font-mono">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search className="w-4 h-4 text-base-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company or role"
          className="input w-full pl-9"
        />
      </div>

      {/* Board */}
      {apps.length === 0 ? (
        <div className="text-center py-16 text-base-400 text-sm">
          No applications logged yet. Click "Log application" to add your first one.
        </div>
      ) : (
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-320px)] min-h-[400px]">
        {KANBAN_COLUMNS.map((col) => {
          const c = STAGE_COLOR[col] || { dot: "bg-[#6B7280]", ring: "border-[#6B7280]", text: "text-[#6B7280]", bg: "bg-[#F9FAFB]" };
          const cards = byStage[col];
          return (
            <div key={col} className="flex-shrink-0 w-[260px] flex flex-col">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span className="text-sm font-medium">{col}</span>
                <span className="text-xs text-base-400 ml-auto font-mono">{cards.length}</span>
              </div>
              <div className="space-y-2 min-h-[40px] flex-1 overflow-y-auto pr-1">
                {cards.map((app) => {
                  const appColor = STAGE_COLOR[app.status] || c;
                  return (
                    <AppCard
                      key={app.id}
                      app={app}
                      color={appColor}
                      onOpen={() => { setEditingApp(app); setModalOpen(true); }}
                    />
                  );
                })}
                {cards.length === 0 && (
                  <div className="border border-dashed border-base-600 rounded-lg h-16 flex items-center justify-center text-xs text-base-500">
                    empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {modalOpen && (
        <FormModal
          app={editingApp}
          onClose={() => { setModalOpen(false); setEditingApp(null); }}
        />
      )}
    </div>
  );
}
