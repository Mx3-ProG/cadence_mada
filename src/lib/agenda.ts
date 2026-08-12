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

export function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}
