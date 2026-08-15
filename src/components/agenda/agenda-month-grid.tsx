import { useMemo } from "react";
import { addDays, endOfMonth, format, isSameMonth, isToday, startOfMonth } from "date-fns";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useDateFnsLocale } from "@/i18n/date-fns-locales";
import { weekStart, type Appointment, type Contact } from "@/lib/agenda";

const MAX_CHIPS = 3;

const STATUS_DOT: Record<Appointment["status"], string> = {
  pending: "bg-warning",
  accepted: "bg-success",
  declined: "bg-destructive/70",
  cancelled: "bg-muted-foreground/50",
};

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export function AgendaMonthGrid({
  anchor,
  appointments,
  contactById,
  onSelectDay,
  onSlotClick,
  onAppointmentClick,
}: {
  anchor: Date;
  appointments: Appointment[];
  contactById: Map<string, Contact>;
  onSelectDay: (date: Date) => void;
  onSlotClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}) {
  const dateFnsLocale = useDateFnsLocale();
  const { t } = useTranslation("agenda");
  const days = useMemo(() => {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = weekStart(monthStart);
    const gridEndExclusive = addDays(weekStart(monthEnd), 7);
    const totalDays = Math.round((gridEndExclusive.getTime() - gridStart.getTime()) / 86_400_000);
    return Array.from({ length: totalDays }, (_, i) => addDays(gridStart, i));
  }, [anchor]);

  const weekdayLabels = useMemo(() => {
    const monday = weekStart(new Date());
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(monday, i), "EEE", { locale: dateFnsLocale }),
    );
  }, [dateFnsLocale]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const key = new Date(a.starts_at).toDateString();
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return map;
  }, [appointments]);

  return (
    <div className="glass-panel min-w-0 max-w-full overflow-hidden rounded-2xl">
      <div className="grid grid-cols-7 border-b border-border/70">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="border-l border-border/70 px-2 py-2 text-center text-[11px] uppercase tracking-wider text-muted-foreground first:border-l-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayAppointments = appointmentsByDay.get(day.toDateString()) ?? [];
          const overflow = dayAppointments.length - MAX_CHIPS;
          const inMonth = isSameMonth(day, anchor);
          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                const slot = new Date(day);
                slot.setHours(9, 0, 0, 0);
                onSlotClick(slot);
              }}
              className={cn(
                "min-w-0 min-h-[5rem] cursor-pointer overflow-hidden border-l border-t border-border/70 p-1 transition-colors first:border-l-0 hover:bg-primary/5 sm:min-h-[6.5rem] sm:p-1.5",
                !inMonth && "bg-surface/40",
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  onSelectDay(day);
                }}
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold transition-colors hover:bg-primary/15",
                  !inMonth && "text-muted-foreground/50",
                  isToday(day) && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                {format(day, "d")}
              </button>

              <div className="mt-1 space-y-1">
                {dayAppointments.slice(0, MAX_CHIPS).map((a) => {
                  const contact = a.contact_id ? contactById.get(a.contact_id) : null;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={(e) => {
                        stop(e);
                        onAppointmentClick(a);
                      }}
                      className="flex w-full min-w-0 items-center gap-1 truncate rounded-md bg-surface/70 px-1 py-0.5 text-left text-[10px] hover:bg-surface sm:px-1.5"
                    >
                      <span
                        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[a.status])}
                      />
                      <span className="shrink-0 font-medium">
                        {format(new Date(a.starts_at), "HH:mm")}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {contact?.name ?? a.title}
                      </span>
                    </button>
                  );
                })}
                {overflow > 0 && (
                  <p className="px-1.5 text-[10px] text-muted-foreground">
                    {t("month_grid.more", { count: overflow })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
