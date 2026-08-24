import { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import BarberAvatar from "../components/BarberAvatar";
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
  return position + 1;
}

function RankingRow({ entry, position }) {
  const isTopThree = position < 3;

  return (
    <div>
      <div className="grid min-h-14 grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold ${
            isTopThree ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {getRankLabel(position)}
        </div>

        <BarberAvatar
          name={entry.barber_name || "Sin nombre"}
          size="sm"
          src={entry.avatar_url}
        />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-semibold text-slate-950">
              {entry.barber_name || "Sin nombre"}
            </p>
            {isTopThree && (
              <Badge className="hidden border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 sm:inline-flex" variant="outline">
                Top {position + 1}
              </Badge>
            )}
          </div>
          {entry.barbershop_name && (
            <p className="truncate text-sm text-slate-500">{entry.barbershop_name}</p>
          )}
        </div>

        <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-950">
          {entry.total_cuts} {entry.total_cuts === 1 ? "corte" : "cortes"}
        </p>
      </div>
    </div>
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
      <section className="animate-card-in space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
              Ranking
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Cortes realizados durante el mes actual.
            </p>
          </div>

          <Badge className="w-fit border-slate-200 bg-white text-slate-700 hover:bg-white" variant="outline">
            <Trophy className="mr-1.5 h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            <span className="capitalize">{monthLabel}</span>
          </Badge>
        </div>
      </section>

      {error && (
        <Alert className="rounded-lg border-red-200 bg-red-50 text-red-800" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="animate-card-in">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg bg-slate-200" />
            <Skeleton className="h-14 rounded-lg bg-slate-200" />
            <Skeleton className="h-14 rounded-lg bg-slate-200" />
          </div>
        ) : ranking.length === 0 ? (
          <div className="py-6 text-sm text-slate-500">
            Todavia no hay cortes cargados este mes.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white px-3 sm:px-4">
            {ranking.map((entry, index) => (
              <div key={`${entry.barber_id || entry.barber_name}-${entry.barbershop_name || "sin-barberia"}-${index}`}>
                <RankingRow entry={entry} position={index} />
                {index < ranking.length - 1 && <Separator className="bg-slate-200" />}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
