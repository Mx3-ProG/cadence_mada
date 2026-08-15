import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseUser } from "@/integrations/supabase/auth-middleware";
import { displayNameSchema } from "@/lib/auth-validation";

const registrationSchema = z.object({
  displayName: displayNameSchema,
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(1000),
});

const onboardingSchema = z.object({ displayName: displayNameSchema });

export const registerWithPassword = createServerFn({ method: "POST" })
  .validator((input: unknown) => registrationSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.displayName,
        cadence_onboarding_completed: "true",
      },
    });

    if (error || !created.user?.email) {
      const duplicate = /already|registered|exists/i.test(error?.message ?? "");
      return {
        ok: false as const,
        reason: duplicate ? ("ACCOUNT_EXISTS" as const) : ("CREATE_FAILED" as const),
      };
    }

    const { createLoginChallengeForUser } = await import("@/lib/two-factor.server");
    const challenge = await createLoginChallengeForUser(created.user.id, created.user.email);
    if (!challenge.ok) {
      // Ne pas laisser un compte inutilisable bloquer une nouvelle tentative si
      // l'envoi du premier code Cadence échoue.
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return challenge;
    }

    return {
      ok: true as const,
      challengeId: challenge.challengeId,
      maskedEmail: challenge.maskedEmail,
    };
  });

export const getOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseUser])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("full_name, onboarding_completed_at")
      .eq("id", context.userId)
      .maybeSingle();

    if (error || !profile) throw new Error("PROFILE_NOT_FOUND");
    return {
      completed: Boolean(profile.onboarding_completed_at),
      displayName: profile.onboarding_completed_at ? (profile.full_name ?? "") : "",
    };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseUser])
  .validator((input: unknown) => onboardingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      user_metadata: {
        full_name: data.displayName,
        cadence_onboarding_completed: "true",
      },
    });
    if (authError) return { ok: false as const };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.displayName, onboarding_completed_at: now })
      .eq("id", context.userId);

    return profileError ? { ok: false as const } : { ok: true as const };
  });
