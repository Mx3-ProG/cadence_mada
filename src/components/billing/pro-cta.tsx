import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useUpgradeToPro } from "@/lib/billing";

/**
 * Bouton "Passer en Pro" de la page d'accueil : redirige vers l'inscription
 * si l'utilisateur n'est pas connecté, sinon ouvre le checkout Stripe.
 */
export function ProCta({ label }: { label: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const upgrade = useUpgradeToPro();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(!!data.session);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Button
      size="lg"
      className="mt-8 w-full"
      disabled={upgrade.isPending}
      onClick={() => (signedIn ? upgrade.mutate() : navigate({ to: "/auth" }))}
    >
      {upgrade.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}
