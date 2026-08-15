import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared";
import type { BookingDecisionEmailProps } from "./booking-confirmed";

/** Email envoyé au visiteur quand le propriétaire ne peut pas honorer le créneau demandé. */
export function buildBookingDeclinedEmail({
  guestName,
  hostName,
  hostAvatarUrl,
  appointment,
  bookingLink,
}: BookingDecisionEmailProps) {
  const body = `
    <h2 style="margin:0 0 8px">Créneau indisponible</h2>
    <p style="margin:0 0 16px">Bonjour ${escapeHtml(guestName)}, ${escapeHtml(hostName)} ne peut finalement pas te recevoir sur le créneau demandé.</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt))}</p>
    </div>
    <p style="margin:24px 0">
      <a href="${bookingLink}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        Proposer un autre créneau
      </a>
    </p>`;

  return {
    subject: `Créneau indisponible : ${appointment.title}`,
    html: emailLayout(body, { name: hostName, avatarUrl: hostAvatarUrl }),
  };
}
