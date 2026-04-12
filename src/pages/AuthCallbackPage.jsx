import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import LoadingScreen from "../components/LoadingScreen";
import supabase from "../lib/supabaseClient";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveCallback() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw exchangeError;
          }
        }

        if (!cancelled) {
          setStatus("success");
        }
      } catch (callbackError) {
        if (!cancelled) {
          setError(callbackError.message || "No pudimos confirmar tu cuenta.");
          setStatus("error");
        }
      }
    }

    resolveCallback();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return <LoadingScreen message="Confirmando tu cuenta..." />;
  }

  if (status === "error") {
    return <Navigate replace state={{ message: error, type: "error" }} to="/auth" />;
  }

  return (
    <Navigate
      replace
      state={{ message: "Cuenta confirmada. Ya podés ingresar a Agenda Barber.", type: "success" }}
      to="/auth"
    />
  );
}
