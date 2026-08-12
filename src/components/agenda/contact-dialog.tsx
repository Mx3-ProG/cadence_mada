import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Contact } from "@/lib/agenda";
import { planErrorMessage } from "@/lib/plan";

const NO_GENDER = "unspecified";
const GENDERS = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
  { value: "other", label: "Autre" },
];

export function ContactDialog({
  open,
  onOpenChange,
  contact,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: Contact | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    role_title: "",
    notes: "",
    birthday: "",
    gender: NO_GENDER,
    city: "",
    address: "",
    country: "",
    languages: "",
    hobbies: "",
    family_situation: "",
    children_count: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: contact?.name ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      company: contact?.company ?? "",
      role_title: contact?.role_title ?? "",
      notes: contact?.notes ?? "",
      birthday: contact?.birthday ?? "",
      gender: contact?.gender ?? NO_GENDER,
      city: contact?.city ?? "",
      address: contact?.address ?? "",
      country: contact?.country ?? "",
      languages: (contact?.languages ?? []).join(", "),
      hobbies: (contact?.hobbies ?? []).join(", "),
      family_situation: contact?.family_situation ?? "",
      children_count:
        contact?.children_count === null || contact?.children_count === undefined
          ? ""
          : String(contact.children_count),
    });
  }, [open, contact]);

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }

    const toList = (v: string) =>
      v
        .split(",")
        .map((s) => s.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 20);

    const kids = form.children_count.trim() === "" ? null : Number(form.children_count);
    if (kids !== null && (!Number.isFinite(kids) || kids < 0 || kids > 30)) {
      toast.error("Nombre d'enfants invalide.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim().slice(0, 120),
      email: form.email.trim() ? form.email.trim().slice(0, 255) : null,
      phone: form.phone.trim() ? form.phone.trim().slice(0, 40) : null,
      company: form.company.trim() ? form.company.trim().slice(0, 120) : null,
      role_title: form.role_title.trim() ? form.role_title.trim().slice(0, 120) : null,
      notes: form.notes.trim() ? form.notes.trim().slice(0, 4000) : null,
      birthday: form.birthday ? form.birthday : null,
      gender: form.gender === NO_GENDER ? null : form.gender,
      city: form.city.trim() ? form.city.trim().slice(0, 120) : null,
      address: form.address.trim() ? form.address.trim().slice(0, 250) : null,
      country: form.country.trim() ? form.country.trim().slice(0, 120) : null,
      languages: toList(form.languages),
      hobbies: toList(form.hobbies),
      family_situation: form.family_situation.trim()
        ? form.family_situation.trim().slice(0, 250)
        : null,
      children_count: kids,
    };

    if (contact) {
      const { error } = await supabase.from("contacts").update(payload).eq("id", contact.id);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Contact mis à jour");
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setSaving(false);
        toast.error("Session expirée.");
        return;
      }
      const { error } = await supabase.from("contacts").insert({ ...payload, owner_id: uid });
      setSaving(false);
      if (error) {
        toast.error(planErrorMessage(error.message) ?? error.message);
        return;
      }
      toast.success("Contact créé");
    }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact ? "Modifier le contact" : "Nouveau contact"}</DialogTitle>
          <DialogDescription>Les infos utiles pour préparer vos échanges.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="c-name">Nom complet</Label>
            <Input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Camille Dubois"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="camille@exemple.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-phone">Téléphone</Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="c-company">Société</Label>
              <Input
                id="c-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-role">Poste</Label>
              <Input
                id="c-role"
                value={form.role_title}
                onChange={(e) => setForm({ ...form, role_title: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="c-birthday">Date d'anniversaire</Label>
              <Input
                id="c-birthday"
                type="date"
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Sexe</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Non précisé" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GENDER}>Non précisé</SelectItem>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="c-city">Ville</Label>
              <Input
                id="c-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Lyon"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-country">Pays</Label>
              <Input
                id="c-country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="France"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="c-address">Adresse physique</Label>
            <Input
              id="c-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="12 rue de la République"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="c-lang">Langues parlées</Label>
            <Input
              id="c-lang"
              value={form.languages}
              onChange={(e) => setForm({ ...form, languages: e.target.value })}
              placeholder="Français, Anglais, Espagnol"
            />
            <p className="text-xs text-muted-foreground">Sépare par des virgules.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="c-hobbies">Hobbies</Label>
            <Input
              id="c-hobbies"
              value={form.hobbies}
              onChange={(e) => setForm({ ...form, hobbies: e.target.value })}
              placeholder="Trail, cuisine, jazz"
            />
            <p className="text-xs text-muted-foreground">Sépare par des virgules.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="c-family">Famille</Label>
              <Input
                id="c-family"
                value={form.family_situation}
                onChange={(e) => setForm({ ...form, family_situation: e.target.value })}
                placeholder="Mariée, conjoint Paul"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-kids">Nombre d'enfants</Label>
              <Input
                id="c-kids"
                type="number"
                min={0}
                max={30}
                value={form.children_count}
                onChange={(e) => setForm({ ...form, children_count: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea
              id="c-notes"
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Contexte, historique, points à ne pas oublier…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
