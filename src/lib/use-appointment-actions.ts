import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendInviteEmail } from "@/lib/invites.functions";
import { notifyBookingDecision } from "@/lib/booking.functions";
import type { Appointment } from "@/lib/agenda";

/**
 * Actions communes sur un rendez-vous (copier le lien de confirmation, envoyer l'email
 * d'invitation, accepter/refuser, supprimer), partagées entre le dashboard et la page agenda.
 */
export function useAppointmentActions(refresh: () => void) {
  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Lien de confirmation copié");
  };

  const email = async (appointment: Appointment) => {
    const result = await sendInviteEmail({
      data: { appointmentId: appointment.id, origin: window.location.origin },
    });
    if (result.sent) {
      toast.success(`Invitation envoyée à ${result.to}`);
      refresh();
      return;
    }
    if (result.reason === "no_email") {
      toast.error("Ce contact n'a pas d'adresse email.");
      return;
    }
    if (result.reason === "no_api_key") {
      await navigator.clipboard.writeText(result.link);
      toast.info("Clé Resend absente — lien copié, envoie-le manuellement.");
      return;
    }
    toast.error("L'envoi a échoué, réessaie.");
  };

  const decide = async (appointment: Appointment, accept: boolean) => {
    const { error } = await supabase
      .from("appointments")
      .update({
        status: accept ? "accepted" : "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", appointment.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(accept ? "Rendez-vous accepté" : "Demande refusée");
    refresh();
    if (appointment.source === "public_booking") {
      notifyBookingDecision({
        data: { appointmentId: appointment.id, origin: window.location.origin },
      }).catch(() => {
        // Le visiteur peut ne pas être notifié tout de suite, ce n'est pas bloquant.
      });
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rendez-vous supprimé");
    refresh();
  };

  return { copyLink, email, decide, remove };
}
