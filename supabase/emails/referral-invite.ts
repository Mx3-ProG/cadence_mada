import { brand, emailLayout, escapeHtml } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { Locale } from "../../src/i18n/config.ts";

export type ReferralInviteEmailProps = {
  referrerName: string;
  referrerAvatarUrl?: string | null | undefined;
  locale: Locale;
  link: string;
};

/** Email envoyé à un contact invité à rejoindre Cadence via un lien de parrainage. */
export async function buildReferralInviteEmail({
  referrerName,
  referrerAvatarUrl,
  locale,
  link,
}: ReferralInviteEmailProps) {
  const t = await createEmailTranslator(locale);
  const body = `
    <h2 style="margin:0 0 8px">${t("referral_invite.heading", { name: escapeHtml(referrerName) })}</h2>
    <p style="margin:0 0 16px">
      ${t("referral_invite.body")}
    </p>
    <p style="margin:24px 0">
      <a href="${link}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        ${t("referral_invite.cta")}
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:${brand.muted}">${link}</p>`;

  return {
    subject: t("referral_invite.subject", { name: referrerName }),
    html: emailLayout(body, t, { name: referrerName, avatarUrl: referrerAvatarUrl }),
  };
}
