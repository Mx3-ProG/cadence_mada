import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  appointmentId: z.string().uuid(),
  origin: z.string().url().max(300),
});

function formatRange(startsAt: string, endsAt: string) {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const end = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${fmt.format(new Date(startsAt))} → ${end.format(new Date(endsAt))}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Envoie l'invitation par email via Resend.
 * Renseigne RESEND_API_KEY (et RESEND_FROM) dans les variables d'environnement.
 */
export const sendInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
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

    const apiKey = process.env["RESEND_API_KEY"];
    const from = process.env["RESEND_FROM"] ?? "Cadence <onboarding@resend.dev>";
    const link = `${data.origin.replace(/\/$/, "")}/invite/${appointment.invite_token}`;

    if (!apiKey) {
      return { sent: false as const, reason: "no_api_key" as const, link };
    }

    const brandBlock =
      isPro && profile?.invite_message
        ? `<p style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #10B981;background:#F3FBF7">${escapeHtml(profile.invite_message)}</p>`
        : "";

    const reviewBlock =
      isPro &&
      profile?.review_prompt_enabled &&
      (profile.google_review_url || profile.google_maps_url)
        ? `<div style="margin-top:28px;padding:16px;border:1px solid #E3E8E6;border-radius:12px">
            <p style="margin:0 0 8px;font-weight:600">${escapeHtml(profile.business_name ?? "Avis Google")}</p>
            ${
              profile.google_rating != null
                ? `<p style="margin:0 0 12px;color:#5A6B65">${Number(profile.google_rating).toFixed(1)}/5 ★${
                    profile.google_reviews_count != null
                      ? ` · ${profile.google_reviews_count} avis`
                      : ""
                  }</p>`
                : ""
            }
            ${
              profile.google_review_url
                ? `<p style="margin:0 0 8px"><a href="${escapeHtml(profile.google_review_url)}" style="color:#0B7A5A;font-weight:600">Laisser un avis Google</a></p>`
                : ""
            }
            ${
              profile.google_maps_url
                ? `<p style="margin:0"><a href="${escapeHtml(profile.google_maps_url)}" style="color:#0B7A5A">Voir sur Google Maps</a></p>`
                : ""
            }
          </div>`
        : "";

    const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;background:#ffffff;padding:24px;color:#0A0F0D">
        <h2 style="margin:0 0 8px">Proposition de rendez-vous</h2>
        <p style="margin:0 0 16px">Bonjour ${escapeHtml(guestName || "")},</p>
        ${brandBlock}
        <p style="margin:0 0 8px"><strong>${escapeHtml(appointment.title)}</strong></p>
        <p style="margin:0 0 8px">${escapeHtml(formatRange(appointment.starts_at, appointment.ends_at))}</p>
        ${appointment.location ? `<p style="margin:0 0 8px">Lieu : ${escapeHtml(appointment.location)}</p>` : ""}
        ${appointment.description ? `<p style="margin:0 0 16px">${escapeHtml(appointment.description)}</p>` : ""}
        <p style="margin:24px 0">
          <a href="${link}" style="background:#10B981;color:#06231b;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">
            Confirmer ou refuser
          </a>
        </p>
        <p style="margin:0;font-size:12px;color:#667">${link}</p>
        ${reviewBlock}
      </div>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [guestEmail],
        subject: `Rendez-vous : ${appointment.title}`,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[resend] send failed", response.status, detail);
      return { sent: false as const, reason: "provider_error" as const };
    }

    await supabase
      .from("appointments")
      .update({ invite_sent_at: new Date().toISOString() })
      .eq("id", appointment.id);

    return { sent: true as const, to: guestEmail };
  });
