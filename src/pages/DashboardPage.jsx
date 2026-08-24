import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import DayCard from "../components/DayCard";
import FloatingAddButton from "../components/FloatingAddButton";
import { useAuth } from "../context/AuthContext";
import {
  formatCurrency,
  getArgentinaTodayValue,
  getBusinessWeekDays,
  getBusinessWeekRange,
  toDateInputValue,
} from "../lib/date";
import { mapServiceToOption } from "../lib/services";
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
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [servicesError, setServicesError] = useState("");
  const [currentWeek, setCurrentWeek] = useState(() => buildCurrentWeekState());
  const [todayDate, setTodayDate] = useState(() => getArgentinaTodayValue(new Date()));
  const [todayCreateRequestKey, setTodayCreateRequestKey] = useState(0);

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

  async function loadServices() {
    setServicesLoading(true);
    setServicesError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("services")
        .select("id,name,price,is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setServices((data || []).map(mapServiceToOption));
    } catch (loadError) {
      setServicesError(loadError.message || "No se pudieron cargar los servicios.");
    } finally {
      setServicesLoading(false);
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadServices();
    }
  }, [user?.id]);

  function buildHaircutPayload(values) {
    const commissionPercentage = Number(profile?.commission_percentage || 0);
    const finalPrice = Number(values.final_price ?? values.price);
    const basePrice = Number(values.base_price ?? finalPrice);
    const serviceName = values.service_name_snapshot || values.service;

    return {
      service_id: values.service_id || null,
      service_name_snapshot: serviceName,
      base_price: basePrice,
      final_price: finalPrice,
      service: serviceName,
      price: finalPrice,
      haircut_date: values.haircut_date,
      attendance_type: values.attendance_type,
      commission_percentage: commissionPercentage,
      commission_amount: (finalPrice * commissionPercentage) / 100,
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
    <div className="space-y-4 pb-24">
      <section className="animate-card-in space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
            Semana
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hoy - {todayDay?.label || "Semana"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="rounded-lg bg-sky-50 p-3 ring-1 ring-sky-100">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">
              Cortes
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{weeklyCutsCount}</p>
          </div>
          <div className="rounded-lg bg-sky-50 p-3 ring-1 ring-sky-100">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">
              Comision semanal
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {formatCurrency(weeklyCommission)}
            </p>
          </div>
          <div className="col-span-2 rounded-lg bg-slate-100 p-3 ring-1 ring-slate-200 md:col-span-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Comision %
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {Number(profile?.commission_percentage || 0)}%
            </p>
          </div>
        </div>
      </section>

      {!loading && todayDay && (
        <section
          className="animate-card-in scroll-mt-4 space-y-2"
          id="today-haircuts-section"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-sky-700">
              Hoy
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {todayDay.label} {todayDay.shortLabel}
            </h2>
          </div>

          <DayCard
            badgeLabel="Hoy"
            createRequestKey={todayCreateRequestKey}
            day={todayDay}
            featured
            haircuts={haircutsByDay[todayDay.date] || []}
            isToday
            onAddHaircut={handleAddHaircut}
            onDeleteHaircut={handleDeleteHaircut}
            onReloadServices={loadServices}
            onUpdateHaircut={handleUpdateHaircut}
            saving={saving}
            services={services}
            servicesError={servicesError}
            servicesLoading={servicesLoading}
          />
        </section>
      )}

      {error && (
        <Alert className="rounded-lg border-red-200 bg-red-50 text-red-800" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <section className="space-y-2">
          <Skeleton className="h-24 rounded-lg bg-slate-200" />
          <Skeleton className="h-24 rounded-lg bg-slate-200" />
          <Skeleton className="h-24 rounded-lg bg-slate-200" />
        </section>
      ) : (
        <section className="animate-card-in space-y-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Otros dias</h2>
          </div>

          <Separator className="bg-slate-200" />

          <div className="grid gap-2">
            {remainingDays.map((day) => {
              return (
                <DayCard
                  day={day}
                  haircuts={haircutsByDay[day.date] || []}
                  isToday={false}
                  key={day.date}
                  onAddHaircut={handleAddHaircut}
                  onDeleteHaircut={handleDeleteHaircut}
                  onReloadServices={loadServices}
                  onUpdateHaircut={handleUpdateHaircut}
                  saving={saving}
                  services={services}
                  servicesError={servicesError}
                  servicesLoading={servicesLoading}
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
