import { Crown } from "lucide-react";

function getBarbershopName(entry) {
  const rawBarbershopName =
    entry?.barbershop_name ??
    entry?.barbershopName ??
    entry?.shop_name ??
    entry?.shopName ??
    "";
  const trimmedBarbershopName = String(rawBarbershopName).trim();

  return trimmedBarbershopName || null;
}

function getPodiumCardClassName(position) {
  if (position === 0) {
    return "border-amber-200/80 bg-[linear-gradient(160deg,rgba(255,251,235,0.98)_0%,rgba(255,255,255,0.96)_48%,rgba(245,245,244,0.96)_100%)] shadow-[0_24px_60px_-28px_rgba(180,83,9,0.35)]";
  }

  if (position === 1) {
    return "border-stone-200/90 bg-[linear-gradient(160deg,rgba(250,250,249,0.98)_0%,rgba(255,255,255,0.95)_55%,rgba(245,245,244,0.95)_100%)] shadow-[0_18px_40px_-30px_rgba(41,37,36,0.32)]";
  }

  return "border-stone-200/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.98)_0%,rgba(250,250,249,0.96)_60%,rgba(245,245,244,0.94)_100%)] shadow-[0_16px_36px_-30px_rgba(41,37,36,0.28)]";
}

function getPositionBadgeClassName(position) {
  if (position === 0) {
    return "bg-amber-500 text-white shadow-[0_12px_30px_-18px_rgba(180,83,9,0.8)]";
  }

  if (position === 1) {
    return "bg-stone-900 text-white";
  }

  if (position === 2) {
    return "bg-stone-200 text-stone-800";
  }

  return "bg-stone-100 text-stone-600";
}

function getCutsLabel(totalCuts) {
  return `${totalCuts} ${totalCuts === 1 ? "corte" : "cortes"}`;
}

function RankingCardShell({ children, className, interactive = false, onClick }) {
  const Component = interactive ? "button" : "article";

  return (
    <Component
      className={`group relative w-full overflow-hidden rounded-[1.75rem] border text-left transition-all duration-200 ${className} ${
        interactive
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-32px_rgba(41,37,36,0.35)] focus:outline-none focus:ring-2 focus:ring-brand-200"
          : ""
      }`}
      onClick={onClick}
      {...(interactive ? { type: "button" } : {})}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
      {children}
    </Component>
  );
}

function RankingIdentity({ entry, position, compact = false }) {
  const isFirstPlace = position === 0;
  const titleClassName = compact ? "text-base sm:text-lg" : isFirstPlace ? "text-2xl sm:text-[1.75rem]" : "text-xl";
  const subtitleClassName = compact ? "text-xs" : "text-sm";
  const barbershopName = getBarbershopName(entry);

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-stone-500">
          Puesto #{position + 1}
        </p>
        {isFirstPlace && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-800">
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            Top semanal
          </span>
        )}
      </div>

      <h3
        className={`mt-3 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-semibold leading-tight text-stone-950 ${titleClassName}`}
        title={entry.barber_name}
      >
        {entry.barber_name}
      </h3>

      {barbershopName && (
        <p
          className={`mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-stone-500 italic ${subtitleClassName}`}
          title={barbershopName}
        >
          {barbershopName}
        </p>
      )}
    </div>
  );
}

function CutsMetric({ totalCuts, compact = false }) {
  return (
    <div
      className={`rounded-[1.35rem] border border-white/80 bg-white/85 backdrop-blur ${
        compact ? "min-w-[112px] px-3 py-2.5" : "min-w-[132px] px-4 py-3"
      }`}
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
        Cortes
      </p>
      <p className={`mt-1 font-semibold leading-none text-stone-950 ${compact ? "text-2xl" : "text-4xl"}`}>
        {totalCuts}
      </p>
      <p className="mt-1 text-xs text-stone-500">esta semana</p>
    </div>
  );
}

function PodiumCard({ entry, position, onClick }) {
  const isFirstPlace = position === 0;
  const interactive = typeof onClick === "function";

  return (
    <RankingCardShell
      className={`${getPodiumCardClassName(position)} ${isFirstPlace ? "p-5 sm:p-6" : "p-5"}`}
      interactive={interactive}
      onClick={onClick}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-5">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold sm:h-11 sm:w-11 sm:text-base ${getPositionBadgeClassName(
              position
            )}`}
          >
            #{position + 1}
          </span>
          <RankingIdentity entry={entry} position={position} />
        </div>

        <div className="flex justify-start sm:justify-end">
          <CutsMetric totalCuts={entry.total_cuts} />
        </div>
      </div>
    </RankingCardShell>
  );
}

function RankingRow({ entry, position, onClick }) {
  const interactive = typeof onClick === "function";

  return (
    <li>
      <RankingCardShell
        className="border-stone-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(250,250,249,0.98)_100%)] px-4 py-4 shadow-[0_14px_34px_-32px_rgba(41,37,36,0.32)]"
        interactive={interactive}
        onClick={onClick}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${getPositionBadgeClassName(
                position
              )}`}
            >
              #{position + 1}
            </span>
            <RankingIdentity compact entry={entry} position={position} />
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-sm font-medium text-stone-500">{getCutsLabel(entry.total_cuts)}</p>
            <CutsMetric compact totalCuts={entry.total_cuts} />
          </div>
        </div>
      </RankingCardShell>
    </li>
  );
}

export default function WeeklyRanking({ ranking = [], onSelectEntry }) {
  const podium = ranking.slice(0, 3);
  const remaining = ranking.slice(3);

  return (
    <section className="card p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
            Ranking semanal
          </p>
          <h2 className="mt-2 text-3xl font-bold text-stone-900">Ranking semanal</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Un vistazo claro al movimiento de la semana para reconocer consistencia y buen
            rendimiento.
          </p>
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center">
          <p className="text-lg font-semibold text-stone-800">
            Todavia no hay cortes registrados esta semana.
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Cuando empiecen a cargarse cortes, el top 5 global aparecera aca.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.925fr_0.925fr]">
            {podium.map((entry, index) => (
              <PodiumCard
                entry={entry}
                key={`${entry.barber_name}-${index}`}
                onClick={onSelectEntry ? () => onSelectEntry(entry) : undefined}
                position={index}
              />
            ))}
          </div>

          {remaining.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Top completo
              </p>
              <ol className="space-y-3">
                {remaining.map((entry, index) => (
                  <RankingRow
                    entry={entry}
                    key={`${entry.barber_name}-${index}`}
                    onClick={onSelectEntry ? () => onSelectEntry(entry) : undefined}
                    position={index + podium.length}
                  />
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
