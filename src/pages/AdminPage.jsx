import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import supabase from "../lib/supabaseClient";

function normalizeCommission(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function normalizeBarbershopName(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function AdminUserCard({ user, saving, onFieldChange, onSave }) {
  const commissionValue = Number(user.commission_percentage);
  const hasValidCommission =
    user.commission_percentage !== "" &&
    !Number.isNaN(commissionValue) &&
    commissionValue >= 0 &&
    commissionValue <= 100;
  const canSave = user.hasChanges && hasValidCommission && !saving;

  return (
    <article className="rounded-lg border border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)] lg:items-start">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-950">{user.full_name || "Sin nombre"}</h2>
            <Badge
              className={
                user.role === "admin"
                  ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50"
              }
              variant="outline"
            >
              {user.role === "admin" ? "Admin" : "Barber"}
            </Badge>
            <Badge
              className={
                user.is_active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                  : "bg-red-100 text-red-700"
              }
              variant="outline"
            >
              {user.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-slate-600">
            <p className="break-all">{user.email}</p>
            <p title={user.barbershop_name || ""}>
              Barberia:{" "}
              <span className={user.barbershop_name?.trim() ? "text-slate-700" : "text-slate-400 italic"}>
                {user.barbershop_name?.trim() || "Sin cargar"}
              </span>
            </p>
            <p>
              Alta:{" "}
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString("es-AR")
                : "Sin fecha"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_7rem] lg:grid-cols-[1fr_8rem]">
          <label className="flex min-h-10 items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-2">
            <span className="text-sm font-medium text-slate-800">Usuario activo</span>
            <input
              checked={user.is_active}
              className="h-5 w-5 accent-sky-600"
              onChange={(event) => onFieldChange(user.id, "is_active", event.target.checked)}
              type="checkbox"
            />
          </label>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor={`barbershop-${user.id}`}
            >
              Barberia
            </label>
            <Input
              id={`barbershop-${user.id}`}
              placeholder="Ej: Barberia Chinos"
              type="text"
              value={user.barbershop_name}
              onChange={(event) => onFieldChange(user.id, "barbershop_name", event.target.value)}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-700"
              htmlFor={`commission-${user.id}`}
            >
              Comision
            </label>
            <div className="relative">
              <Input
                className={`pr-8 ${
                  user.validationError ? "!border-red-400 !bg-red-50/70 !ring-2 !ring-red-100" : ""
                }`}
                id={`commission-${user.id}`}
                max="100"
                min="0"
                step="0.01"
                type="number"
                value={user.commission_percentage}
                onChange={(event) =>
                  onFieldChange(user.id, "commission_percentage", event.target.value)
                }
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-slate-500">
                %
              </span>
            </div>
            {user.validationError && (
              <p className="mt-2 text-sm text-red-600">{user.validationError}</p>
            )}
          </div>
        </div>
      </div>

      <Separator className="mt-4 bg-slate-200" />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          {!user.hasChanges && !user.saveMessage && (
            <p className="text-sm text-slate-500">Sin cambios pendientes.</p>
          )}
          {user.hasChanges && !user.validationError && (
            <p className="text-sm text-amber-700">Tenes cambios sin guardar.</p>
          )}
          {user.saveMessage && (
            <p
              className={`text-sm ${
                user.saveMessage.type === "success" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {user.saveMessage.text}
            </p>
          )}
        </div>

        <Button className="w-full bg-sky-600 text-white shadow-none hover:bg-sky-700 sm:w-auto sm:min-w-40" disabled={!canSave} onClick={() => onSave(user.id)}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </article>
  );
}

function mapUserToEditableState(user) {
  const barbershopName = normalizeBarbershopName(user.barbershop_name);

  return {
    ...user,
    barbershop_name: barbershopName,
    commission_percentage: normalizeCommission(user.commission_percentage),
    original_is_active: user.is_active,
    original_barbershop_name: barbershopName,
    original_commission_percentage: normalizeCommission(user.commission_percentage),
    hasChanges: false,
    validationError: "",
    saveMessage: null,
  };
}

export default function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  function getCommissionValidationMessage(value) {
    if (value === "") {
      return "Ingresa un porcentaje entre 0 y 100.";
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      return "El porcentaje debe estar entre 0 y 100.";
    }

    return "";
  }

  async function loadUsers() {
    if (profile?.role !== "admin") {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setUsers((data || []).map(mapUserToEditableState));
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [profile?.role]);

  function handleFieldChange(userId, field, value) {
    setUsers((currentUsers) =>
      currentUsers.map((user) => {
        if (user.id !== userId) {
          return user;
        }

        const nextUser = {
          ...user,
          [field]: value,
          saveMessage: null,
        };

        const validationError =
          field === "commission_percentage"
            ? getCommissionValidationMessage(value)
            : getCommissionValidationMessage(nextUser.commission_percentage);

        const hasChanges =
          nextUser.is_active !== nextUser.original_is_active ||
          normalizeBarbershopName(nextUser.barbershop_name).trim() !==
            normalizeBarbershopName(nextUser.original_barbershop_name).trim() ||
          normalizeCommission(nextUser.commission_percentage) !==
            nextUser.original_commission_percentage;

        return {
          ...nextUser,
          hasChanges,
          validationError,
        };
      })
    );
  }

  async function handleSave(userId) {
    const targetUser = users.find((user) => user.id === userId);
    if (!targetUser || !targetUser.hasChanges || targetUser.validationError) {
      return;
    }

    setSavingId(userId);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_active: targetUser.is_active,
          commission_percentage: Number(targetUser.commission_percentage),
          barbershop_name: targetUser.barbershop_name.trim() || null,
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => {
          if (user.id !== userId) {
            return user;
          }

          const normalizedBarbershopName = normalizeBarbershopName(user.barbershop_name).trim();

          return {
            ...user,
            barbershop_name: normalizedBarbershopName,
            original_is_active: user.is_active,
            original_barbershop_name: normalizedBarbershopName,
            original_commission_percentage: normalizeCommission(user.commission_percentage),
            hasChanges: false,
            validationError: "",
            saveMessage: {
              type: "success",
              text: "Cambios guardados correctamente.",
            },
          };
        })
      );
    } catch (saveError) {
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                saveMessage: {
                  type: "error",
                  text: saveError.message || "No se pudieron guardar los cambios.",
                },
              }
            : user
        )
      );
    } finally {
      setSavingId(null);
    }
  }

  if (profile?.role !== "admin") {
    return null;
  }

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const adminUsers = users.filter((user) => user.role === "admin").length;

  return (
    <div className="space-y-5">
      <section className="animate-card-in space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Admin</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Gestiona el acceso del equipo, el estado de cada cuenta, la barberia y la comision
              asignada a cada perfil.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                Usuarios
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{totalUsers}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-emerald-700">
                Activos
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">{activeUsers}</p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">
                Admins
              </p>
              <p className="mt-1 text-2xl font-semibold text-sky-700">{adminUsers}</p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <Alert className="rounded-lg border-red-200 bg-red-50 text-red-800" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="animate-card-in">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-36 rounded-lg bg-slate-200" />
            <Skeleton className="h-36 rounded-lg bg-slate-200" />
            <Skeleton className="h-36 rounded-lg bg-slate-200" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-6 text-sm text-slate-500">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <AdminUserCard
                key={user.id}
                onFieldChange={handleFieldChange}
                onSave={handleSave}
                saving={savingId === user.id}
                user={user}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
