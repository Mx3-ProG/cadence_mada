import { brand, emailLayout } from "./shared.ts";
import { createEmailTranslator } from "./i18n.ts";
import type { Locale } from "../../src/i18n/config.ts";

export async function buildLoginCodeEmail(code: string, locale: Locale) {
  const t = await createEmailTranslator(locale);
  const body = `
    <h1 style="margin:0 0 20px;font-size:32px;line-height:39px;letter-spacing:-1px;color:${brand.ink}">${t("login_code.heading")}</h1>
    <p style="margin:0 0 24px;font-size:17px;line-height:27px">${t("login_code.greeting")}</p>
    <div style="margin:0 0 28px;padding:18px 22px;border-left:4px solid ${brand.green};background:${brand.greenTint};font-size:16px;line-height:25px">
      ${t("login_code.intro")}
    </div>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:${brand.muted}">${t("login_code.instruction")}</p>
    <p style="margin:0 0 24px;padding:18px 20px;border:1px solid ${brand.border};border-radius:10px;background:${brand.greenTint};font-family:Menlo,Consolas,monospace;font-size:32px;line-height:38px;font-weight:700;letter-spacing:7px;text-align:center;color:${brand.greenDark}">${code}</p>
    <p style="margin:0;font-size:13px;line-height:20px;color:${brand.muted}">${t("login_code.footer")}</p>`;

  return {
    subject: t("login_code.subject", { code }),
    html: emailLayout(body, t),
  };
}
