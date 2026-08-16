import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { Locale } from "../../src/i18n/config.ts";

export type InviteResponseEmailProps = {
  guestName: string;
  locale: Locale;
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
export async function buildInviteAcceptedEmail({
  guestName,
  locale,
  appointment,
  responseMessage,
  dashboardLink,
}: InviteResponseEmailProps) {
  const t = await createEmailTranslator(locale);
  const name = guestName || t("invite_response.default_guest");

  const body = `
    <h2 style="margin:0 0 8px;color:${brand.greenDark}">${t("invite_accepted.heading")}</h2>
    <p style="margin:0 0 16px">${t("invite_accepted.body", { name: escapeHtml(name) })}</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0 0 6px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt, locale))}</p>
      ${appointment.location ? `<p style="margin:0">${t("invite_response.location_prefix")}${escapeHtml(appointment.location)}</p>` : ""}
    </div>
    ${
      responseMessage
        ? `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${brand.green};background:#fff">« ${escapeHtml(responseMessage)} »</p>`
        : ""
    }
    <p style="margin:24px 0">
      <a href="${dashboardLink}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        ${t("invite_accepted.cta")}
      </a>
    </p>`;

  return {
    subject: t("invite_accepted.subject", { name, title: appointment.title }),
    html: emailLayout(body, t),
  };
}
