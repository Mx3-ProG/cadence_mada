import { brand, emailLayout, escapeHtml } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { Locale } from "../../src/i18n/config.ts";

/**
 * Email envoyé juste après la création d'un compte (mot de passe auto-confirmé ou Google) :
 * même mécanique de code à 6 chiffres que buildLoginCodeEmail, mais avec un accueil dédié
 * plutôt que le texte générique "connexion demandée", qui ne convient pas à un premier envoi.
 */
export async function buildWelcomeCodeEmail(
  code: string,
  locale: Locale,
  fullName?: string | null,
) {
  const t = await createEmailTranslator(locale);
  const firstName = fullName?.trim().split(" ")[0];
  const greeting = firstName
    ? t("welcome_code.greeting_named", { name: escapeHtml(firstName) })
    : t("welcome_code.greeting_default");

  const body = `
    <h1 style="margin:0 0 20px;font-size:32px;line-height:39px;letter-spacing:-1px;color:${brand.ink}">${t("welcome_code.heading")}</h1>
    <p style="margin:0 0 24px;font-size:17px;line-height:27px">${greeting}</p>
    <div style="margin:0 0 28px;padding:18px 22px;border-left:4px solid ${brand.green};background:${brand.greenTint};font-size:16px;line-height:25px">
      ${t("welcome_code.intro")}
    </div>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:${brand.muted}">${t("welcome_code.instruction")}</p>
    <p style="margin:0 0 24px;padding:18px 20px;border:1px solid ${brand.border};border-radius:10px;background:${brand.greenTint};font-family:Menlo,Consolas,monospace;font-size:32px;line-height:38px;font-weight:700;letter-spacing:7px;text-align:center;color:${brand.greenDark}">${code}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:${brand.muted}">
      ${t("welcome_code.body2")}
    </p>
    <p style="margin:0;font-size:13px;line-height:20px;color:${brand.muted}">${t("welcome_code.footer")}</p>`;

  return {
    subject: t("welcome_code.subject", { code }),
    html: emailLayout(body, t),
  };
}
