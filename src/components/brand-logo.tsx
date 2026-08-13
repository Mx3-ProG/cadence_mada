import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  decorative?: boolean;
};

export function BrandMark({ className, decorative = true }: BrandMarkProps) {
  return (
    <img
      src="/brand/cadence-mark.svg"
      alt={decorative ? "" : "Cadence"}
      aria-hidden={decorative || undefined}
      className={cn("shrink-0", className)}
    />
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <BrandMark className="h-9 w-9" />
      <span className="truncate font-display text-lg font-bold tracking-tight">Cadence</span>
    </span>
  );
}
