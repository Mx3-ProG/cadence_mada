import { ExternalLink, Globe, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReviewBranding = {
  businessName?: string | null;
  googleReviewUrl?: string | null;
  googleMapsUrl?: string | null;
  googleRating?: number | null;
  googleReviewsCount?: number | null;
  websiteUrl?: string | null;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Note ${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating)
              ? "h-4 w-4 fill-primary text-primary"
              : "h-4 w-4 text-muted-foreground/50"
          }
        />
      ))}
    </span>
  );
}

/** Bloc « avis Google » affiché sur la page d'invitation des comptes Pro. */
export function GoogleReviewCard({ branding }: { branding: ReviewBranding }) {
  const {
    businessName,
    googleReviewUrl,
    googleMapsUrl,
    googleRating,
    googleReviewsCount,
    websiteUrl,
  } = branding;

  if (!googleReviewUrl && !googleMapsUrl && !websiteUrl && googleRating == null) return null;

  return (
    <section className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-surface/70 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {businessName ? businessName : "Avis Google"}
      </p>

      {googleRating != null && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-display text-2xl font-bold">{googleRating.toFixed(1)}</span>
          <Stars rating={googleRating} />
          {googleReviewsCount != null && (
            <span className="text-xs text-muted-foreground">({googleReviewsCount} avis)</span>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {googleReviewUrl && (
          <Button asChild className="min-w-0 gap-2 px-3">
            <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer">
              <Star className="h-4 w-4" /> Laisser un avis Google
            </a>
          </Button>
        )}
        {googleMapsUrl && (
          <Button asChild variant="outline" className="min-w-0 gap-2 px-3">
            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-4 w-4" /> Voir sur Google Maps
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
        {websiteUrl && (
          <Button asChild variant="outline" className="min-w-0 gap-2 px-3">
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
              <Globe className="h-4 w-4" /> Visiter le site
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
      </div>
    </section>
  );
}
