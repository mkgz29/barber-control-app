import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "../lib/date";

const EMPTY_FORM = {
  service: "",
  price: "",
};

function getCardClassName({ featured, isToday }) {
  if (featured) {
    return "border-brand-200 bg-gradient-to-br from-brand-50 via-white to-stone-50 shadow-[0_24px_60px_-34px_rgba(20,83,45,0.35)]";
  }

  if (isToday) {
    return "border-brand-100 bg-brand-50/40";
  }

  return "border-stone-200 bg-white";
}

export default function DayCard({
  day,
  haircuts,
  onAddHaircut,
  onDeleteHaircut,
  onUpdateHaircut,
  saving,
  isToday = false,
  featured = false,
  badgeLabel = "",
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHaircutId, setEditingHaircutId] = useState(null);
  const [haircutToDelete, setHaircutToDelete] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const total = haircuts.reduce((sum, haircut) => sum + Number(haircut.price), 0);
  const commission = haircuts.reduce(
    (sum, haircut) => sum + Number(haircut.commission_amount),
    0
  );

  const editingHaircut = useMemo(
    () => haircuts.find((haircut) => haircut.id === editingHaircutId) ?? null,
    [editingHaircutId, haircuts]
  );

  useEffect(() => {
    if (!editingHaircut) {
      return;
    }

    setFormValues({
      service: editingHaircut.service ?? "",
      price: String(editingHaircut.price ?? ""),
    });
  }, [editingHaircut]);

  function openCreateForm() {
    setEditingHaircutId(null);
    setFormValues(EMPTY_FORM);
    setError("");
    setIsFormOpen(true);
  }

  function openEditForm(haircut) {
    setEditingHaircutId(haircut.id);
    setFormValues({
      service: haircut.service ?? "",
      price: String(haircut.price ?? ""),
    });
    setError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setIsFormOpen(false);
    setEditingHaircutId(null);
    setFormValues(EMPTY_FORM);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formValues.service.trim() || !formValues.price) {
      setError("Completa servicio y precio.");
      return;
    }

    const numericPrice = Number(formValues.price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setError("Ingresa un precio valido.");
      return;
    }

    const payload = {
      haircut_date: day.date,
      service: formValues.service.trim(),
      price: numericPrice,
    };

    try {
      if (editingHaircutId) {
        await onUpdateHaircut(editingHaircutId, payload);
      } else {
        await onAddHaircut(payload);
      }

      closeForm();
    } catch (submitError) {
      setError(submitError.message || "No se pudo guardar el corte.");
    }
  }

  async function handleConfirmDelete() {
    if (!haircutToDelete) {
      return;
    }

    setError("");

    try {
      await onDeleteHaircut(haircutToDelete.id);
      setHaircutToDelete(null);

      if (editingHaircutId === haircutToDelete.id) {
        closeForm();
      }
    } catch (submitError) {
      setError(submitError.message || "No se pudo eliminar el corte.");
      setHaircutToDelete(null);
    }
  }

  return (
    <section className={`card border p-4 transition-colors ${getCardClassName({ featured, isToday })}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900">{day.label}</h2>
            {badgeLabel && (
              <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                {badgeLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500">{day.shortLabel}</p>
        </div>

        <button className="btn-secondary shrink-0" onClick={openCreateForm} type="button">
          Agregar corte
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isFormOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <form className="space-y-3 rounded-2xl bg-stone-50 p-4" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-800">
                {editingHaircutId ? "Editar corte" : "Agregar corte"}
              </p>
              <button
                className="text-sm font-medium text-stone-500"
                onClick={closeForm}
                type="button"
              >
                Cancelar
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Servicio</label>
              <input
                className="input"
                placeholder="Ej: Corte clasico"
                value={formValues.service}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, service: event.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Precio</label>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="Ej: 8000"
                value={formValues.price}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, price: event.target.value }))
                }
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button className="btn-primary w-full" disabled={saving} type="submit">
              {saving ? "Guardando..." : editingHaircutId ? "Guardar cambios" : "Guardar corte"}
            </button>
          </form>
        </div>
      </div>

      {haircutToDelete && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-stone-900">Quieres eliminar este corte?</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              className="btn-secondary w-full sm:w-auto"
              disabled={saving}
              onClick={() => setHaircutToDelete(null)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="btn-primary w-full bg-red-600 hover:bg-red-700 sm:w-auto"
              disabled={saving}
              onClick={handleConfirmDelete}
              type="button"
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-stone-100 p-3">
          <p className="text-sm text-stone-500">Cantidad de cortes</p>
          <p className="mt-1 text-xl font-bold text-stone-900">{haircuts.length}</p>
        </div>
        <div className="rounded-2xl bg-stone-100 p-3">
          <p className="text-sm text-stone-500">Total del dia</p>
          <p className="mt-1 text-xl font-bold text-stone-900">{formatCurrency(total)}</p>
        </div>
        <div className="rounded-2xl bg-brand-50 p-3">
          <p className="text-sm text-stone-500">Tu comision del dia</p>
          <p className="mt-1 text-xl font-bold text-brand-700">{formatCurrency(commission)}</p>
        </div>
      </div>

      <div className="mt-4">
        {haircuts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
            Todavia no cargaste cortes para este dia.
          </div>
        ) : (
          <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1 sm:max-h-[22rem]">
            {haircuts.map((haircut) => (
              <div
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={haircut.id}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">{haircut.service}</p>
                  <p className="text-sm text-stone-500">
                    Comision: {formatCurrency(haircut.commission_amount)}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  <p className="font-bold text-stone-900">{formatCurrency(haircut.price)}</p>
                  <div className="flex gap-2">
                    <button
                      className="rounded-xl border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700"
                      disabled={saving}
                      onClick={() => openEditForm(haircut)}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700"
                      disabled={saving}
                      onClick={() => setHaircutToDelete(haircut)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
