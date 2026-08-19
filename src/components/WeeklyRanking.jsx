import { Crown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

function getCutsLabel(totalCuts) {
  return `${totalCuts} ${totalCuts === 1 ? "corte" : "cortes"}`;
}

function RankingRow({ entry, position, onClick }) {
  const isTop = position === 0;
  const isTopThree = position < 3;
  const Component = typeof onClick === "function" ? "button" : "article";
  const barbershopName = getBarbershopName(entry);

  return (
    <Component
      className="w-full text-left"
      onClick={onClick}
      {...(typeof onClick === "function" ? { type: "button" } : {})}
    >
      <div className="grid min-h-14 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold ${
            isTopThree ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {position + 1}
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-semibold text-slate-950">
              {entry.barber_name || "Sin nombre"}
            </p>
            {isTop && (
              <Badge className="hidden border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-50 sm:inline-flex" variant="outline">
                <Crown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Top semanal
              </Badge>
            )}
          </div>
          {barbershopName && (
            <p className="truncate text-sm text-slate-500">{barbershopName}</p>
          )}
        </div>

        <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-950">
          {getCutsLabel(entry.total_cuts)}
        </p>
      </div>
    </Component>
  );
}

export default function WeeklyRanking({ ranking = [], onSelectEntry }) {
  return (
    <section className="p-0">
      {ranking.length === 0 ? (
        <div className="py-6 text-sm text-slate-500">
          Todavia no hay cortes registrados esta semana.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-3 sm:px-4">
          {ranking.map((entry, index) => (
            <div key={`${entry.barber_name}-${index}`}>
              <RankingRow
                entry={entry}
                onClick={onSelectEntry ? () => onSelectEntry(entry) : undefined}
                position={index}
              />
              {index < ranking.length - 1 && <Separator className="bg-slate-200" />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
