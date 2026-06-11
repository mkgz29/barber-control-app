import { useEffect, useMemo, useState } from "react";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import {
  formatCurrency,
  formatDateLabel,
  getArgentinaTodayValue,
  getCurrentMonthValue,
  getMonthRange,
  getWeekLabelFromDate,
  groupHaircutsByBusinessWeeks,
} from "../lib/date";
import supabase from "../lib/supabaseClient";

export default function MonthlySummaryPage() {
  const { user, profile } = useAuth();
  const userRole = profile?.role;
  const isAdmin = userRole === "admin";
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [groupMode, setGroupMode] = useState("day");
  const [selectedWeekKey, setSelectedWeekKey] = useState("");
  const [haircuts, setHaircuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMonthlyHaircuts() {
      setLoading(true);
      setError("");

      try {
        const range = getMonthRange(month);

        const query = supabase
          .from("haircuts")
          .select("*")
          .gte("haircut_date", range.start)
          .lte("haircut_date", range.end)
          .order("haircut_date", { ascending: true })
          .order("created_at", { ascending: true });

        if (!isAdmin) {
          query.eq("user_id", user.id);
        }

        const { data, error: fetchError } = await query;

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

    if (user?.id && userRole) {
      loadMonthlyHaircuts();
    }
  }, [isAdmin, month, user?.id, userRole]);

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

  const todayDate = getArgentinaTodayValue(new Date());
  const weeklyBlocks = useMemo(
    () => groupHaircutsByBusinessWeeks(haircuts, month),
    [haircuts, month]
  );
  const maxWeeklyCuts = Math.max(...weeklyBlocks.map((block) => block.count), 0);
  const currentWeek = weeklyBlocks.find((block) => todayDate >= block.start && todayDate <= block.end);
  const lastAvailableWeek = [...weeklyBlocks].reverse().find((block) => block.start <= todayDate);
  const selectedWeek =
    weeklyBlocks.find((block) => block.key === selectedWeekKey && block.start <= todayDate) ??
    currentWeek ??
    lastAvailableWeek ??
    weeklyBlocks[0] ??
    null;
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
      title: isAdmin ? "Cortes del mes" : "Tus cortes del mes",
      value: totals.count,
    },
  ];

  useEffect(() => {
    if (!selectedWeek || selectedWeekKey === selectedWeek.key) {
      return;
    }

    setSelectedWeekKey(selectedWeek.key);
  }, [selectedWeek?.key, selectedWeekKey]);

  return (
    <div className="space-y-5">
      <section className="card animate-card-in p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">{isAdmin ? "Resumen mensual general" : "Tu resumen mensual"}</p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950 sm:text-3xl">
              {isAdmin ? "Mes" : "Tu mes"}
            </h1>
            <p className="muted-text mt-2">
              Filtra por mes y revisa tus numeros agrupados por dia o semana.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:min-w-[25rem]">
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

      <section className="card animate-card-in p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Grafico</p>
            <h2 className="section-title mt-2">Actividad por semanas</h2>
          </div>
          <p className="muted-text">Semana comercial de sabado a viernes.</p>
        </div>

        <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50/80 p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {weeklyBlocks.map((block) => {
              const isFuture = block.start > todayDate;
              const isSelected = selectedWeek?.key === block.key;
              const height = maxWeeklyCuts > 0 ? (block.count / maxWeeklyCuts) * 100 : 0;

              return (
                <button
                  className={`tap-card rounded-2xl border bg-white p-3 text-left transition ${
                    isSelected
                      ? "border-brand-300 ring-4 ring-brand-100"
                      : "border-stone-200 hover:border-stone-300"
                  } ${isFuture ? "opacity-50" : ""}`}
                  disabled={isFuture}
                  key={block.key}
                  onClick={() => setSelectedWeekKey(block.key)}
                  type="button"
                >
                  <div className="flex items-end gap-3 sm:block">
                    <div className="flex h-20 w-3 shrink-0 items-end overflow-hidden rounded-full bg-stone-100 sm:h-28 sm:w-full sm:rounded-2xl">
                      <div
                        className={`w-full rounded-full sm:rounded-2xl ${
                          isFuture
                            ? "bg-stone-300"
                            : "bg-gradient-to-t from-brand-800 via-brand-600 to-brand-300"
                        }`}
                        style={{ height: `${Math.max(height, block.count > 0 ? 12 : 0)}%` }}
                      />
                    </div>
                    <div className="min-w-0 sm:mt-3">
                      <p className="text-sm font-semibold text-stone-950">{block.label}</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">{block.displayRange}</p>
                      <p className="mt-2 text-sm font-semibold text-brand-800">
                        {block.count} {block.count === 1 ? "corte" : "cortes"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedWeek && (
          <div className="mt-4 grid gap-3 rounded-2xl border border-stone-200 bg-white/90 p-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <p className="eyebrow">{selectedWeek.label}</p>
              <p className="mt-1 text-sm font-semibold text-stone-950">
                {selectedWeek.displayRange}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Cortes
              </p>
              <p className="mt-1 text-xl font-semibold text-stone-950">{selectedWeek.count}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                {isAdmin ? "Comision total" : "Tu comision"}
              </p>
              <p className="mt-1 text-xl font-semibold text-brand-800">
                {formatCurrency(selectedWeek.commission)}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="card animate-card-in p-4 sm:p-6">
        <h2 className="section-title">Detalle agrupado</h2>

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
                className="tap-card flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between"
                key={item.key}
              >
                <div>
                  <p className="font-semibold text-stone-950">{item.label}</p>
                  <p className="text-sm text-stone-500">{item.count} cortes</p>
                </div>

                <div className="grid gap-2 text-sm sm:text-right">
                  {isAdmin && (
                    <p className="font-semibold text-stone-700">
                      Total: {formatCurrency(item.total)}
                    </p>
                  )}
                  <p className="font-semibold text-brand-800">
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
