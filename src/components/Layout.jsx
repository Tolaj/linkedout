import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Mail, FileText, FolderOpen,
  Zap, BookOpen, Settings, Menu, LogOut,
} from "lucide-react";
import Logo from "./Logo";
import { useState, useRef, useEffect } from "react";
import useAuthStore from "../stores/useAuthStore";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Pipeline" },
  { to: "/emails", icon: Mail, label: "Emails" },
  { to: "/resumes", icon: FileText, label: "Resumes" },
  { to: "/applications", icon: FolderOpen, label: "Applications" },
  { to: "/quick-apply", icon: Zap, label: "Quick Apply" },
  { to: "/prep", icon: BookOpen, label: "Interview Prep" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const PAGE_TITLES = {
  "/dashboard": "Pipeline",
  "/emails": "Emails",
  "/resumes": "Resumes",
  "/applications": "Applications",
  "/quick-apply": "Quick Apply",
  "/prep": "Interview Prep",
  "/settings": "Settings",
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const menuRef = useRef(null);

  const pageTitle = PAGE_TITLES[location.pathname] || "LinkedOut";

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-base-800 text-base-100 font-sans">
      {/* Fixed header */}
      <div className="fixed bg-base-900 px-3 py-1 top-0 inset-x-0 z-20 pt-6 mx-6">
        <div className="flex justify-between bg-base-900 border-y border-base-500 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-2 gap-4">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex justify-center items-center size-8 border border-base-400 rounded-xl text-base-200 hover:text-base-100 focus:outline-none transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="shrink-0 size-4" />
            </button>
            {/* Logo + toggle container: toggle pushed to right edge via flex + spacer when open, before logo when closed */}
            <div className={`hidden lg:flex items-center px-4  gap-10  transition-all duration-300 ease-in-out  w-[220px]`}>
              <a href="/" className={`flex items-center  gap-2  ${sidebarOpen ? "order-first" : "order-2"}`}>
                <Logo size={28} />
                <span className="font-mono font-bold text-lg">linkedout</span>
              </a>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`shrink-0 flex justify-center items-center size-8 border border-base-400 rounded-xl text-base-200 hover:text-base-100 focus:outline-none transition-colors ${sidebarOpen ? "order-2" : "order-first"}`}
                aria-label="Toggle sidebar"
              >
                <svg className="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M15 3v18" />
                  <path d="m8 9 3 3-3 3" />
                </svg>
              </button>
            </div>
            {/* Logo for small screens */}
            <a href="/" className="lg:hidden flex items-center gap-2">
              <Logo size={28} />
              <span className="font-mono font-bold text-lg hidden sm:block">linkedout</span>
            </a>

            {/* Breadcrumb */}
            <ol className="ms-3 py-[7px] hidden md:flex items-center whitespace-nowrap">
              <li className="flex items-center text-sm text-base-100">
                <span>Home</span>
                <svg className="shrink-0 mx-3 overflow-visible size-2.5 text-base-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M5 1L10.6869 7.16086C10.8637 7.35239 10.8637 7.64761 10.6869 7.83914L5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </li>
              <li className="text-sm font-semibold text-base-100 truncate">{pageTitle}</li>
            </ol>
          </div>

          <div className="flex items-center py-2 gap-3">
            {/* User avatar & dropdown */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="size-8 flex items-center justify-center rounded-full bg-accent text-accent-dark font-semibold text-sm hover:opacity-90 transition-all"
                >
                  {user.name?.[0]?.toUpperCase()}
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-base-900 rounded-lg shadow-lg border border-base-600 py-1 z-50">
                    <div className="px-4 py-2 border-b border-base-600">
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-base-400 truncate">{user.email}</p>
                    </div>
                    <NavLink
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-base-300 hover:bg-base-700"
                    >
                      <Settings className="size-4" />
                      Settings
                    </NavLink>
                    <button
                      onClick={() => { setUserMenuOpen(false); logout(); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#DC2626] hover:bg-base-700 w-full"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Body: sidebar + main, below fixed header */}
      <div className="flex mt-20 m-4 overflow-hidden min-h-screen">
        {/* Sidebar */}
        <aside
          className={`bg-base-900 border-r border-base-600 min-h-screen overflow-y-auto transition-all duration-300 ease-in-out
            fixed lg:static inset-y-0 left-0 z-40 lg:z-0 w-64
            ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
            ${sidebarOpen ? "lg:w-64" : "lg:w-0 lg:min-w-0 lg:overflow-hidden lg:border-r-0"}`}
        >
          <div className="p-6">
            <h3 className="text-xs font-semibold text-base-400 uppercase tracking-wide mb-4">Navigation</h3>
            <nav className="space-y-1">
              {NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/dashboard"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                      ? "bg-accent text-accent-dark font-semibold"
                      : "text-base-300 hover:bg-base-700"
                    }`
                  }
                >
                  <Icon className="size-5" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
