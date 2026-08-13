import { brand, emailLayout } from "./shared";

export function buildLoginCodeEmail(code: string) {
  const body = `
    <h1 style="margin:0 0 20px;font-size:32px;line-height:39px;letter-spacing:-1px;color:${brand.ink}">Votre code de connexion</h1>
    <p style="margin:0 0 24px;font-size:17px;line-height:27px">Bonjour,</p>
    <div style="margin:0 0 28px;padding:18px 22px;border-left:4px solid ${brand.green};background:${brand.greenTint};font-size:16px;line-height:25px">
      Une connexion à votre compte Cadence Mada vient d’être demandée.
    </div>
    <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:${brand.muted}">Saisissez ce code sur la page de vérification :</p>
    <p style="margin:0 0 24px;padding:18px 20px;border:1px solid ${brand.border};border-radius:10px;background:${brand.greenTint};font-family:Menlo,Consolas,monospace;font-size:32px;line-height:38px;font-weight:700;letter-spacing:7px;text-align:center;color:${brand.greenDark}">${code}</p>
    <p style="margin:0;font-size:13px;line-height:20px;color:${brand.muted}">Ce code expire dans 10 minutes et ne peut être utilisé qu’une fois. Si vous n’êtes pas à l’origine de cette connexion, changez votre mot de passe.</p>`;

  return {
    subject: `${code} est votre code de connexion Cadence Mada`,
    html: emailLayout(body),
  };
}
