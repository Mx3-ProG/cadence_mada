import { useEffect } from "react";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const REDIRECT_DELAY_MS = 2400;

type GuestCompletionRedirectProps = {
  title: string;
  body: string;
  redirectLabel: string;
  locale: string;
};

/** Confirmation finale commune aux parcours publics, avant le retour à l'accueil. */
export function GuestCompletionRedirect({
  title,
  body,
  redirectLabel,
  locale,
}: GuestCompletionRedirectProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.location.assign(`/${locale}`);
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [locale]);

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center py-10 text-center"
    >
      <div className="relative mb-6 grid h-20 w-20 place-items-center">
        {!reduceMotion && (
          <>
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-primary/35"
              initial={{ opacity: 0.8, scale: 0.7 }}
              animate={{ opacity: 0, scale: 1.45 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-primary/15"
              initial={{ opacity: 0.8, scale: 0.75 }}
              animate={{ opacity: 0, scale: 1.25 }}
              transition={{ duration: 0.9, delay: 0.12, ease: "easeOut" }}
            />
          </>
        )}
        <motion.span
          className="relative grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow"
          initial={reduceMotion ? false : { scale: 0.5, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
        >
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.25 }}
          >
            <Check className="h-8 w-8" strokeWidth={3} />
          </motion.span>
        </motion.span>
      </div>

      <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      <p className="mt-7 text-xs font-medium text-muted-foreground">{redirectLabel}</p>
      <div className="mt-2 h-1 w-36 overflow-hidden rounded-full bg-primary/15">
        <motion.div
          aria-hidden="true"
          className="h-full origin-left rounded-full bg-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: REDIRECT_DELAY_MS / 1000, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
