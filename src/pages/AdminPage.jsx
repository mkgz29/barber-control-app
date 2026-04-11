import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

function UserRow({ user, onSave, saving }) {
  const [commission, setCommission] = useState(user.commission_percentage);
  const [isActive, setIsActive] = useState(user.is_active);
  const [error, setError] = useState("");

  useEffect(() => {
    setCommission(user.commission_percentage);
    setIsActive(user.is_active);
  }, [user.commission_percentage, user.is_active]);

  async function handleSave() {
    setError("");

    const numericCommission = Number(commission);
    if (Number.isNaN(numericCommission) || numericCommission < 0 || numericCommission > 100) {
      setError("El porcentaje debe ir de 0 a 100.");
      return;
    }

    try {
      await onSave(user.id, isActive, numericCommission);
    } catch (saveError) {
      setError(saveError.message || "No se pudo guardar.");
    }
  }

  return (
    <div className="rounded-3xl border border-stone-200 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{user.full_name || "Sin nombre"}</h2>
          <p className="text-sm text-stone-500">{user.email}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
            {user.role === "admin" ? "Admin" : "Barbero"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:min-w-[320px]">
          <label className="flex items-center gap-3 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700">
            <input
              checked={isActive}
              className="h-4 w-4"
              onChange={(event) => setIsActive(event.target.checked)}
              type="checkbox"
            />
            {isActive ? "Activo" : "Inactivo"}
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Porcentaje de comisión
            </label>
            <input
              className="input"
              min="0"
              max="100"
              step="0.01"
              type="number"
              value={commission}
              onChange={(event) => setCommission(event.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
        <button className="btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  async function loadUsers() {
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

      setUsers(data || []);
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSaveUser(profileId, isActive, commissionPercentage) {
    setSavingId(profileId);

    try {
      const { error: rpcError } = await supabase.rpc("admin_update_profile", {
        target_profile_id: profileId,
        new_is_active: isActive,
        new_commission_percentage: commissionPercentage,
      });

      if (rpcError) {
        throw rpcError;
      }

      await loadUsers();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
          Panel de administración
        </p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900">Panel de administración</h1>
        <p className="mt-2 text-sm text-stone-600">
          Gestioná usuarios, estado de cuenta y porcentaje de comisión.
        </p>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card p-6">
        {loading ? (
          <p className="text-sm text-stone-500">Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <UserRow
                key={user.id}
                onSave={handleSaveUser}
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
