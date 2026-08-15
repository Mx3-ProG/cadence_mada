import { Check, Clock, X, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/agenda";

const styles: Record<AppointmentStatus, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  accepted: "bg-success/15 text-success border-success/30",
  declined: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const icons: Record<AppointmentStatus, typeof Check> = {
  pending: Clock,
  accepted: Check,
  declined: X,
  cancelled: Ban,
};

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const { t } = useTranslation("agenda");
  const Icon = icons[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        styles[status],
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {t(`status.${status}`)}
    </span>
  );
}
