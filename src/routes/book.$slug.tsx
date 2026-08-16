import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation, I18nextProvider } from "react-i18next";
import { format, isSameDay } from "date-fns";
import { Clock, ArrowLeft } from "lucide-react";
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
import { GuestLanguageSwitcher } from "@/components/guest-language-switcher";
import { GuestCompletionRedirect } from "@/components/guest-completion-redirect";
import { detectLocaleFromCurrentRequest } from "@/i18n/detect-locale";
import { loadNamespacesWithFallback } from "@/i18n/resources";
import { createI18nInstance } from "@/i18n/i18n-instance";
import { dateFnsLocale } from "@/i18n/date-fns-locales";
import { cn } from "@/lib/utils";

const BOOKING_NS = ["booking"] as const;

export const Route = createFileRoute("/book/$slug")({
  pendingComponent: SimpleSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  loader: async () => {
    const locale = await detectLocaleFromCurrentRequest();
    const i18nResources = await loadNamespacesWithFallback(locale, BOOKING_NS);
    return { locale, i18nResources };
  },
  head: ({ loaderData }) => {
    const booking = loaderData?.i18nResources[loaderData.locale]?.["booking"] ?? {};
    return {
      meta: [
        { title: booking["seo.title"] ?? "Réserver un rendez-vous — Cadence" },
        { name: "description", content: booking["seo.description"] ?? "" },
      ],
    };
  },
  component: BookingRoot,
});

function BookingRoot() {
  const { locale, i18nResources } = Route.useLoaderData();
  const i18n = useMemo(() => createI18nInstance(locale, i18nResources), [locale, i18nResources]);

  return (
    <I18nextProvider i18n={i18n}>
      <BookingPage />
    </I18nextProvider>
  );
}

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
  const { t, i18n } = useTranslation("booking");
  const fnsLocale = dateFnsLocale(i18n.language as Parameters<typeof dateFnsLocale>[0]);
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
          locale: i18n.language as Parameters<typeof dateFnsLocale>[0],
        },
      });
      if (!result.success) {
        if (result.reason === "slot_taken") {
          toast.error(t("errors.slot_taken"));
          void intervalsQuery.refetch();
          setSelectedSlot(null);
          setStep("time");
        } else if (result.reason === "plan_limit") {
          toast.error(t("errors.plan_limit"));
        } else if (result.reason === "disabled") {
          toast.error(t("errors.disabled"));
        } else {
          toast.error(t("errors.slot_unavailable"));
        }
        return;
      }
      setSent(true);
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" />
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-30" />
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <GuestLanguageSwitcher ariaLabel={t("language_aria")} />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <BrandMark className="h-10 w-10" />
          <span className="font-display text-2xl font-bold tracking-tight">Cadence</span>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 sm:p-10">
          {pageQuery.isLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>
          )}

          {!pageQuery.isLoading && (!page || !page.enabled) && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("disabled")}</p>
          )}

          {page?.enabled && sent && (
            <GuestCompletionRedirect
              title={t("sent.title")}
              body={t("sent.body", {
                host: page.business_name ?? page.host_name ?? t("default_host"),
              })}
              redirectLabel={t("sent.redirect")}
              locale={i18n.language}
            />
          )}

          {page?.enabled && !sent && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("book_with", {
                      host: page.business_name ?? page.host_name ?? t("default_host"),
                    })}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
                    {step === "date" && t("step.date")}
                    {step === "time" && t("step.time")}
                    {step === "details" && t("step.details")}
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
                    {t("back")}
                  </Button>
                )}
              </div>

              {step === "date" && (
                <div className="flex flex-col items-center">
                  {intervalsQuery.isLoading && (
                    <p className="py-8 text-sm text-muted-foreground">
                      {t("availability.loading")}
                    </p>
                  )}
                  {!intervalsQuery.isLoading && availableDays.length === 0 && (
                    <p className="py-8 text-sm text-muted-foreground">{t("availability.empty")}</p>
                  )}
                  {!intervalsQuery.isLoading && availableDays.length > 0 && (
                    <Calendar
                      mode="single"
                      locale={fnsLocale}
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
                    {format(selectedDay, "EEEE d MMMM", { locale: fnsLocale })}
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
                    <span>
                      {format(selectedSlot, "EEEE d MMMM 'à' HH:mm", { locale: fnsLocale })}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="guest-name">{t("form.name")}</Label>
                      <Input
                        id="guest-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="guest-email">{t("form.email")}</Label>
                      <Input
                        id="guest-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="guest-phone">{t("form.phone")}</Label>
                      <Input
                        id="guest-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="guest-message">{t("form.message")}</Label>
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
                    {t("submit")}
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
