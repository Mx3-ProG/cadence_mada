import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { getTierProgress } from "@/lib/referral";
import { cn } from "@/lib/utils";

export function ReferralTierGauge({
  icon,
  title,
  value,
  boundaries,
  labels,
  formatValue,
  accentClassName,
}: {
  icon: ReactNode;
  title: string;
  value: number;
  boundaries: number[];
  labels: string[];
  formatValue: (value: number) => string;
  accentClassName?: string;
}) {
  const tier = getTierProgress(value, boundaries, labels);

  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          {icon} {title}
        </p>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {tier.label}
        </span>
      </div>

      <p className="mt-3 font-display text-2xl font-bold tracking-tight">{formatValue(value)}</p>

      <Progress
        value={tier.progressPercent}
        className={cn("mt-3 h-2.5 shadow-[0_0_12px_-2px] shadow-primary/40", accentClassName)}
      />

      <p className="mt-2 text-xs text-muted-foreground">
        {tier.ceiling === null
          ? "Palier maximum atteint 🎉"
          : `Prochain palier : ${formatValue(tier.ceiling)}`}
      </p>
    </div>
  );
}
