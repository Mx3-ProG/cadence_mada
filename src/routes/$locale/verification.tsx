import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { SimpleSkeleton } from "@/components/loading/page-skeletons";
import { supabase } from "@/integrations/supabase/client";
import {
  completeLoginChallenge,
  resendLoginChallenge,
  startAuthenticatedLoginChallenge,
  verifyLoginCode,
} from "@/lib/two-factor.functions";
import { completeOnboarding, getOnboardingState } from "@/lib/auth.functions";
import { displayNameSchema } from "@/lib/auth-validation";
import { useLocale } from "@/i18n/use-locale";

export const Route = createFileRoute("/$locale/verification")({
  ssr: false,
  pendingComponent: SimpleSkeleton,
  pendingMs: 0,
  pendingMinMs: 300,
  head: () => ({
    meta: [
      { title: "Vérification de connexion — Cadence" },
      {
        name: "description",
        content: "Saisissez le code reçu par email pour accéder à votre compte Cadence.",
      },
    ],
  }),
  component: VerificationPage,
});

function VerificationPage() {
  const locale = useLocale();
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const initializationStarted = useRef(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;

    const initialize = async () => {
      const storedChallenge = sessionStorage.getItem("cadence:login-challenge");
      const storedEmail = sessionStorage.getItem("cadence:login-email") ?? "";
      if (storedChallenge) {
        setChallengeId(storedChallenge);
        setMaskedEmail(storedEmail);
        setLoading(false);
        return;
      }

      // Retour OAuth Google : le premier facteur est valide, on envoie le code email.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/$locale/auth", params: { locale }, replace: true });
        return;
      }

      try {
        const onboarding = await getOnboardingState();
        if (!onboarding.completed) {
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }
        const result = await startAuthenticatedLoginChallenge();
        if (!result.ok) throw new Error(result.reason);
        sessionStorage.setItem("cadence:login-challenge", result.challengeId);
        sessionStorage.setItem("cadence:login-email", result.maskedEmail);
        setChallengeId(result.challengeId);
        setMaskedEmail(result.maskedEmail);
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        await supabase.auth.signOut({ scope: "local" });
        toast.error(t("errors.verification_email_failed"));
        navigate({ to: "/$locale/auth", params: { locale }, replace: true });
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [navigate, locale, t]);

  const saveOnboarding = async () => {
    const parsedName = displayNameSchema.safeParse(displayName);
    if (!parsedName.success) {
      toast.error(t("errors.name_required"));
      return;
    }

    setSavingName(true);
    try {
      const completed = await completeOnboarding({ data: { displayName: parsedName.data } });
      if (!completed.ok) throw new Error("ONBOARDING_FAILED");

      const result = await startAuthenticatedLoginChallenge();
      if (!result.ok) throw new Error(result.reason);
      sessionStorage.setItem("cadence:login-challenge", result.challengeId);
      sessionStorage.setItem("cadence:login-email", result.maskedEmail);
      setChallengeId(result.challengeId);
      setMaskedEmail(result.maskedEmail);
      setNeedsOnboarding(false);
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      toast.error(t("onboarding.errors.save_failed"));
    } finally {
      setSavingName(false);
    }
  };

  const verify = async (submittedCode = code) => {
    if (!challengeId || submittedCode.length !== 6) return;
    setVerifying(true);
    try {
      const result = await verifyLoginCode({ data: { challengeId, code: submittedCode } });
      if (!result.ok) {
        toast.error(t("verification.errors.invalid_code"));
        setCode("");
        return;
      }

      const { data: verifiedAuth, error } = await supabase.auth.verifyOtp({
        token_hash: result.tokenHash,
        type: "magiclink",
      });
      const accessToken = verifiedAuth.session?.access_token;
      if (error || !accessToken) throw error ?? new Error("Session Supabase absente");

      const completion = await completeLoginChallenge({
        data: {
          challengeId: result.challengeId,
          completionToken: result.completionToken,
          accessToken,
          referralCode: sessionStorage.getItem("cadence:referral-code") ?? undefined,
        },
      });
      if (!completion.ok) throw new Error("Session non activée");

      sessionStorage.removeItem("cadence:login-challenge");
      sessionStorage.removeItem("cadence:login-email");
      sessionStorage.removeItem("cadence:referral-code");
      toast.success(t("verification.success.verified"));
      navigate({ to: "/$locale/dashboard", params: { locale }, replace: true });
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      toast.error(t("verification.errors.finalize_failed"));
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (!challengeId) return;
    setResending(true);
    try {
      const result = await resendLoginChallenge({ data: { challengeId } });
      if (result.ok) {
        toast.success(t("verification.success.resent"));
      } else if (result.reason === "TOO_SOON") {
        toast.error(t("verification.errors.too_soon"));
      } else {
        toast.error(t("verification.errors.resend_failed"));
      }
    } finally {
      setResending(false);
    }
  };

  if (loading) return <SimpleSkeleton />;

  if (needsOnboarding) {
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
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {t("onboarding.title")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("onboarding.description")}
            </p>
            <div className="mt-6 grid gap-2">
              <Label htmlFor="onboarding-name">{t("onboarding.name_label")}</Label>
              <Input
                id="onboarding-name"
                autoFocus
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t("onboarding.name_placeholder")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveOnboarding();
                }}
              />
            </div>
            <Button
              className="mt-6 w-full gap-2"
              onClick={() => void saveOnboarding()}
              disabled={savingName}
            >
              {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("onboarding.submit")}
            </Button>
          </div>
        </div>
      </main>
    );
  }

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

        <div className="glass-panel rounded-3xl p-6 text-center sm:p-8">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {t("verification.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t("verification.body_prefix")}
            {maskedEmail ? (
              <>
                {t("verification.sent_to_prefix")}
                <strong className="text-foreground">{maskedEmail}</strong>.
              </>
            ) : (
              t("verification.sent_generic")
            )}
          </p>

          <div className="mt-7 flex justify-center">
            <InputOTP
              autoFocus
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={setCode}
              onComplete={(completedCode) => void verify(completedCode)}
              disabled={verifying}
              aria-label={t("verification.otp_label")}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot key={index} index={index} className="h-12 w-11 text-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            className="mt-7 w-full"
            onClick={() => void verify()}
            disabled={verifying || code.length !== 6}
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : t("verification.submit")}
          </Button>

          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="mt-5 text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            {resending ? t("verification.resending") : t("verification.resend")}
          </button>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {t("verification.expiry_note")}
          </p>
        </div>
      </div>
    </main>
  );
}
