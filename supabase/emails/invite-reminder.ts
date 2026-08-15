import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";

export function buildInviteReminderEmail({
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
    <h1 style="margin:0 0 18px;font-size:28px;line-height:35px">Votre réponse est attendue</h1>
    <p style="margin:0 0 16px">Bonjour ${escapeHtml(guestName)},</p>
    <p style="margin:0 0 18px">${escapeHtml(hostName)} vous a proposé un rendez-vous. Merci de confirmer ou refuser afin que chacun puisse s’organiser.</p>
    <div style="padding:16px;border:1px solid ${brand.border};border-radius:12px;background:${brand.greenTint}">
      <strong>${escapeHtml(appointment.title)}</strong><br />
      ${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt))}
      ${appointment.location ? `<br />${escapeHtml(appointment.location)}` : ""}
    </div>
    <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Répondre à l’invitation</a></p>
    <p style="margin:0;font-size:12px;color:${brand.muted}">${escapeHtml(link)}</p>`;

  return {
    subject: `Rappel : réponse attendue pour ${appointment.title}`,
    html: emailLayout(body),
  };
}
