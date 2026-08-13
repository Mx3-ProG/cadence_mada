import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared";

export type BookingDecisionEmailProps = {
  guestName: string;
  hostName: string;
  appointment: {
    title: string;
    location: string | null;
    startsAt: string;
    endsAt: string;
  };
  bookingLink: string;
};

/** Email envoyé au visiteur quand le propriétaire confirme sa demande de rendez-vous. */
export function buildBookingConfirmedEmail({
  guestName,
  hostName,
  appointment,
  bookingLink,
}: BookingDecisionEmailProps) {
  const body = `
    <h2 style="margin:0 0 8px;color:${brand.greenDark}">✓ Rendez-vous confirmé</h2>
    <p style="margin:0 0 16px">Bonjour ${escapeHtml(guestName)}, ${escapeHtml(hostName)} a confirmé ton rendez-vous.</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0 0 6px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt))}</p>
      ${appointment.location ? `<p style="margin:0">Lieu : ${escapeHtml(appointment.location)}</p>` : ""}
    </div>
    <p style="margin:0;font-size:12px;color:#667">${bookingLink}</p>`;

  return {
    subject: `Rendez-vous confirmé : ${appointment.title}`,
    html: emailLayout(body),
  };
}
