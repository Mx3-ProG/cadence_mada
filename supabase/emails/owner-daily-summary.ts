import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";

type SummaryItem = { title: string; guestName: string; startsAt: string; endsAt: string };

function list(items: SummaryItem[], empty: string) {
  if (!items.length) return `<p style="color:${brand.muted}">${empty}</p>`;
  return `<ul style="padding-left:20px">${items
    .map(
      (item) =>
        `<li style="margin:0 0 10px"><strong>${escapeHtml(item.title)}</strong> · ${escapeHtml(item.guestName)}<br /><span style="color:${brand.muted}">${escapeHtml(formatDateRange(item.startsAt, item.endsAt))}</span></li>`,
    )
    .join("")}</ul>`;
}

export function buildOwnerDailySummaryEmail({
  ownerName,
  pending,
  upcoming,
  dashboardLink,
}: {
  ownerName: string;
  pending: SummaryItem[];
  upcoming: SummaryItem[];
  dashboardLink: string;
}) {
  const body = `
    <h1 style="margin:0 0 18px;font-size:28px;line-height:35px">Votre résumé Cadence</h1>
    <p style="margin:0 0 22px">Bonjour ${escapeHtml(ownerName)}, voici les actions et rendez-vous à surveiller aujourd’hui.</p>
    <h2 style="font-size:18px">Réponses ou décisions en attente</h2>
    ${list(pending, "Aucune réponse en attente.")}
    <h2 style="margin-top:26px;font-size:18px">Rendez-vous dans les prochaines 24 heures</h2>
    ${list(upcoming, "Aucun rendez-vous prévu dans les prochaines 24 heures.")}
    <p style="margin:26px 0 0"><a href="${escapeHtml(dashboardLink)}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Ouvrir mon agenda</a></p>`;

  return { subject: "Votre résumé quotidien Cadence", html: emailLayout(body) };
}
