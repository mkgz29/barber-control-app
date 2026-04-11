import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name || "");
  }, [profile]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!fullName.trim()) {
      setError("Ingresá tu nombre completo.");
      return;
    }

    setSaving(true);

    try {
      const fullNameValue = fullName.trim();
      const { data, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullNameValue,
          },
          { onConflict: "id" }
        )
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      setProfile(data);
      navigate("/semana", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <section className="card p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
          Perfil
        </p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900">Completá tu perfil</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Este dato se usa para identificar tu cuenta dentro de la barbería.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Nombre completo</label>
            <input
              className="input"
              placeholder="Ej: Juan Pérez"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={saving}
            />
          </div>

          {profile?.commission_percentage != null && (
            <div className="rounded-2xl bg-brand-50 p-4 text-sm text-stone-700">
              Tu comisión actual es de <strong>{Number(profile.commission_percentage)}%</strong>.
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="btn-primary w-full sm:w-auto" disabled={saving} type="submit">
            {saving ? "Guardando..." : "Guardar y continuar"}
          </button>
        </form>
      </section>
    </div>
  );
}
