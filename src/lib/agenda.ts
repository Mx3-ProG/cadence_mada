import { addDays, startOfWeek } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

export type Contact = Tables<"contacts">;
export type Appointment = Tables<"appointments">;
export type AppointmentWithContact = Appointment & { contact: Contact | null };
export type AppointmentStatus = Appointment["status"];

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

/** Génère un slug lisible et probablement unique pour le lien de réservation public. */
export function generateBookingSlug(seed: string) {
  const base =
    seed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "agenda";
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** Une plage horaire hebdomadaire récurrente (booking_hours). weekday : 0 = dimanche … 6 = samedi. */
export type BookingHourRange = { weekday: number; start_time: string; end_time: string };

/** Un intervalle déjà réservé (issu de get_booked_intervals), à exclure du calcul des créneaux libres. */
export type BookedInterval = { starts_at: string; ends_at: string };

function timeOnDate(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return d;
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
      const rangeEnd = timeOnDate(day, range.end_time);
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
