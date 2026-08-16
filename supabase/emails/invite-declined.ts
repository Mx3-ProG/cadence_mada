import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { InviteResponseEmailProps } from "./invite-accepted.ts";

/** Email envoyé à l'organisateur quand l'invité refuse le rendez-vous. */
export async function buildInviteDeclinedEmail({
  guestName,
  locale,
  appointment,
  responseMessage,
  dashboardLink,
}: InviteResponseEmailProps) {
  const t = await createEmailTranslator(locale);
  const name = guestName || t("invite_response.default_guest");

  const body = `
    <h2 style="margin:0 0 8px">${t("invite_declined.heading")}</h2>
    <p style="margin:0 0 16px">${t("invite_declined.body", { name: escapeHtml(name) })}</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0 0 6px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt, locale))}</p>
      ${appointment.location ? `<p style="margin:0">${t("invite_response.location_prefix")}${escapeHtml(appointment.location)}</p>` : ""}
    </div>
    ${
      responseMessage
        ? `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${brand.border};background:${brand.greenTint}">« ${escapeHtml(responseMessage)} »</p>`
        : ""
    }
    <p style="margin:24px 0">
      <a href="${dashboardLink}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        ${t("invite_declined.cta")}
      </a>
    </p>`;

  return {
    subject: t("invite_declined.subject", { name, title: appointment.title }),
    html: emailLayout(body, t),
  };
}
