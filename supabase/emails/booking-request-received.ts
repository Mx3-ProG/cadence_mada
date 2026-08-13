import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared";

export type BookingRequestReceivedEmailProps = {
  guestName: string;
  hostName: string;
  appointment: {
    title: string;
    startsAt: string;
    endsAt: string;
  };
};

/** Email envoyé au visiteur pour accuser réception de sa demande de rendez-vous. */
export function buildBookingRequestReceivedEmail({
  guestName,
  hostName,
  appointment,
}: BookingRequestReceivedEmailProps) {
  const body = `
    <h2 style="margin:0 0 8px">Demande envoyée</h2>
    <p style="margin:0 0 16px">Bonjour ${escapeHtml(guestName)},</p>
    <p style="margin:0 0 16px">Ta demande de rendez-vous avec ${escapeHtml(hostName)} a bien été envoyée. Tu recevras un email dès qu'elle sera confirmée.</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt))}</p>
    </div>`;

  return {
    subject: `Demande envoyée : ${appointment.title}`,
    html: emailLayout(body),
  };
}
