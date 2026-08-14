import { DashboardSkeleton } from "@/components/loading/page-skeletons";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, isSameDay, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarPlus, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/agenda/app-header";
import { AppointmentCard } from "@/components/agenda/appointment-card";
import { AppointmentDialog } from "@/components/agenda/appointment-dialog";
import { QuickAppointmentFlow } from "@/components/agenda/quick-appointment";
import { WeekStats } from "@/components/agenda/week-stats";
import { TodayPanel } from "@/components/agenda/today-panel";
import { MonthTrend } from "@/components/agenda/month-trend";
import { CheckoutReturn } from "@/components/billing/checkout-return";
import { PlanBanner } from "@/components/agenda/plan-banner";
import { LockedFeatureCard } from "@/components/agenda/locked-feature-card";
import { Reveal } from "@/components/reveal";
import { useAppointmentActions } from "@/lib/use-appointment-actions";

import {
  hasFeatureAccess,
  isAppointmentLimitReached,
  nextTier,
  planUsageQueryKey,
  TIER_LABELS,
  TIER_LIMITS,
  usePlanUsage,
} from "@/lib/plan";
import {
  weekDays,
  weekNumberInMonth,
  weekStart,
  shortMonthLabel,
  type Appointment,
  type Contact,
  type AppointmentStatus,
} from "@/lib/agenda";

export const Route = createFileRoute("/_authenticated/dashboard")({
  pendingComponent: DashboardSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  head: () => ({
    meta: [
      { title: "Ma semaine — Cadence" },
      {
        name: "description",
        content:
          "Organise ta semaine : rendez-vous, notes de préparation et confirmations en temps réel.",
      },
      { property: "og:title", content: "Ma semaine — Cadence" },
      {
        property: "og:description",
        content: "Le tableau de bord de tes rendez-vous et de leurs confirmations.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDefaultDate, setQuickDefaultDate] = useState<Date | null>(null);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const rangeStart = days[0]!;
  const rangeEnd = addDays(days[6]!, 1);
  const weekOfMonth = weekNumberInMonth(rangeStart);

  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.from("contacts").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const appointmentsQuery = useQuery({
    queryKey: ["appointments", rangeStart.toISOString()],
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("starts_at", rangeStart.toISOString())
        .lt("starts_at", rangeEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const todayQuery = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: async (): Promise<Appointment[]> => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = addDays(start, 1);
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const initialLoading =
    (contactsQuery.isLoading && !contactsQuery.data) ||
    (appointmentsQuery.isLoading && !appointmentsQuery.data);

  const contacts = contactsQuery.data ?? [];
  const appointments = appointmentsQuery.data ?? [];
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c] as const)), [contacts]);

  const counts = useMemo(() => {
    const base: Record<AppointmentStatus, number> = {
      pending: 0,
      accepted: 0,
      declined: 0,
      cancelled: 0,
    };
    for (const a of appointments) base[a.status] += 1;
    return base;
  }, [appointments]);

  const planQuery = usePlanUsage();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
  };
  const { copyLink, email, decide, remove } = useAppointmentActions(refresh);

  if (initialLoading) return <DashboardSkeleton />;

  const openNew = (day: Date | null) => {
    if (isAppointmentLimitReached(planQuery.data)) {
      const plan = planQuery.data?.plan ?? "free";
      const limit = TIER_LIMITS[plan].appointments;
      const upsell = nextTier(plan);
      toast.error(
        `Plan ${TIER_LABELS[plan]} : ${limit} rendez-vous par mois maximum.` +
          (upsell ? ` Passe au plan ${TIER_LABELS[upsell]} pour continuer.` : ""),
      );
      return;
    }
    setQuickDefaultDate(day);
    setQuickOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <CheckoutReturn />

      <main className="relative mx-auto w-full min-w-0 max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60" />

        <div className="grid grid-cols-1 items-start gap-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1
              className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl"
              aria-label={`Semaine ${weekOfMonth} du ${format(rangeStart, "d MMMM", { locale: fr })}`}
            >
              <span className="sm:hidden">
                S{weekOfMonth} · {shortMonthLabel(rangeStart)}
              </span>
              <span className="hidden sm:inline">
                Semaine du {format(rangeStart, "d MMMM", { locale: fr })}
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {appointments.length} rendez-vous · {counts.accepted} confirmés · {counts.pending} en
              attente
            </p>
          </div>
          <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-start">
            <Button
              variant="outline"
              size="icon"
              aria-label="Semaine précédente"
              onClick={() => setAnchor(addDays(weekStart(anchor), -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setAnchor(new Date())}>
              Aujourd'hui
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Semaine suivante"
              onClick={() => setAnchor(addDays(weekStart(anchor), 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button onClick={() => openNew(null)} className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau</span>
            </Button>
          </div>
        </div>

        <PlanBanner usage={planQuery.data} />

        <Link
          to="/agenda"
          className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface/60 px-4 py-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <LayoutGrid className="h-4 w-4 text-primary" />
            Snip rapide — voir l'agenda complet
            {planQuery.data && !hasFeatureAccess(planQuery.data, "standard") && (
              <Badge variant="secondary">Standard</Badge>
            )}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <TodayPanel
          appointments={todayQuery.data ?? []}
          contacts={contacts}
          onCreate={(day) => openNew(day)}
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {days.map((day, index) => {
            const dayAppointments = appointments.filter((a) =>
              isSameDay(new Date(a.starts_at), day),
            );
            return (
              <Reveal key={day.toISOString()} delay={index * 0.04}>
                <section
                  className={`glass-panel h-full min-w-0 overflow-hidden rounded-2xl p-4 transition-shadow hover:shadow-glow ${
                    isToday(day) ? "ring-1 ring-primary/50" : ""
                  }`}
                >
                  <header className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {format(day, "EEEE", { locale: fr })}
                      </p>
                      <p className="font-display text-xl font-bold">
                        {format(day, "d MMM", { locale: fr })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Ajouter un rendez-vous"
                      onClick={() => openNew(day)}
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                  </header>

                  <div className="mt-3 space-y-3">
                    {dayAppointments.length === 0 && (
                      <p className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-xs text-muted-foreground">
                        Journée libre
                      </p>
                    )}
                    {dayAppointments.map((a) => {
                      const contact = a.contact_id ? contactById.get(a.contact_id) : null;
                      return (
                        <AppointmentCard
                          key={a.id}
                          appointment={a}
                          contact={contact ?? null}
                          onCopyLink={copyLink}
                          onEmail={email}
                          onEdit={openEdit}
                          onDelete={remove}
                          onDecide={decide}
                        />
                      );
                    })}
                  </div>
                </section>
              </Reveal>
            );
          })}
        </div>

        {hasFeatureAccess(planQuery.data, "standard") ? (
          <WeekStats appointments={appointments} contacts={contacts} days={days} />
        ) : (
          <LockedFeatureCard
            title="Statistiques de la semaine"
            minTier="standard"
            currentPlan={planQuery.data?.plan}
          />
        )}

        {hasFeatureAccess(planQuery.data, "economic") ? (
          <MonthTrend anchor={anchor} />
        ) : (
          <LockedFeatureCard
            title="Tendance du mois"
            minTier="economic"
            currentPlan={planQuery.data?.plan}
          />
        )}
      </main>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editing}
        contacts={contacts}
        defaultDate={null}
        onSaved={refresh}
      />

      <QuickAppointmentFlow
        open={quickOpen}
        onOpenChange={setQuickOpen}
        defaultDate={quickDefaultDate}
      />
    </div>
  );
}
