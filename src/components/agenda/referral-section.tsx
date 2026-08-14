import { useState } from "react";
import {
  Check,
  Copy,
  Facebook,
  Gift,
  Instagram,
  Linkedin,
  Loader2,
  Send,
  Twitter,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ReferralTierGauge } from "@/components/agenda/referral-tier-gauge";
import {
  useReferralSummary,
  useMyReferrals,
  useRequestPayout,
  useSendReferralInvite,
  referralPayoutErrorMessage,
  referralLink,
  formatCents,
  REFERRAL_COUNT_BOUNDARIES,
  REFERRAL_COUNT_LABELS,
  REFERRAL_MONEY_BOUNDARIES_CENTS,
  REFERRAL_MONEY_LABELS,
  REFERRAL_PAYOUT_MIN_CENTS,
} from "@/lib/referral";
import { hasTierAtLeast, TIER_LABELS } from "@/lib/plan";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.45.87-.61 1.26a18.3 18.3 0 0 0-5.48 0 12.6 12.6 0 0 0-.62-1.26.08.08 0 0 0-.08-.04c-1.7.29-3.34.8-4.89 1.52a.07.07 0 0 0-.03.03C.53 8.09-.32 11.7.1 15.26a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.28a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01c.12.1.24.19.37.28a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.78 1.37 1.23 2a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-4.13-.62-7.7-2.65-10.86a.06.06 0 0 0-.03-.03ZM8.02 13.65c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.17 1.1 2.15 2.42 0 1.34-.95 2.42-2.15 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.17 1.1 2.15 2.42 0 1.34-.94 2.42-2.15 2.42Z" />
    </svg>
  );
}

export function ReferralSection() {
  const summaryQuery = useReferralSummary();
  const referralsQuery = useMyReferrals();
  const requestPayout = useRequestPayout();
  const sendInvite = useSendReferralInvite();
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const summary = summaryQuery.data;
  const referrals = referralsQuery.data ?? [];

  const copyLink = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(referralLink(summary.referralCode));
    setCopied(true);
    toast.success("Lien de parrainage copié");
    setTimeout(() => setCopied(false), 2000);
  };

  const submitInvite = () => {
    const email = inviteEmail.trim();
    if (!email || sendInvite.isPending) return;
    sendInvite.mutate(email, {
      onSuccess: (result) => {
        if (result.sent) {
          toast.success(`Invitation envoyée à ${result.to}`);
          setInviteEmail("");
        } else if (result.reason === "already_member") {
          toast.error("Cette personne a déjà un compte Cadence.");
        } else {
          toast.error("L'invitation n'a pas pu être envoyée. Réessaie dans un instant.");
        }
      },
      onError: () => toast.error("L'invitation n'a pas pu être envoyée. Réessaie dans un instant."),
    });
  };

  const shareViaClipboard = async (network: string) => {
    if (!summary) return;
    await navigator.clipboard.writeText(referralLink(summary.referralCode));
    toast.success(`Lien copié — colle-le dans ${network}`);
  };

  const shareText = "Cadence, l'agenda de rendez-vous qui se confirme tout seul";

  const socialTargets = summary
    ? [
        {
          name: "Facebook",
          icon: Facebook,
          onClick: () =>
            window.open(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink(summary.referralCode))}`,
              "_blank",
              "noopener,noreferrer",
            ),
        },
        {
          name: "Twitter",
          icon: Twitter,
          onClick: () =>
            window.open(
              `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink(summary.referralCode))}&text=${encodeURIComponent(shareText)}`,
              "_blank",
              "noopener,noreferrer",
            ),
        },
        {
          name: "LinkedIn",
          icon: Linkedin,
          onClick: () =>
            window.open(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink(summary.referralCode))}`,
              "_blank",
              "noopener,noreferrer",
            ),
        },
        {
          name: "Instagram",
          icon: Instagram,
          onClick: () => void shareViaClipboard("ta story ou ta bio Instagram"),
        },
        {
          name: "Discord",
          icon: DiscordIcon,
          onClick: () => void shareViaClipboard("ton serveur Discord"),
        },
      ]
    : [];

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
        Partage ton lien : 30 % de ce que paie chaque filleul, chaque mois, tant qu'il reste abonné.
        Ton filleul apparaît aussi dans tes contacts, et toi dans les siens — vous pouvez vous fixer
        un rendez-vous quand vous voulez.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={referralLink(summary.referralCode)} className="font-mono text-xs" />
        <Button variant="outline" className="shrink-0 gap-2" onClick={() => void copyLink()}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copié" : "Copier"}
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          placeholder="email@exemple.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitInvite();
          }}
          className="text-sm"
        />
        <Button
          className="shrink-0 gap-2"
          disabled={!inviteEmail.trim() || sendInvite.isPending}
          onClick={submitInvite}
        >
          {sendInvite.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Inviter par email
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Ou partage sur :</span>
        {socialTargets.map((social) => (
          <Button
            key={social.name}
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label={`Partager sur ${social.name}`}
            title={`Partager sur ${social.name}`}
            onClick={social.onClick}
          >
            <social.icon className="h-4 w-4" />
          </Button>
        ))}
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
          title="Revenus (filleuls payants)"
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
                      <Badge variant={hasTierAtLeast(r.plan, "basic") ? "default" : "secondary"}>
                        {TIER_LABELS[r.plan]}
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
