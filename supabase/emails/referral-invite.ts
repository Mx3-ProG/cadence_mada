import { brand, emailLayout, escapeHtml } from "./shared";

export type ReferralInviteEmailProps = {
  referrerName: string;
  link: string;
};

/** Email envoyé à un contact invité à rejoindre Cadence via un lien de parrainage. */
export function buildReferralInviteEmail({ referrerName, link }: ReferralInviteEmailProps) {
  const body = `
    <h2 style="margin:0 0 8px">${escapeHtml(referrerName)} t'invite sur Cadence Mada</h2>
    <p style="margin:0 0 16px">
      Cadence, c'est l'agenda de rendez-vous qui se confirme tout seul : crée un créneau,
      envoie un lien, et regarde les réponses arriver.
    </p>
    <p style="margin:24px 0">
      <a href="${link}" style="background:${brand.green};color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
        Rejoindre Cadence
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:${brand.muted}">${link}</p>`;

  return {
    subject: `${referrerName} t'invite à essayer Cadence Mada`,
    html: emailLayout(body),
  };
}
