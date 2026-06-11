import { useEffect, useMemo, useState } from "react";
import DayCard from "../components/DayCard";
import StatCard from "../components/StatCard";
import WeeklyRanking from "../components/WeeklyRanking";
import { useAuth } from "../context/AuthContext";
import {
  formatBusinessWeekRange,
  getArgentinaTodayValue,
  getBusinessWeekDays,
  getBusinessWeekRange,
  getCurrentMonthValue,
  getMonthRange,
  groupHaircutsByBusinessWeeks,
  toDateInputValue,
} from "../lib/date";
import supabase from "../lib/supabaseClient";

function buildCurrentWeekState(referenceDate = new Date()) {
  return {
    days: getBusinessWeekDays(referenceDate),
    range: getBusinessWeekRange(referenceDate),
  };
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [haircuts, setHaircuts] = useState([]);
  const [weeklyMetricHaircuts, setWeeklyMetricHaircuts] = useState([]);
  const [monthlyMetricHaircuts, setMonthlyMetricHaircuts] = useState([]);
  const [weeklyRanking, setWeeklyRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rankingError, setRankingError] = useState("");
  const [currentWeek, setCurrentWeek] = useState(() => buildCurrentWeekState());
  const [todayDate, setTodayDate] = useState(() => getArgentinaTodayValue(new Date()));

  const days = currentWeek.days;
  const weekRange = currentWeek.range;
  const isAdmin = profile?.role === "admin";
  const currentMonth = todayDate.slice(0, 7) || getCurrentMonthValue();
  const weekRangeLabel = formatBusinessWeekRange(weekRange);

  const haircutsByDay = useMemo(() => {
    return haircuts.reduce((accumulator, haircut) => {
      const dateKey = haircut.haircut_date;

      if (!accumulator[dateKey]) {
        accumulator[dateKey] = [];
      }

      accumulator[dateKey].push(haircut);
      return accumulator;
    }, {});
  }, [haircuts]);

  const todayDay = useMemo(() => {
    return days.find((day) => day.date === todayDate) ?? days[0] ?? null;
  }, [days, todayDate]);

  const remainingDays = useMemo(() => {
    return days.filter((day) => day.date !== todayDate);
  }, [days, todayDate]);

  useEffect(() => {
    function syncCurrentWeek() {
      const nextTodayDate = getArgentinaTodayValue(new Date());
      setTodayDate((previousTodayDate) =>
        previousTodayDate === nextTodayDate ? previousTodayDate : nextTodayDate
      );

      setCurrentWeek((previousWeek) => {
        const nextWeek = buildCurrentWeekState();
        const previousStart = toDateInputValue(previousWeek.range.start);
        const nextStart = toDateInputValue(nextWeek.range.start);

        return previousStart === nextStart ? previousWeek : nextWeek;
      });
    }

    syncCurrentWeek();

    const intervalId = window.setInterval(syncCurrentWeek, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  async function loadHaircuts() {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");
    setRankingError("");

    const weekStart = toDateInputValue(weekRange.start);
    const weekEnd = toDateInputValue(weekRange.end);
    const monthRange = getMonthRange(currentMonth);
    const weeklyMetricsQuery = supabase
      .from("haircuts")
      .select("*")
      .gte("haircut_date", weekStart)
      .lte("haircut_date", weekEnd)
      .order("haircut_date", { ascending: true })
      .order("created_at", { ascending: false });
    const monthlyMetricsQuery = supabase
      .from("haircuts")
      .select("*")
      .gte("haircut_date", monthRange.start)
      .lte("haircut_date", monthRange.end)
      .order("haircut_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (!isAdmin) {
      weeklyMetricsQuery.eq("user_id", user.id);
      monthlyMetricsQuery.eq("user_id", user.id);
    }

    try {
      const [
        { data: weeklyUserHaircuts, error: fetchError },
        { data: weeklyMetrics, error: weeklyMetricsError },
        { data: monthlyMetrics, error: monthlyMetricsError },
        { data: globalWeeklyHaircuts, error: globalFetchError },
      ] = await Promise.all([
        supabase
          .from("haircuts")
          .select("*")
          .eq("user_id", user.id)
          .gte("haircut_date", weekStart)
          .lte("haircut_date", weekEnd)
          .order("haircut_date", { ascending: true })
          .order("created_at", { ascending: false }),
        weeklyMetricsQuery,
        monthlyMetricsQuery,
        isAdmin
          ? supabase.rpc("get_global_weekly_haircuts", {
              reference_date: weekStart,
            })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (fetchError) {
        throw fetchError;
      }

      if (weeklyMetricsError) {
        throw weeklyMetricsError;
      }

      if (monthlyMetricsError) {
        throw monthlyMetricsError;
      }

      if (globalFetchError) {
        setRankingError(globalFetchError.message || "No se pudo cargar el ranking semanal.");
      }

      setHaircuts(weeklyUserHaircuts || []);
      setWeeklyMetricHaircuts(weeklyMetrics || []);
      setMonthlyMetricHaircuts(monthlyMetrics || []);
      setWeeklyRanking(globalWeeklyHaircuts || []);
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los cortes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHaircuts();
  }, [user?.id, profile?.role, weekRange.start.getTime(), currentMonth]);

  function buildHaircutPayload(values) {
    const commissionPercentage = Number(profile?.commission_percentage || 0);
    const price = Number(values.price);

    return {
      service: values.service,
      price,
      haircut_date: values.haircut_date,
      attendance_type: values.attendance_type,
      commission_percentage: commissionPercentage,
      commission_amount: (price * commissionPercentage) / 100,
    };
  }

  async function handleAddHaircut(values) {
    setSaving(true);
    setError("");

    try {
      const { error: insertError } = await supabase.from("haircuts").insert({
        user_id: user.id,
        ...buildHaircutPayload(values),
      });

      if (insertError) {
        throw insertError;
      }

      await loadHaircuts();
    } catch (submitError) {
      setError(submitError.message || "No se pudo guardar el corte.");
      throw submitError;
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateHaircut(haircutId, values) {
    setSaving(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("haircuts")
        .update(buildHaircutPayload(values))
        .eq("id", haircutId)
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      await loadHaircuts();
    } catch (submitError) {
      setError(submitError.message || "No se pudo actualizar el corte.");
      throw submitError;
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHaircut(haircutId) {
    setSaving(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("haircuts")
        .delete()
        .eq("id", haircutId)
        .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      await loadHaircuts();
    } catch (submitError) {
      setError(submitError.message || "No se pudo eliminar el corte.");
      throw submitError;
    } finally {
      setSaving(false);
    }
  }

  const weeklyGross = weeklyMetricHaircuts.reduce((sum, haircut) => sum + Number(haircut.price), 0);
  const weeklyCommission = weeklyMetricHaircuts.reduce(
    (sum, haircut) => sum + Number(haircut.commission_amount),
    0
  );
  const weeklyCutsCount = weeklyMetricHaircuts.length;
  const monthlyWeekBlocks = useMemo(
    () => groupHaircutsByBusinessWeeks(monthlyMetricHaircuts, currentMonth),
    [currentMonth, monthlyMetricHaircuts]
  );
  const monthlyCutsCount = monthlyWeekBlocks.reduce((sum, block) => sum + block.count, 0);
  const monthlyCommission = monthlyWeekBlocks.reduce(
    (sum, block) => sum + block.commission,
    0
  );
  const bestMonthlyWeek = monthlyWeekBlocks.reduce(
    (best, block) => (block.count > best.count ? block : best),
    { label: "Sin datos", count: 0 }
  );
  const averageWeeklyCuts =
    monthlyWeekBlocks.length > 0 ? monthlyCutsCount / monthlyWeekBlocks.length : 0;
  const maxMonthlyWeekCuts = Math.max(...monthlyWeekBlocks.map((block) => block.count), 0);
  const monthlySummaryCards = [
    {
      key: "best-week",
      title: "Semana con mas cortes",
      value: bestMonthlyWeek.count > 0 ? `${bestMonthlyWeek.label}: ${bestMonthlyWeek.count}` : "Sin datos",
    },
    {
      key: "weekly-average",
      title: "Promedio semanal",
      value: averageWeeklyCuts.toFixed(1),
    },
    {
      key: "month-count",
      title: "Total de cortes del mes",
      value: monthlyCutsCount,
    },
    {
      key: "month-commission",
      money: true,
      title: isAdmin ? "Comision mensual estimada" : "Tu comision mensual estimada",
      value: monthlyCommission,
    },
  ];
  const weeklySummaryCards = [
    {
      key: "cuts",
      title: "Cortes semanales",
      value: weeklyCutsCount,
    },
    ...(isAdmin
      ? [{ key: "gross", highlight: true, money: true, title: "Total semanal (bruto)", value: weeklyGross }]
      : []),
    {
      key: "commission",
      money: true,
      title: isAdmin ? "Total semanal de comision" : "Tu comision semanal",
      value: weeklyCommission,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
              Resumen semanal
            </p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Resumen semanal</h1>
            <p className="mt-2 text-sm text-stone-600">{weekRangeLabel}</p>
          </div>
          <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
            Comision actual: <strong>{Number(profile?.commission_percentage || 0)}%</strong>
          </div>
        </div>

        <div
          className={`mt-6 grid gap-4 ${
            weeklySummaryCards.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {weeklySummaryCards.map((card) => (
            <StatCard
              highlight={card.highlight}
              key={card.key}
              money={card.money}
              title={card.title}
              value={card.value}
            />
          ))}
        </div>
      </section>

      <section className="card p-6">
        <div className="border-b border-stone-200 pb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
            Resumen mensual por semanas
          </p>
          <h2 className="mt-2 text-2xl font-bold text-stone-900">
            Actividad por semanas de pago
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Agrupado por semanas comerciales de sabado a viernes.
          </p>
        </div>

        {monthlyCutsCount === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">
            Todavia no hay cortes suficientes para mostrar estadisticas mensuales.
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {monthlySummaryCards.map((card) => (
                <StatCard key={card.key} money={card.money} title={card.title} value={card.value} />
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-stone-50 p-4">
              <div className="flex h-48 items-end gap-3">
                {monthlyWeekBlocks.map((block) => {
                  const height = maxMonthlyWeekCuts > 0 ? (block.count / maxMonthlyWeekCuts) * 100 : 0;

                  return (
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={block.key}>
                      <div className="flex h-36 w-full items-end rounded-xl bg-white px-2 py-2">
                        <div
                          className="w-full rounded-lg bg-brand-600 transition-all"
                          style={{ height: `${Math.max(height, block.count > 0 ? 8 : 0)}%` }}
                          title={`${block.displayRange}: ${block.count} cortes`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-stone-700">{block.label}</p>
                        <p className="text-xs text-stone-500">{block.count} cortes</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>

      {isAdmin && rankingError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {rankingError}
        </div>
      )}

      {isAdmin && <WeeklyRanking ranking={weeklyRanking} />}

      {!loading && todayDay && (
        <section className="card space-y-5 p-6">
          <div className="border-b border-stone-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">Hoy</p>
            <h2 className="mt-2 text-2xl font-bold text-stone-900">Cortes del dia</h2>
            <p className="mt-1 text-sm text-stone-600">
              Registra y revisa la actividad de hoy.
            </p>
          </div>

          <DayCard
            badgeLabel="Hoy"
            day={todayDay}
            featured
            haircuts={haircutsByDay[todayDay.date] || []}
            isToday
            onAddHaircut={handleAddHaircut}
            onDeleteHaircut={handleDeleteHaircut}
            onUpdateHaircut={handleUpdateHaircut}
            saving={saving}
          />
        </section>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-center text-sm text-stone-500">Cargando cortes...</div>
      ) : (
        <section className="card space-y-5 p-6">
          <div className="border-b border-stone-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
              Semana completa
            </p>
            <h2 className="mt-2 text-2xl font-bold text-stone-900">Resto de la semana</h2>
            <p className="mt-1 text-sm text-stone-600">
              Consulta y actualiza los cortes de los demas dias.
            </p>
          </div>

          <div className="grid gap-4">
            {remainingDays.map((day) => {
              return (
                <DayCard
                  day={day}
                  haircuts={haircutsByDay[day.date] || []}
                  isToday={false}
                  key={day.date}
                  onAddHaircut={handleAddHaircut}
                  onDeleteHaircut={handleDeleteHaircut}
                  onUpdateHaircut={handleUpdateHaircut}
                  saving={saving}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
