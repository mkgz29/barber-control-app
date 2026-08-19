import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthStatusScreen from "../components/AuthStatusScreen";
import LoadingScreen from "../components/LoadingScreen";
import { useAuth } from "../context/AuthContext";
import { normalizeEmail, validateEmail } from "../lib/emailAuth";

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
    resendConfirmation,
    sendMagicLink,
    sendPasswordReset,
    retryBootstrap,
  } = useAuth();

  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [emailSuggestion, setEmailSuggestion] = useState("");
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });
  const [authError, setAuthError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState("");

  const redirectTo =
    !profile?.full_name?.trim() && session
      ? "/perfil"
      : location.state?.from?.pathname || "/semana";

  const isSignIn = authMode === "signin";

  function validateField(name, value) {
    if (name === "email") {
      const validation = validateEmail(value);
      setEmailSuggestion(validation.suggestion);
      return validation.error;
    }

    if (name === "password") {
      if (!value) {
        return "";
      }

      return value.length >= 6 ? "" : "La contrasena debe tener al menos 6 caracteres";
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
    setPassword("");
    setEmailSuggestion("");
    resetFeedback();
  }

  function handleEmailChange(event) {
    const nextEmail = event.target.value;
    setEmail(nextEmail);
    setAuthError("");

    const validation = validateEmail(nextEmail);
    setEmailSuggestion(validation.suggestion);

    if (touched.email) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        email: validation.error,
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

    if (name === "email") {
      setEmail(normalizeEmail(value));
    }
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

  const canSubmit = useMemo(() => !loading && !secondaryLoading, [loading, secondaryLoading]);

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

  function ensureEmailReady() {
    const validation = validateEmail(email, { required: true });

    setTouched((currentTouched) => ({
      ...currentTouched,
      email: true,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      email: validation.error,
    }));
    setEmailSuggestion(validation.suggestion);

    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    setEmail(validation.email);
    return validation.email;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
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
      const normalizedEmail = ensureEmailReady();

      if (authMode === "signin") {
        await signIn(normalizedEmail, password);
      } else {
        const data = await signUp(normalizedEmail, password);

        if (!data.session) {
          setInfo(
            "Te enviamos un email para confirmar tu cuenta. Revisa tu bandeja y spam."
          );
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

  async function runSecondaryAction(action, successMessage) {
    if (!canSubmit) {
      return;
    }

    resetFeedback();
    setSecondaryLoading(action);

    try {
      const normalizedEmail = ensureEmailReady();

      if (action === "magic-link") {
        await sendMagicLink(normalizedEmail);
      }

      if (action === "password-reset") {
        await sendPasswordReset(normalizedEmail);
      }

      if (action === "resend-confirmation") {
        await resendConfirmation(normalizedEmail);
      }

      setInfo(successMessage);
    } catch (actionError) {
      setAuthError(actionError.message || "No pudimos completar la accion.");
    } finally {
      setSecondaryLoading("");
    }
  }

  const showEmailError = touched.email && errors.email;
  const showPasswordError = touched.password && errors.password;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:flex lg:items-center lg:justify-center">
      <form
        className="mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
        onSubmit={handleSubmit}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
            Agenda Barber
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">
            {isSignIn ? "Ingresar" : "Crear cuenta"}
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {isSignIn
              ? "Accede con email y contrasena, o solicita un magic link."
              : "La cuenta queda pendiente hasta confirmar el email."}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
          <Button
            aria-pressed={isSignIn}
            className={`h-8 px-3 text-sm shadow-none ${
              isSignIn
                ? "bg-white text-sky-700 hover:bg-white"
                : "bg-transparent text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => handleModeChange("signin")}
            type="button"
            variant="ghost"
          >
            Ingresar
          </Button>
          <Button
            aria-pressed={!isSignIn}
            className={`h-8 px-3 text-sm shadow-none ${
              !isSignIn
                ? "bg-white text-sky-700 hover:bg-white"
                : "bg-transparent text-slate-600 hover:bg-slate-50"
            }`}
            onClick={() => handleModeChange("signup")}
            type="button"
            variant="ghost"
          >
            Registro
          </Button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <Input
              aria-describedby={showEmailError ? "email-error" : undefined}
              aria-invalid={Boolean(showEmailError)}
              className={
                showEmailError ? "border-red-400 bg-red-50/70 ring-2 ring-red-100" : ""
              }
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
            {!showEmailError && emailSuggestion && (
              <p className="mt-2 text-sm text-amber-700">
                Revisa el dominio. Quizas quisiste escribir {emailSuggestion}.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
              Contrasena
            </label>
            <Input
              aria-describedby={showPasswordError ? "password-error" : undefined}
              aria-invalid={Boolean(showPasswordError)}
              className={
                showPasswordError ? "border-red-400 bg-red-50/70 ring-2 ring-red-100" : ""
              }
              id="password"
              name="password"
              placeholder="Minimo 6 caracteres"
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
            <Alert className="border-red-200 bg-red-50 text-red-800" variant="destructive">
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
          {info && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}

          <Button className="mt-1 w-full bg-sky-600 text-white shadow-none hover:bg-sky-700" disabled={!canSubmit} type="submit">
            {loading
              ? isSignIn
                ? "Ingresando..."
                : "Creando cuenta..."
              : isSignIn
                ? "Ingresar"
                : "Registrarme"}
          </Button>

          <div className="grid gap-2">
            {isSignIn ? (
              <>
                <Button
                  className="w-full border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-950"
                  disabled={!canSubmit}
                  type="button"
                  variant="outline"
                  onClick={() =>
                    runSecondaryAction(
                      "magic-link",
                      "Te enviamos un magic link. Revisa tu bandeja y spam."
                    )
                  }
                >
                  {secondaryLoading === "magic-link"
                    ? "Enviando magic link..."
                    : "Enviar magic link"}
                </Button>

                <Button
                  className="w-full border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-950"
                  disabled={!canSubmit}
                  type="button"
                  variant="outline"
                  onClick={() =>
                    runSecondaryAction(
                      "password-reset",
                      "Te enviamos un correo para restablecer tu contrasena."
                    )
                  }
                >
                  {secondaryLoading === "password-reset"
                    ? "Enviando recuperacion..."
                    : "Recuperar contrasena"}
                </Button>
              </>
            ) : (
              <Button
                className="w-full border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-950"
                disabled={!canSubmit}
                type="button"
                variant="outline"
                onClick={() =>
                  runSecondaryAction(
                    "resend-confirmation",
                    "Te reenviamos el email de confirmacion. Revisa tu bandeja y spam."
                  )
                }
              >
                {secondaryLoading === "resend-confirmation"
                  ? "Reenviando confirmacion..."
                  : "Reenviar confirmacion"}
              </Button>
            )}
          </div>

          <p className="text-xs leading-5 text-slate-500">
            No repitas clics seguidos. La app aplica cooldown local para evitar spam y reintentos
            innecesarios.
          </p>
        </div>
      </form>
    </div>
  );
}
