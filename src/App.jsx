import { Navigate, Route, Routes } from "react-router-dom";
import AdminRoute from "./components/AdminRoute";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import MonthlySummaryPage from "./pages/MonthlySummaryPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import ServicesPage from "./pages/ServicesPage";
import TurnosPage from "./pages/TurnosPage";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";
import WeeklyHistoryPage from "./pages/WeeklyHistoryPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/semana" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/update-password" element={<UpdatePasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/semana" element={<DashboardPage />} />
          <Route path="/semanas" element={<WeeklyHistoryPage />} />
          <Route path="/perfil" element={<ProfileSetupPage />} />
          <Route path="/turnos" element={<TurnosPage />} />
          <Route path="/resumen-mensual" element={<MonthlySummaryPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/servicios" element={<ServicesPage />} />
            <Route path="/services" element={<ServicesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/semana" replace />} />
    </Routes>
  );
}
