import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/use-locale";

export function LandingCtaDock() {
  const locale = useLocale();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/80 to-transparent" />
      <Button
        asChild
        size="lg"
        className="pointer-events-auto relative gap-2 rounded-full border border-border/60 bg-foreground/90 px-7 text-background shadow-[0_8px_30px_-8px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-transform hover:scale-[1.03] hover:bg-foreground active:scale-[0.98]"
      >
        <Link to={signedIn ? "/$locale/dashboard" : "/$locale/auth"} params={{ locale }}>
          {signedIn ? "Accès dashboard" : "Commencer"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
