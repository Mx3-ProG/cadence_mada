import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { SimpleSkeleton } from "@/components/loading/page-skeletons";
import { supabase } from "@/integrations/supabase/client";
import {
  completeLoginChallenge,
  resendLoginChallenge,
  startAuthenticatedLoginChallenge,
  verifyLoginCode,
} from "@/lib/two-factor.functions";

export const Route = createFileRoute("/verification")({
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
  const navigate = useNavigate();
  const initializationStarted = useRef(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

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
        navigate({ to: "/auth", replace: true });
        return;
      }

      try {
        const result = await startAuthenticatedLoginChallenge();
        if (!result.ok) throw new Error(result.reason);
        sessionStorage.setItem("cadence:login-challenge", result.challengeId);
        sessionStorage.setItem("cadence:login-email", result.maskedEmail);
        setChallengeId(result.challengeId);
        setMaskedEmail(result.maskedEmail);
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        await supabase.auth.signOut({ scope: "local" });
        toast.error("Le code de vérification n’a pas pu être envoyé.");
        navigate({ to: "/auth", replace: true });
      } finally {
        setLoading(false);
      }
    };

    void initialize();
  }, [navigate]);

  const verify = async (submittedCode = code) => {
    if (!challengeId || submittedCode.length !== 6) return;
    setVerifying(true);
    try {
      const result = await verifyLoginCode({ data: { challengeId, code: submittedCode } });
      if (!result.ok) {
        toast.error("Code incorrect ou expiré.");
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
      toast.success("Connexion vérifiée.");
      navigate({ to: "/dashboard", replace: true });
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      toast.error("La connexion n’a pas pu être finalisée. Demandez un nouveau code.");
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
        toast.success("Un nouveau code vient d’être envoyé.");
      } else if (result.reason === "TOO_SOON") {
        toast.error("Patientez une minute avant de demander un autre code.");
      } else {
        toast.error("Impossible de renvoyer le code. Recommencez la connexion.");
      }
    } finally {
      setResending(false);
    }
  };

  if (loading) return <SimpleSkeleton />;

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

        <div className="glass-panel rounded-3xl p-6 text-center sm:p-8">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Vérifiez votre connexion
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Nous avons envoyé un code à six chiffres
            {maskedEmail ? (
              <>
                {" "}
                à <strong className="text-foreground">{maskedEmail}</strong>
              </>
            ) : (
              " par email"
            )}
            .
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
              aria-label="Code de vérification à six chiffres"
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
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accéder à mon compte"}
          </Button>

          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="mt-5 text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            {resending ? "Envoi en cours…" : "Renvoyer le code"}
          </button>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Le code expire après 30 minutes. Ne le communiquez à personne.
          </p>
        </div>
      </div>
    </main>
  );
}
