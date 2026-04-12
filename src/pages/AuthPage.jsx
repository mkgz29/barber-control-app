import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import agendaBarberLogo from "../assets/Logo de barbería con estilo clásico.png";
import AuthStatusScreen from "../components/AuthStatusScreen";
import LoadingScreen from "../components/LoadingScreen";
import { useAuth } from "../context/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage() {
  const location = useLocation();
  const {
    session,
    profile,
    loading: authLoading,
    bootstrapError,
    inactiveMessage,
    signIn,
    signUp,
    retryBootstrap,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  const [authError, setAuthError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo =
    !profile?.full_name?.trim() && session
      ? "/perfil"
      : location.state?.from?.pathname || "/semana";

  function validateField(name, value) {
    const trimmedValue = value.trim();

    if (name === "email") {
      if (!trimmedValue) {
        return "";
      }

      return EMAIL_REGEX.test(trimmedValue) ? "" : "Email inválido";
    }

    if (name === "password") {
      if (!value) {
        return "";
      }

      return value.length >= 6 ? "" : "La contraseña debe tener al menos 6 caracteres";
    }

    return "";
  }

  function validateForm(nextValues = { email, password }) {
    return {
      email: validateField("email", nextValues.email),
      password: validateField("password", nextValues.password),
    };
  }

  function handleEmailChange(event) {
    const nextEmail = event.target.value;
    setEmail(nextEmail);
    setAuthError("");

    if (touched.email) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        email: validateField("email", nextEmail),
      }));
    }
  }

  function handlePasswordChange(event) {
    const nextPassword = event.target.value;
    setPassword(nextPassword);
    setAuthError("");

    if (touched.password) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        password: validateField("password", nextPassword),
      }));
    }
  }

  function handleBlur(event) {
    const { name, value } = event.target;

    setTouched((currentTouched) => ({
      ...currentTouched,
      [name]: true,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: validateField(name, value),
    }));
  }

  if (authLoading) {
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

  async function handleLogin(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const nextErrors = validateForm();
    const hasEmptyRequiredFields = !email.trim() || !password;

    setTouched({
      email: true,
      password: true,
    });
    setErrors(nextErrors);
    setAuthError("");
    setInfo("");

    if (hasEmptyRequiredFields || nextErrors.email || nextErrors.password) {
      return;
    }

    setLoading(true);

    try {
      await signIn(email.trim(), password);
    } catch (submitError) {
      setAuthError(submitError.message || "No se pudo ingresar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (loading) {
      return;
    }

    const nextErrors = validateForm();
    const hasEmptyRequiredFields = !email.trim() || !password;

    setTouched({
      email: true,
      password: true,
    });
    setErrors(nextErrors);
    setAuthError("");
    setInfo("");

    if (hasEmptyRequiredFields || nextErrors.email || nextErrors.password) {
      return;
    }

    setLoading(true);

    try {
      const data = await signUp(email.trim(), password);

      if (!data.session) {
        setInfo("Revisá tu correo para confirmar la cuenta y después ingresá.");
      }
    } catch (submitError) {
      setAuthError(submitError.message || "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  const showEmailError = touched.email && errors.email;
  const showPasswordError = touched.password && errors.password;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 shadow-warm backdrop-blur lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden min-h-[640px] overflow-hidden bg-stone-950 px-10 py-12 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_28%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="mb-8 flex">
                <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 backdrop-blur-sm">
                  <img
                    alt="Logo de Agenda Barber"
                    className="h-auto w-full max-w-[280px] object-contain"
                    src={agendaBarberLogo}
                  />
                </div>
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-200">
                Agenda Barber
              </p>
              <h1 className="mt-10 max-w-md text-5xl font-bold leading-[1.05] text-white">
                Organizá tu semana de trabajo sin esfuerzo.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-stone-300">
                Registrá cortes, controlá tus ingresos y seguí tu rendimiento.
              </p>
            </div>

            <div className="max-w-md rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold text-brand-200">Diseñado para barberos</p>
              <p className="mt-3 text-sm leading-7 text-stone-200">
                Un acceso simple para entrar rápido, revisar tu semana y mantener el negocio
                ordenado.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-[640px] items-center bg-white/85 px-6 py-10 sm:px-10">
          <form className="mx-auto w-full max-w-md" onSubmit={handleLogin}>
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
                Agenda Barber
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-950">
                Ingresá a tu cuenta
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Accedé con tu email y contraseña para gestionar tu jornada.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-stone-800"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  aria-describedby={showEmailError ? "email-error" : undefined}
                  aria-invalid={Boolean(showEmailError)}
                  className={`input ${
                    showEmailError
                      ? "!border-red-400 !bg-red-50/70 !ring-2 !ring-red-100"
                      : "hover:border-stone-300"
                  }`}
                  id="email"
                  name="email"
                  placeholder="tuemail@ejemplo.com"
                  type="email"
                  value={email}
                  onBlur={handleBlur}
                  onChange={handleEmailChange}
                />
                {showEmailError && (
                  <p className="mt-2 text-sm text-red-600" id="email-error" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-stone-800"
                  htmlFor="password"
                >
                  Contraseña
                </label>
                <input
                  aria-describedby={showPasswordError ? "password-error" : undefined}
                  aria-invalid={Boolean(showPasswordError)}
                  className={`input ${
                    showPasswordError
                      ? "!border-red-400 !bg-red-50/70 !ring-2 !ring-red-100"
                      : "hover:border-stone-300"
                  }`}
                  id="password"
                  name="password"
                  placeholder="Mínimo 6 caracteres"
                  type="password"
                  value={password}
                  onBlur={handleBlur}
                  onChange={handlePasswordChange}
                />
                {showPasswordError && (
                  <p className="mt-2 text-sm text-red-600" id="password-error" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {inactiveMessage && <p className="text-sm text-amber-700">{inactiveMessage}</p>}
              {authError && (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {authError}
                </p>
              )}
              {info && (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {info}
                </p>
              )}

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <button className="btn-primary w-full" disabled={loading} type="submit">
                  {loading ? "Ingresando..." : "Ingresar"}
                </button>
                <button
                  className="btn-secondary w-full border-stone-400 text-stone-800 hover:border-stone-500"
                  disabled={loading}
                  onClick={handleRegister}
                  type="button"
                >
                  {loading ? "Procesando..." : "Registrarse"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
