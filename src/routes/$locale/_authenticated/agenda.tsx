import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppHeader } from "@/components/agenda/app-header";
import { AgendaWeekGrid } from "@/components/agenda/agenda-week-grid";
import { AgendaMonthGrid } from "@/components/agenda/agenda-month-grid";
import { AppointmentDialog } from "@/components/agenda/appointment-dialog";
import { AppointmentDetailsSheet } from "@/components/agenda/appointment-details-sheet";
import { QuickAppointmentFlow } from "@/components/agenda/quick-appointment";
import { PlanPaywallDialog } from "@/components/agenda/plan-paywall-dialog";
import { useAppointmentActions } from "@/lib/use-appointment-actions";
import { useDateFnsLocale } from "@/i18n/date-fns-locales";
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
  type Appointment,
  type Contact,
} from "@/lib/agenda";

const agendaSearchSchema = z.object({
  appointmentId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/$locale/_authenticated/agenda")({
  validateSearch: agendaSearchSchema,
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
  const dateFnsLocale = useDateFnsLocale();
  const { t } = useTranslation("agenda");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const planQuery = usePlanUsage();
  const isPro = hasFeatureAccess(planQuery.data, "standard");

  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDefaultDate, setQuickDefaultDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [detailsAppointment, setDetailsAppointment] = useState<Appointment | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const weekRangeStart = days[0]!;
  const weekRangeEnd = addDays(days[6]!, 1);
  const weekOfMonth = weekNumberInMonth(weekRangeStart);
  const monthGridStart = useMemo(() => weekStart(startOfMonth(anchor)), [anchor]);
  const monthGridEnd = useMemo(() => addDays(weekStart(endOfMonth(anchor)), 7), [anchor]);

  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase.from("contacts").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const weekQuery = useQuery({
    queryKey: ["appointments", weekRangeStart.toISOString()],
    enabled: view === "week",
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, invitations:appointment_invites(*, contact:contacts(*))")
        .gte("starts_at", weekRangeStart.toISOString())
        .lt("starts_at", weekRangeEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const monthQuery = useQuery({
    queryKey: ["appointments", "month", monthGridStart.toISOString()],
    enabled: view === "month",
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, invitations:appointment_invites(*, contact:contacts(*))")
        .gte("starts_at", monthGridStart.toISOString())
        .lt("starts_at", monthGridEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data]);
  const contactById = useMemo(() => new Map(contacts.map((c) => [c.id, c] as const)), [contacts]);
  const appointments = useMemo(
    () => (view === "week" ? weekQuery.data : monthQuery.data) ?? [],
    [monthQuery.data, view, weekQuery.data],
  );
  const detailsContact = detailsAppointment?.contact_id
    ? (contactById.get(detailsAppointment.contact_id) ?? null)
    : null;

  // Rdv ciblé par un lien externe (panneau "Aujourd'hui" du dashboard, carte contact) : on le
  // récupère directement par id, quelle que soit la semaine affichée par défaut.
  const targetAppointmentQuery = useQuery({
    queryKey: ["appointment", search.appointmentId],
    enabled: !!search.appointmentId,
    queryFn: async (): Promise<Appointment | null> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, invitations:appointment_invites(*, contact:contacts(*))")
        .eq("id", search.appointmentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Ouvre directement le rdv visé, en sautant sur sa semaine, sans passer par le paywall
  // (l'utilisateur le voyait déjà librement ailleurs dans l'app).
  useEffect(() => {
    const target = targetAppointmentQuery.data;
    if (!search.appointmentId || !target) return;
    setAnchor(new Date(target.starts_at));
    setView("week");
    setDetailsAppointment(target);
    void navigate({
      from: Route.fullPath,
      search: (prev) => ({ ...prev, appointmentId: undefined }),
      replace: true,
    });
  }, [navigate, search.appointmentId, targetAppointmentQuery.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
  };
  const { email, decide, remove } = useAppointmentActions(refresh);

  const openNew = (date: Date) => {
    if (isAppointmentLimitReached(planQuery.data)) {
      const plan = planQuery.data?.plan ?? "free";
      const limit = TIER_LIMITS[plan].appointments;
      const upsell = nextTier(plan);
      toast.error(
        t("plan_limit_error", { plan: TIER_LABELS[plan], limit }) +
          (upsell ? t("plan_limit_upsell", { plan: TIER_LABELS[upsell] }) : ""),
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

  const handleSlotClick = (date: Date) => {
    if (!isPro) {
      setPaywallOpen(true);
      return;
    }
    openNew(date);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    if (!isPro && appointment.status !== "pending") {
      setPaywallOpen(true);
      return;
    }
    setDetailsAppointment(appointment);
  };

  const handleNewAppointmentClick = () => {
    if (!isPro) {
      setPaywallOpen(true);
      return;
    }
    setQuickDefaultDate(null);
    setQuickOpen(true);
  };

  const goPrev = () =>
    setAnchor(view === "week" ? addDays(weekStart(anchor), -7) : addMonths(anchor, -1));
  const goNext = () =>
    setAnchor(view === "week" ? addDays(weekStart(anchor), 7) : addMonths(anchor, 1));
  const goToday = () => setAnchor(new Date());

  const agendaContent = (
    <>
      <div className="mt-6 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" aria-label={t("nav.prev_aria")} onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToday}>
            {t("nav.today")}
          </Button>
          <Button variant="outline" size="icon" aria-label={t("nav.next_aria")} onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="basis-full font-display text-lg font-semibold capitalize sm:ml-2 sm:basis-auto">
            {view === "week" ? (
              <>
                <span className="sm:hidden">
                  S{weekOfMonth} · {format(weekRangeStart, "MMM", { locale: dateFnsLocale })}
                </span>
                <span className="hidden sm:inline">
                  {t("week_of", {
                    date: format(weekRangeStart, "d MMMM", { locale: dateFnsLocale }),
                  })}
                </span>
              </>
            ) : (
              format(anchor, "MMMM yyyy", { locale: dateFnsLocale })
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="week">{t("view.week")}</TabsTrigger>
              <TabsTrigger value="month">{t("view.month")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleNewAppointmentClick} className="gap-2">
            <CalendarPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("new_appointment")}</span>
          </Button>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        {view === "week" ? (
          <AgendaWeekGrid
            days={days}
            appointments={appointments}
            contactById={contactById}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
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
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="relative mx-auto w-full min-w-0 max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60" />

        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t("page.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("page.subtitle")}</p>
        </div>

        {agendaContent}
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
        onEmail={email}
        onDecide={decide}
      />

      <PlanPaywallDialog open={paywallOpen} onOpenChange={setPaywallOpen} minTier="standard" />
    </div>
  );
}
