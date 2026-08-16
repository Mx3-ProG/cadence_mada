import { buildLoginCodeEmail } from "../../supabase/emails/login-code";
import { buildWelcomeCodeEmail } from "../../supabase/emails/welcome-code";
import { isSupportedLocale, DEFAULT_LOCALE } from "@/i18n/config";

export const CHALLENGE_DURATION_MS = 30 * 60 * 1000;
const SIGNUP_WELCOME_WINDOW_MS = 5 * 60 * 1000;

export async function hmac(value: string) {
  const { createHmac } = await import("node:crypto");
  const pepper = process.env["TWO_FACTOR_PEPPER"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!pepper) throw new Error("Configuration de sécurité 2FA absente.");
  return createHmac("sha256", pepper).update(value).digest("hex");
}

export async function newCode() {
  const { randomInt } = await import("node:crypto");
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function newCompletionToken() {
  const { randomBytes } = await import("node:crypto");
  return randomBytes(32).toString("base64url");
}

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export async function sendChallengeEmail(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  userId: string,
  email: string,
  code: string,
) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, created_at, locale")
    .eq("id", userId)
    .maybeSingle();

  const locale = isSupportedLocale(profile?.locale) ? profile.locale : DEFAULT_LOCALE;
  const isFreshSignup =
    !!profile?.created_at &&
    Date.now() - new Date(profile.created_at).getTime() < SIGNUP_WELCOME_WINDOW_MS;
  const { subject, html } = isFreshSignup
    ? await buildWelcomeCodeEmail(code, locale, profile?.full_name)
    : await buildLoginCodeEmail(code, locale);

  const { sendEmail } = await import("@/lib/resend.server");
  return sendEmail({ to: email, subject, html });
}

export async function createLoginChallengeForUser(userId: string, email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("login_challenges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if ((count ?? 0) >= 5) return { ok: false as const, reason: "RATE_LIMITED" as const };

  const code = await newCode();
  const { data: challenge, error } = await supabaseAdmin
    .from("login_challenges")
    .insert({
      user_id: userId,
      email,
      code_hash: await hmac(code),
      expires_at: new Date(Date.now() + CHALLENGE_DURATION_MS).toISOString(),
    })
    .select("id")
    .single();

  if (error || !challenge) throw new Error("Impossible de créer le code de connexion.");

  const result = await sendChallengeEmail(supabaseAdmin, userId, email, code);
  if (!result.sent) {
    await supabaseAdmin.from("login_challenges").delete().eq("id", challenge.id);
    return { ok: false as const, reason: "EMAIL_UNAVAILABLE" as const };
  }

  return { ok: true as const, challengeId: challenge.id, maskedEmail: maskEmail(email) };
}
