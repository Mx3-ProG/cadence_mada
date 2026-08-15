import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-logo";
import { useLocale } from "@/i18n/use-locale";

export const Route = createFileRoute("/$locale/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe — Cadence" },
      {
        name: "description",
        content: "Choisis un nouveau mot de passe pour ton compte Cadence.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const locale = useLocale();
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !cancelled) setReady(true);
    });

    // Si le lien a déjà établi la session de récupération avant le montage.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async () => {
    if (password.length < 8) {
      toast.error(t("reset.errors.too_short"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("reset.errors.mismatch"));
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("reset.success"));
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/$locale/auth", params: { locale } });
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
          <h1 className="font-display text-xl font-bold tracking-tight">{t("reset.title")}</h1>

          {!ready ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("reset.waiting")}</p>
          ) : (
            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new-pass">{t("reset.new_password_label")}</Label>
                <PasswordInput
                  id="new-pass"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-pass">{t("reset.confirm_label")}</Label>
                <PasswordInput
                  id="confirm-pass"
                  autoComplete="new-password"
                  visibilityLabel={t("reset.confirm_visibility_label")}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button onClick={submit} disabled={saving} className="mt-2 w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("reset.submit")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
