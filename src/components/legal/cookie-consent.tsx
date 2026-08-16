import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Cookie } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLocale } from "@/i18n/use-locale";
import frLegal from "@/locales/fr/legal.json";

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
  const locale = useLocale();
  const { t } = useTranslation("legal");
  const translate = (key: string) => {
    const translated = t(key);
    if (translated === key) {
      const fallback = frLegal[key as keyof typeof frLegal];
      return typeof fallback === "string" ? fallback : key;
    }
    return translated;
  };
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
          aria-label={translate("consent.aria_label")}
          className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-4 sm:pb-4"
        >
          <div className="mx-auto max-h-[calc(100dvh-env(safe-area-inset-bottom)-1.5rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-[1.5rem] border border-border/80 bg-background/95 p-5 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                <Cookie className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold tracking-tight">
                  {translate("consent.title")}
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                  {translate("consent.body")}{" "}
                  <Link
                    to="/$locale/cookies"
                    params={{ locale }}
                    className="font-medium text-foreground underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary"
                  >
                    {translate("consent.learn_more")}
                  </Link>
                </p>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {details && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 space-y-3 border-t border-border/60 pt-5">
                    <Row
                      title={translate("consent.necessary.title")}
                      text={translate("consent.necessary.text")}
                      checked
                      disabled
                    />
                    <Row
                      title={translate("consent.analytics.title")}
                      text={translate("consent.analytics.text")}
                      checked={analytics}
                      onChange={setAnalytics}
                    />
                    <Row
                      title={translate("consent.marketing.title")}
                      text={translate("consent.marketing.text")}
                      checked={marketing}
                      onChange={setMarketing}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <Button
                variant="outline"
                className="min-h-11 min-w-0 rounded-full px-2 text-xs sm:text-sm"
                onClick={refuseAll}
              >
                {translate("consent.refuse_all")}
              </Button>
              <Button
                className="min-h-11 min-w-0 rounded-full px-2 text-xs sm:text-sm"
                onClick={details ? saveChoice : acceptAll}
              >
                {details ? translate("consent.save_choices") : translate("consent.accept_all")}
              </Button>
              <Button
                variant="ghost"
                className="col-span-2 min-h-11 rounded-full text-muted-foreground"
                onClick={() => setDetails((d) => !d)}
              >
                {details ? translate("consent.hide_details") : translate("consent.customize")}
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
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/25 p-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p>
      </div>
      <Switch
        className="h-11 w-14 p-1 [&>span]:h-5 [&>span]:w-5 [&>span[data-state=checked]]:translate-x-6"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange?.(v)}
        aria-label={title}
      />
    </div>
  );
}
