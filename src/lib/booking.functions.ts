import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildBookingNewRequestEmail } from "../../supabase/emails/booking-new-request";
import { buildBookingRequestReceivedEmail } from "../../supabase/emails/booking-request-received";
import { buildBookingConfirmedEmail } from "../../supabase/emails/booking-confirmed";
import { buildBookingDeclinedEmail } from "../../supabase/emails/booking-declined";

const proposeBookingSchema = z.object({
  slug: z.string().min(1).max(200),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email().max(300),
  guestPhone: z.string().max(50).optional(),
  title: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  origin: z.string().url().max(300),
});

/**
 * Reçoit la proposition de créneau d'un visiteur externe (aucun compte requis) depuis
 * la page publique /book/$slug. Revalide tout côté serveur (ne fait pas confiance au
 * calcul de créneaux libres fait côté client) pour éviter tout double-booking, puis
 * crée le rendez-vous en statut 'pending' et notifie les deux parties par email.
 */
export const proposeBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => proposeBookingSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin
      .from("booking_settings")
      .select("owner_id, enabled, slot_duration_minutes, min_notice_hours, booking_window_days")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!settings || !settings.enabled) {
      return { success: false as const, reason: "disabled" as const };
    }

    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", settings.owner_id)
      .maybeSingle();

    const BOOKING_TIERS = new Set(["standard", "economic", "business"]);
    if (!ownerProfile?.plan || !BOOKING_TIERS.has(ownerProfile.plan)) {
      return { success: false as const, reason: "disabled" as const };
    }

    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);
    const now = new Date();
    const durationMs = endsAt.getTime() - startsAt.getTime();

    if (durationMs !== settings.slot_duration_minutes * 60_000) {
      return { success: false as const, reason: "invalid_slot" as const };
    }
    if (startsAt.getTime() < now.getTime() + settings.min_notice_hours * 60 * 60_000) {
      return { success: false as const, reason: "invalid_slot" as const };
    }
    if (startsAt.getTime() > now.getTime() + settings.booking_window_days * 24 * 60 * 60_000) {
      return { success: false as const, reason: "invalid_slot" as const };
    }

    const { data: hours } = await supabaseAdmin
      .from("booking_hours")
      .select("weekday, start_time, end_time")
      .eq("owner_id", settings.owner_id)
      .eq("weekday", startsAt.getDay());

    const pad = (n: number) => String(n).padStart(2, "0");
    const startTime = `${pad(startsAt.getHours())}:${pad(startsAt.getMinutes())}:00`;
    const endTime = `${pad(endsAt.getHours())}:${pad(endsAt.getMinutes())}:00`;
    const fitsInHours = (hours ?? []).some(
      (h) => startTime >= h.start_time && endTime <= h.end_time,
    );
    if (!fitsInHours) {
      return { success: false as const, reason: "invalid_slot" as const };
    }

    const { data: overlapping } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("owner_id", settings.owner_id)
      .in("status", ["pending", "accepted"])
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      return { success: false as const, reason: "slot_taken" as const };
    }

    let contactId: string;
    const { data: existingContact } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("owner_id", settings.owner_id)
      .eq("email", data.guestEmail)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await supabaseAdmin
        .from("contacts")
        .insert({
          owner_id: settings.owner_id,
          name: data.guestName,
          email: data.guestEmail,
          phone: data.guestPhone ?? null,
        })
        .select("id")
        .single();
      if (contactError || !newContact) {
        return { success: false as const, reason: "invalid_slot" as const };
      }
      contactId = newContact.id;
    }

    const title = data.title?.trim() || `Rendez-vous avec ${data.guestName}`;
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("appointments")
      .insert({
        owner_id: settings.owner_id,
        contact_id: contactId,
        title,
        description: data.message ?? null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "pending",
        source: "public_booking",
      })
      .select("id")
      .single();

    if (appointmentError || !appointment) {
      if (appointmentError?.message.includes("FREE_PLAN_APPOINTMENT_LIMIT")) {
        return { success: false as const, reason: "plan_limit" as const };
      }
      return { success: false as const, reason: "invalid_slot" as const };
    }

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", settings.owner_id)
      .maybeSingle();
    const hostName = owner?.full_name ?? owner?.email ?? "votre hôte";

    const { sendEmail } = await import("@/lib/resend.server");

    const { subject: guestSubject, html: guestHtml } = buildBookingRequestReceivedEmail({
      guestName: data.guestName,
      hostName,
      appointment: { title, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
    });
    await sendEmail({ to: data.guestEmail, subject: guestSubject, html: guestHtml });

    if (owner?.email) {
      const { subject: ownerSubject, html: ownerHtml } = buildBookingNewRequestEmail({
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone ?? null,
        message: data.message ?? null,
        appointment: { title, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() },
        dashboardLink: `${data.origin.replace(/\/$/, "")}/dashboard`,
      });
      await sendEmail({ to: owner.email, subject: ownerSubject, html: ownerHtml });
    }

    return { success: true as const, appointmentId: appointment.id };
  });

const notifyDecisionSchema = z.object({
  appointmentId: z.string().uuid(),
  origin: z.string().url().max(300),
});

/**
 * Notifie par email le visiteur externe (aucun compte, donc pas de session à utiliser)
 * quand le propriétaire accepte ou refuse une demande reçue via le lien de réservation public.
 */
export const notifyBookingDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => notifyDecisionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("id, title, location, starts_at, ends_at, status, source, contact_id")
      .eq("id", data.appointmentId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (error || !appointment) return { notified: false as const };
    if (appointment.source !== "public_booking") return { notified: false as const };
    if (appointment.status !== "accepted" && appointment.status !== "declined") {
      return { notified: false as const };
    }
    if (!appointment.contact_id) return { notified: false as const };

    const { data: contact } = await supabase
      .from("contacts")
      .select("name, email")
      .eq("id", appointment.contact_id)
      .maybeSingle();
    if (!contact?.email) return { notified: false as const };

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const hostName = profile?.full_name ?? profile?.email ?? "votre hôte";

    const { data: settings } = await supabase
      .from("booking_settings")
      .select("slug")
      .eq("owner_id", userId)
      .maybeSingle();
    const bookingLink = settings?.slug
      ? `${data.origin.replace(/\/$/, "")}/book/${settings.slug}`
      : data.origin;

    const build =
      appointment.status === "accepted" ? buildBookingConfirmedEmail : buildBookingDeclinedEmail;
    const { subject, html } = build({
      guestName: contact.name || "",
      hostName,
      appointment: {
        title: appointment.title,
        location: appointment.location,
        startsAt: appointment.starts_at,
        endsAt: appointment.ends_at,
      },
      bookingLink,
    });

    const { sendEmail } = await import("@/lib/resend.server");
    const result = await sendEmail({ to: contact.email, subject, html });
    return { notified: result.sent };
  });
