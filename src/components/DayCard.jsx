import { useEffect, useMemo, useState } from "react";
import { Clock, Pencil, Plus, Trash2, X } from "lucide-react";
import { formatArgentinaTime, formatAttendanceType, formatCurrency } from "../lib/date";

const EMPTY_FORM = {
  service: "",
  price: "",
  attendance_type: "walk_in",
};

function getCardClassName({ featured, isToday }) {
  if (featured) {
    return "border-brand-200 bg-[linear-gradient(145deg,rgba(255,247,241,0.96)_0%,rgba(255,255,255,0.96)_55%,rgba(250,250,249,0.94)_100%)] shadow-[0_22px_50px_-36px_rgba(89,47,37,0.45)]";
  }

  if (isToday) {
    return "border-brand-100 bg-brand-50/35";
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
      attendance_type: editingHaircut.attendance_type ?? "walk_in",
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
      attendance_type: haircut.attendance_type ?? "walk_in",
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

    if (!formValues.service.trim() || !formValues.price || !formValues.attendance_type) {
      setError("Completa servicio, precio y tipo de atencion.");
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
      attendance_type: formValues.attendance_type,
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
    <section
      className={`card animate-card-in border p-4 transition-colors ${getCardClassName({
        featured,
        isToday,
      })}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-950">{day.label}</h2>
            {badgeLabel && <span className="badge badge-brand">{badgeLabel}</span>}
          </div>
          <p className="text-sm text-stone-500">{day.shortLabel}</p>
        </div>

        <button className="btn-secondary w-full shrink-0 sm:w-auto" onClick={openCreateForm} type="button">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Agregar corte
        </button>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isFormOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <form
            className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50/80 p-4"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-stone-900">
                {editingHaircutId ? "Editar corte" : "Agregar corte"}
              </p>
              <button
                className="inline-flex min-h-9 items-center rounded-xl px-2 text-sm font-semibold text-stone-500 transition hover:bg-white hover:text-stone-900"
                onClick={closeForm}
                type="button"
              >
                <X className="mr-1 h-4 w-4" aria-hidden="true" />
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

            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-stone-700">
                Tipo de atencion
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { value: "walk_in", label: "Orden de llegada" },
                  { value: "appointment", label: "Con turno" },
                ].map((option) => (
                  <label
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                      formValues.attendance_type === option.value
                        ? "border-brand-500 bg-brand-50 text-brand-800 shadow-[inset_0_0_0_1px_rgba(199,109,69,0.12)]"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                    key={option.value}
                  >
                    <input
                      checked={formValues.attendance_type === option.value}
                      className="sr-only"
                      name={`attendance-type-${day.date}`}
                      onChange={() =>
                        setFormValues((current) => ({
                          ...current,
                          attendance_type: option.value,
                        }))
                      }
                      required
                      type="radio"
                      value={option.value}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

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

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Cortes</p>
          <p className="mt-1 text-xl font-semibold text-stone-950">{haircuts.length}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Total</p>
          <p className="mt-1 text-xl font-semibold text-stone-950">{formatCurrency(total)}</p>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-brand-50/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Comision
          </p>
          <p className="mt-1 text-xl font-semibold text-brand-800">
            {formatCurrency(commission)}
          </p>
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
                className="tap-card grid gap-3 rounded-2xl border border-stone-200 bg-white/90 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-4"
                key={haircut.id}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-600 sm:block sm:min-w-[4.5rem]">
                  <Clock className="h-4 w-4 text-brand-700 sm:mx-auto sm:mb-1" aria-hidden="true" />
                  <span className="sm:block sm:text-center">
                    {formatArgentinaTime(haircut.recorded_at ?? haircut.created_at)}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="break-words font-semibold text-stone-950">{haircut.service}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="badge normal-case tracking-normal">
                      {formatAttendanceType(haircut.attendance_type)}
                    </span>
                    <span className="text-sm text-stone-500">
                      Comision: {formatCurrency(haircut.commission_amount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-end">
                  <p className="text-lg font-semibold text-stone-950">
                    {formatCurrency(haircut.price)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="inline-flex min-h-9 items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
                      disabled={saving}
                      onClick={() => openEditForm(haircut)}
                      type="button"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Editar
                    </button>
                    <button
                      className="inline-flex min-h-9 items-center rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      disabled={saving}
                      onClick={() => setHaircutToDelete(haircut)}
                      type="button"
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
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
