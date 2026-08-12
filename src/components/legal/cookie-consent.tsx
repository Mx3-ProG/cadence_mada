import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "cadence.cookie-consent.v1";

export type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  date: string;
};

export function readCookieConsent(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CookiePreferences) : null;
  } catch {
    return null;
  }
}

function save(prefs: Omit<CookiePreferences, "date" | "necessary">) {
  const value: CookiePreferences = { necessary: true, ...prefs, date: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("cadence:cookie-consent", { detail: value }));
}

export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent("cadence:open-cookie-settings"));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readCookieConsent();
    if (!existing) setVisible(true);
    else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
    const open = () => {
      const current = readCookieConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setDetails(true);
      setVisible(true);
    };
    window.addEventListener("cadence:open-cookie-settings", open);
    return () => window.removeEventListener("cadence:open-cookie-settings", open);
  }, []);

  const close = () => {
    setVisible(false);
    setDetails(false);
  };

  const acceptAll = () => {
    save({ analytics: true, marketing: true });
    close();
  };
  const refuseAll = () => {
    save({ analytics: false, marketing: false });
    close();
  };
  const saveChoice = () => {
    save({ analytics, marketing });
    close();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          role="dialog"
          aria-label="Gestion des cookies"
          className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-4 sm:pb-4"
        >
          <div className="glass-panel mx-auto max-w-3xl rounded-2xl border border-border/70 bg-background/95 p-4 shadow-xl backdrop-blur-xl sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                <Cookie className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-sm font-bold">On respecte ta vie privée</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Cadence utilise des cookies strictement nécessaires au fonctionnement (session,
                  sécurité). Les cookies de mesure d'audience et marketing ne sont déposés qu'avec
                  ton accord, conformément au RGPD.{" "}
                  <Link
                    to="/cookies"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    En savoir plus
                  </Link>
                </p>
              </div>
              <button
                type="button"
                onClick={refuseAll}
                aria-label="Fermer et refuser les cookies optionnels"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {details && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
                    <Row
                      title="Strictement nécessaires"
                      text="Authentification, sécurité, préférence de thème. Toujours actifs."
                      checked
                      disabled
                    />
                    <Row
                      title="Mesure d'audience"
                      text="Statistiques anonymisées d'utilisation pour améliorer le produit."
                      checked={analytics}
                      onChange={setAnalytics}
                    />
                    <Row
                      title="Marketing"
                      text="Personnalisation des contenus et campagnes. Aucun dépôt sans accord."
                      checked={marketing}
                      onChange={setMarketing}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => setDetails((d) => !d)}
              >
                {details ? "Masquer les détails" : "Personnaliser"}
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={refuseAll}>
                Tout refuser
              </Button>
              {details && (
                <Button variant="outline" size="sm" className="rounded-full" onClick={saveChoice}>
                  Enregistrer mes choix
                </Button>
              )}
              <Button size="sm" className="rounded-full" onClick={acceptAll}>
                Tout accepter
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({
  title,
  text,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  text: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange?.(v)}
        aria-label={title}
      />
    </div>
  );
}
