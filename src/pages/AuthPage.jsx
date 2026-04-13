import { useEffect, useState } from "react";
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

  const [authMode, setAuthMode] = useState("signin");
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

  function resetFeedback() {
    setAuthError("");
    setInfo("");
  }

  function handleModeChange(nextMode) {
    if (nextMode === authMode) {
      return;
    }

    setAuthMode(nextMode);
    setErrors({
      email: "",
      password: "",
    });
    setTouched({
      email: false,
      password: false,
    });
    resetFeedback();
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

  useEffect(() => {
    if (location.state?.message) {
      if (location.state.type === "error") {
        setAuthError(location.state.message);
        setInfo("");
      } else {
        setInfo(location.state.message);
        setAuthError("");
      }

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  async function handleSubmit(event) {
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
    resetFeedback();

    if (hasEmptyRequiredFields || nextErrors.email || nextErrors.password) {
      return;
    }

    setLoading(true);

    try {
      if (authMode === "signin") {
        await signIn(email.trim(), password);
      } else {
        const data = await signUp(email.trim(), password);

        if (!data.session) {
          setInfo("Te enviamos un email para confirmar tu cuenta.");
        } else {
          setInfo("Cuenta creada correctamente.");
        }
      }
    } catch (submitError) {
      setAuthError(
        submitError.message ||
          (authMode === "signin" ? "No se pudo ingresar." : "No se pudo crear la cuenta.")
      );
    } finally {
      setLoading(false);
    }
  }

  const showEmailError = touched.email && errors.email;
  const showPasswordError = touched.password && errors.password;
  const isSignIn = authMode === "signin";

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-4 sm:px-6 sm:py-8 lg:flex lg:items-center lg:justify-center lg:bg-transparent">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-stone-950 shadow-warm lg:grid-cols-[1.08fr_0.92fr] lg:border-white/60 lg:bg-white/70 lg:backdrop-blur">
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

        <section className="relative flex min-h-screen items-start bg-transparent px-0 py-0 lg:min-h-[640px] lg:items-center lg:bg-white/85 lg:px-10 lg:py-10">
          <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.24),transparent_54%),linear-gradient(180deg,rgba(28,25,23,0.98),rgba(28,25,23,0.88))] lg:hidden" />

          <form
            className="relative mx-auto flex w-full max-w-md flex-col gap-5 pt-5 pb-6 sm:pt-6 sm:pb-8 lg:block lg:pt-0 lg:pb-0"
            onSubmit={handleSubmit}
          >
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-6 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2 shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
                  <img
                    alt="Logo de Agenda Barber"
                    className="h-full w-full object-contain"
                    src={agendaBarberLogo}
                  />
                </div>
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-brand-200/90">
                    AGENDA BARBER
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-200">
                    Controlá tus cortes, ingresos y rendimiento.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-stone-200/90 bg-white px-4 py-5 shadow-[0_24px_60px_rgba(12,10,9,0.2)] sm:px-6 sm:py-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none">
              <div className="mb-6 sm:mb-7">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700 sm:text-sm sm:tracking-[0.25em]">
                  Agenda Barber
                </p>

                <div className="relative mt-4 grid grid-cols-2 rounded-2xl border border-stone-200 bg-stone-100/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                  <div
                    aria-hidden="true"
                    className={`absolute inset-y-1.5 w-[calc(50%-0.375rem)] rounded-[0.875rem] bg-stone-950 shadow-[0_10px_24px_rgba(28,25,23,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 ease-out ${
                      isSignIn ? "left-1.5" : "left-[calc(50%+0.125rem)]"
                    }`}
                  />
                  <button
                    aria-pressed={isSignIn}
                    className={`relative z-10 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                      isSignIn ? "text-white" : "text-stone-600 hover:text-stone-800"
                    }`}
                    onClick={() => handleModeChange("signin")}
                    type="button"
                  >
                    Ingresar
                  </button>
                  <button
                    aria-pressed={!isSignIn}
                    className={`relative z-10 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                      !isSignIn ? "text-white" : "text-stone-600 hover:text-stone-800"
                    }`}
                    onClick={() => handleModeChange("signup")}
                    type="button"
                  >
                    Registrarse
                  </button>
                </div>

                <h2 className="mt-5 text-[1.8rem] font-bold tracking-tight text-stone-950 sm:text-3xl">
                  {isSignIn ? "Ingresá a tu cuenta" : "Creá tu cuenta"}
                </h2>
                <p className="mt-2.5 text-sm leading-6 text-stone-600 sm:mt-3">
                  {isSignIn
                    ? "Accedé con tu email y contraseña para gestionar tu jornada."
                    : "Completá tu email y contraseña para registrarte y confirmar tu cuenta por email."}
                </p>
              </div>

              <div className="space-y-4 sm:space-y-5">
                <div>
                  <label
                    className="mb-2 block text-sm font-semibold tracking-[0.01em] text-stone-800"
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
                    className="mb-2 block text-sm font-semibold tracking-[0.01em] text-stone-800"
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

                <button className="btn-primary mt-1 w-full" disabled={loading} type="submit">
                  {loading
                    ? isSignIn
                      ? "Ingresando..."
                      : "Creando cuenta..."
                    : isSignIn
                      ? "Ingresar"
                      : "Registrarme"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
