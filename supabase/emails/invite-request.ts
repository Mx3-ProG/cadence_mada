import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared";

export type InviteRequestEmailProps = {
  guestName: string;
  appointment: {
    title: string;
    description: string | null;
    location: string | null;
    startsAt: string;
    endsAt: string;
  };
  link: string;
  /** Personnalisation réservée au plan pro. */
  branding?: {
    inviteMessage?: string | null;
    businessName?: string | null;
    googleReviewUrl?: string | null;
    googleMapsUrl?: string | null;
    googleRating?: number | null;
    googleReviewsCount?: number | null;
    reviewPromptEnabled?: boolean;
  };
};

/** Email envoyé à l'invité pour lui proposer un rendez-vous. */
export function buildInviteRequestEmail({
  guestName,
  appointment,
  link,
  branding,
}: InviteRequestEmailProps) {
  const brandBlock = branding?.inviteMessage
    ? `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${brand.green};background:${brand.greenTint}">${escapeHtml(branding.inviteMessage)}</p>`
    : "";

  const reviewBlock =
    branding?.reviewPromptEnabled && (branding.googleReviewUrl || branding.googleMapsUrl)
      ? `<div style="margin-top:28px;padding:16px;border:1px solid ${brand.border};border-radius:12px">
          <p style="margin:0 0 8px;font-weight:600">${escapeHtml(branding.businessName ?? "Avis Google")}</p>
          ${
            branding.googleRating != null
              ? `<p style="margin:0 0 12px;color:${brand.muted}">${Number(branding.googleRating).toFixed(1)}/5 ★${
                  branding.googleReviewsCount != null
                    ? ` · ${branding.googleReviewsCount} avis`
                    : ""
                }</p>`
              : ""
          }
          ${
            branding.googleReviewUrl
              ? `<p style="margin:0 0 8px"><a href="${escapeHtml(branding.googleReviewUrl)}" style="color:${brand.greenDark};font-weight:600">Laisser un avis Google</a></p>`
              : ""
          }
          ${
            branding.googleMapsUrl
              ? `<p style="margin:0"><a href="${escapeHtml(branding.googleMapsUrl)}" style="color:${brand.greenDark}">Voir sur Google Maps</a></p>`
              : ""
          }
        </div>`
      : "";

  const body = `
    <h2 style="margin:0 0 8px">Proposition de rendez-vous</h2>
    <p style="margin:0 0 16px">Bonjour ${escapeHtml(guestName || "")},</p>
    ${brandBlock}
    <p style="margin:0 0 8px"><strong>${escapeHtml(appointment.title)}</strong></p>
    <p style="margin:0 0 8px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt))}</p>
    ${appointment.location ? `<p style="margin:0 0 8px">Lieu : ${escapeHtml(appointment.location)}</p>` : ""}
    ${appointment.description ? `<p style="margin:0 0 16px">${escapeHtml(appointment.description)}</p>` : ""}
    <p style="margin:24px 0">
      <a href="${link}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        Confirmer ou refuser
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#667">${link}</p>
    ${reviewBlock}`;

  return {
    subject: `Rendez-vous : ${appointment.title}`,
    html: emailLayout(body),
  };
}
