import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, Link2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { bookingUrl } from "@/lib/agenda";
import { hasFeatureAccess, usePlanUsage } from "@/lib/plan";

/**
 * Bouton d'accès rapide au lien de réservation, disponible depuis n'importe quelle page
 * authentifiée (header) pour éviter d'avoir à naviguer jusqu'aux réglages pour le retrouver.
 */
export function BookingLinkQuickAccess() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const planQuery = usePlanUsage();
  const isPro = hasFeatureAccess(planQuery.data, "standard");

  const settingsQuery = useQuery({
    queryKey: ["booking-settings"],
    enabled: open,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) return null;
      const { data, error } = await supabase
        .from("booking_settings")
        .select("slug, enabled")
        .eq("owner_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const settings = settingsQuery.data;
  const url = settings?.slug ? bookingUrl(settings.slug) : null;

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Mon lien de réservation"
          className="rounded-full border border-border/60"
        >
          <Link2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-semibold">Lien de réservation</p>

        {!isPro && (
          <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Réservé au plan Standard et plus.{" "}
              <Link
                to="/tarifs"
                hash="offre-standard"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Voir l’offre Standard
              </Link>
            </span>
          </div>
        )}

        {isPro && settingsQuery.isLoading && (
          <p className="mt-2 text-xs text-muted-foreground">Chargement…</p>
        )}

        {isPro && !settingsQuery.isLoading && (!settings?.enabled || !url) && (
          <p className="mt-2 text-xs text-muted-foreground">
            Pas encore activé.{" "}
            <Link
              to="/settings"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Configurer mon lien
            </Link>
          </p>
        )}

        {isPro && url && settings?.enabled && (
          <div className="mt-2 grid gap-2">
            <code className="truncate rounded-lg bg-surface/70 px-3 py-1.5 text-xs">{url}</code>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1 gap-2" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié" : "Copier"}
              </Button>
              <Button asChild size="sm" variant="ghost" className="gap-2">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
