import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense, Component } from "react";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import Privacy from "./pages/Privacy";
import Support from "./pages/Support";
import useAuthStore from "./stores/useAuthStore";
import { restoreRootDirectory } from "./services/fileSystem";
import Toast from "./components/Toast";

function lazyRetry(fn) {
  return lazy(() => fn().catch(() => {
    const key = "chunk_retry";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
      return new Promise(() => {});
    }
    sessionStorage.removeItem(key);
    throw new Error("Failed to load page after retry");
  }));
}

const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const ColdEmails = lazyRetry(() => import("./pages/ColdEmails"));
const Resumes = lazyRetry(() => import("./pages/Resumes"));
const Applications = lazyRetry(() => import("./pages/Applications"));
const InterviewPrep = lazyRetry(() => import("./pages/InterviewPrep"));
const Settings = lazyRetry(() => import("./pages/Settings"));
const QuickApply = lazyRetry(() => import("./pages/QuickApply"));

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-base-800 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold text-base-100 mb-2">Something went wrong</h1>
            <p className="text-base-400 text-sm mb-4">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = "/dashboard"; }}
              className="px-4 py-2 bg-base-100 text-base-800 rounded-lg text-sm font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function PageLoader() {
  return <div className="min-h-screen bg-base-800 flex items-center justify-center">
    <div className="text-base-400 text-sm">Loading...</div>
  </div>;
}

function ProtectedRoute({ children }) {
  const { token, loading } = useAuthStore();
  if (loading) return <div className="min-h-screen bg-base-800" />;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { token, loading } = useAuthStore();
  if (loading) return <div className="min-h-screen bg-base-800" />;
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
    restoreRootDirectory();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Toast />
          <Routes>
            <Route path="/" element={<GuestRoute><Landing /></GuestRoute>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/support" element={<Support />} />
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="emails" element={<ColdEmails />} />
              <Route path="resumes" element={<Resumes />} />
              <Route path="applications" element={<Applications />} />
              <Route path="quick-apply" element={<QuickApply />} />
              <Route path="prep" element={<InterviewPrep />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
