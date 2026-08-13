import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseUser } from "@/integrations/supabase/auth-middleware";
import { buildLoginCodeEmail } from "../../supabase/emails/login-code";

const CHALLENGE_DURATION_MS = 30 * 60 * 1000;
const INACTIVITY_DURATION_MS = 600 * 60 * 1000;

const credentialsSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(1000),
});

const challengeSchema = z.object({ challengeId: z.string().uuid() });
const verifySchema = challengeSchema.extend({ code: z.string().regex(/^\d{6}$/) });
const completeSchema = challengeSchema.extend({
  completionToken: z.string().min(32).max(200),
  accessToken: z.string().min(100).max(8192),
  referralCode: z.string().trim().min(1).max(20).optional(),
});

async function hmac(value: string) {
  const { createHmac } = await import("node:crypto");
  const pepper = process.env["TWO_FACTOR_PEPPER"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!pepper) throw new Error("Configuration de sécurité 2FA absente.");
  return createHmac("sha256", pepper).update(value).digest("hex");
}

async function newCode() {
  const { randomInt } = await import("node:crypto");
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

async function newCompletionToken() {
  const { randomBytes } = await import("node:crypto");
  return randomBytes(32).toString("base64url");
}

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

async function createAndSendChallenge(userId: string, email: string) {
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

  const { subject, html } = buildLoginCodeEmail(code);
  const { sendEmail } = await import("@/lib/resend.server");
  const result = await sendEmail({ to: email, subject, html });
  if (!result.sent) {
    await supabaseAdmin.from("login_challenges").delete().eq("id", challenge.id);
    return { ok: false as const, reason: "EMAIL_UNAVAILABLE" as const };
  }

  return { ok: true as const, challengeId: challenge.id, maskedEmail: maskEmail(email) };
}

export const startPasswordLoginChallenge = createServerFn({ method: "POST" })
  .validator((input: unknown) => credentialsSchema.parse(input))
  .handler(async ({ data }) => {
    const { createSupabasePasswordClient } = await import("@/integrations/supabase/client.server");
    const authClient = createSupabasePasswordClient();
    const { data: signIn, error } = await authClient.auth.signInWithPassword(data);
    if (error || !signIn.user?.email) {
      return { ok: false as const, reason: "INVALID_CREDENTIALS" as const };
    }

    // Révoque uniquement la session éphémère créée pour vérifier le mot de passe.
    await authClient.auth.signOut({ scope: "local" });
    return createAndSendChallenge(signIn.user.id, signIn.user.email);
  });

/** Première étape Google ou inscription auto-confirmée : la session existe déjà. */
export const startAuthenticatedLoginChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseUser])
  .handler(async ({ context }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email : null;
    if (!email) return { ok: false as const, reason: "NO_EMAIL" as const };
    return createAndSendChallenge(context.userId, email);
  });

export const resendLoginChallenge = createServerFn({ method: "POST" })
  .validator((input: unknown) => challengeSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: challenge } = await supabaseAdmin
      .from("login_challenges")
      .select("id, email, last_sent_at, consumed_at, completed_at")
      .eq("id", data.challengeId)
      .maybeSingle();

    if (!challenge || challenge.consumed_at || challenge.completed_at) {
      return { ok: false as const, reason: "CHALLENGE_EXPIRED" as const };
    }
    if (Date.now() - new Date(challenge.last_sent_at).getTime() < 60_000) {
      return { ok: false as const, reason: "TOO_SOON" as const };
    }

    const code = await newCode();
    const { error } = await supabaseAdmin
      .from("login_challenges")
      .update({
        code_hash: await hmac(code),
        attempts: 0,
        expires_at: new Date(Date.now() + CHALLENGE_DURATION_MS).toISOString(),
        last_sent_at: new Date().toISOString(),
      })
      .eq("id", challenge.id);
    if (error) throw new Error("Impossible de renouveler le code.");

    const { subject, html } = buildLoginCodeEmail(code);
    const { sendEmail } = await import("@/lib/resend.server");
    const sent = await sendEmail({ to: challenge.email, subject, html });
    return sent.sent
      ? { ok: true as const }
      : { ok: false as const, reason: "EMAIL_UNAVAILABLE" as const };
  });

export const verifyLoginCode = createServerFn({ method: "POST" })
  .validator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("consume_login_challenge", {
      _challenge_id: data.challengeId,
      _code_hash: await hmac(data.code),
    });
    const verified = rows?.[0];
    if (error || !verified) return { ok: false as const, reason: "INVALID_CODE" as const };

    const completionToken = await newCompletionToken();
    await supabaseAdmin
      .from("login_challenges")
      .update({ completion_hash: await hmac(completionToken) })
      .eq("id", data.challengeId);

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: verified.email,
    });
    const tokenHash = link.properties?.hashed_token;
    if (linkError || !tokenHash) throw new Error("Impossible de finaliser la connexion.");

    return {
      ok: true as const,
      challengeId: data.challengeId,
      completionToken,
      tokenHash,
      email: verified.email,
    };
  });

export const completeLoginChallenge = createServerFn({ method: "POST" })
  .validator((input: unknown) => completeSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The OTP creates a brand-new Supabase session. Validate that exact token
    // instead of relying on the global middleware to observe browser storage
    // immediately after verifyOtp() returns.
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.getClaims(
      data.accessToken,
    );
    const claims = tokenData?.claims;
    const userId = typeof claims?.sub === "string" ? claims.sub : null;
    const sessionId = typeof claims?.session_id === "string" ? claims.session_id : null;
    if (tokenError || !userId || !sessionId) return { ok: false as const };

    const { data: challenge } = await supabaseAdmin
      .from("login_challenges")
      .select("id")
      .eq("id", data.challengeId)
      .eq("user_id", userId)
      .eq("completion_hash", await hmac(data.completionToken))
      .not("consumed_at", "is", null)
      .is("completed_at", null)
      .maybeSingle();
    if (!challenge) return { ok: false as const };

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("login_sessions").upsert({
      session_id: sessionId,
      user_id: userId,
      verified_at: now,
      last_active_at: now,
    });
    if (error) throw new Error("Impossible d’activer la session.");

    await supabaseAdmin
      .from("login_challenges")
      .update({ completed_at: now, completion_hash: null })
      .eq("id", challenge.id);

    if (data.referralCode) {
      await supabaseAdmin
        .rpc("claim_referral", { _user_id: userId, _code: data.referralCode })
        .then(
          () => undefined,
          (error: unknown) => console.error("[referral] claim failed", error),
        );
    }

    return { ok: true as const };
  });

export const getLoginSessionState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseUser])
  .handler(async ({ context }) => {
    const sessionId =
      typeof context.claims.session_id === "string" ? context.claims.session_id : null;
    if (!sessionId) return { active: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const activeAfter = new Date(Date.now() - INACTIVITY_DURATION_MS).toISOString();
    const { data: session } = await supabaseAdmin
      .from("login_sessions")
      .select("session_id")
      .eq("session_id", sessionId)
      .eq("user_id", context.userId)
      .gt("last_active_at", activeAfter)
      .maybeSingle();
    if (!session) return { active: false as const };

    await supabaseAdmin
      .from("login_sessions")
      .update({ last_active_at: new Date().toISOString() })
      .eq("session_id", sessionId);
    return { active: true as const };
  });
