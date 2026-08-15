import { useState } from "react";
import { Crown, FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useBillingPortal, useCancelSubscription, useReactivateSubscription } from "@/lib/billing";
import { TIER_LABELS, TIER_PRICES, usePlanUsage } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDateTime as formatDateTimeLocalized } from "@/lib/format";
import { useLocale } from "@/i18n/use-locale";

export function SubscriptionSection() {
  const locale = useLocale();
  const { t } = useTranslation("settings");
  const CANCEL_PHRASE = t("subscription.cancel_dialog.cancel_phrase");
  const formatDateTime = (iso: string | null) => formatDateTimeLocalized(iso, locale);
  const planQuery = usePlanUsage();
  const cancel = useCancelSubscription();
  const reactivate = useReactivateSubscription();
  const portal = useBillingPortal();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [endsAt, setEndsAt] = useState<string | null>(null);

  const data = planQuery.data;
  if (!data || data.plan === "free") return null;

  const planLabel = TIER_LABELS[data.plan];
  const planPrice = TIER_PRICES[data.plan];
  const renewsAt = formatDateTime(data.planRenewsAt);

  const handleCancel = async () => {
    try {
      const result = await cancel.mutateAsync(confirmText);
      const iso = result.cancelAt ? new Date(result.cancelAt * 1000).toISOString() : null;
      setEndsAt(iso);
      setConfirmText("");
      setOpen(false);
      const when = formatDateTime(iso);
      toast.success(
        when
          ? t("subscription.success.cancelled_with_date", { plan: planLabel, date: when })
          : t("subscription.success.cancelled_generic"),
      );
    } catch {
      // erreur déjà affichée par le hook
    }
  };

  if (data.cancelAtPeriodEnd) {
    const endLabel = formatDateTime(data.planRenewsAt) ?? renewsAt;
    return (
      <section
        id="abonnement"
        className="scroll-mt-24 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5"
      >
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Crown className="h-4 w-4 text-amber-600" />
          {t("subscription.ending_soon.title", { plan: planLabel })}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("subscription.ending_soon.body_prefix", { plan: planLabel })}
          <strong className="text-foreground">
            {endLabel ?? t("subscription.ending_soon.end_label_fallback")}
          </strong>
          {t("subscription.ending_soon.body_suffix", {
            freePlan: TIER_LABELS.free,
            price: planPrice,
          })}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={reactivate.isPending}
            onClick={() => reactivate.mutate()}
            className="gap-2"
          >
            {reactivate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {t("subscription.ending_soon.stay_cta", { plan: planLabel })}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground"
            disabled={portal.isPending}
            onClick={() => portal.mutate()}
          >
            {portal.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            {t("subscription.billing_cta")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="abonnement"
      className="scroll-mt-24 glass-panel min-w-0 overflow-hidden rounded-2xl border border-primary/30 p-4 sm:p-5"
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Crown className="h-4 w-4 text-primary" /> {t("subscription.active.title")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("subscription.active.body_prefix")}
        <strong className="text-foreground">{planLabel}</strong>
        {t("subscription.active.body_middle", { price: planPrice })}
        {renewsAt && (
          <>
            {t("subscription.active.renews_prefix")}
            <strong className="text-foreground">{renewsAt}</strong>
            {t("subscription.active.renews_suffix")}
          </>
        )}
      </p>

      {endsAt && (
        <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
          {t("subscription.active.ending_notice_prefix")}
          <strong>{formatDateTime(endsAt)}</strong>
          {t("subscription.active.ending_notice_suffix", { plan: planLabel })}
        </p>
      )}

      <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
        <Button
          className="h-auto w-full min-w-0 gap-2 whitespace-normal py-2.5 text-center leading-snug sm:w-auto"
          disabled
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>{t("subscription.active.already_on_plan", { plan: planLabel })}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          disabled={portal.isPending}
          onClick={() => portal.mutate()}
        >
          {portal.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
          {t("subscription.billing_cta")}
        </Button>
      </div>

      <div className="mt-5 border-t border-border/60 pt-4">
        <AlertDialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setConfirmText("");
          }}
        >
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
            >
              {t("subscription.active.unsubscribe_link")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("subscription.cancel_dialog.title", { plan: planLabel })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("subscription.cancel_dialog.body_lose_prefix")}
                <strong className="text-foreground">{planLabel}</strong>
                {renewsAt ? (
                  <>
                    {t("subscription.cancel_dialog.body_with_renewal_middle")}
                    <strong className="text-foreground">{renewsAt}</strong>
                    {t("subscription.cancel_dialog.body_with_renewal_suffix", { plan: planLabel })}
                  </>
                ) : (
                  t("subscription.cancel_dialog.body_without_renewal")
                )}
                {t("subscription.cancel_dialog.body_tail_prefix", { price: planPrice })}
                <strong>{CANCEL_PHRASE}</strong>
                {t("subscription.cancel_dialog.body_tail_suffix")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={confirmText}
              placeholder={CANCEL_PHRASE}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>
                {t("subscription.cancel_dialog.stay_cta", { plan: planLabel })}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText.trim().toLowerCase() !== CANCEL_PHRASE || cancel.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  void handleCancel();
                }}
              >
                {cancel.isPending
                  ? t("subscription.cancel_dialog.cancelling")
                  : t("subscription.cancel_dialog.confirm_cta")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
