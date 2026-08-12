import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      return { id: user.id, email: user.email ?? "", fullName: data?.full_name ?? "" };
    },
  });

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!accountQuery.data) return;
    setFullName(accountQuery.data.fullName);
    setEmail(accountQuery.data.email);
  }, [accountQuery.data]);

  const saveProfile = async () => {
    const id = accountQuery.data?.id;
    if (!id) return;
    if (!fullName.trim()) {
      toast.error("Renseigne un nom.");
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", id);

    let authError: string | null = null;
    if (email.trim() && email.trim() !== accountQuery.data?.email) {
      const { error: e } = await supabase.auth.updateUser({ email: email.trim() });
      authError = e?.message ?? null;
    }
    setSavingProfile(false);

    if (error || authError) {
      toast.error(error?.message ?? authError ?? "Erreur");
      return;
    }
    toast.success(
      email.trim() !== accountQuery.data?.email
        ? "Profil enregistré. Confirme la nouvelle adresse par email."
        : "Profil enregistré",
    );
    void queryClient.invalidateQueries({ queryKey: ["account-profile"] });
  };

  const changePassword = async () => {
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas.");
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
    toast.success("Mot de passe mis à jour");
  };

  const removeAccount = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      queryClient.clear();
      toast.success("Compte et données supprimés définitivement.");
      void navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <UserRound className="h-4 w-4 text-primary" /> Mon compte
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="account_name">Nom affiché</Label>
            <Input
              id="account_name"
              value={fullName}
              placeholder="Camille Dupont"
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="account_email">Adresse email</Label>
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
          Enregistrer mes informations
        </Button>
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <KeyRound className="h-4 w-4 text-primary" /> Mot de passe
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <Input
              id="new_password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm_password">Confirmation</Label>
            <Input
              id="confirm_password"
              type="password"
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
          Changer mon mot de passe
        </Button>
      </section>

      <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-destructive">
          <Trash2 className="h-4 w-4" /> Supprimer mon compte
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Suppression définitive et immédiate : profil, contacts, rendez-vous, invitations et
          statistiques. Cette action est irréversible.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="mt-4 gap-2">
              <Trash2 className="h-4 w-4" /> Supprimer définitivement
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ton compte pour toujours ?</AlertDialogTitle>
              <AlertDialogDescription>
                Toutes tes données seront effacées de la base. Écris <strong>SUPPRIMER</strong> pour
                confirmer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={confirmText}
              placeholder="SUPPRIMER"
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText("")}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText !== "SUPPRIMER" || deleting}
                onClick={(e) => {
                  e.preventDefault();
                  void removeAccount();
                }}
              >
                {deleting ? "Suppression…" : "Supprimer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
