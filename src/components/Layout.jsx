import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Mail, FileText, FolderOpen,
  BookOpen, Settings, Menu, LogOut,
} from "lucide-react";
import Logo from "./Logo";
import { useState } from "react";
import useAuthStore from "../stores/useAuthStore";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Pipeline" },
  { to: "/emails", icon: Mail, label: "Cold Emails" },
  { to: "/resumes", icon: FileText, label: "Resumes" },
  { to: "/applications", icon: FolderOpen, label: "Applications" },
  { to: "/prep", icon: BookOpen, label: "Interview Prep" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-screen bg-base-800 text-base-100 font-sans">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-56 bg-base-900 border-r border-base-600 flex flex-col transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5 border-b border-base-600">
          <Logo size={28} />
          <span className="font-mono font-bold text-sm tracking-tight">linkedout</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-base-700 text-accent"
                    : "text-base-300 hover:text-base-100 hover:bg-base-700/50"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-base-600 space-y-3">
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                <span className="text-accent-dark text-[10px] font-bold">{user.name?.[0]?.toUpperCase()}</span>
              </div>
              <span className="text-xs text-base-200 truncate">{user.name}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-base-400 hover:text-base-100 transition-colors w-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-base-600 bg-base-900">
          <button onClick={() => setOpen(true)} className="text-base-300 hover:text-base-100">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-mono font-bold text-sm">linkedout</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
