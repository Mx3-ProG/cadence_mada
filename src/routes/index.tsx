import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  Check,
  Crown,
  GraduationCap,
  HeartPulse,
  Home,
  Link2,
  Mail,
  MessageCircle,
  MoonStar,
  Scale,
  Sparkles,
  StickyNote,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Reveal } from "@/components/reveal";
import { Pricing } from "@/components/pricing";
import { LandingSkeleton } from "@/components/loading/page-skeletons";
import { legalLinks } from "@/components/legal/legal-page";
import { openCookieSettings } from "@/components/legal/cookie-consent";
import { TIER_LABELS } from "@/lib/plan";
import { BrandLogo } from "@/components/brand-logo";
import { LandingCtaDock } from "@/components/landing-cta-dock";

export const Route = createFileRoute("/")({
  pendingComponent: LandingSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  head: () => ({
    meta: [
      { title: "Cadence — L'agenda de rendez-vous qui se confirme tout seul" },
      {
        name: "description",
        content:
          "Planifie ta semaine, garde tes notes de préparation et laisse tes invités confirmer par lien ou par email. Agenda moderne, fluide et responsive.",
      },
      { property: "og:title", content: "Cadence — L'agenda qui se confirme tout seul" },
      {
        property: "og:description",
        content:
          "Rendez-vous, contacts, notes et confirmations par lien : toute ta semaine dans une seule interface.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: CalendarDays,
    title: "Ta semaine en un écran",
    text: "Sept colonnes, zéro friction. Crée un créneau d'un clic et vois immédiatement où tu en es.",
  },
  {
    icon: CalendarRange,
    title: "Agenda complet semaine & mois",
    text: "Bascule entre vue semaine et vue mois, navigue d'un clic et ouvre la fiche complète de chaque rendez-vous.",
    pro: true,
  },
  {
    icon: UserPlus,
    title: "Réservation en libre-service",
    text: "Partage ton lien public : tes contacts choisissent eux-mêmes un créneau libre, tu n'as plus qu'à confirmer.",
    pro: true,
  },
  {
    icon: Link2,
    title: "Confirmation par lien",
    text: "Chaque rendez-vous génère un lien unique. Ton invité accepte ou décline, tu le vois en direct.",
  },
  {
    icon: Mail,
    title: "Invitations par email",
    text: "Envoie l'invitation à ton contact en un bouton, avec tous les détails et le lien de réponse.",
  },
  {
    icon: Users,
    title: "Fiches contacts",
    text: "Société, poste, téléphone, historique : le contexte est là avant même de dire bonjour.",
  },
  {
    icon: StickyNote,
    title: "Notes de préparation",
    text: "Note ce dont tu veux parler. Privé, toujours à portée de main juste avant le rendez-vous.",
  },
  {
    icon: MoonStar,
    title: "Jour & nuit",
    text: "Un thème encre et émeraude pensé pour les deux modes, fluide sur mobile comme sur desktop.",
  },
];

const audiences = [
  {
    icon: Briefcase,
    title: "Freelances & indépendants",
    text: "Gérer les rendez-vous clients sans perdre une journée en allers-retours.",
  },
  {
    icon: MessageCircle,
    title: "Coachs & consultants",
    text: "Organiser les séances et garder le fil de chaque client.",
  },
  {
    icon: HeartPulse,
    title: "Thérapeutes & praticiens",
    text: "Remplir l'agenda de consultations sans relances téléphoniques.",
  },
  {
    icon: Home,
    title: "Agents immobiliers",
    text: "Caler visites et rendez-vous clients sans double réservation.",
  },
  {
    icon: Scale,
    title: "Avocats & professions juridiques",
    text: "Rendez-vous clients organisés et confirmations tracées.",
  },
  {
    icon: Wrench,
    title: "Artisans & prestataires à domicile",
    text: "Planifier les interventions et éviter les créneaux ratés.",
  },
  {
    icon: GraduationCap,
    title: "Formateurs & professionnels de la formation",
    text: "Organiser sessions individuelles et rendez-vous de suivi.",
  },
  {
    icon: Users,
    title: "Petites équipes & TPE",
    text: "Plusieurs contacts, plusieurs rendez-vous, une seule vue d'ensemble.",
  },
  {
    icon: CalendarCheck2,
    title: "Toute activité sur rendez-vous",
    text: "Dès que les no-shows coûtent du temps, Cadence les évite.",
  },
];

const howItWorks = [
  {
    icon: CalendarDays,
    title: "Crée ton agenda",
    text: "Ajoute tes contacts et pose un premier créneau en quelques secondes, sans configuration.",
  },
  {
    icon: UserPlus,
    title: "Partage ton lien",
    text: "Envoie une invitation par email ou diffuse ton lien de réservation public pour laisser tes contacts choisir un créneau.",
  },
  {
    icon: CalendarCheck2,
    title: "Regarde les réponses arriver",
    text: "Chaque confirmation ou refus apparaît en direct sur ton tableau de bord, vue semaine ou vue mois.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:flex sm:justify-between sm:px-6">
          <BrandLogo />
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/tarifs"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Tarifs
            </Link>
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/auth">Commencer</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
          <div className="aurora pointer-events-none absolute inset-0 -z-10" />
          <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-40" />

          <div className="mx-auto max-w-3xl text-center">
            <motion.p
              data-reveal=""
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Agenda + confirmations en temps réel
            </motion.p>

            <motion.h1
              data-reveal=""
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-6 font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl"
            >
              Toute ta semaine de rendez-vous,{" "}
              <span className="text-gradient">confirmée sans relance</span>
            </motion.h1>

            <motion.p
              data-reveal=""
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
            >
              Crée un créneau, envoie un lien, vois la réponse arriver sur ton tableau de bord. Avec
              les fiches contacts et tes notes de préparation au même endroit.
            </motion.p>

            <motion.div
              data-reveal=""
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-9 flex flex-wrap items-center justify-center gap-3"
            >
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  Créer mon agenda <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/dashboard">Voir mon tableau de bord</Link>
              </Button>
            </motion.div>
          </div>

          <Reveal delay={0.25}>
            <div className="glass-panel mx-auto mt-16 max-w-4xl rounded-3xl p-4 shadow-glow sm:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { day: "Lundi", time: "09:30", title: "Kickoff Nova", status: "Accepté" },
                  {
                    day: "Mercredi",
                    time: "15:00",
                    title: "Point investisseurs",
                    status: "En attente",
                  },
                  { day: "Vendredi", time: "11:00", title: "Café Camille", status: "Accepté" },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    data-reveal=""
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * i }}
                    className="rounded-2xl border border-border/70 bg-surface/70 p-4 text-left"
                  >
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {item.day}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold">{item.time}</p>
                    <p className="mt-1 truncate text-sm">{item.title}</p>
                    <p
                      className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        item.status === "Accepté"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}
                    >
                      <Check className="h-3 w-3" /> {item.status}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section className="px-4 pb-28 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Comment ça marche
                </span>
                <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Du premier créneau à la confirmation, en trois étapes
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
                  Pas de configuration compliquée : Cadence prend le relais dès que tu proposes un
                  rendez-vous.
                </p>
              </div>
            </Reveal>

            <div className="relative mt-14 grid gap-8 md:grid-cols-3">
              <div
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
              />
              {howItWorks.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.1}>
                  <div className="relative flex flex-col items-center text-center">
                    <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-primary/40 bg-background font-display text-sm font-bold text-primary shadow-glow">
                      {i + 1}
                    </span>
                    <div className="glass-panel mt-5 flex h-full w-full flex-col items-center rounded-2xl p-6">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
                        <step.icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 font-display text-lg font-bold">{step.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-28 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Pour qui
                </span>
                <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Conçu pour celles et ceux qui vivent au rythme des rendez-vous
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
                  Si ton activité tourne autour de rendez-vous clients, Cadence est fait pour toi.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {audiences.map((a, i) => (
                <Reveal key={a.title} delay={i * 0.06}>
                  <article className="glass-panel h-full rounded-2xl p-6">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
                      <a.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-bold">{a.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{a.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-28 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Tout ce qu'il faut, rien de superflu
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.06}>
                  <article className="glass-panel relative h-full rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 hover:shadow-glow">
                    {f.pro && (
                      <Badge className="absolute right-4 top-4 gap-1 bg-primary/12 text-primary hover:bg-primary/12">
                        <Crown className="h-3 w-3" /> {TIER_LABELS.standard}
                      </Badge>
                    )}
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
                      <f.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <Pricing />

        <section className="px-4 pb-28 sm:px-6">
          <Reveal>
            <div className="glass-panel mx-auto max-w-3xl rounded-3xl px-6 py-14 text-center sm:px-10">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Prêt à reprendre le contrôle de ta semaine ?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">
                Quelques secondes pour créer ton compte, et ton premier rendez-vous part avec son
                lien de confirmation.
              </p>
              <Button asChild size="lg" className="mt-8 gap-2">
                <Link to="/auth">
                  Commencer gratuitement <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border/60 px-4 py-8 pb-28 text-center text-xs text-muted-foreground sm:px-6">
        <p>Cadence — l'agenda de rendez-vous qui se confirme tout seul.</p>
        <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {legalLinks.map((l) => (
            <Link key={l.to} to={l.to} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => openCookieSettings()}
            className="transition-colors hover:text-foreground"
          >
            Préférences cookies
          </button>
        </nav>
      </footer>

      <LandingCtaDock />
    </div>
  );
}
