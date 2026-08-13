import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { Pricing } from "@/components/pricing";

export const Route = createFileRoute("/tarifs")({
  head: () => ({
    meta: [
      { title: "Tarifs — Cadence" },
      {
        name: "description",
        content:
          "Gratuit pour démarrer, Pro à 10 €/mois pour lever toutes les limites : contacts et rendez-vous illimités, invitations par email, branding personnalisé.",
      },
      { property: "og:title", content: "Tarifs — Cadence" },
      {
        property: "og:description",
        content: "Compare le plan Gratuit et le plan Pro de Cadence et choisis en un clic.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/tarifs" },
    ],
    links: [{ rel: "canonical", href: "/tarifs" }],
  }),
  component: TarifsPage,
});

function TarifsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandLogo />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/auth">Commencer</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 pb-4 pt-16 text-center sm:px-6 sm:pt-24">
          <h1 className="font-display text-3xl font-black tracking-tight sm:text-5xl">Tarifs</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Gratuit pour démarrer. Pro quand ça s'accélère, sans engagement.
          </p>
        </section>

        <Pricing />
      </main>
    </div>
  );
}
