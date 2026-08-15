import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useDateFnsLocale, type DateFnsLocale } from "@/i18n/date-fns-locales";
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

function targetsFor(appointment: Appointment, defaultGuestName: string): ShareTarget[] {
  const invitations = appointment.invitations ?? [];
  if (invitations.length) {
    return invitations.map((invitation) => ({
      name: invitation.contact?.name ?? defaultGuestName,
      token: invitation.invite_token,
    }));
  }
  return [{ name: defaultGuestName, token: appointment.invite_token }];
}

function payloadFor(
  appointment: Appointment,
  target: ShareTarget,
  dateFnsLocale: DateFnsLocale,
  t: TFunction<"agenda">,
): SharePayload {
  const date = format(new Date(appointment.starts_at), "EEEE d MMMM 'à' HH:mm", {
    locale: dateFnsLocale,
  });
  return {
    title: t("share.invite_title", { title: appointment.title }),
    text: t("share.invite_text", { name: target.name, title: appointment.title, date }),
    url: `${window.location.origin}/invite/${target.token}`,
  };
}

function ShareChannels({ appointment, target }: { appointment: Appointment; target: ShareTarget }) {
  const dateFnsLocale = useDateFnsLocale();
  const { t } = useTranslation("agenda");
  const payload = () => payloadFor(appointment, target, dateFnsLocale, t);

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
            toast.info(t("share.copy_success_toast"));
          });
        }}
      >
        <Share2 /> {t("share.other_apps")}
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          void navigator.clipboard.writeText(payload().url);
          toast.success(t("share.link_copied", { name: target.name }));
        }}
      >
        <Copy /> {t("share.copy_link")}
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
  const { t } = useTranslation("agenda");
  const targets = targetsFor(appointment, t("share.default_guest_name"));
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
          {t("share.invite_button")}
          <ChevronDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuItem onSelect={() => onEmail(appointment)}>
          <Mail /> {multiple ? t("share.email_multiple") : t("share.email_single")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {multiple ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("share.share_with_guest")}
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
