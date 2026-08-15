// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildInviteReminderEmail } from "../../emails/invite-reminder.ts";
import { buildAppointmentReminderEmail } from "../../emails/appointment-reminder.ts";
import { buildOwnerDailySummaryEmail } from "../../emails/owner-daily-summary.ts";
import {
  antananarivoClock,
  isPendingInviteDue,
  isUpcomingAppointmentDue,
  reminderDedupeKey,
} from "./scheduling.ts";

type Appointment = {
  id: string;
  owner_id: string;
  contact_id: string | null;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  source: string;
};

type Invitation = {
  id: string;
  appointment_id: string;
  contact_id: string;
  invite_token: string;
  invite_sent_at: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled";
};

type Contact = { id: string; name: string; email: string | null };
type Owner = { id: string; full_name: string | null; email: string | null };

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
const from = Deno.env.get("RESEND_FROM") ?? "Cadence Mada <rdv@cadencemada.com>";
const appUrl = (Deno.env.get("APP_URL") ?? "https://www.cadencemada.com").replace(/\/$/, "");
const cronSecret = Deno.env.get("REMINDER_CRON_SECRET") ?? "";

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function claimDelivery(input: {
  dedupeKey: string;
  kind: "pending_invite_reminder" | "upcoming_appointment_reminder" | "owner_daily_summary";
  ownerId: string;
  scheduledFor: string;
  appointmentId?: string;
  invitationId?: string;
  contactId?: string;
}) {
  const row = {
    dedupe_key: input.dedupeKey,
    kind: input.kind,
    owner_id: input.ownerId,
    scheduled_for: input.scheduledFor,
    appointment_id: input.appointmentId ?? null,
    appointment_invite_id: input.invitationId ?? null,
    contact_id: input.contactId ?? null,
    status: "processing",
  };
  const inserted = await db.from("email_deliveries").insert(row).select("id, attempts").single();
  if (!inserted.error && inserted.data) return inserted.data as { id: string; attempts: number };

  const { data: existing } = await db
    .from("email_deliveries")
    .select("id, attempts, status, updated_at")
    .eq("dedupe_key", input.dedupeKey)
    .maybeSingle();
  if (!existing || existing.status === "sent" || existing.status === "skipped") return null;
  if (existing.attempts >= 3) return null;
  if (
    existing.status === "processing" &&
    Date.now() - new Date(existing.updated_at).getTime() < 15 * 60 * 1000
  ) {
    return null;
  }

  const attempts = existing.attempts + 1;
  const { data: retried } = await db
    .from("email_deliveries")
    .update({ status: "processing", attempts, last_error: null })
    .eq("id", existing.id)
    .select("id, attempts")
    .single();
  return retried as { id: string; attempts: number } | null;
}

async function sendTrackedEmail({
  deliveryId,
  idempotencyKey,
  to,
  subject,
  html,
}: {
  deliveryId: string;
  idempotencyKey: string;
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) throw new Error(payload.message ?? `RESEND_${response.status}`);
    await db
      .from("email_deliveries")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: payload.id ?? null,
        last_error: null,
      })
      .eq("id", deliveryId);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "UNKNOWN_ERROR";
    await db
      .from("email_deliveries")
      .update({ status: "failed", last_error: message })
      .eq("id", deliveryId);
    return false;
  }
}

