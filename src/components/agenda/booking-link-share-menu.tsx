import { useTranslation } from "react-i18next";
import { ChevronDown, Copy, Mail, MessageSquareText, Share2, Twitter } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/share-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  shareByEmail,
  shareBySms,
  shareNatively,
  shareOnTwitter,
  shareOnWhatsApp,
} from "@/lib/share";

/** Menu de partage du lien de réservation public sur toutes les plateformes disponibles. */
export function BookingLinkShareMenu({ url }: { url: string }) {
  const { t } = useTranslation("contacts");
  const payload = { title: t("booking.share.title"), text: t("booking.share.text"), url };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Share2 className="h-4 w-4" />
          {t("booking.share_cta")}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onSelect={() => shareOnWhatsApp(payload)}>
          <WhatsAppIcon /> WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => shareBySms(payload)}>
          <MessageSquareText /> SMS
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => shareByEmail(payload)}>
          <Mail /> Email
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => shareOnTwitter(payload)}>
          <Twitter /> Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void shareNatively(payload).then(async (shared) => {
              if (shared) return;
              await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
              toast.info(t("booking.share.copy_success_toast"));
            });
          }}
        >
          <Share2 /> {t("booking.share.other_apps")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void navigator.clipboard.writeText(url);
            toast.success(t("booking.share.link_copied"));
          }}
        >
          <Copy /> {t("booking.share.copy_link")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
