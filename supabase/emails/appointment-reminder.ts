import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";

export function buildAppointmentReminderEmail({
  guestName,
  hostName,
  appointment,
  link,
}: {
  guestName: string;
  hostName: string;
  appointment: { title: string; location: string | null; startsAt: string; endsAt: string };
  link: string;
}) {
  const body = `
    <h1 style="margin:0 0 18px;font-size:28px;line-height:35px">Votre rendez-vous approche</h1>
    <p style="margin:0 0 16px">Bonjour ${escapeHtml(guestName)},</p>
    <p style="margin:0 0 18px">Petit rappel de votre rendez-vous confirmé avec ${escapeHtml(hostName)}.</p>
    <div style="padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <strong>${escapeHtml(appointment.title)}</strong><br />
      ${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt))}
      ${appointment.location ? `<br />${escapeHtml(appointment.location)}` : ""}
    </div>
    <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="color:${brand.greenDark};font-weight:700">Voir les détails du rendez-vous</a></p>`;

  return { subject: `Demain : ${appointment.title}`, html: emailLayout(body) };
}
