import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildInviteRequestEmail } from "../../supabase/emails/invite-request";
import { buildInviteAcceptedEmail } from "../../supabase/emails/invite-accepted";
import { buildInviteDeclinedEmail } from "../../supabase/emails/invite-declined";
import { isSupportedLocale, DEFAULT_LOCALE } from "@/i18n/config";

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
        "plan, full_name, email, avatar_url, locale, business_name, invite_message, google_review_url, google_maps_url, google_rating, google_reviews_count, website_url, review_prompt_enabled",
      )
      .eq("id", userId)
      .maybeSingle();
    const hasBranding = profile?.plan === "business";
    const hostName = profile?.business_name || profile?.full_name || profile?.email || "votre hôte";
    const locale = isSupportedLocale(profile?.locale) ? profile.locale : DEFAULT_LOCALE;

    const { data: invitations, error: invitationsError } = await supabase
      .from("appointment_invites")
      .select("id, invite_token, contact:contacts(name, email)")
      .eq("appointment_id", appointment.id);
    if (invitationsError) throw new Error(invitationsError.message);
    const inviteeCount = invitations?.length ?? 0;

    let recipients: { id: string | null; token: string; name: string; email: string }[] = (
      invitations ?? []
    ).flatMap((invitation) => {
      const contact = invitation.contact;
      return contact?.email
        ? [
            {
              id: invitation.id,
              token: invitation.invite_token,
              name: contact.name,
              email: contact.email,
            },
          ]
        : [];
    });

    // Compatibilité avec un ancien rendez-vous qui n'aurait pas encore été migré.
    if (!recipients.length && appointment.contact_id) {
      const { data: contact } = await supabase
        .from("contacts")
        .select("name, email")
        .eq("id", appointment.contact_id)
        .maybeSingle();
      if (contact?.email) {
        recipients = [
          { id: null, token: appointment.invite_token, name: contact.name, email: contact.email },
        ];
      }
    }

    if (!recipients.length) {
      return { sent: false as const, reason: "no_email" as const };
    }
    const { sendEmail } = await import("@/lib/resend.server");
    const links = recipients.map(
      (recipient) =>
        `${recipient.name} : ${data.origin.replace(/\/$/, "")}/invite/${recipient.token}`,
    );
    const sentInviteIds: string[] = [];
    let sentCount = 0;

    for (const recipient of recipients) {
      const link = `${data.origin.replace(/\/$/, "")}/invite/${recipient.token}`;
      const { subject, html } = await buildInviteRequestEmail({
        guestName: recipient.name,
        hostName,
        hostAvatarUrl: profile?.avatar_url,
        locale,
        appointment: {
          title: appointment.title,
          description: appointment.description,
          location: appointment.location,
          startsAt: appointment.starts_at,
          endsAt: appointment.ends_at,
        },
        link,
        ...(hasBranding && profile
          ? {
              branding: {
                inviteMessage: profile.invite_message,
                businessName: profile.business_name,
                googleReviewUrl: profile.google_review_url,
                googleMapsUrl: profile.google_maps_url,
                googleRating: profile.google_rating,
                googleReviewsCount: profile.google_reviews_count,
                websiteUrl: profile.website_url,
                reviewPromptEnabled: profile.review_prompt_enabled,
              },
            }
          : {}),
      });
      const result = await sendEmail({ to: recipient.email, subject, html });
      if (result.sent) {
        sentCount += 1;
        if (recipient.id) sentInviteIds.push(recipient.id);
      } else {
        if (result.reason === "no_api_key") {
          return {
            sent: false as const,
            reason: "no_api_key" as const,
            link,
            links: links.join("\n"),
          };
        }
      }
    }

    const sentAt = new Date().toISOString();
    if (sentInviteIds.length) {
      await supabase
        .from("appointment_invites")
        .update({ invite_sent_at: sentAt })
        .in("id", sentInviteIds);
    }
    if (sentCount) {
      await supabase
        .from("appointments")
        .update({ invite_sent_at: sentAt })
        .eq("id", appointment.id);
      return {
        sent: true as const,
        to: `${sentCount} contact${sentCount > 1 ? "s" : ""}`,
        sentCount,
        totalCount: Math.max(inviteeCount, recipients.length),
      };
    }

    return {
      sent: false as const,
      reason: "provider_error" as const,
      link: links[0]!.split(" : ")[1]!,
      links: links.join("\n"),
    };
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

    const { data: invitation } = await supabaseAdmin
      .from("appointment_invites")
      .select("id, appointment_id, contact_id, status, response_message, owner_notified_at")
      .eq("invite_token", data.token)
      .maybeSingle();

    const appointmentQuery = supabaseAdmin
      .from("appointments")
      .select(
        "id, owner_id, title, location, starts_at, ends_at, status, response_message, contact_id, owner_notified_at",
      );
    const { data: appointment, error } = invitation
      ? await appointmentQuery.eq("id", invitation.appointment_id).maybeSingle()
      : await appointmentQuery.eq("invite_token", data.token).maybeSingle();

    if (error || !appointment) return { notified: false as const };
    const responseStatus = invitation?.status ?? appointment.status;
    const responseMessage = invitation?.response_message ?? appointment.response_message;
    const ownerNotifiedAt = invitation?.owner_notified_at ?? appointment.owner_notified_at;
    if (responseStatus !== "accepted" && responseStatus !== "declined") {
      return { notified: false as const };
    }
    if (ownerNotifiedAt) return { notified: false as const };

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("email, locale")
      .eq("id", appointment.owner_id)
      .maybeSingle();
    if (!owner?.email) return { notified: false as const };
    const ownerLocale = isSupportedLocale(owner.locale) ? owner.locale : DEFAULT_LOCALE;

    let guestName = "";
    const contactId = invitation?.contact_id ?? appointment.contact_id;
    if (contactId) {
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("name")
        .eq("id", contactId)
        .maybeSingle();
      guestName = contact?.name ?? "";
    }

    const dashboardLink = `${data.origin.replace(/\/$/, "")}/dashboard`;
    const build =
      responseStatus === "accepted" ? buildInviteAcceptedEmail : buildInviteDeclinedEmail;
    const { subject, html } = await build({
      guestName,
      locale: ownerLocale,
      appointment: {
        title: appointment.title,
        location: appointment.location,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
      },
      responseMessage,
      dashboardLink,
    });

    const { sendEmail } = await import("@/lib/resend.server");
    const result = await sendEmail({ to: owner.email, subject, html });
    if (!result.sent) return { notified: false as const };

    if (invitation) {
      await supabaseAdmin
        .from("appointment_invites")
        .update({ owner_notified_at: new Date().toISOString() })
        .eq("id", invitation.id);
    } else {
      await supabaseAdmin
        .from("appointments")
        .update({ owner_notified_at: new Date().toISOString() })
        .eq("id", appointment.id);
    }

    return { notified: true as const };
  });
