import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DayTimeline from "../components/turnos/DayTimeline";
import { formatDateLabel, getArgentinaTodayValue, toDateInputValue } from "../lib/date";
import { getChinosBusySlots, getChinosPublicStaff } from "../lib/chinosTurnos";

const CHINOS_BARBERS = [
  {
    label: "Miguel",
    staffId: "f04ad11d-a6cb-458f-8164-171cc358bd5f",
  },
  {
    label: "Chumbo",
    staffId: "a092de98-756c-4ed3-9b94-ba613c524a8e",
  },
  {
    label: "Ariel",
    staffId: "907fa35a-1e08-4a8a-a80e-d8d3a0973e8d",
  },
  {
    label: "Polo",
    staffId: "1726a947-5fa0-4f80-8f24-cb84eb8f4a8b",
  },
  {
    label: "Lautaro",
    staffId: "127a5659-b675-4df5-ab3f-de5f5c031862",
  },
];

const DAY_KEYS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

function addDays(dateValue, amount) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  date.setDate(date.getDate() + amount);

  return toDateInputValue(date);
}

function getDayKey(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  return DAY_KEYS[date.getDay()];
}

function formatTime(value) {
  return String(value || "").slice(0, 5);
}

function getScheduleForDate(staff, dateValue) {
  const daySchedule = staff?.schedule?.[getDayKey(dateValue)];

  if (!daySchedule?.enabled) {
    return {
      isWorkingDay: false,
      label: "No trabaja este dia",
    };
  }

  const shifts = Array.isArray(daySchedule.shifts) ? daySchedule.shifts : [];
  const label = shifts.length
    ? shifts.map((shift) => `${formatTime(shift.start)} - ${formatTime(shift.end)}`).join(" / ")
    : "Horario no disponible";

  return {
    isWorkingDay: shifts.length > 0,
    label,
    shifts,
  };
}

function getSelectedDateLabel(selectedDate, todayDate) {
  if (selectedDate === todayDate) {
    return "Agenda de hoy";
  }

  return `Agenda del ${formatDateLabel(selectedDate)}`;
}

function sortBusySlotsByStartTime(busySlots) {
  return [...busySlots].sort((left, right) =>
    String(left.start_time || "").localeCompare(String(right.start_time || ""))
  );
}

