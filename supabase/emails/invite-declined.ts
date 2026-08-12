import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared";
import type { InviteResponseEmailProps } from "./invite-accepted";

/** Email envoyé à l'organisateur quand l'invité refuse le rendez-vous. */
export function buildInviteDeclinedEmail({
  guestName,
  appointment,
  responseMessage,
  dashboardLink,
}: InviteResponseEmailProps) {
  const name = guestName || "Votre invité";

  const body = `
    <h2 style="margin:0 0 8px">Rendez-vous refusé</h2>
    <p style="margin:0 0 16px">${escapeHtml(name)} a refusé votre proposition de rendez-vous.</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0 0 6px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt))}</p>
      ${appointment.location ? `<p style="margin:0">Lieu : ${escapeHtml(appointment.location)}</p>` : ""}
    </div>
    ${
      responseMessage
        ? `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${brand.border};background:${brand.greenTint}">« ${escapeHtml(responseMessage)} »</p>`
        : ""
    }
    <p style="margin:24px 0">
      <a href="${dashboardLink}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        Proposer un autre créneau
      </a>
    </p>`;

  return {
    subject: `${name} a refusé : ${appointment.title}`,
    html: emailLayout(body),
  };
}
