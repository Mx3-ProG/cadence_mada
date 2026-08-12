import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const legalLinks = [
  { to: "/mentions-legales", label: "Mentions légales" },
  { to: "/confidentialite", label: "Confidentialité (RGPD)" },
  { to: "/cgu", label: "CGU" },
  { to: "/cookies", label: "Cookies" },
  { to: "/documentation", label: "Documentation" },
] as const;

export function LegalPage({
  title,
  updatedAt = "6 août 2026",
  children,
}: {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Cadence</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
        </Link>

        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Dernière mise à jour : {updatedAt}</p>

        <div className="prose-legal mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mt-1 [&_p]:mt-2 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>

        <nav className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          {legalLinks.map((l) => (
            <Link key={l.to} to={l.to} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
