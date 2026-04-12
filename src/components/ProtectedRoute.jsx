import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthStatusScreen from "./AuthStatusScreen";
import LoadingScreen from "./LoadingScreen";

export default function ProtectedRoute() {
  const location = useLocation();
  const { session, profile, loading, bootstrapError, retryBootstrap } = useAuth();

  if (loading) {
    return <LoadingScreen message="Estamos preparando tu cuenta..." />;
  }

  if (bootstrapError) {
    return (
      <AuthStatusScreen
        title="No pudimos preparar tu cuenta"
        message={bootstrapError}
        actionLabel="Reintentar"
        onAction={retryBootstrap}
      />
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  const needsProfileSetup = !profile || !profile.full_name?.trim();
  if (needsProfileSetup && location.pathname !== "/perfil") {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
