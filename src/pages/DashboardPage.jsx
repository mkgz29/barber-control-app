import { useEffect, useMemo, useState } from "react";
import DayCard from "../components/DayCard";
import StatCard from "../components/StatCard";
import WeeklyRanking from "../components/WeeklyRanking";
import { useAuth } from "../context/AuthContext";
import { getWeekDays } from "../lib/date";
import { getWeeklyBarberRanking } from "../lib/ranking";
import supabase from "../lib/supabaseClient";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [haircuts, setHaircuts] = useState([]);
  const [weeklyRanking, setWeeklyRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [rankingError, setRankingError] = useState("");

  const days = useMemo(() => getWeekDays(new Date()), []);

  async function loadHaircuts() {
    setLoading(true);
    setError("");
    setRankingError("");

    try {
      const [
        { data: weeklyUserHaircuts, error: fetchError },
        { data: globalWeeklyHaircuts, error: globalFetchError },
      ] = await Promise.all([
        supabase
          .from("haircuts")
          .select("*")
          .eq("user_id", user.id)
          .gte("haircut_date", days[0].date)
          .lte("haircut_date", days[days.length - 1].date)
          .order("haircut_date", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase.rpc("get_global_weekly_haircuts"),
      ]);

      if (fetchError) {
        throw fetchError;
      }

      if (globalFetchError) {
        setRankingError(globalFetchError.message || "No se pudo cargar el ranking semanal.");
      }

      setHaircuts(weeklyUserHaircuts || []);
      setWeeklyRanking(getWeeklyBarberRanking(globalWeeklyHaircuts || []));
    } catch (loadError) {
      setError(loadError.message || "No se pudieron cargar los cortes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadHaircuts();
    }
  }, [user?.id]);

  function buildHaircutPayload(values) {
    const commissionPercentage = Number(profile?.commission_percentage || 0);
    const price = Number(values.price);

    return {
      service: values.service,
      price,
      haircut_date: values.haircut_date,
      commission_percentage: commissionPercentage,
      commission_amount: (price * commissionPercentage) / 100,
    };
  }

  async function handleAddHaircut(values) {
    setSaving(true);
    setError("");

    try {
      const { error: insertError } = await supabase.from("haircuts").insert({
        user_id: user.id,
        ...buildHaircutPayload(values),
      });

      if (insertError) {
        throw insertError;
      }

      await loadHaircuts();
    } catch (submitError) {
      setError(submitError.message || "No se pudo guardar el corte.");
      throw submitError;
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateHaircut(haircutId, values) {
    setSaving(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("haircuts")
        .update(buildHaircutPayload(values))
        .eq("id", haircutId)
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      await loadHaircuts();
    } catch (submitError) {
      setError(submitError.message || "No se pudo actualizar el corte.");
      throw submitError;
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHaircut(haircutId) {
    setSaving(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("haircuts")
        .delete()
        .eq("id", haircutId)
        .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      await loadHaircuts();
    } catch (submitError) {
      setError(submitError.message || "No se pudo eliminar el corte.");
      throw submitError;
    } finally {
      setSaving(false);
    }
  }

  const weeklyGross = haircuts.reduce((sum, haircut) => sum + Number(haircut.price), 0);
  const weeklyCommission = haircuts.reduce(
    (sum, haircut) => sum + Number(haircut.commission_amount),
    0
  );

  return (
    <div className="space-y-5">
      <section className="card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-700">
              Resumen semanal
            </p>
            <h1 className="mt-2 text-3xl font-bold text-stone-900">Resumen semanal</h1>
            <p className="mt-2 text-sm text-stone-600">Revisa lo cargado entre lunes y sabado.</p>
          </div>
          <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
            Comision actual: <strong>{Number(profile?.commission_percentage || 0)}%</strong>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <StatCard highlight money title="Total semanal (bruto)" value={weeklyGross} />
          <StatCard money title="Total semanal de comision" value={weeklyCommission} />
        </div>
      </section>

      {rankingError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {rankingError}
        </div>
      )}

      <WeeklyRanking ranking={weeklyRanking} />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-center text-sm text-stone-500">Cargando cortes...</div>
      ) : (
        <div className="grid gap-4">
          {days.map((day) => (
            <DayCard
              day={day}
              haircuts={haircuts.filter((haircut) => haircut.haircut_date === day.date)}
              key={day.date}
              onAddHaircut={handleAddHaircut}
              onDeleteHaircut={handleDeleteHaircut}
              onUpdateHaircut={handleUpdateHaircut}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  );
}
