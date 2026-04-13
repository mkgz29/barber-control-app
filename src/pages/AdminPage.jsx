import { useEffect, useState } from "react";
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
    <article className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-5 shadow-sm transition">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-stone-950">{user.full_name || "Sin nombre"}</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                user.role === "admin"
                  ? "bg-brand-100 text-brand-800"
                  : "bg-stone-200 text-stone-700"
              }`}
            >
              {user.role === "admin" ? "Admin" : "Barber"}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                user.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {user.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>

          <div className="space-y-1 text-sm text-stone-600">
            <p>{user.email}</p>
            <p title={user.barbershop_name || ""}>
              Barberia:{" "}
              <span className={user.barbershop_name?.trim() ? "text-stone-700" : "text-stone-400 italic"}>
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

        <div className="grid gap-4 lg:min-w-[380px] lg:max-w-[420px] lg:flex-1">
          <label className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
            <span className="text-sm font-semibold text-stone-800">Usuario activo</span>
            <input
              checked={user.is_active}
              className="h-5 w-5 accent-stone-900"
              onChange={(event) => onFieldChange(user.id, "is_active", event.target.checked)}
              type="checkbox"
            />
          </label>

          <div>
            <label
              className="mb-2 block text-sm font-semibold text-stone-800"
              htmlFor={`barbershop-${user.id}`}
            >
              Barberia
            </label>
            <input
              className="input"
              id={`barbershop-${user.id}`}
              placeholder="Ej: Barberia Chinos"
              type="text"
              value={user.barbershop_name}
              onChange={(event) => onFieldChange(user.id, "barbershop_name", event.target.value)}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-semibold text-stone-800"
              htmlFor={`commission-${user.id}`}
            >
              Porcentaje de comision
            </label>
            <div className="relative">
              <input
                className={`input pr-10 ${
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
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-stone-500">
                %
              </span>
            </div>
            {user.validationError && (
              <p className="mt-2 text-sm text-red-600">{user.validationError}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          {!user.hasChanges && !user.saveMessage && (
            <p className="text-sm text-stone-500">Sin cambios pendientes.</p>
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

        <button className="btn-primary sm:min-w-[180px]" disabled={!canSave} onClick={() => onSave(user.id)}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
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
      <section className="card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
              Agenda Barber
            </p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Administracion de usuarios</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Gestiona el acceso del equipo, el estado de cada cuenta, la barberia y la comision
              asignada a cada perfil.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-stone-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Usuarios
              </p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{totalUsers}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Activos
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-800">{activeUsers}</p>
            </div>
            <div className="rounded-2xl bg-brand-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Admins
              </p>
              <p className="mt-1 text-2xl font-bold text-brand-800">{adminUsers}</p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card p-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-3xl bg-stone-100" />
            <div className="h-24 animate-pulse rounded-3xl bg-stone-100" />
            <div className="h-24 animate-pulse rounded-3xl bg-stone-100" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="space-y-4">
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
