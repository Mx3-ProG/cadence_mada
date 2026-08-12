import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared";

export type InviteResponseEmailProps = {
  guestName: string;
  appointment: {
    title: string;
    location: string | null;
    startsAt: string;
    endsAt: string;
  };
  responseMessage: string | null;
  dashboardLink: string;
};

/** Email envoyé à l'organisateur quand l'invité accepte le rendez-vous. */
export function buildInviteAcceptedEmail({
  guestName,
  appointment,
  responseMessage,
  dashboardLink,
}: InviteResponseEmailProps) {
  const name = guestName || "Votre invité";

  const body = `
    <h2 style="margin:0 0 8px;color:${brand.greenDark}">✓ Rendez-vous confirmé</h2>
    <p style="margin:0 0 16px">${escapeHtml(name)} a accepté votre proposition de rendez-vous.</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0 0 6px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt))}</p>
      ${appointment.location ? `<p style="margin:0">Lieu : ${escapeHtml(appointment.location)}</p>` : ""}
    </div>
    ${
      responseMessage
        ? `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${brand.green};background:#fff">« ${escapeHtml(responseMessage)} »</p>`
        : ""
    }
    <p style="margin:24px 0">
      <a href="${dashboardLink}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        Voir mon agenda
      </a>
    </p>`;

  return {
    subject: `${name} a confirmé : ${appointment.title}`,
    html: emailLayout(body),
  };
}
