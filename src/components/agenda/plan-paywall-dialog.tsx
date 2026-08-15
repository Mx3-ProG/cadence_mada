import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tierPricingHash, TIER_LABELS, type PaidPlanTier } from "@/lib/plan";
import { useLocale } from "@/i18n/use-locale";

/** Modale affichée quand une action est tentée sans le palier requis. */
export function PlanPaywallDialog({
  open,
  onOpenChange,
  minTier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  minTier: PaidPlanTier;
}) {
  const locale = useLocale();
  const { t } = useTranslation("app");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center sm:text-center">
          <Lock className="h-5 w-5 text-primary" />
          <DialogTitle>{TIER_LABELS[minTier]}</DialogTitle>
          <DialogDescription>
            {t("locked_feature.reserved_suffix")}
            <strong>{TIER_LABELS[minTier]}</strong>
            {t("locked_feature.reserved_and_above")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full gap-2" onClick={() => onOpenChange(false)}>
            <Link to="/$locale/tarifs" params={{ locale }} hash={tierPricingHash(minTier)}>
              <Sparkles className="h-4 w-4" />
              {t("locked_feature.cta", { tier: TIER_LABELS[minTier] })}
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            <Link to="/$locale/dashboard" params={{ locale }}>
              {t("paywall.back_home")}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
