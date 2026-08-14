import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { QuickAppointmentFlow } from "@/components/agenda/quick-appointment";
import { BookingLinkQuickAccess } from "@/components/agenda/booking-link-quick-access";
import { useIsAdmin } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

const nav = [
  { to: "/dashboard", label: "Semaine", icon: CalendarDays },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/settings", label: "Réglages", icon: Settings },
] as const;

const MOBILE_KEYBOARD_MIN_HEIGHT = 120;

function isTextEntryElement(element: Element | null) {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  if (element instanceof HTMLElement && element.isContentEditable) return true;
  if (!(element instanceof HTMLInputElement)) return false;

  return ![
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "radio",
    "range",
    "reset",
    "submit",
  ].includes(element.type);
}

function useMobileKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    let baselineHeight = viewport?.height ?? window.innerHeight;
    let frame = 0;
    let settleTimer = 0;

    const update = () => {
      const hasTextFocus = isTextEntryElement(document.activeElement);

      if (!hasTextFocus) {
        setOpen(false);
        baselineHeight = Math.max(baselineHeight, viewport?.height ?? window.innerHeight);
        return;
      }

      if (!viewport) {
        setOpen(true);
        return;
      }

      setOpen(baselineHeight - viewport.height >= MOBILE_KEYBOARD_MIN_HEIGHT);
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };

    const handleFocusIn = () => {
      if (!isTextEntryElement(document.activeElement)) return;
      baselineHeight = Math.max(baselineHeight, viewport?.height ?? window.innerHeight);
      scheduleUpdate();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(update, 300);
    };

    const handleFocusOut = () => scheduleUpdate();

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    viewport?.addEventListener("resize", scheduleUpdate);
    viewport?.addEventListener("scroll", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
      viewport?.removeEventListener("resize", scheduleUpdate);
      viewport?.removeEventListener("scroll", scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-mobile-keyboard-open", open);
    return () => document.documentElement.removeAttribute("data-mobile-keyboard-open");
  }, [open]);

  return open;
}

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsAdmin();
  const [quickOpen, setQuickOpen] = useState(false);
  const mobileKeyboardOpen = useMobileKeyboardOpen();
  const items = isAdmin
    ? [...nav, { to: "/admin", label: "Admin", icon: ShieldCheck } as const]
    : nav;

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <BrandLogo />
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-surface/60 p-1 lg:flex">
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    pathname === item.to
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <Button
              onClick={() => setQuickOpen(true)}
              className="hidden rounded-full lg:inline-flex"
            >
              <CalendarPlus className="h-4 w-4" />
              Ajouter un rendez-vous
            </Button>
            <BookingLinkQuickAccess />
            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              aria-label="Se déconnecter"
              className="rounded-full border border-border/60"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Navigation principale"
        aria-hidden={mobileKeyboardOpen}
        data-mobile-nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-[opacity,transform] duration-200 lg:hidden",
          mobileKeyboardOpen && "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <li key={item.to} className="min-w-0 flex-1">
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "text-primary")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="flex w-full flex-col items-center gap-1 rounded-2xl bg-primary px-2 py-2 text-[11px] font-semibold text-primary-foreground transition-opacity active:opacity-80"
            >
              <CalendarPlus className="h-5 w-5" />
              <span className="truncate">Ajouter</span>
            </button>
          </li>
        </ul>
      </nav>

      <QuickAppointmentFlow open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
