import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import {
  formatCurrency,
  formatDateLabel,
  getCurrentMonthValue,
  getMonthRange,
  getWeekLabelFromDate,
} from "../lib/date";
import supabase from "../lib/supabaseClient";

export default function MonthlySummaryPage() {
  const { user, profile } = useAuth();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [groupMode, setGroupMode] = useState("day");
  const [haircuts, setHaircuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMonthlyHaircuts() {
      setLoading(true);
      setError("");

      try {
        const range = getMonthRange(month);

        const { data, error: fetchError } = await supabase
          .from("haircuts")
          .select("*")
          .eq("user_id", user.id)
          .gte("haircut_date", range.start)
          .lte("haircut_date", range.end)
          .order("haircut_date", { ascending: true })
          .order("created_at", { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        setHaircuts(data || []);
      } catch (loadError) {
        setError(loadError.message || "No se pudo cargar el resumen mensual.");
      } finally {
        setLoading(false);
      }
    }

    if (user?.id) {
      loadMonthlyHaircuts();
    }
  }, [month, user?.id]);

  const totals = useMemo(() => {
    return haircuts.reduce(
      (accumulator, haircut) => ({
        gross: accumulator.gross + Number(haircut.price),
        commission: accumulator.commission + Number(haircut.commission_amount),
        count: accumulator.count + 1,
      }),
      { gross: 0, commission: 0, count: 0 }
    );
  }, [haircuts]);

  const groupedItems = useMemo(() => {
    const groupedMap = new Map();

    haircuts.forEach((haircut) => {
      const key =
        groupMode === "week" ? getWeekLabelFromDate(haircut.haircut_date) : haircut.haircut_date;
      const label = groupMode === "week" ? key : formatDateLabel(haircut.haircut_date);

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          key,
          label,
          total: 0,
          commission: 0,
          count: 0,
        });
      }

      const group = groupedMap.get(key);
      group.total += Number(haircut.price);
      group.commission += Number(haircut.commission_amount);
      group.count += 1;
    });

    return Array.from(groupedMap.values());
  }, [groupMode, haircuts]);

  const isAdmin = profile?.role === "admin";
  const monthlySummaryCards = [
    ...(isAdmin ? [{ key: "gross", money: true, title: "Total del mes", value: totals.gross }] : []),
    {
      key: "commission",
      money: true,
      title: isAdmin ? "Total de comision del mes" : "Tu comision mensual",
      value: totals.commission,
    },
    {
      key: "count",
      title: "Cantidad de cortes",
      value: totals.count,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
              Resumen mensual
            </p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Resumen mensual</h1>
            <p className="mt-2 text-sm text-stone-600">
              Filtra por mes y revisa tus numeros agrupados por dia o semana.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Mes</label>
              <input
                className="input"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Agrupar por</label>
              <select
                className="input"
                value={groupMode}
                onChange={(event) => setGroupMode(event.target.value)}
              >
                <option value="day">Dia</option>
                <option value="week">Semana</option>
              </select>
            </div>
          </div>
        </div>

        <div
          className={`mt-6 grid gap-4 ${
            monthlySummaryCards.length >= 3
              ? "sm:grid-cols-3"
              : monthlySummaryCards.length === 2
                ? "sm:grid-cols-2"
                : "sm:grid-cols-1"
          }`}
        >
          {monthlySummaryCards.map((card) => (
            <StatCard key={card.key} money={card.money} title={card.title} value={card.value} />
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card p-6">
        <h2 className="text-xl font-bold text-stone-900">Detalle agrupado</h2>

        {loading ? (
          <p className="mt-4 text-sm text-stone-500">Cargando resumen...</p>
        ) : groupedItems.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
            No hay cortes cargados para este mes.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {groupedItems.map((item) => (
              <div
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={item.key}
              >
                <div>
                  <p className="font-semibold text-stone-900">{item.label}</p>
                  <p className="text-sm text-stone-500">{item.count} cortes</p>
                </div>

                <div className="grid gap-2 text-sm sm:text-right">
                  {isAdmin && (
                    <p className="font-semibold text-stone-700">
                      Total: {formatCurrency(item.total)}
                    </p>
                  )}
                  <p className="font-semibold text-brand-700">
                    Comision: {formatCurrency(item.commission)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
