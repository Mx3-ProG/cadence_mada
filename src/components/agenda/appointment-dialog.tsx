import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Check, User, Users } from "lucide-react";
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
    contact_ids: [] as string[],
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
      const contactIds =
        appointment.invitations?.map((invitation) => invitation.contact_id) ??
        (appointment.contact_id ? [appointment.contact_id] : []);
      setForm({
        title: appointment.title,
        contact_ids: contactIds,
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
      contact_ids: presetContactId ? [presetContactId] : [],
      date: toDateInputValue(base.toISOString()),
      startTime: toTimeInputValue(base.toISOString()),
      endTime: toTimeInputValue(end.toISOString()),
      location: "",
      description: "",
      prep_notes: "",
    });
  }, [open, appointment, defaultDate, presetContactId]);

  const [contactMode, setContactMode] = useState<"single" | "multiple">("single");

  useEffect(() => {
    if (!open) return;
    const count = appointment?.invitations?.length ?? (appointment?.contact_id ? 1 : 0);
    setContactMode(count > 1 ? "multiple" : "single");
  }, [open, appointment]);

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
      // Conservé pour les écrans et intégrations historiques : le premier invité est le contact principal.
      contact_id: form.contact_ids[0] ?? null,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      location: form.location.trim() ? form.location.trim().slice(0, 200) : null,
      description: form.description.trim() ? form.description.trim().slice(0, 2000) : null,
      prep_notes: form.prep_notes.trim() ? form.prep_notes.trim().slice(0, 4000) : null,
    };

    let appointmentId = appointment?.id;
    if (appointment) {
      const { error } = await supabase
        .from("appointments")
        .update(payload)
        .eq("id", appointment.id);
      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setSaving(false);
        toast.error("Session expirée.");
        return;
      }
      const { data, error } = await supabase
        .from("appointments")
        .insert({ ...payload, owner_id: uid })
        .select("id")
        .single();
      if (error) {
        setSaving(false);
        toast.error(planErrorMessage(error.message) ?? error.message);
        return;
      }
      appointmentId = data.id;
    }

    if (appointmentId) {
      const { data: existing, error: existingError } = await supabase
        .from("appointment_invites")
        .select("contact_id")
        .eq("appointment_id", appointmentId);
      if (existingError) {
        setSaving(false);
        toast.error(existingError.message);
        return;
      }

      const selectedIds = new Set(form.contact_ids);
      const existingIds = new Set((existing ?? []).map((invite) => invite.contact_id));
      const removedIds = [...existingIds].filter((id) => !selectedIds.has(id));
      const addedIds = [...selectedIds].filter((id) => !existingIds.has(id));

      if (removedIds.length) {
        const { error } = await supabase
          .from("appointment_invites")
          .delete()
          .eq("appointment_id", appointmentId)
          .in("contact_id", removedIds);
        if (error) {
          setSaving(false);
          toast.error(error.message);
          return;
        }
      }
      if (addedIds.length) {
        const { error } = await supabase.from("appointment_invites").insert(
          addedIds.map((contactId) => ({
            appointment_id: appointmentId!,
            contact_id: contactId,
          })),
        );
        if (error) {
          setSaving(false);
          toast.error(error.message);
          return;
        }
      }
    }

    setSaving(false);
    toast.success(appointment ? "Rendez-vous mis à jour" : "Rendez-vous créé");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}
          </DialogTitle>
          <DialogDescription>
            Une fois créé, tu pourras prévenir tous les invités en un clic.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="a-title">Titre</Label>
            <Input
              id="a-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Point stratégie Q3"
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Invités</Label>
              {form.contact_ids.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {form.contact_ids.length} sélectionné{form.contact_ids.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-1">
              <button
                type="button"
                onClick={() => {
                  setContactMode("single");
                  setForm((current) => ({
                    ...current,
                    contact_ids: current.contact_ids.slice(0, 1),
                  }));
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  contactMode === "single"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <User className="h-4 w-4" /> Un contact
              </button>
              <button
                type="button"
                onClick={() => setContactMode("multiple")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  contactMode === "multiple"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <Users className="h-4 w-4" /> Plusieurs
              </button>
            </div>

            {contactMode === "single" ? (
              <Select
                value={form.contact_ids[0] ?? NO_CONTACT}
                onValueChange={(value) =>
                  setForm({ ...form, contact_ids: value === NO_CONTACT ? [] : [value] })
                }
              >
                <SelectTrigger className="min-w-0">
                  <SelectValue placeholder="Choisir un contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CONTACT}>Aucun contact</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name}
                      {contact.company ? ` — ${contact.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-border/70 p-1">
                {contacts.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Aucun contact disponible.
                  </p>
                ) : (
                  contacts.map((contact) => {
                    const selected = form.contact_ids.includes(contact.id);
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            contact_ids: selected
                              ? current.contact_ids.filter((id) => id !== contact.id)
                              : [...current.contact_ids, contact.id],
                          }))
                        }
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted/70"
                      >
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded border",
                            selected && "border-primary bg-primary text-primary-foreground",
                          )}
                        >
                          {selected && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{contact.name}</span>
                          {contact.company && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {contact.company}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="grid min-w-0 gap-3 rounded-2xl border border-border/70 bg-surface/40 p-3">
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
                    <span className="min-w-0 truncate">
                      {form.date
                        ? format(new Date(`${form.date}T00:00:00`), "EEEE d MMMM yyyy", {
                            locale: fr,
                          })
                        : "Choisir une date"}
                    </span>
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

            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:gap-3">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="a-start">Début</Label>
                <Input
                  id="a-start"
                  type="time"
                  className="h-11 min-w-0 rounded-xl px-2 text-center text-base"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="a-end">Fin</Label>
                <Input
                  id="a-end"
                  type="time"
                  className="h-11 min-w-0 rounded-xl px-2 text-center text-base"
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
