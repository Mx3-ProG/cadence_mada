import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useLocale } from "@/i18n/use-locale";
import { trackEvent } from "@/lib/analytics";
import { estimateMonthlyScheduledValue, estimateWeeklyScheduledValue } from "@/lib/roi-calculator";
import { TIER_PRICES } from "@/lib/plan";

const DEBOUNCE_MS = 400;

export function RoiCalculator() {
  const locale = useLocale();
  const { t, i18n } = useTranslation("home");
  const [appointmentsPerWeek, setAppointmentsPerWeek] = useState(25);
  const [averageValue, setAverageValue] = useState(100);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekly = useMemo(
    () => estimateWeeklyScheduledValue({ appointmentsPerWeek, averageValue }),
    [appointmentsPerWeek, averageValue],
  );
  const monthly = useMemo(
    () => estimateMonthlyScheduledValue({ appointmentsPerWeek, averageValue }),
    [appointmentsPerWeek, averageValue],
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  const scheduleInteractionEvent = (next: {
    appointmentsPerWeek: number;
    averageValue: number;
  }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      trackEvent("roi_calculator_interaction", {
        appointments_per_week: next.appointmentsPerWeek,
        average_value: next.averageValue,
        estimated_monthly: estimateMonthlyScheduledValue(next),
      });
    }, DEBOUNCE_MS);
  };

  return (
    <section className="px-4 pb-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/70 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("roi.badge")}
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t("roi.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
              {t("roi.subtitle")}
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-panel mt-10 rounded-3xl p-6 shadow-glow sm:p-8">
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="roi-appointments" className="text-sm font-medium">
                    {t("roi.input_appointments_label")}
                  </label>
                  <span className="font-display text-lg font-bold text-primary">
                    {appointmentsPerWeek}
                  </span>
                </div>
                <Slider
                  id="roi-appointments"
                  className="mt-4"
                  min={1}
                  max={100}
                  step={1}
                  value={[appointmentsPerWeek]}
                  onValueChange={([value]) => {
                    const next = value ?? appointmentsPerWeek;
                    setAppointmentsPerWeek(next);
                    scheduleInteractionEvent({ appointmentsPerWeek: next, averageValue });
                  }}
                />
              </div>

              <div>
                <label htmlFor="roi-value" className="text-sm font-medium">
                  {t("roi.input_value_label")}
                </label>
                <Input
                  id="roi-value"
                  type="number"
                  min={0}
                  step={5}
                  inputMode="decimal"
                  className="mt-4"
                  value={averageValue}
                  onChange={(event) => {
                    const next = Number(event.target.value) || 0;
                    setAverageValue(next);
                    scheduleInteractionEvent({ appointmentsPerWeek, averageValue: next });
                  }}
                />
              </div>
            </div>

            <div className="mt-8 min-h-24 rounded-2xl border border-border/60 bg-surface/60 p-6 text-center">
              <p className="font-display text-3xl font-black tracking-tight text-gradient sm:text-4xl">
                {formatCurrency(weekly)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{t("roi.result_weekly_label")}</p>
              <p className="mt-3 text-sm text-foreground/80">
                {formatCurrency(monthly)} {t("roi.result_monthly_label")}
              </p>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground/70">
              {t("roi.disclaimer")}
            </p>

            <p className="mx-auto mt-6 max-w-md text-center text-sm text-muted-foreground">
              {t("roi.plan_hint", { price: TIER_PRICES.standard })}
            </p>

            <div className="mt-6 flex justify-center">
              <Button
                asChild
                size="lg"
                className="gap-2"
                onClick={() => trackEvent("signup_started")}
              >
                <Link to="/$locale/auth" params={{ locale }}>
                  {t("roi.cta")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
