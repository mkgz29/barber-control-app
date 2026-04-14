import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  checkEmailActionGuard,
  getAuthRedirectUrl,
  logAuthEmailEvent,
  mapAuthError,
  registerEmailActionAttempt,
  validateEmail,
} from "../lib/emailAuth";
import supabase from "../lib/supabaseClient";

const BOOTSTRAP_TIMEOUT_MS = 8000;
const AUTH_CALLBACK_PATH = "/auth/callback";
const UPDATE_PASSWORD_PATH = "/auth/update-password";

const AuthContext = createContext(null);

function getSessionUserId(session) {
  return session?.user?.id ?? null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState("");
  const [inactiveMessage, setInactiveMessage] = useState("");

  const mountedRef = useRef(false);
  const sessionRef = useRef(null);
  const actionLocksRef = useRef({});
  const bootstrapRef = useRef({
    inFlight: false,
    promise: null,
    hasQueuedRequest: false,
    queuedSession: undefined,
    queuedForce: false,
    requestId: 0,
  });

  function applyAuthState(nextSession, nextProfile) {
    sessionRef.current = nextSession;
    setSession(nextSession);
    setProfile(nextProfile);
  }

  async function runBootstrap(sessionOverride, options = {}) {
    const { force = false } = options;

    if (bootstrapRef.current.inFlight) {
      bootstrapRef.current.hasQueuedRequest = true;
      bootstrapRef.current.queuedSession = sessionOverride;
      bootstrapRef.current.queuedForce = bootstrapRef.current.queuedForce || force;
      return bootstrapRef.current.promise;
    }

    const requestId = bootstrapRef.current.requestId + 1;
    bootstrapRef.current.requestId = requestId;
    bootstrapRef.current.inFlight = true;
    bootstrapRef.current.hasQueuedRequest = false;
    bootstrapRef.current.queuedSession = undefined;
    bootstrapRef.current.queuedForce = false;

    const bootstrapPromise = (async () => {
      let timeoutId = null;

      try {
        if (!mountedRef.current) {
          return;
        }

        setLoading(true);
        setBootstrapError("");

        timeoutId = window.setTimeout(() => {
          if (!mountedRef.current || bootstrapRef.current.requestId !== requestId) {
            return;
          }

          setLoading(false);
          setBootstrapError(
            "Tardamos demasiado en validar tu cuenta. Reintentá para continuar."
          );
        }, BOOTSTRAP_TIMEOUT_MS);

        const resolvedSession =
          sessionOverride === undefined
            ? (await supabase.auth.getSession()).data.session
            : sessionOverride;

        if (!mountedRef.current || bootstrapRef.current.requestId !== requestId) {
          return;
        }

        if (!resolvedSession?.user?.id) {
          setInactiveMessage("");
          applyAuthState(null, null);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", resolvedSession.user.id)
          .maybeSingle();

        if (!mountedRef.current || bootstrapRef.current.requestId !== requestId) {
          return;
        }

        if (error) {
          throw error;
        }

        if (data?.is_active === false) {
          applyAuthState(null, null);
          setInactiveMessage("Tu cuenta está inactiva. Consultá con el administrador.");

          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) {
            console.error(signOutError);
          }

          return;
        }

        setInactiveMessage("");
        applyAuthState(resolvedSession, data ?? null);
      } catch (error) {
        console.error(error);

        if (!mountedRef.current || bootstrapRef.current.requestId !== requestId) {
          return;
        }

        if (force) {
          applyAuthState(sessionOverride ?? null, null);
        }

        setBootstrapError("No pudimos validar tu cuenta. Reintentá para continuar.");
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }

        if (mountedRef.current && bootstrapRef.current.requestId === requestId) {
          setLoading(false);
        }

        const hasQueuedRequest = bootstrapRef.current.hasQueuedRequest;
        const queuedSession = bootstrapRef.current.queuedSession;
        const queuedForce = bootstrapRef.current.queuedForce;

        bootstrapRef.current.inFlight = false;
        bootstrapRef.current.promise = null;
        bootstrapRef.current.hasQueuedRequest = false;
        bootstrapRef.current.queuedSession = undefined;
        bootstrapRef.current.queuedForce = false;

        if (
          mountedRef.current &&
          hasQueuedRequest &&
          (queuedForce || getSessionUserId(queuedSession) !== getSessionUserId(sessionRef.current))
        ) {
          runBootstrap(queuedSession, { force: queuedForce });
        }
      }
    })();

    bootstrapRef.current.promise = bootstrapPromise;
    return bootstrapPromise;
  }

  useEffect(() => {
    mountedRef.current = true;
    runBootstrap(undefined, { force: true });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = getSessionUserId(nextSession);
      const currentUserId = getSessionUserId(sessionRef.current);

      if (nextUserId === currentUserId) {
        return;
      }

      runBootstrap(nextSession, { force: true });
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  async function runGuardedEmailAction(flow, email, callback, options = {}) {
    const { cooldownSeconds = 60, maxAttempts = 3, windowMs = 15 * 60 * 1000 } = options;
    const { email: normalizedEmail, error: emailError } = validateEmail(email, { required: true });

    if (emailError) {
      throw new Error(emailError);
    }

    if (actionLocksRef.current[flow]) {
      throw new Error("Ya estamos procesando esa solicitud.");
    }

    const guard = checkEmailActionGuard(flow, normalizedEmail, {
      cooldownSeconds,
      maxAttempts,
      windowMs,
    });

    if (!guard.allowed) {
      throw new Error(guard.error);
    }

    actionLocksRef.current[flow] = true;

    try {
      const functionName = import.meta.env.VITE_AUTH_EMAIL_GUARD_FUNCTION;

      if (functionName) {
        const backendFlowMap = {
          signup: "signup",
          "magic-link": "magic_link",
          "password-reset": "password_reset",
          "resend-confirmation": "resend_confirmation",
        };

        const { data: guardData, error: guardError } = await supabase.functions.invoke(functionName, {
          body: {
            flow: backendFlowMap[flow] ?? flow,
            email: normalizedEmail,
          },
        });

        if (guardError) {
          throw new Error("No pudimos validar el envío en el backend.");
        }

        if (!guardData?.allowed) {
          throw new Error(guardData?.message || "El envío fue bloqueado por seguridad.");
        }
      }

      registerEmailActionAttempt(flow, normalizedEmail, {
        cooldownSeconds,
        windowMs,
      });

      logAuthEmailEvent(`${flow}.requested`, { email: normalizedEmail });
      const result = await callback(normalizedEmail);
      logAuthEmailEvent(`${flow}.succeeded`, { email: normalizedEmail });
      return result;
    } catch (error) {
      logAuthEmailEvent(`${flow}.failed`, {
        email: normalizedEmail,
        message: error?.message ?? "",
      });
      throw new Error(mapAuthError(error, flow));
    } finally {
      delete actionLocksRef.current[flow];
    }
  }

  async function signIn(email, password) {
    setInactiveMessage("");

    const { email: normalizedEmail, error: emailError } = validateEmail(email, { required: true });

    if (emailError) {
      throw new Error(emailError);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw new Error(mapAuthError(error, "signin"));
    }
  }

  async function signUp(email, password) {
    setInactiveMessage("");

    return runGuardedEmailAction(
      "signup",
      email,
      async (normalizedEmail) => {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(AUTH_CALLBACK_PATH),
          },
        });

        if (error) {
          throw error;
        }

        return data;
      },
      {
        cooldownSeconds: 90,
        maxAttempts: 3,
      }
    );
  }

  async function resendConfirmation(email) {
    return runGuardedEmailAction(
      "resend-confirmation",
      email,
      async (normalizedEmail) => {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email: normalizedEmail,
          options: {
            emailRedirectTo: getAuthRedirectUrl(AUTH_CALLBACK_PATH),
          },
        });

        if (error) {
          throw error;
        }
      },
      {
        cooldownSeconds: 120,
        maxAttempts: 3,
      }
    );
  }

  async function sendMagicLink(email) {
    return runGuardedEmailAction(
      "magic-link",
      email,
      async (normalizedEmail) => {
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: getAuthRedirectUrl(AUTH_CALLBACK_PATH),
            shouldCreateUser: false,
          },
        });

        if (error) {
          throw error;
        }
      },
      {
        cooldownSeconds: 90,
        maxAttempts: 3,
      }
    );
  }

  async function sendPasswordReset(email) {
    return runGuardedEmailAction(
      "password-reset",
      email,
      async (normalizedEmail) => {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: getAuthRedirectUrl(UPDATE_PASSWORD_PATH),
        });

        if (error) {
          throw error;
        }
      },
      {
        cooldownSeconds: 120,
        maxAttempts: 3,
      }
    );
  }

  async function updatePassword(password) {
    if (!password || password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(mapAuthError(error, "update-password"));
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  function retryBootstrap() {
    runBootstrap(undefined, { force: true });
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      bootstrapError,
      inactiveMessage,
      signIn,
      signUp,
      resendConfirmation,
      sendMagicLink,
      sendPasswordReset,
      updatePassword,
      signOut,
      setProfile,
      retryBootstrap,
    }),
    [session, profile, loading, bootstrapError, inactiveMessage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
