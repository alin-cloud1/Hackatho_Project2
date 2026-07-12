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
  const { currentStudent } = useAppState();
  if (!currentStudent) return <Navigate to="/login" replace />;
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/whistleblower" element={<Whistleblower />} />
        <Route path="/seating" element={<SeatPlannerPage />} />
        <Route path="/syllabus" element={<SyllabusNegotiator />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/sos" element={<SosFlare />} />
        <Route path="/fact-check" element={<FactChecker />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
