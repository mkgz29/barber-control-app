import { useState } from "react";
import { formatCurrency } from "../lib/date";

export default function DayCard({ day, haircuts, onAddHaircut, saving }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [service, setService] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  const total = haircuts.reduce((sum, haircut) => sum + Number(haircut.price), 0);
  const commission = haircuts.reduce(
    (sum, haircut) => sum + Number(haircut.commission_amount),
    0
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!service.trim() || !price) {
      setError("Completá servicio y precio.");
      return;
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setError("Ingresá un precio válido.");
      return;
    }

    try {
      await onAddHaircut({
        haircut_date: day.date,
        service: service.trim(),
        price: numericPrice,
      });

      setService("");
      setPrice("");
      setIsFormOpen(false);
    } catch (submitError) {
      setError(submitError.message);
    }
  }

  return (
    <section className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{day.label}</h2>
          <p className="text-sm text-stone-500">{day.shortLabel}</p>
        </div>

        <button className="btn-secondary" onClick={() => setIsFormOpen((current) => !current)}>
          Agregar corte
        </button>
      </div>

      {isFormOpen && (
        <form className="mt-4 space-y-3 rounded-2xl bg-stone-50 p-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">Servicio</label>
            <input
              className="input"
              placeholder="Ej: Corte clásico"
              value={service}
              onChange={(event) => setService(event.target.value)}
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
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="btn-primary w-full" disabled={saving} type="submit">
            {saving ? "Guardando..." : "Guardar corte"}
          </button>
        </form>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-stone-100 p-3">
          <p className="text-sm text-stone-500">Cantidad de cortes</p>
          <p className="mt-1 text-xl font-bold text-stone-900">{haircuts.length}</p>
        </div>
        <div className="rounded-2xl bg-stone-100 p-3">
          <p className="text-sm text-stone-500">Total del día</p>
          <p className="mt-1 text-xl font-bold text-stone-900">{formatCurrency(total)}</p>
        </div>
        <div className="rounded-2xl bg-brand-50 p-3">
          <p className="text-sm text-stone-500">Tu comisión del día</p>
          <p className="mt-1 text-xl font-bold text-brand-700">{formatCurrency(commission)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {haircuts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
            Todavía no cargaste cortes para este día.
          </div>
        ) : (
          haircuts.map((haircut) => (
            <div
              className="flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-3"
              key={haircut.id}
            >
              <div>
                <p className="font-semibold text-stone-900">{haircut.service}</p>
                <p className="text-sm text-stone-500">
                  Comisión: {formatCurrency(haircut.commission_amount)}
                </p>
              </div>
              <p className="font-bold text-stone-900">{formatCurrency(haircut.price)}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
