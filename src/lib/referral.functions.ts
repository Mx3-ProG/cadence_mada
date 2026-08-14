import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildReferralInviteEmail } from "../../supabase/emails/referral-invite";

const sendReferralInviteSchema = z.object({
  email: z.string().email().max(300),
  origin: z.string().url().max(300),
});

/**
 * Envoie une invitation de parrainage par email via Resend.
 * Renseigne RESEND_API_KEY (et RESEND_FROM) dans les variables d'environnement.
 */
export const sendReferralInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendReferralInviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, business_name, full_name")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) throw new Error("Profil introuvable.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (existing) {
      return { sent: false as const, reason: "already_member" as const };
    }

    const referrerName = profile.business_name || profile.full_name || "Un utilisateur de Cadence";
    const link = `${data.origin.replace(/\/$/, "")}/auth?ref=${profile.referral_code}`;

    const { subject, html } = buildReferralInviteEmail({ referrerName, link });

    const { sendEmail } = await import("@/lib/resend.server");
    const result = await sendEmail({ to: data.email, subject, html });

    return { ...result, link };
  });
