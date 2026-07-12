import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAppState } from "./state/AppStateContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Whistleblower } from "./pages/Whistleblower";
import { SeatPlannerPage } from "./pages/SeatPlannerPage";
import { SyllabusNegotiator } from "./pages/SyllabusNegotiator";
import { Ledger } from "./pages/Ledger";
import { SosFlare } from "./pages/SosFlare";
import { FactChecker } from "./pages/FactChecker";

function RequireAuth({ children }: { children: ReactNode }) {
  const { currentStudent, loading } = useAppState();
  if (loading) return <Splash />;
  if (!currentStudent) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="animate-pulse text-sm text-ink-400">Loading the resistance…</p>
    </div>
  );
}

// Dashboard + aggregate views are for admins only (Biltu, Miltu, Rashid Sir).
// General students are bounced to their own complaint portal.
function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAppState();
  if (!isAdmin) return <Navigate to="/whistleblower" replace />;
  return <>{children}</>;
}

// Student self-service tools (syllabus, ledger, fact-checker). Admins oversee
// from the dashboard and are redirected there if they hit these directly.
function RequireStudent({ children }: { children: ReactNode }) {
  const { isStudent } = useAppState();
  if (!isStudent) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          path="/"
          element={
            <RequireAdmin>
              <Dashboard />
            </RequireAdmin>
          }
        />
        <Route path="/whistleblower" element={<Whistleblower />} />
        <Route path="/seating" element={<SeatPlannerPage />} />
        <Route
          path="/syllabus"
          element={
            <RequireStudent>
              <SyllabusNegotiator />
            </RequireStudent>
          }
        />
        <Route
          path="/ledger"
          element={
            <RequireStudent>
              <Ledger />
            </RequireStudent>
          }
        />
        <Route path="/sos" element={<SosFlare />} />
        <Route
          path="/fact-check"
          element={
            <RequireStudent>
              <FactChecker />
            </RequireStudent>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
