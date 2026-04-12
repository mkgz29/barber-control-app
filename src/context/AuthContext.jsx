import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import supabase from "../lib/supabaseClient";

const BOOTSTRAP_TIMEOUT_MS = 8000;

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

  async function signIn(email, password) {
    setInactiveMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }

  async function signUp(email, password) {
    setInactiveMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
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
