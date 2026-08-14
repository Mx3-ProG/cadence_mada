import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addMinutesToTime,
  toDateInputValue,
  toTimeInputValue,
  type Appointment,
  type Contact,
} from "@/lib/agenda";
import { planErrorMessage } from "@/lib/plan";
import { cn } from "@/lib/utils";

const NO_CONTACT = "none";

const DURATIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 h", minutes: 60 },
  { label: "1 h 30", minutes: 90 },
  { label: "2 h", minutes: 120 },
];

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
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    prep_notes: "",
  });
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setForm({
        title: appointment.title,
        contact_id: appointment.contact_id ?? NO_CONTACT,
        date: toDateInputValue(appointment.starts_at),
        startTime: toTimeInputValue(appointment.starts_at),
        endTime: toTimeInputValue(appointment.ends_at),
        location: appointment.location ?? "",
        description: appointment.description ?? "",
        prep_notes: appointment.prep_notes ?? "",
      });
      return;
    }
    const base = defaultDate ? new Date(defaultDate) : new Date();
    if (!defaultDate) base.setMinutes(0, 0, 0);
    else if (base.getHours() === 0 && base.getMinutes() === 0) base.setHours(15, 0, 0, 0);
    const end = new Date(base.getTime() + 60 * 60 * 1000);
    setForm({
      title: "",
      contact_id: presetContactId ?? NO_CONTACT,
      date: toDateInputValue(base.toISOString()),
      startTime: toTimeInputValue(base.toISOString()),
      endTime: toTimeInputValue(end.toISOString()),
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
    if (!form.date) {
      toast.error("Choisis une date.");
      return;
    }
    const start = new Date(`${form.date}T${form.startTime}:00`);
    const end = new Date(`${form.date}T${form.endTime}:00`);
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

          <div className="grid gap-3 rounded-2xl border border-border/70 bg-surface/40 p-3">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 w-full justify-start gap-2 rounded-xl text-left font-normal capitalize",
                      !form.date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
                    {form.date
                      ? format(new Date(`${form.date}T00:00:00`), "EEEE d MMMM yyyy", {
                          locale: fr,
                        })
                      : "Choisir une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.date ? new Date(`${form.date}T00:00:00`) : undefined}
                    onSelect={(d) => {
                      if (!d) return;
                      setForm((f) => ({ ...f, date: toDateInputValue(d.toISOString()) }));
                      setDatePopoverOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="a-start">Début</Label>
                <Input
                  id="a-start"
                  type="time"
                  className="h-11 rounded-xl text-center text-base"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="a-end">Fin</Label>
                <Input
                  id="a-end"
                  type="time"
                  className="h-11 rounded-xl text-center text-base"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, endTime: addMinutesToTime(f.startTime, d.minutes) }))
                  }
                  className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
                >
                  {d.label}
                </button>
              ))}
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
