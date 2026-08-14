import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Lock, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BookingHourPickerDialog } from "@/components/agenda/booking-hour-picker-dialog";
import { bookingUrl, defaultBookingHours, generateBookingSlug, slugify } from "@/lib/agenda";
import {
  hasFeatureAccess,
  tierPricingHash,
  TIER_LABELS,
  TIER_PRICES,
  usePlanUsage,
} from "@/lib/plan";

const BOOKING_MIN_TIER = "standard" as const;

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
  const planQuery = usePlanUsage();
  const hasBooking = hasFeatureAccess(planQuery.data, BOOKING_MIN_TIER);
  const [form, setForm] = useState<BookingSettingsForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pickerWeekday, setPickerWeekday] = useState<number | null>(null);

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
    const slug = form.slug.trim()
      ? slugify(form.slug)
      : generateBookingSlug(profile?.full_name || profile?.email?.split("@")[0] || "agenda");

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
    if (error) {
      setSaving(false);
      toast.error(
        error.message.includes("duplicate") || error.message.includes("unique")
          ? "Ce lien est déjà pris, choisis-en un autre."
          : error.message,
      );
      return;
    }

    const { count } = await supabase
      .from("booking_hours")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", id);
    if (!count) {
      await supabase
        .from("booking_hours")
        .insert(defaultBookingHours().map((h) => ({ ...h, owner_id: id })));
      void queryClient.invalidateQueries({ queryKey: ["booking-hours"] });
    }

    setSaving(false);
    toast.success("Réglages enregistrés");
    void queryClient.invalidateQueries({ queryKey: ["booking-settings"] });
  };

  const addHour = async (weekday: number, range: { start: string; end: string }) => {
    const { data: auth } = await supabase.auth.getUser();
    const id = auth.user?.id;
    if (!id) return;
    const { error } = await supabase.from("booking_hours").insert({
      owner_id: id,
      weekday,
      start_time: range.start,
      end_time: range.end,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPickerWeekday(null);
    toast.success("Créneau ajouté");
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
    <section className="glass-panel min-w-0 overflow-hidden rounded-3xl p-4 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <CalendarClock className="h-4 w-4 text-primary" /> Lien de réservation
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Configure le lien public que tes contacts utilisent pour réserver eux-mêmes un créneau dans
        ton agenda.
      </p>

      {!hasBooking && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Le lien de réservation est réservé au plan{" "}
              <strong>{TIER_LABELS[BOOKING_MIN_TIER]}</strong> ({TIER_PRICES[BOOKING_MIN_TIER]}
              /mois) et plus.
            </span>
          </p>
          <Button asChild className="gap-2 sm:shrink-0">
            <Link to="/tarifs" hash={tierPricingHash(BOOKING_MIN_TIER)}>
              <Sparkles className="h-4 w-4" />
              Voir l’offre {TIER_LABELS[BOOKING_MIN_TIER]}
            </Link>
          </Button>
        </div>
      )}

      <fieldset disabled={!hasBooking} className="min-w-0 disabled:opacity-60">
        <div className="mt-5 grid min-w-0 gap-4">
          <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface/40 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">Lien actif</p>
              <p className="truncate text-xs text-muted-foreground">
                {form.slug ? bookingUrl(form.slug) : "Sera généré à l'enregistrement"}
              </p>
            </div>
            <Switch
              className="shrink-0"
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="booking-slug">Adresse du lien</Label>
            <Input
              id="booking-slug"
              value={form.slug}
              placeholder="mon-agenda"
              onChange={(e) => set("slug", e.target.value)}
              onBlur={(e) => e.target.value.trim() && set("slug", slugify(e.target.value))}
            />
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-3">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="slot-duration">Durée des créneaux (min)</Label>
              <Input
                id="slot-duration"
                inputMode="numeric"
                value={form.slot_duration_minutes}
                onChange={(e) => set("slot_duration_minutes", e.target.value)}
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="min-notice">Préavis minimum (heures)</Label>
              <Input
                id="min-notice"
                inputMode="numeric"
                value={form.min_notice_hours}
                onChange={(e) => set("min_notice_hours", e.target.value)}
              />
            </div>
            <div className="grid min-w-0 gap-2">
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

        <div className="mt-8 border-t border-border/70 pt-6">
          <h3 className="font-display text-base font-semibold">Horaires disponibles</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Par défaut : 07h30–12h00 et 13h00–20h30, tous les jours. Clique sur « Ajouter un créneau
            » pour glisser un nouvel horaire sur chaque jour — aucune limite, une journée peut être
            ouverte en continu de 00h à 24h.
          </p>
          <div className="mt-4 grid gap-3">
            {WEEKDAYS.map(({ value, label }) => {
              const dayHours = hours.filter((h) => h.weekday === value);
              return (
                <div
                  key={value}
                  className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-surface/40 p-3 transition-colors hover:border-border sm:p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{label}</p>
                    {dayHours.length === 0 && (
                      <span className="text-xs text-muted-foreground">Aucun créneau</span>
                    )}
                  </div>

                  {dayHours.length > 0 && (
                    <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                      {dayHours.map((h) => (
                        <span
                          key={h.id}
                          className="flex max-w-full min-w-0 items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm shadow-sm ring-1 ring-border/60"
                        >
                          {h.start_time.slice(0, 5)}–
                          {h.end_time.slice(0, 5) === "23:59" ? "24:00" : h.end_time.slice(0, 5)}
                          <button
                            type="button"
                            aria-label={`Supprimer ${h.start_time.slice(0, 5)}–${h.end_time.slice(0, 5)}`}
                            onClick={() => removeHour(h.id)}
                            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => setPickerWeekday(value)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un créneau
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </fieldset>

      <BookingHourPickerDialog
        open={pickerWeekday !== null}
        onOpenChange={(o) => !o && setPickerWeekday(null)}
        dayLabel={WEEKDAYS.find((w) => w.value === pickerWeekday)?.label ?? ""}
        onConfirm={(range) => {
          if (pickerWeekday !== null) void addHour(pickerWeekday, range);
        }}
      />
    </section>
  );
}
