"use client";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

type PreviewItem = { day: string; time: string; title: string; status: "accepted" | "pending" };

/**
 * The hero's "show, don't tell" visual: a small week glance where the one
 * pending appointment flips to confirmed once the card enters view. This is
 * meant to communicate the product's core mechanic in a few seconds, without
 * a paragraph of copy.
 */
export function AppointmentPreview({ items }: { items: PreviewItem[] }) {
  const { t } = useTranslation("home");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reducedMotion = useReducedMotion();
  const pendingIndex = items.findIndex((item) => item.status === "pending");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!inView || pendingIndex === -1) return;
    if (reducedMotion) {
      setConfirmed(true);
      return;
    }
    const timer = setTimeout(() => setConfirmed(true), 1100);
    return () => clearTimeout(timer);
  }, [inView, pendingIndex, reducedMotion]);

  return (
    <div
      ref={ref}
      className="glass-panel mx-auto mt-16 max-w-4xl rounded-3xl p-4 shadow-glow sm:p-6"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item, i) => {
          const isPendingCard = i === pendingIndex;
          const status = isPendingCard && confirmed ? "accepted" : item.status;
          return (
            <motion.div
              key={item.title}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.1 * i }}
              className="rounded-2xl border border-border/70 bg-surface/70 p-4 text-left"
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{item.day}</p>
              <p className="mt-1 font-display text-lg font-bold">{item.time}</p>
              <p className="mt-1 truncate text-sm">{item.title}</p>
              <motion.p
                key={status}
                initial={reducedMotion ? undefined : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  status === "accepted"
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning"
                }`}
              >
                <Check className="h-3 w-3" /> {t(`preview.status.${status}`)}
              </motion.p>
              {isPendingCard && confirmed && (
                <motion.p
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="mt-2 text-xs text-muted-foreground"
                >
                  {t("preview.confirmed_toast", { name: item.title })}
                </motion.p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
