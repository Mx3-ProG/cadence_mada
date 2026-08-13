import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildInviteRequestEmail } from "../../supabase/emails/invite-request";
import { buildInviteAcceptedEmail } from "../../supabase/emails/invite-accepted";
import { buildInviteDeclinedEmail } from "../../supabase/emails/invite-declined";

const sendInviteSchema = z.object({
  appointmentId: z.string().uuid(),
  origin: z.string().url().max(300),
});

/**
 * Envoie l'invitation par email via Resend.
 * Renseigne RESEND_API_KEY (et RESEND_FROM) dans les variables d'environnement.
 */
export const sendInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => sendInviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id, title, description, location, starts_at, ends_at, invite_token, contact_id")
      .eq("id", data.appointmentId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!appointment) throw new Error("Rendez-vous introuvable.");

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "plan, business_name, invite_message, google_review_url, google_maps_url, google_rating, google_reviews_count, review_prompt_enabled",
      )
      .eq("id", userId)
      .maybeSingle();
    const isPro = profile?.plan === "pro";

    let guestEmail: string | null = null;
    let guestName = "";
    if (appointment.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("name, email")
        .eq("id", appointment.contact_id)
        .maybeSingle();
      guestEmail = contact?.email ?? null;
      guestName = contact?.name ?? "";
    }

    if (!guestEmail) {
      return { sent: false as const, reason: "no_email" as const };
    }

    const link = `${data.origin.replace(/\/$/, "")}/invite/${appointment.invite_token}`;

    const { subject, html } = buildInviteRequestEmail({
      guestName,
      appointment: {
        title: appointment.title,
        description: appointment.description,
        location: appointment.location,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
      },
      link,
      ...(isPro && profile
        ? {
            branding: {
              inviteMessage: profile.invite_message,
              businessName: profile.business_name,
              googleReviewUrl: profile.google_review_url,
              googleMapsUrl: profile.google_maps_url,
              googleRating: profile.google_rating,
              googleReviewsCount: profile.google_reviews_count,
              reviewPromptEnabled: profile.review_prompt_enabled,
            },
          }
        : {}),
    });

    const { sendEmail } = await import("@/lib/resend.server");
    const result = await sendEmail({ to: guestEmail, subject, html });

    if (!result.sent) {
      return { ...result, link };
    }

    await supabase
      .from("appointments")
      .update({ invite_sent_at: new Date().toISOString() })
      .eq("id", appointment.id);

    return result;
  });

const notifyResponseSchema = z.object({
  token: z.string().min(1).max(200),
  origin: z.string().url().max(300),
});

/**
 * Notifie l'organisateur par email quand l'invité accepte ou refuse le rendez-vous.
 * Appel public (l'invité n'a pas de compte) : sécurisé par le token d'invitation, qui
 * fait office de capability. Idempotent grâce à la colonne owner_notified_at.
 */
export const notifyInviteResponse = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => notifyResponseSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appointment, error } = await supabaseAdmin
      .from("appointments")
      .select(
        "id, owner_id, title, location, starts_at, ends_at, status, response_message, contact_id, owner_notified_at",
      )
      .eq("invite_token", data.token)
      .maybeSingle();

    if (error || !appointment) return { notified: false as const };
    if (appointment.status !== "accepted" && appointment.status !== "declined") {
      return { notified: false as const };
    }
    if (appointment.owner_notified_at) return { notified: false as const };

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", appointment.owner_id)
      .maybeSingle();
    if (!owner?.email) return { notified: false as const };

    let guestName = "";
    if (appointment.contact_id) {
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("name")
        .eq("id", appointment.contact_id)
        .maybeSingle();
      guestName = contact?.name ?? "";
    }

    const dashboardLink = `${data.origin.replace(/\/$/, "")}/dashboard`;
    const build =
      appointment.status === "accepted" ? buildInviteAcceptedEmail : buildInviteDeclinedEmail;
    const { subject, html } = build({
      guestName,
      appointment: {
        title: appointment.title,
        location: appointment.location,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
      },
      responseMessage: appointment.response_message,
      dashboardLink,
    });

    const { sendEmail } = await import("@/lib/resend.server");
    const result = await sendEmail({ to: owner.email, subject, html });
    if (!result.sent) return { notified: false as const };

    await supabaseAdmin
      .from("appointments")
      .update({ owner_notified_at: new Date().toISOString() })
      .eq("id", appointment.id);

    return { notified: true as const };
  });
