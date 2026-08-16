import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { Locale } from "../../src/i18n/config.ts";

export type BookingDecisionEmailProps = {
  guestName: string;
  hostName: string;
  hostAvatarUrl?: string | null | undefined;
  locale: Locale;
  appointment: {
    title: string;
    location: string | null;
    startsAt: string;
    endsAt: string;
  };
  bookingLink: string;
};

/** Email envoyé au visiteur quand le propriétaire confirme sa demande de rendez-vous. */
export async function buildBookingConfirmedEmail({
  guestName,
  hostName,
  hostAvatarUrl,
  locale,
  appointment,
  bookingLink,
}: BookingDecisionEmailProps) {
  const t = await createEmailTranslator(locale);
  const body = `
    <h2 style="margin:0 0 8px;color:${brand.greenDark}">${t("booking_confirmed.heading")}</h2>
    <p style="margin:0 0 16px">${t("booking_confirmed.body", { name: escapeHtml(guestName), host: escapeHtml(hostName) })}</p>
    <div style="margin:0 0 16px;padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <p style="margin:0 0 6px"><strong>${escapeHtml(appointment.title)}</strong></p>
      <p style="margin:0 0 6px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt, locale))}</p>
      ${appointment.location ? `<p style="margin:0">${t("booking_confirmed.location_prefix")}${escapeHtml(appointment.location)}</p>` : ""}
    </div>
    <p style="margin:0;font-size:12px;color:#667">${bookingLink}</p>`;

  return {
    subject: t("booking_confirmed.subject", { title: appointment.title }),
    html: emailLayout(body, t, { name: hostName, avatarUrl: hostAvatarUrl }),
  };
}
