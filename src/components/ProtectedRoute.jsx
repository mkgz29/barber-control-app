import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

function InactiveAccount() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
          !
        </div>
        <h1 className="text-xl font-bold text-stone-900">Cuenta inactiva</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Tu cuenta está inactiva. Consultá con el administrador.
        </p>
        <button className="btn-primary mt-6 w-full" onClick={signOut}>
          Salir
        </button>
      </div>
    </div>
  );
}

export default function ProtectedRoute() {
  const location = useLocation();
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Estamos preparando tu cuenta..." />;
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (profile && profile.is_active === false) {
    return <InactiveAccount />;
  }

  const needsProfileSetup = !profile?.full_name?.trim();
  if (needsProfileSetup && location.pathname !== "/perfil") {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
}
