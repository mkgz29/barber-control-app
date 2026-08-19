import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      return "La contrasena debe tener al menos 6 caracteres.";
    }

    if (password !== confirmPassword) {
      return "Las contrasenas no coinciden.";
    }

    return "";
  }, [password, confirmPassword]);

  if (authLoading) {
    return <LoadingScreen message="Preparando el cambio de contrasena..." />;
  }

  if (!session) {
    return (
      <AuthStatusScreen
        title="Sesion no disponible"
        message="Abri nuevamente el enlace de recuperacion desde tu email."
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
      setInfo("Tu contrasena se actualizo correctamente. Volve a ingresar con la nueva.");
      await signOut();
    } catch (updateError) {
      setError(updateError.message || "No pudimos actualizar la contrasena.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:flex lg:items-center lg:justify-center">
      <form
        className="mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
        onSubmit={handleSubmit}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          Agenda Barber
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
          Nueva contrasena
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Este paso completa la recuperacion enviada por email.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="new-password">
              Nueva contrasena
            </label>
            <Input
              id="new-password"
              placeholder="Minimo 6 caracteres"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="confirm-password">
              Repeti la contrasena
            </label>
            <Input
              id="confirm-password"
              placeholder="Repeti tu nueva contrasena"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>

        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50 text-red-800" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {info && (
          <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}

        <Button className="mt-5 w-full bg-sky-600 text-white shadow-none hover:bg-sky-700" disabled={loading} type="submit">
          {loading ? "Actualizando..." : "Actualizar contrasena"}
        </Button>
      </form>
    </div>
  );
}
