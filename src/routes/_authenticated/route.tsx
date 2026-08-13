import { useEffect, useRef } from "react";
import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getLoginSessionState } from "@/lib/two-factor.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const state = await getLoginSessionState().catch(() => ({ active: false as const }));
    if (!state.active) {
      await supabase.auth.signOut({ scope: "local" });
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const lastCheck = useRef(Date.now());

  useEffect(() => {
    const checkActivity = async () => {
      if (Date.now() - lastCheck.current < 5 * 60 * 1000) return;
      lastCheck.current = Date.now();
      try {
        const state = await getLoginSessionState();
        if (state.active) return;
      } catch {
        // Une session expirée ou révoquée suit le même chemin de déconnexion.
      }
      await supabase.auth.signOut({ scope: "local" });
      navigate({ to: "/auth", replace: true });
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "focus"];
    events.forEach((event) => window.addEventListener(event, checkActivity, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, checkActivity));
  }, [navigate]);

  return <Outlet />;
}
