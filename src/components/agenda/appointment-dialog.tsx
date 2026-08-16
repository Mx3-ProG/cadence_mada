import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateFnsLocale } from "@/i18n/date-fns-locales";
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

const DURATION_MINUTES = [15, 30, 45, 60, 90, 120];

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
  const dateFnsLocale = useDateFnsLocale();
  const { t } = useTranslation("agenda");
  const durationLabels = t("dialog.durations", { returnObjects: true }) as string[];
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
      toast.error(t("dialog.errors.title_required"));
      return;
    }
    if (!form.date) {
      toast.error(t("dialog.errors.date_required"));
      return;
    }
    const start = new Date(`${form.date}T${form.startTime}:00`);
    const end = new Date(`${form.date}T${form.endTime}:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      toast.error(t("dialog.errors.time_invalid"));
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
        toast.error(t("dialog.errors.session_expired"));
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
    toast.success(appointment ? t("dialog.success.updated") : t("dialog.success.created"));
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[1.75rem] border-border/70 p-4 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.65)] sm:max-h-[92dvh] sm:max-w-xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{appointment ? t("dialog.title_edit") : t("dialog.title_new")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="a-title">{t("dialog.title_label")}</Label>
            <Input
              id="a-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("dialog.title_placeholder")}
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <Label>{t("dialog.guests_label")}</Label>
              {form.contact_ids.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("dialog.guests_selected", { count: form.contact_ids.length })}
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
                <User className="h-4 w-4" /> {t("dialog.mode_single")}
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
                <Users className="h-4 w-4" /> {t("dialog.mode_multiple")}
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
                  <SelectValue placeholder={t("dialog.choose_contact")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CONTACT}>{t("dialog.no_contact")}</SelectItem>
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
                    {t("dialog.no_contact_available")}
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

          <div className="grid min-w-0 gap-4 rounded-[1.5rem] border border-border/70 bg-surface/40 p-3.5 sm:p-4">
            <div className="grid gap-2">
              <Label>{t("dialog.date_label")}</Label>
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
                            locale: dateFnsLocale,
                          })
                        : t("dialog.date_placeholder")}
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

            <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 rounded-2xl bg-background/70 p-1.5 ps-3 sm:grid-cols-1 sm:items-stretch sm:gap-2 sm:bg-transparent sm:p-0">
                <Label htmlFor="a-start" className="text-muted-foreground sm:text-foreground">
                  {t("dialog.start_label")}
                </Label>
                <Input
                  id="a-start"
                  type="time"
                  className="h-12 min-w-0 max-w-full rounded-xl border-0 bg-muted/55 px-3 text-center text-base font-semibold tabular-nums shadow-none focus-visible:ring-2 sm:border sm:border-input sm:bg-background/70"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 rounded-2xl bg-background/70 p-1.5 ps-3 sm:grid-cols-1 sm:items-stretch sm:gap-2 sm:bg-transparent sm:p-0">
                <Label htmlFor="a-end" className="text-muted-foreground sm:text-foreground">
                  {t("dialog.end_label")}
                </Label>
                <Input
                  id="a-end"
                  type="time"
                  className="h-12 min-w-0 max-w-full rounded-xl border-0 bg-muted/55 px-3 text-center text-base font-semibold tabular-nums shadow-none focus-visible:ring-2 sm:border sm:border-input sm:bg-background/70"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {DURATION_MINUTES.map((minutes, i) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, endTime: addMinutesToTime(f.startTime, minutes) }))
                  }
                  className="min-h-11 rounded-xl border border-border/70 bg-background/55 px-2 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary active:scale-[0.98]"
                >
                  {durationLabels[i]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="a-loc">{t("dialog.location_label")}</Label>
            <Input
              id="a-loc"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder={t("dialog.location_placeholder")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="a-desc">{t("dialog.description_label")}</Label>
            <Textarea
              id="a-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="a-notes">{t("dialog.notes_label")}</Label>
            <Textarea
              id="a-notes"
              rows={4}
              value={form.prep_notes}
              onChange={(e) => setForm({ ...form, prep_notes: e.target.value })}
              placeholder={t("dialog.notes_placeholder")}
            />
          </div>
        </div>

        <DialogFooter className="sticky -bottom-4 -mx-4 -mb-4 grid grid-cols-2 gap-2 border-t border-border/70 bg-background/90 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-xl sm:static sm:mx-0 sm:mb-0 sm:flex sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0">
          <Button className="h-11 rounded-xl" variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialog.cancel")}
          </Button>
          <Button className="h-11 rounded-xl" onClick={submit} disabled={saving}>
            {saving ? t("dialog.saving") : t("dialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
