/**
 * Templates HTML des emails transactionnels envoyés via Resend (voir src/lib/resend.server.ts).
 * Ce ne sont PAS les emails d'auth Supabase (confirmation de compte, reset mot de passe) —
 * ceux-là se configurent dans le dashboard Supabase (Authentication → Email Templates).
 */

export const brand = {
  green: "#10B981",
  greenDark: "#0B7A5A",
  greenTint: "#F3FBF7",
  ink: "#0A0F0D",
  border: "#E3E8E6",
  muted: "#5A6B65",
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDateRange(startsAt: string, endsAt: string) {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt.format(new Date(startsAt))} → ${end.format(new Date(endsAt))}`;
}

/** Enveloppe commune compatible email : logo, conteneur, footer. */
export function emailLayout(bodyHtml: string) {
  return `
    <div style="font-family:Helvetica,Arial,sans-serif;background:#ffffff;padding:32px 24px;color:${brand.ink};max-width:600px;margin:0 auto">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 32px">
        <tr>
          <td style="padding-right:12px">
            <img src="https://www.cadencemada.com/apple-touch-icon.png" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0;border-radius:12px" />
          </td>
          <td style="font-weight:700;font-size:20px;letter-spacing:-0.01em">
            Cadence <span style="color:${brand.greenDark}">Mada</span>
          </td>
        </tr>
      </table>
      ${bodyHtml}
      <p style="margin:40px 0 0;padding-top:20px;border-top:1px solid ${brand.border};font-size:12px;line-height:18px;color:${brand.muted}">
        Cet email a été envoyé automatiquement par Cadence Mada.
      </p>
    </div>`;
}
