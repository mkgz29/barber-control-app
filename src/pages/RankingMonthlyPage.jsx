import { useEffect, useMemo, useState } from "react";
import { Award, Medal, Trophy } from "lucide-react";
import { getArgentinaTodayValue } from "../lib/date";
import supabase from "../lib/supabaseClient";

function getMonthLabel(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Tucuman",
  }).format(new Date(year, month - 1, day));
}

function getRankLabel(position) {
  return `${position + 1}\u00b0`;
}

function getPodiumClassName(position) {
  if (position === 0) {
    return "border-brand-200 bg-[linear-gradient(145deg,rgba(255,247,241,0.98)_0%,rgba(255,255,255,0.96)_54%,rgba(250,250,249,0.96)_100%)] shadow-[0_24px_56px_-34px_rgba(89,47,37,0.38)]";
  }

  if (position === 1) {
    return "border-stone-200 bg-white/95 shadow-[0_18px_42px_-34px_rgba(41,37,36,0.32)]";
  }

  if (position === 2) {
    return "border-brand-100 bg-brand-50/45 shadow-[0_16px_36px_-32px_rgba(89,47,37,0.24)]";
  }

  return "border-stone-200 bg-white/90";
}

function RankIcon({ position }) {
  if (position === 0) {
    return <Trophy className="h-5 w-5" aria-hidden="true" />;
  }

  if (position < 3) {
    return <Medal className="h-5 w-5" aria-hidden="true" />;
  }

  return <Award className="h-5 w-5" aria-hidden="true" />;
}

function RankingCard({ entry, position }) {
  const isPodium = position < 3;

  return (
    <article
      className={`tap-card grid gap-3 rounded-[1.35rem] border p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${
        isPodium ? getPodiumClassName(position) : "border-stone-200 bg-white/90"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
          position === 0
            ? "bg-brand-700 text-white"
            : isPodium
              ? "bg-stone-950 text-white"
              : "bg-stone-100 text-stone-700"
        }`}
      >
        <RankIcon position={position} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge ${isPodium ? "badge-brand" : ""}`}>{getRankLabel(position)}</span>
          {isPodium && (
            <span className="badge border-brand-200 bg-brand-50 text-brand-800">
              Top {position + 1}
            </span>
          )}
        </div>
        <h2 className="mt-2 break-words text-lg font-semibold text-stone-950">
          {entry.barber_name || "Sin nombre"}
        </h2>
        {entry.barbershop_name && (
          <p className="mt-1 break-words text-sm text-stone-500">{entry.barbershop_name}</p>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white/85 px-4 py-3 sm:min-w-[9rem] sm:text-right">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
          Cortes
        </p>
        <p className="mt-1 text-2xl font-semibold text-stone-950">{entry.total_cuts}</p>
      </div>
    </article>
  );
}

export default function RankingMonthlyPage() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const todayDate = useMemo(() => getArgentinaTodayValue(new Date()), []);
  const monthLabel = useMemo(() => getMonthLabel(todayDate), [todayDate]);

  useEffect(() => {
    async function loadRanking() {
      setLoading(true);
      setError("");

      try {
        const { data, error: rankingError } = await supabase.rpc(
          "get_monthly_haircut_ranking",
          {
            reference_date: todayDate,
          }
        );

        if (rankingError) {
          throw rankingError;
        }

        setRanking(data || []);
      } catch (loadError) {
        setError(loadError.message || "No se pudo cargar el ranking mensual.");
      } finally {
        setLoading(false);
      }
    }

    loadRanking();
  }, [todayDate]);

  return (
    <div className="space-y-5">
      <section className="card animate-card-in overflow-hidden">
        <div className="bg-[linear-gradient(135deg,#1c1917_0%,#292524_64%,#3b332f_100%)] px-4 py-6 text-white sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-brand-200">
                Ranking mensual
              </p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Ranking mensual</h1>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                Cortes realizados durante el mes actual
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold capitalize text-white">
              <Trophy className="h-4 w-4 text-brand-200" aria-hidden="true" />
              {monthLabel}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-24 animate-pulse rounded-[1.35rem] bg-stone-100" />
              <div className="h-24 animate-pulse rounded-[1.35rem] bg-stone-100" />
              <div className="h-24 animate-pulse rounded-[1.35rem] bg-stone-100" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : ranking.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              Todavia no hay cortes cargados este mes.
            </div>
          ) : (
            <div className="space-y-3">
              {ranking.map((entry, index) => (
                <RankingCard
                  entry={entry}
                  key={`${entry.barber_name}-${entry.barbershop_name || "sin-barberia"}-${index}`}
                  position={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
