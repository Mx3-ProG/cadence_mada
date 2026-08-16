import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { BookingDecisionEmailProps } from "./booking-confirmed.ts";

/** Email envoyé au visiteur quand le propriétaire ne peut pas honorer le créneau demandé. */
export async function buildBookingDeclinedEmail({
  guestName,
  hostName,
  hostAvatarUrl,
  locale,
  appointment,
  bookingLink,
}: BookingDecisionEmailProps) {
  const t = await createEmailTranslator(locale);
  const body = `
    <h2 style="margin:0 0 8px">${t("booking_declined.heading")}</h2>
    <p style="margin:0 0 16px">${t("booking_declined.body", { name: escapeHtml(guestName), host: escapeHtml(hostName) })}</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt, locale))}</p>
    </div>
    <p style="margin:24px 0">
      <a href="${bookingLink}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        ${t("booking_declined.cta")}
      </a>
    </p>`;

  return {
    subject: t("booking_declined.subject", { title: appointment.title }),
    html: emailLayout(body, t, { name: hostName, avatarUrl: hostAvatarUrl }),
  };
}
