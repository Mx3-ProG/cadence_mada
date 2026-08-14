import { addDays, startOfWeek } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export type Contact = Tables<"contacts">;
export type AppointmentInvite = Tables<"appointment_invites"> & { contact?: Contact | null };
export type Appointment = Tables<"appointments"> & { invitations?: AppointmentInvite[] };
export type AppointmentWithContact = Appointment & { contact: Contact | null };
export type AppointmentStatus = Appointment["status"];

const SHORT_MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sept",
  "Oct",
  "Nov",
  "Déc",
] as const;

export function shortMonthLabel(date: Date) {
  return SHORT_MONTH_LABELS[date.getMonth()] ?? "";
}

/** Numérote les semaines du mois à partir de son premier lundi. */
export function weekNumberInMonth(date: Date) {
  const monday = weekStart(date);
  return Math.floor((monday.getDate() - 1) / 7) + 1;
}

export function weekStart(date: Date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function weekDays(anchor: Date) {
  const start = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const statusLabel: Record<AppointmentStatus, string> = {
  pending: "En attente",
  accepted: "Accepté",
  declined: "Refusé",
  cancelled: "Annulé",
};

export function inviteUrl(token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/invite/${token}`;
}

export function bookingUrl(slug: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/book/${slug}`;
}

/** Normalise n'importe quelle chaîne (saisie libre ou nom) en slug URL-safe. */
export function slugify(seed: string) {
  return (
    seed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "agenda"
  );
}

/** Génère un slug lisible et probablement unique pour le lien de réservation public. */
export function generateBookingSlug(seed: string) {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slugify(seed)}-${suffix}`;
}

/** Formate une date locale en valeur `yyyy-MM-dd` pour un `<input type="date">` ou un `Calendar`. */
export function toDateInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Formate une date locale en valeur `HH:mm` pour un `<input type="time">`. */
export function toTimeInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Ajoute des minutes à une heure `HH:mm`, en restant dans la même journée (borne à 23:59). */
export function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, (h ?? 0) * 60 + (m ?? 0) + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Une plage horaire hebdomadaire récurrente (booking_hours). weekday : 0 = dimanche … 6 = samedi. */
export type BookingHourRange = { weekday: number; start_time: string; end_time: string };

/**
 * Horaires appliqués par défaut à l'activation du lien de réservation (7h30-12h / 13h-20h30,
 * tous les jours). L'utilisateur peut ensuite les modifier librement comme n'importe quelle plage.
 */
export function defaultBookingHours(): BookingHourRange[] {
  const weekdays = [0, 1, 2, 3, 4, 5, 6];
  return weekdays.flatMap((weekday) => [
    { weekday, start_time: "07:30", end_time: "12:00" },
    { weekday, start_time: "13:00", end_time: "20:30" },
  ]);
}

/** Un intervalle déjà réservé (issu de get_booked_intervals), à exclure du calcul des créneaux libres. */
export type BookedInterval = { starts_at: string; ends_at: string };

function timeOnDate(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return d;
}

/**
 * Comme timeOnDate, mais pour la borne de fin d'un créneau : "23:59" (la valeur maximale
 * stockable en base, le type `time` de Postgres ne va pas jusqu'à 24:00) est traité comme
 * minuit le lendemain, pour ne pas perdre la dernière minute d'un créneau "journée complète".
 */
function rangeEndOnDate(date: Date, endTime: string) {
  const [hours, minutes] = endTime.split(":").map(Number);
  if ((hours ?? 0) >= 23 && (minutes ?? 0) >= 59) {
    const midnight = new Date(date);
    midnight.setHours(24, 0, 0, 0);
    return midnight;
  }
  return timeOnDate(date, endTime);
}

/**
 * Calcule les créneaux encore libres pour la page de réservation publique, en combinant
 * les horaires hebdo récurrents et les rendez-vous déjà pris. Purement synchrone/testable :
 * aucun accès réseau ici, les données viennent des RPC get_booking_page/get_booked_intervals.
 */
export function computeAvailableSlots({
  hours,
  bookedIntervals,
  slotDurationMinutes,
  minNoticeHours,
  bookingWindowDays,
  now = new Date(),
}: {
  hours: BookingHourRange[];
  bookedIntervals: BookedInterval[];
  slotDurationMinutes: number;
  minNoticeHours: number;
  bookingWindowDays: number;
  now?: Date;
}): Date[] {
  const slotMs = slotDurationMinutes * 60_000;
  const earliestStart = new Date(now.getTime() + minNoticeHours * 60 * 60_000);
  const windowEnd = new Date(now.getTime() + bookingWindowDays * 24 * 60 * 60_000);
  const busy = bookedIntervals.map((b) => ({
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
  }));

  const slots: Date[] = [];
  for (let dayOffset = 0; dayOffset <= bookingWindowDays; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    const weekday = day.getDay();

    for (const range of hours.filter((h) => h.weekday === weekday)) {
      const rangeEnd = rangeEndOnDate(day, range.end_time);
      let slotStart = timeOnDate(day, range.start_time);

      while (slotStart.getTime() + slotMs <= rangeEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + slotMs);
        if (slotStart >= earliestStart && slotEnd <= windowEnd) {
          const overlaps = busy.some((b) => slotStart < b.end && slotEnd > b.start);
          if (!overlaps) slots.push(new Date(slotStart));
        }
        slotStart = new Date(slotStart.getTime() + slotMs);
      }
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

/** Regroupe une liste de créneaux triés par jour calendaire, pour l'affichage en colonnes. */
export function groupSlotsByDay(slots: Date[]): { day: Date; slots: Date[] }[] {
  const groups: { day: Date; slots: Date[] }[] = [];
  for (const slot of slots) {
    const last = groups[groups.length - 1];
    if (last && last.day.toDateString() === slot.toDateString()) {
      last.slots.push(slot);
    } else {
      groups.push({
        day: new Date(slot.getFullYear(), slot.getMonth(), slot.getDate()),
        slots: [slot],
      });
    }
  }
  return groups;
}
