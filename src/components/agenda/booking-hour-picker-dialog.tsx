import { useEffect, useState } from "react";
import { Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DAY_MAX_MINUTES = 24 * 60;
const STEP_MINUTES = 15;
const DEFAULT_RANGE: [number, number] = [9 * 60, 18 * 60];

function formatMinutes(total: number) {
  if (total >= DAY_MAX_MINUTES) return "24:00";
  const clamped = Math.min(DAY_MAX_MINUTES, Math.max(0, total));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Le type `time` de Postgres n'a pas de 24:00 : une journée complète est plafonnée à 23:59
 * et traitée comme "jusqu'à minuit" par le calcul des créneaux (voir rangeEndOnDate). */
function minutesToTimeValue(total: number) {
  if (total >= DAY_MAX_MINUTES) return "23:59";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Pop-up de sélection d'un créneau horaire par glissement, sur une frise 24h. */
export function BookingHourPickerDialog({
  open,
  onOpenChange,
  dayLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayLabel: string;
  onConfirm: (range: { start: string; end: string }) => void;
}) {
  const [range, setRange] = useState<[number, number]>(DEFAULT_RANGE);

  useEffect(() => {
    if (open) setRange(DEFAULT_RANGE);
  }, [open]);

  const [start, end] = range;
  const isFullDay = start === 0 && end >= DAY_MAX_MINUTES;

  const confirm = () => {
    if (end <= start) return;
    onConfirm({ start: minutesToTimeValue(start), end: minutesToTimeValue(end) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Nouveau créneau — {dayLabel}
          </DialogTitle>
          <DialogDescription>
            Fais glisser les poignées pour choisir l'heure de début et de fin.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex items-baseline justify-center gap-3">
            <span className="font-display text-3xl font-black tabular-nums tracking-tight">
              {formatMinutes(start)}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-display text-3xl font-black tabular-nums tracking-tight">
              {formatMinutes(end)}
            </span>
          </div>

          <Slider
            className="mt-8"
            min={0}
            max={DAY_MAX_MINUTES}
            step={STEP_MINUTES}
            minStepsBetweenThumbs={1}
            value={range}
            onValueChange={(v) => setRange([v[0] ?? 0, v[1] ?? DAY_MAX_MINUTES])}
          />

          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>

          <Button
            type="button"
            variant={isFullDay ? "default" : "outline"}
            size="sm"
            className="mt-6 w-full gap-2"
            onClick={() => setRange([0, DAY_MAX_MINUTES])}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Toute la journée — 00h à 24h
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={confirm}>
            Ajouter ce créneau
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
