import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/agenda/app-header";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_EMAIL = "contact@cadence.app";

export const Route = createFileRoute("/_authenticated/contact")({
  head: () => ({
    meta: [
      { title: "Nous contacter — Cadence" },
      {
        name: "description",
        content: "Une question, une idée ou besoin d'aide ? Contacte l'équipe Cadence par email.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      toast.success("Adresse email copiée");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier l'adresse");
    }
  };

  const prepareEmail = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = [`Email de réponse : ${email}`, "", message].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen overflow-hidden">
      <AppHeader />

      <main className="relative mx-auto w-full max-w-5xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
        <div className="aurora pointer-events-none absolute inset-x-0 -top-20 -z-10 h-[34rem] opacity-80" />
        <div className="pointer-events-none absolute left-1/2 top-12 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl sm:h-96 sm:w-96" />

        <Reveal>
          <header className="mx-auto max-w-2xl text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.35rem] border border-primary/20 bg-primary/10 shadow-glow sm:h-20 sm:w-20 sm:rounded-[1.65rem]">
              <MessageCircle className="h-7 w-7 text-primary sm:h-9 sm:w-9" strokeWidth={1.8} />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Nous sommes à l'écoute
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-6xl">
              Parlons de ce qui compte pour vous.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Une question, une idée ou un souci avec Cadence ? Écrivez-nous, nous vous répondrons
              par email dès que possible.
            </p>
          </header>
        </Reveal>

        <div className="mt-10 grid items-start gap-5 lg:mt-14 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal delay={0.05}>
            <section className="glass-panel rounded-3xl p-5 sm:p-7">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">Écrivez-nous directement</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Utilisez votre messagerie habituelle, depuis votre téléphone ou votre ordinateur.
              </p>

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group mt-6 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface/70 p-4 transition hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="min-w-0">
                  <span className="block text-xs text-muted-foreground">Adresse email</span>
                  <span className="block truncate font-semibold">{CONTACT_EMAIL}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              </a>

              <Button
                type="button"
                variant="ghost"
                className="mt-3 w-full rounded-xl text-muted-foreground"
                onClick={copyEmail}
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                {copied ? "Adresse copiée" : "Copier l'adresse"}
              </Button>
            </section>
          </Reveal>

          <Reveal delay={0.1}>
            <section className="glass-panel rounded-3xl p-5 sm:p-7">
              <div>
                <p className="text-sm font-medium text-primary">Un message à nous transmettre ?</p>
                <h2 className="mt-1 text-2xl font-semibold">Préparez votre email</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Remplissez ces champs : votre application de messagerie s'ouvrira avec le message
                  prêt à être envoyé.
                </p>
              </div>

              <form className="mt-6 grid gap-5" onSubmit={prepareEmail}>
                <div className="grid gap-2">
                  <Label htmlFor="contact-email">Votre email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="h-11 rounded-xl bg-background/60"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contact-subject">Sujet</Label>
                  <Input
                    id="contact-subject"
                    placeholder="Comment pouvons-nous vous aider ?"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    required
                    className="h-11 rounded-xl bg-background/60"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Décrivez votre demande..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    required
                    rows={6}
                    className="resize-y rounded-xl bg-background/60"
                  />
                </div>

                <Button type="submit" size="lg" className="h-12 w-full rounded-xl sm:w-auto">
                  <Send className="h-4 w-4" />
                  Ouvrir ma messagerie
                </Button>
              </form>
            </section>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
