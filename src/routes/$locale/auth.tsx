import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SimpleSkeleton } from "@/components/loading/page-skeletons";
import { BrandMark } from "@/components/brand-logo";
import { getLoginSessionState, startPasswordLoginChallenge } from "@/lib/two-factor.functions";
import { registerWithPassword } from "@/lib/auth.functions";
import { displayNameSchema } from "@/lib/auth-validation";
import { useLocale } from "@/i18n/use-locale";

const authSearchSchema = z.object({
  ref: z.string().trim().min(1).max(20).optional(),
});

export const Route = createFileRoute("/$locale/auth")({
  ssr: false,
  validateSearch: authSearchSchema,
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;

    const state = await getLoginSessionState().catch(() => ({ active: false as const }));
    if (state.active)
      throw redirect({ to: "/$locale/dashboard", params: { locale: params.locale } });

    await supabase.auth.signOut({ scope: "local" });
  },
  pendingComponent: SimpleSkeleton,
  pendingMs: 0,
  pendingMinMs: 400,
  // SEO meta stays French-only for now — per-locale <head> translation is
  // follow-up work (needs hreflang/canonical wiring alongside it).
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
  const locale = useLocale();
  const { t } = useTranslation("auth");
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
            ? t("errors.invalid_credentials")
            : result.reason === "RATE_LIMITED"
              ? t("errors.rate_limited")
              : t("errors.verification_email_failed");
        toast.error(message);
        return;
      }
      sessionStorage.setItem("cadence:login-challenge", result.challengeId);
      sessionStorage.setItem("cadence:login-email", result.maskedEmail);
      navigate({ to: "/$locale/verification", params: { locale } });
    } catch {
      toast.error(t("errors.signin_failed"));
    } finally {
      setLoading(false);
    }
  };

  const signUp = async () => {
    const parsedName = displayNameSchema.safeParse(fullName);
    if (!parsedName.success) {
      toast.error(t("errors.name_required"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("errors.password_too_short"));
      return;
    }

    setLoading(true);
    try {
      const result = await registerWithPassword({
        data: { displayName: parsedName.data, email: email.trim(), password },
      });
      if (!result.ok) {
        toast.error(
          result.reason === "ACCOUNT_EXISTS"
            ? t("errors.account_exists")
            : t("errors.signup_failed"),
        );
        return;
      }
      sessionStorage.setItem("cadence:login-challenge", result.challengeId);
      sessionStorage.setItem("cadence:login-email", result.maskedEmail);
      navigate({ to: "/$locale/verification", params: { locale } });
    } catch {
      toast.error(t("errors.signup_failed"));
    } finally {
      setLoading(false);
    }
  };

  const sendResetLink = async () => {
    const target = forgotEmail.trim();
    if (!target) {
      toast.error(t("errors.email_required"));
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/${locale}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("success.reset_link_sent"));
    setForgotOpen(false);
    setForgotEmail("");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="aurora pointer-events-none absolute inset-0 -z-10" />
      <div className="grid-lines pointer-events-none absolute inset-0 -z-10 opacity-30" />

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <Link
          to="/$locale"
          params={{ locale }}
          className="mb-8 flex items-center justify-center gap-2.5"
        >
          <BrandMark className="h-10 w-10" />
          <span className="font-display text-2xl font-bold tracking-tight">Cadence</span>
        </Link>

        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("tabs.signin")}</TabsTrigger>
              <TabsTrigger value="signup">{t("tabs.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="in-email">{t("signin.email_label")}</Label>
                <Input
                  id="in-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("signin.email_placeholder")}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="in-pass">{t("signin.password_label")}</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotOpen((v) => !v);
                    }}
                  >
                    {t("signin.forgot")}
                  </button>
                </div>
                <PasswordInput
                  id="in-pass"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {forgotOpen && (
                <div className="grid gap-2 rounded-xl border border-border/70 p-3">
                  <Label htmlFor="forgot-email" className="text-xs text-muted-foreground">
                    {t("signin.forgot_hint")}
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder={t("signin.email_placeholder")}
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
                    {t("signin.send_reset")}
                  </Button>
                </div>
              )}

              <Button onClick={signIn} disabled={loading} className="mt-2 w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signin.submit")}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="up-name">{t("signup.name_label")}</Label>
                <Input
                  id="up-name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("signup.name_placeholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="up-email">{t("signup.email_label")}</Label>
                <Input
                  id="up-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="up-pass">{t("signup.password_label")}</Label>
                <PasswordInput
                  id="up-pass"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button onClick={signUp} disabled={loading} className="mt-2 w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signup.submit")}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
