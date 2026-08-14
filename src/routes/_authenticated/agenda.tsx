import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarPlus, ChevronLeft, ChevronRight, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppHeader } from "@/components/agenda/app-header";
import { AgendaWeekGrid } from "@/components/agenda/agenda-week-grid";
import { AgendaMonthGrid } from "@/components/agenda/agenda-month-grid";
import { AppointmentDialog } from "@/components/agenda/appointment-dialog";
import { AppointmentDetailsSheet } from "@/components/agenda/appointment-details-sheet";
import { QuickAppointmentFlow } from "@/components/agenda/quick-appointment";
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
import { useChangePlan } from "@/lib/billing";
import { weekDays, weekStart, type Appointment, type Contact } from "@/lib/agenda";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda complet — Cadence" },
      {
        name: "description",
        content:
          "Vue semaine et mois de tous tes rendez-vous, avec fiches contact et actions rapides.",
      },
    ],
  }),
  component: AgendaPage,
});

type View = "week" | "month";

function AgendaPage() {
  const queryClient = useQueryClient();
  const planQuery = usePlanUsage();
  const changePlan = useChangePlan();
  const isPro = hasFeatureAccess(planQuery.data, "standard");

  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDefaultDate, setQuickDefaultDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [detailsAppointment, setDetailsAppointment] = useState<Appointment | null>(null);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const weekRangeStart = days[0]!;
  const weekRangeEnd = addDays(days[6]!, 1);
  const monthGridStart = useMemo(() => weekStart(startOfMonth(anchor)), [anchor]);
  const monthGridEnd = useMemo(() => addDays(weekStart(endOfMonth(anchor)), 7), [anchor]);

  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    enabled: isPro,
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.from("contacts").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const weekQuery = useQuery({
    queryKey: ["appointments", weekRangeStart.toISOString()],
    enabled: isPro && view === "week",
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("starts_at", weekRangeStart.toISOString())
        .lt("starts_at", weekRangeEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const monthQuery = useQuery({
    queryKey: ["appointments", "month", monthGridStart.toISOString()],
    enabled: isPro && view === "month",
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("starts_at", monthGridStart.toISOString())
        .lt("starts_at", monthGridEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const contacts = contactsQuery.data ?? [];
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c] as const)), [contacts]);
  const appointments = (view === "week" ? weekQuery.data : monthQuery.data) ?? [];
  const detailsContact = detailsAppointment?.contact_id
    ? (contactById.get(detailsAppointment.contact_id) ?? null)
    : null;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
  };
  const { copyLink, email, decide, remove } = useAppointmentActions(refresh);

  const openNew = (date: Date) => {
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
    setDetailsAppointment(null);
    setQuickDefaultDate(date);
    setQuickOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment);
    setDetailsAppointment(null);
    setDialogOpen(true);
  };

  const goPrev = () =>
    setAnchor(view === "week" ? addDays(weekStart(anchor), -7) : addMonths(anchor, -1));
  const goNext = () =>
    setAnchor(view === "week" ? addDays(weekStart(anchor), 7) : addMonths(anchor, 1));
  const goToday = () => setAnchor(new Date());

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60" />

        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Agenda complet
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tous tes rendez-vous, leurs horaires et les fiches contact associées, en un coup d'œil.
          </p>
        </div>

        {!isPro && (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                L'agenda complet (vue semaine/mois, création en un clic, fiches contact) est réservé
                au plan <strong>Standard</strong> et plus.
              </span>
            </p>
            <Button
              className="gap-2 sm:shrink-0"
              disabled={changePlan.isPending}
              onClick={() =>
                changePlan.mutate({
                  tier: "standard",
                  hasActivePaidPlan: (planQuery.data?.plan ?? "free") !== "free",
                })
              }
            >
              {changePlan.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Passer en Standard
            </Button>
          </div>
        )}

        {isPro && (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Précédent" onClick={goPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={goToday}>
                  Aujourd'hui
                </Button>
                <Button variant="outline" size="icon" aria-label="Suivant" onClick={goNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <p className="ml-2 font-display text-lg font-semibold capitalize">
                  {view === "week"
                    ? `Semaine du ${format(weekRangeStart, "d MMMM", { locale: fr })}`
                    : format(anchor, "MMMM yyyy", { locale: fr })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Tabs value={view} onValueChange={(v) => setView(v as View)}>
                  <TabsList>
                    <TabsTrigger value="week">Semaine</TabsTrigger>
                    <TabsTrigger value="month">Mois</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  onClick={() => {
                    setQuickDefaultDate(null);
                    setQuickOpen(true);
                  }}
                  className="gap-2"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nouveau rendez-vous</span>
                </Button>
              </div>
            </div>

            <div className="mt-4">
              {view === "week" ? (
                <AgendaWeekGrid
                  days={days}
                  appointments={appointments}
                  contactById={contactById}
                  onSlotClick={openNew}
                  onAppointmentClick={setDetailsAppointment}
                />
              ) : (
                <AgendaMonthGrid
                  anchor={anchor}
                  appointments={appointments}
                  contactById={contactById}
                  onSelectDay={(date) => {
                    setAnchor(date);
                    setView("week");
                  }}
                  onSlotClick={openNew}
                  onAppointmentClick={setDetailsAppointment}
                />
              )}
            </div>
          </>
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

      <AppointmentDetailsSheet
        appointment={detailsAppointment}
        contact={detailsContact}
        onOpenChange={(v) => !v && setDetailsAppointment(null)}
        onEdit={openEdit}
        onDelete={remove}
        onCopyLink={copyLink}
        onEmail={email}
        onDecide={decide}
      />
    </div>
  );
}
