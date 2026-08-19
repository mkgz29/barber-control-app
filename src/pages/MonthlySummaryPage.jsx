import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import {
  formatCurrency,
  getCurrentMonthValue,
  getMonthRange,
  groupHaircutsByBusinessWeeks,
} from "../lib/date";
import supabase from "../lib/supabaseClient";

function addMonths(monthValue, amount) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1, 12, 0, 0, 0);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${nextYear}-${nextMonth}`;
}

function formatMonthLabel(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);

  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Tucuman",
  }).format(new Date(year, month - 1, 1, 12, 0, 0, 0));
}

function formatAverage(value) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function MonthlyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;
  const value = payload[0]?.value;
  const metric = payload[0]?.dataKey;

  return (
    <div className="max-w-[14rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg shadow-slate-900/10">
      <p className="font-semibold text-slate-950">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{item?.dateRange}</p>
      <p className="mt-2 font-semibold text-sky-700">
        {metric === "commission"
          ? formatCurrency(value)
          : `${value} ${value === 1 ? "corte" : "cortes"}`}
      </p>
    </div>
  );
}

export default function MonthlySummaryPage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [chartMetric, setChartMetric] = useState("cuts");
  const [haircuts, setHaircuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMonthlyHaircuts() {
      setLoading(true);
      setError("");

      try {
        const range = getMonthRange(month);

        const query = supabase
          .from("haircuts")
          .select("*")
          .eq("user_id", user.id)
          .gte("haircut_date", range.start)
          .lte("haircut_date", range.end)
          .order("haircut_date", { ascending: true })
          .order("created_at", { ascending: true });

        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw fetchError;
        }

        setHaircuts(data || []);
      } catch (loadError) {
        setError(loadError.message || "No se pudo cargar el resumen mensual.");
      } finally {
        setLoading(false);
      }
    }

    if (user?.id) {
      loadMonthlyHaircuts();
    }
  }, [month, user?.id]);

  const totals = useMemo(() => {
    return haircuts.reduce(
      (accumulator, haircut) => ({
        commission: accumulator.commission + Number(haircut.commission_amount),
        count: accumulator.count + 1,
      }),
      { commission: 0, count: 0 }
    );
  }, [haircuts]);

  const weeklyBlocks = useMemo(
    () => groupHaircutsByBusinessWeeks(haircuts, month),
    [haircuts, month]
  );

  const weeklySeries = useMemo(() => {
    return weeklyBlocks.map((block) => ({
      week: block.label,
      cuts: block.count,
      commission: block.commission,
      dateRange: block.displayRange,
    }));
  }, [weeklyBlocks]);

  const averageWeeklyCuts =
    weeklyBlocks.length > 0 ? totals.count / weeklyBlocks.length : 0;
  const bestWeek = weeklyBlocks.reduce((best, block) => {
    if (!best || block.count > best.count) {
      return block;
    }

    return best;
  }, null);
  const chartDataKey = chartMetric === "commission" ? "commission" : "cuts";
  const chartValueFormatter =
    chartMetric === "commission" ? (value) => formatCurrency(value) : (value) => value;
  const monthLabel = formatMonthLabel(month);

  return (
    <div className="space-y-5">
      <section className="animate-card-in space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
              Mes
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Evolucion semanal de cortes y comision.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button
              aria-label="Mes anterior"
              className="h-9 w-9 border-slate-200 bg-white text-slate-600 shadow-none hover:bg-sky-50 hover:text-sky-700"
              onClick={() => setMonth((current) => addMonths(current, -1))}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                Mes seleccionado
              </p>
              <p className="text-sm font-semibold capitalize text-slate-950">{monthLabel}</p>
            </div>
            <Button
              aria-label="Mes siguiente"
              className="h-9 w-9 border-slate-200 bg-white text-slate-600 shadow-none hover:bg-sky-50 hover:text-sky-700"
              onClick={() => setMonth((current) => addMonths(current, 1))}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <label className="sr-only" htmlFor="monthly-summary-month">
              Mes
            </label>
            <Input
              className="h-9 w-[9.5rem] border-slate-200 bg-white text-sm shadow-none focus-visible:ring-sky-100"
              id="monthly-summary-month"
              type="month"
              value={month}
              onChange={(event) => {
                if (event.target.value) {
                  setMonth(event.target.value);
                }
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Cortes
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-950">{totals.count}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Comision
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-950">
              {formatCurrency(totals.commission)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Promedio semanal
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-950">
              {formatAverage(averageWeeklyCuts)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Mejor semana
            </p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-950">
              {bestWeek ? `${bestWeek.count} cortes` : "0 cortes"}
            </p>
          </div>
        </div>
      </section>

      {error && (
        <Alert className="rounded-lg border-red-200 bg-red-50 text-red-800" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="animate-card-in space-y-4 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Evolucion del mes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Semana comercial de sabado a viernes.
            </p>
          </div>

          <Tabs onValueChange={setChartMetric} value={chartMetric}>
            <TabsList className="grid h-9 w-full grid-cols-2 rounded-lg bg-slate-100 p-1 sm:w-52">
              <TabsTrigger
                className="h-7 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-none"
                value="cuts"
              >
                Cortes
              </TabsTrigger>
              <TabsTrigger
                className="h-7 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-none"
                value="commission"
              >
                Comision
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="h-[260px] space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Skeleton className="h-5 w-36 bg-slate-200" />
            <Skeleton className="h-[205px] rounded-lg bg-slate-200" />
          </div>
        ) : weeklySeries.length === 0 ? (
          <div className="flex h-[240px] items-center rounded-lg border border-dashed border-slate-300 px-4 text-sm text-slate-500">
            No hay datos para graficar este mes.
          </div>
        ) : (
          <div className="h-[260px] w-full min-w-0 sm:h-[300px]">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart
                data={weeklySeries}
                margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="week"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={chartValueFormatter}
                  tickLine={false}
                  width={chartMetric === "commission" ? 78 : 28}
                />
                <Tooltip content={<MonthlyTooltip />} cursor={{ stroke: "#bae6fd" }} />
                <Line
                  activeDot={{ r: 5, stroke: "#0284c7", strokeWidth: 2 }}
                  dataKey={chartDataKey}
                  dot={{ r: 3, strokeWidth: 2 }}
                  name={chartMetric === "commission" ? "Comision" : "Cortes"}
                  stroke="#0284c7"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
