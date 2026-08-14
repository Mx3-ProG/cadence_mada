import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, Copy, Mail, MessageSquareText, Share2, User } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/share-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Appointment } from "@/lib/agenda";
import { shareBySms, shareNatively, shareOnWhatsApp, type SharePayload } from "@/lib/share";

type ShareTarget = { name: string; token: string };

function targetsFor(appointment: Appointment): ShareTarget[] {
  const invitations = appointment.invitations ?? [];
  if (invitations.length) {
    return invitations.map((invitation) => ({
      name: invitation.contact?.name ?? "Invité",
      token: invitation.invite_token,
    }));
  }
  return [{ name: "Invité", token: appointment.invite_token }];
}

function payloadFor(appointment: Appointment, target: ShareTarget): SharePayload {
  const date = format(new Date(appointment.starts_at), "EEEE d MMMM 'à' HH:mm", { locale: fr });
  return {
    title: `Invitation : ${appointment.title}`,
    text: `Bonjour ${target.name}, tu es invité(e) au rendez-vous « ${appointment.title} » le ${date}. Confirme ta présence ici :`,
    url: `${window.location.origin}/invite/${target.token}`,
  };
}

function ShareChannels({ appointment, target }: { appointment: Appointment; target: ShareTarget }) {
  const payload = () => payloadFor(appointment, target);

  return (
    <>
      <DropdownMenuItem onSelect={() => shareOnWhatsApp(payload())}>
        <WhatsAppIcon /> WhatsApp
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => shareBySms(payload())}>
        <MessageSquareText /> SMS
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          void shareNatively(payload()).then(async (shared) => {
            if (shared) return;
            await navigator.clipboard.writeText(`${payload().text}\n${payload().url}`);
            toast.info("Partage non disponible — invitation copiée.");
          });
        }}
      >
        <Share2 /> Autres applications…
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          void navigator.clipboard.writeText(payload().url);
          toast.success(`Lien pour ${target.name} copié`);
        }}
      >
        <Copy /> Copier le lien
      </DropdownMenuItem>
    </>
  );
}

export function AppointmentShareMenu({
  appointment,
  onEmail,
  compact = false,
}: {
  appointment: Appointment;
  onEmail: (appointment: Appointment) => void;
  compact?: boolean;
}) {
  const targets = targetsFor(appointment);
  const multiple = targets.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "ghost" : "secondary"}
          size="sm"
          className={compact ? "h-7 gap-1 px-2 text-xs" : "gap-1.5"}
        >
          <Share2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Inviter
          <ChevronDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuItem onSelect={() => onEmail(appointment)}>
          <Mail /> {multiple ? "Envoyer les emails" : "Envoyer par email"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {multiple ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Partager avec un invité
            </DropdownMenuLabel>
            {targets.map((target) => (
              <DropdownMenuSub key={target.token}>
                <DropdownMenuSubTrigger>
                  <User /> <span className="truncate">{target.name}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  <ShareChannels appointment={appointment} target={target} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </>
        ) : (
          <ShareChannels appointment={appointment} target={targets[0]!} />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
