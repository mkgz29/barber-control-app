import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BarberAvatar from "../components/BarberAvatar";
import { useAuth } from "../context/AuthContext";
import {
  AVATAR_BUCKET,
  getAvatarObjectPath,
  normalizeAvatarObjectPath,
  validateAvatarFile,
} from "../lib/avatar";
import supabase from "../lib/supabaseClient";

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [barbershopName, setBarbershopName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setBarbershopName(profile?.barbershop_name || "");
  }, [profile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (uploadingAvatar) {
      return;
    }

    setAvatarError("");

    const validationError = validateAvatarFile(file);
    if (validationError) {
      setAvatarError(validationError);
      return;
    }

    if (!user?.id) {
      setAvatarError("No pudimos identificar tu usuario.");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return nextPreviewUrl;
    });
    setUploadingAvatar(true);

    try {
      const avatarPath = getAvatarObjectPath(user.id, file);
      const previousAvatarPath = normalizeAvatarObjectPath(profile?.avatar_url);

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(avatarPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarPath })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setProfile(data);

      if (
        previousAvatarPath &&
        previousAvatarPath !== avatarPath &&
        previousAvatarPath.startsWith(`${user.id}/`)
      ) {
        await supabase.storage.from(AVATAR_BUCKET).remove([previousAvatarPath]);
      }
    } catch (uploadError) {
      setAvatarError(uploadError.message || "No se pudo subir la foto.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving || uploadingAvatar) {
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
            avatar_url: profile?.avatar_url || null,
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
          <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-5">
            <div className="relative">
              <BarberAvatar
                className="ring-4 ring-white"
                name={fullName || profile?.full_name || "Mi cuenta"}
                size="xl"
                src={avatarPreviewUrl || profile?.avatar_url}
              />
              <button
                aria-label="Cambiar foto"
                className="absolute bottom-0 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <input
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploadingAvatar}
              onChange={handleAvatarChange}
              ref={fileInputRef}
              type="file"
            />

            <Button
              className="h-8 border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              {uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
            </Button>

            {avatarError && (
              <p className="text-center text-sm text-red-600">{avatarError}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
            <Input
              placeholder="Ej: Juan Perez"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              disabled={saving || uploadingAvatar}
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
              disabled={saving || uploadingAvatar}
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

          <Button className="w-full bg-sky-600 text-white shadow-none hover:bg-sky-700 sm:w-auto" disabled={saving || uploadingAvatar} type="submit">
            {saving ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </form>
      </section>
    </div>
  );
}
