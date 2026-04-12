const PODIUM_BADGES = ["🥇", "🥈", "🥉"];

function PodiumCard({ entry, position }) {
  return (
    <article className="rounded-3xl border border-brand-100 bg-gradient-to-br from-amber-50 via-white to-stone-50 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
            Puesto #{position + 1}
          </p>
          <h3 className="mt-2 text-xl font-bold text-stone-900">{entry.barber_name}</h3>
        </div>
        <span className="text-3xl" aria-hidden="true">
          {PODIUM_BADGES[position]}
        </span>
      </div>

      <p className="mt-4 text-sm text-stone-500">Cortes registrados esta semana</p>
      <p className="mt-1 text-3xl font-bold text-stone-900">{entry.total_cuts}</p>
    </article>
  );
}

function RankingRow({ entry, position }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-stone-500">
          {position + 1}
        </span>
        <div>
          <p className="font-semibold text-stone-900">{entry.barber_name}</p>
          <p className="text-sm text-stone-500">Buen ritmo esta semana</p>
        </div>
      </div>

      <p className="text-sm font-semibold text-stone-700">{entry.total_cuts} cortes</p>
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