export default function TurnosPage() {
  const todayDate = useMemo(() => getArgentinaTodayValue(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  // TODO: Select by profile.external_staff_id when the dashboard model stores that link.
  const [selectedStaffId, setSelectedStaffId] = useState(CHINOS_BARBERS[0].staffId);
  const [staff, setStaff] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [busyLoading, setBusyLoading] = useState(true);
  const [staffError, setStaffError] = useState("");
  const [busyError, setBusyError] = useState("");

  const busySlotsCacheRef = useRef(new Map());
  const busyRequestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff() {
      setStaffLoading(true);
      setStaffError("");

      try {
        const staffData = await getChinosPublicStaff();

        if (!cancelled) {
          setStaff(staffData);
        }
      } catch {
        if (!cancelled) {
          setStaffError("Agenda temporalmente no disponible.");
        }
      } finally {
        if (!cancelled) {
          setStaffLoading(false);
        }
      }
    }

    loadStaff();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadBusySlots(date, options = {}) {
    const { force = false } = options;

    if (!force && busySlotsCacheRef.current.has(date)) {
      setBusySlots(busySlotsCacheRef.current.get(date));
      setBusyLoading(false);
      setBusyError("");
      return;
    }

    const requestId = busyRequestIdRef.current + 1;
    busyRequestIdRef.current = requestId;
    setBusyLoading(true);
    setBusyError("");

    try {
      const busySlotsData = await getChinosBusySlots(date);

      if (busyRequestIdRef.current !== requestId) {
        return;
      }

      busySlotsCacheRef.current.set(date, busySlotsData);
      setBusySlots(busySlotsData);
    } catch {
      if (busyRequestIdRef.current === requestId) {
        setBusyError("Agenda temporalmente no disponible.");
      }
    } finally {
      if (busyRequestIdRef.current === requestId) {
        setBusyLoading(false);
      }
    }
  }

  useEffect(() => {
    loadBusySlots(selectedDate);
  }, [selectedDate]);

  const selectedBarber = CHINOS_BARBERS.find((barber) => barber.staffId === selectedStaffId);
  const selectedStaff = staff.find((staffMember) => staffMember.id === selectedStaffId);
  const schedule = getScheduleForDate(selectedStaff, selectedDate);
  const selectedBusySlots = useMemo(() => {
    return sortBusySlotsByStartTime(
      busySlots.filter((busySlot) => busySlot.staff_id === selectedStaffId)
    );
  }, [busySlots, selectedStaffId]);
  const isInitialLoading = staffLoading || busyLoading;
  const error = staffError || busyError;

  return (
    <div className="space-y-5 pb-4">
      <section className="animate-card-in space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
              Turnos
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Agenda de disponibilidad - Solo lectura
            </p>
          </div>

          <Button
            className="h-9 w-full border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-950 sm:w-auto"
            disabled={busyLoading}
            onClick={() => loadBusySlots(selectedDate, { force: true })}
            type="button"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${busyLoading ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualizar
          </Button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              aria-label="Dia anterior"
              className="h-9 w-9 border-slate-200 bg-white text-slate-600 shadow-none hover:bg-sky-50 hover:text-sky-700"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <label className="sr-only" htmlFor="turnos-date">
              Fecha
            </label>
            <Input
              className="h-9 w-[9.75rem] border-slate-200 bg-white text-sm text-slate-900 shadow-none focus-visible:ring-sky-100"
              id="turnos-date"
              type="date"
              value={selectedDate}
              onChange={(event) => {
                if (event.target.value) {
                  setSelectedDate(event.target.value);
                }
              }}
            />
            <Button
              aria-label="Dia siguiente"
              className="h-9 w-9 border-slate-200 bg-white text-slate-600 shadow-none hover:bg-sky-50 hover:text-sky-700"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              className={`h-9 px-3 shadow-none ${
                selectedDate === todayDate
                  ? "bg-sky-50 text-sky-700 hover:bg-sky-100"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setSelectedDate(todayDate)}
              type="button"
              variant={selectedDate === todayDate ? "secondary" : "outline"}
            >
              Hoy
            </Button>
          </div>

          <Tabs
            className="min-w-0"
            onValueChange={setSelectedStaffId}
            value={selectedStaffId}
          >
            <div>
              <TabsList className="flex h-auto flex-wrap justify-start gap-x-4 gap-y-1 rounded-none bg-transparent p-0">
                {CHINOS_BARBERS.map((barber) => (
                  <TabsTrigger
                    className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-0 pb-2 pt-1 text-sm font-medium text-slate-500 shadow-none transition-colors hover:text-slate-950 data-[state=active]:border-sky-500 data-[state=active]:bg-transparent data-[state=active]:text-sky-700 data-[state=active]:shadow-none"
                    key={barber.staffId}
                    value={barber.staffId}
                  >
                    {barber.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>
      </section>

      {error && (
        <Alert className="animate-card-in rounded-lg border-red-200 bg-red-50 text-red-800" variant="destructive">
          <AlertTitle>Agenda temporalmente no disponible.</AlertTitle>
          <AlertDescription className="mt-1 flex flex-col gap-3 text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>Revisa la conexion e intenta nuevamente.</span>
            <Button
              className="h-9 w-full border-red-200 bg-white text-red-700 shadow-none hover:bg-red-50 sm:w-auto"
              disabled={busyLoading}
              onClick={() => loadBusySlots(selectedDate, { force: true })}
              type="button"
              variant="outline"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section className="animate-card-in">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              {getSelectedDateLabel(selectedDate, todayDate)}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-xl font-semibold uppercase tracking-[0.08em] text-slate-950">
                {selectedBarber?.label || "Sin seleccionar"}
              </h2>
              {staffLoading ? (
                <Skeleton className="h-5 w-28 bg-slate-200" />
              ) : schedule.isWorkingDay ? (
                <p className="text-sm font-medium tabular-nums text-slate-600">
                  {schedule.label}
                </p>
              ) : null}
            </div>
          </div>

          {busyLoading ? (
            <Skeleton className="h-6 w-24 rounded-md bg-slate-200" />
          ) : schedule.isWorkingDay ? (
            <Badge className="w-fit border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50" variant="outline">
              {selectedBusySlots.length} ocupados
            </Badge>
          ) : null}
        </div>

        <Separator className="mt-3 bg-slate-200" />

        <div className="mt-1">
          {isInitialLoading ? (
            <div className="mx-auto w-full max-w-3xl space-y-3 pt-3">
              <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-0 sm:grid-cols-[3.75rem_minmax(0,1fr)]">
                <div className="space-y-12 pt-1">
                  {[0, 1, 2, 3].map((item) => (
                    <Skeleton className="h-3 w-9 bg-slate-200" key={item} />
                  ))}
                </div>
                <div className="relative h-[280px] border-l border-slate-200">
                  <Skeleton className="absolute left-2 top-3 h-12 w-[76%] rounded-md bg-slate-200" />
                  <Skeleton className="absolute left-2 top-32 h-14 w-[88%] rounded-md bg-slate-200" />
                  <Skeleton className="absolute left-2 top-56 h-10 w-[64%] rounded-md bg-slate-200" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="py-6 text-sm text-slate-500">
              Agenda temporalmente no disponible.
            </div>
          ) : !schedule.isWorkingDay ? (
            <div className="flex items-center gap-2 py-6 text-sm font-medium text-slate-500">
              <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
              No trabaja este dia
            </div>
          ) : (
            <DayTimeline
              busySlots={selectedBusySlots}
              selectedDate={selectedDate}
              shifts={schedule.shifts || []}
              todayDate={todayDate}
            />
          )}
        </div>
      </section>
    </div>
  );
}
