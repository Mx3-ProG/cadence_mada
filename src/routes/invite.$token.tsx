import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Clock, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyInviteResponse } from "@/lib/invites.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusBadge } from "@/components/agenda/status-badge";
import { GoogleReviewCard } from "@/components/agenda/google-review-card";
import { SimpleSkeleton } from "@/components/loading/page-skeletons";
import { BrandMark } from "@/components/brand-logo";

export const Route = createFileRoute("/invite/$token")({
  pendingComponent: SimpleSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  head: () => ({
    meta: [
      { title: "Confirmer un rendez-vous — Cadence" },
      {
        name: "description",
        content: "Consultez les détails du rendez-vous proposé et confirmez ou refusez en un clic.",
      },
      { property: "og:title", content: "Confirmer un rendez-vous — Cadence" },
      {
        property: "og:description",
        content: "Un rendez-vous vous attend : acceptez ou refusez directement depuis ce lien.",
      },
    ],
  }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const inviteQuery = useQuery({
    queryKey: ["invite", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invite", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const respond = async (accept: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("respond_to_invite", {
      _token: token,
      _accept: accept,
      _message: message.trim().slice(0, 500),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(accept ? "Rendez-vous confirmé !" : "Réponse envoyée.");
    void inviteQuery.refetch();
    notifyInviteResponse({ data: { token, origin: window.location.origin } }).catch(() => {
      // L'organisateur verra quand même la réponse dans son tableau de bord.
    });
  };

  const invite = inviteQuery.data;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" />
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-30" />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <BrandMark className="h-10 w-10" />
          <span className="font-display text-2xl font-bold tracking-tight">Cadence</span>
        </div>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          {inviteQuery.isLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">Chargement…</p>
          )}

          {!inviteQuery.isLoading && !invite && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ce lien d'invitation est invalide ou a expiré.
            </p>
          )}

          {invite && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Proposé par {invite.host_name ?? "votre hôte"}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
                    {invite.title}
                  </h1>
                </div>
                <StatusBadge status={invite.status} />
              </div>

              <div className="mt-6 space-y-2 rounded-2xl bg-surface/70 p-4 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {format(new Date(invite.starts_at), "EEEE d MMMM 'à' HH:mm", { locale: fr })} —{" "}
                    {format(new Date(invite.ends_at), "HH:mm")}
                  </span>
                </p>
                {invite.location && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{invite.location}</span>
                  </p>
                )}
              </div>

              {invite.description && (
                <p className="mt-4 text-sm text-muted-foreground">{invite.description}</p>
              )}

              {invite.host_has_branding && invite.invite_message && (
                <p className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                  {invite.invite_message}
                </p>
              )}

              {invite.status === "pending" ? (
                <div className="mt-6 grid gap-3">
                  <Textarea
                    rows={3}
                    placeholder="Un message pour l'organisateur (optionnel)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button disabled={busy} className="gap-2" onClick={() => respond(true)}>
                      <Check className="h-4 w-4" /> J'accepte
                    </Button>
                    <Button
                      disabled={busy}
                      variant="outline"
                      className="gap-2"
                      onClick={() => respond(false)}
                    >
                      <X className="h-4 w-4" /> Je décline
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-6 rounded-2xl border border-border/70 px-4 py-3 text-center text-sm text-muted-foreground">
                  Votre réponse a bien été enregistrée
                  {invite.responded_at
                    ? ` le ${format(new Date(invite.responded_at), "d MMMM 'à' HH:mm", { locale: fr })}`
                    : ""}
                  .
                </p>
              )}

              {invite.host_has_branding && invite.review_prompt_enabled && (
                <GoogleReviewCard
                  branding={{
                    businessName: invite.business_name,
                    googleReviewUrl: invite.google_review_url,
                    googleMapsUrl: invite.google_maps_url,
                    googleRating: invite.google_rating,
                    googleReviewsCount: invite.google_reviews_count,
                    websiteUrl: invite.website_url,
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
