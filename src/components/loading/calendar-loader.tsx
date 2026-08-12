"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Calendrier animé (vert) dont les pages défilent — utilisé pendant les
 * chargements / latences pour faire patienter l'utilisateur.
 */
export function CalendarLoader({
  label = "Chargement de ton agenda…",
  className,
}: {
  label?: string | undefined;
  className?: string | undefined;
}) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setPage((p) => p + 1), 900);
    return () => window.clearInterval(id);
  }, []);

  const month = MONTHS[page % MONTHS.length];
  const offset = page % 7;

  return (
    <div className={`flex flex-col items-center gap-4 ${className ?? ""}`}>
      <div className="relative h-[168px] w-[152px] [perspective:900px]">
        <div className="absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-center rounded-t-2xl bg-primary text-xs font-semibold uppercase tracking-widest text-primary-foreground shadow-glow">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={month}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {month}
            </motion.span>
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          <motion.div
            key={page}
            initial={{ rotateX: -85, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 70, opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "top center" }}
            className="absolute inset-x-0 bottom-0 top-9 rounded-b-2xl border border-primary/25 bg-surface/80 p-3 shadow-lg backdrop-blur"
          >
            <div className="grid grid-cols-7 gap-1 text-[9px] font-medium text-muted-foreground">
              {DAYS.map((d, i) => (
                <span key={`${d}-${i}`} className="text-center">
                  {d}
                </span>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1">
              {Array.from({ length: 28 }).map((_, i) => {
                const active = (i + offset) % 9 === 0;
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0.25 }}
                    animate={{ opacity: active ? 1 : 0.3 }}
                    transition={{ duration: 0.4, delay: i * 0.008 }}
                    className={`h-3.5 rounded-[4px] ${active ? "bg-primary" : "bg-primary/15"}`}
                  />
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        {label}
      </div>
    </div>
  );
}

export function FullPageCalendarLoader({ label }: { label?: string | undefined }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 py-16">
      <CalendarLoader {...(label ? { label } : {})} />
    </div>
  );
}
