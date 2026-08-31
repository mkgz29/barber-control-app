const BUSINESS_WEEKDAY_NAMES = [
  "Sabado",
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
];

const CALENDAR_WEEKDAY_NAMES = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];

const ARGENTINA_TIME_ZONE = "America/Argentina/Tucuman";

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export const ATTENDANCE_TYPE_LABELS = {
  appointment: "Con turno",
  walk_in: "Orden de llegada",
};

export function formatAttendanceType(value) {
  return ATTENDANCE_TYPE_LABELS[value] ?? "Sin especificar";
}

export function formatArgentinaTime(value) {
  if (!value) {
    return "Sin hora";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin hora";
  }

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(date);
}

function getArgentinaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
  }).formatToParts(date);

  return {
    day: parts.find((part) => part.type === "day")?.value ?? "01",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
  };
}

function getArgentinaDateValue(date = new Date()) {
  const parts = getArgentinaDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseDateValue(dateValue) {
  if (dateValue instanceof Date) {
    return parseDateValue(getArgentinaDateValue(dateValue));
  }

  const [year, month, day] = String(dateValue).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(dateValue, amount) {
  const date = parseDateValue(dateValue);
  date.setDate(date.getDate() + amount);
  return date;
}

function getHaircutDateValue(haircut) {
  return haircut?.haircut_date ?? null;
}

function getHaircutFinalPriceValue(haircut) {
  return Number(haircut?.final_price ?? haircut?.price ?? 0);
}

export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getArgentinaTodayValue(date = new Date()) {
  return getArgentinaDateValue(date);
}

export function getStartOfWeek(date = new Date()) {
  return getBusinessWeekRange(date).start;
}

export function getCurrentWeek(baseDate = new Date()) {
  return getBusinessWeekDays(baseDate);
}

export function getBusinessWeekRange(referenceDate = new Date()) {
  const reference = parseDateValue(referenceDate);
  const day = reference.getDay();
  const diffFromSaturday = (day - 6 + 7) % 7;
  const start = new Date(reference);
  start.setDate(reference.getDate() - diffFromSaturday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getBusinessWeekDays(referenceDate = new Date()) {
  const { start } = getBusinessWeekRange(referenceDate);

  return BUSINESS_WEEKDAY_NAMES.map((label, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);

    return {
      label,
      date: toDateInputValue(current),
      shortLabel: new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: ARGENTINA_TIME_ZONE,
      }).format(current),
    };
  });
}

export function getCalendarWeekRange(referenceDate = new Date()) {
  const reference = parseDateValue(referenceDate);
  const day = reference.getDay();
  const diffFromMonday = (day - 1 + 7) % 7;
  const start = new Date(reference);
  start.setDate(reference.getDate() - diffFromMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getCalendarWeekDays(referenceDate = new Date()) {
  const { start } = getCalendarWeekRange(referenceDate);

  return CALENDAR_WEEKDAY_NAMES.map((label, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);

    return {
      label,
      date: toDateInputValue(current),
      shortLabel: new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: ARGENTINA_TIME_ZONE,
      }).format(current),
    };
  });
}

export function addCalendarDays(dateValue, amount) {
  return toDateInputValue(addDays(dateValue, amount));
}

export function addCalendarWeeks(dateValue, amount) {
  return addCalendarDays(dateValue, amount * 7);
}

export function getWeeklyHistoryInitialDateValue(referenceDate = new Date()) {
  const todayValue = getArgentinaTodayValue(referenceDate);
  const today = parseDateValue(todayValue);

  if (today.getDay() === 1) {
    return addCalendarDays(todayValue, -7);
  }

  return todayValue;
}

export function formatBusinessWeekRange(range) {
  const formatDate = (date) => {
    const parts = new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: ARGENTINA_TIME_ZONE,
      weekday: "long",
    }).formatToParts(date);
    const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
    const day = parts.find((part) => part.type === "day")?.value ?? "";
    const month = parts.find((part) => part.type === "month")?.value ?? "";

    return `${weekday} ${day}/${month}`;
  };

  return `Semana actual: ${formatDate(range.start)} al ${formatDate(range.end)}`;
}

export function getWeekDays(baseDate = new Date()) {
  return getCurrentWeek(baseDate);
}

export function getWeekRange(baseDate = new Date()) {
  return getBusinessWeekRange(baseDate);
}

export function formatDateLabel(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

export function getMonthRange(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
}

export function getCurrentMonthValue() {
  const now = getArgentinaDateParts(new Date());
  return `${now.year}-${now.month}`;
}

export function getBusinessMonthWeekBlocks(monthValue = getCurrentMonthValue()) {
  const [year, month] = monthValue.split("-").map(Number);
  const monthStart = toDateInputValue(new Date(year, month - 1, 1, 12));
  const monthEnd = toDateInputValue(new Date(year, month, 0, 12));
  let currentStart = monthStart;
  const blocks = [];

  while (currentStart <= monthEnd) {
    const { end: businessWeekEnd } = getBusinessWeekRange(currentStart);
    const clippedEnd = toDateInputValue(businessWeekEnd) > monthEnd
      ? parseDateValue(monthEnd)
      : businessWeekEnd;
    const weekStart = parseDateValue(currentStart);
    const weekEnd = clippedEnd;

    blocks.push({
      key: currentStart,
      label: `Sem. ${blocks.length + 1}`,
      start: currentStart,
      end: toDateInputValue(weekEnd),
      displayRange: formatBusinessWeekRange({ start: weekStart, end: weekEnd }).replace(
        "Semana actual: ",
        ""
      ),
      count: 0,
      gross: 0,
      commission: 0,
    });

    currentStart = toDateInputValue(addDays(toDateInputValue(weekEnd), 1));
  }

  return blocks;
}

export function groupHaircutsByBusinessWeeks(haircuts, monthValue = getCurrentMonthValue()) {
  const blocks = getBusinessMonthWeekBlocks(monthValue);
  const range = getMonthRange(monthValue);

  (haircuts || []).forEach((haircut) => {
    const haircutDate = getHaircutDateValue(haircut);

    if (!haircutDate || haircutDate < range.start || haircutDate > range.end) {
      return;
    }

    const block = blocks.find((item) => haircutDate >= item.start && haircutDate <= item.end);

    if (!block) {
      return;
    }

    block.count += 1;
    block.gross += getHaircutFinalPriceValue(haircut);
    block.commission += Number(haircut.commission_amount || 0);
  });

  return blocks;
}

export function getWeekLabelFromDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const { start: weekStart, end: weekEnd } = getBusinessWeekRange(date);

  const startLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(weekStart);

  const endLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(weekEnd);

  return `Semana ${startLabel} al ${endLabel}`;
}
