import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Save, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/date";
import { normalizeServiceName } from "../lib/services";
import supabase from "../lib/supabaseClient";

const EMPTY_FORM = {
  name: "",
  price: "",
};

function validateService(values, services, editingId = null) {
  const name = String(values.name || "").trim();
  const normalizedName = normalizeServiceName(name);
  const price = Number(values.price);

  if (!name) {
    return "Ingresa el nombre del servicio.";
  }

  if (values.price === "" || Number.isNaN(price) || price < 0) {
    return "Ingresa un precio valido mayor o igual a 0.";
  }

  const duplicated = services.some(
    (service) =>
      service.id !== editingId &&
      normalizeServiceName(service.name) === normalizedName
  );

  if (duplicated) {
    return "Ya existe un servicio con ese nombre.";
  }

  return "";
}

function ServiceForm({
  values,
  onChange,
  onCancel,
  onSubmit,
  saving,
  submitLabel,
  title,
}) {
  return (
    <form className="rounded-lg border border-slate-200 bg-slate-50 p-3" onSubmit={onSubmit}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        {onCancel && (
          <Button
            className="h-8 px-2 text-slate-500 hover:text-slate-950"
            disabled={saving}
            onClick={onCancel}
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancelar
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
          <Input
            disabled={saving}
            placeholder="Ej: Corte + Barba"
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Precio</label>
          <Input
            disabled={saving}
            inputMode="numeric"
            min="0"
            placeholder="15000"
            type="number"
            value={values.price}
            onChange={(event) => onChange("price", event.target.value)}
          />
        </div>

        <Button className="w-full bg-sky-600 text-white shadow-none hover:bg-sky-700 sm:w-auto" disabled={saving} type="submit">
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? "Guardando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ServiceCard({
  service,
  editing,
  editValues,
  onEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onToggleActive,
  saving,
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-3 py-3 sm:px-4">
      {editing ? (
        <ServiceForm
          saving={saving}
          submitLabel="Guardar"
          title="Editar servicio"
          values={editValues}
          onCancel={onCancelEdit}
          onChange={onEditChange}
          onSubmit={onSaveEdit}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-slate-950">
                  {service.name}
                </h2>
                <Badge
                  className={
                    service.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                      : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100"
                  }
                  variant="outline"
                >
                  {service.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
                {formatCurrency(service.price)}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                className="w-full border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50 sm:w-auto"
                disabled={saving}
                onClick={onEdit}
                type="button"
                variant="outline"
              >
                Editar
              </Button>
              <Button
                className={`w-full shadow-none sm:w-auto ${
                  service.is_active
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
                disabled={saving}
                onClick={onToggleActive}
                type="button"
                variant="outline"
              >
                {service.is_active ? "Desactivar" : "Reactivar"}
              </Button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

export default function ServicesPage() {
  const { profile } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const activeCount = useMemo(
    () => services.filter((service) => service.is_active).length,
    [services]
  );

  async function loadServices() {
    if (profile?.role !== "admin") {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("services")
        .select("id,name,price,is_active,created_at,updated_at")
        .order("is_active", { ascending: false })
        .order("name", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setServices(data || []);
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los servicios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, [profile?.role]);

  function handleCreateChange(field, value) {
    setCreateValues((current) => ({ ...current, [field]: value }));
    setError("");
    setMessage("");
  }

  function handleEditChange(field, value) {
    setEditValues((current) => ({ ...current, [field]: value }));
    setError("");
    setMessage("");
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateService(createValues, services);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingId("create");

    try {
      const { error: insertError } = await supabase.from("services").insert({
        name: createValues.name.trim().replace(/\s+/g, " "),
        price: Number(createValues.price),
        is_active: true,
      });

      if (insertError) {
        throw insertError;
      }

      setCreateValues(EMPTY_FORM);
      setCreateOpen(false);
      setMessage("Servicio creado correctamente.");
      await loadServices();
    } catch (createError) {
      setError(createError.message || "No se pudo crear el servicio.");
    } finally {
      setSavingId(null);
    }
  }

  function openEdit(service) {
    setEditingId(service.id);
    setEditValues({
      name: service.name,
      price: String(service.price ?? ""),
    });
    setError("");
    setMessage("");
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateService(editValues, services, editingId);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingId(editingId);

    try {
      const { error: updateError } = await supabase
        .from("services")
        .update({
          name: editValues.name.trim().replace(/\s+/g, " "),
          price: Number(editValues.price),
        })
        .eq("id", editingId);

      if (updateError) {
        throw updateError;
      }

      setEditingId(null);
      setEditValues(EMPTY_FORM);
      setMessage("Servicio actualizado correctamente.");
      await loadServices();
    } catch (updateError) {
      setError(updateError.message || "No se pudo actualizar el servicio.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggleActive(service) {
    setSavingId(service.id);
    setError("");
    setMessage("");

    try {
      const { error: updateError } = await supabase
        .from("services")
        .update({ is_active: !service.is_active })
        .eq("id", service.id);

      if (updateError) {
        throw updateError;
      }

      setMessage(service.is_active ? "Servicio desactivado." : "Servicio reactivado.");
      await loadServices();
    } catch (updateError) {
      setError(updateError.message || "No se pudo cambiar el estado del servicio.");
    } finally {
      setSavingId(null);
    }
  }

  if (profile?.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-5">
      <section className="animate-card-in space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
              Servicios
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Gestiona los servicios disponibles y sus precios para normalizar la carga de cortes.
            </p>
          </div>

          <Button
            className="w-full bg-sky-600 text-white shadow-none hover:bg-sky-700 sm:w-auto"
            disabled={savingId === "create"}
            onClick={() => {
              setCreateOpen(true);
              setCreateValues(EMPTY_FORM);
              setEditingId(null);
              setError("");
              setMessage("");
            }}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo servicio
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Total
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{services.length}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-emerald-700">
              Activos
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{activeCount}</p>
          </div>
          <div className="col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 sm:col-span-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Inactivos
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {services.length - activeCount}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <Alert className="rounded-lg border-red-200 bg-red-50 text-red-800" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {message && (
        <Alert className="rounded-lg border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {createOpen && (
        <section className="animate-card-in">
          <ServiceForm
            saving={savingId === "create"}
            submitLabel="Crear"
            title="Nuevo servicio"
            values={createValues}
            onCancel={() => {
              setCreateOpen(false);
              setCreateValues(EMPTY_FORM);
              setError("");
            }}
            onChange={handleCreateChange}
            onSubmit={handleCreateSubmit}
          />
        </section>
      )}

      <section className="animate-card-in">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-950">Catalogo</h2>
          <Button
            className="h-9 border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50"
            disabled={loading}
            onClick={loadServices}
            type="button"
            variant="outline"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualizar
          </Button>
        </div>

        <Separator className="mt-3 bg-slate-200" />

        {loading ? (
          <div className="mt-3 space-y-3">
            <Skeleton className="h-24 rounded-lg bg-slate-200" />
            <Skeleton className="h-24 rounded-lg bg-slate-200" />
            <Skeleton className="h-24 rounded-lg bg-slate-200" />
          </div>
        ) : services.length === 0 ? (
          <div className="py-6 text-sm text-slate-500">
            Todavia no hay servicios cargados.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {services.map((service) => (
              <ServiceCard
                editValues={editValues}
                editing={editingId === service.id}
                key={service.id}
                saving={savingId === service.id}
                service={service}
                onCancelEdit={() => {
                  setEditingId(null);
                  setEditValues(EMPTY_FORM);
                  setError("");
                }}
                onEdit={() => openEdit(service)}
                onEditChange={handleEditChange}
                onSaveEdit={handleEditSubmit}
                onToggleActive={() => handleToggleActive(service)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
