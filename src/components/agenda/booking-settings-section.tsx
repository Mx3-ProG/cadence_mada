import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { bookingUrl, generateBookingSlug } from "@/lib/agenda";

const WEEKDAYS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

type BookingSettingsForm = {
  slug: string;
  enabled: boolean;
  slot_duration_minutes: string;
  min_notice_hours: string;
  booking_window_days: string;
};

const emptyForm: BookingSettingsForm = {
  slug: "",
  enabled: false,
  slot_duration_minutes: "30",
  min_notice_hours: "24",
  booking_window_days: "30",
};

export function BookingSettingsSection() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BookingSettingsForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newHour, setNewHour] = useState<Record<number, { start: string; end: string }>>({});

  const settingsQuery = useQuery({
    queryKey: ["booking-settings"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) return null;
      const { data, error } = await supabase
        .from("booking_settings")
        .select("slug, enabled, slot_duration_minutes, min_notice_hours, booking_window_days")
        .eq("owner_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const hoursQuery = useQuery({
    queryKey: ["booking-hours"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) return [];
      const { data, error } = await supabase
        .from("booking_hours")
        .select("id, weekday, start_time, end_time")
        .eq("owner_id", id)
        .order("weekday")
        .order("start_time");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setForm({
      slug: s.slug ?? "",
      enabled: s.enabled,
      slot_duration_minutes: String(s.slot_duration_minutes),
      min_notice_hours: String(s.min_notice_hours),
      booking_window_days: String(s.booking_window_days),
    });
  }, [settingsQuery.data]);

  const set = (key: keyof BookingSettingsForm, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    const slotDuration = Number(form.slot_duration_minutes);
    const minNotice = Number(form.min_notice_hours);
    const window = Number(form.booking_window_days);
    if (!Number.isFinite(slotDuration) || slotDuration <= 0) {
      toast.error("La durée des créneaux doit être un nombre positif.");
      return;
    }
    if (!Number.isFinite(minNotice) || minNotice < 0) {
      toast.error("Le préavis minimum est invalide.");
      return;
    }
    if (!Number.isFinite(window) || window <= 0) {
      toast.error("La fenêtre de réservation doit être un nombre de jours positif.");
      return;
    }

    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id;
    if (!id) {
      setSaving(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", id)
      .maybeSingle();
    const slug =
      form.slug.trim() ||
      generateBookingSlug(profile?.full_name || profile?.email?.split("@")[0] || "agenda");

    const { error } = await supabase.from("booking_settings").upsert(
      {
        owner_id: id,
        slug,
        enabled: form.enabled,
        slot_duration_minutes: slotDuration,
        min_notice_hours: minNotice,
        booking_window_days: window,
      },
      { onConflict: "owner_id" },
    );
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate") || error.message.includes("unique")
          ? "Ce lien est déjà pris, choisis-en un autre."
          : error.message,
      );
      return;
    }
    toast.success("Réglages enregistrés");
    void queryClient.invalidateQueries({ queryKey: ["booking-settings"] });
  };

  const addHour = async (weekday: number) => {
    const draft = newHour[weekday];
    if (!draft?.start || !draft?.end) return;
    if (draft.end <= draft.start) {
      toast.error("L'heure de fin doit être après l'heure de début.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id;
    if (!id) return;
    const { error } = await supabase.from("booking_hours").insert({
      owner_id: id,
      weekday,
      start_time: draft.start,
      end_time: draft.end,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewHour((h) => ({ ...h, [weekday]: { start: "", end: "" } }));
    void queryClient.invalidateQueries({ queryKey: ["booking-hours"] });
  };

  const removeHour = async (id: string) => {
    const { error } = await supabase.from("booking_hours").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["booking-hours"] });
  };

  const hours = hoursQuery.data ?? [];

  return (
    <section className="glass-panel rounded-2xl p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <CalendarClock className="h-4 w-4 text-primary" /> Lien de réservation
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure le lien public que tes contacts utilisent pour réserver eux-mêmes un créneau dans
        ton agenda.
      </p>

      <div className="mt-4 grid gap-4">
        <div className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Lien actif</p>
            <p className="text-xs text-muted-foreground">
              {form.slug ? bookingUrl(form.slug) : "Sera généré à l'enregistrement"}
            </p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="booking-slug">Adresse du lien</Label>
          <Input
            id="booking-slug"
            value={form.slug}
            placeholder="mon-agenda"
            onChange={(e) => set("slug", e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="slot-duration">Durée des créneaux (min)</Label>
            <Input
              id="slot-duration"
              inputMode="numeric"
              value={form.slot_duration_minutes}
              onChange={(e) => set("slot_duration_minutes", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="min-notice">Préavis minimum (heures)</Label>
            <Input
              id="min-notice"
              inputMode="numeric"
              value={form.min_notice_hours}
              onChange={(e) => set("min_notice_hours", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking-window">Fenêtre de réservation (jours)</Label>
            <Input
              id="booking-window"
              inputMode="numeric"
              value={form.booking_window_days}
              onChange={(e) => set("booking_window_days", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="mt-6 border-t border-border/70 pt-5">
        <h3 className="text-sm font-semibold">Horaires disponibles</h3>
        <div className="mt-3 grid gap-3">
          {WEEKDAYS.map(({ value, label }) => {
            const dayHours = hours.filter((h) => h.weekday === value);
            const draft = newHour[value] ?? { start: "", end: "" };
            return (
              <div key={value} className="rounded-xl border border-border/70 px-4 py-3">
                <p className="text-sm font-medium">{label}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {dayHours.map((h) => (
                    <span
                      key={h.id}
                      className="flex items-center gap-1.5 rounded-full bg-surface/70 px-2.5 py-1 text-xs"
                    >
                      {h.start_time.slice(0, 5)}–{h.end_time.slice(0, 5)}
                      <button
                        type="button"
                        aria-label="Supprimer"
                        onClick={() => removeHour(h.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <Input
                    type="time"
                    className="h-7 w-24 px-2 text-xs"
                    value={draft.start}
                    onChange={(e) =>
                      setNewHour((h) => ({ ...h, [value]: { ...draft, start: e.target.value } }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input
                    type="time"
                    className="h-7 w-24 px-2 text-xs"
                    value={draft.end}
                    onChange={(e) =>
                      setNewHour((h) => ({ ...h, [value]: { ...draft, end: e.target.value } }))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Ajouter une plage"
                    onClick={() => addHour(value)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
