import { brand, emailLayout } from "./shared";

/**
 * Email envoyé juste après la création d'un compte (mot de passe auto-confirmé ou Google) :
 * même mécanique de code à 6 chiffres que buildLoginCodeEmail, mais avec un accueil dédié
 * plutôt que le texte générique "connexion demandée", qui ne convient pas à un premier envoi.
 */
export function buildWelcomeCodeEmail(code: string, fullName?: string | null) {
  const firstName = fullName?.trim().split(" ")[0];
  const greeting = firstName ? `Bienvenue ${firstName},` : "Bienvenue,";

  const body = `
    <h1 style="margin:0 0 20px;font-size:32px;line-height:39px;letter-spacing:-1px;color:${brand.ink}">Bienvenue sur Cadence</h1>
    <p style="margin:0 0 24px;font-size:17px;line-height:27px">${greeting}</p>
    <div style="margin:0 0 28px;padding:18px 22px;border-left:4px solid ${brand.green};background:${brand.greenTint};font-size:16px;line-height:25px">
      Ton compte Cadence vient d'être créé. Il ne manque qu'une dernière étape pour l'activer et
      accéder à ton agenda.
    </div>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:${brand.muted}">Saisis ce code sur la page de vérification pour finaliser ton inscription :</p>
    <p style="margin:0 0 24px;padding:18px 20px;border:1px solid ${brand.border};border-radius:10px;background:${brand.greenTint};font-family:Menlo,Consolas,monospace;font-size:32px;line-height:38px;font-weight:700;letter-spacing:7px;text-align:center;color:${brand.greenDark}">${code}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:${brand.muted}">
      Une fois ton compte activé, tu pourras créer tes premiers rendez-vous, ajouter tes contacts
      et partager tes liens de confirmation en quelques secondes.
    </p>
    <p style="margin:0;font-size:13px;line-height:20px;color:${brand.muted}">Ce code expire dans 30 minutes et ne peut être utilisé qu'une fois. Si tu n'es pas à l'origine de cette inscription, tu peux ignorer cet email.</p>`;

  return {
    subject: `${code} — Bienvenue sur Cadence, active ton compte`,
    html: emailLayout(body),
  };
}
