export const DAY_MS = 24 * 60 * 60 * 1000;

export function isPendingInviteDue(inviteSentAt: string, startsAt: string, now: Date) {
  const sent = new Date(inviteSentAt).getTime();
  const start = new Date(startsAt).getTime();
  return sent <= now.getTime() - DAY_MS && start > now.getTime() + DAY_MS;
}

export function isUpcomingAppointmentDue(startsAt: string, now: Date) {
  const start = new Date(startsAt).getTime();
  return start > now.getTime() && start <= now.getTime() + DAY_MS;
}

export function antananarivoClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Indian/Antananarivo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
  };
}

export function reminderDedupeKey(
  kind: "pending" | "upcoming" | "summary",
  entityId: string,
  anchor: string,
) {
  return `${kind}:${entityId}:${anchor}`;
}
