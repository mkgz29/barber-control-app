import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import AuthStatusScreen from "../components/AuthStatusScreen";
import LoadingScreen from "../components/LoadingScreen";
import { useAuth } from "../context/AuthContext";

export default function UpdatePasswordPage() {
  const { session, loading: authLoading, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = searchParams.get("type") || hashParams.get("type");
    setIsRecoveryFlow(type === "recovery");
  }, []);

  const validationError = useMemo(() => {
    if (!password && !confirmPassword) {
      return "";
    }

    if (password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }

    if (password !== confirmPassword) {
      return "Las contraseñas no coinciden.";
    }

    return "";
  }, [password, confirmPassword]);

  if (authLoading) {
    return <LoadingScreen message="Preparando el cambio de contraseña..." />;
  }

  if (!session) {
    return (
      <AuthStatusScreen
        title="Sesión no disponible"
        message="Abrí nuevamente el enlace de recuperación desde tu email."
        actionLabel="Volver al login"
        onAction={() => {
          window.location.assign("/auth");
        }}
      />
    );
  }

  if (!isRecoveryFlow) {
    return <Navigate replace to="/semana" />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setInfo("");

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      setInfo("Tu contraseña se actualizó correctamente. Volvé a ingresar con la nueva.");
      await signOut();
    } catch (updateError) {
      setError(updateError.message || "No pudimos actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-8 sm:px-6 lg:flex lg:items-center lg:justify-center">
      <form
        className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-6 shadow-[0_24px_60px_rgba(12,10,9,0.3)]"
        onSubmit={handleSubmit}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">
          Agenda Barber
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-950">
          Elegí una nueva contraseña
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Este paso completa la recuperación enviada por email.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label
              className="mb-2 block text-sm font-semibold tracking-[0.01em] text-stone-800"
              htmlFor="new-password"
            >
              Nueva contraseña
            </label>
            <input
              className="input hover:border-stone-300"
              id="new-password"
              placeholder="Mínimo 6 caracteres"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-semibold tracking-[0.01em] text-stone-800"
              htmlFor="confirm-password"
            >
              Repetí la contraseña
            </label>
            <input
              className="input hover:border-stone-300"
              id="confirm-password"
              placeholder="Repetí tu nueva contraseña"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {info && (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {info}
          </p>
        )}

        <button className="btn-primary mt-6 w-full" disabled={loading} type="submit">
          {loading ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </form>
    </div>
  );
}
