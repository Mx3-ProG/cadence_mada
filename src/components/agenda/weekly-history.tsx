import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDayMonth } from "@/lib/format";
import { useLocale } from "@/i18n/use-locale";

type WeekRow = {
  week_start: string;
  appointments_total: number;
  accepted_count: number;
  declined_count: number;
  pending_count: number;
  cancelled_count: number;
  invites_sent: number;
  contacts_created: number;
  acceptance_rate: number;
};

const weeklyKey = ["weekly-history"] as const;

async function fetchWeekly(): Promise<WeekRow[]> {
  const { data, error } = await supabase.rpc("rebuild_weekly_stats");
  if (error) throw error;
  return ((data ?? []) as WeekRow[]).slice().sort((a, b) => (a.week_start < b.week_start ? 1 : -1));
}

export function WeeklyHistory() {
  const locale = useLocale();
  const formatWeek = (iso: string) => {
    const start = new Date(`${iso}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDayMonth(start, locale)} → ${formatDayMonth(end, locale)}`;
  };
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: weeklyKey, queryFn: fetchWeekly });

  const refresh = useMutation({
    mutationFn: fetchWeekly,
    onSuccess: (rows) => queryClient.setQueryData(weeklyKey, rows),
  });

  const rows = query.data ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.appointments_total,
      accepted: acc.accepted + r.accepted_count,
      declined: acc.declined + r.declined_count,
      invites: acc.invites + r.invites_sent,
      contacts: acc.contacts + r.contacts_created,
    }),
    { total: 0, accepted: 0, declined: 0, invites: 0, contacts: 0 },
  );

  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <History className="h-4 w-4 text-primary" /> Historique semaine par semaine
          </h2>
          <p className="text-sm text-muted-foreground">
            Toutes tes semaines depuis la création du compte, recalculées et triées de la plus
            récente à la plus ancienne.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Recalculer
        </Button>
      </div>

      {query.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Calcul de l'historique…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Aucune donnée pour le moment.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Rendez-vous", totals.total],
              ["Acceptés", totals.accepted],
              ["Refusés", totals.declined],
              ["Liens envoyés", totals.invites],
              ["Contacts créés", totals.contacts],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl border border-border/70 px-3 py-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-display text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Semaine</th>
                  <th className="py-2 pr-3">RDV</th>
                  <th className="py-2 pr-3">Acceptés</th>
                  <th className="py-2 pr-3">Refusés</th>
                  <th className="py-2 pr-3">En attente</th>
                  <th className="py-2 pr-3">Annulés</th>
                  <th className="py-2 pr-3">Liens</th>
                  <th className="py-2 pr-3">Contacts</th>
                  <th className="py-2">Taux</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.week_start} className="border-t border-border/60">
                    <td className="py-2 pr-3 font-medium">{formatWeek(r.week_start)}</td>
                    <td className="py-2 pr-3">{r.appointments_total}</td>
                    <td className="py-2 pr-3 text-primary">{r.accepted_count}</td>
                    <td className="py-2 pr-3 text-destructive">{r.declined_count}</td>
                    <td className="py-2 pr-3">{r.pending_count}</td>
                    <td className="py-2 pr-3">{r.cancelled_count}</td>
                    <td className="py-2 pr-3">{r.invites_sent}</td>
                    <td className="py-2 pr-3">{r.contacts_created}</td>
                    <td className="py-2">{Number(r.acceptance_rate)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
