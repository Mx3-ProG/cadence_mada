import { brand, emailLayout, escapeHtml, formatDateRange, type EmailT } from "./shared.ts";
import type { Locale } from "../../src/i18n/config.ts";

type SummaryItem = { title: string; guestName: string; startsAt: string; endsAt: string };

function list(items: SummaryItem[], empty: string, t: EmailT, locale: Locale) {
  if (!items.length) return `<p style="color:${brand.muted}">${empty}</p>`;
  return `<ul style="padding-left:20px">${items
    .map(
      (item) =>
        `<li style="margin:0 0 10px"><strong>${escapeHtml(item.title)}</strong> · ${escapeHtml(item.guestName)}<br /><span style="color:${brand.muted}">${escapeHtml(formatDateRange(item.startsAt, item.endsAt, locale))}</span></li>`,
    )
    .join("")}</ul>`;
}

/** `t` reçu déjà résolu — voir la note dans invite-reminder.ts (utilisé depuis Deno). */
export function buildOwnerDailySummaryEmail({
  ownerName,
  locale,
  t,
  pending,
  upcoming,
  dashboardLink,
}: {
  ownerName: string;
  locale: Locale;
  t: EmailT;
  pending: SummaryItem[];
  upcoming: SummaryItem[];
  dashboardLink: string;
}) {
  const body = `
    <h1 style="margin:0 0 18px;font-size:28px;line-height:35px">${t("owner_daily_summary.heading")}</h1>
    <p style="margin:0 0 22px">${t("owner_daily_summary.greeting", { name: escapeHtml(ownerName) })}</p>
    <h2 style="font-size:18px">${t("owner_daily_summary.pending_heading")}</h2>
    ${list(pending, t("owner_daily_summary.pending_empty"), t, locale)}
    <h2 style="margin-top:26px;font-size:18px">${t("owner_daily_summary.upcoming_heading")}</h2>
    ${list(upcoming, t("owner_daily_summary.upcoming_empty"), t, locale)}
    <p style="margin:26px 0 0"><a href="${escapeHtml(dashboardLink)}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">${t("owner_daily_summary.cta")}</a></p>`;

  return { subject: t("owner_daily_summary.subject"), html: emailLayout(body, t) };
}
