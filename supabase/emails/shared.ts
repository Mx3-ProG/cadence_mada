/**
 * Templates HTML des emails transactionnels envoyés via Resend (voir src/lib/resend.server.ts).
 * Ce ne sont PAS les emails d'auth Supabase (confirmation de compte, reset mot de passe) —
 * ceux-là se configurent dans le dashboard Supabase (Authentication → Email Templates).
 */
import { bcp47 } from "../../src/i18n/bcp47.ts";
import type { Locale } from "../../src/i18n/config.ts";

// Défini ici (pas importé de ./i18n.ts) : ce fichier est chargé par la fonction Deno
// supabase/functions/send-reminders, qui ne doit jamais toucher ./i18n.ts (dépend de
// @/i18n/resources et son import.meta.glob, spécifique au bundler Vite).
export type EmailT = (key: string, vars?: Record<string, string | number>) => string;

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

export function formatDateRange(startsAt: string, endsAt: string, locale: Locale = "fr") {
  const tag = bcp47(locale);
  const fmt = new Intl.DateTimeFormat(tag, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit" });
  return `${fmt.format(new Date(startsAt))} → ${end.format(new Date(endsAt))}`;
}

export type EmailSender = {
  name: string;
  avatarUrl?: string | null | undefined;
};

/** Petit bandeau "Envoyé par [avatar] Nom", affiché sous le logo Cadence quand fourni. */
function senderBlock(t: EmailT, sender?: EmailSender) {
  if (!sender) return "";
  const avatar = sender.avatarUrl
    ? `<img src="${escapeHtml(sender.avatarUrl)}" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border-radius:999px;object-fit:cover;border:0" />`
    : "";
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px">
      <tr>
        ${avatar ? `<td style="padding-right:8px">${avatar}</td>` : ""}
        <td style="font-size:13px;color:${brand.muted}">
          ${escapeHtml(t("shared.sent_by"))} <strong style="color:${brand.ink}">${escapeHtml(sender.name)}</strong>
        </td>
      </tr>
    </table>`;
}

/** Enveloppe commune compatible email : logo, conteneur, footer. */
export function emailLayout(bodyHtml: string, t: EmailT, sender?: EmailSender) {
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
      ${senderBlock(t, sender)}
      ${bodyHtml}
      <p style="margin:40px 0 0;padding-top:20px;border-top:1px solid ${brand.border};font-size:12px;line-height:18px;color:${brand.muted}">
        ${escapeHtml(t("shared.footer"))}
      </p>
    </div>`;
}
