import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [barbershopName, setBarbershopName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setBarbershopName(profile?.barbershop_name || "");
  }, [profile]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!fullName.trim()) {
      setError("Ingresa tu nombre completo.");
      return;
    }

    setSaving(true);

    try {
      const fullNameValue = fullName.trim();
      const barbershopNameValue = barbershopName.trim();
      const { data, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email,
            full_name: fullNameValue,
            barbershop_name: barbershopNameValue || null,
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
    <div className="max-w-2xl">
      <section className="animate-card-in">
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Perfil</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Datos personales y configuracion de tu cuenta.
        </p>

        <form className="mt-5 space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
            <Input
              placeholder="Ej: Juan Perez"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre de tu barberia
            </label>
            <Input
              placeholder="Ej: Barberia Chinos"
              value={barbershopName}
              onChange={(event) => setBarbershopName(event.target.value)}
              disabled={saving}
            />
          </div>

          {profile?.commission_percentage != null && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              <span>Comision actual</span>
              <Badge className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50" variant="outline">
                {Number(profile.commission_percentage)}%
              </Badge>
            </div>
          )}

          {error && (
            <Alert className="border-red-200 bg-red-50 text-red-800" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button className="w-full bg-sky-600 text-white shadow-none hover:bg-sky-700 sm:w-auto" disabled={saving} type="submit">
            {saving ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </form>
      </section>
    </div>
  );
}
