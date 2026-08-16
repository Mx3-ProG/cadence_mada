import { brand, emailLayout, escapeHtml, formatDateRange, type EmailT } from "./shared.ts";
import type { Locale } from "../../src/i18n/config.ts";

/** `t` reçu déjà résolu — voir la note dans invite-reminder.ts (utilisé depuis Deno). */
export function buildAppointmentReminderEmail({
  guestName,
  hostName,
  locale,
  t,
  appointment,
  link,
}: {
  guestName: string;
  hostName: string;
  locale: Locale;
  t: EmailT;
  appointment: { title: string; location: string | null; startsAt: string; endsAt: string };
  link: string;
}) {
  const body = `
    <h1 style="margin:0 0 18px;font-size:28px;line-height:35px">${t("appointment_reminder.heading")}</h1>
    <p style="margin:0 0 16px">${t("appointment_reminder.greeting", { name: escapeHtml(guestName) })}</p>
    <p style="margin:0 0 18px">${t("appointment_reminder.body", { host: escapeHtml(hostName) })}</p>
    <div style="padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <strong>${escapeHtml(appointment.title)}</strong><br />
      ${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt, locale))}
      ${appointment.location ? `<br />${escapeHtml(appointment.location)}` : ""}
    </div>
    <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="color:${brand.greenDark};font-weight:700">${t("appointment_reminder.cta")}</a></p>`;

  return {
    subject: t("appointment_reminder.subject", { title: appointment.title }),
    html: emailLayout(body, t),
  };
}
