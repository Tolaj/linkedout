import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ColdEmails from "./pages/ColdEmails";
import Resumes from "./pages/Resumes";
import Applications from "./pages/Applications";
import InterviewPrep from "./pages/InterviewPrep";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import useAuthStore from "./stores/useAuthStore";
import { restoreRootDirectory } from "./services/fileSystem";

function ProtectedRoute({ children }) {
  const { token, loading } = useAuthStore();
  if (loading) return <div className="min-h-screen bg-base-800" />;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { token, loading } = useAuthStore();
  if (loading) return <div className="min-h-screen bg-base-800" />;
  if (token) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
    restoreRootDirectory();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="emails" element={<ColdEmails />} />
          <Route path="resumes" element={<Resumes />} />
          <Route path="applications" element={<Applications />} />
          <Route path="prep" element={<InterviewPrep />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
