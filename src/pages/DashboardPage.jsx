import { useEffect, useMemo, useState } from "react";
import CollapsibleSection from "../components/CollapsibleSection";
import DayCard from "../components/DayCard";
import FloatingAddButton from "../components/FloatingAddButton";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import {
  formatBusinessWeekRange,
  getArgentinaTodayValue,
  getBusinessWeekDays,
  getBusinessWeekRange,
  toDateInputValue,
} from "../lib/date";
import supabase from "../lib/supabaseClient";

function buildCurrentWeekState(referenceDate = new Date()) {
  return {
    days: getBusinessWeekDays(referenceDate),
    range: getBusinessWeekRange(referenceDate),
  };
}

function getDefaultWeeklyOpen() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia("(min-width: 768px)").matches;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [haircuts, setHaircuts] = useState([]);
  const [weeklyMetricHaircuts, setWeeklyMetricHaircuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentWeek, setCurrentWeek] = useState(() => buildCurrentWeekState());
  const [todayDate, setTodayDate] = useState(() => getArgentinaTodayValue(new Date()));
  const [defaultWeeklyOpen] = useState(getDefaultWeeklyOpen);
  const [todayCreateRequestKey, setTodayCreateRequestKey] = useState(0);

  const days = currentWeek.days;
  const weekRange = currentWeek.range;
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

    const weekStart = toDateInputValue(weekRange.start);
    const weekEnd = toDateInputValue(weekRange.end);
    try {
      const { data: weeklyUserHaircuts, error: fetchError } = await supabase
        .from("haircuts")
        .select("*")
        .eq("user_id", user.id)
        .gte("haircut_date", weekStart)
        .lte("haircut_date", weekEnd)
        .order("haircut_date", { ascending: true })
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setHaircuts(weeklyUserHaircuts || []);
      setWeeklyMetricHaircuts(weeklyUserHaircuts || []);
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

  const weeklyCommission = weeklyMetricHaircuts.reduce(
    (sum, haircut) => sum + Number(haircut.commission_amount),
    0
  );
  const weeklyCutsCount = weeklyMetricHaircuts.length;
  const weeklySummaryCards = [
    {
      key: "cuts",
      title: "Tus cortes esta semana",
      value: weeklyCutsCount,
    },
    {
      key: "commission",
      money: true,
      title: "Tu comision semanal",
      value: weeklyCommission,
    },
  ];

  function handleFloatingAddClick() {
    setTodayCreateRequestKey((current) => current + 1);

    window.requestAnimationFrame(() => {
      document.getElementById("today-haircuts-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className="space-y-5 pb-24">
      <CollapsibleSection
        defaultOpen={defaultWeeklyOpen}
        description={weekRangeLabel}
        eyebrow="Tu semana de pago"
        title="Tu resumen semanal"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="muted-text">{weekRangeLabel}</p>
            <div className="inline-flex w-fit items-center rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-600">
              Comision actual:{" "}
              <strong className="ml-1 text-stone-950">
                {Number(profile?.commission_percentage || 0)}%
              </strong>
            </div>
          </div>

          <div
            className={`grid gap-3 ${
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
        </div>
      </CollapsibleSection>

      {!loading && todayDay && (
        <section
          className="card animate-card-in scroll-mt-4 space-y-5 p-4 sm:p-6"
          id="today-haircuts-section"
        >
          <div className="border-b border-stone-200 pb-4">
            <p className="eyebrow">Hoy</p>
            <h2 className="section-title mt-2">Cortes del dia</h2>
            <p className="muted-text mt-1">
              Registra y revisa la actividad de hoy.
            </p>
          </div>

          <DayCard
            badgeLabel="Hoy"
            day={todayDay}
            featured
            haircuts={haircutsByDay[todayDay.date] || []}
            isToday
            createRequestKey={todayCreateRequestKey}
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
        <section className="card animate-card-in space-y-5 p-4 sm:p-6">
          <div className="border-b border-stone-200 pb-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-stone-500">
              Semana completa
            </p>
            <h2 className="section-title mt-2">Resto de la semana</h2>
            <p className="muted-text mt-1">
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

      {!loading && todayDay && <FloatingAddButton onClick={handleFloatingAddClick} />}
    </div>
  );
}
