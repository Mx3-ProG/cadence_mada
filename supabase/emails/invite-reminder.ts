import { brand, emailLayout, escapeHtml, formatDateRange, type EmailT } from "./shared.ts";
import type { Locale } from "../../src/i18n/config.ts";

/**
 * Contrairement aux autres templates, celui-ci reçoit `t` déjà résolu plutôt que `locale`
 * seul : il est utilisé depuis la fonction Deno supabase/functions/send-reminders (runtime
 * séparé, sans le bundler Vite), qui construit `t` à partir de ses propres imports JSON.
 */
export function buildInviteReminderEmail({
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
    <h1 style="margin:0 0 18px;font-size:28px;line-height:35px">${t("invite_reminder.heading")}</h1>
    <p style="margin:0 0 16px">${t("invite_reminder.greeting", { name: escapeHtml(guestName) })}</p>
    <p style="margin:0 0 18px">${t("invite_reminder.body", { host: escapeHtml(hostName) })}</p>
    <div style="padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <strong>${escapeHtml(appointment.title)}</strong><br />
      ${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt, locale))}
      ${appointment.location ? `<br />${escapeHtml(appointment.location)}` : ""}
    </div>
    <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">${t("invite_reminder.cta")}</a></p>
    <p style="margin:0;font-size:12px;color:${brand.muted}">${escapeHtml(link)}</p>`;

  return {
    subject: t("invite_reminder.subject", { title: appointment.title }),
    html: emailLayout(body, t),
  };
}
