import { format, isSameDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateFnsLocale } from "@/i18n/date-fns-locales";
import { CalendarPlus, Clock, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/agenda/status-badge";
import type { Appointment, Contact } from "@/lib/agenda";

export function TodayPanel({
  appointments,
  contacts,
  onCreate,
}: {
  appointments: Appointment[];
  contacts: Contact[];
  onCreate: (day: Date) => void;
}) {
  const dateFnsLocale = useDateFnsLocale();
  const { t } = useTranslation("agenda");
  const today = new Date();
  const contactById = new Map(contacts.map((c) => [c.id, c] as const));
  const todays = appointments
    .filter((a) => isSameDay(new Date(a.starts_at), today))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const next = todays.find((a) => new Date(a.ends_at) >= today);
  const accepted = todays.filter((a) => a.status === "accepted").length;
  const pending = todays.filter((a) => a.status === "pending").length;

  return (
    <section className="glass-panel mt-6 rounded-2xl p-5 ring-1 ring-primary/30">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {t("today.title")}
          </p>
          <h2 className="font-display text-xl font-bold sm:text-2xl">
            {format(today, "EEEE d MMMM", { locale: dateFnsLocale })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {todays.length === 0
              ? t("today.no_appointments")
              : t("today.summary", { count: todays.length, accepted, pending })}
          </p>
        </div>
        <Button onClick={() => onCreate(today)} className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          {t("today.create")}
        </Button>
      </header>

      {todays.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">{t("today.free_day")}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {todays.map((a) => {
            const contact = a.contact_id ? contactById.get(a.contact_id) : null;
            const isNext = next?.id === a.id;
            return (
              <article
                key={a.id}
                className={`rounded-xl border p-3 ${
                  isNext ? "border-primary/60 bg-primary/5" : "border-border/70 bg-surface/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Clock className="h-3 w-3" />
                    {format(new Date(a.starts_at), "HH:mm")} —{" "}
                    {format(new Date(a.ends_at), "HH:mm")}
                  </p>
                  <StatusBadge status={a.status} />
                </div>
                <h3 className="mt-1 truncate font-semibold">{a.title}</h3>
                {contact && (
                  <p className="truncate text-xs text-muted-foreground">
                    {contact.name}
                    {contact.company ? ` · ${contact.company}` : ""}
                  </p>
                )}
                {a.location && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{a.location}</span>
                  </p>
                )}
                {isNext && (
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-primary">
                    {t("today.next")}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
