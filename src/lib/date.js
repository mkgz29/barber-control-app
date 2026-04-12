const WEEKDAY_NAMES = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getStartOfWeek(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);

  return copy;
}

export function getCurrentWeek(baseDate = new Date()) {
  const start = getStartOfWeek(baseDate);

  return WEEKDAY_NAMES.map((label, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);

    return {
      label,
      date: toDateInputValue(current),
      shortLabel: new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
      }).format(current),
    };
  });
}

export function getWeekDays(baseDate = new Date()) {
  return getCurrentWeek(baseDate);
}

export function getWeekRange(baseDate = new Date()) {
  const start = getStartOfWeek(baseDate);
  const end = new Date(start);

  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
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
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getWeekLabelFromDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekStart = getStartOfWeek(date);
  const weekEnd = new Date(weekStart);

  weekEnd.setDate(weekStart.getDate() + 6);

  const startLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(weekStart);

  const endLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(weekEnd);

  return `Semana ${startLabel} al ${endLabel}`;
}
