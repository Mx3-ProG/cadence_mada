import { DashboardSkeleton } from "@/components/loading/page-skeletons";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { addDays, format, isSameDay, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Mail,
  MapPin,
  Pencil,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendInviteEmail } from "@/lib/invites.functions";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/agenda/app-header";
import { StatusBadge } from "@/components/agenda/status-badge";
import { AppointmentDialog } from "@/components/agenda/appointment-dialog";
import { WeekStats } from "@/components/agenda/week-stats";
import { TodayPanel } from "@/components/agenda/today-panel";
import { MonthTrend } from "@/components/agenda/month-trend";
import { CheckoutReturn } from "@/components/billing/checkout-return";
import { PlanBanner } from "@/components/agenda/plan-banner";
import { Reveal } from "@/components/reveal";

import {
  FREE_APPOINTMENT_LIMIT,
  isAppointmentLimitReached,
  planUsageQueryKey,
  usePlanUsage,
} from "@/lib/plan";
import {
  weekDays,
  weekStart,
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
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const rangeStart = days[0]!;
  const rangeEnd = addDays(days[6]!, 1);

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

  if (initialLoading) return <DashboardSkeleton />;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    void queryClient.invalidateQueries({ queryKey: planUsageQueryKey });
  };

  const openNew = (day: Date | null) => {
    if (isAppointmentLimitReached(planQuery.data)) {
      toast.error(
        `Plan Gratuit : ${FREE_APPOINTMENT_LIMIT} rendez-vous par mois maximum. Passe en Pro pour l'illimité.`,
      );
      return;
    }
    setEditing(null);
    setDefaultDate(day);
    setDialogOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment);
    setDefaultDate(null);
    setDialogOpen(true);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rendez-vous supprimé");
    refresh();
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Lien de confirmation copié");
  };

  const email = async (appointment: Appointment) => {
    const result = await sendInviteEmail({
      data: { appointmentId: appointment.id, origin: window.location.origin },
    });
    if (result.sent) {
      toast.success(`Invitation envoyée à ${result.to}`);
      refresh();
      return;
    }
    if (result.reason === "no_email") {
      toast.error("Ce contact n'a pas d'adresse email.");
      return;
    }
    if (result.reason === "no_api_key") {
      await navigator.clipboard.writeText(result.link);
      toast.info("Clé Resend absente — lien copié, envoie-le manuellement.");
      return;
    }
    toast.error("L'envoi a échoué, réessaie.");
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <CheckoutReturn />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 opacity-60" />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Semaine du {format(rangeStart, "d MMMM", { locale: fr })}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {appointments.length} rendez-vous · {counts.accepted} confirmés · {counts.pending} en
              attente
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
                  className={`glass-panel h-full rounded-2xl p-4 transition-shadow hover:shadow-glow ${
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
                        <motion.article
                          key={a.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-border/70 bg-surface/70 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-primary">
                                {format(new Date(a.starts_at), "HH:mm")} —{" "}
                                {format(new Date(a.ends_at), "HH:mm")}
                              </p>
                              <h3 className="truncate font-semibold">{a.title}</h3>
                              {contact && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {contact.name}
                                  {contact.company ? ` · ${contact.company}` : ""}
                                </p>
                              )}
                            </div>
                            <StatusBadge status={a.status} />
                          </div>

                          {a.location && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{a.location}</span>
                            </p>
                          )}
                          {a.prep_notes && (
                            <p className="mt-2 flex gap-1.5 text-xs text-muted-foreground">
                              <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="line-clamp-2">{a.prep_notes}</span>
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => copyLink(a.invite_token)}
                            >
                              <Copy className="h-3 w-3" /> Lien
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => email(a)}
                            >
                              <Mail className="h-3 w-3" /> Email
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-auto h-7 w-7"
                              aria-label="Modifier"
                              onClick={() => openEdit(a)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              aria-label="Supprimer"
                              onClick={() => remove(a.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                </section>
              </Reveal>
            );
          })}
        </div>

        <WeekStats appointments={appointments} contacts={contacts} days={days} />

        <MonthTrend anchor={anchor} />
      </main>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={editing}
        contacts={contacts}
        defaultDate={defaultDate}
        onSaved={refresh}
      />
    </div>
  );
}
