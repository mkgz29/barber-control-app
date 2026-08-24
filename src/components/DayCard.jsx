import { useEffect, useMemo, useState } from "react";
import { Clock, Pencil, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatArgentinaTime, formatAttendanceType, formatCurrency } from "../lib/date";
import {
  getHaircutBasePrice,
  getHaircutFinalPrice,
  getHaircutServiceName,
} from "../lib/services";

const EMPTY_FORM = {
  service_id: "",
  service_name_snapshot: "",
  base_price: "",
  final_price: "",
  attendance_type: "walk_in",
};

function getSectionClassName({ featured, isToday }) {
  if (featured) {
    return "border-sky-200 border-l-sky-500 bg-sky-50/45";
  }

  if (isToday) {
    return "border-sky-100 border-l-sky-400 bg-sky-50/35";
  }

  return "border-slate-200 bg-white";
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
  createRequestKey = 0,
  services = [],
  servicesLoading = false,
  servicesError = "",
  onReloadServices,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHaircutId, setEditingHaircutId] = useState(null);
  const [haircutToDelete, setHaircutToDelete] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const total = haircuts.reduce((sum, haircut) => sum + getHaircutFinalPrice(haircut), 0);
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
      service_id: editingHaircut.service_id ?? "",
      service_name_snapshot: getHaircutServiceName(editingHaircut),
      base_price: String(getHaircutBasePrice(editingHaircut)),
      final_price: String(getHaircutFinalPrice(editingHaircut)),
      attendance_type: editingHaircut.attendance_type ?? "walk_in",
    });
  }, [editingHaircut]);

  function openCreateForm() {
    setEditingHaircutId(null);
    setFormValues(EMPTY_FORM);
    setError("");
    setIsFormOpen(true);
  }

  useEffect(() => {
    if (!createRequestKey) {
      return;
    }

    openCreateForm();
  }, [createRequestKey]);

  function openEditForm(haircut) {
    setEditingHaircutId(haircut.id);
    setFormValues({
      service_id: haircut.service_id ?? "",
      service_name_snapshot: getHaircutServiceName(haircut),
      base_price: String(getHaircutBasePrice(haircut)),
      final_price: String(getHaircutFinalPrice(haircut)),
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

    const selectedService = services.find((service) => service.id === formValues.service_id);
    const isEditingHistoricalService = editingHaircutId && !selectedService;
    const isSameCatalogService =
      editingHaircut?.service_id && editingHaircut.service_id === selectedService?.id;

    if (!editingHaircutId && !selectedService) {
      setError("Selecciona un servicio.");
      return;
    }

    if (!formValues.final_price || !formValues.attendance_type) {
      setError("Completa precio y tipo de atencion.");
      return;
    }

    const numericPrice = Number(formValues.final_price);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setError("Ingresa un precio valido.");
      return;
    }

    const serviceName =
      isSameCatalogService || !selectedService
        ? formValues.service_name_snapshot
        : selectedService.name;
    const basePrice =
      isSameCatalogService || !selectedService
        ? Number(formValues.base_price || numericPrice)
        : selectedService.price;

    const payload = {
      haircut_date: day.date,
      service_id: selectedService?.id || (isEditingHistoricalService ? formValues.service_id || null : null),
      service_name_snapshot: serviceName,
      base_price: basePrice,
      final_price: numericPrice,
      service: serviceName,
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

  function handleSelectService(service) {
    if (editingHaircut?.service_id === service.id) {
      setFormValues((current) => ({
        ...current,
        service_id: service.id,
      }));
      setError("");
      return;
    }

    setFormValues((current) => ({
      ...current,
      service_id: service.id,
      service_name_snapshot: service.name,
      base_price: String(service.price),
      final_price: String(service.price),
    }));
    setError("");
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
      className={`animate-card-in rounded-lg border border-l-4 px-3 py-2.5 transition-colors sm:px-4 ${getSectionClassName({
        featured,
        isToday,
      })}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold uppercase tracking-[0.08em] text-slate-950">
              {featured ? "Actividad" : day.label}
            </h2>
            {badgeLabel && (
              <Badge className="h-5 border-sky-200 bg-white text-[10px] text-sky-700 hover:bg-white" variant="outline">
                {badgeLabel}
              </Badge>
            )}
          </div>
          {!featured && <p className="text-sm text-slate-500">{day.shortLabel}</p>}
        </div>

        <Button className="h-9 w-full bg-sky-600 text-white shadow-none hover:bg-sky-700 sm:w-auto" onClick={openCreateForm} type="button">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo corte
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 rounded-md bg-white/75 px-2 py-2 ring-1 ring-slate-200/70">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Cortes</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-950 sm:text-base">{haircuts.length}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Total</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-950 sm:text-base">{formatCurrency(total)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">Comision</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-950 sm:text-base">{formatCurrency(commission)}</p>
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isFormOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <form
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            onSubmit={handleSubmit}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">
                {editingHaircutId ? "Editar corte" : "Nuevo corte"}
              </p>
              <Button
                className="h-8 px-2 text-slate-500 hover:text-slate-950"
                onClick={closeForm}
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancelar
              </Button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Selecciona un servicio
                  </label>
                  {servicesError && onReloadServices && (
                    <Button
                      className="h-8 border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50"
                      onClick={onReloadServices}
                      type="button"
                      variant="outline"
                    >
                      Reintentar
                    </Button>
                  )}
                </div>

                {servicesLoading ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[0, 1, 2].map((item) => (
                      <div className="h-20 rounded-lg bg-slate-200" key={item} />
                    ))}
                  </div>
                ) : servicesError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {servicesError}
                  </div>
                ) : services.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
                    No hay servicios activos disponibles.
                  </div>
                ) : (
                  <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {services.map((service) => {
                      const isSelected = formValues.service_id === service.id;

                      return (
                        <button
                          className={`min-h-20 rounded-lg border px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? "border-sky-300 bg-sky-50 text-sky-800"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                          key={service.id}
                          onClick={() => handleSelectService(service)}
                          type="button"
                        >
                          <span className="block truncate text-sm font-semibold text-slate-950">
                            {service.name}
                          </span>
                          <span className="mt-1 block text-sm font-semibold tabular-nums text-slate-700">
                            {formatCurrency(service.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {formValues.service_name_snapshot && (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                    Servicio seleccionado
                  </p>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {formValues.service_name_snapshot}
                      </p>
                      <p className="text-xs text-slate-500">
                        Precio catalogo: {formatCurrency(formValues.base_price)}
                      </p>
                    </div>
                    {editingHaircutId && !formValues.service_id && (
                      <Badge className="w-fit border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50" variant="outline">
                        Historico
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="sm:max-w-44">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Precio a cobrar
                </label>
                <Input
                  inputMode="numeric"
                  min="0"
                  placeholder="15000"
                  type="number"
                  value={formValues.final_price}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, final_price: event.target.value }))
                  }
                />
              </div>
            </div>

            <fieldset className="mt-3">
              <legend className="mb-2 block text-sm font-medium text-slate-700">
                Tipo de atencion
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {[
                  { value: "walk_in", label: "Orden de llegada" },
                  { value: "appointment", label: "Con turno" },
                ].map((option) => (
                  <label
                    className={`flex min-h-10 cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      formValues.attendance_type === option.value
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
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

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <Button className="mt-3 w-full bg-sky-600 text-white shadow-none hover:bg-sky-700" disabled={saving} type="submit">
              {saving ? "Guardando..." : editingHaircutId ? "Guardar cambios" : "Guardar corte"}
            </Button>
          </form>
        </div>
      </div>

      {haircutToDelete && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-slate-950">Quieres eliminar este corte?</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              className="w-full border-red-200 bg-white text-slate-700 shadow-none hover:bg-red-50 sm:w-auto"
              disabled={saving}
              onClick={() => setHaircutToDelete(null)}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="w-full bg-red-600 text-white shadow-none hover:bg-red-700 sm:w-auto"
              disabled={saving}
              onClick={handleConfirmDelete}
              type="button"
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </div>
      )}

      <Separator className="mt-2 bg-slate-200" />

      <div className="mt-1">
        {haircuts.length === 0 ? (
          <div className="py-3 text-sm text-slate-500">
            Todavia no cargaste cortes para este dia.
          </div>
        ) : (
          <div>
            {haircuts.map((haircut, index) => (
              <div key={haircut.id}>
                <div className="grid gap-2 py-2.5 text-sm sm:grid-cols-[4.25rem_minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="flex items-center gap-1.5 font-medium tabular-nums text-slate-500">
                    <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    {formatArgentinaTime(haircut.recorded_at ?? haircut.created_at)}
                  </div>

                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-950">
                      {getHaircutServiceName(haircut)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge className="border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-50" variant="outline">
                        {formatAttendanceType(haircut.attendance_type)}
                      </Badge>
                      {haircut.service_id ? (
                        <Badge className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50" variant="outline">
                          Catalogo
                        </Badge>
                      ) : null}
                      <span className="text-xs text-slate-500">
                        Comision {formatCurrency(haircut.commission_amount)}
                      </span>
                      {getHaircutBasePrice(haircut) !== getHaircutFinalPrice(haircut) && (
                        <span className="text-xs text-slate-500">
                          Base {formatCurrency(getHaircutBasePrice(haircut))}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-base font-semibold text-slate-950 sm:text-right">
                    {formatCurrency(getHaircutFinalPrice(haircut))}
                  </p>

                  <div className="flex w-full rounded-md border border-slate-200 bg-white p-0.5 sm:w-auto">
                    <Button
                      aria-label={`Editar corte ${getHaircutServiceName(haircut)}`}
                      className="h-8 flex-1 rounded-sm px-2 text-sky-700 hover:bg-sky-50 hover:text-sky-800 sm:flex-none"
                      disabled={saving}
                      onClick={() => openEditForm(haircut)}
                      type="button"
                      variant="ghost"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      aria-label={`Eliminar corte ${getHaircutServiceName(haircut)}`}
                      className="h-8 flex-1 rounded-sm px-2 text-red-700 hover:bg-red-50 hover:text-red-800 sm:flex-none"
                      disabled={saving}
                      onClick={() => setHaircutToDelete(haircut)}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Eliminar
                    </Button>
                  </div>
                </div>
                {index < haircuts.length - 1 && <Separator className="bg-slate-200" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
