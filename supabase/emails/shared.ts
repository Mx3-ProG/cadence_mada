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

/** Enveloppe commune : logo texte "Cadence Mada", conteneur, footer. */
export function emailLayout(bodyHtml: string) {
  return `
    <div style="font-family:Helvetica,Arial,sans-serif;background:#ffffff;padding:24px;color:${brand.ink}">
      <p style="margin:0 0 20px;font-weight:700;font-size:18px;letter-spacing:-0.01em">
        Cadence <span style="color:${brand.greenDark}">Mada</span>
      </p>
      ${bodyHtml}
      <p style="margin:32px 0 0;font-size:12px;color:${brand.muted}">
        Cet email a été envoyé automatiquement par Cadence Mada.
      </p>
    </div>`;
}
