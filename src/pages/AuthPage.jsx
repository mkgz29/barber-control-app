import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AuthStatusScreen from "../components/AuthStatusScreen";
import LoadingScreen from "../components/LoadingScreen";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const location = useLocation();
  const {
    session,
    profile,
    loading,
    bootstrapError,
    inactiveMessage,
    signIn,
    signUp,
    retryBootstrap,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    !profile?.full_name?.trim() && session
      ? "/perfil"
      : location.state?.from?.pathname || "/semana";

  useEffect(() => {
    setError("");
  }, [email, password]);

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

  if (session) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleLogin() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setInfo("");

    try {
      await signIn(email.trim(), password);
    } catch (submitError) {
      setError(submitError.message || "No se pudo ingresar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    setInfo("");

    try {
      const data = await signUp(email.trim(), password);

      if (!data.session) {
        setInfo("Revisá tu correo para confirmar la cuenta y después ingresá.");
      }
    } catch (submitError) {
      setError(submitError.message || "No se pudo crear la cuenta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-[2rem] bg-stone-900 p-8 text-white lg:block">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-200">Barber App</p>
          <h1 className="mt-6 max-w-md text-4xl font-bold leading-tight">
            Tu semana de trabajo, clara y ordenada.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-stone-300">
            Cargá cortes, mirá tus totales y revisá tu comisión sin vueltas.
          </p>
        </section>

        <section className="card p-6 sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
              Ingreso
            </p>
            <h2 className="mt-2 text-3xl font-bold text-stone-900">Bienvenido</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Ingresá o registrate con tu email y contraseña.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
              <input
                className="input"
                type="email"
                placeholder="tuemail@ejemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Contraseña</label>
              <input
                className="input"
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {inactiveMessage && <p className="text-sm text-amber-700">{inactiveMessage}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-emerald-700">{info}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <button className="btn-primary w-full" disabled={submitting} onClick={handleLogin}>
                {submitting ? "Procesando..." : "Ingresar"}
              </button>
              <button className="btn-secondary w-full" disabled={submitting} onClick={handleRegister}>
                Registrarse
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
