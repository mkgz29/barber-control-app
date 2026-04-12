import { Crown, Trophy } from "lucide-react";

export function getTrophyColor(position) {
  if (position === 0) {
    return "text-yellow-500";
  }

  if (position === 1) {
    return "text-gray-400";
  }

  if (position === 2) {
    return "text-amber-700";
  }

  return "text-stone-400";
}

function getPodiumCardClassName(position) {
  if (position === 0) {
    return "border-yellow-200 bg-gradient-to-br from-yellow-50 via-white to-amber-50 shadow-[0_18px_50px_-24px_rgba(202,138,4,0.45)]";
  }

  return "border-stone-200 bg-gradient-to-br from-stone-50 via-white to-stone-100 shadow-sm";
}

function PodiumCard({ entry, position }) {
  const trophyColor = getTrophyColor(position);
  const isFirstPlace = position === 0;

  return (
    <article
      className={`rounded-3xl border p-5 transition-colors ${getPodiumCardClassName(position)}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
              Puesto #{position + 1}
            </p>
            {isFirstPlace && <Crown className="h-4 w-4 text-yellow-500" aria-hidden="true" />}
          </div>
          <h3 className="mt-2 truncate text-xl font-bold text-stone-900">{entry.barber_name}</h3>
        </div>

        <div className="rounded-2xl bg-white/80 p-3 shadow-sm ring-1 ring-black/5">
          <Trophy className={`h-7 w-7 ${trophyColor}`} aria-hidden="true" strokeWidth={2.2} />
        </div>
      </div>

      <p className="mt-4 text-sm text-stone-500">Cortes registrados esta semana</p>
      <p className="mt-1 text-3xl font-bold text-stone-900">{entry.total_cuts}</p>
    </article>
  );
}

function RankingRow({ entry, position }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-stone-500">
          {position + 1}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-stone-900">{entry.barber_name}</p>
          <p className="text-sm text-stone-500">Buen ritmo esta semana</p>
        </div>
      </div>

      <p className="shrink-0 text-sm font-semibold text-stone-700">{entry.total_cuts} cortes</p>
    </li>
  );
}

export default function WeeklyRanking({ ranking = [] }) {
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
          <div className="grid gap-4 lg:grid-cols-3">
            {podium.map((entry, index) => (
              <PodiumCard entry={entry} key={`${entry.barber_name}-${index}`} position={index} />
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
