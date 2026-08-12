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
import { toLocalInputValue, type Appointment, type Contact } from "@/lib/agenda";
import { planErrorMessage } from "@/lib/plan";

const NO_CONTACT = "none";

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  contacts,
  defaultDate,
  presetContactId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: Appointment | null;
  contacts: Contact[];
  defaultDate: Date | null;
  presetContactId?: string | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    contact_id: NO_CONTACT,
    starts_at: "",
    ends_at: "",
    location: "",
    description: "",
    prep_notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setForm({
        title: appointment.title,
        contact_id: appointment.contact_id ?? NO_CONTACT,
        starts_at: toLocalInputValue(appointment.starts_at),
        ends_at: toLocalInputValue(appointment.ends_at),
        location: appointment.location ?? "",
        description: appointment.description ?? "",
        prep_notes: appointment.prep_notes ?? "",
      });
      return;
    }
    const base = defaultDate ? new Date(defaultDate) : new Date();
    if (!defaultDate) base.setMinutes(0, 0, 0);
    else base.setHours(15, 0, 0, 0);
    const end = new Date(base.getTime() + 60 * 60 * 1000);
    setForm({
      title: "",
      contact_id: presetContactId ?? NO_CONTACT,
      starts_at: toLocalInputValue(base.toISOString()),
      ends_at: toLocalInputValue(end.toISOString()),
      location: "",
      description: "",
      prep_notes: "",
    });
  }, [open, appointment, defaultDate, presetContactId]);

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error("Donne un titre au rendez-vous.");
      return;
    }
    const start = new Date(form.starts_at);
    const end = new Date(form.ends_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast.error("Vérifie les horaires : la fin doit suivre le début.");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim().slice(0, 150),
      contact_id: form.contact_id === NO_CONTACT ? null : form.contact_id,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      location: form.location.trim() ? form.location.trim().slice(0, 200) : null,
      description: form.description.trim() ? form.description.trim().slice(0, 2000) : null,
      prep_notes: form.prep_notes.trim() ? form.prep_notes.trim().slice(0, 4000) : null,
    };

    if (appointment) {
      const { error } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", appointment.id);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Rendez-vous mis à jour");
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setSaving(false);
        toast.error("Session expirée.");
        return;
      }
      const { error } = await supabase.from("appointments").insert({ ...payload, owner_id: uid });
      setSaving(false);
      if (error) {
        toast.error(planErrorMessage(error.message) ?? error.message);
        return;
      }
      toast.success("Rendez-vous créé");
    }
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription>
            Une fois créé, tu pourras envoyer le lien de confirmation à ton invité.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="a-title">Titre</Label>
            <Input
              id="a-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Point stratégie Q3"
            />
          </div>

          <div className="grid gap-2">
            <Label>Contact</Label>
            <Select
              value={form.contact_id}
              onValueChange={(v) => setForm({ ...form, contact_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CONTACT}>Aucun contact</SelectItem>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` — ${c.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="a-start">Début</Label>
              <Input
                id="a-start"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="a-end">Fin</Label>
              <Input
                id="a-end"
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="a-loc">Lieu / lien visio</Label>
            <Input
              id="a-loc"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Bureau, café, visio…"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="a-desc">Description (visible par l'invité)</Label>
            <Textarea
              id="a-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="a-notes">Notes privées — de quoi parler</Label>
            <Textarea
              id="a-notes"
              rows={4}
              value={form.prep_notes}
              onChange={(e) => setForm({ ...form, prep_notes: e.target.value })}
              placeholder="Points à aborder, objections attendues, objectif de la réunion…"
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
