/**
 * Envoi d'emails transactionnels via l'API Resend.
 * Renseigne RESEND_API_KEY (et RESEND_FROM) dans les variables d'environnement.
 */
export type SendEmailResult =
  | { sent: true; to: string; id: string | null }
  | {
      sent: false;
      reason: "no_api_key" | "provider_error";
    };

export async function sendEmail({
  to,
  subject,
  html,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
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
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[resend] send failed", response.status, detail);
    return { sent: false, reason: "provider_error" };
  }

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { sent: true, to, id: payload?.id ?? null };
}
