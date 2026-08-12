/**
 * Envoi d'emails transactionnels via l'API Resend.
 * Renseigne RESEND_API_KEY (et RESEND_FROM) dans les variables d'environnement.
 */
export type SendEmailResult =
  { sent: true; to: string } | { sent: false; reason: "no_api_key" | "provider_error" };

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["RESEND_FROM"] ?? "Cadence Mada <rdv@cadencemada.com>";

  if (!apiKey) {
    return { sent: false, reason: "no_api_key" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[resend] send failed", response.status, detail);
    return { sent: false, reason: "provider_error" };
  }

  return { sent: true, to };
}
