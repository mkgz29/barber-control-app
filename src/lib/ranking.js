function parseLocalDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const copy = new Date(value);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  if (typeof value === "string") {
    const parts = value.split("-").map(Number);

    if (parts.length === 3 && parts.every((part) => Number.isInteger(part))) {
      const [year, month, day] = parts;
      return new Date(year, month - 1, day);
    }
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getBarberName(haircut) {
  const rawName = haircut?.barberName ?? haircut?.barber_name ?? "";
  const trimmedName = String(rawName).trim();

  return trimmedName || "Sin nombre";
}

function getHaircutDate(haircut) {
  return parseLocalDate(haircut?.date ?? haircut?.haircut_date ?? haircut?.created_at);
}

export function getCurrentWeekRange(referenceDate = new Date()) {
  const start = parseLocalDate(referenceDate) ?? new Date();
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function filterCurrentWeekHaircuts(haircuts, referenceDate = new Date()) {
  const { start, end } = getCurrentWeekRange(referenceDate);

  return (haircuts || []).filter((haircut) => {
    const haircutDate = getHaircutDate(haircut);

    return haircutDate && haircutDate >= start && haircutDate <= end;
  });
}

export function getWeeklyBarberRanking(haircuts, options = {}) {
  const { limit = 5, referenceDate = new Date() } = options;
  const weeklyHaircuts = filterCurrentWeekHaircuts(haircuts, referenceDate);

  if (weeklyHaircuts.length === 0) {
    return [];
  }

  const totalsByBarber = weeklyHaircuts.reduce((accumulator, haircut) => {
    const barberName = getBarberName(haircut);
    const currentTotal = accumulator.get(barberName) || 0;

    accumulator.set(barberName, currentTotal + 1);
    return accumulator;
  }, new Map());

  return Array.from(totalsByBarber.entries())
    .map(([barberName, totalCuts]) => ({ barberName, totalCuts }))
    .sort(
      (left, right) =>
        right.totalCuts - left.totalCuts ||
        left.barberName.localeCompare(right.barberName, "es")
    )
    .slice(0, limit);
}
