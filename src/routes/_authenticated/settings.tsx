import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ExternalLink, Loader2, Lock, Sparkles, Star } from "lucide-react";
import { WeeklyHistory } from "@/components/agenda/weekly-history";
import { AccountSettings } from "@/components/agenda/account-settings";
import { ReferralSection } from "@/components/agenda/referral-section";
import { SubscriptionSection } from "@/components/agenda/subscription-section";

const DOC_LINKS = [
  {
    to: "/documentation",
    label: "Documentation complète",
    description: "Emails, statuts, flux serveur et autorisations.",
  },
  {
    to: "/cgu",
    label: "Conditions d'utilisation",
    description: "Formules, limites et règles du service.",
  },
  {
    to: "/confidentialite",
    label: "Confidentialité (RGPD)",
    description: "Données collectées et tes droits.",
  },
  {
    to: "/cookies",
    label: "Cookies",
    description: "Traceurs utilisés et gestion du consentement.",
  },
] as const;

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/agenda/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Reveal } from "@/components/reveal";
import { GoogleReviewCard } from "@/components/agenda/google-review-card";
import { usePlanUsage, PRO_PRICE_LABEL } from "@/lib/plan";
import { useUpgradeToPro } from "@/lib/billing";
import { SettingsSkeleton } from "@/components/loading/page-skeletons";

export const Route = createFileRoute("/_authenticated/settings")({
  pendingComponent: SettingsSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  head: () => ({
    meta: [
      { title: "Personnaliser le lien d'invitation — Cadence" },
      {
        name: "description",
        content:
          "Ajoute ta note Google, ton lien d'avis Google My Business et un message personnalisé à tes invitations.",
      },
      { property: "og:title", content: "Personnaliser le lien d'invitation — Cadence" },
      {
        property: "og:description",
        content:
          "Réservé au plan Pro : avis Google, Maps et branding sur tes liens de rendez-vous.",
      },
    ],
  }),
  component: SettingsPage,
});

type Branding = {
  business_name: string;
  invite_message: string;
  google_review_url: string;
  google_maps_url: string;
  google_rating: string;
  google_reviews_count: string;
  review_prompt_enabled: boolean;
};

const empty: Branding = {
  business_name: "",
  invite_message: "",
  google_review_url: "",
  google_maps_url: "",
  google_rating: "",
  google_reviews_count: "",
  review_prompt_enabled: true,
};

