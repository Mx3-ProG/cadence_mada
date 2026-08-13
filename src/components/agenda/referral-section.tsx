import { useState } from "react";
import { Check, Copy, Gift, Loader2, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ReferralTierGauge } from "@/components/agenda/referral-tier-gauge";
import {
  useReferralSummary,
  useMyReferrals,
  useRequestPayout,
  referralPayoutErrorMessage,
  referralLink,
  formatCents,
  REFERRAL_COUNT_BOUNDARIES,
  REFERRAL_COUNT_LABELS,
  REFERRAL_MONEY_BOUNDARIES_CENTS,
  REFERRAL_MONEY_LABELS,
  REFERRAL_PAYOUT_MIN_CENTS,
} from "@/lib/referral";

export function ReferralSection() {
  const summaryQuery = useReferralSummary();
  const referralsQuery = useMyReferrals();
  const requestPayout = useRequestPayout();
  const [copied, setCopied] = useState(false);

  const summary = summaryQuery.data;
  const referrals = referralsQuery.data ?? [];

  const copyLink = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(referralLink(summary.referralCode));
    setCopied(true);
    toast.success("Lien de parrainage copié");
    setTimeout(() => setCopied(false), 2000);
  };

  const withdraw = () => {
    requestPayout.mutate(undefined, {
      onSuccess: () => toast.success("Demande de retrait envoyée."),
      onError: (error) => toast.error(referralPayoutErrorMessage(error)),
    });
  };

  if (summaryQuery.isLoading || !summary) {
    return (
      <section className="glass-panel rounded-2xl p-5">
        <p className="text-sm text-muted-foreground">Chargement du parrainage…</p>
      </section>
    );
  }

  const canWithdraw =
    summary.balanceCents >= REFERRAL_PAYOUT_MIN_CENTS && !summary.hasPendingPayout;

  return (
    <section className="glass-panel rounded-2xl p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <Gift className="h-4 w-4 text-primary" /> Parrainage
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Partage ton lien : 1€ par mois pour chaque filleul abonné Pro, tant qu'il reste abonné.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={referralLink(summary.referralCode)} className="font-mono text-xs" />
        <Button variant="outline" className="shrink-0 gap-2" onClick={() => void copyLink()}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copié" : "Copier"}
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ReferralTierGauge
          icon={<Users className="h-4 w-4 text-primary" />}
          title="Filleuls"
          value={summary.totalReferrals}
          boundaries={REFERRAL_COUNT_BOUNDARIES}
          labels={REFERRAL_COUNT_LABELS}
          formatValue={(v) => `${v}`}
        />
        <ReferralTierGauge
          icon={<Wallet className="h-4 w-4 text-primary" />}
          title="Revenus (filleuls Pro)"
          value={summary.balanceCents}
          boundaries={REFERRAL_MONEY_BOUNDARIES_CENTS}
          labels={REFERRAL_MONEY_LABELS}
          formatValue={formatCents}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-border/70 p-4">
        <p className="text-sm font-medium">Mes filleuls</p>
        {referrals.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Personne pour l'instant — partage ton lien pour commencer.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-surface/70 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Filleul</th>
                  <th className="px-3 py-2 text-left font-medium">Plan</th>
                  <th className="px-3 py-2 text-left font-medium">RDV ce mois-ci</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-2">{r.displayName}</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.plan === "pro" ? "default" : "secondary"}>
                        {r.plan === "pro" ? "Pro" : "Gratuit"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{r.appointmentsThisMonth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Solde disponible</p>
          <p className="font-display text-xl font-bold tracking-tight">
            {formatCents(summary.balanceCents)}
          </p>
          <p className="text-xs text-muted-foreground">
            Retrait possible à partir de {formatCents(REFERRAL_PAYOUT_MIN_CENTS)}.
          </p>
        </div>
        <Button
          disabled={!canWithdraw || requestPayout.isPending}
          onClick={withdraw}
          className="gap-2 sm:shrink-0"
        >
          {requestPayout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {summary.hasPendingPayout ? "Demande en cours" : "Demander mon retrait"}
        </Button>
      </div>
    </section>
  );
}
