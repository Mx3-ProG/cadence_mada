import { useMemo } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateFnsLocale } from "@/i18n/date-fns-locales";
import { cn } from "@/lib/utils";
import type { Appointment, Contact } from "@/lib/agenda";

const START_HOUR = 7;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const ROW_HEIGHT = 40;

const STATUS_STYLES: Record<Appointment["status"], string> = {
  pending: "border-warning/50 bg-warning/15 text-warning",
  accepted: "border-success/50 bg-success/15 text-success",
  declined: "border-destructive/40 bg-destructive/10 text-muted-foreground line-through",
  cancelled: "border-border bg-muted text-muted-foreground line-through",
};

type Positioned = {
  appointment: Appointment;
  rowStart: number;
  rowSpan: number;
  lane: number;
  lanes: number;
};

/** Affecte des "voies" aux rendez-vous qui se chevauchent dans une même journée (greedy interval packing). */
function layoutDay(appointments: Appointment[]): Positioned[] {
  const sorted = [...appointments].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const positioned: Positioned[] = [];
  let cluster: { item: Appointment; rowStart: number; rowSpan: number; lane: number }[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const lanes = Math.max(...cluster.map((c) => c.lane)) + 1;
    for (const c of cluster) {
      positioned.push({
        appointment: c.item,
        rowStart: c.rowStart,
        rowSpan: c.rowSpan,
        lane: c.lane,
        lanes,
      });
    }
    cluster = [];
  };

  const laneEnds: number[] = [];
  for (const a of sorted) {
    const start = new Date(a.starts_at);
    const end = new Date(a.ends_at);
    const startMin = Math.max(0, (start.getHours() - START_HOUR) * 60 + start.getMinutes());
    const endMin = Math.min(
      SLOTS_PER_DAY * SLOT_MINUTES,
      (end.getHours() - START_HOUR) * 60 + end.getMinutes(),
    );
    if (endMin <= 0 || startMin >= SLOTS_PER_DAY * SLOT_MINUTES) continue;

    if (startMin >= clusterEnd) {
      flushCluster();
      laneEnds.length = 0;
      clusterEnd = -Infinity;
    }

    let lane = laneEnds.findIndex((e) => e <= startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endMin);
    } else {
      laneEnds[lane] = endMin;
    }
    clusterEnd = Math.max(clusterEnd, endMin);

    const rowStart = 1 + Math.floor(startMin / SLOT_MINUTES);
    const rowSpan = Math.max(1, Math.round((endMin - startMin) / SLOT_MINUTES));
    cluster.push({ item: a, rowStart, rowSpan, lane });
  }
  flushCluster();

  return positioned;
}

export function AgendaWeekGrid({
  days,
  appointments,
  contactById,
  onSlotClick,
  onAppointmentClick,
}: {
  days: Date[];
  appointments: Appointment[];
  contactById: Map<string, Contact>;
  onSlotClick: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}) {
  const dateFnsLocale = useDateFnsLocale();
  const { t } = useTranslation("agenda");
  const byDay = useMemo(() => {
    return days.map((day) =>
      layoutDay(appointments.filter((a) => isSameDay(new Date(a.starts_at), day))),
    );
  }, [days, appointments]);

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    [],
  );

  return (
    <div className="glass-panel min-w-0 max-w-full overflow-hidden rounded-2xl">
      <div className="flex border-b border-border/70">
        <div className="w-14 shrink-0" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "min-w-0 flex-1 border-l border-border/70 px-1 py-2 text-center sm:px-2",
              isToday(day) && "bg-primary/5",
            )}
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {format(day, "EEE", { locale: dateFnsLocale })}
            </p>
            <p className={cn("font-display text-sm font-semibold", isToday(day) && "text-primary")}>
              {format(day, "d")}
            </p>
          </div>
        ))}
      </div>

      <div className="flex max-w-full overflow-x-auto overscroll-x-contain">
        <div className="w-14 shrink-0">
          {hours.map((h) => (
            <div
              key={h}
              className="border-t border-border/50 pr-2 text-right text-[11px] text-muted-foreground first:border-t-0"
              style={{ height: ROW_HEIGHT * 2 }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((day, dayIndex) => (
          <div
            key={day.toISOString()}
            className={cn(
              "relative min-w-[4.5rem] flex-1 border-l border-border/70 sm:min-w-0",
              isToday(day) && "bg-primary/[0.03]",
            )}
            style={{ height: SLOTS_PER_DAY * ROW_HEIGHT }}
          >
            {Array.from({ length: SLOTS_PER_DAY }, (_, slot) => {
              const date = new Date(day);
              date.setHours(START_HOUR, 0, 0, 0);
              date.setMinutes(slot * SLOT_MINUTES);
              return (
                <button
                  key={slot}
                  type="button"
                  aria-label={t("week_grid.add_slot_aria", { time: format(date, "HH:mm") })}
                  onClick={() => onSlotClick(date)}
                  className={cn(
                    "block w-full border-t border-border/40 transition-colors first:border-t-0 hover:bg-primary/5",
                    slot % 2 === 0 && "border-border/60",
                  )}
                  style={{ height: ROW_HEIGHT }}
                />
              );
            })}

            <div
              className="pointer-events-none absolute inset-0 grid"
              style={{ gridTemplateRows: `repeat(${SLOTS_PER_DAY}, ${ROW_HEIGHT}px)` }}
            >
              {byDay[dayIndex]?.map(({ appointment, rowStart, rowSpan, lane, lanes }) => {
                const contact = appointment.contact_id
                  ? contactById.get(appointment.contact_id)
                  : null;
                return (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onAppointmentClick(appointment)}
                    className={cn(
                      "pointer-events-auto absolute overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-transform hover:z-10 hover:scale-[1.02]",
                      STATUS_STYLES[appointment.status],
                    )}
                    style={{
                      top: (rowStart - 1) * ROW_HEIGHT + 1,
                      height: rowSpan * ROW_HEIGHT - 2,
                      left: `${(lane / lanes) * 100}%`,
                      width: `${100 / lanes}%`,
                    }}
                  >
                    <p className="truncate font-semibold">
                      {format(new Date(appointment.starts_at), "HH:mm")} {appointment.title}
                    </p>
                    {contact && <p className="truncate opacity-80">{contact.name}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
