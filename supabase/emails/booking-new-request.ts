import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared";

export type BookingNewRequestEmailProps = {
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  message: string | null;
  appointment: {
    title: string;
    startsAt: string;
    endsAt: string;
  };
  dashboardLink: string;
};

/** Email envoyé au propriétaire quand un visiteur propose un créneau depuis son lien public. */
export function buildBookingNewRequestEmail({
  guestName,
  guestEmail,
  guestPhone,
  message,
  appointment,
  dashboardLink,
}: BookingNewRequestEmailProps) {
  const body = `
    <h2 style="margin:0 0 8px">Nouvelle demande de rendez-vous</h2>
    <p style="margin:0 0 16px">${escapeHtml(guestName)} souhaite réserver un créneau via ton lien de réservation.</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0 0 6px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt))}</p>
      <p style="margin:0 0 6px">Email : ${escapeHtml(guestEmail)}</p>
      ${guestPhone ? `<p style="margin:0">Téléphone : ${escapeHtml(guestPhone)}</p>` : ""}
    </div>
    ${
      message
        ? `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${brand.green};background:#fff">« ${escapeHtml(message)} »</p>`
        : ""
    }
    <p style="margin:24px 0">
      <a href="${dashboardLink}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        Accepter ou refuser
      </a>
    </p>`;

  return {
    subject: `Nouvelle demande : ${appointment.title}`,
    html: emailLayout(body),
  };
}
