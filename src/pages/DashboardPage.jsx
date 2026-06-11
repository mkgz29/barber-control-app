import { useEffect, useMemo, useState } from "react";
import DayCard from "../components/DayCard";
import StatCard from "../components/StatCard";
import WeeklyRanking from "../components/WeeklyRanking";
import { useAuth } from "../context/AuthContext";
import { getCurrentWeek, getWeekRange, toDateInputValue } from "../lib/date";
import supabase from "../lib/supabaseClient";

function buildCurrentWeekState(referenceDate = new Date()) {
  return {
    days: getCurrentWeek(referenceDate),
    range: getWeekRange(referenceDate),
  };
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [haircuts, setHaircuts] = useState([]);
  const [weeklyRanking, setWeeklyRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rankingError, setRankingError] = useState("");
  const [currentWeek, setCurrentWeek] = useState(() => buildCurrentWeekState());
  const [todayDate, setTodayDate] = useState(() => toDateInputValue(new Date()));

  const days = currentWeek.days;
  const weekRange = currentWeek.range;

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
      const nextTodayDate = toDateInputValue(new Date());
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

    try {
      const [
        { data: weeklyUserHaircuts, error: fetchError },
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
        supabase.rpc("get_global_weekly_haircuts", {
          reference_date: weekStart,
        }),
      ]);

      if (fetchError) {
        throw fetchError;
      }

      if (globalFetchError) {
        setRankingError(globalFetchError.message || "No se pudo cargar el ranking semanal.");
      }

      setHaircuts(weeklyUserHaircuts || []);
      setWeeklyRanking(globalWeeklyHaircuts || []);
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los cortes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHaircuts();
  }, [user?.id, weekRange.start.getTime()]);

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

  const weeklyGross = haircuts.reduce((sum, haircut) => sum + Number(haircut.price), 0);
  const weeklyCommission = haircuts.reduce(
    (sum, haircut) => sum + Number(haircut.commission_amount),
    0
  );
  const isAdmin = profile?.role === "admin";
  const weeklySummaryCards = [
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
            <p className="mt-2 text-sm text-stone-600">Revisa lo cargado entre lunes y domingo.</p>
          </div>
          <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
            Comision actual: <strong>{Number(profile?.commission_percentage || 0)}%</strong>
          </div>
        </div>

        <div
          className={`mt-6 grid gap-4 ${
            weeklySummaryCards.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1"
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

      {rankingError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {rankingError}
        </div>
      )}

      <WeeklyRanking ranking={weeklyRanking} />

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
