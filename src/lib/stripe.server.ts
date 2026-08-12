/**
 * Petit client Stripe basé sur fetch (compatible runtime edge).
 * Nécessite la variable d'environnement STRIPE_SECRET_KEY.
 */

const STRIPE_API = "https://api.stripe.com/v1";

export function getStripeKey(): string {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante.");
  return key;
}

/** Aplatit un objet en paires clé/valeur au format attendu par Stripe. */
function encode(params: Record<string, unknown>, prefix = ""): [string, string][] {
  const out: [string, string][] = [];
  for (const [rawKey, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const key = prefix ? `${prefix}[${rawKey}]` : rawKey;
    if (typeof value === "object" && !Array.isArray(value)) {
      out.push(...encode(value as Record<string, unknown>, key));
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === "object" && item !== null) {
          out.push(...encode(item as Record<string, unknown>, `${key}[${i}]`));
        } else {
          out.push([`${key}[${i}]`, String(item)]);
        }
      });
    } else {
      out.push([key, String(value)]);
    }
  }
  return out;
}

export async function stripeRequest<T = unknown>(
  path: string,
  options: { method?: "GET" | "POST"; params?: Record<string, unknown> } = {},
): Promise<T> {
  const method = options.method ?? "POST";
  const body = options.params ? new URLSearchParams(encode(options.params)) : undefined;
  const url = method === "GET" && body ? `${STRIPE_API}${path}?${body}` : `${STRIPE_API}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${getStripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    ...(method === "POST" && body ? { body } : {}),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`[stripe] ${method} ${path} -> ${response.status}: ${text}`);
    throw new Error(`Stripe ${response.status}: ${text}`);
  }
  return JSON.parse(text) as T;
}

/** Vérifie la signature d'un webhook Stripe (schéma v1, HMAC SHA-256). */
export async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k ?? "", rest.join("=")];
    }),
  ) as Record<string, string>;

  const timestamp = parts["t"];
  const provided = parts["v1"];
  if (!timestamp || !provided) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