Deno.serve(async (request) => {
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!supabaseUrl || !serviceRoleKey || !resendKey) {
    return Response.json({ error: "Missing reminder configuration" }, { status: 500 });
  }

  const now = new Date();
  const { data: ownersData, error: ownersError } = await db
    .from("profiles")
    .select("id, full_name, email")
    .eq("automatic_reminders_enabled", true);
  if (ownersError) return Response.json({ error: ownersError.message }, { status: 500 });
  const owners = (ownersData ?? []) as Owner[];
  const ownerMap = new Map(owners.map((owner) => [owner.id, owner]));
  if (!owners.length) return Response.json({ sent: 0 });

  const { data: appointmentsData, error: appointmentsError } = await db
    .from("appointments")
    .select("id, owner_id, contact_id, title, location, starts_at, ends_at, status, source")
    .in(
      "owner_id",
      owners.map((owner) => owner.id),
    )
    .in("status", ["pending", "accepted"])
    .gt("starts_at", now.toISOString());
  if (appointmentsError)
    return Response.json({ error: appointmentsError.message }, { status: 500 });
  const appointments = (appointmentsData ?? []) as Appointment[];
  const appointmentMap = new Map(appointments.map((appointment) => [appointment.id, appointment]));

  const appointmentIds = appointments.map((appointment) => appointment.id);
  const { data: invitesData } = appointmentIds.length
    ? await db
        .from("appointment_invites")
        .select("id, appointment_id, contact_id, invite_token, invite_sent_at, status")
        .in("appointment_id", appointmentIds)
    : { data: [] };
  const invites = (invitesData ?? []) as Invitation[];

  const contactIds = [
    ...new Set([
      ...appointments.flatMap((appointment) =>
        appointment.contact_id ? [appointment.contact_id] : [],
      ),
      ...invites.map((invite) => invite.contact_id),
    ]),
  ];
  const { data: contactsData } = contactIds.length
    ? await db.from("contacts").select("id, name, email").in("id", contactIds)
    : { data: [] };
  const contactMap = new Map(
    ((contactsData ?? []) as Contact[]).map((contact) => [contact.id, contact]),
  );

  let sent = 0;
  for (const invite of invites) {
    const appointment = appointmentMap.get(invite.appointment_id);
    const owner = appointment ? ownerMap.get(appointment.owner_id) : null;
    const contact = contactMap.get(invite.contact_id);
    if (!appointment || !owner || !contact?.email || !invite.invite_sent_at) continue;

    const appointmentInput = {
      title: appointment.title,
      location: appointment.location,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
    };
    const link = `${appUrl}/invite/${invite.invite_token}`;

    if (
      invite.status === "pending" &&
      isPendingInviteDue(invite.invite_sent_at, appointment.starts_at, now)
    ) {
      const key = reminderDedupeKey("pending", invite.id, invite.invite_sent_at);
      const delivery = await claimDelivery({
        dedupeKey: key,
        kind: "pending_invite_reminder",
        ownerId: appointment.owner_id,
        appointmentId: appointment.id,
        invitationId: invite.id,
        contactId: contact.id,
        scheduledFor: new Date(
          new Date(invite.invite_sent_at).getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
      if (delivery) {
        const email = buildInviteReminderEmail({
          guestName: contact.name,
          hostName: owner.full_name ?? "votre hôte",
          appointment: appointmentInput,
          link,
        });
        if (
          await sendTrackedEmail({
            deliveryId: delivery.id,
            idempotencyKey: key,
            to: contact.email,
            ...email,
          })
        )
          sent++;
      }
    }

    if (invite.status === "accepted" && isUpcomingAppointmentDue(appointment.starts_at, now)) {
      const key = reminderDedupeKey("upcoming", invite.id, appointment.starts_at);
      const delivery = await claimDelivery({
        dedupeKey: key,
        kind: "upcoming_appointment_reminder",
        ownerId: appointment.owner_id,
        appointmentId: appointment.id,
        invitationId: invite.id,
        contactId: contact.id,
        scheduledFor: new Date(
          new Date(appointment.starts_at).getTime() - 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
      if (delivery) {
        const email = buildAppointmentReminderEmail({
          guestName: contact.name,
          hostName: owner.full_name ?? "votre hôte",
          appointment: appointmentInput,
          link,
        });
        if (
          await sendTrackedEmail({
            deliveryId: delivery.id,
            idempotencyKey: key,
            to: contact.email,
            ...email,
          })
        )
          sent++;
      }
    }
  }

  const clock = antananarivoClock(now);
  if (clock.hour >= 8 && clock.hour <= 10) {
    for (const owner of owners) {
      if (!owner.email) continue;
      const ownerAppointments = appointments.filter(
        (appointment) => appointment.owner_id === owner.id,
      );
      const pending: Array<{ title: string; guestName: string; startsAt: string; endsAt: string }> =
        [];
      const upcoming: Array<{
        title: string;
        guestName: string;
        startsAt: string;
        endsAt: string;
      }> = [];

      for (const appointment of ownerAppointments) {
        const appointmentInvites = invites.filter(
          (invite) => invite.appointment_id === appointment.id,
        );
        if (appointment.status === "pending") {
          if (appointment.source === "public_booking" && appointment.contact_id) {
            const contact = contactMap.get(appointment.contact_id);
            pending.push({
              title: appointment.title,
              guestName: contact?.name ?? "Visiteur",
              startsAt: appointment.starts_at,
              endsAt: appointment.ends_at,
            });
          } else {
            for (const invite of appointmentInvites.filter((item) => item.status === "pending")) {
              pending.push({
                title: appointment.title,
                guestName: contactMap.get(invite.contact_id)?.name ?? "Invité",
                startsAt: appointment.starts_at,
                endsAt: appointment.ends_at,
              });
            }
          }
        }
        if (isUpcomingAppointmentDue(appointment.starts_at, now)) {
          for (const invite of appointmentInvites.filter((item) => item.status === "accepted")) {
            upcoming.push({
              title: appointment.title,
              guestName: contactMap.get(invite.contact_id)?.name ?? "Invité",
              startsAt: appointment.starts_at,
              endsAt: appointment.ends_at,
            });
          }
        }
      }

      if (!pending.length && !upcoming.length) continue;
      const key = reminderDedupeKey("summary", owner.id, clock.date);
      const delivery = await claimDelivery({
        dedupeKey: key,
        kind: "owner_daily_summary",
        ownerId: owner.id,
        scheduledFor: now.toISOString(),
      });
      if (!delivery) continue;
      const email = buildOwnerDailySummaryEmail({
        ownerName: owner.full_name ?? "",
        pending,
        upcoming,
        dashboardLink: `${appUrl}/fr/dashboard`,
      });
      if (
        await sendTrackedEmail({
          deliveryId: delivery.id,
          idempotencyKey: key,
          to: owner.email,
          ...email,
        })
      )
        sent++;
    }
  }

  return Response.json({ sent, checked_at: now.toISOString() });
});
