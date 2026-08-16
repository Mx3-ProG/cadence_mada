import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { Locale } from "../../src/i18n/config.ts";

export type BookingNewRequestEmailProps = {
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  message: string | null;
  locale: Locale;
  appointment: {
    title: string;
    startsAt: string;
    endsAt: string;
  };
  dashboardLink: string;
};

/** Email envoyé au propriétaire quand un visiteur propose un créneau depuis son lien public. */
export async function buildBookingNewRequestEmail({
  guestName,
  guestEmail,
  guestPhone,
  message,
  locale,
  appointment,
  dashboardLink,
}: BookingNewRequestEmailProps) {
  const t = await createEmailTranslator(locale);
  const body = `
    <h2 style="margin:0 0 8px">${t("booking_new_request.heading")}</h2>
    <p style="margin:0 0 16px">${t("booking_new_request.body", { name: escapeHtml(guestName) })}</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0 0 6px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt, locale))}</p>
      <p style="margin:0 0 6px">${t("booking_new_request.email_prefix")}${escapeHtml(guestEmail)}</p>
      ${guestPhone ? `<p style="margin:0">${t("booking_new_request.phone_prefix")}${escapeHtml(guestPhone)}</p>` : ""}
    </div>
    ${
      message
        ? `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${brand.green};background:#fff">« ${escapeHtml(message)} »</p>`
        : ""
    }
    <p style="margin:24px 0">
      <a href="${dashboardLink}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        ${t("booking_new_request.cta")}
      </a>
    </p>`;

  return {
    subject: t("booking_new_request.subject", { title: appointment.title }),
    html: emailLayout(body, t),
  };
}
