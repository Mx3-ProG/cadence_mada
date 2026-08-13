import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { SimpleSkeleton } from "@/components/loading/page-skeletons";
import { BrandMark } from "@/components/brand-logo";
import {
  getLoginSessionState,
  startAuthenticatedLoginChallenge,
  startPasswordLoginChallenge,
} from "@/lib/two-factor.functions";

const authSearchSchema = z.object({
  ref: z.string().trim().min(1).max(20).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: authSearchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const state = await getLoginSessionState().catch(() => ({ active: false as const }));
    if (state.active) throw redirect({ to: "/dashboard" });

    await supabase.auth.signOut({ scope: "local" });
  },
  pendingComponent: SimpleSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  head: () => ({
    meta: [
      { title: "Connexion — Cadence" },
      {
        name: "description",
        content:
          "Connecte-toi à Cadence pour gérer ta semaine de rendez-vous et tes confirmations.",
      },
      { property: "og:title", content: "Connexion — Cadence" },
      {
        property: "og:description",
        content: "Accède à ton agenda Cadence : rendez-vous, contacts et confirmations par lien.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { ref } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (ref) sessionStorage.setItem("cadence:referral-code", ref);
  }, [ref]);

  const signIn = async () => {
    setLoading(true);
    try {
      const result = await startPasswordLoginChallenge({ data: { email: email.trim(), password } });
      if (!result.ok) {
        const message =
          result.reason === "INVALID_CREDENTIALS"
            ? "Email ou mot de passe incorrect."
            : result.reason === "RATE_LIMITED"
              ? "Trop de codes demandés. Réessaie dans quelques minutes."
              : "L’email de vérification n’a pas pu être envoyé.";
        toast.error(message);
        return;
      }
      sessionStorage.setItem("cadence:login-challenge", result.challengeId);
      sessionStorage.setItem("cadence:login-email", result.maskedEmail);
      navigate({ to: "/verification" });
    } catch {
      toast.error("Connexion impossible pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  const startChallengeForCurrentSession = async () => {
    const result = await startAuthenticatedLoginChallenge();
    if (!result.ok) {
      toast.error("L’email de vérification n’a pas pu être envoyé.");
      return;
    }
    sessionStorage.setItem("cadence:login-challenge", result.challengeId);
    sessionStorage.setItem("cadence:login-email", result.maskedEmail);
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/verification" });
  };

  const signUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Compte créé — confirme ton adresse email pour te connecter.");
      return;
    }
    await startChallengeForCurrentSession();
  };

  const sendResetLink = async () => {
    const target = forgotEmail.trim();
    if (!target) {
      toast.error("Renseigne ton adresse email.");
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.",
    );
    setForgotOpen(false);
    setForgotEmail("");
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/verification` },
    });
    if (error) {
      toast.error("Connexion Google impossible pour le moment.");
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" />
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-30" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <BrandMark className="h-10 w-10" />
          <span className="font-display text-2xl font-bold tracking-tight">Cadence</span>
        </Link>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Créer un compte</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="in-email">Email</Label>
                <Input
                  id="in-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="toi@exemple.com"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="in-pass">Mot de passe</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotOpen((v) => !v);
                    }}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <Input
                  id="in-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {forgotOpen && (
                <div className="grid gap-2 rounded-xl border border-border/70 p-3">
                  <Label htmlFor="forgot-email" className="text-xs text-muted-foreground">
                    Reçois un lien par email pour choisir un nouveau mot de passe.
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="toi@exemple.com"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={forgotLoading}
                    onClick={sendResetLink}
                    className="gap-2"
                  >
                    {forgotLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Envoyer le lien de réinitialisation
                  </Button>
                </div>
              )}

              <Button onClick={signIn} disabled={loading} className="mt-2 w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="up-name">Nom complet</Label>
                <Input
                  id="up-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Martin"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="up-email">Email</Label>
                <Input
                  id="up-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="up-pass">Mot de passe</Label>
                <Input
                  id="up-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button onClick={signUp} disabled={loading} className="mt-2 w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer mon compte"}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google}>
            Continuer avec Google
          </Button>
        </div>
      </div>
    </main>
  );
}
