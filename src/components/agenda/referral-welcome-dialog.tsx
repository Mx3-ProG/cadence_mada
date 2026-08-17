import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReferralSummary, referralLink } from "@/lib/referral";
import { useLocale } from "@/i18n/use-locale";

export function ReferralWelcomeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const locale = useLocale();
  const { t } = useTranslation("dashboard");
  const summaryQuery = useReferralSummary();
  const summary = summaryQuery.data;
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(referralLink(summary.referralCode, locale));
    setCopied(true);
    toast.success(t("referral_welcome.copied_toast"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            {t("referral_welcome.title")}
          </DialogTitle>
          <DialogDescription>{t("referral_welcome.description")}</DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={referralLink(summary.referralCode, locale)}
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              className="shrink-0 gap-2"
              onClick={() => void copyLink()}
              disabled={!summary}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("referral_welcome.copied") : t("referral_welcome.copy")}
            </Button>
          </div>
        )}

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("referral_welcome.later")}
          </Button>
          <Button asChild onClick={() => onOpenChange(false)}>
            <Link to="/$locale/settings" params={{ locale }} hash="settings-referral">
              {t("referral_welcome.cta")}
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
