import { useEffect, useRef } from "react";
import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getLoginSessionState } from "@/lib/two-factor.functions";
import { useLocale } from "@/i18n/use-locale";

export const Route = createFileRoute("/$locale/_authenticated")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user)
      throw redirect({ to: "/$locale/auth", params: { locale: params.locale } });
    const state = await getLoginSessionState().catch(() => ({ active: false as const }));
    if (!state.active) {
      await supabase.auth.signOut({ scope: "local" });
      throw redirect({ to: "/$locale/auth", params: { locale: params.locale } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const locale = useLocale();
  const navigate = useNavigate();
  const lastCheck = useRef(Date.now());

  // Langue du compte du pro : détermine la langue des emails envoyés depuis ce compte
  // (le contact/invité n'a pas de compte). Se synchronise avec la langue actuellement
  // parcourue, capturée dès la première connexion et mise à jour si elle change.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      await supabase.from("profiles").update({ locale }).eq("id", uid);
    })();
  }, [locale]);

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
      navigate({ to: "/$locale/auth", params: { locale }, replace: true });
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "focus"];
    events.forEach((event) => window.addEventListener(event, checkActivity, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, checkActivity));
  }, [navigate, locale]);

  return <Outlet />;
}
