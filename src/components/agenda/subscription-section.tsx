import { useState } from "react";
import { Crown, FileText, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useBillingPortal, useCancelSubscription, useReactivateSubscription } from "@/lib/billing";
import { usePlanUsage } from "@/lib/plan";
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

const CANCEL_PHRASE = "je me désabonne";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return dateTimeFormatter.format(new Date(iso));
}

export function SubscriptionSection() {
  const planQuery = usePlanUsage();
  const cancel = useCancelSubscription();
  const reactivate = useReactivateSubscription();
  const portal = useBillingPortal();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [endsAt, setEndsAt] = useState<string | null>(null);

  const data = planQuery.data;
  if (!data || data.plan !== "pro") return null;

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
          ? `Abonnement résilié. Le plan Pro reste actif jusqu'au ${when}.`
          : "Abonnement résilié à la fin de la période en cours.",
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
          <Crown className="h-4 w-4 text-amber-600" /> Ton abonnement Pro se termine bientôt
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu profites encore de tous les avantages Pro (contacts et rendez-vous illimités, avis
          Google, branding) jusqu'au{" "}
          <strong className="text-foreground">{endLabel ?? "prochain renouvellement"}</strong>.
          Passé ce délai, ton compte repasse automatiquement en plan Gratuit et un nouvel abonnement
          coûtera de nouveau 10&nbsp;€/mois.
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
            Rester en Pro
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
            Revoir ma facturation
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="abonnement"
      className="scroll-mt-24 glass-panel rounded-2xl border border-primary/30 p-5"
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Crown className="h-4 w-4 text-primary" /> Abonnement
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Tu es sur le plan <strong className="text-foreground">Pro</strong> : contacts et rendez-vous
        illimités, avis Google et branding sur tes invitations.
        {renewsAt && (
          <>
            {" "}
            Prochain renouvellement le <strong className="text-foreground">{renewsAt}</strong>.
          </>
        )}
      </p>

      {endsAt && (
        <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm">
          Ton abonnement prendra fin le <strong>{formatDateTime(endsAt)}</strong>. Tu gardes le plan
          Pro jusque-là.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button className="gap-2" disabled>
          <ShieldCheck className="h-4 w-4" /> Tu es déjà en Pro — merci de ta confiance
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
          Revoir ma facturation
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
              Se désabonner
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Résilier ton abonnement Pro ?</AlertDialogTitle>
              <AlertDialogDescription>
                Tu perdras les contacts et rendez-vous illimités, les avis Google et le branding
                {renewsAt ? (
                  <>
                    {" "}
                    à la fin de la période déjà payée, le{" "}
                    <strong className="text-foreground">{renewsAt}</strong>. Jusque-là, ton plan Pro
                    reste actif.
                  </>
                ) : (
                  <> à la fin de la période déjà payée.</>
                )}{" "}
                Si tu te réabonnes ensuite, le paiement de 10&nbsp;€/mois repart de zéro. Pour
                confirmer, écris <strong>{CANCEL_PHRASE}</strong> ci-dessous.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={confirmText}
              placeholder={CANCEL_PHRASE}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>
                Rester en Pro
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText.trim().toLowerCase() !== CANCEL_PHRASE || cancel.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  void handleCancel();
                }}
              >
                {cancel.isPending ? "Résiliation…" : "Confirmer la résiliation"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
