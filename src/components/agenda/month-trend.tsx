import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarRange } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Reveal } from "@/components/reveal";
import { supabase } from "@/integrations/supabase/client";
import type { Appointment } from "@/lib/agenda";

const chartConfig = {
  total: { label: "Rendez-vous", color: "oklch(0.62 0.146 162.5)" },
  accepted: { label: "Confirmés", color: "oklch(0.62 0.146 162.5)" },
} as const;

function Delta({ value }: { value: number }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : ArrowRight;
  const tone =
    value > 0 ? "text-primary" : value < 0 ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${tone}`}>
      <Icon className="h-4 w-4" />
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

export function MonthTrend({ anchor }: { anchor: Date }) {
  const monthStart = useMemo(() => startOfMonth(anchor), [anchor]);
  const monthEnd = useMemo(() => endOfMonth(anchor), [anchor]);

  const monthQuery = useQuery({
    queryKey: ["appointments-month", monthStart.toISOString()],
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("starts_at", monthStart.toISOString())
        .lt("starts_at", addDays(monthEnd, 1).toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const appointments = monthQuery.data ?? [];

  const stats = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const series = days.map((day) => {
      const list = appointments.filter((a) => isSameDay(new Date(a.starts_at), day));
      return {
        day,
        label: format(day, "d", { locale: fr }),
        full: format(day, "EEEE d MMMM", { locale: fr }),
        total: list.length,
        accepted: list.filter((a) => a.status === "accepted").length,
        declined: list.filter((a) => a.status === "declined").length,
      };
    });

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const find = (d: Date) => series.find((s) => isSameDay(s.day, d));
    const todayCount = find(today)?.total ?? 0;
    const yesterdayCount = find(yesterday)?.total ?? 0;

    // Moyenne par jour de semaine sur le mois (jours passés uniquement)
    const past = series.filter((s) => s.day <= today);
    const weekdayMap = new Map<number, { sum: number; n: number }>();
    for (const s of past) {
      const k = s.day.getDay();
      const cur = weekdayMap.get(k) ?? { sum: 0, n: 0 };
      weekdayMap.set(k, { sum: cur.sum + s.total, n: cur.n + 1 });
    }
    const weekdays = [1, 2, 3, 4, 5, 6, 0].map((k) => {
      const e = weekdayMap.get(k) ?? { sum: 0, n: 0 };
      return {
        key: k,
        label: format(addDays(new Date(2024, 0, 7), k), "EEEE", { locale: fr }),
        avg: e.n > 0 ? e.sum / e.n : 0,
        total: e.sum,
      };
    });
    const avgAll = past.length > 0 ? past.reduce((s, d) => s + d.total, 0) / past.length : 0;
    const best = weekdays.reduce((b, w) => (w.avg > b.avg ? w : b), weekdays[0]!);
    const worst = weekdays.reduce((b, w) => (w.avg < b.avg ? w : b), weekdays[0]!);

    return {
      series,
      todayCount,
      yesterdayCount,
      delta: todayCount - yesterdayCount,
      monthTotal: appointments.length,
      accepted: appointments.filter((a) => a.status === "accepted").length,
      declined: appointments.filter((a) => a.status === "declined").length,
      pending: appointments.filter((a) => a.status === "pending").length,
      weekdays,
      avgAll,
      best,
      worst,
    };
  }, [appointments, monthStart, monthEnd]);

  const maxAvg = Math.max(0.001, ...stats.weekdays.map((w) => w.avg));

  return (
    <div className="mt-10">
      <Reveal>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Tendance du mois — {format(monthStart, "MMMM yyyy", { locale: fr })}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.monthTotal} rendez-vous · {stats.accepted} confirmés · {stats.declined} refusés ·{" "}
          {stats.pending} en attente · moyenne {stats.avgAll.toFixed(1)} / jour
        </p>
      </Reveal>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Reveal delay={0.05} className="lg:col-span-2">
          <section className="glass-panel h-full min-w-0 overflow-hidden rounded-2xl p-4">
            <h3 className="font-display text-sm font-bold">Rendez-vous demandés par jour</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Aire pleine : total demandé · aire claire : confirmés
            </p>
            <ChartContainer
              config={chartConfig}
              className="mt-4 h-[180px] min-w-0 w-full sm:h-[240px]"
            >
              <ResponsiveContainer>
                <AreaChart data={stats.series} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="areaTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-total)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-total)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                    fontSize={11}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) =>
                          (payload?.[0]?.payload as { full?: string })?.full ?? ""
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Rendez-vous"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    fill="url(#areaTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="accepted"
                    name="Confirmés"
                    stroke="var(--color-total)"
                    strokeOpacity={0.5}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </section>
        </Reveal>

        <Reveal delay={0.1}>
          <section className="glass-panel h-full min-w-0 overflow-hidden rounded-2xl p-4">
            <h3 className="font-display text-sm font-bold">Hier vs aujourd'hui</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Hier</p>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {stats.yesterdayCount}
                </p>
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Aujourd'hui</p>
                <p className="font-display text-2xl font-bold tabular-nums">{stats.todayCount}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              Variation <Delta value={stats.delta} />
              {stats.delta === 0 ? "· stable" : stats.delta > 0 ? "· plus chargé" : "· plus calme"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Aujourd'hui est {stats.todayCount >= stats.avgAll ? "au-dessus" : "en dessous"} de ta
              moyenne du mois ({stats.avgAll.toFixed(1)} / jour).
            </p>

            <div className="mt-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Moyenne par jour de semaine
              </p>
              {stats.weekdays.map((w) => (
                <div key={w.key} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs capitalize text-muted-foreground">
                    {w.label}
                  </span>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round((w.avg / maxAvg) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs tabular-nums">
                    {w.avg.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Meilleur jour : <span className="capitalize text-foreground">{stats.best.label}</span>{" "}
              · le plus creux :{" "}
              <span className="capitalize text-foreground">{stats.worst.label}</span>
            </p>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
