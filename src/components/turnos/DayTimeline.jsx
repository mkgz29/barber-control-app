import { Badge } from "@/components/ui/badge";

const PIXELS_PER_MINUTE = 1;
const HOUR_MARK_INTERVAL = 60;
const SHORT_SLOT_THRESHOLD = 30;

function formatTime(value) {
  return String(value || "").slice(0, 5);
}

function minutesFromTime(value) {
  const [hours, minutes] = formatTime(value).split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`;
}

function normalizeShift(shift) {
  const startMinutes = minutesFromTime(shift?.start);
  const endMinutes = minutesFromTime(shift?.end);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return null;
  }

  return {
    start: formatTime(shift.start),
    end: formatTime(shift.end),
    startMinutes,
    endMinutes,
    duration: endMinutes - startMinutes,
  };
}

function normalizeBusySlot(slot) {
  const startMinutes = minutesFromTime(slot?.start_time);
  const endMinutes = minutesFromTime(slot?.end_time);

  if (
    startMinutes === null ||
    endMinutes === null ||
    endMinutes <= startMinutes
  ) {
    return null;
  }

  return {
    ...slot,
    start: formatTime(slot.start_time),
    end: formatTime(slot.end_time),
    startMinutes,
    endMinutes,
    duration: endMinutes - startMinutes,
  };
}

function getHourMarks(shift) {
  const firstHour = Math.ceil(shift.startMinutes / HOUR_MARK_INTERVAL) * HOUR_MARK_INTERVAL;
  const marks = [
    {
      label: formatMinutes(shift.startMinutes),
      minutes: shift.startMinutes,
    },
  ];

  for (let minutes = firstHour; minutes < shift.endMinutes; minutes += HOUR_MARK_INTERVAL) {
    if (minutes !== shift.startMinutes) {
      marks.push({
        label: formatMinutes(minutes),
        minutes,
      });
    }
  }

  marks.push({
    label: formatMinutes(shift.endMinutes),
    minutes: shift.endMinutes,
  });

  return marks;
}

function getSlotsInsideShift(busySlots, shift) {
  return busySlots
    .map(normalizeBusySlot)
    .filter(Boolean)
    .filter(
      (slot) =>
        slot.startMinutes >= shift.startMinutes &&
        slot.endMinutes <= shift.endMinutes
    )
    .sort((left, right) => left.startMinutes - right.startMinutes);
}

function layoutOverlappingSlots(slots) {
  const clusters = [];

  slots.forEach((slot) => {
    const currentCluster = clusters[clusters.length - 1];

    if (!currentCluster || slot.startMinutes >= currentCluster.endMinutes) {
      clusters.push({
        endMinutes: slot.endMinutes,
        slots: [slot],
      });
      return;
    }

    currentCluster.slots.push(slot);
    currentCluster.endMinutes = Math.max(currentCluster.endMinutes, slot.endMinutes);
  });

  return clusters.flatMap((cluster) => {
    const columnEnds = [];
    const positionedSlots = cluster.slots.map((slot) => {
      const availableColumn = columnEnds.findIndex((endMinutes) => slot.startMinutes >= endMinutes);
      const columnIndex = availableColumn === -1 ? columnEnds.length : availableColumn;
      columnEnds[columnIndex] = slot.endMinutes;

      return {
        ...slot,
        columnIndex,
      };
    });

    const totalColumns = Math.max(columnEnds.length, 1);

    return positionedSlots.map((slot) => ({
      ...slot,
      totalColumns,
    }));
  });
}

function getCurrentTimePosition(shift, selectedDate, todayDate) {
  if (selectedDate !== todayDate) {
    return null;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (currentMinutes < shift.startMinutes || currentMinutes > shift.endMinutes) {
    return null;
  }

  return {
    label: formatMinutes(currentMinutes),
    top: (currentMinutes - shift.startMinutes) * PIXELS_PER_MINUTE,
  };
}

function TimelineShift({ busySlots, isMultiShift, selectedDate, shift, todayDate }) {
  const hourMarks = getHourMarks(shift);
  const positionedSlots = layoutOverlappingSlots(getSlotsInsideShift(busySlots, shift));
  const currentTimePosition = getCurrentTimePosition(shift, selectedDate, todayDate);
  const height = shift.duration * PIXELS_PER_MINUTE;

  return (
    <div className="space-y-2">
      {isMultiShift && (
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
          Jornada {shift.start} - {shift.end}
        </p>
      )}

      <div
        className="relative grid w-full grid-cols-[3.25rem_minmax(0,1fr)] sm:grid-cols-[3.75rem_minmax(0,1fr)]"
        style={{ height }}
      >
        <div className="relative">
          {hourMarks.map((mark) => (
            <span
              className="absolute -translate-y-1/2 text-[11px] font-medium tabular-nums text-slate-400 sm:text-xs"
              key={`${shift.start}-${mark.label}`}
              style={{
                top: `${(mark.minutes - shift.startMinutes) * PIXELS_PER_MINUTE}px`,
              }}
            >
              {mark.label}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 border-l border-slate-200">
          {hourMarks.map((mark) => (
            <div
              className="absolute left-0 right-0 border-t border-slate-100"
              key={`${shift.start}-${mark.label}-line`}
              style={{
                top: `${(mark.minutes - shift.startMinutes) * PIXELS_PER_MINUTE}px`,
              }}
            />
          ))}

          {currentTimePosition && (
            <div
              className="absolute left-0 right-0 z-20 flex items-center gap-2"
              style={{ top: `${currentTimePosition.top}px` }}
            >
              <span className="h-px flex-1 bg-sky-500" />
              <span className="-translate-y-1/2 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium tabular-nums text-sky-700 ring-1 ring-sky-200">
                {currentTimePosition.label}
              </span>
            </div>
          )}

          {positionedSlots.map((slot, index) => {
            const columnWidth = 100 / slot.totalColumns;
            const left = columnWidth * slot.columnIndex;
            const height = slot.duration * PIXELS_PER_MINUTE;
            const isShortSlot = slot.duration < SHORT_SLOT_THRESHOLD;
            const isOverlapping = slot.totalColumns > 1;
            const showBadge = !isShortSlot && !isOverlapping;

            return (
              <div
                className="absolute z-10 min-w-0 overflow-hidden rounded-md border border-slate-200 border-l-sky-400 bg-slate-50 text-slate-800 shadow-sm shadow-slate-900/5"
                key={`${slot.staff_id}-${slot.date}-${slot.start_time}-${slot.end_time}-${index}`}
                style={{
                  top: `${(slot.startMinutes - shift.startMinutes) * PIXELS_PER_MINUTE}px`,
                  height: `${height}px`,
                  left: `calc(${left}% + 0.25rem)`,
                  width: `calc(${columnWidth}% - 0.5rem)`,
                }}
              >
                <div
                  className={`flex h-full min-w-0 items-center justify-between gap-1.5 px-2 ${
                    isShortSlot ? "py-0" : "py-1"
                  }`}
                >
                  <p
                    className={`min-w-0 whitespace-nowrap font-semibold tabular-nums text-slate-950 ${
                      isShortSlot || isOverlapping
                        ? "text-[11px] leading-none"
                        : "text-xs sm:text-sm"
                    }`}
                  >
                    {slot.start} - {slot.end}
                  </p>
                  {showBadge && (
                    <Badge
                      className="shrink-0 border-slate-200 bg-white px-1.5 py-0 text-[10px] font-medium leading-4 text-slate-600 hover:bg-white"
                      variant="outline"
                    >
                      Ocupado
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DayTimeline({ busySlots, selectedDate, shifts, todayDate }) {
  const normalizedShifts = shifts.map(normalizeShift).filter(Boolean);

  if (normalizedShifts.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pt-3">
      {normalizedShifts.map((shift) => (
        <TimelineShift
          busySlots={busySlots}
          isMultiShift={normalizedShifts.length > 1}
          key={`${shift.start}-${shift.end}`}
          selectedDate={selectedDate}
          shift={shift}
          todayDate={todayDate}
        />
      ))}
    </div>
  );
}
