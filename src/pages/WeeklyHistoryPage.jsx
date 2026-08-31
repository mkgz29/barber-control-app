import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../context/AuthContext";
import {
  addCalendarWeeks,
  formatArgentinaTime,
  formatCurrency,
  getArgentinaTodayValue,
  getCalendarWeekDays,
  getCalendarWeekRange,
  getWeeklyHistoryInitialDateValue,
  toDateInputValue,
} from "../lib/date";
import { getHaircutFinalPrice, getHaircutServiceName } from "../lib/services";
import supabase from "../lib/supabaseClient";

function formatWeekMonthLabel(range) {
  const startMonth = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    timeZone: "America/Argentina/Tucuman",
  }).format(range.start);
  const endMonth = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    timeZone: "America/Argentina/Tucuman",
  }).format(range.end);
  const startYear = range.start.getFullYear();
  const endYear = range.end.getFullYear();

  if (startMonth === endMonth && startYear === endYear) {
    return `${startMonth} ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} - ${endMonth} ${startYear}`;
  }

  return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
}

function formatWeekRangeLabel(range) {
  const startDay = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    timeZone: "America/Argentina/Tucuman",
  }).format(range.start);
  const endDay = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    timeZone: "America/Argentina/Tucuman",
  }).format(range.end);
  const startMonth = new Intl.DateTimeFormat("es-AR", {
    month: "short",
    timeZone: "America/Argentina/Tucuman",
  }).format(range.start);
  const endMonth = new Intl.DateTimeFormat("es-AR", {
    month: "short",
    timeZone: "America/Argentina/Tucuman",
  }).format(range.end);

  if (
    range.start.getMonth() === range.end.getMonth() &&
    range.start.getFullYear() === range.end.getFullYear()
  ) {
    return `${startDay} - ${endDay} ${endMonth}`.toUpperCase();
  }

  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`.toUpperCase();
}

function formatDayLabel(day) {
  const [year, month, date] = day.date.split("-").map(Number);
  const dayNumber = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    timeZone: "America/Argentina/Tucuman",
  }).format(new Date(year, month - 1, date, 12, 0, 0, 0));

  return `${day.label} ${dayNumber}`;
}

function getHaircutClientName(haircut) {
  return (
    String(haircut?.client_name || "").trim() ||
    String(haircut?.customer_name || "").trim() ||
    String(haircut?.client || "").trim() ||
    String(haircut?.customer || "").trim() ||
    "-"
  );
}

function getHaircutTimeValue(haircut) {
  return haircut?.recorded_at ?? haircut?.created_at ?? "";
}

function getHaircutSortTime(haircut) {
  const time = new Date(getHaircutTimeValue(haircut)).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getCutsLabel(count) {
  return `${count} ${count === 1 ? "corte" : "cortes"}`;
}

function HaircutHistoryItem({ haircut }) {
  return (
    <div className="grid gap-2 py-3 text-sm sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1.15fr)_auto] sm:items-center">
      <div className="flex items-center gap-1.5 font-medium tabular-nums text-slate-500">
        <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
        {formatArgentinaTime(getHaircutTimeValue(haircut))}
      </div>

      <p className="min-w-0 break-words font-medium text-slate-700">
        {getHaircutClientName(haircut)}
      </p>

      <p className="min-w-0 break-words font-semibold text-slate-950">
        {getHaircutServiceName(haircut)}
      </p>

      <p className="text-base font-semibold tabular-nums text-slate-950 sm:text-right">
        {formatCurrency(getHaircutFinalPrice(haircut))}
      </p>
    </div>
  );
}

function WeeklyDayAccordion({ dayGroup, isOpen, onToggle }) {
  return (
    <section className="animate-card-in overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        aria-expanded={isOpen}
        className="flex min-h-16 w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-sky-100 sm:px-4"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-base font-semibold text-slate-950">
            {formatDayLabel(dayGroup.day)}
          </span>
          <span className="mt-1 block text-sm text-slate-500">
            {getCutsLabel(dayGroup.count)} - {formatCurrency(dayGroup.total)}
          </span>
        </span>

        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700">
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-300 ${
              isOpen ? "rotate-180" : "-rotate-90"
            }`}
            aria-hidden="true"
          />
          <span className="sr-only">{isOpen ? "Cerrar dia" : "Abrir dia"}</span>
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-200 px-3 sm:px-4">
            {dayGroup.haircuts.map((haircut, index) => (
              <div key={haircut.id}>
                <HaircutHistoryItem haircut={haircut} />
                {index < dayGroup.haircuts.length - 1 && (
                  <Separator className="bg-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function WeeklyHistoryPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() =>
    getWeeklyHistoryInitialDateValue(new Date())
  );
  const [haircuts, setHaircuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDays, setOpenDays] = useState(() => new Set());
  const todayDate = useMemo(() => getArgentinaTodayValue(new Date()), []);

  const weekRange = useMemo(() => getCalendarWeekRange(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => getCalendarWeekDays(selectedDate), [selectedDate]);
  const currentWeekStart = useMemo(() => {
    return toDateInputValue(getCalendarWeekRange(todayDate).start);
  }, [todayDate]);
  const weekStart = toDateInputValue(weekRange.start);
  const weekEnd = toDateInputValue(weekRange.end);
  const canGoNext = weekStart < currentWeekStart;

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isActive = true;

    async function loadWeeklyHaircuts() {
      setLoading(true);
      setError("");

      try {
        const { data, error: fetchError } = await supabase
          .from("haircuts")
          .select("*")
          .eq("user_id", user.id)
          .gte("haircut_date", weekStart)
          .lte("haircut_date", weekEnd)
          .order("haircut_date", { ascending: true })
          .order("recorded_at", { ascending: true })
          .order("created_at", { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        if (isActive) {
          setHaircuts(data || []);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError.message || "No se pudieron cargar los cortes de la semana.");
          setHaircuts([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadWeeklyHaircuts();

    return () => {
      isActive = false;
    };
  }, [user?.id, weekStart, weekEnd]);

  useEffect(() => {
    setOpenDays(new Set());
  }, [weekStart]);

  const totals = useMemo(() => {
    return haircuts.reduce(
      (accumulator, haircut) => ({
        count: accumulator.count + 1,
        produced: accumulator.produced + getHaircutFinalPrice(haircut),
      }),
      { count: 0, produced: 0 }
    );
  }, [haircuts]);

  const dayGroups = useMemo(() => {
    const haircutsByDay = haircuts.reduce((accumulator, haircut) => {
      const dateKey = haircut.haircut_date;

      if (!accumulator[dateKey]) {
        accumulator[dateKey] = [];
      }

      accumulator[dateKey].push(haircut);
      return accumulator;
    }, {});

    return weekDays
      .map((day) => {
        const dayHaircuts = [...(haircutsByDay[day.date] || [])].sort(
          (first, second) => getHaircutSortTime(first) - getHaircutSortTime(second)
        );
        const total = dayHaircuts.reduce(
          (sum, haircut) => sum + getHaircutFinalPrice(haircut),
          0
        );

        return {
          day,
          haircuts: dayHaircuts,
          count: dayHaircuts.length,
          total,
        };
      })
      .filter((dayGroup) => dayGroup.count > 0);
  }, [haircuts, weekDays]);

  const average = totals.count > 0 ? totals.produced / totals.count : 0;

  function handlePreviousWeek() {
    setSelectedDate((current) => addCalendarWeeks(current, -1));
  }

  function handleNextWeek() {
    if (!canGoNext) {
      return;
    }

    setSelectedDate((current) => addCalendarWeeks(current, 1));
  }

  function toggleDay(date) {
    setOpenDays((current) => {
      const next = new Set(current);

      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }

      return next;
    });
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="animate-card-in space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
              Semanas
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Historial detallado de cortes por semana.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              {formatWeekMonthLabel(weekRange)}
            </p>
            <div className="mt-2 grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2">
              <Button
                aria-label="Semana anterior"
                className="h-9 w-9 border-slate-200 bg-white text-slate-600 shadow-none hover:bg-sky-50 hover:text-sky-700"
                onClick={handlePreviousWeek}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </Button>

              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-semibold tracking-normal text-slate-950">
                  {formatWeekRangeLabel(weekRange)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Lunes a domingo
                </p>
              </div>

              <Button
                aria-label="Semana siguiente"
                className="h-9 w-9 border-slate-200 bg-white text-slate-600 shadow-none hover:bg-sky-50 hover:text-sky-700 disabled:bg-slate-50 disabled:text-slate-300"
                disabled={!canGoNext}
                onClick={handleNextWeek}
                size="icon"
                type="button"
                variant="outline"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Cortes
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-950">
              {totals.count}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Producido
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-950">
              {formatCurrency(totals.produced)}
            </p>
          </div>
          <div className="col-span-2 rounded-lg border border-slate-200 bg-white p-3 md:col-span-1">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Promedio
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-950">
              {formatCurrency(average)}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <Alert className="rounded-lg border-red-200 bg-red-50 text-red-800" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="animate-card-in space-y-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-lg bg-slate-200" />
            <Skeleton className="h-20 rounded-lg bg-slate-200" />
            <Skeleton className="h-20 rounded-lg bg-slate-200" />
          </div>
        ) : dayGroups.length === 0 ? (
          <div className="flex min-h-40 items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
            <CalendarRange className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <p>No hay cortes registrados en esta semana.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {dayGroups.map((dayGroup) => (
              <WeeklyDayAccordion
                dayGroup={dayGroup}
                isOpen={openDays.has(dayGroup.day.date)}
                key={dayGroup.day.date}
                onToggle={() => toggleDay(dayGroup.day.date)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