function SettingsPage() {
  const queryClient = useQueryClient();
  const planQuery = usePlanUsage();
  const upgrade = useUpgradeToPro();
  const isPro = planQuery.data?.plan === "pro";

  const [form, setForm] = useState<Branding>(empty);
  const [saving, setSaving] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile-branding"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "business_name, invite_message, google_review_url, google_maps_url, google_rating, google_reviews_count, review_prompt_enabled",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setForm({
      business_name: p.business_name ?? "",
      invite_message: p.invite_message ?? "",
      google_review_url: p.google_review_url ?? "",
      google_maps_url: p.google_maps_url ?? "",
      google_rating: p.google_rating != null ? String(p.google_rating) : "",
      google_reviews_count: p.google_reviews_count != null ? String(p.google_reviews_count) : "",
      review_prompt_enabled: p.review_prompt_enabled ?? true,
    });
  }, [profileQuery.data]);

  const set = (key: keyof Branding, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const rating = form.google_rating.trim() ? Number(form.google_rating.replace(",", ".")) : null;
    if (rating != null && (Number.isNaN(rating) || rating < 0 || rating > 5)) {
      toast.error("La note Google doit être comprise entre 0 et 5.");
      return;
    }
    const count = form.google_reviews_count.trim() ? Number(form.google_reviews_count) : null;
    if (count != null && (Number.isNaN(count) || count < 0)) {
      toast.error("Le nombre d'avis est invalide.");
      return;
    }

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id;
    if (!id) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: form.business_name.trim() || null,
        invite_message: form.invite_message.trim() || null,
        google_review_url: form.google_review_url.trim() || null,
        google_maps_url: form.google_maps_url.trim() || null,
        google_rating: rating,
        google_reviews_count: count,
        review_prompt_enabled: form.review_prompt_enabled,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Personnalisation enregistrée");
    void queryClient.invalidateQueries({ queryKey: ["profile-branding"] });
  };

  if (profileQuery.isLoading && !profileQuery.data) return <SettingsSkeleton />;

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="relative mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 opacity-60" />

        <header>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Personnaliser le lien d'invitation
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoute tes avis Google, ton lien Google My Business / Maps et un message de marque sur
            la page que reçoivent tes contacts.
          </p>
        </header>

        <Reveal>
          <div className="mt-6">
            <SubscriptionSection />
          </div>
        </Reveal>

        {!isPro && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-2 text-sm">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Fonctionnalité réservée au plan <strong>Pro</strong> ({PRO_PRICE_LABEL}/mois) : avis
                Google, note affichée et branding sur tes invitations.
              </span>
            </p>
            <Button
              className="gap-2 sm:shrink-0"
              disabled={upgrade.isPending}
              onClick={() => upgrade.mutate()}
            >
              {upgrade.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Passer en Pro
            </Button>
          </div>
        )}

        <Reveal>
          <section className="glass-panel mt-6 rounded-2xl p-5">
            <fieldset disabled={!isPro} className="grid gap-4 disabled:opacity-60">
              <div className="grid gap-2">
                <Label htmlFor="business_name">Nom affiché (entreprise)</Label>
                <Input
                  id="business_name"
                  value={form.business_name}
                  placeholder="Studio Cadence"
                  onChange={(e) => set("business_name", e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invite_message">Message personnalisé sur l'invitation</Label>
                <Textarea
                  id="invite_message"
                  rows={3}
                  value={form.invite_message}
                  placeholder="Merci de confirmer votre créneau, à très vite !"
                  onChange={(e) => set("invite_message", e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="google_review_url">Lien « Laisser un avis » Google</Label>
                  <Input
                    id="google_review_url"
                    value={form.google_review_url}
                    placeholder="https://g.page/r/…/review"
                    onChange={(e) => set("google_review_url", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="google_maps_url">Lien Google Maps</Label>
                  <Input
                    id="google_maps_url"
                    value={form.google_maps_url}
                    placeholder="https://maps.app.goo.gl/…"
                    onChange={(e) => set("google_maps_url", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="google_rating">Note Google (0 à 5)</Label>
                  <Input
                    id="google_rating"
                    inputMode="decimal"
                    value={form.google_rating}
                    placeholder="4.8"
                    onChange={(e) => set("google_rating", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="google_reviews_count">Nombre d'avis</Label>
                  <Input
                    id="google_reviews_count"
                    inputMode="numeric"
                    value={form.google_reviews_count}
                    placeholder="127"
                    onChange={(e) => set("google_reviews_count", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Afficher le bloc avis sur l'invitation</p>
                  <p className="text-xs text-muted-foreground">
                    Visible aussi dans l'email d'invitation.
                  </p>
                </div>
                <Switch
                  checked={form.review_prompt_enabled}
                  onCheckedChange={(v) => set("review_prompt_enabled", v)}
                />
              </div>

              <div>
                <Button onClick={save} disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
              </div>
            </fieldset>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="mt-6">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Star className="h-4 w-4 text-primary" /> Aperçu côté invité
            </p>
            <div className="glass-panel mt-2 rounded-2xl p-5">
              {form.invite_message && (
                <p className="text-sm text-muted-foreground">{form.invite_message}</p>
              )}
              {form.review_prompt_enabled ? (
                <GoogleReviewCard
                  branding={{
                    businessName: form.business_name,
                    googleReviewUrl: form.google_review_url,
                    googleMapsUrl: form.google_maps_url,
                    googleRating: form.google_rating
                      ? Number(form.google_rating.replace(",", "."))
                      : null,
                    googleReviewsCount: form.google_reviews_count
                      ? Number(form.google_reviews_count)
                      : null,
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Bloc avis désactivé.</p>
              )}
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <section className="glass-panel mt-6 rounded-2xl p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <BookOpen className="h-4 w-4 text-primary" /> Aide & documentation
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tout ce qu'il faut savoir pour ne jamais être perdu.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DOC_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group flex items-start justify-between gap-3 rounded-xl border border-border/70 px-4 py-3 transition hover:border-primary/50 hover:bg-primary/5"
                >
                  <span>
                    <span className="block text-sm font-medium">{link.label}</span>
                    <span className="block text-xs text-muted-foreground">{link.description}</span>
                  </span>
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-6">
            <WeeklyHistory />
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-6">
            <ReferralSection />
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-6">
            <AccountSettings />
          </div>
        </Reveal>
      </main>
    </div>
  );
}
