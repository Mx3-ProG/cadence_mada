import { brand, emailLayout, escapeHtml, formatDateRange } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { Locale } from "../../src/i18n/config.ts";

export type InviteRequestEmailProps = {
  guestName: string;
  hostName: string;
  hostAvatarUrl?: string | null | undefined;
  locale: Locale;
  appointment: {
    title: string;
    description: string | null;
    location: string | null;
    startsAt: string;
    endsAt: string;
  };
  link: string;
  /** Personnalisation réservée au plan Business. */
  branding?: {
    inviteMessage?: string | null;
    businessName?: string | null;
    googleReviewUrl?: string | null;
    googleMapsUrl?: string | null;
    googleRating?: number | null;
    googleReviewsCount?: number | null;
    websiteUrl?: string | null;
    reviewPromptEnabled?: boolean;
  };
};

/** Email envoyé à l'invité pour lui proposer un rendez-vous. */
export async function buildInviteRequestEmail({
  guestName,
  hostName,
  hostAvatarUrl,
  locale,
  appointment,
  link,
  branding,
}: InviteRequestEmailProps) {
  const t = await createEmailTranslator(locale);

  const brandBlock = branding?.inviteMessage
    ? `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${brand.green};background:${brand.greenTint}">${escapeHtml(branding.inviteMessage)}</p>`
    : "";

  const reviewBlock =
    branding?.reviewPromptEnabled &&
    (branding.googleReviewUrl || branding.googleMapsUrl || branding.websiteUrl)
      ? `<div style="margin-top:28px;padding:16px;border:1px solid ${brand.border};border-radius:12px">
          <p style="margin:0 0 8px;font-weight:600">${escapeHtml(branding.businessName ?? t("invite_request.reviews.default_title"))}</p>
          ${
            branding.googleRating != null
              ? `<p style="margin:0 0 12px;color:${brand.muted}">${Number(branding.googleRating).toFixed(1)}/5 ★${
                  branding.googleReviewsCount != null
                    ? ` · ${branding.googleReviewsCount}${t("invite_request.reviews.rating_suffix")}`
                    : ""
                }</p>`
              : ""
          }
          ${
            branding.googleReviewUrl
              ? `<p style="margin:0 0 8px"><a href="${escapeHtml(branding.googleReviewUrl)}" style="color:${brand.greenDark};font-weight:600">${t("invite_request.reviews.leave_review")}</a></p>`
              : ""
          }
          ${
            branding.googleMapsUrl
              ? `<p style="margin:0 0 8px"><a href="${escapeHtml(branding.googleMapsUrl)}" style="color:${brand.greenDark}">${t("invite_request.reviews.view_maps")}</a></p>`
              : ""
          }
          ${
            branding.websiteUrl
              ? `<p style="margin:0"><a href="${escapeHtml(branding.websiteUrl)}" style="color:${brand.greenDark}">${t("invite_request.reviews.visit_website")}</a></p>`
              : ""
          }
        </div>`
      : "";

  const body = `
    <h2 style="margin:0 0 8px">${t("invite_request.heading")}</h2>
    <p style="margin:0 0 16px">${t("invite_request.greeting", { name: escapeHtml(guestName || "") })}</p>
    ${brandBlock}
    <p style="margin:0 0 8px"><strong>${escapeHtml(appointment.title)}</strong></p>
    <p style="margin:0 0 8px">${escapeHtml(formatDateRange(appointment.startsAt, appointment.endsAt, locale))}</p>
    ${appointment.location ? `<p style="margin:0 0 8px">${t("invite_request.location_prefix")}${escapeHtml(appointment.location)}</p>` : ""}
    ${appointment.description ? `<p style="margin:0 0 16px">${escapeHtml(appointment.description)}</p>` : ""}
    <p style="margin:24px 0">
      <a href="${link}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        ${t("invite_request.cta")}
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#667">${link}</p>
    ${reviewBlock}`;

  return {
    subject: t("invite_request.subject", { title: appointment.title }),
    html: emailLayout(body, t, { name: hostName, avatarUrl: hostAvatarUrl }),
  };
}
