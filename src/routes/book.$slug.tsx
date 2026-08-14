import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarCheck, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { proposeBooking } from "@/lib/booking.functions";
import { computeAvailableSlots, groupSlotsByDay, type BookingHourRange } from "@/lib/agenda";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { SimpleSkeleton } from "@/components/loading/page-skeletons";
import { BrandMark } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$slug")({
  pendingComponent: SimpleSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  head: () => ({
    meta: [
      { title: "Réserver un rendez-vous — Cadence" },
      {
        name: "description",
        content: "Choisis une date libre dans l'agenda et propose un rendez-vous en un clic.",
      },
    ],
  }),
  component: BookingPage,
});

type BookingPageRow = {
  owner_id: string;
  host_name: string | null;
  business_name: string | null;
  enabled: boolean;
  slot_duration_minutes: number;
  min_notice_hours: number;
  booking_window_days: number;
  timezone: string;
  hours: BookingHourRange[];
};

type Step = "date" | "time" | "details";

function BookingPage() {
  const { slug } = Route.useParams();
  const [step, setStep] = useState<Step>("date");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const pageQuery = useQuery({
    queryKey: ["booking-page", slug],
    queryFn: async (): Promise<BookingPageRow | null> => {
      const { data, error } = await supabase.rpc("get_booking_page", { _slug: slug });
      if (error) throw error;
      return (data?.[0] as BookingPageRow | undefined) ?? null;
    },
  });

  const page = pageQuery.data;

  const intervalsQuery = useQuery({
    queryKey: ["booking-intervals", slug],
    enabled: !!page?.enabled,
    queryFn: async () => {
      const now = new Date();
      const to = new Date(now.getTime() + (page?.booking_window_days ?? 30) * 24 * 60 * 60_000);
      const { data, error } = await supabase.rpc("get_booked_intervals", {
        _slug: slug,
        _from: now.toISOString(),
        _to: to.toISOString(),
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const slotsByDay = useMemo(() => {
    if (!page) return [];
    const slots = computeAvailableSlots({
      hours: page.hours ?? [],
      bookedIntervals: intervalsQuery.data ?? [],
      slotDurationMinutes: page.slot_duration_minutes,
      minNoticeHours: page.min_notice_hours,
      bookingWindowDays: page.booking_window_days,
    });
    return groupSlotsByDay(slots);
  }, [page, intervalsQuery.data]);

  const availableDays = useMemo(() => slotsByDay.map((g) => g.day), [slotsByDay]);

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return slotsByDay.find((g) => isSameDay(g.day, selectedDay))?.slots ?? [];
  }, [slotsByDay, selectedDay]);

  const today = useMemo(() => new Date(), []);
  const windowEnd = useMemo(
    () => new Date(today.getTime() + (page?.booking_window_days ?? 30) * 24 * 60 * 60_000),
    [today, page?.booking_window_days],
  );

  const isDayDisabled = (day: Date) => {
    if (day < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return true;
    if (day > windowEnd) return true;
    return !availableDays.some((d) => isSameDay(d, day));
  };

  const submit = async () => {
    if (!page || !selectedSlot || !name.trim() || !email.trim()) return;
    setBusy(true);
    const endsAt = new Date(selectedSlot.getTime() + page.slot_duration_minutes * 60_000);
    try {
      const result = await proposeBooking({
        data: {
          slug,
          guestName: name.trim(),
          guestEmail: email.trim(),
          guestPhone: phone.trim() || undefined,
          message: message.trim() || undefined,
          startsAt: selectedSlot.toISOString(),
          endsAt: endsAt.toISOString(),
          origin: window.location.origin,
        },
      });
      if (!result.success) {
        if (result.reason === "slot_taken") {
          toast.error("Ce créneau vient d'être pris, choisis-en un autre.");
          void intervalsQuery.refetch();
          setSelectedSlot(null);
          setStep("time");
        } else if (result.reason === "plan_limit") {
          toast.error("Cet agenda a atteint sa limite de rendez-vous pour le moment.");
        } else if (result.reason === "disabled") {
          toast.error("Ce lien de réservation n'est plus actif.");
        } else {
          toast.error("Ce créneau n'est plus disponible.");
        }
        return;
      }
      setSent(true);
    } catch {
      toast.error("Impossible d'envoyer la demande, réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" />
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-30" />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <BrandMark className="h-10 w-10" />
          <span className="font-display text-2xl font-bold tracking-tight">Cadence</span>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 sm:p-10">
          {pageQuery.isLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">Chargement…</p>
          )}

          {!pageQuery.isLoading && (!page || !page.enabled) && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ce lien de réservation n'est pas actif.
            </p>
          )}

          {page?.enabled && sent && (
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CalendarCheck className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-display text-xl font-bold">Demande envoyée</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Tu recevras un email dès que {page.business_name ?? page.host_name ?? "ton hôte"}{" "}
                confirme le rendez-vous.
              </p>
            </div>
          )}

          {page?.enabled && !sent && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Réserver avec {page.business_name ?? page.host_name ?? "votre hôte"}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
                    {step === "date" && "Choisis une date"}
                    {step === "time" && "Choisis un horaire"}
                    {step === "details" && "Tes coordonnées"}
                  </h1>
                </div>
                {step !== "date" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-full text-muted-foreground"
                    onClick={() => {
                      if (step === "time") {
                        setSelectedDay(null);
                        setStep("date");
                      } else {
                        setSelectedSlot(null);
                        setStep("time");
                      }
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                  </Button>
                )}
              </div>

              {step === "date" && (
                <div className="flex flex-col items-center">
                  {intervalsQuery.isLoading && (
                    <p className="py-8 text-sm text-muted-foreground">
                      Chargement des disponibilités…
                    </p>
                  )}
                  {!intervalsQuery.isLoading && availableDays.length === 0 && (
                    <p className="py-8 text-sm text-muted-foreground">
                      Aucun créneau disponible pour le moment.
                    </p>
                  )}
                  {!intervalsQuery.isLoading && availableDays.length > 0 && (
                    <Calendar
                      mode="single"
                      locale={fr}
                      selected={selectedDay ?? undefined}
                      onSelect={(day) => {
                        if (!day) return;
                        setSelectedDay(day);
                        setStep("time");
                      }}
                      disabled={isDayDisabled}
                      startMonth={today}
                      endMonth={windowEnd}
                      className="rounded-2xl border-none bg-transparent p-0 [--cell-size:2.75rem]"
                    />
                  )}
                </div>
              )}

              {step === "time" && selectedDay && (
                <div className="space-y-5">
                  <p className="text-sm font-semibold capitalize text-foreground">
                    {format(selectedDay, "EEEE d MMMM", { locale: fr })}
                  </p>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {slotsForSelectedDay.map((slot) => (
                      <button
                        key={slot.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setStep("details");
                        }}
                        className={cn(
                          "rounded-2xl border border-border/70 bg-surface/60 px-3 py-2.5 text-sm font-medium transition-all",
                          "hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 hover:shadow-soft",
                        )}
                      >
                        {format(slot, "HH:mm")}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === "details" && selectedSlot && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 rounded-2xl bg-surface/70 p-4 text-sm">
                    <Clock className="h-4 w-4 shrink-0 text-primary" />
                    <span>{format(selectedSlot, "EEEE d MMMM 'à' HH:mm", { locale: fr })}</span>
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="guest-name">Nom</Label>
                      <Input
                        id="guest-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="guest-email">Email</Label>
                      <Input
                        id="guest-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="guest-phone">Téléphone (optionnel)</Label>
                      <Input
                        id="guest-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="guest-message">Message (optionnel)</Label>
                      <Textarea
                        id="guest-message"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full rounded-2xl"
                    disabled={busy || !name.trim() || !email.trim()}
                    onClick={submit}
                  >
                    Envoyer la demande
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
