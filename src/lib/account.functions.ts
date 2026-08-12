import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Supprime définitivement le compte : toutes les données applicatives
 * (contacts, rendez-vous, statistiques, profil, rôles) puis l'utilisateur d'auth.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: adminError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (adminError) throw new Error(adminError.message);

    return { ok: true };
  });
