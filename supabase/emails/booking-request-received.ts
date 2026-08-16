import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { Locale } from "../../src/i18n/config.ts";

export type BookingRequestReceivedEmailProps = {
  guestName: string;
  hostName: string;
  locale: Locale;
  appointment: {
    title: string;
    startsAt: string;
    endsAt: string;
  };
};

/** Email envoyé au visiteur pour accuser réception de sa demande de rendez-vous. */
export async function buildBookingRequestReceivedEmail({
  guestName,
  hostName,
  locale,
  appointment,
}: BookingRequestReceivedEmailProps) {
  const t = await createEmailTranslator(locale);
  const body = `
    <h2 style="margin:0 0 8px">${t("booking_request_received.heading")}</h2>
    <p style="margin:0 0 16px">${t("booking_request_received.greeting", { name: escapeHtml(guestName) })}</p>
    <p style="margin:0 0 16px">${t("booking_request_received.body", { host: escapeHtml(hostName) })}</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt, locale))}</p>
    </div>`;

  return {
    subject: t("booking_request_received.subject", { title: appointment.title }),
    html: emailLayout(body, t),
  };
}
