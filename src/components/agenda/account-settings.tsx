import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, KeyRound, Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/i18n/use-locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AccountSettings() {
  const { t } = useTranslation("auth");
  const locale = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const accountQuery = useQuery({
    queryKey: ["account-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, automatic_reminders_enabled")
        .eq("id", user.id)
        .maybeSingle();
      return {
        id: user.id,
        email: user.email ?? "",
        fullName: data?.full_name ?? "",
        automaticRemindersEnabled: data?.automatic_reminders_enabled ?? true,
      };
    },
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [automaticRemindersEnabled, setAutomaticRemindersEnabled] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!accountQuery.data) return;
    setFullName(accountQuery.data.fullName);
    setEmail(accountQuery.data.email);
    setAutomaticRemindersEnabled(accountQuery.data.automaticRemindersEnabled);
  }, [accountQuery.data]);

  const saveProfile = async () => {
    const id = accountQuery.data?.id;
    if (!id) return;
    if (!fullName.trim()) {
      toast.error(t("account.errors.name_required"));
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        automatic_reminders_enabled: automaticRemindersEnabled,
      })
      .eq("id", id);

    let authError: string | null = null;
    if (email.trim() && email.trim() !== accountQuery.data?.email) {
      const { error: e } = await supabase.auth.updateUser({ email: email.trim() });
      authError = e?.message ?? null;
    }
    setSavingProfile(false);

    if (error || authError) {
      toast.error(error?.message ?? authError ?? t("account.errors.generic"));
      return;
    }
    toast.success(
      email.trim() !== accountQuery.data?.email
        ? t("account.success.saved_confirm_email")
        : t("account.success.saved"),
    );
    void queryClient.invalidateQueries({ queryKey: ["account-profile"] });
  };

  const changePassword = async () => {
    if (password.length < 8) {
      toast.error(t("password.errors.too_short"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("password.errors.mismatch"));
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success(t("password.success"));
  };

  const removeAccount = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      queryClient.clear();
      toast.success(t("delete.success"));
      void navigate({ to: "/$locale", params: { locale } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("delete.error_generic"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <UserRound className="h-4 w-4 text-primary" /> {t("account.title")}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="account_name">{t("account.name_label")}</Label>
            <Input
              id="account_name"
              value={fullName}
              placeholder={t("account.name_placeholder")}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account_email">{t("account.email_label")}</Label>
            <Input
              id="account_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <Button className="mt-4 gap-2" onClick={saveProfile} disabled={savingProfile}>
          {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("account.save")}
        </Button>
        <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border/70 p-4">
          <div>
            <Label htmlFor="automatic-reminders" className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" /> {t("reminders.title")}
            </Label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("reminders.description")}
            </p>
          </div>
          <Switch
            id="automatic-reminders"
            checked={automaticRemindersEnabled}
            onCheckedChange={setAutomaticRemindersEnabled}
            aria-label={t("reminders.toggle_label")}
          />
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <KeyRound className="h-4 w-4 text-primary" /> {t("password.title")}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="new_password">{t("password.new_label")}</Label>
            <PasswordInput
              id="new_password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm_password">{t("password.confirm_label")}</Label>
            <PasswordInput
              id="confirm_password"
              autoComplete="new-password"
              visibilityLabel={t("password.confirm_visibility_label")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-4 gap-2"
          onClick={changePassword}
          disabled={savingPassword}
        >
          {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("password.submit")}
        </Button>
      </section>

      <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-destructive">
          <Trash2 className="h-4 w-4" /> {t("delete.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("delete.description")}</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4 gap-2">
              <Trash2 className="h-4 w-4" /> {t("delete.cta")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("delete.dialog_title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("delete.dialog_description_prefix")}
                <strong>{t("delete.confirm_word")}</strong>
                {t("delete.dialog_description_suffix")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={confirmText}
              placeholder={t("delete.confirm_word")}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>
                {t("delete.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText !== t("delete.confirm_word") || deleting}
                onClick={(e) => {
                  e.preventDefault();
                  void removeAccount();
                }}
              >
                {deleting ? t("delete.deleting") : t("delete.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
